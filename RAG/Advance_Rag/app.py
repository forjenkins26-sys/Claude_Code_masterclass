"""Advanced RAG Explorer — Flask server.

Routes
  GET  /                 upload page
  GET  /ingest           ingest page (SSE driven)
  GET  /chunks           chunk viewer
  GET  /chat             chat page
  POST /api/upload       save file, return preview
  GET  /api/ingest/sse   run ingestion, stream progress
  GET  /api/chunks       paginated chunk browse
  GET  /api/facets       distinct values for the filter dropdowns
  POST /api/chat         full query pipeline, every stage returned
  GET  /api/config       tunables + collection state
"""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request
from werkzeug.utils import secure_filename

import config
import ingest
import llm
import retrieval
import store

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD_MB * 1024 * 1024

# The ids of the chunks behind the most recent answer. The chunk viewer outlines
# them in coral so a learner can jump from "the model said this" to "these are
# the rows it read". Single-process demo state — deliberately not a database.
LAST_ANSWER_CHUNK_IDS: list[str] = []

# Progress of the startup self-seed, read by /api/config so the UI can say
# "indexing, 40%" instead of "collection empty" while it runs.
AUTOSEED = {"state": "idle", "done": 0, "total": 0, "message": ""}


def _autoseed() -> None:
    """Ingest the bundled corpus once, in the background, if nothing is indexed.

    Hosted containers have an ephemeral filesystem: the Qdrant folder does not
    survive a restart, so a deployment that relied on a pre-built collection
    would serve an empty one after its first sleep/wake cycle. Seeding on boot
    makes the deployment self-sufficient — and because it runs on a thread, the
    UI is reachable immediately and reports progress rather than blocking.

    Local runs are unaffected: the collection is already populated, so this
    returns before doing any work.
    """
    try:
        if store.info().get("points"):
            AUTOSEED["state"] = "skipped"
            return

        corpus = config.ROOT / "testcase" / "vwo_test_cases_5000.csv"
        if not corpus.exists():
            AUTOSEED.update(state="skipped", message="no bundled corpus")
            return

        # Embedded Qdrant keeps the whole collection resident, so memory scales
        # with the number of points, not with the batch size: measured 598 MB at
        # the first upsert and 844 MB by 2,000 points, against 303 MB before any
        # indexing. A small instance therefore has to seed a subset or be
        # OOM-killed mid-boot. Writing the subset to its own file keeps
        # ingest.run() unchanged — it still just reads a CSV.
        # Default to a capped seed on a hosted instance for the same reason the
        # batch size is capped there: the whole collection stays resident, so an
        # uncapped 5,000-row seed is an OOM on a small box. 0 means no cap.
        limit = int(os.getenv("AUTO_SEED_LIMIT") or (1200 if os.getenv("RENDER") else 0))
        if limit > 0:
            import pandas as pd

            subset = config.UPLOAD_DIR / f"_seed_{limit}.csv"
            pd.read_csv(
                corpus, dtype=str, encoding="utf-8-sig", keep_default_na=False
            ).head(limit).to_csv(subset, index=False)
            corpus = subset

        AUTOSEED.update(state="running", message="starting", limit=limit)
        for ev in ingest.run(
            corpus,
            ["Summary", "Description", "Test Steps", "Expected Result"],
            ["Issue Key", "Priority", "Module", "Feature", "Test Type"],
            recreate=True,
        ):
            if ev.get("stage") == "embed" and ev.get("status") == "progress":
                AUTOSEED.update(done=ev["done"], total=ev["total"])
            elif ev.get("stage") == "error":
                AUTOSEED.update(state="failed", message=ev.get("message", ""))
                return
        AUTOSEED.update(state="done", message="seeded from bundled corpus")
    except Exception as exc:  # a failed seed must not take the web server down
        AUTOSEED.update(state="failed", message=f"{type(exc).__name__}: {exc}")


_seed_lock = threading.Lock()
_seed_started = False


def _ensure_seed_started() -> None:
    """Kick off seeding from inside a live worker, at most once.

    Seeding at import time did not survive: gunicorn starts more than one worker
    process, the thread landed in one that then exited ("Worker exiting (pid:
    73)"), and the worker left serving traffic had its own fresh AUTOSEED dict
    still reading "idle". The collection stayed empty and nothing in the logs
    said why.

    Triggering from the first request instead ties the work to a process that is
    demonstrably alive and handling traffic. The lock keeps concurrent first
    requests from starting it twice; the thread keeps the triggering request
    fast.
    """
    global _seed_started
    if _seed_started or not _seed_on:
        return
    with _seed_lock:
        if _seed_started:
            return
        _seed_started = True
        threading.Thread(target=_autoseed, daemon=True).start()


@app.before_request
def _seed_on_first_request() -> None:
    _ensure_seed_started()


def _seed_enabled() -> tuple[bool, str]:
    """Whether to seed on boot, and the reason either way.

    AUTO_SEED is honoured when set, but it is not required. A hosted instance is
    detected by RENDER (set by the platform) and seeds by default, because there
    the alternative is a permanently empty collection: the disk is ephemeral, so
    every wake from sleep starts with nothing and there is no operator at the
    keyboard to re-upload. Relying on the env var alone was a single point of
    failure — when it did not arrive, the app sat idle with no indication why,
    which is exactly what happened on the first deploy.

    The reason string is surfaced through /api/config so the next person does
    not have to guess whether seeding was off, skipped, or broken.
    """
    raw = os.getenv("AUTO_SEED")
    if raw is not None and raw != "":
        on = raw not in ("0", "false", "False")
        return on, f"AUTO_SEED={raw!r}"
    if os.getenv("RENDER"):
        return True, "hosted instance (RENDER set), AUTO_SEED unset"
    return False, "local run, AUTO_SEED unset"


_seed_on, _seed_why = _seed_enabled()
AUTOSEED["message"] = _seed_why
if not _seed_on:
    AUTOSEED["state"] = "off"
# When enabled, seeding starts on the first request (see _ensure_seed_started)
# rather than here, so it runs in a worker that is actually serving traffic.


# ------------------------------------------------------------------ pages


@app.get("/")
def page_upload():
    return render_template("upload.html", cfg=config.summary(), collection=store.info())


@app.get("/ingest")
def page_ingest():
    return render_template("ingest.html", cfg=config.summary(), collection=store.info())


@app.get("/chunks")
def page_chunks():
    return render_template("chunks.html", cfg=config.summary(), collection=store.info())


@app.get("/chat")
def page_chat():
    return render_template("chat.html", cfg=config.summary(), collection=store.info())


# ------------------------------------------------------------------ api


@app.get("/api/config")
def api_config():
    return jsonify(
        {
            "config": config.summary(),
            "collection": store.info(),
            "autoseed": AUTOSEED,
            # Why seeding is or is not running, and the memory-critical knob.
            # Both were invisible when the first deploy sat idle with an empty
            # collection, which made it look like the app, not the config.
            "runtime": {
                "seed_enabled": _seed_on,
                "seed_reason": _seed_why,
                "ingest_batch": config.INGEST_BATCH,
                "hosted": bool(os.getenv("RENDER")),
            },
        }
    )


@app.post("/api/upload")
def api_upload():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No file was sent."}), 400

    name = secure_filename(file.filename)
    ext = Path(name).suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        return jsonify(
            {"error": f"{ext or 'that file type'} is not supported. Use .csv, .xlsx or .xls."}
        ), 400

    dest = config.UPLOAD_DIR / name
    file.save(dest)

    try:
        info = ingest.preview(dest)
    except Exception as exc:
        # A file that cannot be parsed is useless to us, and leaving it on disk
        # would let a later ingest pick up a known-broken file.
        dest.unlink(missing_ok=True)
        return jsonify({"error": f"Could not read that file — {type(exc).__name__}: {exc}"}), 400

    return jsonify({"filename": name, "path": str(dest), **info})


@app.get("/api/ingest/sse")
def api_ingest_sse():
    """Stream ingestion progress as Server-Sent Events.

    SSE rather than a websocket: the traffic is one-directional and SSE needs no
    extra dependency, no handshake and reconnects on its own.
    """
    filename = request.args.get("file", "")
    text_cols = [c for c in request.args.get("text_cols", "").split(",") if c]
    meta_cols = [c for c in request.args.get("meta_cols", "").split(",") if c]
    recreate = request.args.get("recreate", "1") != "0"

    path = config.UPLOAD_DIR / secure_filename(filename)

    def stream():
        if not filename or not path.exists():
            yield _sse({"stage": "error", "message": f"File not found: {filename}"})
            return
        if not text_cols:
            yield _sse({"stage": "error", "message": "Select at least one text column."})
            return

        started = time.time()
        for event in ingest.run(path, text_cols, meta_cols, recreate=recreate):
            event["elapsed"] = round(time.time() - started, 1)
            yield _sse(event)

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # stops nginx holding the stream in a buffer
            "Connection": "keep-alive",
        },
    )


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.get("/api/chunks")
def api_chunks():
    offset = request.args.get("offset") or None
    limit = min(int(request.args.get("limit", 50)), 200)
    contains = request.args.get("q", "").strip()

    filters = {
        field: request.args.get(field, "")
        for field in ("Module", "Feature", "Priority", "Test Type", "Issue Key")
    }

    ci = store.info()
    if not ci.get("exists"):
        # Landing on /chunks before ingesting is the normal first-visit path, not
        # an error worth showing a stack-trace class name for.
        return jsonify(
            {
                "rows": [],
                "next_offset": None,
                "highlight": [],
                "collection": ci,
                "notice": "Nothing is indexed yet. Upload a file and run ingestion first.",
            }
        )

    try:
        rows, next_offset = store.browse(offset, limit, filters, contains)
    except Exception as exc:
        return jsonify({"error": f"{type(exc).__name__}: {exc}", "rows": []}), 400

    return jsonify(
        {
            "rows": rows,
            "next_offset": str(next_offset) if next_offset is not None else None,
            "highlight": LAST_ANSWER_CHUNK_IDS,
            "collection": store.info(),
        }
    )


@app.get("/api/facets")
def api_facets():
    return jsonify(
        {f: store.facet_values(f) for f in ("Module", "Feature", "Priority", "Test Type")}
    )


@app.post("/api/chat")
def api_chat():
    global LAST_ANSWER_CHUNK_IDS

    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Ask something first."}), 400

    ci = store.info()
    if not ci.get("points"):
        if AUTOSEED["state"] == "running":
            pct = (
                round(AUTOSEED["done"] / AUTOSEED["total"] * 100)
                if AUTOSEED["total"]
                else 0
            )
            return jsonify(
                {
                    "error": f"Still indexing the bundled corpus ({pct}%). "
                             f"Chat becomes available when it finishes."
                }
            ), 409
        return jsonify(
            {"error": "The collection is empty. Upload a file and ingest it first."}
        ), 400

    filters = {k: v for k, v in (body.get("filters") or {}).items() if v}
    top_n = int(body.get("top_n") or config.TOP_N_HYBRID)
    top_k = int(body.get("top_k") or config.TOP_K_RERANK)
    timings: dict[str, float] = {}

    # --- stage 1: rewrite
    t = time.time()
    use_rewrite = config.REWRITE_ENABLED and body.get("rewrite", True)
    queries = llm.rewrite_query(question) if use_rewrite else [question]
    timings["rewrite"] = round(time.time() - t, 3)

    # --- stage 2+3: hybrid search and fusion
    t = time.time()
    try:
        result = retrieval.retrieve(question, queries, top_n, top_k, filters)
    except Exception as exc:
        return jsonify({"error": f"Retrieval failed — {type(exc).__name__}: {exc}"}), 500
    timings["retrieve"] = round(time.time() - t, 3)

    # --- stage 4: generate
    t = time.time()
    mode = body.get("mode") or llm.detect_mode(question)
    try:
        generated = llm.answer(question, result["final"], mode)
    except Exception as exc:
        return jsonify({"error": f"Generation failed — {type(exc).__name__}: {exc}"}), 500
    timings["generate"] = round(time.time() - t, 3)

    LAST_ANSWER_CHUNK_IDS = [str(h["id"]) for h in result["final"]]

    return jsonify(
        {
            "question": question,
            "rewrites": queries,
            "mode": generated["mode"],
            "answer": generated["text"],
            "prompt": generated["prompt"],
            "timings": timings,
            "dense": [_hit(h) for h in result["dense"]],
            "sparse": [_hit(h) for h in result["sparse"]],
            "fused": [_hit(h, extra=("rrf_score", "ranks")) for h in result["fused"][:top_n]],
            "rerank_before": [
                _hit(h, extra=("rerank_score", "rank_before")) for h in result["rerank"]["before"]
            ],
            "rerank_after": [
                _hit(h, extra=("rerank_score", "rank_before", "rank_after"))
                for h in result["rerank"]["after"]
            ],
            "final": [_hit(h, extra=("rerank_score",), full_text=True) for h in result["final"]],
            "counts": {
                "dense_runs": result["dense_runs"],
                "sparse_runs": result["sparse_runs"],
                "fused": len(result["fused"]),
                "final": len(result["final"]),
            },
        }
    )


def _hit(hit: dict, extra: tuple[str, ...] = (), full_text: bool = False) -> dict:
    """Trim a hit for the wire.

    The full chunk text is sent only for the chunks that reached the LLM. Sending
    it for all ~120 intermediate hits would make the response several hundred KB
    per question for text the UI shows as a one-line snippet anyway.
    """
    p = hit.get("payload", {}) or {}
    text = p.get("text", "")
    out = {
        "id": str(hit.get("id")),
        "score": round(float(hit["score"]), 5) if hit.get("score") is not None else None,
        "issue_key": p.get("Issue Key", ""),
        "module": p.get("Module", ""),
        "feature": p.get("Feature", ""),
        "priority": p.get("Priority", ""),
        "test_type": p.get("Test Type", ""),
        "snippet": text[:220],
    }
    if full_text:
        out["text"] = text
        out["payload"] = p
    for key in extra:
        val = hit.get(key)
        out[key] = round(val, 6) if isinstance(val, float) else val
    return out


if __name__ == "__main__":
    print(f"Advanced RAG Explorer -> http://{config.HOST}:{config.PORT}")
    if not config.GROQ_API_KEY:
        print("WARNING: GROQ_API_KEY is not set — rewriting and answering will fail.")
    # threaded=True so the SSE ingest stream does not block the page that opened it.
    app.run(host=config.HOST, port=config.PORT, debug=False, threaded=True)

"""Ingestion: read a tabular file, chunk it, embed it, index it.

`run()` is a generator yielding one progress event per step. The Flask route
forwards those events over Server-Sent Events, so the browser watches the same
sequence the CLI prints — one code path, two front ends.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import pandas as pd

import chunking
import models as M
import store
from config import EMBED_BACKEND, INGEST_BATCH


def read_table(path: str | Path) -> pd.DataFrame:
    """Load a CSV or Excel file.

    dtype=str throughout: a column of issue keys like "VWO-TC-00001" is fine, but
    a numeric-looking id column would otherwise arrive as int64 and render as
    "1.0" in the payload once a single blank makes the column a float.
    """
    p = Path(path)
    if p.suffix.lower() in (".xlsx", ".xls"):
        return pd.read_excel(p, dtype=str).fillna("")
    # utf-8-sig strips the BOM Excel writes, which would otherwise become part of
    # the first column's name and break column selection.
    return pd.read_csv(p, dtype=str, encoding="utf-8-sig", keep_default_na=False)


def preview(path: str | Path, rows: int = 5) -> dict:
    df = read_table(path)
    return {
        "rows": len(df),
        "columns": list(df.columns),
        "head": df.head(rows).to_dict(orient="records"),
        "dtypes": {c: str(df[c].dtype) for c in df.columns},
    }


def run(
    path: str | Path,
    text_cols: list[str],
    meta_cols: list[str],
    recreate: bool = True,
    batch_size: int = INGEST_BATCH,
):
    """Ingest, yielding progress events.

    Events: read | docs | chunk | embed | index | done | error
    """
    try:
        yield {"stage": "read", "status": "start", "message": f"Reading {Path(path).name}"}
        df = read_table(path)
        rows = df.to_dict(orient="records")
        yield {
            "stage": "read",
            "status": "done",
            "rows": len(rows),
            "columns": list(df.columns),
            "message": f"{len(rows)} rows, {len(df.columns)} columns",
        }

        yield {"stage": "docs", "status": "start", "message": "Assembling documents"}
        sample_doc = chunking.build_document(rows[0], text_cols) if rows else ""
        yield {
            "stage": "docs",
            "status": "done",
            "text_cols": text_cols,
            "meta_cols": meta_cols,
            "sample": sample_doc[:1200],
            "message": f"Embedding {len(text_cols)} columns, keeping {len(meta_cols)} as metadata",
        }

        yield {"stage": "chunk", "status": "start", "message": "Chunking"}
        chunks = chunking.chunk_rows(rows, text_cols, meta_cols)
        if not chunks:
            yield {
                "stage": "error",
                "message": "No text was produced. Check that the selected text "
                           "columns actually contain values.",
            }
            return
        cstats = chunking.stats(chunks)
        yield {
            "stage": "chunk",
            "status": "done",
            "stats": cstats,
            "samples": [
                {"text": c["text"], "char_len": c["char_len"], "row_index": c["row_index"]}
                for c in chunks[:3]
            ],
            "message": f"{cstats['total']} chunks, avg {cstats['avg']} chars",
        }

        yield {
            "stage": "embed",
            "status": "start",
            "total": len(chunks),
            "message": f"Loading {EMBED_BACKEND} embedder",
        }
        store.ensure_collection(recreate=recreate)

        # Warm the model before the batch loop and announce it separately. The
        # load takes tens of seconds on a cold cache, and doing it inside the
        # first batch made the UI sit silent on "start" with no way to tell a
        # slow load from a hung run — the reason ingestion looked frozen.
        t_load = time.time()
        M.warm()
        yield {
            "stage": "embed",
            "status": "loaded",
            "total": len(chunks),
            "seconds": round(time.time() - t_load, 1),
            "message": f"Embedder ready in {time.time() - t_load:.1f}s — embedding {len(chunks)} chunks",
        }

        done = 0
        first_preview = None
        t_embed = time.time()
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            enc = M.encode([c["text"] for c in batch], batch_size=batch_size)

            if first_preview is None:
                dense0 = enc["dense"][0]
                sparse0 = enc["sparse"][0]
                top_sparse = sorted(sparse0.items(), key=lambda kv: -float(kv[1]))[:5]
                first_preview = {
                    "dense_head": [round(float(x), 5) for x in dense0[:8]],
                    "dense_dim": len(dense0),
                    "sparse_terms": [
                        {"token_id": int(k), "weight": round(float(v), 4)}
                        for k, v in top_sparse
                    ],
                    "sparse_nnz": len(sparse0),
                }
                yield {"stage": "embed", "status": "preview", **first_preview}

            store.upsert(batch, enc["dense"], enc["sparse"])
            done += len(batch)

            # Rate and ETA are measured from the batches actually completed, so
            # a long run states how long it has left instead of only how far it
            # has come. Without this a 13-minute embed is indistinguishable from
            # a stalled one.
            spent = time.time() - t_embed
            rate = done / spent if spent > 0 else 0
            eta = int((len(chunks) - done) / rate) if rate > 0 else None
            yield {
                "stage": "embed",
                "status": "progress",
                "done": done,
                "total": len(chunks),
                "rate": round(rate, 1),
                "eta": eta,
                "message": f"Embedded and indexed {done}/{len(chunks)}",
            }

        yield {"stage": "embed", "status": "done", "message": f"{done} chunks embedded"}

        ci = store.info()
        yield {
            "stage": "index",
            "status": "done",
            "collection": ci,
            "message": f"Collection '{ci['collection']}' holds {ci['points']} points",
        }
        yield {"stage": "done", "status": "done", "points": ci["points"]}

    except Exception as exc:  # surfaced to the UI rather than dying silently in a thread
        yield {"stage": "error", "message": f"{type(exc).__name__}: {exc}"}


def main() -> None:
    ap = argparse.ArgumentParser(description="Ingest a CSV/XLSX into Qdrant")
    ap.add_argument("path")
    ap.add_argument("--text-cols", required=True, help="comma-separated")
    ap.add_argument("--meta-cols", default="", help="comma-separated")
    ap.add_argument("--append", action="store_true", help="keep existing points")
    args = ap.parse_args()

    text_cols = [c.strip() for c in args.text_cols.split(",") if c.strip()]
    meta_cols = [c.strip() for c in args.meta_cols.split(",") if c.strip()]

    for event in run(args.path, text_cols, meta_cols, recreate=not args.append):
        if event.get("stage") == "error":
            raise SystemExit(f"ERROR: {event['message']}")
        if event.get("message"):
            print(f"[{event['stage']:6}] {event['message']}")


if __name__ == "__main__":
    main()

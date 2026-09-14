# Advanced RAG Explorer

Teaching demo for The Testing Academy. Upgrades the Basic RAG Explorer with the
techniques that start to matter once the corpus is large and repetitive — here,
5,000 VWO test cases.

- **Hybrid retrieval** — a dense vector *and* a sparse one per chunk
- **Vector DB** — Qdrant, one collection holding both named vectors, plus payload filters
- **Fusion** — Reciprocal Rank Fusion over every query variant × both legs
- **Re-ranking** — a cross-encoder over the fused candidates
- **Query rewriting** — alternate phrasings via Groq before retrieval
- **Generation** — Groq `openai/gpt-oss-120b`, grounded with `[Chunk N]` citations

Embedding and re-ranking run **locally on the CPU** — no API key, no cost, no
data leaving the machine. Groq is called only to rewrite the query and write the
final answer.

A standalone illustrated write-up of the whole pipeline lives at
[`docs/how-this-rag-works.html`](docs/how-this-rag-works.html) — open it in a
browser, or host it anywhere.

---

## Pipeline

```
Ingest:
  CSV/XLSX → rows → assemble documents → chunk → embed (dense + sparse)
  → Qdrant collection 'vwo_test_cases'

Query:
  Question → rewrite (Groq) → embed each variant → dense + sparse search
  → RRF fuse → cross-encoder rerank → Groq → grounded answer
```

## Backends

Embedding and re-ranking each ship in two flavours, selected by `EMBED_BACKEND`
and `RERANK_BACKEND`. All four models are local and free; they differ only in
size, and on a CPU that difference decides whether the demo is usable.

| Stage | `fast` (default) | the bge models |
|---|---|---|
| Embed | `bge-small-en-v1.5` (384-dim, ONNX) + `Qdrant/bm25` | `bge-m3` (1024-dim, one pass for both vectors) |
| Re-rank | `ms-marco-MiniLM-L-6-v2` (22M, ONNX) | `bge-reranker-v2-m3` (568M) |

The bge pair is the better teaching material: one model, one vocabulary, genuine
learned sparse weights instead of BM25 term statistics. It is also, on this
hardware, roughly 20x slower at both stages — so it stays available behind a
switch rather than as the default.

Switching `EMBED_BACKEND` changes the vector width, and a Qdrant collection's
width is fixed at creation, so re-ingest with **Recreate collection** ticked.
Ingesting into a collection built by the other backend is refused with a clear
message rather than failing partway through.

---

## Setup

```bash
cd RAG/Advance_Rag
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env     # then add your GROQ_API_KEY
```

Qdrant runs **embedded** by default — a local folder at `./qdrant_data/`, no
Docker and no server to start. To use a real server instead, set
`QDRANT_URL=http://host:6333` in `.env`.

**First run downloads models**, cached under `~/.cache/huggingface`. The default
backend pulls ~150 MB; `bge-m3` plus its reranker is ~2.9 GB.

Measured on this machine — 8-core CPU, `torch 2.14.0+cpu`, **no CUDA** — so you
can plan around the numbers rather than wonder whether something has hung:

| Step | `fast` (default) | bge models |
|---|---|---|
| Model load, warm cache | ~0.5 s | ~40 s |
| Embed + index, per chunk | ~0.10 s (9.5/s) | ~3.6 s |
| Full 5,000-row corpus | **~9 min** | ~5 hours |
| Re-rank 31 candidates | ~1.9 s | ~43 s |
| Whole chat turn, warm | ~4 s (rewrite 1.1 + retrieve 1.9 + generate 1.2) | ~45 s |

A GPU changes the bge column substantially — `use_fp16` and batched attention
are built for one. On CPU there is no fast fp16 path, so `BGE_USE_FP16` defaults
to off: enabling it makes torch emulate half precision and run *slower*.

> `FlagEmbedding` must be 1.4.x. Version 1.2.x fails at import against
> `transformers` 5.x with `NameError: name 'Optional' is not defined`.

---

## Run

```bash
python app.py
# http://127.0.0.1:5050
```

Then, in the browser: **Upload** → **Ingest** → **Chunks** → **Chat**.

Upload `testcase/vwo_test_cases_5000.csv`. On the column picker, *Suggest for a
Jira test-case file* selects sensible text and metadata columns for it.

### CLI ingestion

```bash
python ingest.py testcase/vwo_test_cases_5000.csv \
  --text-cols "Summary,Description,Test Steps,Expected Result" \
  --meta-cols "Issue Key,Module,Feature,Priority,Test Type,Browser,Device"
```

`--append` keeps existing points instead of recreating the collection.

---

## The corpus

`testcase/vwo_test_cases_5000.csv` — 5,000 rows in Jira CSV import format,
19 columns, ~5.9 MB. Regenerate or resize it with:

```bash
python testcase/generate_test_cases.py                    # 5,000 rows
python testcase/generate_test_cases.py --rows 500 --out sample.csv
python testcase/generate_test_cases.py --count-only       # scenario inventory
```

The generator is seeded, so the same command always produces byte-identical
output. Its shape matters for the demo:

| Layer | Count |
|---|---|
| Modules | 14 |
| Features | 68 |
| Hand-written scenarios | 344 |
| Execution contexts | 16 |
| Rows emitted | 5,000 |

Each scenario is one action on one feature with its own expected result, and it
is emitted **at most once** per context — ask for more rows than
344 × 16 and the generator refuses rather than repeating itself. The result is
5,000 unique rows covering 344 semantic clusters, which is exactly the condition
that makes a single dense search insufficient and hybrid retrieval worth having.

---

## What each page shows

**`/` Upload** — file preview: row count, columns, dtypes, first five rows. Pick
which columns are embedded and which are kept as filterable payload.

**`/ingest`** — live SSE progress through Read → Build documents → Chunk → Embed
→ Index. The chunk card shows a length histogram and sample chunks; the embed
card shows the first 8 dense dimensions and the top sparse terms by weight.

**`/chunks`** — every indexed chunk with its payload, paginated, filterable by
module / feature / priority / test type. Chunks used in the most recent chat
answer are outlined in coral.

**`/chat`** — the answer, plus a collapsible breakdown per query: the rewrites,
the dense and sparse lists side by side with their overlap count, the RRF
fusion, the rerank before/after with movement arrows, the chunks that reached
the model, and the exact prompt sent.

Two modes are detected automatically. *Answer* is grounded Q&A. *Generate* — for
requests like "create a test case for VWO-1234 covering webhook retries" —
writes a structured test case using the retrieved rows as format templates.

---

## Tunables

Set in `.env`, summarised in the left rail of every page.

| Knob | Default | Meaning |
|---|---|---|
| `CHUNK_SIZE` | 1400 | Max chars before a document splits |
| `CHUNK_OVERLAP` | 150 | Chars repeated between adjacent chunks |
| `TOP_N_HYBRID` | 20 | Candidates per leg, per query variant |
| `TOP_K_RERANK` | 4 | Chunks sent to the LLM after reranking |
| `RRF_K` | 60 | Fusion smoothing constant |
| `REWRITE_ENABLED` | 1 | Rewrite the query before retrieval |
| `INGEST_BATCH` | 32 | Embedding batch size — lower it if memory is tight |

`CHUNK_SIZE = 1400` is measured, not guessed: over the bundled corpus the
assembled document runs 874 chars at the shortest and 1,239 at the longest, so
1400 keeps every row whole. Setting it to 1000 splits about 77% of rows — a
useful thing to demonstrate.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `NameError: name 'Optional' is not defined` on import | `FlagEmbedding` 1.2.x against `transformers` 5.x. Install 1.4.x. |
| First query takes minutes | Models downloading and warming. Subsequent queries are fast. |
| Groq 401 | `GROQ_API_KEY` missing or wrong in `.env`. |
| Connection refused on 6333 | Only applies when `QDRANT_URL` is set. The default is embedded — nothing to start. |
| `Payload indexes have no effect in the local Qdrant` | Expected in embedded mode. Filters still work by scanning; the indexes apply when `QDRANT_URL` points at a server. |
| Out of memory during ingest | Lower `INGEST_BATCH` to 16 or 8. |
| Port 5050 busy | Change `PORT` in `.env`. |

---

## Known limits

- The chunk viewer's text search is applied **per page** in Python — Qdrant has
  no substring operator. Fine at 5,000 rows; a larger corpus needs a full-text
  payload index.
- Payload indexes are a no-op in embedded mode (see above).
- There is no retrieval evaluation here: no golden set, no measured recall, no
  claim that reranking helps on this corpus. The app shows the mechanism so you
  can judge it; it does not report a score.
- The corpus is synthetic. It is written to read like real VWO test cases, but
  none of it came from a production suite.

---

## Layout

```
Advance_Rag/
  app.py                  Flask server and JSON API
  config.py               every tunable, read from .env
  models.py               lazy, locked loaders for both embed/rerank backends
  chunking.py             row → document → chunk, plus length stats
  store.py                Qdrant: dual-vector collection, search, browse
  retrieval.py            hybrid search, RRF, rerank
  llm.py                  Groq: rewrite, answer, generate
  ingest.py               ingestion generator + CLI
  templates/              base, upload, ingest, chunks, chat
  static/                 app.css, app.js
  testcase/
    generate_test_cases.py
    vwo_test_cases_5000.csv
  docs/
    how-this-rag-works.html   illustrated pipeline write-up
  src/prompt.md           original build spec
```

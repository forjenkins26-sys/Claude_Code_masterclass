# Advanced RAG Explorer

End-to-end teaching demo for The Testing Academy. Upgrades `Basic_RAG_EXPLAIN`
with techniques that matter at scale on a real corpus (5,000 VWO test cases):

- **Hybrid retrieval** — dense + sparse vectors, fused with RRF
- **Vector DB** — Qdrant (embedded, no Docker) with native dense + sparse + filters
- **Re-ranking** — cross-encoder over the fused candidates
- **Query rewriting** — alternate phrasings via Groq before retrieval
- **Generation** — Groq, grounded in the retrieved chunks

Embedding and re-ranking run **locally on the CPU** — no API, no cost. Groq is
called only for query rewriting and the final answer.

### Backends

Both stages ship in two flavours, chosen by `EMBED_BACKEND` / `RERANK_BACKEND`.
Measured on an 8-core CPU with no GPU, over the bundled 5,000-row corpus:

| Stage | `fast` (default) | `bge-m3` / `bge` |
|---|---|---|
| Embed 5,000 rows | `bge-small-en-v1.5` + BM25 — **~9 min** | `bge-m3` — ~5 hours |
| Re-rank 31 candidates | `ms-marco-MiniLM-L-6-v2` — **~1.9 s** | `bge-reranker-v2-m3` — ~43 s |

The bge models are better and more interesting to teach — one vocabulary, one
forward pass, learned sparse weights rather than BM25 term statistics. They are
simply not usable on a CPU at this corpus size, so they are kept behind a switch
rather than removed. Switching `EMBED_BACKEND` changes the vector width
(384 vs 1024), so re-ingest with **Recreate collection** ticked.

UI uses a Claude-inspired theme (warm cream + coral) with a two-pane layout:
left = pipeline stage tracker (live), right = active content / chat.

---

## Pipeline

```
Stage 1 (Ingest):
  CSV/XLSX -> rows -> assemble docs -> chunk (1 row = 1 chunk if small) ->
  bge-m3 (dense + sparse) -> Qdrant collection 'vwo_test_cases'

Stage 2 (Chat):
  Question -> rewrite (Openrouter) -> embed -> dense + sparse search ->
  RRF fuse -> bge-reranker-v2-m3 -> Openrouter -> grounded answer
```

---

## Setup

```bash
cd Chapter_07_RAG/Advance_RAG_EXPLAIN
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Qdrant runs **embedded** by default (file store at `./qdrant_data/`) — **no Docker
required**. To use a Qdrant server instead, set `QDRANT_URL=http://host:6333`
in `.env`.

`.env` is pre-populated with the same `GROQ_API_KEY` as Basic.

---

## Run

```bash
source .venv/bin/activate
python app.py
# open http://127.0.0.1:5050
```

The first request hits cold model loaders (bge-m3 ~2.3 GB, bge-reranker ~570 MB
first time from HF cache) — subsequent requests are fast.

### CLI ingestion (optional)

```bash
python ingest.py data/test_cases.csv \
  --text-cols title,steps,expected,tags \
  --meta-cols id,jira_id,priority,module
```

---

## What you can see in the UI

### `/upload`
- File picker accepts `.csv`, `.xlsx`, `.xls`.
- After upload: row count, columns, first 5 rows, dtypes.
- Pick text columns (concatenated into the embedded document) and metadata
  columns (kept in Qdrant payload for filtering).

### `/ingest` (live SSE)
- Stage tracker shows: Read -> Build docs -> Chunk -> Embed -> Index.
- For each stage, a card on the right shows what happened:
  - **Chunk**: histogram, total chunks, avg/min/max chars, sample chunks with
    overlap highlighted in coral.
  - **Embed**: progress bar, dense vector preview (first 8 dims), sparse top-5
    tokens by weight.
  - **Index**: Qdrant collection info, link to dashboard.

### `/chunks`
- Paginated viewer (50/page) over the entire collection.
- Search box (substring) + filters (`priority`, `module`, `jira_id`).
- Each chunk card: ids, payload, dense preview, sparse preview, full text.
- Chunks used in the most recent chat answer are outlined in coral.

### `/chat`
- Chat box on the right; pipeline stage tracker on the left updates per query.
- After each turn the assistant shows:
  - The 3 query rewrites
  - Dense top-N vs sparse top-N vs RRF-fused top-N
  - Re-rank before/after table
  - Final answer with `[Chunk N]` citations
- Two modes auto-detected:
  - **Answer**: grounded Q&A on test cases.
  - **Generate**: types like "create a new test case for JIRA VWO-1234" produce
    a structured test case (Title / Preconditions / Steps / Expected / Priority
    / Tags) using retrieved similar test cases as templates.

---

## Tunables (top of `app.py`)

| Knob               | Default | Meaning                                          |
|--------------------|---------|--------------------------------------------------|
| `CHUNK_SIZE`       | 1000    | Max chars per chunk before splitting             |
| `CHUNK_OVERLAP`    | 150     | Chars repeated between adjacent chunks           |
| `TOP_N_HYBRID`     | 20      | Candidates per dense / sparse search             |
| `TOP_K_RERANK`     | 4       | Final chunks sent to LLM after rerank            |
| `RRF_K`            | 60      | Reciprocal Rank Fusion smoothing constant        |
| `REWRITE_ENABLED`  | True    | Use Groq to generate alt phrasings before search |
| `EMBED_BACKEND`    | fast    | `fast` (ONNX, 384-dim) or `bge-m3` (PyTorch, 1024)|
| `RERANK_BACKEND`   | fast    | `fast` (MiniLM) or `bge` (bge-reranker-v2-m3)    |
| `RERANK_ENABLED`   | True    | Off serves the RRF-fused order straight to the LLM|

---

## Troubleshooting

- **Connection refused on 6333** — only relevant if you set `QDRANT_URL` to a server. Default is embedded; nothing to start.
- **Groq 401** — `.env` is missing or `GROQ_API_KEY` is wrong.
- **Groq 404 `model_not_found`** — the configured `GROQ_MODEL` has been decommissioned. `llama-3.3-70b-versatile` was retired; the default is now `openai/gpt-oss-120b`.
- **Ingestion looks frozen** — it is not: watch the `%` and ETA on the Embed card. A cold model load runs tens of seconds before the first batch, and is reported as its own event.
- **Point count keeps growing on re-ingest** — fixed. Embedded Qdrant's `delete_collection` does not actually drop the points, so `ensure_collection` clears them explicitly.
- **`ValueError: Invalid path` when filtering** — fixed. Qdrant cannot use a payload key containing a space (`Test Type`), so every spaced column is also stored under an underscored alias that filters address.
- **First query is slow** — model download + warm-up. Subsequent calls are ~1 s.
- **Out-of-memory** — reduce `INGEST_BATCH=16`. `BGE_USE_FP16` is off by default: fp16 is a GPU feature and is emulated (slower) on CPU.
- **Port 5050 busy** — change `PORT` env var.

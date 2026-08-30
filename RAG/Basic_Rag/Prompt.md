# RAG Explorer — Local Build Prompt (SUPERSEDED — historical record)

> ## ⛔ Do not rebuild from this file
>
> **Use [`BUILD-PROMPT-DEPLOYED.md`](BUILD-PROMPT-DEPLOYED.md) instead.**
>
> This described the **local-only** build accurately on 2026-07-20. Deployment then
> changed the architecture underneath it. Two instructions below now produce a build
> that **cannot deploy**:
>
> 1. **Embeddings (line ~40).** It says run `nomic-embed-text-v1.5` locally via
>    `sentence-transformers`, "no Nomic API key." The shipped app does the **opposite** —
>    it calls Nomic's **hosted** Atlas API and *requires* `NOMIC_API_KEY`.
>    `sentence-transformers` and `torch` appear **0 times** in `requirements.txt`.
>    Reason, recorded in `vector_store.py`: torch exceeds a 512MB free-tier host and
>    crash-looped on Render.
> 2. **LLM model (line ~54).** It names `llama-3.3-70b-versatile` as "a real,
>    currently-supported Groq model." Groq has since **decommissioned** it — that name
>    now returns `404 model_not_found`. Current: `openai/gpt-oss-120b`.
>
> It also omits deployment entirely (Vercel frontend + Render backend, wired by a
> build-time `VITE_API_URL`), and its hosting advice — Hugging Face Spaces — is not
> what was shipped.
>
> Kept as the record of what the local build looked like, and for the environment
> gotchas at the bottom, which remain valid.

---

This was the **as-built** spec for the local build. It superseded the earlier
`REQUIREMENTS.md` draft (that was the original ask; this is what got shipped after
iteration on 2026-07-20).

---

## Prompt

> Build a full-stack RAG Explorer app: a React UI that visually demonstrates
> every stage of a Retrieval-Augmented Generation pipeline — ingestion,
> chunking, embedding, vector storage, retrieval, and LLM answer generation —
> so a viewer can see each step happen, not just get a final answer.
>
> **Ingestion**
> - Watch a `data/pdf` folder on the backend. Any supported file dropped in
>   auto-ingests within ~1 second (filesystem watcher), no manual trigger
>   needed.
> - Also support a manual "Ingest Document" upload button in the UI (drag/pick
>   a file, POST to the backend, ingest immediately, refresh stats).
> - Support **multiple file types**, not just PDF: `.pdf`, `.txt`, `.md`,
>   `.xlsx`, `.xls`. Each type needs its own text-extraction path:
>   - PDF → per-page text extraction (page number preserved as location).
>   - TXT/MD → whole file read as one section (location = "1").
>   - XLSX/XLS → per-sheet extraction, each row's cells joined with `|`,
>     location = sheet name.
>   - Reject unsupported extensions with a clear 400 error surfaced in the UI
>     (not a silent failure).
> - Normalize extracted text (collapse whitespace/newlines) before chunking —
>   raw PDF extraction is ragged and hurts embedding quality otherwise.
> - Chunk with a fixed-size sliding window (800 chars, 120 overlap) per
>   extracted section, tagging each chunk with source filename + location +
>   chunk index.
> - Re-ingesting the same filename cleanly replaces its old chunks (delete by
>   source before inserting). Deleting a file from the folder drops its
>   chunks too (sync-on-status-check).
>
> **Embedding + Vector Store**
> - ~~Embed chunks with `nomic-ai/nomic-embed-text-v1.5` via
>   `sentence-transformers`, run **fully local** — no Nomic API key, no
>   external embedding service. (`trust_remote_code=True`, needs `einops`.)~~
>   **⛔ SUPERSEDED — the shipped app uses Nomic's HOSTED API and requires
>   `NOMIC_API_KEY`. Local torch OOMs on a 512MB free tier.**
> - Store in **ChromaDB**, local persistent client (`PersistentClient`), cosine
>   space, one collection. No cloud vector DB, no separate server process.
>
> **Retrieval**
> - On query: embed the question with the same model, cosine-similarity search
>   top-4 chunks from Chroma.
> - Return per chunk: rank number, similarity score (1 − cosine distance),
>   source filename, location (page/sheet), and content — real data, not
>   placeholders.
>
> **LLM Answer**
> - Send retrieved chunks as context to **Groq** (~~`llama-3.3-70b-versatile`~~
>   **⛔ DECOMMISSIONED by Groq — now 404s. Use `openai/gpt-oss-120b`** —
>   don't invent a model name).
>   System prompt: answer using ONLY the provided context, say so plainly if
>   the answer isn't in it, cite chunk numbers used.
>   temperature 0.3.
> - Expose the exact augmented prompt sent to the LLM and the token count via
>   the API, so the UI can show/hide it ("Show augmented prompt" toggle) —
>   this is the transparency feature, not optional.
> - If no Groq key is configured, retrieval still works; the answer field
>   returns a clear placeholder instead of crashing.
>
> **API surface (FastAPI)**
> - `GET /api/status` — embedding model name, LLM model, vector DB label,
>   watched folder path, total chunk count, embedding dimensionality, a
>   sample embedding vector (first 8 dims) for the UI's "sample embedding"
>   display, and per-source stats (chunk count + section count).
> - `GET /api/chunks` — every stored chunk (source, location, index, char
>   count, content) for a scrollable chunk-preview browser in the UI.
> - `POST /api/upload` — multipart file upload → validate extension → save to
>   watched folder → ingest → return ingestion result.
> - `POST /api/reingest` — re-scan and re-ingest everything in the folder.
> - `POST /api/query` — `{question, top_k}` → chunks + answer + prompt +
>   tokens.
> - CORS open to the frontend dev origin. Lifespan hook: ingest everything on
>   startup, start the folder watcher, clean shutdown on exit.
>
> **UI (React + Vite + Tailwind, dark theme)**
> - Header: app name, one-line pipeline description, status badges (vector DB
>   name, embedding model name, LLM model name — small dot + label pills).
> - A horizontal **6-step pipeline tracker** (PDF → Chunk → Embed → Store →
>   Retrieve → Answer), numbered circles that highlight as the user moves
>   through ingest → query → answer, so the flow is visually obvious.
> - Two-column main layout:
>   - **Left — Ingestion panel**: upload button + reset button, watched-folder
>     path, list of ingested sources, 4 stat tiles (pages/sections, chunks,
>     embedding dims, stored count), a sample-embedding-vector preview
>     (monospace, truncated), and a scrollable chunk-preview list (each chunk
>     showing index + char count + truncated content).
>   - **Right — Query panel**: question input + ask button, a row of clickable
>     example-question pills, an Answer card (shows token count, the
>     grounded answer, and a toggle to reveal the exact augmented prompt sent
>     to Groq), and a retrieved-chunks list below it showing each chunk's
>     rank, a similarity **match % badge**, source, location, and content.
> - No invented UI chrome beyond what's needed to show the pipeline — keep it
>   information-dense, not decorative.
>
> **Constraints**
> - Everything runs locally by default: local embed model, local vector DB,
>   only Groq is an external network call (and even that degrades gracefully
>   without a key).
> - Use real, currently-existing model/library names. If a requested model
>   name doesn't exist (e.g. a made-up Groq model), substitute the closest
>   real equivalent and say so — don't silently pretend a fake name works.

---

## Known environment gotchas (hit these building it — fix proactively next time)

- `groq` pinned too old (`0.11.0`) conflicts with modern `httpx` (`proxies`
  kwarg removed) → pin `groq>=0.13.0`.
- `nomic-embed-text-v1.5`'s remote code needs `einops` — not a transitive dep
  of `sentence-transformers`, install explicitly.
- First model download (~550MB) over plain HTTP (no `hf_xet`) can take
  several minutes on a slow line — this is normal, not a hang; verify via
  growing byte count in the HF cache dir if uvicorn's own log looks silent
  (tqdm progress bars don't always flush to a redirected/background log).
- Windows + HF cache = symlink warnings (harmless, degrades to plain copies).
- A real secret pasted into `.env.example` by mistake is a leak risk even
  before committing — `.env.example` must always stay a blank template;
  actual keys only ever go in `.env` (gitignored).

## Deploy target (when asked to ship this publicly)

- Frontend (React/Vite static build) → Vercel or Cloudflare Pages, either is
  fine, plain static hosting.
- Backend **cannot** run on Vercel/Cloudflare serverless as-is — it needs
  persistent disk (local Chroma file, local embed model weights) and a
  long-lived process (the folder watcher). Those platforms are stateless /
  size-capped for this kind of ML+disk workload.
- Best free/easy fit found: **Hugging Face Spaces (Docker SDK)** — built for
  exactly this class of torch/transformers workload, no cold-sleep problem
  unlike generic PaaS free tiers.

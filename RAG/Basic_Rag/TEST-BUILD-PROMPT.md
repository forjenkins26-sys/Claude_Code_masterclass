# RAG Explorer — Build Brief

Build this application and deploy it: **frontend to Vercel, backend to Render.** Everything you
need is below — follow it exactly. See **Deployment** for the order and the exact settings.

You will need two API keys before deploying: **Groq** (`console.groq.com`) and
**Nomic** (`atlas.nomic.ai`). Embedding is a hosted call, so the Nomic key is not optional.

---

A React UI that makes every stage of a Retrieval-Augmented Generation pipeline visible
(ingest → chunk → embed → store → retrieve → answer), so a viewer watches each step happen
rather than just receiving a final answer.

## Repository layout — create exactly this

```
app/
  backend/
    main.py            FastAPI app — 5 routes + lifespan
    config.py          env + constants, creates data/pdf and chroma_db
    extractors.py      5 file types -> [(location, text)]
    ingest.py          chunking, deterministic IDs, sync_deleted
    vector_store.py    lazy Chroma init, Nomic embed, query/stats
    llm.py             Groq call, system prompt, build_prompt
    watcher.py         watchdog folder observer
    requirements.txt
    render.yaml
    Dockerfile         (alternative host — not used by Render)
    .env.example       blank template, never real keys
    data/pdf/          watched folder (created at runtime)
    chroma_db/         persistent vector store (created at runtime)
  frontend/
    src/App.jsx
    src/api.js
    src/main.jsx
    src/index.css
    src/components/PipelineTracker.jsx
    src/components/IngestionPanel.jsx
    src/components/QueryPanel.jsx
    vite.config.js
    package.json
```

## Backend — exact dependency pins

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
chromadb==0.5.5
nomic==3.9.0
pypdf==4.3.1
openpyxl==3.1.5
groq>=0.13.0
python-multipart==0.0.9
watchdog==4.0.2
python-dotenv==1.0.1
```

**Do not add `sentence-transformers` or `torch`.** They work locally but exceed free-tier host
RAM (512MB) and crash-loop on deploy. Embedding is a hosted API call, by design.

## `config.py` — exact constants

```python
BASE_DIR    = Path(__file__).resolve().parent
PDF_DIR     = BASE_DIR / "data" / "pdf"     # mkdir(parents=True, exist_ok=True)
CHROMA_DIR  = BASE_DIR / "chroma_db"        # mkdir(parents=True, exist_ok=True)

GROQ_API_KEY    = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
NOMIC_API_KEY   = os.getenv("NOMIC_API_KEY", "")
CORS_ORIGINS    = comma-split of os.getenv("CORS_ORIGINS", "") or ["http://localhost:5173", "*"]

EMBED_MODEL_NAME = "nomic-embed-text-v1.5"
COLLECTION_NAME  = "rag_explorer"
CHUNK_SIZE       = 800
CHUNK_OVERLAP    = 120
TOP_K            = 4
```

`load_dotenv()` at the top. Note `.env` **overrides** these defaults — when a value seems not to
change, check `.env` before editing `config.py`.

## Ingestion

- Watch `data/pdf` with `watchdog`. On `on_created` / `on_modified`, `time.sleep(0.5)` first so
  the OS finishes writing, then ingest. On `on_deleted`, call `sync_deleted()`.
- Run the observer on a **daemon thread**.
- Also expose a manual upload button in the UI — multipart POST, ingest immediately, refresh stats.
- **Five file types**, each with its own extraction path returning `[(location_label, text)]`:

  | Ext | Extractor | Location label |
  |---|---|---|
  | `.pdf` | `pypdf.PdfReader`, per page | page number, 1-based |
  | `.txt` `.md` | `read_text(encoding="utf-8", errors="ignore")` | `"1"` |
  | `.xlsx` `.xls` | `openpyxl.load_workbook(data_only=True, read_only=True)`, per sheet, each row's non-`None` cells joined `" \| "` | sheet title |

  Any other extension raises `ValueError`, surfaced by the API as **HTTP 400** listing the
  supported set. Never a silent failure.
- Normalise every extracted section: `re.sub(r"\s+", " ", text).strip()`. Raw PDF extraction is
  ragged and hurts embedding quality.
- Chunk each section with a sliding window of `CHUNK_SIZE` chars, advancing
  `CHUNK_SIZE - CHUNK_OVERLAP` per step, skipping empty pieces.
- **Cut on word boundaries, never mid-token.** A plain fixed-width slice splits words in half,
  so a chunk opens `"d, and TestNG..."` — the tail of `"Cucumber"`. That hurts twice: the preview
  reads as corrupted text, and the embedding is computed over a fragment beginning with a
  meaningless token, so the vector does not represent the passage.

  Snap **both** the cut point and the overlap step back to the nearest space, searching at most
  `_BOUNDARY_SEARCH = 120` characters. Past that the window is honoured as-is, so one long
  unbroken token — a URL, a base64 blob — cannot collapse a chunk to almost nothing:

  ```python
  def _boundary_before(text: str, index: int) -> int:
      """Largest cut point <= index that does not land inside a word."""
      if index >= len(text):
          return len(text)
      window_start = max(0, index - _BOUNDARY_SEARCH)
      cut = text.rfind(" ", window_start, index + 1)
      return cut if cut > window_start else index
  ```

  Guard the loop against standing still: if the boundary-aligned next start is not greater than
  the current one, fall through to `end`.
- Chunk ID: `hashlib.sha1(f"{source_name}:{idx}".encode()).hexdigest()[:16]` — deterministic, so
  re-ingest overwrites instead of duplicating.
- Metadata per chunk: `{"source": filename, "page": location, "chunk_index": idx}`.
- **Content-hash dedup.** Fingerprint each document by its *extracted text*, not its filename
  or raw bytes: `sha1("\n".join(f"{loc}\x00{text}"))` over the normalised sections, stored on
  every chunk as `doc_hash`. Before ingesting, look for that hash in the store.
  - Found under a **different** filename → **skip**, return
    `{"chunks": 0, "skipped": "duplicate", "duplicate_of": <original>}`.
  - Found under the **same** filename, or not found → **ingest normally.**

  The `existing != source_name` guard is what makes an *updated* document still re-ingest:
  same name with edited content must always replace, never skip, or the store silently serves
  stale requirements. Hashing extracted text (not bytes) means a spec re-saved by a different
  PDF writer still matches; page order is part of the hash because retrieval cites page numbers.

  Without this, one document uploaded under two names — `Doc_(PRD).pdf` and `Doc (PRD).pdf` —
  is stored twice and consumes two of the four retrieval slots with identical text, halving
  effective breadth. Filename equality alone cannot catch it.
- **Order matters:** extract and hash **before** `delete_source()`. Deleting first destroys the
  only copy of the content the duplicate check needs to find.
- `ingest_pdf()` then calls `delete_source(name)`, then inserts — clean re-ingest.
- `sync_deleted()` drops chunks whose source no longer exists on disk. Called from `/api/status`.
- Use `collection.upsert(...)`, not `add(...)`.

## Embedding + vector store

- Embed through **Nomic's hosted Atlas API**:
  `nomic.embed.text(texts=..., model="nomic-embed-text-v1.5", task_type=..., dimensionality=768)`,
  returning `result["embeddings"]`. Requires `NOMIC_API_KEY`.
- `nomic.login(NOMIC_API_KEY)` exactly once — guard with a module flag **and** a `threading.Lock`.
- **Asymmetric task types, non-negotiable:** `search_document` when embedding stored chunks,
  `search_query` when embedding the user's question. The model is trained for this; using one
  type for both silently degrades retrieval with no error.
- ChromaDB `PersistentClient(path=CHROMA_DIR)`, `get_or_create_collection(name="rag_explorer",
  metadata={"hnsw:space": "cosine"})`.
- **Lazy-init the client inside `get_collection()`, never at module import.** Module import runs
  before uvicorn binds its port, and Render kills a deploy that does not open a port within its
  scan timeout. Import `chromadb` inside the function too.
- **Guard that init with a `threading.Lock` and a double-check** (`if _collection is None` both
  outside and inside the lock). The background ingest task and incoming requests race on a
  brand-new data directory; Chroma's SQLite backend fails with
  `Could not connect to tenant default_tenant` if two threads create it at once. Both hazards are
  real — they were hit in production.
- Helpers required by the UI: `stats()` (total + per-source `{chunks, pages}`), `embedding_dims()`,
  `sample_embedding(n=8)` (rounded to 4dp), `list_chunks(limit=200)` sorted by `(source, chunk_index)`.

## Retrieval

- Embed the question with `search_query`, then `collection.query(n_results=top_k,
  include=["documents", "metadatas", "distances"])`.
- Similarity from cosine distance: `round(1 - dist, 4)`.
- Per chunk return `{chunk_number (1-based), similarity, source, page, content}`.
- Empty store → return `{"chunks": [], "answer": "No chunks retrieved — ingest a PDF into
  data/pdf first.", "prompt": null, "tokens": null}` **without calling the LLM**.

## LLM answer

- Groq, model from `GROQ_MODEL`, `temperature=0.3`.
- System prompt, verbatim:

  > You are a RAG assistant. Answer the user's question using ONLY the provided context chunks.
  > If the context does not contain the answer, say so plainly. Do not use outside knowledge.
  >
  > Cite sources as plain text in square brackets, naming the chunk number exactly as it appears
  > in the context — for example [Chunk #2], or [Chunk #1, #3] for several. Never invent line
  > numbers, and never use any other citation notation: no daggers, no CJK brackets, no footnote
  > marks. A citation that does not match a chunk number given above is wrong.

  The second paragraph is not optional padding. A vague "cite chunk numbers you used" leaves the
  model free to fall back on its own trained notation — `gpt-oss` emits `【3†L1-L4】`, pointing at
  line numbers that do not exist in our chunks.

- User message, exact shape:

  ```
  Context:
  [Chunk #1 | source.pdf p.3]
  <content>

  [Chunk #2 | source.pdf p.7]
  <content>

  Question: <the question>
  ```

- **Normalise the model's citations server-side before returning the answer.** A prompt
  instruction is a request, not a guarantee — the model still emits its own notation some of the
  time. Rewrite markers that carry a usable chunk number into `[Chunk #N]` and drop the rest:

  ```python
  _CJK_CITATION = re.compile(r"【([^】]*)】")

  def strip_model_citations(text: str) -> str:
      def replace(match):
          inner = match.group(1)
          nums = re.findall(r"(\d+)\s*†", inner) or re.findall(r"^(\d+)$", inner.strip())
          if not nums:
              return ""
          seen = list(dict.fromkeys(nums))
          return " [Chunk #" + ", #".join(seen) + "]"

      cleaned = _CJK_CITATION.sub(replace, text)
      cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)         # collapse doubled spaces
      cleaned = re.sub(r"[ \t]+([.,;:])", r"\1", cleaned)  # pull punctuation back
      return cleaned.strip()
  ```

  Apply it to `completion.choices[0].message.content` on the way out.
- Return `{answer, prompt, tokens}` — `prompt` is the **exact augmented text** sent, `tokens` is
  `completion.usage.total_tokens`. Exposing the prompt is the point of the app, not optional.
- Construct the client at module level as `Groq(api_key=...) if GROQ_API_KEY else None`.
  **No key must not crash the app** — return a bracketed placeholder saying the key is missing
  and the retrieved chunks above are still real.

## API — FastAPI

| Route | Behaviour |
|---|---|
| `GET /api/status` | calls `sync_deleted()` first, then returns `embedding_model`, `llm_model`, `vector_db` (`"ChromaDB (local, persistent)"`), `pdf_folder`, `total_chunks`, `embedding_dims`, `sample_embedding`, `sources` |
| `GET /api/chunks` | `{"chunks": [...]}` — every stored chunk with `index`, `source`, `page`, `chars`, `content` |
| `POST /api/upload` | multipart `UploadFile` → validate ext (400 if bad) → sanitise name → write → ingest → `{"ingested": {...}}` |
| `POST /api/reingest` | re-scan the folder → `{"ingested": [...]}` |
| `POST /api/query` | `{question, top_k=4}` → `{query, chunks[], answer, prompt, tokens}` |
| `DELETE /api/source/{name}` | drops that document's chunks **and** its file from the watched folder → `{deleted, file_removed, remaining_sources, total_chunks}` |
| `DELETE /api/sources` | empties the store — every document's chunks and every supported file in the watched folder → `{cleared, files_removed, total_chunks}`. Idempotent: on an already-empty store it returns 200 with empty lists |

- **Sanitise the upload filename** — keep only characters passing `isalnum()` plus `" ._-()"`,
  falling back to `upload{ext}`. The client-supplied name is a display label, never a path.
  This is the path-traversal guard.
- **Delete must remove the file too.** Dropping only the chunks leaves the document on disk
  for the watcher to re-ingest on the next restart — the deletion would silently undo itself.
  Guard the name with `source_name != Path(source_name).name` (plus `""`/`.`/`..`): a traversal
  attempt fails that equality rather than being quietly rewritten into a valid-looking path.
- The UI lists each ingested source with a `✕` button calling that route, then clears the current
  query result — it may cite chunks that no longer exist. Keep the button **always visible**
  (reddening on hover and focus), never `opacity-0` until hover: a hover-only control is
  unreachable on a touch device and easy to miss anywhere else.
- **Lifespan hook:** `asyncio.create_task(asyncio.to_thread(_startup_ingest))` where
  `_startup_ingest()` runs `ingest_all()` then `start_watcher()`. Non-blocking so uvicorn binds
  its port immediately — a blocking startup ingest gets the deploy killed.
- CORS middleware from `CORS_ORIGINS`, `allow_methods=["*"]`, `allow_headers=["*"]`.

## Frontend — React 19 + Vite + Tailwind v4, dark theme

**Dependencies:** `react@^19.2`, `react-dom@^19.2`, `tailwindcss@^4.3`, `@tailwindcss/vite@^4.3`.
Dev: `vite@^8.1`, `@vitejs/plugin-react@^6`, `oxlint`. Tailwind v4 loads as a **Vite plugin** —
no `tailwind.config.js`, no PostCSS file.

**`vite.config.js`:** plugins `[react(), tailwindcss()]`, and `server.proxy = { '/api':
'http://localhost:8000' }` for dev.

**`api.js`:** `const API_ROOT = import.meta.env.VITE_API_URL || ""` then `const BASE =
${API_ROOT}/api`. Empty in dev so the proxy handles it; the absolute Render URL in production.
Six wrappers: `getStatus`, `getChunks`, `runQuery`, `reingest`, `uploadPdf`, `deleteSource`.
`uploadPdf` sends `FormData`; both it and `deleteSource` surface `body.detail` as the error
message so a 400/404 reaches the user. `deleteSource` calls
`DELETE ${BASE}/source/${encodeURIComponent(name)}`.

**`App.jsx`** — owns all state: `status`, `chunks`, `uploading`, `queryLoading`, `result`,
`error`, `step`.

- `refresh()` runs `Promise.all([getStatus(), getChunks()])` and sets
  `step = total_chunks > 0 ? 4 : 1`. On throw, sets the error string
  **"Backend unreachable — is uvicorn running on :8000?"**
- Step machine: `1` empty · `2` uploading · `4` stored · `5` querying · `6` answered.
- Header: orange `R` tile (`h-8 w-8 rounded bg-orange-500`), title **"RAG Explorer"**, subtitle
  *"Doc (PDF/TXT/MD/Excel) → chunk → Nomic embed → ChromaDB → retrieve top-4 → Groq answer"*,
  and three pills each with a `bg-emerald-500` dot: `ChromaDB`, `nomic-embed-text`, and
  `status?.llm_model ?? "groq"`.
- Body `bg-neutral-950 text-neutral-100`. Main is `grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-8`.

**`PipelineTracker.jsx`** — build this first; it is what makes the pipeline legible.
Six steps, each `{label, sub}`:
`PDF/load document` · `Chunk/split text` · `Embed/Nomic vectors` · `Store/ChromaDB` ·
`Retrieve/top-k` · `Answer/Groq LLM`.
Numbered circle + label + sub, `→` between. Three states:
**done** `border-emerald-800 bg-emerald-950/40` · **active**
`border-emerald-500/60 bg-emerald-500/10 animate-pulse` · **idle** `border-neutral-800
bg-neutral-900/40` with a `bg-neutral-800 text-neutral-500` circle. Horizontal, `overflow-x-auto`.

It takes **two** props — `activeStep` and `busy`:

```jsx
const state =
  activeStep > i + 1 ? "done"
  : activeStep === i + 1 ? (busy ? "active" : "done")
  : "idle";
```

`busy` is `uploading || queryLoading`. Without it the furthest step reached always renders
brighter than the ones behind it, so a settled pipeline — document stored, nothing running —
looks stuck mid-write. The pulse then means work is genuinely in flight, and at rest the step
reads "done" like its predecessors.

**`IngestionPanel.jsx`** — heading `1 · Ingestion`.
Hidden `<input type="file" accept=".pdf,.txt,.md,.xlsx,.xls">` driven by a ref; orange
**"Ingest Document"** button (label becomes `Ingesting…` while busy) plus an outlined **Reset**
that calls `DELETE /api/sources` and returns the whole app to its pre-upload state — documents
gone, question box empty, answer cleared, tracker back to step 1. **No confirmation dialog.**
A page refresh does *not* clear anything: it re-reads whatever is stored, so an accidental
reload costs nothing and clearing stays a deliberate click.
Then: watched-folder path in mono, the supported-types line, the ingested-source list with a
`▣` bullet, **four stat tiles** — `Pages` (sum of per-source `pages`), `Chunks`, `Embed dims`,
`Stored` — the sample-embedding preview rendered `[0.0123, -0.0456, ..., ...]` in
`font-mono text-emerald-400`, and a chunk browser `max-h-80 overflow-y-auto` where each entry
shows `chunk {index} · {chars} chars` in orange over `line-clamp-3` content.
Empty state: *"No chunks yet — ingest a PDF to see previews."*

**`QueryPanel.jsx`** — heading `2 · Ask the document`.
Input + orange **Ask** button (`Asking…` while loading, disabled when empty). Four example pills,
clickable, that submit immediately. Keep them **document-agnostic** — pills naming a specific
document ("What is the goal of this PRD?") read as nonsense the moment anything else is ingested:
*"What is this document about?"* · *"Summarise the main points."* ·
*"What are the key details?"* · *"List the most important facts."*
**Answer card:** label `ANSWER`, token count top-right as `groq · {n} tok`, the answer in
`whitespace-pre-wrap` behind a `border-l-2 border-orange-500 pl-3`, and below it a toggle reading
**"Show / Hide the augmented prompt sent to Groq"** revealing the raw prompt in a
`max-h-64 overflow-y-auto` `<pre>`.
**Retrieved list:** header `Retrieved context · top {n}`, container `max-h-96 overflow-y-auto`;
each chunk shows `#{n} {source} · chunk {n}` in orange, a
`{Math.round(similarity * 100)}% match` badge in emerald, `page {page}`, then content.

**Palette:** `neutral-950` ground, `neutral-100` text, **orange-500 = actions**,
**emerald-500 = pipeline/success**. Information-dense, no decorative chrome.

**`index.css` — restore the pointer cursor.** Tailwind v4's preflight sets `cursor: default` on
`<button>` (a deliberate change from v3), so without this *nothing in the UI looks clickable*:

```css
button, [role="button"], label[for], summary { cursor: pointer; }
button:disabled, [role="button"][aria-disabled="true"] { cursor: not-allowed; }
```

One global rule beats adding `cursor-pointer` to every class string — any button added later
inherits it, and disabled controls read as unavailable rather than merely clickable.

## Deployment

**Backend → Render.** `render.yaml` at `app/backend/`:

```yaml
services:
  - type: web
    name: rag-explorer-api      # any unique name; must not clash with an existing Render service
    runtime: python
    plan: free
    rootDir: app/backend      # path to the backend from YOUR repo root
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GROQ_API_KEY
        sync: false
      - key: GROQ_MODEL
        value: openai/gpt-oss-120b
      - key: NOMIC_API_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: PYTHON_VERSION
        value: 3.11.9
```

`sync: false` means "set this by hand in the dashboard, never commit it."

**Frontend → Vercel.** Static Vite build, no `vercel.json` needed.

### Why two hosts, not one

**Vercel cannot host the backend.** Its Python functions are serverless: no writable disk that
survives a request, and no long-lived process. This backend needs both — a persistent ChromaDB
directory and a `watchdog` observer running continuously. Deploying it to Vercel fails at runtime,
not at build time, which makes the failure look like a bug in the code.

So: **Vercel serves the React frontend; Render runs the FastAPI backend.** One build-time env var
connects them.

### Deployment order — backend first

The frontend bakes the backend URL into its bundle at build time, so the backend must exist first.

**1. Push the repo to GitHub.** Both `app/frontend` and `app/backend` in one repo is fine.

**2. Deploy the backend to Render.**
   - New → Web Service → connect the repo
   - **Root Directory:** `app/backend`
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment → add `GROQ_API_KEY` and `NOMIC_API_KEY` (both required — the app needs a Nomic
     key because embedding is a hosted call, not a local model)
   - Wait for the first deploy, then confirm:
     `curl https://<your-service>.onrender.com/api/status` returns JSON. **Allow 60–90s** —
     a free-tier service cold-sleeps and the first request wakes it.

**3. Deploy the frontend to Vercel.**
   - New Project → same repo
   - **Root Directory:** `app/frontend`
   - Framework preset: Vite (auto-detected)
   - Environment Variables → `VITE_API_URL` = the Render URL from step 2,
     **no trailing slash** (`api.js` appends `/api` itself)
   - Deploy

**4. Close CORS.** Back in Render, set `CORS_ORIGINS` to the Vercel URL and drop the `*` wildcard.
   Saving triggers a redeploy.

**5. Verify end to end** — open the Vercel URL, upload a PDF, ask a question. A grounded answer
   with 4 chunks means both halves are talking.

### Two traps that cost real time

- **`VITE_API_URL` is inlined at build time.** Changing it in Vercel's dashboard does nothing until
  you *redeploy* the frontend. A plain "restart" will not pick it up.
- **Render's free-tier disk is ephemeral.** Every redeploy wipes `chroma_db/` and anything uploaded
  through the UI. Only documents committed under `data/pdf/` survive, because startup ingestion
  re-reads that folder. Fine for a demo; not a place to store user uploads.

A `Dockerfile` also exists for Hugging Face Spaces (non-root `appuser`, `EXPOSE 7860`) if you would
rather host both halves in one container. Render uses the native Python runtime, not this file.

## Non-negotiables

1. Hosted Nomic embeddings — **never** local `sentence-transformers`/`torch`
2. Asymmetric task types — `search_document` vs `search_query`
3. Lazy + lock-guarded Chroma init
4. Non-blocking startup ingest inside the lifespan hook
5. Sanitised upload filenames
6. The augmented prompt is exposed to the UI
7. Missing Groq key degrades, never crashes

---

## Environment gotchas — handle these proactively

| Trap | Symptom | Fix |
|---|---|---|
| torch on free tier | crash-loop, OOM at 512MB | hosted Nomic API |
| Chroma at module import | deploy killed, "no port opened in time" | lazy-init in `get_collection()` |
| Chroma thread race | `Could not connect to tenant default_tenant` | `threading.Lock` + double-check |
| `groq==0.11.0` | `proxies` kwarg gone from modern `httpx` | `groq>=0.13.0` |
| Retired Groq model | `404 model_not_found` | verify the model is live **before** every rebuild |
| `.env` overrides `config.py` | editing the default does nothing | change `.env` |
| Stale process on :8000 | fixes appear to do nothing | `netstat -ano \| grep :8000` → `taskkill //PID <pid> //F` |
| Render cold sleep | `000` / client timeout on first hit | allow 60–90s; measured 5.1s to wake |
| `VITE_API_URL` changed | frontend still calls the old host | it is inlined at build time — **rebuild**, do not just redeploy |
| Real key in `.env.example` | leak before you ever commit | template stays blank; keys only in gitignored `.env` |
| Tailwind v4 preflight | no hand cursor anywhere; nothing looks clickable | global `button { cursor: pointer }` in `index.css` |
| Fixed-width chunk slice | chunks open mid-word (`"umber, Rest Assured"`) | snap cut **and** overlap to the nearest space |
| Model's own citation format | `【3†L1-L4】` in answers, pointing at lines that do not exist | name the format in the prompt **and** normalise server-side |
| Chunker changed after ingest | old documents keep their old chunks | chunking applies at ingest time — re-ingest to rebuild |


---

## Constants (exact values)

`CHUNK_SIZE=800` · `CHUNK_OVERLAP=120` · `TOP_K=4` · `dimensionality=768` ·
`COLLECTION_NAME="rag_explorer"` · `hnsw:space="cosine"` · `temperature=0.3` ·
`sample_embedding` = first 8 dims, 4dp · `list_chunks` limit 200

**Sample document** — commit any multi-page PDF under `app/backend/data/pdf/` so the deployed
service has something to ingest on startup. A product-requirements doc works well: it gives
questions with answers spread across several pages, which is what makes top-4 retrieval
visible. Anything committed there survives a redeploy; anything uploaded through the UI
does not.

---

## Definition of done

1. `uvicorn main:app --port 8000` starts; `GET /api/status` returns 200 with the seven documented fields.
2. Dropping a PDF into `data/pdf` auto-ingests it — `total_chunks` rises with no manual trigger.
3. Uploading a `.docx` returns **HTTP 400** naming the supported extensions.
4. A query returns exactly 4 chunks, each with a similarity between 0 and 1, plus a grounded answer.
5. The UI reveals the exact augmented prompt sent to the LLM.
6. With `GROQ_API_KEY` unset, retrieval still works and the answer field shows a placeholder — no crash.
7. Frontend builds and deploys to Vercel; the backend deploys to Render; the two talk over `VITE_API_URL`.
8. **Dedup behaves on all four paths:**
   - same file under a second name → `skipped: "duplicate"`, chunk count unchanged
   - **same name, edited content → re-ingests; the old text is gone from the store**
   - same name, identical content → re-ingests harmlessly
   - a genuinely different document → ingests normally
9. **Delete works and is safe:**
   - `DELETE /api/source/{name}` removes the chunks **and** the file; a restart does not resurrect it
   - `../../../etc/passwd`, `..`, and URL-encoded slashes are all rejected (400 or 404)
   - an unknown name returns 404; other sources are untouched
10. **No chunk begins or ends mid-word.** Ingest a document whose text runs past 800 characters
    and read the chunk previews: every one opens on a whole word. A 900-character unbroken token
    still chunks sanely instead of collapsing to a fragment.
11. **Answers carry no foreign citation markers** — `[Chunk #2]` only, never `【3†L1-L4】`.
12. **Reset returns the app to its pre-upload state** with no confirmation dialog: documents gone,
    question box empty, answer cleared, tracker at step 1. A page **refresh** does not clear
    anything — it re-reads what is stored.
13. **Every control shows a hand cursor**; disabled ones show `not-allowed`.
14. **The pipeline tracker only pulses while work is running.** With a document stored and nothing
    in flight, no step renders brighter than the rest.

# Build Prompt — `AI_Basic_RAG` (n8n, local)

A self-contained brief for rebuilding the local **n8n** RAG workflow from nothing —
both the ingestion phase and the query phase. Every value below was read out of the working workflow
(`~/.n8n/database.sqlite`), not recalled — node types, versions, parameters and the
Pinecone index name are exact.

> **Scope:** this workflow is a **complete RAG system in two phases inside one
> canvas.** Phase 1 ingests (form upload → chunk → embed → Pinecone). Phase 2
> answers (chat → agent → retrieve from Pinecone → grounded reply). The two phases
> share nothing but the Pinecone index — they have separate triggers and never
> connect on the canvas.

**Shortcut:** a working export of the finished workflow sits next to this file at
[`n8n_AI_Basic_RAG.json`](n8n_AI_Basic_RAG.json). In n8n: **Workflows → ⋯ → Import from
File**. It carries credential *references* but no keys, so after importing you
re-select your own Pinecone / Google / Groq credentials in each of the five nodes
that need them. Build by hand from sections 4 and 5 if you want to understand it;
import if you just want it running.

There is a second, unrelated RAG in this repo — the Python **RAG Explorer** under
`RAG/Basic_Rag/app/` (FastAPI + React, Nomic + ChromaDB + Groq, deployed to
Render/Vercel). Different stack, different purpose. See section 10.

---

## 1. What you are building

A visual n8n workflow of **11 functional nodes** (plus a sticky note) in two
independent phases. Phase 1 turns an uploaded document into searchable vectors:

```
On form submission (form trigger)
        │  1 item (binary file)
        ▼
Store the document to Vector Db  ──── Embeddings ──── Embeddings Google Gemini
   (Pinecone, insert mode)       │
                                 └──── Document ──── Default Data Loader
                                                          │
                                                          └── Text Splitter ──
                                                              Recursive Character
                                                              Text Splitter
```

The three lower nodes are **sub-nodes** — they attach to their parent by named
ports (`Embeddings`, `Document`, `Text Splitter`), not by the normal left-to-right
data connection. This is the part that trips people up: only the trigger connects
to the vector store on the main line.

A real run of this phase turned one PDF into **13 chunks**, all reaching Pinecone.

Phase 2 (section 8) answers questions against those vectors: a chat trigger feeds an
AI agent that calls Pinecone as a retrieval tool. Build Phase 1 first — there is
nothing to retrieve until something has been ingested.

---

## 2. Prerequisites

| Need | Detail |
|---|---|
| Node.js | 18+ (built and verified on Node 22) |
| n8n | installed globally — `npm install -g n8n` (~2.4 GB, 2300+ packages, allow ~10 min) |
| Google AI API key | for Gemini embeddings — https://aistudio.google.com/apikey |
| Pinecone account | free tier is enough — https://app.pinecone.io |

Start n8n and open the editor:

```bash
n8n start
# editor: http://localhost:5678
```

Workflows are stored in `~/.n8n/database.sqlite`, which is **separate from the
installed package**. Reinstalling or upgrading n8n does not touch your workflows.

---

## 3. Create the Pinecone index first

The vector store node picks its index from a dropdown, so the index must exist
before you configure the node.

In the Pinecone console, create an index:

| Setting | Value |
|---|---|
| Name | `rag-basic` |
| Dimensions | **768** |
| Metric | `cosine` |

**768 is not optional.** Google's `text-embedding-004` (what the Gemini embeddings
node emits) produces 768-dimensional vectors. An index created at OpenAI's common
1536 will reject every insert with a dimension-mismatch error, and the message does
not always make the cause obvious. If you already made a 1536 index, delete it and
recreate — dimensions cannot be changed after creation.

---

## 4. Build the workflow, node by node

Create a new workflow named **`AI_Basic_RAG`**.

### 4.1 On form submission

- Node: **n8n Form Trigger** (`n8n-nodes-base.formTrigger`, typeVersion 2.5)
- **Form Title:** `RAG Document Upload`
- Add one form field:
  - **Field Label:** `upload File`
  - **Field Type:** `File`
  - **Accepted file types:** `.pdf, .docs, .txt, .json, .html`

> Note on a quirk you will inherit: n8n uses the *accepted-types string* as the
> JSON key for the uploaded file. So downstream the field is addressed as
> `$('On form submission').item.json[".pdf, .docs, .txt, .json, .html"][0]` —
> which looks wrong but is correct for this configuration. If you rename the
> accepted-types list, you must update the metadata expressions in 4.3 to match,
> or they resolve to `undefined` silently.

### 4.2 Store the document to Vector Db

- Node: **Pinecone Vector Store** (`@n8n/n8n-nodes-langchain.vectorStorePinecone`, typeVersion 1.3)
- **Operation Mode:** `Insert Documents`
- **Pinecone Index:** select `rag-basic` from the list
- **Credential:** Pinecone API — paste your API key

Connect `On form submission` → this node on the main connection.

Adding this node exposes two sub-node ports beneath it: **Embeddings** and
**Document**. Fill both.

### 4.3 Default Data Loader  → the `Document` port

- Node: **Default Data Loader** (`@n8n/n8n-nodes-langchain.documentDefaultDataLoader`, typeVersion 1.1)
- **Type of Data:** `Binary`  ← must be Binary, not JSON; the form sends a file
- **Text Splitting:** `Custom` ← this is what exposes the Text Splitter port
- Under **Options → Metadata**, add two entries:

| Name | Value (expression) |
|---|---|
| `fileName` | `={{ $('On form submission').item.json[".pdf, .docs, .txt, .json, .html"][0].filename }}` |
| `uploadedAt` | `={{ $('On form submission').item.json.submittedAt }}` |

Metadata is stored alongside each vector in Pinecone, so retrieved chunks can cite
their source file and upload time. Skip this and every chunk becomes anonymous
text with no way to attribute it.

### 4.4 Recursive Character Text Splitter → the `Text Splitter` port

- Node: **Recursive Character Text Splitter** (`@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter`, typeVersion 1)
- **Chunk Overlap:** `200`
- Chunk Size: leave at the node default

Overlap exists so a sentence split across a chunk boundary still appears whole in
one of the two neighbours. With zero overlap, facts that straddle a boundary become
unretrievable — the classic silent RAG quality bug.

### 4.5 Embeddings Google Gemini → the `Embeddings` port

- Node: **Embeddings Google Gemini** (`@n8n/n8n-nodes-langchain.embeddingsGoogleGemini`, typeVersion 1)
- Parameters: none — defaults are correct
- **Credential:** Google Gemini (PaLM) API — paste your Google AI key

> The credential type is still named `googlePalmApi` internally, a leftover from
> the PaLM era. It is the right credential for Gemini; do not go looking for a
> separate "Gemini" credential type.

### 4.6 Sticky note (optional)

Drop a sticky note on the canvas with the objective, so the workflow explains
itself when reopened months later:

```
Objective

Build a basic RAG (Retrieval-Augmented Generation) system that can:

Ingest text or PDF documents.
Convert the content into embeddings.
Store the embeddings in a database.
Retrieve relevant information from the database.
Allow users to query the data through a chat interface.
```

---

## 5. Run it

1. Click **Execute workflow**
2. n8n opens the generated form — upload a PDF
3. Watch the canvas

Green borders on all nodes and an item count on each edge means success. A healthy
run looks like:

```
On form submission ──1 item──> Store the document to Vector Db
Default Data Loader ──13 items──> (into Document port)
Recursive Character Text Splitter ──13 items──>
```

The chunk count varies with document length; the point is that it is greater than
zero and identical on both sub-node edges.

Verify independently in the Pinecone console: index `rag-basic` should show a
non-zero vector count. Green nodes alone are not proof the vectors landed — check
the destination.

---

## 6. Known trap: PDF upload fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`

**This one will hit you on n8n 2.22.6 and it is not your workflow's fault.**

Symptom — form submits, then:

```
Error in sub-node 'Default Data Loader'
ERR_PACKAGE_PATH_NOT_EXPORTED
Package subpath './lib/pdf.js/v1.10.100/build/pdf.js' is not defined by
"exports" in .../pdf-parse/package.json
```

Cause: n8n ships **two** copies of `pdf-parse`. LangChain's PDF loader needs the
old `1.1.1` layout, but `@langchain/community` resolves upward to the hoisted
`2.4.5` — a rewrite in which `lib/pdf.js/v1.10.100/` does not exist at all.

Fix — copy the good version into the place that needs it (paths are Windows;
adjust the prefix on other platforms):

```bash
N="$HOME/AppData/Roaming/npm/node_modules/n8n"
cp -r "$N/node_modules/@n8n/n8n-nodes-langchain/node_modules/pdf-parse" \
      "$N/node_modules/@n8n/ai-utilities/node_modules/@langchain/community/node_modules/pdf-parse"
```

Then restart n8n. Verify before re-running the workflow:

```bash
cd "$N/node_modules/@n8n/ai-utilities/node_modules/@langchain/community"
node -e "console.log(require(require.resolve('pdf-parse/package.json')).version)"
# expect: 1.1.1
```

The top-level `2.4.5` is left in place for anything else that depends on it.

> This patch lives inside `node_modules`, so **any future `npm install -g n8n`
> upgrade erases it.** If PDF uploads break again after an upgrade, re-run the
> copy above.

---

## 7. Other failure modes worth knowing

| Symptom | Cause | Fix |
|---|---|---|
| `MODULE_NOT_FOUND` for `.../n8n/bin/n8n` on `n8n start` | Global install corrupted — package folder empty, only the PATH shim survives | `npm uninstall -g n8n`, remove the empty dir, `npm install -g n8n`. Workflows in `~/.n8n/` are unaffected |
| Dimension mismatch on insert | Pinecone index not 768-d | Delete and recreate the index at 768 (section 3) |
| `fileName` metadata is `undefined` | Accepted-types string changed but the expression key was not | Make the key in 4.3 match the field's accepted-types string exactly |
| No `Text Splitter` port on the loader | Text Splitting left on `Simple` | Set it to `Custom` |
| Credentials rejected after an n8n upgrade | Major-version jump | Re-enter the Pinecone and Google keys in the credential editor |
| `Failed to start Python task runner` at boot | Optional Python runner venv absent | Harmless for this workflow — ignore |

---

## 8. Phase 2 — the query side

Five more nodes on the same canvas, forming a second, independent branch. Nothing
connects Phase 1 to Phase 2 visually; they meet only in the Pinecone index.

```
When chat message received ──main──> RAG Agent
                                      │
                    Chat Model ───────┼──── Groq Chat Model
                        Memory ───────┼──── Simple Memory
                          Tool ───────┴──── Retrieve from Pinecone
                                                  │
                                     Embeddings ──┴── Embeddings Google Gemini1
```

### 8.1 When chat message received

- Node: **Chat Trigger** (`@n8n/n8n-nodes-langchain.chatTrigger`, typeVersion 1.3)
- Parameters: none — defaults are correct
- Connect its **main** output to `RAG Agent`

> Use the **Chat Trigger**, not the node simply called **Chat**. The latter is an
> *action* node (operations "Send Message" / "Send and Wait for Response") that
> sends a message mid-workflow; it has a required **Message** field and shows a red
> badge when used as an entry point. They look nearly identical in the node picker.

### 8.2 RAG Agent

- Node: **AI Agent** (`@n8n/n8n-nodes-langchain.agent`, typeVersion 3.1)
- **Options → System Message:**

```
You are a helpful assistant that answers questions based ONLY on the retrieved
documents. Use the "Retrieve from Pinecone" tool to search for relevant
information. If you cannot find the answer in the retrieved documents, respond
with: "I couldn't find that in the uploaded documents." Always cite which
document (fileName) you found the information in.
```

The `fileName` citation instruction only works because Phase 1 wrote that metadata
in section 4.3. Drop the metadata and the model has nothing to cite.

### 8.3 Groq Chat Model → `Chat Model` port

- Node: **Groq Chat Model** (`@n8n/n8n-nodes-langchain.lmChatGroq`, typeVersion 1)
- **Model:** `openai/gpt-oss-120b`
- **Credential:** Groq API — key from `console.groq.com`

### 8.4 Simple Memory → `Memory` port

- Node: **Simple Memory** (`@n8n/n8n-nodes-langchain.memoryBufferWindow`, typeVersion 1.4)
- Parameters: none

Gives the agent conversational context, so follow-up questions ("what about the
second one?") resolve against earlier turns.

### 8.5 Retrieve from Pinecone → `Tool` port

- Node: **Pinecone Vector Store** (`@n8n/n8n-nodes-langchain.vectorStorePinecone`, typeVersion 1.3)
- **Operation Mode:** `Retrieve Documents (As Tool for AI Agent)`
- **Pinecone Index:** `rag-basic` — the same index Phase 1 writes to
- **Limit / topK:** `3`
- **Description** (`toolDescription`, **required in this mode**):
  ```
  Search the uploaded documents knowledge base. Use this to find information from PDFs and files the user has uploaded.
  ```
- **Rename the node to exactly `Retrieve from Pinecone`**

> Two traps here, both of which leave the node red or the agent useless:
>
> **`toolDescription` is required** in `retrieve-as-tool` mode. n8n's own schema
> states it plainly — *"Set `toolDescription` so the agent knows when to call it."*
> Leave it empty and the node shows a red badge and the workflow will not run.
>
> **The node's name is the tool name the LLM sees.** The system message in 8.2
> instructs the agent to call a tool named `"Retrieve from Pinecone"`. If the node
> is still called `Pinecone Vector Store`, the agent searches for a tool that does
> not exist, retrieves nothing, and answers *"I couldn't find that in the uploaded
> documents"* to every question — while every node still shows green. This failure
> is invisible on the canvas.

### 8.6 Embeddings Google Gemini1 → the retriever's `Embeddings` port

- Node: **Embeddings Google Gemini** (`@n8n/n8n-nodes-langchain.embeddingsGoogleGemini`, typeVersion 1)
- Parameters: none
- **Credential:** the same Google credential Phase 1 uses

> **This must be the same embedding model as ingestion (4.5).** Query vectors and
> document vectors have to live in the same vector space; embed the question with a
> different model and cosine similarity compares two unrelated coordinate systems.
> Retrieval then returns confident nonsense with no error anywhere. It is the single
> most common silent failure in a hand-built RAG system.

### 8.7 Run the query side

1. **Save** the workflow — chat triggers need a saved workflow before the panel opens
2. Click **Execute workflow**; a chat panel opens at the bottom
3. Ask something answerable only from the uploaded PDF

A correct answer cites a `fileName`. If every question returns *"I couldn't find
that in the uploaded documents"*, work through this order: the tool name in 8.5
matches the system message → Pinecone shows a non-zero vector count → the
embedding model matches on both sides.

---

## 9. Hosting — this stays local, by decision

**n8n cannot run on Vercel.** Vercel executes stateless serverless functions on a
read-only filesystem that freeze between requests; n8n is a long-running stateful
server with a SQLite database and background workers. This is an architecture
mismatch, not a configuration problem — no amount of `vercel.json` fixes it.

The real hosting options, if this ever needs to be public:

| Option | Cost | Note |
|---|---|---|
| n8n Cloud | ~$20-24/mo | Import the JSON, re-enter 3 credentials, get a public chat URL |
| Render / Railway / Fly.io | ~$7-10/mo | Self-host the Docker image. A **persistent disk is mandatory** — free tiers wipe the SQLite DB on redeploy, taking the workflow with it |
| Rebuild as a web app | free | Port Phase 2 to React + Pinecone + Groq. A build, not a deploy, and the visual canvas is lost |

**Decision (2026-08-30): keep it local.** The public-facing RAG demo is already the
Python RAG Explorer (section 10) — deployed, free, and doing the same job. Paying
monthly to host a second RAG that ingests into a different vector store would
duplicate what is already live. Revisit only if someone needs to see the n8n canvas
itself, which is the one thing the Python app cannot show.

---

## 10. Not to be confused with the Python RAG Explorer

| | This (`AI_Basic_RAG`, n8n) | RAG Explorer (`RAG/Basic_Rag/app/`) |
|---|---|---|
| Built with | n8n visual workflow | FastAPI + React, hand-written |
| Embeddings | Google Gemini (768-d) | Nomic `nomic-embed-text-v1.5` (768-d) |
| Vector store | Pinecone (cloud) | ChromaDB (local, persistent) |
| Answer model | Groq `openai/gpt-oss-120b` | Groq |
| Stages | ingest + retrieve + answer | ingest + retrieve + answer |
| Deployed | no — local only | yes — Render + Vercel |
| Build brief | this file (+ `n8n_AI_Basic_RAG.json`) | `RAG/Basic_Rag/TEST-BUILD-PROMPT.md` |

---

## 11. Acceptance criteria

The build is done when all of these hold:

1. `n8n start` boots and `http://localhost:5678/healthz` returns `{"status":"ok"}`
2. Workflow `AI_Basic_RAG` exists with all 6 nodes
3. All three sub-nodes are attached to their correct ports — `Embeddings`,
   `Document`, `Text Splitter` — and none show a red error badge
4. Pinecone index `rag-basic` exists at **768** dimensions, cosine metric
5. Submitting a PDF completes with every node green and **no**
   `ERR_PACKAGE_PATH_NOT_EXPORTED`
6. Chunk counts on the Document and Text Splitter edges are equal and greater
   than zero
7. The Pinecone console shows a non-zero vector count in `rag-basic`
8. A stored vector carries `fileName` and `uploadedAt` metadata — confirming 4.3
   resolved rather than silently producing `undefined`
9. Phase 2 exists: chat trigger, agent, Groq model, memory, and a Pinecone node
   in `retrieve-as-tool` mode whose name is exactly `Retrieve from Pinecone`
10. `toolDescription` on that node is non-empty — it is required, and an empty one
   leaves the node red
11. Both embedding nodes use the **same** model (Google Gemini) — ingestion and
   query must share a vector space
12. Asking a question in the chat panel returns an answer drawn from the uploaded
   document and citing its `fileName` — not `"I couldn't find that in the uploaded
   documents"`

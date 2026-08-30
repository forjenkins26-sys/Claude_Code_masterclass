# RAG — which build prompt to use

Two unrelated RAG systems live here, plus an empty slot for a third. Both are
called "RAG", which is exactly why this index exists — pick by what you are
rebuilding, not by folder name.

| You want to rebuild | Use this file |
|---|---|
| The **n8n visual workflow** (`AI_Basic_RAG`, local, Pinecone + Gemini) | [`Local_RAG/Prompt.md`](Local_RAG/Prompt.md) |
| The **Python RAG Explorer**, from scratch (FastAPI + React, deployable) | [`Basic_Rag/TEST-BUILD-PROMPT.md`](Basic_Rag/TEST-BUILD-PROMPT.md) |
| The **exact deployed** RAG Explorer, byte-for-byte in behaviour | [`Basic_Rag/BUILD-PROMPT-DEPLOYED.md`](Basic_Rag/BUILD-PROMPT-DEPLOYED.md) |

## Side by side

| | n8n `AI_Basic_RAG` | Python RAG Explorer |
|---|---|---|
| Folder | `Local_RAG/` (docs) · workflow lives in `~/.n8n/database.sqlite` | `Basic_Rag/app/` |
| Built with | n8n visual workflow, 6 nodes | FastAPI + React, hand-written |
| Embeddings | Google Gemini, 768-d | Nomic `nomic-embed-text-v1.5`, 768-d |
| Vector store | Pinecone (cloud) | ChromaDB (local, persistent) |
| Answer model | none yet — ingest only | Groq |
| Stages | ingest | ingest + retrieve + answer |
| Deployed | no, local only | yes — Vercel + Render |
| Runs at | `http://localhost:5678` | `http://localhost:5173` + `:8000` |

The n8n workflow **ingests only** — it chunks, embeds and stores, but has no
retriever or chat node, so it cannot answer questions yet. Section 8 of its
prompt covers the missing half.

## Other files in `Basic_Rag/`

| File | What it is |
|---|---|
| `REQUIREMENTS.md` | Original requirements for RAG Explorer — the "what", not the "how" |
| `SimplePrompt.md` | The short original ask that started RAG Explorer — historical |
| `Prompt.md` | ⛔ **Superseded.** Kept as a record; it never built the deployed app and would produce a non-deployable build |

`Advance_Rag/` is a placeholder — nothing built there yet.

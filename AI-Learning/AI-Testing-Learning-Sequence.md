# AI Testing — Learning Sequence

The order to learn this in. Each step assumes the one before it.

| # | Topic | Sub-topics |
|---|---|---|
| 1 | **LLM Basics** | |
| 2 | **Prompt Engineering** | |
| 3 | **Generative AI** | |
| 4 | **AI Agents (RAG)** | a. n8n · b. Langflow |
| 5 | **RAG** | |
| 6 | **MCP** | |
| 7 | **LLM Eval** | |
| 8 | **AI Testing Tools** | |
| 9 | **Projects** | |

---

## Where the existing work sits on this path

Not a plan — this is what is already built in this workspace, mapped to the steps
above, so progress is visible against the sequence.

| Step | Built already |
|---|---|
| 2 · Prompt Eng | `RICEPOT.md`, 10+ Claude Code skills, 32-rule anti-hallucination protocol |
| 4 · AI Agents | **n8n** — `AI_Basic_RAG` workflow (`RAG/Local_RAG/`), 5 more in `AI Agents_N8n/` · **Langflow** — installed locally, not yet used |
| 5 · RAG | **RAG Explorer** (`RAG/Basic_Rag/app/`) — FastAPI + React, Nomic + ChromaDB + Groq, deployed to Vercel + Render · **n8n RAG** — Gemini + Pinecone, local |
| 6 · MCP | Atlassian MCP (Jira), Playwright MCP — both wired into live skills |
| 7 · LLM Eval | LLM-as-a-Judge in QA Buddy (`qabuddy/tools/aiClient.js`) — faithfulness / coverage / relevancy scoring |
| 8 · AI Testing Tools | `agent-factory-cli` — 4 agents: RCA, Self-Healing Locator, Flaky Detector, Triage |
| 9 · Projects | QA Buddy, TestPlanBuddy, TestStrategyBuddy, RAG Explorer, QA Portfolio |

Steps 1 and 3 have no artifact in this workspace — they are foundation topics
rather than things that produce a build.

---

Captured 2026-08-30 from the learner's own sequence list.

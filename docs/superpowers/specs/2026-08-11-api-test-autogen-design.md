# api-test-autogen — Design Spec

**Date:** 2026-08-11
**Status:** Approved
**Origin:** Gap found comparing against `vinaybalepur/testautogen` (real working repo — Jira→AI BDD→Postman→Newman→report→Jira defects). Our stack has no pure-API test pipeline — only Playwright UI/API-within-UI testing. Built as a fully standalone project per explicit user request ("built it but separately from what we have built") — no shared code with `test-case-creation`, `qabuddy`, or `agent-factory-cli`.

## Problem

No path exists in this workspace for pure API-only test automation (no browser). `Advance-Playwright-Framework/src/api/` is request helper classes used inside Playwright specs, not a standalone collection-based API test pipeline. Postman/Newman is a different discipline than our Playwright-centric stack.

## Goal

CLI tool: point it at a Jira Epic key → it generates a Postman collection from the Epic's acceptance criteria → runs it via Newman → produces an HTML report. Standalone, isolated, minimal.

## Explicit Non-Goals

- No Jira defect auto-filing (avoids duplicating `test-case-execution`'s bug-filing logic — AH Rule 25 tiers, dedup, screenshots — in a second codebase)
- No web UI (CLI only, matches `agent-factory-cli`'s existing pattern in this workspace)
- No shared code/imports with any existing project in this workspace
- No database — filesystem only

## Architecture

```
Jira Epic key
  → src/jiraFetch.ts    (Atlassian MCP getJiraIssue → raw AC text)
  → src/collectionGen.ts (GROQ llama-3.3-70b-versatile → Postman Collection v2.1 JSON)
  → collections/{EpicKey}.json   (written to disk, inspectable/editable before run)
  → src/runner.ts        (Newman Node API + newman-reporter-htmlextra)
  → reports/{EpicKey}-{timestamp}/   (HTML report)
  → cli.ts prints pass/fail summary + report path
```

## Components

| File | Responsibility | Depends on |
|---|---|---|
| `src/jiraFetch.ts` | Fetch Epic description text via Atlassian MCP `getJiraIssue` | Atlassian MCP (same connection existing skills use, no new auth) |
| `src/collectionGen.ts` | Prompt GROQ to emit valid Postman Collection v2.1 JSON (requests + `pm.test()` assertions per AC) | GROQ API key (own `.env`, not shared with `agent-factory-cli`'s) |
| `src/runner.ts` | Run the collection via `newman.run()` Node API, htmlextra reporter | `newman`, `newman-reporter-htmlextra` npm packages |
| `cli.ts` | Orchestrate the 3 steps, argv parsing (`Epic key` + `--baseUrl`), print summary | the above 3 |

Each file independently testable/runnable — `jiraFetch` returns plain text, `collectionGen` takes text+baseUrl returns JSON, `runner` takes a JSON file path returns a pass/fail result object.

## Data Flow & Storage

- `collections/{EpicKey}.json` — generated collection, gitignored, human-inspectable/editable before running
- `reports/{EpicKey}-{timestamp}/` — Newman htmlextra output, gitignored
- No persistence beyond filesystem; re-running overwrites `collections/{EpicKey}.json`, adds a new timestamped report dir

## Error Handling

- GROQ output fails `JSON.parse` → retry once with a stricter "output ONLY valid JSON" prompt
- Still invalid after retry → write raw output to `collections/{EpicKey}.failed.txt`, exit non-zero. Never write invalid JSON as if it were a usable collection.
- Newman run failure (network/connection) → surface Newman's own error, non-zero exit, no report generated

## Testing the Tool Itself

Manual smoke test first: hand-written fake Epic description text against a public test API (`reqres.in` or similar) before wiring to a real Jira Epic — validates the GROQ→Postman JSON shape and the Newman run path independent of Jira/Atlassian MCP.

## Tech Choices & Why

- **GROQ, not Claude API** — matches every other AI tool in this workspace (`qabuddy`, `testplanbuddy`, `agent-factory-cli`); one provider pattern to reason about, even though this project shares no code with them
- **Newman Node API, not CLI subprocess** — avoids shelling out, cleaner error propagation, still produces the same htmlextra report testautogen uses
- **CLI, not web UI** — smallest surface area, fits `agent-factory-cli`'s existing precedent in this workspace
- **No defect auto-filing** — that logic already exists correctly in `test-case-execution`; duplicating it in a second, unrelated codebase risks drift between two Jira-bug-filing implementations

## Open Questions

None — all resolved during brainstorming (input source: Jira Epic only; AI provider: GROQ; runner: Newman; defect filing: none; interface: CLI only).

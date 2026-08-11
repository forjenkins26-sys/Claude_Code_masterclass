# api-test-autogen — Design Spec

**Date:** 2026-08-11
**Status:** Approved
**Origin:** Gap found comparing against `vinaybalepur/testautogen` (real working repo — Jira→AI BDD→Postman→Newman→report→Jira defects). Our stack has no pure-API test pipeline — only Playwright UI/API-within-UI testing. Built as a fully standalone project per explicit user request ("built it but separately from what we have built") — no shared code with `test-case-creation`, `qabuddy`, or `agent-factory-cli`.

## Problem

No path exists in this workspace for pure API-only test automation (no browser). `Advance-Playwright-Framework/src/api/` is request helper classes used inside Playwright specs, not a standalone collection-based API test pipeline. Postman/Newman is a different discipline than our Playwright-centric stack.

## Goal

Lightweight React+Express app: paste a Jira Epic key + base URL → button triggers generate→run→report → results shown in-browser (pass/fail summary + embedded/linked Newman report). Standalone, isolated, minimal.

## Explicit Non-Goals

- No Jira defect auto-filing (avoids duplicating `test-case-execution`'s bug-filing logic — AH Rule 25 tiers, dedup, screenshots — in a second codebase)
- No CLI entry point — UI is the only interface (superseded earlier CLI-only decision per user request)
- No run history / saved runs list / auth — single-page, one run at a time, no persistence beyond the current run's files
- No shared code/imports with any existing project in this workspace (despite matching `qabuddy`'s client+server *pattern*, no code is reused from it)
- No database — filesystem only

## Architecture

```
Browser (React)                Express server                  External
─────────────────              ───────────────                 ────────
Epic key + baseUrl form
  → POST /api/run  ─────────→  src/jiraFetch.ts        ──→  Jira REST API v3
                                  (raw AC text)
                                → src/collectionGen.ts  ──→  GROQ API
                                  (Postman Collection v2.1 JSON)
                                → collections/{EpicKey}.json (written to disk)
                                → src/runner.ts          ──→  Newman (local)
                                  (newman.run + htmlextra reporter)
                                → reports/{EpicKey}-{timestamp}/
                              ←── JSON response {status, summary, reportUrl}
Status: generating→running→done
Pass/fail summary + "Open report" link
```

Server holds the same 3 pipeline functions as originally scoped; only the entry point changes from `cli.ts` argv parsing to one Express route. `GET /reports/*` serves the htmlextra HTML statically so "Open report" opens it in a new tab.

## Components

| File | Responsibility | Depends on |
|---|---|---|
| `server/jiraFetch.ts` | Fetch Epic description text via Jira REST API v3 (basic auth: email + API token), same pattern as `qabuddy/tools/jiraClient.js` (ADF description flattener reused as a pattern, not imported) | Jira Cloud base URL + email + API token (own `.env`) |
| `server/collectionGen.ts` | Prompt GROQ to emit valid Postman Collection v2.1 JSON (requests + `pm.test()` assertions per AC) | GROQ API key (own `.env`, not shared with `agent-factory-cli`'s) |
| `server/runner.ts` | Run the collection via `newman.run()` Node API, htmlextra reporter | `newman`, `newman-reporter-htmlextra` npm packages |
| `server/index.ts` | Express app — `POST /api/run` orchestrates the 3 steps, `GET /reports/*` static-serves report HTML | the above 3, `express` |
| `client/src/App.tsx` | Single page: Epic key input, base URL input, Run button, live status, pass/fail summary, report link | fetch to `/api/run` |

Each server file independently testable/runnable — `jiraFetch` returns plain text, `collectionGen` takes text+baseUrl returns JSON, `runner` takes a JSON file path returns a pass/fail result object. `POST /api/run` is a thin orchestrator with no logic of its own beyond calling the three in sequence.

## Data Flow & Storage

- `collections/{EpicKey}.json` — generated collection, gitignored, human-inspectable/editable before running
- `reports/{EpicKey}-{timestamp}/` — Newman htmlextra output, gitignored
- No persistence beyond filesystem; re-running overwrites `collections/{EpicKey}.json`, adds a new timestamped report dir

## Error Handling

- GROQ output fails `JSON.parse` → retry once with a stricter "output ONLY valid JSON" prompt
- Still invalid after retry → write raw output to `collections/{EpicKey}.failed.txt`, respond `POST /api/run` with an error status + message, UI shows the failure inline. Never write invalid JSON as if it were a usable collection.
- Newman run failure (network/connection) → surface Newman's own error in the API response, UI shows the failure inline, no report generated

## Testing the Tool Itself

Manual smoke test first: hand-written fake Epic description text against a public test API (`reqres.in` or similar) before wiring to a real Jira Epic — validates the GROQ→Postman JSON shape and the Newman run path independent of Jira/Atlassian MCP.

## Tech Choices & Why

- **GROQ, not Claude API** — matches every other AI tool in this workspace (`qabuddy`, `testplanbuddy`, `agent-factory-cli`); one provider pattern to reason about, even though this project shares no code with them
- **Newman Node API, not CLI subprocess** — avoids shelling out, cleaner error propagation, still produces the same htmlextra report testautogen uses
- **React+Express, not CLI** — user explicitly asked for a lightweight React app after seeing the CLI-only design; client+server split matches `qabuddy`'s *pattern* (not its code) since that pattern is already proven in this workspace
- **Minimal UI (single page, no history/auth)** — smallest surface area that still gives visual pass/fail + report access; avoids re-building qabuddy's tab/sidebar complexity for a tool with one job
- **No defect auto-filing** — that logic already exists correctly in `test-case-execution`; duplicating it in a second, unrelated codebase risks drift between two Jira-bug-filing implementations

## Open Questions

None — all resolved during brainstorming (input source: Jira Epic only; AI provider: GROQ; runner: Newman; defect filing: none; interface: minimal React+Express UI, superseding the initial CLI-only decision). **Corrected during plan-writing:** initial draft said "Atlassian MCP" for Jira access — wrong, MCP tools only exist inside a Claude Code session and can't be called from a standalone Express server. Fixed to Jira REST API v3 direct call (same pattern as `qabuddy`/`testplanbuddy`), needs its own email+token in `.env`.

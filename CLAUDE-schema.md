# CLAUDE-schema.md — Data Schemas & A.N.T. Layer Map
*Loaded on demand by skills that need contracts. Not loaded every session.*

## Jira Issue (normalized)
```json
{
  "key": "SCRUM-141",
  "summary": "string",
  "description": "string (ADF flattened to plain text)",
  "issueType": "Bug | Story | Task | Test | Epic",
  "status": "To Do | In Progress | Done | Blocked",
  "priority": "Highest | High | Medium | Low | Lowest",
  "labels": ["string"],
  "reporter": "string",
  "assignee": "string | null",
  "parent": "SCRUM-121 | null"
}
```

## Test Case (Jira issue)
```json
{
  "key": "SCRUM-122",
  "summary": "BL-001: Verify page loads and all elements are visible",
  "description": "**Preconditions:** ...\n**Test Steps:** ...\n**Expected Result:** ...\n**Source:** Epic SCRUM-121",
  "issueType": "Test",
  "parent": "SCRUM-121"
}
```
Test ID pattern: `{PREFIX}-{NNN}` (BL-001, TC-001, REG-001, FP-001)

## Bug Report (Jira issue)
```json
{
  "issueType": "Bug",
  "summary": "Bug: {TC-id?} {title}",
  "description": "### Bug Details\n...\n### Steps to Reproduce\n...\n### Expected Result\n...\n### Actual Result\n...\n### Attachments\n...",
  "priority": "Highest | High | Medium | Low",
  "labels": ["automated-test-detected", "feature-area"]
}
```

## Screenshot Naming
```
screenshots/{EpicKey}/{IssueKey}_{TestID}_{kebab-title}_{PASS|FAIL}.png
```
Example: `screenshots/SCRUM-121/SCRUM-122_BL-001_verify-page-loads_PASS.png`

## BLAST Memory Files
| File | Written by | Content |
|---|---|---|
| `findings.md` | Manual / Blueprint phase | Environment discoveries, constraints, research — dated entries |
| `progress.md` | `/test-case-execution`, `/test-case-creation` | Execution run log — date+time, pass/fail counts, bugs filed |
| `rca-log.md` | `/bug-triage`, `/create-bug`, `/explore` | Per-bug RCA — severity, root cause, fix recommendation |

## A.N.T. Layer Mapping
| Layer | What it is | Files |
|---|---|---|
| **Architecture** | SOPs, rules, schemas — law | `CLAUDE.md`, `ANTI-HALLUCINATION-RULES.md`, `AUTO-FIX-PROTOCOL.md`, `BLAST.md` |
| **Navigation** | LLM routing — skills decide which tool to call | `~/.claude/skills/*/SKILL.md` |
| **Tools** | Atomic executables — deterministic output | `scripts/fetch-local-page.js`, `md_to_docx.py`, Playwright specs, MCP calls |

**Protocol 0:** Never write `tools/` scripts until Architecture layer (schema + SOP) defined first.

## Secrets Policy
- Jira OAuth via Atlassian MCP connector — no token paste, no `.env`
- No credentials committed to git — `.env` in `.gitignore`
- Screenshots stay local — never auto-uploaded
- `sessionStorage` for blinkit demo — cleared on browser close

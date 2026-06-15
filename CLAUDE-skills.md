# CLAUDE-skills.md — Skill Reference
*Loaded on demand. Not loaded every session.*

## Custom Skills (11 workspace-level)

| Skill | Command | What it does |
|---|---|---|
| Test Plan Generator | `/test-plan` | Jira ticket → 14-section `.md` + `.docx` |
| Bug Filer | `/create-bug` | Screenshot + notes → Jira Bug via MCP |
| CLAUDE.md Updater | `/update-md-file` | Scan project → update CLAUDE.md |
| Test Case Generator | `/test-case-creation` | Epic + URL → test cases in Jira or markdown |
| Epic Creator | `/epic-create` | URL → Jira Epic auto-generated |
| Test Executor | `/test-case-execution` | Jira Epic → run Playwright → update Jira status |
| Git Push | `/git-commit-push` | Stage + commit + push to GitHub |
| POM Generator | `/explore` | Live DOM → TypeScript POM via Playwright MCP |
| Test Data | `/generate-test-data` | Field spec → valid/invalid/boundary/security data |
| Skill Improver | `/skill-improve` | Capture corrections → update SKILL.md anti-patterns |
| Bug Triage | `/bug-triage` | 3-agent pipeline → RCA report → post to Jira |

## Skill Locations
- Global: `~/.claude/skills/{skill-name}/SKILL.md`
- Workspace: `test-plan-create-skill/`, `bug-report-create-skill/`

## Key Skill Rules
- `/test-case-creation`: Epic = source of truth for assertions. UI = locators only.
- `/test-case-execution`: ALWAYS `--headed`. Auto-fix max 3 attempts. App bug → file Jira, don't fix test.
- `/explore`: Playwright MCP first, WebFetch fallback. No invented `data-test` attrs.
- `/bug-triage`: Agent 1 (Triage) → Agent 2 (RCA) → Agent 3 (Test Recommendations) → post Jira comment.

## Atlassian MCP
- OAuth via Claude connectors. No token paste.
- cloudId: `anandsoni2641.atlassian.net`, default project: `SCRUM`
- No file upload — screenshots attach manually.

## Playwright MCP
- Config: `.mcp.json` at workspace root (`npx @playwright/mcp@latest`)
- ARIA snapshot does NOT expose `data-test` attrs — use `getByRole` + `// VERIFICATION REQUIRED`
- localhost → `node scripts/fetch-local-page.js` (not WebFetch)

# CLAUDE.md — Project Constitution

> Law for this workspace. Planning files are memory. This file is truth.

## Workspace
Claude Code masterclass — QA automation skills, Playwright frameworks, Jira-integrated pipelines, custom Claude skills.
Git remote: `https://github.com/forjenkins26-sys/Claude_Code_masterclass.git`

## Projects

| Path | What it is | Build |
|---|---|---|
| `Playwright Automation Framework/` | Facebook + Blinkit + SauceDemo POMs, fixture DI | npm + `@playwright/test` |
| `Playwright_8_Layer/` | 8-layer POM architecture (Config→Utils→Data→API→Components→Pages→Services→Tests) | npm + `@playwright/test` |
| `blinkit-login.html` + `blinkit-products.html` | Local demo app — served at `localhost:7000` | Python `http.server` |
| `registration-demo.html` | Registration demo for SCRUM-142 | Python `http.server` |
| `myTest.java` | Hello World Java sandbox | `javac` / `java` |
| `src/testplan/` | Generated test plan `.md` + `.docx` | disposable |

## Critical Commands

```bash
# Blinkit demo server
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass
# Stop server
Get-Process python | Stop-Process

# Playwright Automation Framework
cd "Playwright Automation Framework"
npm test                       # all tests
npm run test:headed            # headed mode (ALWAYS for debugging)
npm run test:ui                # UI tests only

# Playwright 8-Layer
cd Playwright_8_Layer
npm test                       # all projects
npm run test:headed
```

## Hard Rules (always active)

1. **Headed mode mandatory** for all test execution — no headless shortcuts (AH Rule 17)
2. **localhost URLs** → `node scripts/fetch-local-page.js` — WebFetch cannot reach localhost
3. **POM variable names** must match actual UI text — no invented names (AFP Rule 13)
4. **ARIA snapshot** does NOT expose `data-test` attrs — use `getByRole` + `// VERIFICATION REQUIRED`
5. **Test issue vs app bug** — investigate before fixing. Never fix test that correctly catches a bug.
6. **Protocol 0** — never write `tools/` scripts until schema defined in this file first
7. **`TTALoginPage.ts`** not `LoginPage.ts` — Facebook's `LoginPage.ts` occupies that name

## Active Jira Epics
- SCRUM-68: Facebook Login (17 tests, TC-001–TC-017)
- SCRUM-85: Facebook Forgot Password (15 tests, FP-001–FP-015)
- SCRUM-86: Facebook Registration (19/19 passing, REG-001–REG-019)
- SCRUM-121: Blinkit Login (18/19; BL-010 blocked by SCRUM-141)
- SCRUM-142: Registration Demo Page (new)

## Open Bugs
- SCRUM-141: `#signupBtn` no click handler — intentional defect in `blinkit-login.html`

## BLAST Memory Files
| File | Purpose | Updated by |
|---|---|---|
| `findings.md` | Environment discoveries, constraints, research | Manual + Blueprint phase |
| `progress.md` | Execution run log — date+time, pass/fail, bugs | `/test-case-execution`, `/test-case-creation` |
| `rca-log.md` | Per-bug RCA — severity, root cause, fix | `/bug-triage`, `/create-bug`, `/explore` |
| `task_plan.md` | Project phases + checklists | Manual |

## Reference Files (load on demand — not every session)
- `CLAUDE-skills.md` — all 11 skill docs, MCP setup, trigger patterns
- `CLAUDE-schema.md` — JSON contracts, A.N.T. layer map, secrets policy
- `BLAST.md` — full 5-phase BLAST framework reference
- `ANTI-HALLUCINATION-RULES.md` — 21 QA verification rules
- `AUTO-FIX-PROTOCOL.md` — autonomous fix protocol (max 3 attempts)

## Key File Locations
- POMs: `Playwright Automation Framework/src/pages/`
- Tests: `Playwright Automation Framework/tests/ui/`
- Screenshots: `Playwright Automation Framework/screenshots/{EpicKey}/`
- Skills: `~/.claude/skills/{skill-name}/SKILL.md`
- DOM fetcher: `Playwright Automation Framework/scripts/fetch-local-page.js`

## Maintenance Log
| Date | Change | Files |
|---|---|---|
| 2026-06-11 | Facebook POMs verified in headed mode | `LoginPage.ts`, `RegistrationPage.ts`, `ForgotPasswordPage.ts` |
| 2026-06-11 | Blinkit login POM verified via `fetch-local-page.js` | `BlinkitLoginPage.ts` |
| 2026-06-12 | Screenshot persistence — `global-setup.ts` archives before each run | `src/global-setup.ts` |
| 2026-06-14 | SauceDemo full POM suite via `/explore` + anti-hallucination audit | `SauceDemo*.ts` (8 files) |
| 2026-06-15 | BLAST wired into 5 skills — `progress.md` + `rca-log.md` auto-logging | 5 SKILL.md files |
| 2026-06-15 | `blinkit-products.html` — 16 products, cart, search, logout | `blinkit-products.html`, `blinkit-login.html` |
| 2026-06-15 | CLAUDE.md split into core + `CLAUDE-skills.md` + `CLAUDE-schema.md` | `CLAUDE.md` |
| 2026-06-15 | TestPlanBuddy built — React+Express, Jira→GROQ→13-section plan, localStorage Settings | `testplanbuddy/` (Phase 5 pending) |

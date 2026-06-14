# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Scope

This is a **Claude Code masterclass workspace**, not a single project. It holds several independent test-automation projects side by side, plus the original Java sandbox. The workspace root is **not** a git repository — treat each subproject as self-contained.

| Path | What it is | Build | Has own docs |
|------|-----------|-------|--------------|
| `myTest.java` / `myTest.class` | Original `Hello World` Java sandbox | `javac` / `java`, no build tool | — |
| `Playwright_8_Layer/` | Playwright TypeScript E2E framework (8-layer POM architecture) | npm + `@playwright/test` | `README.md`, `playwright-e2e.SKILL.md`, custom skill `create-page-object` |
| `Playwright Automation Framework/` | Facebook.com automation framework (POM pattern, fixture-based DI) + Blinkit demo | npm + `@playwright/test` | `README.md`, `LOCATOR-VERIFICATION-CHECKLIST.md` |
| `blinkit-login.html` | Local Blinkit demo login page — served at `localhost:7000` for test automation practice | Python `http.server` | — |
| `scripts/` (workspace root) | Shared utility scripts | — | — |
| `test-plan-create-skill/` | Custom skill for `/test-plan` command — Jira ticket → Test Plan (`.md` + `.docx`) | Python (md_to_docx.py) | `SKILL.md`, `assets/`, `references/`, `scripts/` |
| `bug-report-create-skill/` | Custom skill for `/create-bug` command — screenshot + notes → Jira Bug | Atlassian MCP | `SKILL.md`, `assets/` |
| `.claude/` | Project-specific Claude Code config — permissions allowlist | — | `settings.json`, `settings.local.json` |
| `output/testplan/` | Generated test plan artifacts (`.md` + `.docx`) | — | disposable, safe to delete |
| `*.html` (random hex name) | Generated session-recap artifacts (show-me-html / recap skills) | — | disposable, safe to delete |
| `vwo-25.md`, `restful-booker-api-test-plan.md` | Sample Jira ticket inputs for `/test-plan` testing | — | reference artifacts |
| `ANTI-HALLUCINATION-RULES.md` | QA verification rules — prevent hallucination via strict verification | — | reference guide |
| `AUTO-FIX-PROTOCOL.md` | Autonomous fix protocol — auto-fix errors (max 3 attempts) | — | reference guide |
| `RICEPOT.md` | Prompt engineering framework (Role, Instructions, Context, Example, Parameters, Output, Tone) | — | reference guide |
| `HANDOVER-2026-06-11.md` | Session handover doc — context for resuming work across sessions | — | reference artifact |

When working inside a subproject, `cd` into it first — its commands and configs apply. Don't run a subproject's tooling from the workspace root.

## Per-project entry points

### `myTest.java` (root)

```bash
javac myTest.java   # produces myTest.class
java myTest         # prints: Hello
rm -f *.class       # clean
```

Public class name must match the filename. Current class is `myTest` (lowercase-first deviates from Java PascalCase but is kept to match the filename — rename both together if changing). No test runner; verify by running and checking stdout.

### `Playwright_8_Layer/`

```bash
cd Playwright_8_Layer
npm install && npm run install:browsers   # first-time setup
npm test                  # all projects (chromium, firefox, webkit, api)
npm run test:ui           # UI specs only (tests/ui/)
npm run test:api          # API specs only (tests/api/)
npm run test:smoke        # --grep @smoke
npm run test:critical     # --grep @critical
npm run test:headed       # --headed (browser visible)
npm test -- tests/ui/login.spec.ts        # single spec
npm run test:debug        # PWDEBUG inspector
npm run test:uimode       # --ui (UI mode)
npm run test:chromium     # --project=chromium
npm run test:firefox      # --project=firefox
npm run test:webkit       # --project=webkit
npm run typecheck         # tsc --noEmit, no test run
npm run report            # open last HTML report (playwright-report/)
npm run codegen           # codegen https://www.saucedemo.com/
```

Architecture (detailed in `Playwright_8_Layer/README.md`): 8 numbered layers — Config → Utils → Data → API → Components → Pages(POM) → Services → Tests. `src/fixtures/test-fixtures.ts` is the glue: it dependency-injects every layer into specs, so tests pull page objects and services from the fixture, not by constructing them. UI targets saucedemo.com, API targets fakestoreapi.com (both public). `tests/auth.setup.ts` runs as a `setup` project that all browser projects depend on (storage-state login); the `api` project skips browsers and uses a separate baseURL.

**Custom skill:** `.claude/skills/create-page-object/` — scaffolds new page objects following the 8-layer pattern.

### `Playwright Automation Framework/` (Facebook Automation)

```bash
cd "Playwright Automation Framework"
npm install && npx playwright install   # first-time setup
npm test                  # all tests (chromium, firefox, webkit)
npm run test:ui           # UI tests only (tests/ui/)
npm run test:headed       # headed mode (browser visible)
npm run test:smoke        # --grep @smoke
npm run test:regression   # --grep @regression
npm run test:chromium     # chromium only
npm run test:firefox      # firefox only
npm run test:webkit       # webkit only
npm run report            # show HTML report
npm run codegen           # codegen for facebook.com
npm run typecheck         # tsc --noEmit
```

**Architecture:** POM pattern with fixture-based dependency injection. Page objects in `src/pages/`, tests in `tests/ui/`. `src/fixtures/test-fixtures.ts` injects page objects into tests. Targets Facebook.com (registration, login, forgot password) and Blinkit demo (localhost).

**Key Files:**
- `src/pages/LoginPage.ts` - Facebook login POM (`createAccountLink` — it's an `<a>` tag not a button)
- `src/pages/RegistrationPage.ts` - Facebook registration POM (`submitButton` — actual text "Submit", not "Sign Up")
- `src/pages/ForgotPasswordPage.ts` - Facebook forgot password POM (`continueButton`/`backButton` — verified via headed mode)
- `src/pages/BlinkitLoginPage.ts` - Blinkit login POM (locators VERIFIED via fetch-local-page.js 2026-06-11; toast uses `#toast.show` CSS class)
- `src/global-setup.ts` - Archives `test-results/` → `screenshots-archive/{timestamp}/` before each run so failure screenshots are never lost
- `src/fixtures/test-fixtures.ts` - DI fixture for all page objects including `blinkitLoginPage`
- `tests/ui/login.spec.ts` - 17 login test cases (TC-001 to TC-017, Jira SCRUM-68)
- `tests/ui/registration.spec.ts` - 19 registration test cases (REG-001 to REG-019, Jira SCRUM-86)
- `tests/ui/forgot-password.spec.ts` - 15 forgot password test cases (FP-001 to FP-015, Jira SCRUM-85)
- `tests/ui/blinkit-login.spec.ts` - 19 Blinkit login test cases (BL-001 to BL-019, Jira SCRUM-121); BL-010 blocked by app bug SCRUM-141
- `scripts/fetch-local-page.js` - Playwright-based live DOM fetcher for localhost URLs (used by skills)
- `LOCATOR-VERIFICATION-CHECKLIST.md` - Locator verification workflow

**Screenshot Persistence (2026-06-12):**
`test-results/` is cleared by Playwright at the start of every run. `src/global-setup.ts` copies it to `screenshots-archive/{timestamp}/` first (raw Playwright output).

Organised screenshots (created by `/test-case-execution` skill) live at:
```
screenshots/
  {EpicKey}/
    {IssueKey}_{TestID}_{kebab-title}_{PASS|FAIL}.png
```
Example: `screenshots/SCRUM-121/SCRUM-122_BL-001_verify-page-loads_PASS.png`

When investigating failures, check `screenshots/{EpicKey}/` first (organised, named). Fallback: `screenshots-archive/{timestamp}/` (raw). Never delete either without review.

**POM Semantic Naming Rules (2026-06-11):**
Variable names MUST match actual UI text — no invented names:
- `createAccountLink` not `createAccountButton` (element is `<a>`, not `<button>`)
- `submitButton` not `signUpButton` (actual button text is "Submit")
- `continueButton`/`backButton` not `searchButton`/`cancelButton`

**Latest Jira Epics:**
- SCRUM-85: Facebook Forgot Password Testing (15 tests, FP-001–FP-015)
- SCRUM-86: Facebook Registration Testing (19/19 passing, REG-001–REG-019)
- SCRUM-121: Blinkit Login Page Testing (18/19 passing; BL-010 blocked by SCRUM-141)

**Open Bugs:**
- SCRUM-141: Create New Account button (`#signupBtn`) has no click handler — does not navigate (intentional defect in blinkit-login.html)

**Blinkit Demo:**
```bash
# Start local server (Python)
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass
# Open: http://localhost:7000/blinkit-login.html
# Known bug: "Create New Account" button has no click handler (intentional defect)
```

## Custom Skills (The Testing Academy masterclass)

Seven workspace-level skills built here (plus Playwright's nested `create-page-object` skill):

### `/test-plan` — Test Plan Generator

```bash
/test-plan ./ticket.md                  # from file
/test-plan VWO-105                      # fetch via Atlassian MCP
/test-plan VWO-105 create docx in ./output/testplan/mcp
```

Fills 14-section template (Objective, Scope, Inclusions, Environments, Defect Reporting, Strategy, Schedule, Deliverables, Entry/Exit Criteria, Tools, Risks, Approvals). Detects UI vs API. MD→DOCX via bundled `test-plan-create-skill/scripts/md_to_docx.py` (requires `pip install python-docx`). Output → `output/testplan/{batch,docx,mcp}/`.

Skill location:
- Local install: `~/.claude/skills/test-plan-create-skill/`
- Cloud upload: drag folder into Claude

### `/create-bug` — Jira Bug Filer

```bash
/create-bug                              # paste screenshot + note
/create-bug REST                         # file on different project (default VWO)
```

Reads screenshot (extracts URL + error text), fills five-section template (Bug Details → Steps → Expected → Actual → Attachments), creates issue via `mcp__atlassian__createJiraIssue`. **MCP limitation:** no file upload or delete, so screenshots attached manually.

Skill location: `~/.claude/skills/bug-report-create-skill/`

### `/update-md-file` — CLAUDE.md Auto-updater

```bash
/update-md-file           # scans entire project, intelligently updates CLAUDE.md
```

Discovers all files/folders (configs, skills, docs, source), analyzes architecture, extracts commands from package.json/pom.xml, and intelligently merges updates into CLAUDE.md. Preserves user notes, adds new sections, removes stale references. Excludes `node_modules/`, `.git/`, build artifacts, lock files, and throwaway HTML recap files.

Skill location: `~/.claude/skills/update-claude-md/`
Command: `~/.claude/commands/update-md-file.md`

### `/test-case-creation` — Test Case Generator

```bash
/test-case-creation https://www.facebook.com/               # markdown table output
/test-case-creation app.vwo.com create in jira project VWO   # direct Jira creation
/test-case-creation https://example.com/login output jira VWO epic SCRUM-48
```

Generate comprehensive functional test cases from URL analysis. Supports remote URLs (WebFetch) and localhost URLs (Playwright live DOM via `Playwright Automation Framework/scripts/fetch-local-page.js`). Analyzes features (forms, buttons, validation), creates test cases covering valid scenarios, invalid inputs, edge cases, and security tests (SQL injection, XSS). Output as markdown table or create directly in Jira via Atlassian MCP. Can link test cases to Epic if Epic URL/key provided.

**Key feature:** Test case count based on actual page features (not fixed 15-count), ensuring proper coverage per functionality.

Skill location: `~/.claude/skills/test-case-creation/`
Command: `~/.claude/commands/test-case-creation.md`

### `/epic-create` — Jira Epic Creator

```bash
/epic-create https://app.vwo.com/#/login project SCRUM                # URL-based
/epic-create https://www.facebook.com/ project SCRUM link SCRUM-49 to SCRUM-67
/epic-create "Login Testing" project SCRUM                            # manual mode
```

Create Jira Epic from URL analysis or manual input. Supports remote URLs (WebFetch) and localhost URLs (Playwright live DOM via `scripts/fetch-local-page.js`). Generates Epic title and description automatically from page analysis. Can link existing issues to Epic as children. Supports labels and custom descriptions.

**Two modes:**
- **Mode A (URL-based):** Analyze URL → auto-generate Epic title/description (localhost → `node scripts/fetch-local-page.js`)
- **Mode B (Manual):** User provides Epic title/description directly

Skill location: `~/.claude/skills/epic-create/`
Command: `~/.claude/commands/epic-create.md`

### `/test-case-execution` — Test Execution + Jira Status Update

```bash
/test-case-execution https://anandsoni2641.atlassian.net/browse/SCRUM-86    # execute Epic tests
/test-case-execution SCRUM-86                                               # Epic key only
/test-case-execution SCRUM-102                                              # single test case
```

Execute Playwright tests from Jira Epic or test case link. Maps Jira issues to test specs, runs tests sequentially in **headed mode** (ANTI-HALLUCINATION Rule 17), updates Jira status based on results. Applies ANTI-HALLUCINATION-RULES.md (strict result parsing) and AUTO-FIX-PROTOCOL.md (autonomous fix, max 3 attempts).

**Features:**
- ALWAYS runs in `--headed` mode (per Rule 17 — real selector verification)
- Auto-maps Jira test cases to Playwright tests (via test ID grep)
- Runs tests sequentially (one by one)
- Updates Jira status: In Progress → Done (pass) / Blocked (app bug) / Failed (stuck)
- Auto-fix protocol: investigates failures, fixes test issues autonomously
- Bug logging: creates Jira bug for real app issues (doesn't modify test)
- Full semantic rename required when variable names don't match actual UI (Rule 13)

**Example workflows:**
- SCRUM-86: 19/19 registration tests → all Done
- SCRUM-85: 15 forgot password tests → FP-001–FP-015 executed

Skill location: `~/.claude/skills/test-case-execution/`

## Atlassian (Jira) MCP

OAuth via Claude connectors (`/mcp` in Claude Code or Settings → Connectors at claude.ai). No API token paste. Fetch tickets by key (`VWO-105`) or JQL. Example live tickets: **VWO-105** (TTACart PRD test plan), **VWO-106**, **VWO-107** (login bugs filed via `/create-bug`).

## Output Structure

```
output/
├─ testplan/
   ├─ batch/      # parallel-agent runs
   ├─ docx/       # .md + .docx pairs
   └─ mcp/        # MCP-fetched ticket plans
```

Disposable — safe to delete.

## Project-specific Config

### `.claude/settings.json` & `.claude/settings.local.json`

**settings.json:** Skill-specific permissions (Edit access for test-case-creation skill)

**settings.local.json:** Permissions allowlist for common read-only Bash/PowerShell commands to reduce permission prompts:
- `awk '{print $NF}'`
- `grep -E "\\.(java|md|html)$"`
- `grep -v "^\\.\\."` (filter dotfiles)
- `Get-ChildItem "$env:USERPROFILE\\.claude\\commands"`
- MCP tools: `mcp__atlassian__createJiraIssue`, `mcp__atlassian__editJiraIssue`
- WebFetch: `domain:app.vwo.com`, `domain:www.facebook.com`

Regenerate via `/fewer-permission-prompts` skill if needed.

## Reference Docs

### `ANTI-HALLUCINATION-RULES.md`

QA verification rules to prevent hallucination via strict verification. Defines scope of knowledge, mandatory rules, and domain-specific verification patterns.

**Key Rules:**
1. Never invent features, APIs, or UI elements
2. Don't assume "typical" behavior
3. Every assertion traceable to provided input
4. Label inferences explicitly
5. Run headed mode FIRST for UI testing (Rule 17, added 2026-06-11)
6. localhost URLs → use `scripts/fetch-local-page.js`, not WebFetch

**Domain rules (test automation):**
- Never assume selector structure — inspect actual DOM
- Don't invent error messages — extract from test output
- Never skip verification in headed mode
- Variable names must match actual UI text (not invented names)

**Applied during:** Test case execution, auto-fix investigations, skill URL analysis

### `AUTO-FIX-PROTOCOL.md`

Autonomous fix protocol — when test/error detected, fix without asking (max 3 attempts). Report only when 100% fixed OR stuck.

**Process:**
1. **DETECT** - Extract what/where/why failed, classify root cause
2. **INVESTIGATE** - Run domain checks (headed mode for selectors)
3. **FIX** - Apply fix based on investigation, document why
4. **VERIFY** - Test fix (single → related → all → 3x repeat)
5. **REPORT/ESCALATE** - Success if pass, escalate if stuck after 3

**Key Rules:**
- Fix ALL artifacts (code + Jira + docs)
- Use investigation tools (WebFetch, headed mode)
- Validate outcomes, not mechanics (Rule 15)
- Check error messages appear (not just "form visible")

**Applied during:** Test failures, hallucination corrections, auto-fix workflows

**Recent enhancements (2026-06-11):**
- Rule 13 expanded: Full semantic rename required — selectors + variable names + methods + test titles + Jira + docs
- Rule 14 extended: Fix helper methods, not individual tests
- Rule 15: Validate error handling (error message + field state)

### `RICEPOT.md`

Prompt engineering framework for crafting precise AI interactions:
- **R** — Role (define persona)
- **I** — Instructions (exact task)
- **C** — Context (background, constraints)
- **E** — Example (sample output)
- **P** — Parameters (quality constraints)
- **O** — Output (expected artifacts)
- **T** — Tone (communication style)

Includes anti-hallucination rules and usage template.

## Conventions

- Keep projects isolated. A change for one project's tooling/config should not touch another's, and nothing project-specific belongs at the workspace root.
- Generated `*.html` recap files are throwaway output — don't treat them as source.
- Skills at workspace root (`test-plan-create-skill/`, `bug-report-create-skill/`) are installed globally to `~/.claude/skills/` — they're not project dependencies.
- Sample Jira tickets (`vwo-25.md`, `restful-booker-api-test-plan.md`) are reference inputs for testing `/test-plan` skill.
- POM variable names must match actual UI (Auto-Fix Rule 13). When renaming: update POM property + method + all test references + test titles + Jira descriptions.
- `scripts/fetch-local-page.js` must be run from inside `Playwright Automation Framework/` (needs its `node_modules`).
- Blinkit demo (`blinkit-login.html`) is served via `python -m http.server 7000`. Stop with `Get-Process python | Stop-Process`.

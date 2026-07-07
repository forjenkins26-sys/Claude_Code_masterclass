# CLAUDE.md — Project Constitution

> Law for this workspace. Planning files are memory. This file is truth.

## Workspace
Claude Code masterclass — QA automation skills, Playwright frameworks, Jira-integrated pipelines, AI-powered QA tools, n8n agent workflows.
Git remote: `https://github.com/forjenkins26-sys/Claude_Code_masterclass.git`

## Projects

| Path | What it is | Build |
|---|---|---|
| `Playwright Automation Framework/` | Facebook + Blinkit + SauceDemo + TTACart POMs, fixture DI | npm + `@playwright/test` |
| `Playwright_8_Layer/` | 8-layer POM architecture (Config→Utils→Data→API→Components→Pages→Services→Tests) | npm + `@playwright/test` |
| `Advance-Playwright-Framework/` | Pramod Dutta's advanced POM+Module pattern — API/UI/Mobile, rule-engine, AI MCP tutor skill | npm + `@playwright/test` |
| `agent-factory-cli/` | 4 AI agents (RCA, Flaky, Self-Healing, Triage) — pluggable LLM (GROQ/DeepSeek/Ollama) | npm + ts-node |
| `qa-ai-stack/` | Portable bootstrap — drop into any Playwright project to install skills + hooks + agent-factory. Also pushed as a standalone clone-able repo (`AI_E2E_QA_Automation_Playwright_Master_Framework.git`) with its own `CLAUDE.md` + `INSTALL.md` + `/guard` local-privacy tooling | npm scripts |
| `qabuddy/` | QA Buddy v2.0 — 5-tab React+Express: Plan/Strategy/TestCases/Pipeline/NexQAMode + LLM-as-Judge | npm (client + server) |
| `testplanbuddy/` | TestPlanBuddy — React+Express, Jira→GROQ→13-section test plan | npm (client + server) |
| `teststrategbuddy/` | TestStrategyBuddy — React+Express, Jira→GROQ→10-section QA strategy | npm (client + server) |
| `AI Agents_N8n/` | n8n workflow JSON exports — 5 AI agent workflows (ChitChat, Jira Bug, PRD→Excel x2, E2E) | n8n import |
| `QA Portfolio/` | Portfolio site — Vercel deploy, own `CLAUDE.md`, live at `anand-soni-qa-portfolio.vercel.app` | static + Vercel |
| `scripts/` | Workspace-level scripts — `fetch-local-page.js`, `generate_portfolio.py`, `testplan/` | node / python |
| `blinkit-login.html` + `blinkit-products.html` + `blinkit-checkout.html` | Local demo app — served at `localhost:7000` | Python `http.server` |
| `registration-demo.html` | Registration demo for SCRUM-142 | Python `http.server` |
| `myTest.java` | Hello World Java sandbox | `javac` / `java` |
| `output/` | Generated test plans, PRD docs, batch outputs | disposable |

## Critical Commands

```bash
# Blinkit / registration demo server
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass
# Stop server
Get-Process python | Stop-Process

# Playwright Automation Framework
cd "Playwright Automation Framework"
npm test                       # all tests
npm run test:headed            # headed mode (ALWAYS for debugging)
npm run test:ui                # UI tests only
npm run test:ui:headed         # UI tests headed
npm run test:smoke             # @smoke tagged tests
npm run test:regression        # @regression tagged tests
npm run test:chromium          # chromium only
npm run test:firefox           # firefox only
npm run test:webkit            # webkit only
npm run report                 # open Playwright HTML report
npm run typecheck              # TypeScript check

# Playwright 8-Layer
cd Playwright_8_Layer
npm test                       # all projects
npm run test:headed
npm run test:ui                # UI tests only
npm run test:api               # API tests only
npm run test:smoke             # @smoke tagged
npm run test:critical          # @critical tagged
npm run test:uimode            # Playwright UI mode
npm run report
npm run typecheck

# Advance-Playwright-Framework (Pramod Dutta)
cd Advance-Playwright-Framework
npm test
npm run test:headed
npm run test:smoke             # @Smoke tagged
npm run test:regression        # @Regression tagged
npm run test:p0                # @P0 priority tests
npm run test:mobile            # mobile-chrome project
npm run test:ci                # list+json reporters (CI mode)
npm run rules:check            # enforce framework rules on all .ts files
npm run rules:changed          # rules check on changed files only
npm run rules:staged           # rules check on staged files only
npm run lint                   # ESLint
npm run format                 # Prettier

# agent-factory-cli (AI agents — run from agent-factory-cli/)
cd agent-factory-cli
npm run ai:rca                 # classify test failure: LOCATOR/TEST/BUG/ENV/FLAKY
npm run ai:heal                # auto-patch selectors (run after ai:rca = LOCATOR)
npm run ai:flaky               # confirm + tag flaky tests
npm run ai:triage              # all 3 + Jira bug draft
npm run ai:dashboard           # live agent dashboard

# QA Buddy (local dev)
cd qabuddy
node server.js                 # starts Express on port 3003
cd client && npm run dev       # Vite dev server
cd client && npm run build     # MUST build before Vercel deploy
vercel deploy --prod --yes     # deploy to production

# TestPlanBuddy / TestStrategyBuddy (same pattern)
cd testplanbuddy
node server.js
cd client && npm run build && cd .. && vercel deploy --prod --yes
```

## Hard Rules (always active)

1. **Headed mode mandatory** for all test execution — no headless shortcuts (AH Rule 17)
2. **localhost URLs** → `node scripts/fetch-local-page.js` — WebFetch cannot reach localhost
3. **POM variable names** must match actual UI text — no invented names (AFP Rule 13)
4. **ARIA snapshot** does NOT expose `data-test` attrs — use `getByRole` + `// VERIFICATION REQUIRED`
5. **Test issue vs app bug** — investigate before fixing. Never fix test that correctly catches a bug.
6. **Protocol 0** — never write `tools/` scripts until schema defined in this file first
7. **`TTALoginPage.ts`** not `LoginPage.ts` — Facebook's `LoginPage.ts` occupies that name
8. **Vercel deploy** — ALWAYS run `cd client && npm run build` before `vercel deploy --prod`
9. **GROQ model** — `llama-3.3-70b-versatile`, temperature 0.3, strip markdown fences before JSON.parse
10. **Credentials** — stored in browser localStorage only, never sent to server except per-request

## Playwright Automation Framework — File Map

```
src/
  pages/
    LoginPage.ts              ← Facebook login POM
    RegistrationPage.ts       ← Facebook registration POM
    ForgotPasswordPage.ts     ← Facebook forgot password POM
    BlinkitLoginPage.ts       ← Blinkit local demo login POM
    TTALoginPage.ts           ← TTACart login POM (NOT LoginPage.ts — name collision)
    SauceDemoLoginPage.ts     ← SauceDemo login POM
    SauceDemoInventoryPage.ts
    SauceDemoCartPage.ts
    SauceDemoCheckoutStepOnePage.ts
    SauceDemoCheckoutStepTwoPage.ts
    SauceDemoCheckoutCompletePage.ts
    SauceDemoProductDetailPage.ts
  fixtures/test-fixtures.ts   ← Fixture DI — injects page objects into tests
  data/test-users.ts          ← Test user credentials
  utils/helpers.ts            ← Shared utilities
  global-setup.ts             ← Archives screenshots before each run
tests/
  ui/
    login.spec.ts             ← TC-001–TC-017 (SCRUM-68)
    forgot-password.spec.ts   ← FP-001–FP-015 (SCRUM-85)
    registration.spec.ts      ← REG-001–REG-019 (SCRUM-86)
    blinkit-login.spec.ts     ← BL-001–BL-019 (SCRUM-121)
  setup/auth.setup.ts         ← Auth state setup
scripts/
  fetch-local-page.js         ← DOM fetcher for localhost pages (replaces WebFetch)
screenshots/{EpicKey}/        ← {IssueKey}_{TestID}_{title}_{PASS|FAIL}.png
```

## Advance-Playwright-Framework — File Map

```
src/
  api/                      ← API layer (AuthApi.ts, ProductApi.ts, OrderApi.ts)
  config/index.ts           ← Test data + environment constants
  fixtures/
    auth.fixture.ts         ← Pre-authenticated session fixtures
    index.ts                ← Main fixtures (page objects + modules)
  modules/                  ← Business logic layer (Login/Product/Checkout modules)
  pages/                    ← POM layer (LoginPage, HomePage, etc.)
  testdata/                 ← Test data files
  utils/                    ← Shared helpers
tests/                      ← Test specs
scripts/
  rule-engine.js            ← Enforces POM/spec naming + placement rules
rules/
  framework-rule-engine.json ← Rules config (sourceRoots, placementRules, contentRules)
skills/
  playwright-ai-mcp-tutor/  ← 3-agent Planner/Generator/Healer skill
docs/
  ARCHITECTURE.html         ← Interactive architecture diagram
  QUICK_REFERENCE.md
  ai-agents/index.mdx       ← AI agents + MCP tutor docs
.github/instructions/       ← Planner/Generator/Healer agent instruction templates
```

## agent-factory-cli — File Map

```
ai-agents/
  cli.ts                    ← Entry point for all 4 AI agents
  rca/                      ← Root Cause Analyzer (reads test-results/results.json)
  flaky/                    ← Flaky Detector (reads historical ./runs)
  heal/                     ← Self-Healing Locator (patches POM selectors)
  triage/                   ← Triage (all 3 + Jira bug draft)
  dashboard/                ← Live dashboard
bin/
  agent-factory-cli.js      ← CLI binary
.env                        ← GROQ/DeepSeek/Ollama API key (NEVER commit)
```

**Verdict → Action table (AH Rule 22):**

| RCA verdict | Action |
|---|---|
| `LOCATOR` | `npm run ai:heal` → auto-patch POM |
| `TEST` | Fix test logic manually |
| `PRODUCT_BUG` | Skip fix → file Jira bug → mark BLOCKED |
| `ENV` | Check credentials/network |
| `FLAKY` | `npm run ai:flaky` → confirm → add `@flaky` |

## Playwright 8-Layer — File Map

```
src/
  config/env.ts               ← Environment config
  data/users.ts + products.ts ← Test data
  api/api-client.ts           ← API layer
  api/products.api.ts
  components/header.component.ts + footer.component.ts
  pages/base.page.ts          ← Base POM (all pages extend this)
  pages/login.page.ts + inventory.page.ts + cart.page.ts + checkout.page.ts + dashboard.page.ts
  services/auth.service.ts + checkout.service.ts
  utils/constants.ts + helpers.ts + logger.ts
  fixtures/test-fixtures.ts
tests/
  ui/login.spec.ts + inventory.spec.ts + checkout.spec.ts + dashboard.spec.ts
  api/products.api.spec.ts
  auth.setup.ts
```

## QA Buddy App Architecture

```
qabuddy/
  server.js                   ← Express v4, port 3003
  tools/
    jiraClient.js             ← fetchJiraIssue() — ADF description flattener
    groqClient.js             ← generateTestPlan/Strategy/TestCases()
    aiClient.js               ← judgeTestCaseQuality() + scoreAppLLMResponse() + calcSessionScore() — LLM-as-Judge + 3-method scorer + composite session
    renderers.js              ← planToMarkdown/strategyToMarkdown/testCasesToMarkdown()
  client/src/
    App.jsx                   ← Header (tabs) + left sidebar (API config) + main content
    components/
      PlanTab.jsx             ← Test Plan Generator
      StrategyTab.jsx         ← Test Strategy Buddy
      TestCasesTab.jsx        ← Test Case Generator (expandable rows)
      PipelineTab.jsx         ← 3-stage Pipeline: Explore→TestCases→Execute
      NexQATab.jsx            ← NexQA Mode: ResponseScorer + NetworkInterceptor + SessionReporter
      Settings.jsx
  vercel.json                 ← @vercel/static (client/dist) + @vercel/node (server.js)
```

**AI Providers:** Groq / OpenRouter / OpenAI / Gemini — sidebar selector, key in localStorage

**Routes:** `POST /api/plan` | `POST /api/strategy` | `POST /api/testcases` | `POST /api/pipeline/explore` | `POST /api/pipeline/testcases` | `POST /api/network/intercept` | `POST /api/score/response` | `POST /api/score/session` | `POST /api/report/html` | `GET /api/config` | `GET /api/handshake`

**New routes (NexQA gaps — 2026-06-25):**
- `POST /api/network/intercept` — validate API calls intercepted during Playwright run (status + schema assertions)
- `POST /api/score/response` — 3-method LLM response scoring: keyword / exact / semantic (composite 0-100)
- `POST /api/score/session` — composite session score from TC results array (≥70% = PASS)
- `POST /api/report/html` — self-contained HTML evidence report (screenshots, charts, network, LLM judge, all embedded)

**Express catch-all (v4):** `app.get(/^(?!\/api).*/, ...)` → serves React index.html

**LLM-as-Judge (DeepEval-style):** Stage 2 of pipeline calls `judgeTestCaseQuality()` — second AI call scores generated TCs on Faithfulness/Coverage/Relevancy (0.0–1.0). PASS ≥ 0.7. Returns hallucination list + requirement gaps. Zero new dependencies — uses same GROQ provider.

## n8n AI Agent Workflows

```
AI Agents_N8n/
  AI Buddy Basic ChitChat.json            ← Basic QA chatbot (GROQ brain + system message)
  AI Buddy Jira.json                      ← Bug creator agent (chat → Jira bug creation)
  AI Buddy PRD_TestCases_Excel.json       ← PRD → test cases → Excel export (v1)
  AI Buddy PRD_TestCases_Excel v2.json    ← PRD → test cases → Excel export (v2, improved)
  AI Buddy PRD_TestCases_WorkFlow_E2E.json ← Full E2E workflow: PRD → test cases → execute
```

**Pattern:** Chat Trigger → AI Agent (GROQ Brain + System Message) → Tool nodes (Jira MCP / Google Sheets / Excel)

**QA Portfolio:**
```
QA Portfolio/
  index.html    ← Portfolio site
  CLAUDE.md     ← Portfolio-specific deploy instructions
  .env          ← VERCEL_TOKEN (NEVER commit)
```
Live at: `https://anand-soni-qa-portfolio.vercel.app`
Deploy: `cd "QA Portfolio" && vercel deploy --prod --yes --scope anandsoni2641-1308s-projects --token $env:VERCEL_TOKEN`

**Workspace Scripts:**
```
scripts/
  fetch-local-page.js     ← DOM fetcher for localhost pages (replaces WebFetch for local URLs)
  generate_portfolio.py   ← Generates QA Portfolio HTML
  testplan/               ← Test plan generation scripts
```

## Active Jira Epics

| Epic | Feature | Tests | Status |
|---|---|---|---|
| SCRUM-68 | Facebook Login | TC-001–TC-017 (17) | Active |
| SCRUM-85 | Facebook Forgot Password | FP-001–FP-015 (15) | Active |
| SCRUM-86 | Facebook Registration | REG-001–REG-019 (19/19 passing) | Done |
| SCRUM-121 | Blinkit Login | BL-001–BL-019 (18/19; BL-010 blocked) | Active |
| SCRUM-142 | Registration Demo Page | New | Active |
| SCRUM-178 | TTACart PRD | Product Requirements doc | To Do |
| SCRUM-255 | Order Details Page | OD-001–OD-013 (12/13; OD-008 blocked by SCRUM-269) | Active |

## Open Bugs
- SCRUM-141: `#signupBtn` no click handler — intentional defect in `blinkit-login.html`
- SCRUM-269: Cancel Order button visible in Dispatched state (violates SCRUM-255 AC line 8) — caught by OD-008/SCRUM-263, Blocks link

## MCP Integrations Active

| MCP | Tools Used | Purpose |
|---|---|---|
| Atlassian MCP | `mcp__atlassian__*` | Jira: create/update epics, test cases, bugs, comments, transitions |
| Playwright MCP | `mcp__playwright__*` | Live DOM snapshot, navigation, screenshots for `/explore` skill |
| Filesystem MCP | Built-in Read/Write/Edit | File operations — no separate MCP needed |

## BLAST Memory Files

| File | Purpose | Updated by |
|---|---|---|
| `findings.md` | Environment discoveries, constraints, research | Manual + Blueprint phase |
| `progress.md` | Execution run log — date+time, pass/fail, bugs | `/test-case-execution`, `/test-case-creation` |
| `rca-log.md` | Per-bug RCA — severity, root cause, fix | `/bug-triage`, `/create-bug`, `/explore` |
| `task_plan.md` | Project phases + checklists | Manual |

## Reference Files (load on demand)

- `CLAUDE-skills.md` — all skill docs, MCP setup, trigger patterns
- `CLAUDE-schema.md` — JSON contracts, A.N.T. layer map, secrets policy
- `BLAST.md` — full 5-phase BLAST framework reference
- `ANTI-HALLUCINATION-RULES.md` — 30 QA verification rules (Rule 30: recalled memory is a claim not a fact — re-verify before use, closes KB feedback-loop risk; Rule 29: edge-case coverage matrix; Rule 27: URL scope / nav-tests; Rule 26: stay in command scope; Rule 25: KB bug-oracle + Confirmed/Suspected tiers; Rule 23: 4-category failure taxonomy)
- `AUTO-FIX-PROTOCOL.md` — autonomous fix protocol, 17 rules (max 3 attempts; Rule 16: surgical changes — minimality counterweight to Rule 13 consistency; Rule 17: independent verify before DONE — maker≠checker, default-REJECT, adapted from loop-engineering)
- `RICEPOT.md` — RICEPOT prompt methodology reference
- `karpathy-guidelines` skill — coding-discipline guardrail, 5 guidelines (Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution / **Adopt for Our Pain not to Match Others**). Wired into `test-case-execution` Step 5B + AUTO-FIX Rules 16 & 17. Guideline 5 = decision-level over-engineering check (don't adopt an external repo's feature unless it's OUR pain)
- `knowledge-base/<PROJECT>/` — persistent product memory (adapted from imransdet/qa-assistant): `business-rules.md` (bug-vs-intended oracle, `BR-xx`), `known-defects.md` (dedup), `feature-map.md` (regression blast radius), `product-flows.md`. Loaded by `test-case-creation` Step 1A + `test-case-execution` Step 0. Drives AH Rule 25 Confirmed/Suspected bug tiers. See `knowledge-base/GUIDE.md`
- **New qa-ai-stack skills (this session):** `/qa-run` (one-command orchestrator — chains explore→creation→execution, checkpoints between; conductor only, modifies no core skill) · `/spec-quality` (static 0–100 spec scorer — flaky/secrets/missing-expect/unawaited/empty; read-only, pure regex; from vperambu ReviewerAgent) · `/guard` (installs local `.git/info/exclude` + pre-commit hook so private stack files never push to a company repo; refuses on the stack repo itself). The qa-ai-stack `rules/framework-rule-engine.json` also carries an optional **selector gatekeeper** (forbid XPath/class/positional/dynamic-id in `*Page.ts` — from mvsaran Agent-Driven-E2E) — NOT applied to this workspace's frameworks (no locator pain here; karpathy Guideline 5)

## Knowledge Base (persistent product memory)

```
knowledge-base/
  GUIDE.md              ← how the KB works + grow workflow
  _TEMPLATE/            ← copy to start a new product (4 files)
  SCRUM/                ← active project — seeded from real ACs + bugs
    business-rules.md   ← BR-01..BR-12 (Order Details SCRUM-255, Blinkit SCRUM-121) — bug oracle
    known-defects.md    ← SCRUM-269 (BR-08 violation), SCRUM-141 — dedup before filing
    feature-map.md      ← Login→Products→Checkout→Order Details deps + blast radius
    product-flows.md    ← Blinkit purchase flow, Order Details status states
```

**Bug oracle flow:** `test-case-execution` loads KB first → on REAL_BUG checks `business-rules.md` → **Confirmed** (violates `BR-xx`, cite it) or **Suspected** (`[SUSPECTED]` prefix) → checks `known-defects.md` for dedup before JQL/filing → after filing proposes new defect row (Step 7C compounding memory).

## Key File Locations

- POMs: `Playwright Automation Framework/src/pages/`
- Tests: `Playwright Automation Framework/tests/ui/`
- Screenshots: `Playwright Automation Framework/screenshots/{EpicKey}/`
- Skills: `~/.claude/skills/{skill-name}/SKILL.md`
- DOM fetcher: `scripts/fetch-local-page.js` (workspace root) or `Playwright Automation Framework/scripts/fetch-local-page.js`
- n8n workflows: `AI Agents_N8n/`
- Output/generated docs: `output/`
- Portfolio: `QA Portfolio/index.html` + `QA Portfolio/CLAUDE.md`
- Local demo HTML: `blinkit-login.html`, `blinkit-products.html`, `blinkit-checkout.html`, `registration-demo.html`

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
| 2026-06-15 | TestPlanBuddy built — React+Express, Jira→GROQ→13-section plan | `testplanbuddy/` |
| 2026-06-15 | TestStrategyBuddy built — dark/light mode, 10-section strategy | `teststrategbuddy/` |
| 2026-06-20 | QA Buddy built — 3-tab (Plan/Strategy/TestCases), static sidebar, Vercel deploy | `qabuddy/` |
| 2026-06-20 | n8n AI agent workflows added — Bug Creator + PRD→Test Cases | `AI Agents_N8n/` |
| 2026-06-20 | TTACart PRD created in Jira — SCRUM-178 | `output/TTACart-PRD.md` |
| 2026-06-20 | CLAUDE.md updated — all new projects, commands, MCP table | `CLAUDE.md` |
| 2026-06-24 | QA Buddy v2.0 — 3-stage Pipeline tab (Explore/TestCases/Execute) with real Generate buttons | `qabuddy/client/src/components/PipelineTab.jsx`, `qabuddy/server.js` |
| 2026-06-24 | Pipeline Stage 1 wired to real Playwright DOM via `fetch-local-page.js` (not AI-guessed) | `qabuddy/server.js` |
| 2026-06-24 | LLM-as-Judge quality scorer added to Stage 2 — DeepEval-style faithfulness/coverage/relevancy | `qabuddy/tools/aiClient.js`, `qabuddy/server.js`, `qabuddy/client/src/components/PipelineTab.jsx` |
| 2026-06-24 | Jira fixes — auto-create Test Epic, Story issue type, label sanitization, duplicate detection | `qabuddy/server.js` |
| 2026-06-25 | CLAUDE.md updated — Advance-Playwright-Framework, agent-factory-cli, qa-ai-stack, QA Portfolio added | `CLAUDE.md` |
| 2026-06-25 | NexQA gap fill — network intercept, 3-method LLM scorer, composite session score, HTML evidence report | `qabuddy/server.js`, `qabuddy/tools/aiClient.js` |
| 2026-06-25 | AH Rule 23 added — 4-category failure taxonomy (BROKEN_LOCATOR/REAL_BUG/FLAKY/ENV_ISSUE) | `ANTI-HALLUCINATION-RULES.md` |
| 2026-06-25 | test-case-execution skill updated — composite score + network interception steps | `~/.claude/skills/test-case-execution/SKILL.md` |
| 2026-06-25 | QA Buddy Architecture updated — PipelineTab, LLM-as-Judge, new routes documented | `CLAUDE.md` |
| 2026-06-25 | CLAUDE.md full audit — NexQATab, 5 n8n workflows, aiClient functions, AH rule count (23), scripts/, QA Portfolio, blinkit-checkout.html added | `CLAUDE.md` |
| 2026-06-27 | SCRUM-255 Order Details execution — OD-006 strict-mode fix (getByText → .timeline scope + exact:true); 12/13 pass, OD-008 REAL_BUG → SCRUM-269 filed+linked | `order-details.spec.ts`, `OrderDetailsPage.ts`, `progress.md` |
| 2026-06-27 | karpathy-guidelines skill installed (multica-ai repo) — wired into `test-case-execution` Step 5B; synced to qa-ai-stack | `~/.claude/skills/karpathy-guidelines/`, `qa-ai-stack/skills/`, `test-case-execution/SKILL.md` |
| 2026-06-27 | AUTO-FIX Rule 16 added (surgical changes) — counts synced 15→16 across protocol + cheatsheets + INSTALL.md | `AUTO-FIX-PROTOCOL.md`, `QA-SKILLS-CHEATSHEET.md`, `qa-ai-stack/*` |
| 2026-06-27 | Playwright framework package.json — ai:rca/heal/flaky/triage/dashboard + rules:check/changed/staged scripts wired to agent-factory-cli | `Playwright Automation Framework/package.json` |
| 2026-06-27 | .gitignore hardened — `.env` + `.vercel/` locked out (secrets never commit) | `.gitignore` |
| 2026-06-27 | Knowledge Base added (gap-fill vs imransdet/qa-assistant) — 4-file per-product memory, seeded SCRUM/ from real ACs+bugs; AH Rule 25 Confirmed/Suspected bug tiers; wired into test-case-creation Step 1A + test-case-execution Step 0/5C/7C; synced _TEMPLATE to qa-ai-stack | `knowledge-base/`, `ANTI-HALLUCINATION-RULES.md`, 2 skills, `qa-ai-stack/` |
| 2026-07-01 | qa-ai-stack pushed as standalone clone-able repo `AI_E2E_QA_Automation_Playwright_Master_Framework.git` (subtree) — own CLAUDE.md + INSTALL.md; complete portable QA brain (our engine + imransdet KB + karpathy) | `qa-ai-stack/`, standalone repo |
| 2026-07-01 | Company-repo privacy — `/guard` skill + `setup-local-guard.sh` + `HOW-TO-USE-GUARD.md` + `LOCAL-GUARD-SETUP.md`: local-only `.git/info/exclude` + pre-commit hook keep stack files off company GitHub. CLAUDE.md FIRST-ACTION auto-trigger (fires on any first repo action). Re-run per machine/clone (`.git/` never travels) | `qa-ai-stack/skills/guard/`, `qa-ai-stack/*.md/*.sh` |
| 2026-07-01 | AUTO-FIX Rule 17 added (independent verify before DONE, maker≠checker, default-REJECT — from cobusgreyling/loop-engineering); counts synced 16→17 | `AUTO-FIX-PROTOCOL.md`, `qa-ai-stack/*` |
| 2026-07-01 | `/qa-run` orchestrator skill — one command chains explore→creation→execution with checkpoints (conductor only, no core-skill logic changed); parity with Vara Prasad run-orchestration.js | `qa-ai-stack/skills/qa-run/` |
| 2026-07-01 | `/spec-quality` skill — static 0–100 spec scorer (flaky/secrets/missing-expect/unawaited/empty), pure regex, CI-gate exit code; from vperambu ReviewerAgent | `qa-ai-stack/skills/spec-quality/` |
| 2026-07-01 | Selector gatekeeper (optional) added to qa-ai-stack rule-engine config (forbid XPath/class/positional/dynamic-id in `*Page.ts`, from mvsaran) — NOT applied to workspace frameworks (no locator pain; reverted after Guideline-5 review) | `qa-ai-stack/rules/framework-rule-engine.json` |
| 2026-07-01 | karpathy Guideline 5 added — "Adopt for Our Pain, Not to Match Others" (decision-level over-engineering check). Wired reference in CLAUDE.md | `~/.claude/skills/karpathy-guidelines/`, `qa-ai-stack/skills/`, `CLAUDE.md` |

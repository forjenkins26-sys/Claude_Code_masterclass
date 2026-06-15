# Findings — Research, Discoveries, Constraints

*BLAST Phase 1 (Blueprint) output — populated during Discovery before any tools/ are written.*

---

## Source Objective

- `CLAUDE.md`: Claude Code masterclass workspace — build QA automation skills, Playwright frameworks, Jira-integrated test pipelines, and custom Claude skills.

---

## Environment Discoveries

- **Atlassian MCP connected** — `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `addCommentToJiraIssue`, `editJiraIssue`, `transitionJiraIssue` etc. available. Jira host: `anandsoni2641.atlassian.net`, default project `SCRUM`.
- **Playwright MCP connected** — `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_click` etc. via `.mcp.json` at workspace root (`npx @playwright/mcp@latest`).
- **Existing reusable assets:**
  - `test-case-creation` skill — generates requirements-driven test cases from Jira Epic + UI DOM analysis. Outputs to Jira or markdown.
  - `test-case-execution` skill — runs Playwright tests, auto-fixes failures, files bugs, updates Jira status. Headed mode mandatory (AH Rule 17).
  - `bug-triage` skill — 3-agent pipeline (Triage Analyst → RCA Investigator → Test Recommender). Posts to Jira + appends to `rca-log.md`.
  - `explore` skill — live DOM locator discovery via Playwright MCP → generates TypeScript POM.
  - `generate-test-data` skill — exhaustive test data (valid/invalid/boundary/security/edge) per field or form.
  - `test-plan-create-skill` — Jira ticket → 14-section test plan `.md` + `.docx`.
- **Local demo apps** served at `localhost:7000` via Python `http.server`:
  - `blinkit-login.html` — login form (First Name + Last Name + 10-digit mobile, no password). On valid submit: stores user in `sessionStorage`, shows OTP toast, redirects → `blinkit-products.html` after 1.5s. Known bug: `#signupBtn` has no click handler (SCRUM-141). *(Added: 2026-06-15)*
  - `blinkit-products.html` — products page: 16 items, 5 categories (Fruits/Dairy/Snacks/Beverages/Bakery), live search, cart drawer with total, checkout toast, logout. Reads user name from `sessionStorage`. *(Created: 2026-06-15 via manual enhancement)*
  - `registration-demo.html` — registration form for SCRUM-142 epic testing. *(Pre-existing)*
- **Frameworks:**
  - `Playwright Automation Framework/` — Facebook + Blinkit + SauceDemo POMs, POM pattern + fixture DI
  - `Playwright_8_Layer/` — 8-layer architecture (Config → Utils → Data → API → Components → Pages → Services → Tests)

---

## Constraints

- **BLAST Protocol 0:** forbidden to write scripts in `tools/` until Discovery answered + schema approved in `CLAUDE.md` (per-project).
- **ARIA snapshot limitation:** does NOT expose `data-test` attributes — role-based locators are primary. Add `// VERIFICATION REQUIRED` for unconfirmed selectors.
- **Atlassian MCP:** no file upload — screenshots cannot be auto-attached to Jira. Must attach manually.
- **localhost URLs:** WebFetch cannot reach `localhost` — use `node scripts/fetch-local-page.js` from inside `Playwright Automation Framework/` instead.
- **Headed mode mandatory** for all test execution (AH Rule 17) — no headless shortcuts.
- **POM naming:** `TTALoginPage.ts` not `LoginPage.ts` — Facebook's `LoginPage.ts` occupies that name.
- **SauceDemo `data-test` attrs** not confirmed via ARIA snapshot — role-based locators used instead.

---

## To Research (after Discovery)

- [ ] GitHub repos for Playwright + Jira integration → reuse vs. rebuild decision vs. existing skills
- [ ] Registration demo page (`registration-demo.html`) — features, validations, fields → for SCRUM-142 epic
- [ ] SauceDemo locators marked `// VERIFICATION REQUIRED` — trigger dynamic states (error state, remove button) to confirm actual selectors
- [ ] TTA login page — reCAPTCHA bypass strategy for automated tests
- [ ] Allure report integration — `allure-playwright` already in `package.json`, wire into skill output
- [ ] CrewAI vs. native Claude agent pattern — `bug-triage` skill uses native Claude; evaluate if CrewAI adds value for more complex pipelines
- [ ] BLAST `tools/` folder — no Python scripts exist yet; identify which workflows warrant deterministic Python extraction

---

## TestPlanBuddy App Discoveries *(2026-06-15)*

- **Jira REST handshake PASS** — `SCRUM-121` fetched successfully via Basic auth (`email:token` base64)
- **GROQ model used:** `llama-3.3-70b-versatile` (free tier, not `openai/gpt-oss-120b` — that model unavailable)
- **ADF flatten:** Jira description comes as nested `content` arrays — recursive `flattenADF()` needed
- **Express v4 pinned** — catch-all uses regex `/^(?!\/api).*/` (Express 5 breaks `app.get('*')`)
- **Vite proxy:** `client/vite.config.js` proxies `/api` → `localhost:3001` in dev mode
- **React build output:** `client/dist/` — served as static by Express in production
- **`.env` path:** `dotenv.config({ path: '../.env' })` — server.js is inside `testplanbuddy/`, `.env` is at workspace root

---

## Discovery Q&A Log

*Populated when BLAST Blueprint phase runs for a new project.*

| Date | Project | North Star | Source of Truth | Delivery | Rules |
|---|---|---|---|---|---|
| 2026-06-15 | Masterclass workspace | Build QA automation skills with Claude | Jira SCRUM project + local Playwright specs | Jira comments + markdown reports + POMs | AH Rules + AUTO-FIX-PROTOCOL + BLAST phases |

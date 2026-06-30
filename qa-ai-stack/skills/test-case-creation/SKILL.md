---
name: test-case-creation
description: Generate requirements-driven test cases from Jira Epic + UI locator analysis. Epic/requirements = source of truth for expected behavior (assertions). UI analysis = locator discovery only. Outputs markdown table or creates directly in Jira via MCP. Use when user says "create test cases", "generate test scenarios", "/test-case-creation [URL]", or provides Epic + URL for testing.
---

# Test Case Creation

## RICEPOT Framework (Applied Every Run)

| Letter | This Skill's Value |
|---|---|
| **R — Role** | Senior QA automation engineer, 15 years experience, expert in requirements-driven testing and Playwright. Never derives expected behavior from UI observation. |
| **I — Instructions** | Fetch Epic via MCP. Analyze DOM via fetch-local-page.js (localhost) or WebFetch (remote). Map each Epic AC line → test scenario. Generate test cases with exact Epic text as expected results. Create in Jira or output as markdown. |
| **C — Context** | Two-source model: Epic = assertions, DOM = locators. AH Rules 17/18/19/20 active. Auto-Fix Protocol active for POM verification. Known project: SCRUM at anandsoni2641.atlassian.net. |
| **E — Example (RIGHT)** | Expected: `"Enter your first name (letters only, min 2 chars)"` — exact Epic text. Source: `Epic SCRUM-142 AC line 3`. |
| **E — Example (WRONG)** | Expected: `"error message appears"` — vague, UI-observed, not traceable. NEVER write this. |
| **P — Parameters** | **AH Rule 17:** headed mode before any selector written. **AH Rule 18:** `pressSequentially()` for all constraint tests — never `fill()`. **AH Rule 19:** assertions from Epic ONLY — never UI observation. **AH Rule 20:** classify failures by actual mechanism not category. No invented behavior. No placeholder assertions. Every expected result must be quotable back to an Epic line. Flag requirement gaps explicitly. Security tests always included. |
| **O — Output** | Jira: N issues created under Epic, keys returned, linked. Markdown: table with Source column tracing every assertion to Epic line. POM + spec if requested — all locators verified via Step 6B before handoff. |
| **T — Tone** | Precise, terse. No commentary between steps. Jira descriptions follow strict template (Source → Preconditions → Steps → Expected Result → Test Data). No prose. No "This test verifies that...". |

---

**Tone:** Precise, terse. No commentary between steps. Report decisions only when asking user input or confirming counts before Jira creation.

---

Generate comprehensive functional test cases using a **two-source approach**:

| Source | Used For |
|---|---|
| Jira Epic / acceptance criteria | Test assertions — what SHOULD happen |
| UI analysis (WebFetch / live DOM) | Locators only — how to find elements |

**Why this matters:** UI may have developer mistakes (wrong button labels, missing handlers, broken navigation). Tests must validate requirements, not observed UI behavior. If UI doesn't match requirement → test FAILS → bug caught.

---

## Rules Applied

### Anti-Hallucination Rules (ANTI-HALLUCINATION-RULES.md)

| Rule | What it enforces here |
|---|---|
| AH-1 | Don't invent test scenarios beyond actual page features |
| AH-7 | Test steps must distinguish: element exists vs visible vs actionable |
| AH-8 | Locators in test steps are suggestions — must be verified in headed mode during execution |
| AH-11 | Use role/label/attribute selectors, not visible text (text changes with locale) |
| AH-13 | Don't assume navigation URLs in test steps — verify actual paths |
| AH-18 | Constraint tests (maxlength, pattern) must use `pressSequentially()` not `fill()` |
| AH-19 | **CORE RULE** — Epic requirements = source of test assertions. UI analysis = locators only. Never derive expected behavior from UI observation. |
| AH-16 | Multi-artifact consistency — if locator name changes during POM generation, update: Jira test step descriptions + POM property name + spec file references. All 3 must match. |

### AUTO-FIX Protocol (AUTO-FIX-PROTOCOL.md)

| Rule | What it enforces here |
|---|---|
| AFP-3 | Fix root cause — if locator wrong, find correct selector via headed DOM inspection, not by guessing alternatives |
| AFP-4 | Verify fix 3x — rerun verification script after each locator fix, confirm `✅` before moving on |
| AFP-9 | Headed mode before applying fix — inspect actual DOM to confirm correct element found |
| AFP-11 | Test progressively — verify single locator → all locators → rerun full script |
| AFP-13 | Fix ALL artifacts — wrong locator means wrong variable name too. Rename property + method + spec references (Rule 13) |
| AFP-15 | Expected results assert actual outcomes, not mechanics. `expect(url).toBeTruthy()` = wrong. `expect(errorMessage).toHaveText('Enter your first name')` = right. |

**Scope:** AFP applies during POM locator verification (Step 6B) — fixing assumed locators before first test run. Full AFP (including bug classification) activates during `/test-case-execution`.

---

## Instructions

### Step 1: Gather Input

**Two modes based on what user provides:**

#### Mode A: Requirements-Driven (Epic provided — PREFERRED)

```
/test-case-creation https://example.com/login epic SCRUM-48
/test-case-creation app.vwo.com create in jira project VWO epic SCRUM-32
/test-case-creation SCRUM-48  (Epic key only, no URL)
```

**Inputs:**
- Epic key or URL (e.g., `SCRUM-48`, `https://site.atlassian.net/browse/SCRUM-48`)
- URL of feature under test (optional if Epic description contains URL)
- Output format: `markdown` (default) or `jira`
- Jira project key (required if output=jira)

**⚠️ MANDATORY — If Epic provided but output format NOT specified:**

Do NOT silently default to markdown. Ask first:

> "Where would you like the test cases?
> 1. **Jira (via MCP)** — create them directly under Epic SCRUM-XX in Jira
> 2. **Here** — show them as a table in this chat"

Wait for user answer before proceeding to Step 2.

#### Mode B: UI-Observed (No Epic — partial coverage)

```
/test-case-creation https://example.com/login
/test-case-creation app.vwo.com create in jira project VWO
```

**Inputs:**
- URL only (no Epic)
- Output format + project key (if Jira)

⚠️ **Mode B limitation:** Without requirements, behavioral assertions cannot be verified. All expected results tagged `[VERIFICATION REQUIRED — no requirements provided]`. Locators will be accurate; assertions will be best-effort inferences from UI observation only.

---

### Step 1A: Fetch Requirements (Mode A only — MANDATORY)

**Load Knowledge Base first (AH Rule 25 — additive context):** read `knowledge-base/<PROJECT>/` if it exists (default `SCRUM`):
- `business-rules.md` — `BR-xx` rules reinforce the Epic ACs as assertion baseline (Epic AC still wins per-run; rules are the standing baseline)
- `feature-map.md` — add the feature's `Used by` chain as **regression-risk scenarios** in the test scope (widens coverage beyond the single Epic)
- `known-defects.md` — probe `Open` weak spots harder when generating edge cases

If no folder → continue silently (KB is additive). Then proceed to fetch the Epic.

**Load Jira MCP tool:**
```
ToolSearch: select:mcp__atlassian__getJiraIssue
```

**Fetch Epic:**
```json
mcp__atlassian__getJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "issueIdOrKey": "SCRUM-48"
})
```

**Extract from Epic:**
- Summary (feature name)
- Description (acceptance criteria, functional requirements)
- Labels, priority
- Any child stories if linked

**Parse acceptance criteria into test scenarios:**

Look for patterns in description:
- "User should be able to..." → valid scenario
- "System must reject..." → invalid scenario
- "Error message should show..." → exact expected error text
- "Navigates to..." → exact URL or page name expected
- "Button labeled..." → exact UI text requirement

**CRITICAL:** If Epic says "button labeled 'Sign Up'" and UI shows "Sinup" — write test asserting `'Sign Up'`. Test WILL FAIL. That is CORRECT — it caught a bug.

---

### Step 2: UI Analysis (Locator Discovery ONLY)

**Purpose: Find element selectors. NOT to determine expected behavior.**

**Check URL type first:**

**If URL is localhost / 127.0.0.1:**
- ❌ WebFetch cannot reach localhost
- ✅ Use Playwright live DOM fetcher:

```bash
cd "Playwright Automation Framework"
node scripts/fetch-local-page.js http://localhost:7000/page.html
```

Output JSON:
- `analysis.inputs` — field IDs, names, types, placeholders → use for locators
- `analysis.buttons` — button text, selectors → use for locators
- `analysis.links` — link text, hrefs → use for locators
- `analysis.errorElements` — error message selectors → use for locators

**If URL is remote (https://...):**
- ✅ Use WebFetch normally

**Extract ONLY:**
- Element selectors (IDs, roles, labels, names)
- Field types (email, password, text, tel)
- Form structure (which fields exist)
- Page structure (sections, navigation)

**DO NOT extract from UI:**
- ❌ Expected behavior (what happens on submit)
- ❌ Validation rules (what errors appear)
- ❌ Navigation targets (where buttons go)
- ❌ Success states (what success looks like)

These come from Epic requirements, not UI observation.

**Exception — static UI facts are OK to use:**
- ✅ Field exists: `<input type="email">` → test that email field is present
- ✅ Button exists: `<button>Login</button>` → test that Login button is visible
- ✅ Maxlength: `<input maxlength="10">` → test maxlength constraint is enforced

---

### Step 3: Identify Test Scenarios

#### Mode A: Requirements-Driven

**Map Epic acceptance criteria → test scenarios:**

For each requirement statement:
1. Write a test for the happy path (requirement met)
2. Write a test for the failure path (requirement violated)
3. Write edge case variants

**Example mapping:**

| Epic Requirement | Test Case |
|---|---|
| "Login with valid 10-digit mobile shows OTP toast" | BL-002: Submit valid data → assert toast text = "✅ OTP sent to +91 [number]" |
| "Empty first name shows error 'Enter your first name'" | BL-005: Submit with empty first name → assert error text = "Enter your first name" |
| "Create New Account navigates to registration page" | BL-010: Click button → assert URL changes away from login page |

**IMPORTANT:** Expected result text comes from requirement, not UI. If requirement says `"Enter your first name"` but UI shows `"First name required"` → test asserts `"Enter your first name"` → FAILS → bug caught.

#### Step 3A: Edge-Case Coverage Matrix — MANDATORY per control (AH Rule 29)

**Why this exists:** "write edge case variants" is too vague — coverage ends up depending on whoever remembers to ask "did you check max? empty submit? manual entry?". This matrix removes the memory dependency. **For EVERY interactive control found in the DOM (Step 2), walk its row and emit a verdict for every applicable cell** — Added (Epic defines the oracle), Fixme (valid case, Epic silent → `test.fixme` + `[REQUIREMENT NEEDED]`, record observed behaviour), or N/A (control can't reach that state, one-line reason). Never skip a cell silently (Lesson #7).

**Each probe maps to a named formal test-design technique** — tag the test/subtask with it (industry-standard framing, and it makes the coverage self-documenting):
- **BVA** (Boundary Value Analysis): min, min−1, max, max+1, empty (= lower boundary of length).
- **ECP** (Equivalence Class Partitioning): one representative per valid + invalid partition (valid number / negative / non-numeric / huge).
- **Negative**: the failure/rejection path.
- **State transition**: actions that change app state (add, remove-one-of-N, re-add merge/dup).
- **Security**: SQLi / XSS / fuzz (always included regardless of Epic).
- **Exploratory / "out of the box"**: undocumented behaviours found by probing the live app, not derivable from the spec (e.g. is the qty field editable? is there any max cap?). These are almost always Epic-gaps → fixme.

| Control type | Probe every one of these (→ technique) |
|---|---|
| **Text / search input** | empty submit (Negative/BVA) · whitespace-only (ECP-invalid) · no-match result (Negative) · clear-restores (State transition) · case sensitivity (ECP) · max-length via `pressSequentially` (BVA, AH Rule 18) · special chars (ECP-invalid) · SQLi + XSS (Security, always) |
| **Number / quantity stepper** | default value · increment · decrement (happy) · **decrement at/below the floor / min−1** (BVA) · **maximum / max+1 / upper bound — is there a cap?** (BVA + Exploratory) · **manual keyboard entry** — editable? typed value carries through? (Exploratory) · non-numeric / negative (ECP-invalid) |
| **Add / submit button** | happy path · **submit with empty/no selection** (Negative) · double-click / rapid repeat (State transition) · disabled-state if any (Negative) |
| **Cart / list / collection** | single item · **multiple items — remove one of N keeps the rest** (State transition) · **empty-state message, exact text** (Negative/BVA-empty) · re-add merge-vs-duplicate (State transition) · count integrity |
| **Remove / delete link** | removes the correct item (State transition) · last-item-removed → empty state (BVA-empty) · count decrements |
| **Link / nav element** | navigates to the right destination — same-tab vs `_blank` popup (AH Rule 27) + destination screenshot |
| **Promo / coupon / discount** | valid code (ECP-valid) · invalid code (ECP-invalid) · empty apply (Negative) · recalculation (usually Epic-gap → fixme) |

**Output:** a per-control verdict table in the report, tagged with technique. Example (GreenKart quantity stepper):

| Cell | Technique | Verdict | Note |
|---|---|---|---|
| default "1" / increment / decrement | Happy | Added (GK-003) | AC3 |
| decrement floor (min−1) | BVA | Fixme (GK-022) | AC3 silent on floor; observed clamps at 1 |
| maximum (max+1 / cap?) | BVA + Exploratory | Fixme (GK-027) | no cap observed (set 9999 freely) |
| manual keyboard entry | Exploratory | Fixme (GK-028) | editable; typed "7" → cart "7 Nos." |
| non-numeric / negative | ECP-invalid | Fixme | Epic silent |

**The Epic still wins for assertions (AH Rule 19).** This matrix decides WHICH cases to raise; the Epic decides the expected result. A cell with no Epic oracle is NOT invented — it becomes a fixme requirement-gap subtask with the observed behaviour recorded.

#### Mode B: UI-Observed (fallback)

Generate standard scenario types but mark all behavioral assertions:

**Valid Scenarios (Happy Path):**
- Primary user flow with correct inputs
- All required fields filled properly

**Invalid Scenarios (Negative Testing):**
- Missing required fields (one at a time)
- Invalid format
- Boundary violations

**Edge Cases:**
- Min/max length inputs
- Empty submissions
- Whitespace-only inputs
- Special characters, Unicode
- Double-click submit

**Security Tests:**
- SQL injection in all text fields
- XSS attempts (`<script>alert('xss')</script>`)

All behavioral expected results tagged: `[VERIFICATION REQUIRED — verify against requirements]`

---

### Step 4: Generate Test Cases

**Output as markdown table:**

| Test ID | Summary | Type | Priority | Source | Preconditions | Test Steps | Expected Result | Test Data |
|---------|---------|------|----------|--------|---------------|------------|-----------------|-----------|

**New column: Source** — MUST be traceable to exact Epic section, not just Epic key:
- `Epic SCRUM-XX AC line N` — expected result traced to specific AC line (RICEPOT Context — C)
- `Epic SCRUM-XX — description para N` — traced to Epic description paragraph
- `UI Observed` — expected result inferred from UI only (needs verification, Mode B)
- `Security Standard` — standard security test (always applicable regardless of Epic)

**Expected Result rules:**

- **Mode A:** Quote exact text from Epic requirement. e.g., `"✅ OTP sent to +91 [mobile]"` not `"success toast appears"`
- **Mode B:** Describe observed behavior + tag: `Toast appears [VERIFICATION REQUIRED]`

**If requirement is ambiguous:** Write test with placeholder: `[REQUIREMENT NEEDED: what should happen?]` — forces requirement gap to surface.

---

### Step 5: Organize Test Cases

**Group by scenario type:**

1. **Valid Scenarios** — Happy path, requirement-driven assertions
2. **Invalid Scenarios** — Negative tests, requirement-driven error text
3. **Edge Cases** — Boundary conditions
4. **Security Tests** — SQL injection, XSS (always include)
5. **Requirement Gaps** *(Mode A only)* — Requirements mentioned in Epic but no UI element found → flag as missing feature

---

### Step 6: Output Test Cases

#### Option A: Markdown Table (default)

```markdown
# Test Cases for [Feature Name]
**Epic:** [SCRUM-XX] — [Epic Summary]
**URL:** [tested URL]
**Requirements Source:** [Epic fetched / UI-observed only]

## Coverage Summary
- **Requirements-driven tests:** XX (assertions traced to Epic)
- **UI-observed tests:** XX (need requirement verification)
- **Security tests:** XX
- **Total:** XX

## Requirement Gaps Found
- [List requirements in Epic with no corresponding UI element — potential missing features]

## Test Case Details

### Valid Scenarios
[table]

### Invalid Scenarios
[table]

### Edge Cases
[table]

### Security Tests
[table]
```

#### Option B: Direct Jira Creation via MCP

```json
mcp__atlassian__createJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "projectKey": "SCRUM",
  "issueTypeName": "Test",
  "summary": "BL-002: Verify valid login shows OTP toast",
  "description": "**Source:** Epic SCRUM-121 requirement\n\n**Preconditions:**\n- App running at localhost:7000\n\n**Test Steps:**\n1. Navigate to blinkit-login.html\n2. Enter First Name: Rahul\n3. Enter Last Name: Sharma\n4. Enter Mobile: 9876543210\n5. Click Login button\n\n**Expected Result:**\nToast shows: '✅ OTP sent to +91 9876543210'\n*(Source: Epic SCRUM-121 — 'valid login triggers OTP toast with exact mobile number')*\n\n**Test Data:**\nFirst Name: Rahul | Last Name: Sharma | Mobile: 9876543210",
  "contentFormat": "markdown"
})
```

**MCP workflow:**
1. **Check for existing test cases (duplicate detection — MANDATORY):**

```json
mcp__atlassian__searchJiraIssuesUsingJql({
  "cloudId": "anandsoni2641.atlassian.net",
  "jql": "parent = SCRUM-XX ORDER BY key ASC"
})
```

Parse existing issue summaries. Extract test IDs (e.g., `REG-001`, `BL-002`) from each summary.

**If existing issues found → ask user:**

> "Found [N] test cases already under Epic SCRUM-XX. What should I do?
> 1. **Sync (recommended)** — reconcile to the Epic: skip IDs already present, create any missing, and update existing ones whose steps/expected-result no longer match the current AC
> 2. **Skip** — don't create, use existing ones as-is
> 3. **Replace** — delete existing and create fresh
> 4. **Add** — create new ones alongside existing (never modifies existing)"

Wait for user answer before proceeding.

- **Sync (default)** → idempotent reconciliation against the Epic ACs:
  1. Build the desired test set from current Epic ACs (the normal Step 3 mapping).
  2. **Skip** any desired test whose ID already exists AND whose summary + steps + expected-result still match the AC (no change needed).
  3. **Add** any desired test whose ID is NOT present.
  4. **Modify** (via `editJiraIssue`) any existing test whose AC has changed — update summary/steps/expected-result to match the current AC. Note the diff in a comment.
  5. **Never auto-delete.** An existing test with no matching AC anymore → report it as "orphan — AC removed?" and ask before deleting.
  6. Report a per-test verdict table (Skipped / Added / Modified / Orphan) → then ask POM prompt (see below).
  Re-running Sync on an unchanged Epic = no-op (0 created, 0 modified). That is the correct result, not a failure.
- **Skip** → stop, report existing keys → ask POM prompt (see below)
- **Replace** → delete all existing children first, then create all fresh → ask POM prompt (see below)
- **Add** → only create test cases whose IDs are NOT already present (compare `REG-001` etc. in summaries) → ask POM prompt (see below)

**⚠️ MANDATORY — After all options complete, ALWAYS ask:**

> "Should I also create the POM and test files in the Playwright Automation Framework for these test cases?
> Reply **yes** or **no**."

If user says yes → **first check for existing POM + spec files (duplicate detection):**

```
Glob: Playwright Automation Framework/src/pages/*.page.ts  → look for file matching Epic feature name
Glob: Playwright Automation Framework/tests/ui/*.spec.ts   → look for file matching Epic feature name
```

**If POM file already exists:**
> "POM file `[filename].page.ts` already exists. What should I do?
> 1. **Skip** — use existing POM
> 2. **Replace** — overwrite with fresh POM based on current test cases"

**If spec file already exists:**
> "Spec file `[filename].spec.ts` already exists. What should I do?
> 1. **Skip** — use existing spec
> 2. **Replace** — overwrite with fresh spec based on current test cases"

**If neither exists → create both.**

After user answers → follow `create-page-object` skill patterns for POM structure. Map each Jira test case → one `test()` block in spec file. Use `--grep` tag matching Jira issue key in test title (e.g., `REG-001`).

Then run **Step 6B: POM Locator Verification** (see below — MANDATORY).

**If user provided a specific test case ID (e.g., "add REG-005 only"):**
- Check if that specific ID already exists in summaries
- If exists → tell user: "REG-005 already exists as SCRUM-XXX. Skip or replace?"
- If not exists → create only that one

**If no existing issues → proceed normally.**

2. Confirm test case count + project before creating
3. Create sequentially — one issue per test case
4. Link to Epic parent after creation
5. Report all created issue keys

**Epic linking:**
```json
mcp__atlassian__editJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "issueIdOrKey": "SCRUM-122",
  "fields": { "parent": {"key": "SCRUM-121"} }
})
```

**⚠️ MANDATORY — After all Jira issues created and linked, ask:**

> "✅ Done! [N] test cases created in Jira via MCP.
>
> Should I also create the POM and test files in the Playwright Automation Framework for these test cases?
> Reply **yes** or **no**."

If user says yes → **first check for existing POM + spec files (duplicate detection):**

```
Glob: Playwright Automation Framework/src/pages/*.page.ts  → look for file matching Epic feature name
Glob: Playwright Automation Framework/tests/ui/*.spec.ts   → look for file matching Epic feature name
```

**If POM file already exists:**
> "POM file `[filename].page.ts` already exists. What should I do?
> 1. **Skip** — use existing POM
> 2. **Replace** — overwrite with fresh POM based on current test cases"

**If spec file already exists:**
> "Spec file `[filename].spec.ts` already exists. What should I do?
> 1. **Skip** — use existing spec
> 2. **Replace** — overwrite with fresh spec based on current test cases"

**If neither exists → create both.**

After user answers → follow `create-page-object` skill patterns for POM structure. Map each Jira test case → one `test()` block in spec file. Use `--grep` tag matching Jira issue key in test title (e.g., `REG-001`).

Then run **Step 6B** below — MANDATORY.

#### Step 6B: POM Locator Verification (AUTO-FIX Protocol applied)

**Write and run a headed verification script:**

```javascript
// verify-locators-[feature].js — run from "Playwright Automation Framework/"
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:7000/[page].html'); // or remote URL

  const locators = {
    // Paste every locator from the POM here
    firstNameInput:       page.locator('#firstName'),
    lastNameInput:        page.locator('#lastName'),
    emailInput:           page.locator('#email'),
    submitButton:         page.locator('#submitBtn'),
    // ... all POM locators
  };

  let passed = 0, failed = 0;
  for (const [name, locator] of Object.entries(locators)) {
    const count   = await locator.count();
    const visible = count > 0 ? await locator.isVisible() : false;
    const status  = (count > 0 && visible) ? '✅' : '❌';
    if (count > 0 && visible) passed++; else failed++;
    console.log(`${status} ${name}: exists=${count > 0}, visible=${visible}`);
  }

  console.log(`\nResult: ${passed} pass, ${failed} fail`);
  await browser.close();
})();
```

Run:
```bash
cd "Playwright Automation Framework"
node verify-locators-[feature].js
```

**Parse output — for every `❌` locator:**

Apply AFP auto-fix protocol (max 3 attempts):

1. **Investigate** — inspect actual DOM via headed mode. What is the real selector?
2. **Fix** — update POM property with correct locator. Add `// VERIFIED: headed mode [date]` comment.
3. **Verify** — rerun script. Confirm `✅` before moving on.
4. **Rename if needed** — AFP Rule 13: if variable name no longer matches UI (e.g., POM says `submitButton` but actual button text is "Create Account") → rename property + method + all spec references.

**After all locators pass:**
- Delete the verification script (temp artifact)
- Add comment block at top of POM: `// All locators VERIFIED: headed mode [date]`

**If stuck after 3 attempts on a locator:**
- Add comment in POM: `// ⚠️ UNVERIFIED — could not resolve in headed mode [date]. Needs manual check.`
- Report to user which locators are unverified before handing off

**Only hand off to `/test-case-execution` when all POM locators show ✅ (or are explicitly flagged ⚠️).**

#### Step 6C: Smoke Run Gate (MANDATORY before handoff)

After all locators pass 6B, run ONE smoke test to confirm the full pipeline works end-to-end:

```bash
cd "Playwright Automation Framework"
npx playwright test tests/ui/[feature].spec.ts --grep "REG-001\|TC-001\|BL-001" --project=chromium --headed --reporter=list
```

**Pass:** At least 1 test passes → handoff to `/test-case-execution`
**Fail:** Apply Auto-Fix Protocol immediately — do NOT hand off with a broken first test.

This catches: wrong baseURL, missing fixture registration, import errors, navigation failures — things locator verification alone cannot catch.

Report smoke result to user: `✅ Smoke: 1/1 pass — ready for /test-case-execution` or `❌ Smoke failed — auto-fixing before handoff`.

---

### Step 7: Requirement Gap Report

**After generating test cases (Mode A only):**

Compare:
- Requirements found in Epic
- UI elements found in page

**Flag mismatches:**

| Type | Example | Action |
|---|---|---|
| Requirement exists, UI element missing | Epic says "Forgot Password link" — no link in DOM | Flag: potential missing feature |
| UI element exists, no requirement | Button in UI not mentioned in Epic | Flag: undocumented feature, test with "VERIFICATION REQUIRED" |
| Requirement text ≠ UI label | Epic: "Sign Up" button, UI: "Sinup" | Write test against requirement text — WILL FAIL — correct |

---

### Step 8: Add Notes Section (Markdown output only)

```markdown
## Notes

**Requirements Source:** Epic [SCRUM-XX] fetched [date] / UI-observed only
**Test Environment:** [URL], [browser]
**Assumptions:** [List if Mode B]
**Requirement Gaps:** [List any found]
**Out of Scope:** [What's NOT covered]
```

---

## Quality Gates

Before finishing:
- ✅ **RICEPOT P enforced:** AH Rules 17/18/19/20 applied — can cite which rule prevented which mistake
- ✅ **RICEPOT O enforced:** Source column has Epic line reference (not just Epic key) for every assertion
- ✅ **RICEPOT T enforced:** Jira descriptions follow strict template — no prose, no filler
- ✅ Mode A: Every behavioral expected result traced to exact Epic AC line (Source column)
- ✅ Mode B: All behavioral assertions tagged `[VERIFICATION REQUIRED]`
- ✅ UI analysis used ONLY for locators, not for expected behavior (Mode A)
- ✅ Requirement gap report included (Mode A)
- ✅ Security tests included regardless of mode (SQL injection, XSS minimum)
- ✅ Test steps are clear, numbered, actionable
- ✅ Test data provided for all scenarios
- ✅ Source column populated for every test case — with Epic line ref not just key
- ✅ **If Jira output:** Confirm count + project before creating
- ✅ **If Jira output:** Report all created keys
- ✅ **If POM created:** Run Step 6B locator verification — all ✅ or flagged ⚠️
- ✅ **If POM created:** Run Step 6C smoke gate — at least 1 test passes before handoff
- ✅ Append run to `progress.md` (BLAST protocol)

## BLAST Progress Logging

After completing, append to `C:\ClaudeCodeMasterclass\progress.md`:

```markdown
## {YYYY-MM-DD HH:MM} — /test-case-creation {EPIC-KEY or URL}

**Epic:** {key} — {summary}
**Mode:** A (requirements-driven) / B (UI-observed)
**Test Cases Created:** {N} in Jira / {N} as markdown
**Jira Keys:** {SCRUM-XXX to SCRUM-YYY}
**Requirement Gaps Found:** {N} — {brief list or "none"}
**POM Created:** {filename} / No
```

Do NOT overwrite — always append.

---

## Usage Examples

**Requirements-driven (Mode A — preferred):**
```
/test-case-creation https://example.com/login epic SCRUM-48
/test-case-creation SCRUM-48
/test-case-creation http://localhost:7000/blinkit-login.html epic SCRUM-121 output jira SCRUM
```

**UI-observed only (Mode B — limited assertions):**
```
/test-case-creation https://example.com/login
/test-case-creation app.vwo.com create in jira project VWO
```

**Full pipeline:**
```
/test-case-creation https://app.vwo.com/#/login epic VWO-105 create in jira project VWO
```

---

## Anti-patterns

❌ **Don't:**
- Derive expected behavior from UI observation (UI may be wrong — that's the bug)
- Write `"error message appears"` — write exact text from requirement
- Assume observed navigation = correct navigation (requirement may differ)
- Skip requirement gap report in Mode A — missing features are bugs
- Mark all tests as "requirements-driven" when no Epic was provided
- Write `expect(url).toBeTruthy()` — meaningless assertion (from AUTO-FIX-PROTOCOL Rule 15)
- Use `fill()` for maxlength constraint tests — use `pressSequentially()` (ANTI-HALLUCINATION Rule 18)

✅ **Do:**
- Fetch Epic FIRST before analyzing UI (Mode A)
- Use UI scan only for: element selectors, field types, DOM structure
- Quote exact requirement text in expected results
- Flag requirement gaps explicitly — they may be missing features
- Use `[VERIFICATION REQUIRED]` tags honestly in Mode B
- Security tests always apply regardless of mode
- **Jira mode:** Confirm before creating, report all keys

## Lessons

❌ **Don't:** Treat re-running the skill on an Epic that already has test cases as a Skip-or-Replace-only choice. Forcing the user to pick "delete everything and recreate" or "do nothing" loses work or duplicates it. Reporting "0 created" as if the run failed is also wrong.
✅ **Do:** Default to **Sync** — reconcile the children to the current Epic ACs: skip unchanged, add missing, modify changed (`editJiraIssue`), never auto-delete (flag orphans, ask). A no-op on an unchanged Epic is the correct, expected result. Idempotent: running it twice changes nothing the second time.
*(Lesson #1 — 2026-06-29)*

❌ **Don't:** Generate test cases for a different URL than the one given, even when the Epic's ACs span multiple pages. SCRUM-270 (#/) had ACs covering the #/cart checkout page; tests were written for #/cart table/promo/place-order — outside the requested #/ scope. The Epic over-reaching does not override the user's explicit URL scope.
✅ **Do:** Scope test generation to the URL given (matches `/explore` Lesson #6). For an element on the scoped page that NAVIGATES away (link/button to another URL), write exactly ONE navigation test — click it, assert the correct destination (URL/title/new-tab href). Do NOT then cover the destination page's own contents (its forms, tables, buttons) — that's a separate `/test-case-creation` run on that URL. ACs that describe a different page → flag them as "out of scope for this URL; covered by a separate run", do not silently generate them. (e.g. GreenKart: PROCEED→#/cart navigation = IN; the #/cart table/promo/Place Order = OUT.)
*(Lesson #2 — 2026-06-29)*

❌ **Don't:** Write a navigation test as an href-presence check (`toHaveAttribute('href', ...)`), and don't assert `page.url()` on the current tab for a `target="_blank"` link. An href is static markup — a broken handler still has the right href, so href presence is NOT proof of navigation. For a `_blank` link the current tab's URL never changes, so a `page.url()` check on it is a false pass.
✅ **Do:** Pick the nav-test technique by the element's `target` (verify it live first — AH Rule 17, don't assume):
- **same-tab** (full nav or SPA hash route): `await expect(page).toHaveURL(/dest/)`.
- **new-tab** (`target="_blank"`): capture the popup, assert ITS URL, close it:
```typescript
const [popup] = await Promise.all([
  context.waitForEvent('page'),
  gk.flightBookingLink.click(),
]);
await popup.waitForLoadState();
await expect(popup).toHaveURL(/dropdownsPractise/);  // destination only
await popup.screenshot({ path: 'screenshots/<EPIC>/<ISSUE>_<TC>_destination.png' }); // arrival proof
await popup.close();
```
GreenKart: Top Deals, Flight Booking, TechSmartHire are ALL `target="_blank"` → popup-capture nav test (GK-017/018/019). Still no destination-page content (AH Rule 27 holds). This corrects the earlier "_blank → assert href only, do not follow" guidance, which let broken navigation pass.
*(Lesson #3 — 2026-06-29)*

✅ **Do (nav destination proof):** A nav test to a DIFFERENT URL must capture a **destination screenshot** as arrival proof, alongside the URL assertion. New-tab → `popup.screenshot()` BEFORE `popup.close()`; same-tab → `page.screenshot()` after the URL changes. Playwright's config `screenshot: 'on'` only auto-captures the test's main `page`, NOT the popup — so without an explicit shot the destination tab has zero evidence. The screenshot is the destination at first load ("the link landed here"), NOT content coverage — make no assertions on it (AH Rule 27 holds). GreenKart GK-017/018/019 save `SCRUM-287/288/289_GK-0xx_destination.png`.
*(Lesson #4 — 2026-06-29: QA asked "we validate the URL → we should also screenshot that page as proof.")*

❌ **Don't:** Add before/after screenshots to EVERY test as blanket "coverage." For presence/load-assertion tests nothing changes, so two near-identical shots are noise; `screenshot: 'on'` already auto-captures the end-state, and a screenshot is never the oracle (the `expect()` is). Blanket shots create false "looks like coverage" confidence and double maintenance.
✅ **Do (state-mutation evidence — AH Rule 28):** Capture before AND after screenshots ONLY for tests whose point is a STATE TRANSITION (search filter 30→1, qty stepper 1→3→2, add-to-cart 0→1, remove 1→0, filter/sort, modal toggle, total recalc). Assert the before-state too (not just after) so the pair is meaningful. Skip for: presence/DOM-existence, navigation (already has home+destination per Lesson #4), pure load-assertion, security-inertness tests. GreenKart applied to GK-002/003/004/005/007 only.
```typescript
const shot = (page, scrum, gk, phase: 'before' | 'after') =>
  page.screenshot({ path: `screenshots/<EPIC>/${scrum}_${gk}_${phase}.png` });
// in a mutation test:
await expect(gk.products).toHaveCount(30);           // before-state
await shot(page, 'SCRUM-272', 'GK-002', 'before');
await gk.searchProduct('Brocolli');
await expect(gk.products).toHaveCount(1);            // after-state
await shot(page, 'SCRUM-272', 'GK-002', 'after');
```
*(Lesson #5 — 2026-06-29: QA asked "screenshot before and after each action." Adopted TARGETED, not blanket, after weighing cost vs evidence.)*

❌ **Don't:** Put internal reasoning in spec-file comments — rule citations (`AH Rule 27`), dated verification notes (`VERIFIED 2026-06-29`), scope-decision essays, "this was WRONG before" history, requirement-discrepancy paragraphs. The spec is a CLIENT-FACING deliverable; multi-line reasoning comments make it look like the team is arguing with itself / making a mess.
✅ **Do:** One short comment per test — `GK-ID + SCRUM key + what it checks`. The test title already carries traceability for `--grep`. Inline mechanics comments (`// before`, `// after`) are fine. Move ALL reasoning to where it belongs: Jira issue descriptions, `DECISIONS.md`, the KB, and these stack rules — NOT the spec.
```typescript
// ❌ messy (5 lines of rule-citing essay in the spec)
// GK-017 SCRUM-287 — Top Deals ... VERIFIED 2026-06-29 ... Scope rule (AH Rule 27) ...
// ✅ clean
// GK-017 SCRUM-287 — Top Deals opens #/offers in a new tab
```
*(Lesson #6 — 2026-06-29: QA — "don't add comments with rules/lots of things; the client will think they're making a mess.")*

❌ **Don't:** Enumerate a list of N candidate test cases (e.g. a coverage-gap audit) and then act on only a subset — especially after funneling them into an AskUserQuestion that offered fewer options than you listed. The un-offered candidates silently vanish from the list and never get a decision. (Happened 2026-06-29: 7 gaps listed, 4 acted on, 3 dropped without a verdict until the user asked "did you add them, if not why?")
✅ **Do:** Treat the enumerated list as a CHECKLIST and reconcile against it — every candidate gets an explicit verdict before the task is "done":
- **Added** (real test, has an Epic/self-evident oracle), or
- **Fixme** (valid case but behaviour undefined in the Epic → `test.fixme` + `[REQUIREMENT NEEDED]`, AH Rule 19), or
- **Dropped** with a one-line reason (duplicate of an existing test / marginal value / out of scope).
If a follow-up question only offers a subset, still report a verdict for the omitted ones — a menu narrowing the choices does not delete the candidates. Restate the full N-row table at the end.
*(Lesson #7 — 2026-06-29: QA caught 3 enumerated gap-cases dropped without a verdict. Reconcile every candidate; never let a subset menu silently discard list items.)*

❌ **Don't:** Rely on memory / ad-hoc judgement to decide which edge, boundary, and negative cases to write. That makes the QA keep asking "did you check max? empty submit? manual entry? min−1?" — coverage becomes a function of who remembers what, not a system.
✅ **Do:** Walk the **Step 3A Edge-Case Coverage Matrix (AH Rule 29)** for EVERY control found in the DOM, and tag each case with its formal technique — **BVA** (min/min−1/max/max+1/empty), **ECP** (one rep per valid+invalid partition), **Negative**, **State transition**, **Security**, **Exploratory/out-of-the-box** (undocumented behaviour found by probing, e.g. "is the qty field editable?", "is there any max cap?"). Emit a verdict per cell (Added / Fixme-gap / N/A) — never skip one silently (Lesson #7). The matrix decides WHICH cases; the Epic still decides the expected result (AH Rule 19). A cell with no Epic oracle → fixme requirement-gap subtask with the observed behaviour recorded.
*(Lesson #8 — 2026-06-29: QA asked "why no rule for these case types? how do I stop having to ask?" and "can we frame them as BVA/ECP/out-of-the-box?". Answer: a standing technique-tagged matrix walked per control, so coverage no longer depends on the QA enumerating cases.)*

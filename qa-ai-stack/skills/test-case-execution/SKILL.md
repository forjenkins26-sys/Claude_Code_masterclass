---
name: test-case-execution
description: Execute Playwright test cases with anti-hallucination verification, autonomous auto-fix, and bug detection. Accepts Epic link (runs all child tests) or single test case link. Investigates failures to distinguish test issues (auto-fixes) vs application bugs (files Jira Bug with screenshots, steps, details). Auto-filed bugs are linked as children of the parent Epic (parent field) AND linked to the test case (Blocks link) for full traceability. Captures screenshots for PASS and FAIL — organised under screenshots/{EpicKey}/{IssueKey}_{TestID}_{title}_{PASS|FAIL}.png. Updates Jira status with comment ("Working as expected" / "Not working as expected" + expected/actual result + screenshot path). Reports pass/fail/flaky/auto-fixed/blocked. ALWAYS runs in headed mode (--headed) per ANTI-HALLUCINATION Rule 17.
---

# Test Case Execution & Jira Status Update

Execute automated test cases from Jira Epic or individual test case link. Runs corresponding Playwright tests and updates Jira issue status based on results.

## Rules Applied

### Anti-Hallucination Rules (ANTI-HALLUCINATION-RULES.md)

| Rule | What it enforces here |
|---|---|
| AH-1 | Don't invent error messages, selectors, or app behavior when investigating failures |
| AH-7 | Classify failures correctly: element missing ≠ element hidden ≠ element disabled |
| AH-8 | Selector wrong → headed mode investigation BEFORE applying any fix |
| AH-9 | `count() > 0` only proves DOM existence — use `isVisible()` to confirm on-screen |
| AH-10 | `.first()` may return hidden element — verify it's the intended one |
| AH-12 | Add `// VERIFIED: headed mode [date]` comment to every selector fix applied |
| AH-13 | Verify page URLs after navigation steps — never assume redirect targets |
| AH-14 | Apply verification rules to `beforeEach`/fixtures, not just test body |
| AH-16 | Fix in code → also fix in Jira descriptions + CLAUDE.md + docs |
| AH-17 | **ALWAYS** run with `--headed` flag — no exceptions, no headless mode |
| AH-18 | Constraint tests (maxlength, pattern) must use `pressSequentially()` not `fill()` |
| AH-19 | Test failing ≠ wrong test. Test may be CORRECTLY catching a bug. Investigate before modifying assertions. |
| AH-21 | Search existing open bugs via JQL before filing — never create duplicate reports for same defect. |

### AUTO-FIX Protocol (AUTO-FIX-PROTOCOL.md) — FULL PROTOCOL

| Rule | What it enforces here |
|---|---|
| AFP-1 to 6 | Silent fix: don't ask user, don't partial-report, investigate actual state first |
| AFP-7 | Create investigation script for every failure before touching code |
| AFP-8 | Find ALL DOM matches — `.first()` may be wrong element |
| AFP-9 | Headed mode verification before applying any selector fix |
| AFP-10 | Document every rejected approach — prevents re-trying same failed fix |
| AFP-11 | Test progressively: single → related tests → full suite → 3x repeat |
| AFP-12 | New failure pattern found → add to AH rules file |
| AFP-13 | Fix ALL artifacts: code + Jira issue titles/descriptions + CLAUDE.md + comments |
| AFP-14 | Watch headed mode: redirects, custom comboboxes, SPA behavior, auth flows |
| AFP-15 | Assertions must validate outcomes, not mechanics (`toBeTruthy()` = wrong) |

**Failure classification (gates AFP vs bug report):**
- Test issue → AFP applies → fix and rerun
- Application bug → DO NOT fix test → file Jira bug → mark test Blocked

---

## Instructions

### Step 1: Parse Input

**Two modes:**

#### Mode A: Epic Link
```
/test-case-execution https://anandsoni2641.atlassian.net/browse/SCRUM-68
/test-case-execution SCRUM-68
```

User provides Epic link or key. Execute ALL child test cases under Epic.

#### Mode B: Single Test Case Link
```
/test-case-execution https://anandsoni2641.atlassian.net/browse/SCRUM-69
/test-case-execution SCRUM-69
```

User provides specific test case link or key. Execute only that test case.

**Parse input:**
- Extract Jira issue key (e.g., "SCRUM-68", "SCRUM-69")
- Detect if URL or plain key
- Extract cloud ID from URL or use default: `anandsoni2641.atlassian.net`

### Step 2: Load Required MCP Tools

```bash
ToolSearch: select:mcp__atlassian__getJiraIssue,mcp__atlassian__editJiraIssue,mcp__atlassian__searchJiraIssuesUsingJql
```

### Step 3: Fetch Test Cases from Jira

#### If Epic (Mode A):

Use JQL to find all child issues:

```
mcp__atlassian__searchJiraIssuesUsingJql({
  cloudId: "anandsoni2641.atlassian.net",
  jql: "parent = SCRUM-68 ORDER BY key ASC"
})
```

Extract all child issue keys (e.g., SCRUM-69, SCRUM-70, ..., SCRUM-84).

#### If Single Test Case (Mode B):

Use provided issue key directly.

**For each test case, fetch details:**

```
mcp__atlassian__getJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69"
})
```

Extract:
- Issue key (SCRUM-69)
- Summary (contains test ID like "TC-001")
- Current status
- Description (contains source file path)

### Step 4: Map Jira Issues to Test Specs

**Parse test ID from summary:**

Example summary: `TC-001: Verify login page DOM elements exist`
- Extract: `TC-001`

**Map to Playwright test:**

Test IDs follow pattern in source file. Extract source file from description:

Example description contains: `**Source:** [login.spec.ts:32](...)`
- Extract: `login.spec.ts`
- Extract line: `32`

**Build test selector:**

For Playwright, use test name grep:

```bash
# Run specific test by title match
npm test -- tests/ui/login.spec.ts --grep "TC-001"
```

### Step 5: Execute Tests

**For each test case:**

1. **Update Jira to "In Progress"** (indicate execution started):

```
mcp__atlassian__editJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  fields: {
    "status": {"name": "In Progress"}
  }
})
```

Note: Use transition API if direct status update fails. Check available transitions first.

2. **Run Playwright test in HEADED mode (MANDATORY per ANTI-HALLUCINATION Rule 17):**

```bash
cd "Playwright Automation Framework"
npm test -- tests/ui/login.spec.ts --grep "TC-001" --project=chromium --headed --screenshot=on --reporter=json 2>&1
```

**`--screenshot=on`** captures screenshots for BOTH pass and fail (not just failures). Screenshots saved to `test-results/{test-folder}/`.

**CRITICAL:** ALWAYS include `--headed` flag. Headed mode required for:
- Proper selector verification (Rule 17)
- Observing actual app behavior during failures
- Distinguishing test issues from application bugs
- Visual confirmation of element interactions

Capture:
- Exit code (0 = pass, non-zero = fail)
- JSON output for detailed results
- Test duration
- Error messages if failed
- Retry status (flaky detection)

3. **Parse results (ANTI-HALLUCINATION MODE):**

```javascript
{
  "suites": [{
    "specs": [{
      "title": "TC-001: Verify login page DOM elements exist",
      "ok": true,  // or false
      "tests": [{
        "results": [{
          "status": "passed",  // or "failed", "timedOut"
          "duration": 3000,
          "error": {...},  // if failed
          "retry": 0  // 0 = passed first run, >0 = flaky
        }]
      }]
    }]
  }]
}
```

**STRICT PARSING RULES (Anti-Hallucination):**

- ✅ **DO extract only from JSON:**
  - `ok`: true/false (VERIFIED source: test output)
  - `status`: exact string from output (not assumed)
  - `duration`: milliseconds (VERIFIED)
  - `error.message`: exact error text (not interpreted)
  - `retry`: number (0 = clean pass, >0 = flaky)

- ❌ **DO NOT assume:**
  - "Typical" failure reasons
  - Element visibility without verification
  - Locator correctness without inspection
  - Test is truly failed (may be flaky)

**Classify failure type (from actual error message):**

Extract actual error from `error.message`:

1. **Timeout errors:** `"Timeout 30000ms exceeded"`
   - Sub-type: element not visible / not actionable / network
2. **Selector errors:** `"element not found"` or `"locator resolved to 0 elements"`
3. **Assertion errors:** `"expect(...).toBe(...)"`
4. **Network errors:** `"net::ERR_"` or `"navigat"`

**Mark as:**
- ✅ PASS: `ok: true` AND `retry: 0`
- ⚠️ FLAKY: `ok: true` AND `retry: > 0`
- ❌ FAIL: `ok: false`

### Step 5A: Investigate Failure - Test Issue vs Application Bug

**CRITICAL:** Do NOT immediately mark as failed. Investigate FIRST to distinguish:
- **Test Issue** → Apply auto-fix protocol
- **Application Bug** → Log defect, DON'T fix test

**Triggers Investigation:**
- Test failed (`ok: false`)
- Test timeout
- Selector/element errors
- Assertion failures

**Investigation Process:**

**Step 1: Create Investigation Script**

Run in headed mode to observe actual app behavior:

```javascript
// investigate-tc-001.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.facebook.com');
  await page.waitForTimeout(2000);
  
  // Check element that failed
  const emailInput = page.locator('input[name="email"]');
  const exists = await emailInput.count() > 0;
  const visible = await emailInput.isVisible();
  const enabled = await emailInput.isEnabled();
  
  console.log('Email input:');
  console.log('  Exists:', exists);
  console.log('  Visible:', visible);
  console.log('  Enabled:', enabled);
  
  // Try manual interaction to check if APP works
  if (visible && enabled) {
    await emailInput.fill('test@example.com');
    const value = await emailInput.inputValue();
    console.log('  Manual fill works:', value === 'test@example.com');
  }
  
  await browser.close();
})();
```

Run investigation:

```bash
node investigate-tc-001.js
```

**Step 2: Classify Failure Type**

**TEST ISSUE (Fix the test):**

| Symptom | Root Cause | Action |
|---------|------------|--------|
| `exists: false` | Selector wrong (hallucinated) | Fix selector |
| `exists: true, visible: false` | Hidden element (`.first()` trap) | Fix selector to find visible one |
| `exists: true, visible: true, enabled: false` | Timing issue | Add proper wait |
| Element found but click fails | Wrong element targeted | Verify in headed mode |
| Flaky (passes on retry) | Race condition, networkidle issue | Fix wait strategy |

→ **Apply Auto-Fix Protocol (Step 5B)**

**APPLICATION BUG (Log defect):**

| Symptom | Root Cause | Action |
|---------|------------|--------|
| Element visible + enabled, but click does nothing | Button broken in app | Create bug report |
| Form validation missing/wrong | App validation bug | Create bug report |
| Error message incorrect | App message bug | Create bug report |
| Feature doesn't work as designed | App functional bug | Create bug report |
| Manual test in headed mode fails same way | Real app defect | Create bug report |

→ **Apply Bug Logging Protocol (Step 5C)**

**How to distinguish:**

1. **Test works in headed mode, fails in headless?** → Test issue (timing/rendering)
2. **Manual click in DevTools works, test click fails?** → Test issue (selector/wait)
3. **Manual click in DevTools ALSO fails?** → Application bug
4. **Feature broken for real user?** → Application bug

### Step 5B: Auto-Fix Protocol (For Test Issues Only)

**Only applies when:** Investigation confirms TEST ISSUE, not app bug.

**Auto-Fix Process (Max 3 attempts):**

**Attempt 1: Fix Root Cause**

Based on investigation, apply fix:

**Fix Type A: Selector hallucination**
- Don't invent new selector
- Inspect actual DOM via headed mode
- Use attribute-based selector (name, role, type)
- Verify .first() returns visible element

**Fix Type B: Timing issue**
- Add proper wait: `await element.waitFor({ state: 'visible' })`
- NOT workaround: `{ force: true }`

**Fix Type C: Flaky networkidle**
- Change to 'domcontentloaded' or 'load'
- NOT workaround: increase timeout

**Attempt 3: Verify Fix**

Re-run test 3 times in headed mode:

```bash
npm test -- tests/ui/login.spec.ts --grep "TC-001" --headed --repeat-each=3
```

**If all 3 pass:** Fix successful
**If any fail:** Escalate (stuck after 3 attempts)

**Document fix applied:**

```
FIX APPLIED: Changed selector from input[type="submit"] to getByRole('button').first()
REASON: Hidden submit input found instead of visible button
VERIFICATION: Passed 3/3 runs in headed mode (2026-06-10)
```

### Step 5C: Bug Logging Protocol (For Application Bugs)

**Only applies when:** Investigation confirms APPLICATION BUG, not test issue.

**CRITICAL RULE:** DO NOT modify test to make it pass. Test is correctly catching real bug.

**Bug Logging Process:**

**1. Capture Evidence**

Take screenshot of failure state:

```bash
cd "Playwright Automation Framework"
node capture-bug-screenshot.js
```

```javascript
// capture-bug-screenshot.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Reproduce bug
  await page.goto('https://www.facebook.com');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="pass"]', 'password123');
  
  // Take screenshot at failure point
  await page.screenshot({ 
    path: 'bug-screenshot-tc-001.png',
    fullPage: true 
  });
  
  // Capture console errors
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  console.log('Screenshot saved: bug-screenshot-tc-001.png');
  console.log('Console logs:', logs);
  
  await browser.close();
})();
```

**2. Extract Bug Details**

From test failure + investigation:

- **Summary:** Brief description (e.g., "Login button doesn't submit form")
- **Steps to Reproduce:**
  1. Navigate to Facebook login
  2. Enter valid email
  3. Enter valid password
  4. Click login button
- **Expected Result:** Form submits, user logged in
- **Actual Result:** Button click has no effect, no error shown
- **Environment:**
  - Browser: Chromium 131.0.6778.85
  - Viewport: 1536x864
  - Date: 2026-06-10

**3. Duplicate Bug Check (MANDATORY before creating)**

Search existing bugs — same defect may already be filed from a prior run or manual report.

```
mcp__atlassian__searchJiraIssuesUsingJql({
  cloudId: "anandsoni2641.atlassian.net",
  jql: "project = SCRUM AND issueType = Bug AND status != Done AND summary ~ \"[3-4 keywords from defect summary]\""
})
```

**Decision:**

| Result | Action |
|---|---|
| Match found (same defect, open bug) | Skip `createJiraIssue`. Use existing bug key. Go to step 4 (link test case to existing bug). |
| Match found (same defect, status = Done) | Bug was fixed but regressed. Create NEW bug. Note regression in description. |
| No match | Create new bug (step 4 below). |

**Keyword extraction rule:** Use 3–4 unique words from the defect summary. Avoid generic words ("button", "click", "error"). Use feature-specific terms (e.g., `"signupBtn handler"`, `"OTP toast missing"`, `"maxlength bypass"`).

If match found, add comment to test case:
```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  body: "🔴 Existing bug found — not filing duplicate.\n\n**Existing Bug:** [SCRUM-XXX](https://anandsoni2641.atlassian.net/browse/SCRUM-XXX)\n**Status:** [current status]\n\nTest linked to existing bug. Waiting on fix."
})
```

---

**4. Create Bug in Jira**

Use Atlassian MCP to create bug (only if no duplicate found in step 3):

```
mcp__atlassian__createJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  projectKey: "SCRUM",
  issueTypeName: "Bug",
  summary: "Login button doesn't submit form when clicked",
  description: "**Bug Details:**\nLogin button is visible and clickable but doesn't submit the form.\n\n**Steps to Reproduce:**\n1. Navigate to https://www.facebook.com\n2. Enter email: test@example.com\n3. Enter password: password123\n4. Click 'Login' button\n\n**Expected Result:**\nForm submits, authentication request sent\n\n**Actual Result:**\nButton click has no effect. No error message. No network request.\n\n**Environment:**\n- Browser: Chromium 131.0.6778.85\n- Viewport: 1536x864\n- Detected by: Test case TC-001 (SCRUM-69)\n- Date: 2026-06-10\n\n**Attachments:**\nScreenshot: bug-screenshot-tc-001.png (manual attach required)\n\n**Verification:**\nManually tested in headed mode - confirmed bug exists in actual app.",
  additional_fields: {
    "priority": {"name": "High"},
    "labels": ["automated-test-detected", "login", "blocker"],
    "parent": {"key": "SCRUM-68"}
  }
})
```

**Important:** Replace `"SCRUM-68"` with the actual Epic key being executed. The Epic key is known at execution time (it's the input to the skill). This links the bug as a child of the Epic so it appears in Epic reports and PM/QA dashboards — industry standard for bug traceability.

Capture bug key (e.g., SCRUM-85).

**5. Link Test Case to Bug**

Create issue link:

```
mcp__atlassian__createIssueLink({
  cloudId: "anandsoni2641.atlassian.net",
  type: "Blocks",
  inwardIssue: "SCRUM-85",  // Bug blocks test
  outwardIssue: "SCRUM-69"  // Test case
})
```

**6. Update Test Case Status to "In Review" (proxy for blocked)**

⚠️ **SCRUM project has NO "Blocked" status.** Available transitions: To Do (11), In Progress (21), In Review (31), Done (41).
Use **In Review (id=31)** as proxy — means "test written, waiting on app fix".

```
mcp__atlassian__transitionJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  transitionId: "31"
})
```

If project differs from SCRUM, first fetch transitions to confirm IDs:
```
mcp__atlassian__getTransitionsForJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69"
})
```

Add comment:

```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  body: "🔴 Test blocked by APPLICATION BUG\n\n**Bug Filed:** [SCRUM-85](https://anandsoni2641.atlassian.net/browse/SCRUM-85)\n\n**Verified Facts:**\n- Test is CORRECT (catching real bug)\n- Application behavior is BROKEN\n- Manual verification: confirmed bug exists\n- Investigation: headed mode shows button click has no effect\n\n**DO NOT modify test to make it pass.**\n\nTest will remain blocked until SCRUM-85 is fixed.\n\n**Source:** Investigation script + headed mode verification (2026-06-10)"
})
```

**7. Do NOT Auto-Fix**

- ❌ Don't change selector
- ❌ Don't add workarounds (force: true)
- ❌ Don't skip this test
- ❌ Don't modify assertions
- ✅ Leave test as-is (it's correct)
- ✅ Bug report filed
- ✅ Test marked "Blocked"

### Step 5D: Screenshot Capture, Organise & Jira Attachment

**Run after EVERY test (pass or fail) before updating Jira.**

#### 1. Find screenshot file

After test run with `--screenshot=on`:

```
# Pass screenshot — Playwright saves here:
test-results/{sanitized-test-name}/test-1.png

# Fail screenshot — Playwright saves here:
test-results/{sanitized-test-name}/test-failed-1.png
```

Find latest screenshot:
```powershell
Get-ChildItem "test-results" -Recurse -Filter "*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
```

#### 2. Organise into Epic/Issue folder with proper naming

**Folder structure:**
```
Playwright Automation Framework/
  screenshots/
    {EpicKey}/
      {IssueKey}_{TestID}_{kebab-title}_{PASS|FAIL}.png
```

**Naming convention:**
- `{EpicKey}` — parent Epic (e.g., `SCRUM-121`)
- `{IssueKey}` — Jira issue key for this test (e.g., `SCRUM-122`)
- `{TestID}` — test ID from summary (e.g., `BL-001`, `TC-001`)
- `{kebab-title}` — test title slugified: lowercase, spaces→hyphens, special chars removed, max 60 chars
- `{PASS|FAIL}` — result from JSON `ok: true/false`

**Example filenames:**
```
screenshots/SCRUM-121/SCRUM-122_BL-001_verify-page-loads-and-all-elements-are-visible_PASS.png
screenshots/SCRUM-121/SCRUM-131_BL-010_verify-create-new-account-button-navigates_FAIL.png
screenshots/SCRUM-68/SCRUM-69_TC-001_verify-login-page-dom-elements-exist_PASS.png
```

**PowerShell to copy + rename screenshot:**
```powershell
# Build values from current test context
$epicKey    = "SCRUM-121"
$issueKey   = "SCRUM-122"
$testId     = "BL-001"
$titleRaw   = "Verify page loads and all elements are visible"
$result     = "PASS"   # or "FAIL"

# Slugify title: lowercase, spaces→hyphens, strip special chars, max 60 chars
$slug = ($titleRaw.ToLower() -replace '[^a-z0-9\s-]','' -replace '\s+','-').Substring(0, [Math]::Min(60, $titleRaw.Length))

# Destination
$destDir  = "screenshots\$epicKey"
$destFile = "${issueKey}_${testId}_${slug}_${result}.png"
$destPath = Join-Path $destDir $destFile

# Source — latest screenshot in test-results
$srcPath = Get-ChildItem "test-results" -Recurse -Filter "*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName

# Copy
New-Item -ItemType Directory -Force $destDir | Out-Null
Copy-Item $srcPath $destPath -Force
Write-Output "Screenshot saved: $destPath"
```

**If no screenshot found in test-results:** Skip silently — do NOT block Jira update.

#### 3. Attempt Jira attachment via MCP fetch

Try attaching the organised screenshot to Jira issue:

```
mcp__atlassian__fetch({
  url: "https://api.atlassian.com/ex/jira/e74af77d-c1bf-4809-aa7e-20b6020a077b/rest/api/3/issue/{issueKey}/attachments",
  method: "POST",
  headers: { "X-Atlassian-Token": "no-check" }
  // binary multipart — works if MCP fetch supports it
})
```

**If attachment upload fails (MCP limitation — no binary multipart):** Embed organised path in Jira comment (Step 6). Do NOT block Jira status update — attachment is best-effort.

#### 4. Extract expected result from Jira description

Before running test, parse `**Expected Result:**` from Jira issue description (fetched in Step 3). Store as `expectedResult` for comment templates in Step 6.

### Step 6: Update Jira Status (AFTER Investigation + Auto-Fix/Bug Logging)

**IMPORTANT:** Only update Jira AFTER:
- Investigation determines test issue vs app bug
- Auto-fix protocol completes (for test issues)
- Bug logging completes (for app bugs)

**If test passed (first run, no retry):**

```
mcp__atlassian__editJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  fields: {
    "status": {"name": "Done"}
  }
})
```

Add comment documenting verification with screenshot:

```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  body: "✅ **Working as expected**\n\n**Expected Result:** [paste expectedResult from Jira description]\n**Actual Result:** Test passed — behaviour matches expected\n\n**Execution Details:**\n- Duration: 3.0s\n- Status: passed (retry: 0)\n- Browser: chromium\n- Date: 2026-06-12\n\n**Screenshot:** [attached above — or local path: screenshots/{epicKey}/{issueKey}_{testId}_{slug}_PASS.png]\n\n**Source:** Playwright test output (JSON) + headed mode"
})
```

**If test flaky (passed after retry):**

Mark as "Done" but add ANTI-HALLUCINATION warning:

```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-77",
  body: "⚠️ **Working as expected (FLAKY — passed on retry)**\n\n**Expected Result:** [paste expectedResult from Jira description]\n**Actual Result:** Passed on retry — first run failed (non-deterministic)\n\n**Verified Facts:**\n- First run: FAILED (timeout 30000ms)\n- Retry: PASSED\n- Root cause: networkidle wait on background requests\n- Date: 2026-06-12\n\n**VERIFICATION REQUIRED:**\nFlaky test indicates non-deterministic behavior. Consider:\n1. Change waitForLoadState('networkidle') to 'domcontentloaded'\n2. Or add explicit element.waitFor() instead\n\n**Screenshot:** [attached above — or local path: screenshots/{epicKey}/{issueKey}_{testId}_{slug}_PASS.png]\n\n**Source:** Playwright retry mechanism"
})
```

**If test failed AFTER auto-fix attempts (stuck):**

Keep status "In Progress". Add detailed comment:

```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-82",
  body: "❌ **Not working as expected — test FAILED (auto-fix attempted, stuck)**\n\n**Expected Result:** [paste expectedResult from Jira description]\n**Actual Result:** [exact error message from test JSON output]\n\n**Verified Facts (from test output):**\n- Error: TimeoutError: locator.click: Timeout 30000ms exceeded\n- Duration: 30000ms\n- Element selector: input[type=\"submit\"]\n- Date: 2026-06-12\n\n**Auto-Fix Investigation:**\n1. ✅ Investigated: Element exists in DOM\n2. ✅ Found: Element is HIDDEN (display:none)\n3. ✅ Fixed: Changed selector to getByRole('button').first()\n4. ❌ Result: Still failing (different error)\n\n**Stuck after 3 attempts:**\nAttempt 1: Selector change → still timeout\nAttempt 2: Add waitFor visible → still timeout\nAttempt 3: Headed mode verification → button visible but unresponsive\n\n**Need:** Manual investigation required\n\n**Screenshot:** [attached above — or local path: screenshots/{epicKey}/{issueKey}_{testId}_{slug}_FAIL.png]\n\n**Source:** Auto-fix protocol output"
})
```

**If test failed but auto-fix SUCCEEDED:**

Mark as "Done" with fix documentation:

```
mcp__atlassian__addCommentToJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  body: "✅ **Working as expected (AUTO-FIXED)**\n\n**Expected Result:** [paste expectedResult from Jira description]\n**Actual Result:** Test passed after fix — behaviour now matches expected\n\n**Initial Failure:**\n- Error: element not visible\n- Selector: input[type=\"submit\"]\n\n**Auto-Fix Applied:**\n- **Root Cause:** Hidden submit input found instead of visible button\n- **Fix:** Changed selector to getByRole('button').first()\n- **Verification:** VERIFIED VISIBLE in headed mode (2026-06-12)\n- **Test Result:** Passed 3/3 runs after fix\n\n**Code Updated:**\n- File: LoginPage.ts:37\n- Old: `page.locator('input[type=\"submit\"]')`\n- New: `page.getByRole('button').first()`\n\n**Screenshot (post-fix):** [attached above — or local path: screenshots-archive/{timestamp}/{test-folder}/test-1.png]\n\n**Source:** Auto-fix protocol + headed mode verification"
})
```

**If application bug found (test blocked):**

Status already updated to "In Review" in Step 5C. No further update needed.

Test case now shows:
- Status: "In Review" (proxy for blocked — SCRUM has no Blocked status)
- Linked to bug issue
- Comment explains why blocked
- Test code unchanged (correct)

### Step 7: Report Summary

**Output format:**

```markdown
✅ Executed [N] test cases from [Epic/Test Case]

## Results

| Test ID | Jira Issue | Status | Duration | Jira Status | Notes |
|---------|------------|--------|----------|-------------|-------|
| TC-001  | SCRUM-69   | ✅ Pass | 3.0s     | Done        | Clean pass |
| TC-002  | SCRUM-70   | ✅ Pass | 2.8s     | Done        | Clean pass |
| TC-008  | SCRUM-75   | 🔧 Auto-Fixed | 5.2s | Done | Selector fixed |
| TC-010  | SCRUM-77   | ⚠️ Flaky | 11.6s   | Done | Networkidle timeout |
| TC-012  | SCRUM-79   | 🔴 Blocked | 30.0s | In Review | App bug: [SCRUM-85] |
| TC-015  | SCRUM-82   | ❌ Fail | 30.0s    | In Progress | Stuck after 3 attempts |

## Session Score: {score}% · {PASS|FAIL}  ({passed}/{total} tests)

## Summary
- **Total:** N tests
- **Passed:** X (clean)
- **Auto-Fixed:** Y (test issues fixed)
- **Flaky:** Z (needs attention)
- **Blocked:** W (app bugs found)
- **Failed:** V (stuck, needs manual fix)
- **Network:** {requests} API calls intercepted · {assertions} assertions

## Auto-Fixed Tests

### SCRUM-75: TC-008 - Invalid email format
**Original Issue:** Selector hallucination (hidden submit input)
**Fix Applied:** Changed to getByRole('button').first()
**Verification:** Passed 3/3 runs headed mode
**Code Updated:** LoginPage.ts:37

## Blocked Tests (Application Bugs Found)

### SCRUM-79: TC-012 - Login with wrong credentials
**Bug Filed:** [SCRUM-85](https://anandsoni2641.atlassian.net/browse/SCRUM-85)
**Bug Summary:** Login button doesn't submit form when clicked
**Evidence:** Screenshot captured, manual verification confirms bug
**Test Status:** CORRECT (not modified)
**Action Required:** Fix SCRUM-85, then re-run test

## Failed Tests (Stuck After Auto-Fix)

### SCRUM-82: TC-015 - SQL injection attempt
**Error:** TimeoutError: locator.click: Timeout 30000ms exceeded
**Investigation:** Element exists, visible, enabled
**Fix Attempts:**
  1. Selector change → still timeout
  2. Wait for visible → still timeout
  3. Headed mode → button unresponsive
**Stuck after 3 attempts**
**Action Required:** Manual investigation needed
**File:** [login.spec.ts:234](...)
```

## Execution Strategy

**Sequential execution:**
- Execute one test at a time
- Update Jira after each test completes
- Continue even if one test fails

**Why sequential:**
- Jira API rate limits
- Clear progress tracking
- Easier error handling

**Progress updates:**

For long runs (Epic with many tests), show progress:

```
Executing test 1/16: TC-001 (SCRUM-69)...
✅ TC-001 passed (3.0s) → Jira updated to Done

Executing test 2/16: TC-002 (SCRUM-70)...
✅ TC-002 passed (2.8s) → Jira updated to Done

...
```

## Jira Status Transitions

**Important:** Jira workflow may require transitions, not direct status updates.

If direct status update fails, use transition API:

1. **Get available transitions:**

```
mcp__atlassian__getTransitionsForJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69"
})
```

Returns: `[{id: "11", name: "Start Progress"}, {id: "21", name: "Done"}]`

2. **Apply transition:**

```
mcp__atlassian__transitionJiraIssue({
  cloudId: "anandsoni2641.atlassian.net",
  issueIdOrKey: "SCRUM-69",
  transitionId: "21"  // "Done" transition
})
```

**Fallback strategy:**

If status update fails:
1. Try transition API
2. If no "Done" transition available, add comment instead
3. Report which issues couldn't be updated

## Test Spec Detection

**Automatic detection:**

If test case description doesn't contain source file, use heuristics:

1. **Check project context:**
   - Epic summary mentions "Facebook Login" → `tests/ui/login.spec.ts`
   - Look for CLAUDE.md or README mentions

2. **Search for test ID in codebase:**

```bash
grep -r "TC-001" "Playwright Automation Framework/tests/"
```

3. **Default to known patterns:**
   - Login tests → `tests/ui/login.spec.ts`
   - API tests → `tests/api/*.spec.ts`

## Error Handling

**Common errors:**

1. **Test spec not found:**
   - Report: "Cannot find test file for TC-XXX (SCRUM-YY)"
   - Skip test, continue with next
   - Mark Jira with comment: "Test spec not found"

2. **Test execution timeout:**
   - Capture timeout error
   - Update Jira to "In Progress" with failure comment
   - Continue with next test

3. **Jira API failure:**
   - Retry once
   - If still fails, log error and continue
   - Report all Jira update failures at end

4. **Test not found by grep:**
   - Try running entire spec file
   - Parse results to find matching test
   - If still not found, report error

## Step 7A: Composite Session Score (NexQA-style)

After all TC results collected, calculate session-level score:

```javascript
const passed  = results.filter(r => r.ok).length;
const score   = Math.round((passed / results.length) * 100);
const verdict = score >= 70 ? 'PASS ✅' : 'FAIL ❌';
```

Add to summary header:
```
## Session Score: 87% · PASS ✅  (38/42 passed)
```

Threshold: ≥70% = PASS. Below 70% = FAIL.

## Step 7A2: Network Interception — API Validation Alongside UI

Capture Playwright network calls during each test:

```javascript
const networkLog = [];
page.on('request',  req  => networkLog.push({ url: req.url(), method: req.method() }));
page.on('response', resp => {
  const entry = networkLog.find(r => r.url === resp.url());
  if (entry) entry.status = resp.status();
});
```

POST to QA Buddy for validation:
```
POST http://localhost:3003/api/network/intercept
{ requests: networkLog, config: { ... } }
```

Report in summary:
```
🔌 Network: 115 requests · 247 assertions · Score: 94%
```

## BLAST Progress Logging (Step 7B)

After reporting summary to user, append run log to `progress.md` at workspace root (BLAST protocol — persistent run memory across sessions).

**Create or append to `C:\ClaudeCodeMasterclass\progress.md`:**

```markdown
## {YYYY-MM-DD HH:MM} — /test-case-execution {EPIC-KEY or ISSUE-KEY}

**Epic/Issue:** {key} — {summary}
**Total Tests:** {N}
**Results:** {X} Pass | {Y} Auto-Fixed | {Z} Flaky | {W} Blocked | {V} Failed
**Duration:** {total time}

**Auto-Fixed:**
- {ISSUE-KEY} {TEST-ID}: {what was fixed}

**Blocked (App Bugs):**
- {ISSUE-KEY} {TEST-ID}: Bug filed as {BUG-KEY} — {bug summary}

**Failed (Stuck):**
- {ISSUE-KEY} {TEST-ID}: {error summary} — needs manual investigation

**Screenshots:** `Playwright Automation Framework/screenshots/{EpicKey}/`
```

If `progress.md` doesn't exist → create it with header:
```markdown
# Execution Progress Log
*Auto-updated by /test-case-execution and /bug-triage — BLAST protocol*

---
```

**Do NOT overwrite** — always append. Each run adds one dated entry.

## Quality Gates

Before finishing:
- ✅ All test cases executed (or failure reason reported)
- ✅ Jira status updated for each test (or comment added if update failed)
- ✅ Summary table shows all results
- ✅ Failed tests have error details
- ✅ Flaky tests noted
- ✅ Epic link provided for easy access
- ✅ Run appended to `progress.md`

## Usage Examples

**Execute all tests in Epic:**
```
/test-case-execution SCRUM-68
/test-case-execution https://anandsoni2641.atlassian.net/browse/SCRUM-68
```

**Execute single test case:**
```
/test-case-execution SCRUM-69
/test-case-execution https://anandsoni2641.atlassian.net/browse/SCRUM-77
```

**Execute with specific project:**
```
/test-case-execution SCRUM-68 chromium
/test-case-execution SCRUM-69 firefox
```

## Anti-patterns (With Anti-Hallucination + Auto-Fix Protocols)

❌ **Don't (Anti-Hallucination Violations):**
- Assume test failure reason without reading exact error message
- Invent explanations for why test failed
- Assume element visibility without verification
- Trust `.first()` returns visible element without checking
- Skip verification in headed mode for suspected selector issues
- Mark test as "failed" without investigation
- Use workarounds (`force: true`, increased timeouts) instead of fixing root cause

❌ **Don't (CRITICAL - Masking Application Bugs):**
- "Fix" test when app has real bug
- Modify test to make it pass when app is broken
- Skip investigation to distinguish test issue vs app bug
- Apply auto-fix blindly without verifying app works correctly
- Change assertions to match broken app behavior
- Mark test "Done" when underlying app defect exists
- Continue without filing bug when app bug detected

❌ **Don't (Auto-Fix Protocol Violations):**
- Give up after first failure (max 3 attempts required)
- Ask user before attempting auto-fix (fix autonomously first)
- Apply partial fixes (must complete before reporting)
- Skip verification step (must test fix 3x minimum)
- Leave test marked "failed" if fixable
- Run all tests in parallel (makes auto-fix impossible)

❌ **Don't (Execution Issues):**
- Skip Jira status update on failure (defeats purpose)
- Fail entire execution if one test fails (continue with rest)
- Update all statuses to "Done" before running tests (premature)
- Ignore flaky tests (mark them explicitly with investigation)
- Use hardcoded file paths (detect from Jira or project structure)

✅ **Do (Anti-Hallucination Compliance):**
- Extract ONLY from test JSON output (no assumptions)
- Label inferences explicitly: "Inference (low confidence)"
- Verify element state: exists ≠ visible ≠ actionable
- Run headed mode investigation for selector failures
- Document verification date and method
- Cite source for all assertions (test output, investigation script, headed mode)
- Distinguish clean pass vs flaky pass vs failed

✅ **Do (Bug Detection & Logging):**
- Investigate EVERY failure to distinguish test issue vs app bug
- Run manual verification in headed mode (click button yourself)
- If app broken for real user → file bug, don't fix test
- Capture screenshot + evidence before filing bug
- Create Jira Bug with proper details (summary, steps, expected/actual, environment)
- Link test case to bug (Blocks relationship)
- Mark test "Blocked" (not "Failed") when app bug found
- Leave test code unchanged when it's correctly catching real bug
- Document in Jira comment: "Test is CORRECT, app is BROKEN"

✅ **Do (Auto-Fix Protocol Compliance):**
- Investigate failure autonomously (create investigation script)
- Fix root cause, not symptom
- Verify fix 3x in headed mode
- Document what didn't work and why
- Test progressively: single → related → all
- Update anti-hallucination rules if new pattern discovered
- Only escalate after 3 failed fix attempts

✅ **Do (Execution Best Practices):**
- Execute sequentially with progress updates
- Update Jira AFTER auto-fix attempts complete
- Continue execution even if one test stuck after auto-fix
- Mark tests "In Progress" before execution
- Note flaky tests with detailed investigation comment
- Auto-detect test specs from Jira description
- Handle Jira transition workflow properly
- Report summary with pass/fail/flaky/auto-fixed counts

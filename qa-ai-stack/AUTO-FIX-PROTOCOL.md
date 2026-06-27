# Auto-Fix Protocol

**Author:** Anand Soni  
**Updated:** 2026-06-09

---

## Objective

When error/hallucination detected, fix autonomously. Report ONLY when 100% fixed OR stuck after 3 attempts.

---

## TRIGGERS

Auto-fix activates when:
- Test/build/script fails
- User says "fix on your own" or "why failing"
- Anti-hallucination violation detected
- Assumption proved wrong

**Two modes:**

**Silent Mode (you detect error):**
- Test fails
- Build breaks
- Script errors
- You notice assumption wrong
→ Fix silently, report when done

**Acknowledge Mode (user reports error):**
- User points out mistake ("why wrong URL?")
- User questions assumption ("this doesn't match")
- User catches hallucination
→ Acknowledge error, explain root cause, THEN fix (user already knows about issue)

---

## STRICT RULES (MANDATORY)

1. **DO NOT ask user until fixed or stuck** - Investigate and fix silently (UNLESS user already reported the error - then acknowledge first)
2. **DO NOT report partial fixes** - Finish completely before reporting
3. **DO NOT apply workarounds** - Fix root cause, not symptom
4. **DO NOT skip verification** - Test fix 3x minimum
5. **DO NOT give up after 1 attempt** - Iterate max 3x before escalating
6. **DO investigate actual state** - Inspect reality, not assumptions

**Fix-Specific Rules (from real experience):**

7. **Run ai:rca BEFORE investigation script** - Agent reads `test-results/results.json`, classifies failure (LOCATOR / TEST / PRODUCT_BUG / ENV / FLAKY) with confidence score in seconds. Only write investigation script AFTER RCA says LOCATOR or TEST.
```bash
cd "Playwright Automation Framework"
npm run ai:rca        # classify failure
npm run ai:heal       # if LOCATOR → auto-patch POM
npm run ai:flaky      # if FLAKY → confirm + tag
npm run ai:triage     # all 3 + Jira draft
```

7a. **Create investigation script** - Only after RCA verdict = LOCATOR/TEST. Check actual state (exists vs visible vs enabled)
8. **Find ALL matches** - .first() may be wrong one. Check all, pick right one
9. **Verify in headed mode** - Before applying fix, confirm it targets correct element
10. **Document rejected approaches** - Note what didn't work and why
11. **Test progressively** - Single test → Related → All → Repeat 3x
12. **Update anti-hallucination rules** - If new pattern, add prevention rule
13. **Fix ALL artifacts AND semantics** - Code fix alone incomplete. When hallucination found:
   - Fix selectors (code)
   - Rename misleading variables (`searchButton` → `continueButton` when actual text is "Continue")
   - Rename methods (`clickSearch()` → `clickContinue()`)
   - Update all test files using renamed properties
   - Update Jira test case titles/descriptions to match actual UI
   - Update docs, README, comments
   - Example: Facebook recovery - hallucinated "Search"/"Cancel" buttons, actually "Continue"/"Back" → renamed 4 properties + 2 methods + 15 test references + test titles

14. **Use available tools for investigation** - URL unverified? WebFetch it. Selector wrong? Headed mode + DOM inspection. API unclear? Test endpoint. Don't throw "verify manually" errors - investigate autonomously first

   **Extended (2026-06-11 Facebook registration tests):**
   - Navigation failing repeatedly? Watch headed mode - see actual redirects (e.g., `/reg` → login page)
   - Form elements not found? Investigation script showing ALL attributes (`name`, `role`, `aria-label`, `id`)
   - Non-semantic apps (Facebook, SPAs)? Expect `name="null"`, dynamic IDs - use label-based/role-based selectors
   - Multiple tests failing same way? Fix page object helper methods, not individual tests (1 `fillForm()` fix > 10 test fixes)
   - Dropdown not working with `.selectOption()`? Check if it's `<select>` or custom combobox first

15. **Test validation must check actual outcomes, not mechanics**
   - ❌ BAD: `expect(url).toBeTruthy()` - only validates page didn't crash
   - ❌ BAD: `expect(button).toBeVisible()` then assume click succeeded
   - ✅ GOOD: `expect(confirmationHeading).toBeVisible()` - validates expected result appeared
   - ✅ GOOD: Check for BOTH success AND error states - don't assume happy path
   - ✅ GOOD: After form submit, verify what actually happened (success page OR error message)
   
   **Example (2026-06-11):**
   ```typescript
   // ❌ BAD - only checks mechanics
   await form.fill(data);
   await submitButton.click();
   expect(page.url()).toBeTruthy(); // Just checks URL exists
   
   // ✅ GOOD - validates actual outcome
   await form.fill(data);
   await submitButton.click();
   const success = await page.getByText('Confirmation code').isVisible();
   if (success) {
     expect(confirmationHeading).toBeVisible();
   } else {
     // Validate error state instead
     expect(errorMessage).toBeVisible();
   }
   ```
   
   **Error handling validation (2026-06-11 REG-008):**
   - ❌ BAD: Only check form still visible after submit (just checks didn't crash)
   - ✅ GOOD: Check error message appears with expected text
   - ✅ GOOD: Check field highlighted/has error state (aria-invalid, error class)
   
   ```typescript
   // ❌ BAD - mechanics only
   await submitButton.click();
   expect(formInput).toBeVisible(); // Just checks didn't crash
   
   // ✅ GOOD - validates error handling
   await submitButton.click();
   expect(formInput).toBeVisible(); // Form stayed (not submitted)
   expect(page.getByText("What's your first name?")).toBeVisible(); // Error shown
   expect(formInput).toHaveAttribute('aria-invalid', 'true'); // Field marked invalid
   ```

16. **Surgical fixes only (karpathy-guidelines)** - The fix must touch ONLY what the failure requires. This is the counterweight to Rule 13: Rule 13 says "fix ALL artifacts the change makes inconsistent" — Rule 16 says "don't change anything the failure does NOT touch."
   - ❌ Don't "improve" adjacent locators, reformat the file, or refactor unrelated methods while you're in there
   - ❌ Don't add speculative waits, defensive code for impossible states, or config nobody asked for
   - ❌ Don't rewrite working assertions to your preferred style
   - ✅ Every changed line traces directly to the failure being fixed
   - ✅ Match existing file style even if you'd write it differently
   - ✅ Noticed unrelated dead code / a second bug? Mention it in the report — don't fix it inline
   - **Test:** if a reviewer asked "why did this line change?", every answer is "because test X was failing." If any answer is "while I was there…" — revert that line.
   - *(Skill: `karpathy-guidelines`. Rule 13 = consistency of YOUR change's blast radius; Rule 16 = minimality of the change itself. Both apply together.)*

---

## PROCESS YOU MUST FOLLOW

**Step 1:** DETECT - Extract what/where/why failed. Classify root cause.

**Step 2:** INVESTIGATE - Run domain-specific checks. Inspect actual state.
   - **Run RCA agent FIRST:** `npm run ai:rca` → get verdict before any manual investigation
   - If `PRODUCT_BUG` → skip to Step 5C (bug filing). Do NOT investigate or fix test.
   - If `LOCATOR/TEST` → continue investigation below
   - If `FLAKY` → `npm run ai:flaky` → confirm → add `@flaky` → skip fix
   - **Failure screenshots:** Check `screenshots-archive/{timestamp}/` — NOT `test-results/` (cleared every run). `globalSetup` archives before each run. Latest archive = most recent failure evidence.

**Step 3:** FIX - Apply fix based on investigation. Document why it works.

**Step 4:** VERIFY - Test fix (single → related → all → 3x repeat)

**Step 5:** REPORT or ESCALATE - Success if 100% pass. Escalate if stuck after 3 attempts.

---

## ITERATION RULES

- Max 3 fix attempts
- Between attempts: different approach, different root cause
- After attempt 3 fails: ESCALATE with details

---

## ESCALATION CRITERIA

**Only escalate when:**
- Stuck after 3 attempts
- Need user preference (ambiguous)
- Risky change (might break other things)
- External dependency issue
- Design fundamentally wrong

**Don't escalate:** First failure | Can verify assumption | Clear fix available

---

## OUTPUT FORMAT

**Success (all fixed):**
```
✅ Fixed autonomously
Root Cause: [what hallucinated/wrong]
Fix: [what changed]
Verification: [X/X tests pass, Y runs]
```

**Escalate (stuck):**
```
❌ Stuck after 3 attempts
Problem: [specific issue]
Tried: [3 approaches + results]
Need: [user input required]
```

---

**If investigation inconclusive after 3 attempts, escalate. Don't waste time guessing.**

**Usage:** Apply this protocol BEFORE asking user when error detected.

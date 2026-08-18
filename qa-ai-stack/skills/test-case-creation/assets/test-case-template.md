# Jira Test Case Template

## Standard Jira Test Case Columns

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Test ID | Unique identifier for test case | Yes | TC-001 |
| Summary | Brief description of what's being tested | Yes | Verify login with valid credentials |
| Type | Test case type | Yes | Functional, Regression, Smoke, etc. |
| Priority | Test priority level | Yes | High, Medium, Low |
| Source | Requirement traceability — Epic key + AC line number | Yes | `Epic SCRUM-48 AC line 3` |
| Preconditions | Setup required before test | No | User account exists, App is running |
| Test Steps | Numbered steps to execute | Yes | 1. Navigate to login<br>2. Enter username<br>3. Click Login |
| Expected Result | What should happen — quote exact Epic text | Yes | User logged in successfully, dashboard visible |
| Test Data | Input data used | No | Username: test@example.com<br>Password: Test@123 |
| Status | Current test status | No | Pass, Fail, Blocked, Not Run |

## Source Column Rules

**MANDATORY — every test case must have Source populated.**

| Source Value | When to Use |
|---|---|
| `Epic SCRUM-XX AC line N` | Expected result traced to specific Epic acceptance criteria line |
| `Epic SCRUM-XX requirement` | Expected result from Epic description (no numbered AC list) |
| `UI Observed` | Mode B only — no Epic provided, assertion inferred from DOM |
| `Security Standard` | SQL injection / XSS — applies regardless of mode |

**Examples:**

✅ CORRECT: `Epic SCRUM-121 AC line 3`
— Means: this assertion comes from line 3 of SCRUM-121's acceptance criteria

❌ WRONG: `Epic SCRUM-121`
— Not traceable to specific requirement

❌ WRONG: `UI` or `Page`
— Too vague, not traceable

## Markdown Table Format

```markdown
| Test ID | Summary | Type | Priority | Source | Preconditions | Test Steps | Expected Result | Test Data |
|---------|---------|------|----------|--------|---------------|------------|-----------------|-----------|
| TC-001 | Login with valid credentials | Functional | High | Epic SCRUM-48 AC line 1 | User registered | 1. Open app<br>2. Enter credentials<br>3. Click Login | Dashboard shown | user@test.com / Pass@123 |
```

## Jira Description Template (T — Tone)

Jira descriptions MUST follow this exact structure. No prose. No filler.

```
**Source:** Epic SCRUM-XX AC line N

**Preconditions:**
- [Condition 1]
- [Condition 2]

**Test Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[Exact text from Epic requirement — quoted if possible]

**Test Data:**
[Field]: [Value] | [Field]: [Value]
```

## Test Scenario Coverage

**Valid Scenarios (Happy Path):**
- Primary user flows (assertions from Epic requirements)
- Expected inputs
- Standard use cases

**Invalid Scenarios (Negative Testing):**
- Invalid inputs (wrong format, out of range)
- Missing required fields — error text from Epic, NOT UI
- Boundary conditions — use `pressSequentially()` not `fill()` (AH Rule 18)
- Security violations (SQL injection, XSS)
- Authentication/authorization failures

**Edge Cases:**
- Minimum/maximum values
- Empty states
- Special characters
- Concurrent operations
- Network failures
- Timeout scenarios

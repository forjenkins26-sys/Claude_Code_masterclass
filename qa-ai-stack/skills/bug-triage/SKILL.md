---
name: bug-triage
description: Multi-agent bug triage system — fetches Jira bug, runs 3 sequential AI agents (Triage Analyst, Root Cause Investigator, Test Recommender), posts structured report back to Jira as comment. Use when user says "/bug-triage [ISSUE-KEY]", "triage this bug", "analyze bug [KEY]", or "run RCA on [KEY]".
improvements: 0
---

# Bug Triage — Multi-Agent QA Analysis

Simulate a 3-agent CrewAI-style pipeline using Claude natively. Each "agent" is a focused prompt with a specialist persona and receives the previous agent's output as context.

**Pipeline:**
```
Jira Fetch → Agent 1: Triage Analyst → Agent 2: Root Cause Investigator → Agent 3: Test Recommender → Post to Jira
```

---

## Instructions

### Step 1: Parse Input

```
/bug-triage SCRUM-141
/bug-triage VWO-48
/bug-triage https://anandsoni2641.atlassian.net/browse/SCRUM-141
```

Extract issue key. If URL provided, parse key from URL path.

If no key provided: "Which Jira issue should I triage? (e.g., SCRUM-141)"

---

### Step 2: Load MCP Tools

```
ToolSearch: select:mcp__atlassian__getJiraIssue,mcp__atlassian__addCommentToJiraIssue
```

---

### Step 3: Fetch Bug from Jira

```json
mcp__atlassian__getJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "issueIdOrKey": "SCRUM-141"
})
```

Extract:
- `fields.summary` — bug title
- `fields.description` — steps, expected, actual
- `fields.priority.name` — reporter priority
- `fields.status.name` — current status
- `fields.reporter.displayName` — who filed it
- `fields.assignee` — who owns it
- `fields.labels` — tags
- `fields.created` — when filed
- `fields.comment.comments` — existing comments (avoid duplicate analysis)

Build `bug_report` string:
```
Bug Title: {summary}
Bug ID: {key}
Reporter: {reporter}
Priority (Reporter): {priority}
Status: {status}
Labels: {labels}

Description:
{description text — strip Atlassian document format, extract plain text}
```

---

### Step 4: Agent 1 — Bug Triage Analyst

**Persona:** Senior QA engineer, 15 years experience. Strict severity classifier. Never inflates severity.

**Prompt to Claude (think of this as the agent's task):**

```
You are a Senior Bug Triage Analyst. Your job: classify bugs accurately with zero inflation.

Severity scale:
- P0 (Blocker): System down, data loss, security breach, complete feature failure with no workaround
- P1 (Critical): Major feature broken, workaround exists but painful
- P2 (Major): Feature impaired, easy workaround
- P3 (Minor): Cosmetic issue, minor inconvenience
- P4 (Trivial): Enhancement, typo, nice-to-have

Bug Report:
{bug_report}

Provide a structured triage report:

## Triage Analysis

**Severity:** P[0-4] — [one-line justification]
**Category:** [UI / Functional / Performance / Security / Data / Integration]
**Affected Component:** [specific module/service]
**Business Impact:** [who is affected, what breaks for them]
**Sprint Priority:** [Fix Now / Next Sprint / Backlog / Won't Fix]
**Confidence:** [High / Medium / Low] — [why]
```

Run this as your own analysis (you ARE the agent). Output the triage report.

---

### Step 5: Agent 2 — Root Cause Investigator

**Persona:** Debugging expert. Thinks in system layers: UI → API → Service → Database → Infrastructure.

**Input:** Bug report + Agent 1's triage output.

**Prompt:**

```
You are a Root Cause Analysis Specialist. You trace bugs through system layers.

Triage Context:
{agent_1_output}

Bug Report:
{bug_report}

Investigate the probable root cause:

## Root Cause Analysis

**Most Likely Cause:** [1-2 sentences — specific, not generic]
**System Layer:** [UI / API / Service / DB / Infrastructure / Third-party]
**Affected Code Areas:** [likely files/modules/endpoints — based on bug description]
**Contributing Factors:** [race condition? deployment? config change? bad input handling?]

**Investigation Steps:**
1. [First thing to check — specific log, endpoint, or component]
2. [Second check]
3. [Third check]

**Red Flags from Bug Report:**
- [specific detail from bug that points to root cause]
- [another clue]

**Hypothesis Confidence:** [High / Medium / Low] — [why]
```

Run this analysis. Output the RCA.

---

### Step 6: Agent 3 — Test Recommendation Agent

**Persona:** SDET. Designs test strategies. Writes Playwright TypeScript. Thinks in regression coverage.

**Input:** Bug report + Agent 1 triage + Agent 2 RCA.

**Prompt:**

```
You are a Test Strategy Advisor and SDET. You design test strategies and write Playwright TypeScript tests.

Triage:
{agent_1_output}

Root Cause Analysis:
{agent_2_output}

Bug Report:
{bug_report}

Provide test recommendations:

## Test Recommendations

### Verification Test (confirm fix works)
```typescript
test('VERIFY FIX: {bug title}', async ({ page }) => {
  // Steps to reproduce the bug scenario
  // Assert the fixed behavior
});
```

### Regression Test Cases
| # | Test Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| R-01 | ... | ... | ... | High |
| R-02 | ... | ... | ... | Medium |
| R-03 | ... | ... | ... | Medium |

### Edge Cases to Add
- [Edge case 1 — specific scenario that could regress]
- [Edge case 2]
- [Edge case 3]

### Test Automation Notes
- **Framework:** Playwright TypeScript
- **Test file:** `tests/ui/{feature}.spec.ts`
- **Test data needed:** [list any required data]
- **Environment notes:** [any env-specific behavior from bug report]

### Performance/Load Tests (if applicable)
[Only if bug has performance implications]
```

Run this analysis. Output the test recommendations.

---

### Step 7: Compile Final Report

Combine all 3 agent outputs into a single structured Jira comment:

```markdown
## 🤖 Bug Triage Report — AI Multi-Agent Analysis
*Generated by /bug-triage skill — 3-agent pipeline*

---

### Agent 1: Triage Analysis
{agent_1_output}

---

### Agent 2: Root Cause Analysis
{agent_2_output}

---

### Agent 3: Test Recommendations
{agent_3_output}

---
*Analysis date: {today's date} | Agents: Triage Analyst → RCA Specialist → Test Advisor*
```

---

### Step 8: Post to Jira

```json
mcp__atlassian__addCommentToJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "issueIdOrKey": "{issue_key}",
  "body": "{compiled report}"
})
```

---

### Step 9: Append to findings.md (BLAST Protocol)

Append RCA findings to `C:\ClaudeCodeMasterclass\rca-log.md` — persistent RCA knowledge base across sessions.

**Create or append:**

```markdown
## {YYYY-MM-DD} — {ISSUE-KEY}: {bug title}

**Severity:** P[N] ({category})
**Root Cause:** {one-line from Agent 2}
**System Layer:** {UI / API / Service / DB}
**Fix Recommendation:** {from Agent 2 investigation steps}
**Tests Added:** {count} — see `tests/ui/{feature}.spec.ts`
**Jira:** [{ISSUE-KEY}](https://anandsoni2641.atlassian.net/browse/{ISSUE-KEY})
```

If `rca-log.md` doesn't exist → create with header:
```markdown
# RCA Log
*Auto-updated by /bug-triage and /create-bug — BLAST protocol*

---
```

**Do NOT overwrite** — always append.

### Step 10: Report to User

```
✅ Bug Triage Complete: {ISSUE-KEY}

**Triage Summary:**
- Severity: P[N] ({category})
- Root Cause: {one-line from Agent 2}
- Tests Recommended: {count} test cases

**Full report posted to Jira:** {issue URL}
**RCA logged to:** findings.md

**Quick Actions:**
- Run verification test: [paste from Agent 3]
- Add regression tests to: tests/ui/{feature}.spec.ts
```

---

## Jira Description Parsing

Atlassian document format wraps text in nested `content` arrays. Parse plain text:

```python
def extract_text(node):
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text", "")
        return "".join(extract_text(c) for c in node.get("content", []))
    if isinstance(node, list):
        return "".join(extract_text(n) for n in node)
    return ""
```

Or flatten: join all `"type": "text"` node values recursively.

---

## Agent Persona Reference

| Agent | Role | Focus | Output |
|---|---|---|---|
| Agent 1 | Senior Bug Triage Analyst | Severity, category, priority | Structured triage with P0-P4 |
| Agent 2 | Root Cause Analysis Specialist | System layers, logs, hypothesis | RCA with investigation steps |
| Agent 3 | Test Strategy Advisor / SDET | Playwright TS tests, regression | Test cases + automation code |

---

## Severity Reference (Agent 1)

| Level | Label | Criteria |
|---|---|---|
| P0 | Blocker | Data loss, system down, security breach, complete feature failure |
| P1 | Critical | Major feature broken, no good workaround |
| P2 | Major | Feature impaired, workaround exists |
| P3 | Minor | Cosmetic, minor inconvenience |
| P4 | Trivial | Enhancement, typo, edge case |

---

## Anti-patterns

❌ **Don't:**
- Inflate severity ("P0" for cosmetic bugs)
- Invent system details not in bug report — say "likely" or "hypothesis"
- Write generic test cases ("verify app works") — write scenario-specific ones
- Skip the Jira post — always write back results
- Merge all 3 agents into one wall of text — keep sections clearly labeled

✅ **Do:**
- Quote specific details from bug report in each agent's output
- Note confidence level when RCA is uncertain
- Write runnable Playwright TS (not pseudocode)
- Reference actual component names from the bug report
- Flag "Started after deployment X" as key RCA clue

---
name: bug-report-create-skill
description: >-
  Create a Jira bug ticket from a screenshot and/or a short description, formatted
  exactly like the team's standard bug template (modeled on VWO-24). Use this
  whenever the user says "create a bug", "/create-bug", "file a bug", "raise a
  bug", "log this bug", "report this bug in Jira", or shares a screenshot of a
  defect and wants it filed. The skill analyzes the screenshot (reads the visible
  error text, screen, and what's wrong), fills the bundled bug template (Summary +
  Bug Details, Steps to Reproduce, Expected Result, Actual Result, Attachments),
  and creates the issue on the named Jira project via the connected Atlassian MCP
  (default project VWO on bugzz.atlassian.net). Trigger even when the user just
  drops a screenshot and says "make a bug for this" without naming a project.
license: MIT
metadata:
  author: thetestingacademy
  version: 1.0.0
  reference_ticket: https://bugzz.atlassian.net/browse/VWO-24
---

# Bug Report Create Skill

Turn a screenshot + a short defect note into a properly formatted Jira **Bug**,
matching the team's house style (see reference ticket VWO-24). The created ticket
uses the same five-section description the team already uses, so every bug looks
consistent.

## When to use

The user wants to file a bug. Inputs usually are:
- **A screenshot** of the defect (an error screen, a broken UI, a console error), and/or
- **A short description** of what went wrong, and
- optionally **a target project key** (default `VWO`) and **priority** (default `Medium`).

## Important capability note — attachments

The connected Atlassian MCP can **create** the issue (summary, description,
priority, labels) but has **no file-upload tool**, so it cannot upload the
screenshot image as a Jira attachment. Handle this honestly:

1. **Read the screenshot for content** — extract the exact error text, the page/URL,
   and the visible symptom, and put that into the description (especially the
   *Actual Result* — quote the error verbatim like VWO-24 does).
2. In the **Attachments** section, describe what the screenshot shows.
3. After creating the ticket, tell the user the image must be **attached manually**
   (open the ticket → drag the screenshot in), and give them the direct ticket URL.

Never claim the screenshot was attached when it wasn't.

## Workflow

### 1. Gather inputs

Collect the screenshot, the defect description, the target project (default `VWO`),
and priority (default `Medium`). If the user gave only a screenshot, infer the rest
from it. If you genuinely can't tell what the bug is from either the image or the
text, ask one short clarifying question — otherwise proceed.

### 2. Resolve the Jira site

The known site is `bugzz.atlassian.net`, cloudId
`56961d9e-1a9c-4fbe-a548-eec70c14216a`. If a call fails or the user points at a
different site, call `getAccessibleAtlassianResources` to get the right cloudId.

### 3. Analyze the screenshot

Read the image. Capture: the screen/page and URL, the action that triggered the
defect, and the **exact** error message text shown. This drives *Bug Details* and
*Actual Result*. Quote error strings verbatim.

### 4. Fill the template

Read `assets/bug-report-template.md` and fill it:
- **Summary** — short and specific, mirroring VWO-24's style (`Bug: <TC-id?> <title>`).
- **Bug Details** — scenario + defect in 1-2 sentences.
- **Steps to Reproduce** — numbered, concrete, bold the UI elements.
- **Expected Result** — the rule/behavior that should have happened.
- **Actual Result** — what happened, with the verbatim error in italics.
- **Attachments** — what the screenshot shows.

The description sent to Jira is everything from `### Bug Details` downward.

### 5. Confirm before creating (first time in a session)

Creating a Jira issue is an outward-facing action that can't be undone via this MCP
(there is no delete tool). Before the **first** create in a session, show the user
the filled Summary + description + target project/priority and get a quick go-ahead.
Once they've approved the format, subsequent `/create-bug` calls in the same session
can proceed directly unless something looks off.

### 6. Create the issue

Call `createJiraIssue` with:
- `cloudId` = the resolved cloud id
- `projectKey` = target project (default `VWO`)
- `issueTypeName` = `Bug`
- `summary` = the Summary line
- `description` = the markdown body (sections from *Bug Details* down)
- `contentFormat` = `markdown`  (so the `###` headings render)
- `additional_fields` = `{"priority": {"name": "<Priority>"}, "labels": [<labels>]}` when set

### 7. Append to findings.md (BLAST Protocol)

After creating the Jira issue, append to `C:\ClaudeCodeMasterclass\rca-log.md`:

```markdown
## {YYYY-MM-DD} — {ISSUE-KEY}: {bug summary}

**Severity:** {priority from Jira}
**Root Cause:** {inferred from screenshot/description — 1 line}
**System Layer:** {UI / API / Service / DB — best guess from evidence}
**Fix Recommendation:** {from bug details}
**Jira:** [{ISSUE-KEY}]({ticket URL})
```

Do NOT overwrite — always append. If `rca-log.md` doesn't exist, create with header:
```markdown
# RCA Log
*Auto-updated by /bug-triage and /create-bug — BLAST protocol*

---
```

### 8. Report

Return the new ticket **key + URL** (e.g. https://bugzz.atlassian.net/browse/VWO-NNN),
the summary, and a one-line reminder to attach the screenshot manually.

## Output rules

- Match the VWO-24 five-section structure exactly; keep the `###` headings.
- Quote on-screen error text verbatim — don't paraphrase it.
- Default to project `VWO`, type `Bug`, priority `Medium` unless told otherwise.
- Be truthful about the screenshot not being auto-attached.

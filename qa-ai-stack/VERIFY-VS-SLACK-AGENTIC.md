# Prompt: Verify qa-ai-stack vs Slack Agentic E2E Testing

Paste everything below to the other AI agent, along with this `qa-ai-stack/` folder.

---

## Context

I run a QA automation stack called `qa-ai-stack` (portable, drops into any Playwright
TypeScript project — see `CLAUDE.md` in this folder for its full spec).

On 2026-07-10, InfoQ reported Slack introduced "agentic" E2E testing: AI agents that
execute test workflows based on **intent** rather than fixed scripts, adapting to UI
and system changes at runtime, to reduce brittle tests — explicitly positioned as
**complementing**, not replacing, deterministic unit/integration/E2E testing.
Source: https://www.infoq.com/news/2026/07/slack-agentic-e2e-testing-ui/

I had an AI assistant (Claude Code) audit my stack against that description and make
two changes. I want you to independently verify the claims below by reading the actual
files — do not take my word or the assistant's word for anything. Flag anything that
doesn't hold up.

## What was claimed to have changed (verify each)

1. **Heal-agent verify-after-patch fix.**
   Claim: `agent-factory/ai-agents/heal/heal.agent.ts` previously wrote a locator
   patch to a Page Object file with `--apply` and never re-ran the test to confirm
   the patch worked. Claim: this was fixed to re-run the spec after patching and
   auto-revert from `.bak` on failure, setting a new `verified` field on the result.
   → Read `agent-factory/ai-agents/heal/heal.agent.ts`,
     `agent-factory/ai-agents/core/types.ts`, and
     `agent-factory/ai-agents/heal/CHANGE-verify-after-patch.md`.
     Confirm the before/after described in that file matches the current code.

2. **Intent-driven test prototype (NOT part of this folder — flag this explicitly).**
   Claim: a prototype script `run-intent.ts` was built elsewhere in the workspace
   (`Playwright Automation Framework/src/intent-agent/`, outside this `qa-ai-stack/`
   folder) that takes a plain-English goal, reads a live Playwright ARIA snapshot,
   asks an LLM to pick the next role+name action, executes it, and repeats — no
   hardcoded selectors or steps. Claim: when run against a real LLM (Groq), it
   **failed its own goal** — skipped filling one required field, hallucinated that
   it had been filled, then looped clicking a submit button 6 times with no
   stuck-state detection.
   → This script is not included in `qa-ai-stack/`. Note that in your report — it is
     exploratory work that was never adopted into the stack. If you were given
     `run-intent.ts` or its run logs separately, verify the failure claim against the
     actual saved JSON run log, don't just take the summary.

## What to actually verify about THIS folder (qa-ai-stack)

3. **Is `agent-factory/` wired into the skill flow, or fully separate?**
   Claim: `agent-factory/` (the `ai:rca`/`ai:heal`/`ai:flaky`/`ai:triage` npm-script
   agents) is NOT called by the `/test-case-execution` skill's actual logic — the
   link between them exists only as a documented intention (a "Verdict → Action"
   table in `CLAUDE.md`), not as executed code.
   → Read `skills/test-case-execution/SKILL.md` in full. Search it for any reference
     to `agent-factory`, `ai:heal`, `ai:rca`, `ai:flaky`. Report whether the link is
     real (code calls it) or aspirational (only documented).

4. **Is `CLAUDE.md` in this folder accurate and current?**
   → Cross-check every row in the "What This Stack Gives You" table against what
     actually exists in `skills/`, `agent-factory/`, `scripts/`, and the root files
     (`*.md`, `*.sh`, `*.json`). Flag: anything in the table that doesn't exist on
     disk, and anything on disk (a skill folder, a script) not mentioned anywhere
     in `CLAUDE.md`.

## The actual question I need answered

**Where does this stack genuinely stand relative to what Slack described, right now
— not aspirationally, not based on my/the assistant's framing?**

Score it plainly against these three axes, with a one-line reason for each, and cite
the file/line that justifies your score:

| Axis | Slack (per the article) | This stack |
|---|---|---|
| Fixed scripts vs intent-driven | Agent executes by intent, adapts at runtime | ? |
| Self-heal safety (does a patch get verified before it's trusted?) | Unknown/not detailed in article | ? |
| Complements deterministic tests (doesn't replace them) | Explicit design goal | ? |

Then answer directly: **is there anything in `agent-factory/` or elsewhere in this
folder that is genuinely production-ready and worth wiring into the
`/explore` → `/test-case-creation` → `/test-case-execution` flow, versus something
that is still prototype-grade and should stay out?** Be specific about which file,
and why — don't give a generic "looks promising" answer.

## Ground rules for your review

- Read the actual files. Don't infer behavior from filenames, README prose, or
  variable names alone — read the function bodies.
- If a claim above is wrong or overstated, say so plainly and cite what you found
  instead.
- Don't recommend adopting the intent-agent prototype into the stack — that's out of
  scope for this review (it isn't even in this folder). Just factor its documented
  failure into your "where do we stand vs Slack" answer.
- I want the unflattering answer if the flattering one isn't true.

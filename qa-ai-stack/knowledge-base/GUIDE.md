# Knowledge Base — Persistent Product Memory

The agent's **standing memory across sessions** — what a product *does*, beyond the single Epic/URL handed to one run. Loaded before requirements analysis by `test-case-creation` and `test-case-execution`.

> Adapted from `imransdet/qa-assistant` KB pattern, layered onto our anti-hallucination + auto-fix engine. His agent has memory but no self-healing; we have both.

## One folder per product, keyed by Jira project

```
knowledge-base/
├── _TEMPLATE/          ← copy to start a new product KB
│   ├── product-flows.md
│   ├── business-rules.md
│   ├── feature-map.md
│   └── known-defects.md
└── SCRUM/              ← our active project (anandsoni2641.atlassian.net)
```

A session loads **only** `knowledge-base/<JIRA_PROJECT>/`. Default project = `SCRUM`.

## The four files

| File | Answers | Used for |
|------|---------|----------|
| `business-rules.md` | What is allowed / forbidden / enforced? | **Bug-vs-intended oracle.** A `BR-xx` rule is authoritative truth — outranks heuristic guesses |
| `known-defects.md` | Where has this product broken before? | Dedup before filing (check here before JQL); probe weak spots harder |
| `feature-map.md` | What depends on what? | Regression blast radius — a feature's `Used by` chain becomes test scope |
| `product-flows.md` | How does a user actually move through it? | Ground happy-path tests in real navigation |

## Bug confidence tiers (the core upgrade)

When `test-case-execution` finds a REAL_BUG (AH Rule 23), it now also assigns a confidence tier (AH Rule 25):

- **Confirmed** — violates a documented `BR-xx`. Cite the rule ID in the bug. High confidence, auto-file.
- **Suspected** — heuristic only, no matching rule. Flag for review; file with `[SUSPECTED]` prefix.

## How it grows

1. **After each execution run** — `test-case-execution` proposes KB additions (new confirmed defect → `known-defects.md`, new rule learned → `business-rules.md`). Append, never overwrite.
2. **On demand** — tell the agent a fact ("invoice is PDF only"), it files into the right file.

## Anti-hallucination guard

KB rules must trace to a real source — an Epic AC, a filed bug, observed+verified behavior. **Never invent a `BR-xx`.** Every rule cites its origin (Epic key, bug key, or "observed YYYY-MM-DD headed mode").

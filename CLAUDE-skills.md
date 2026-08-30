# CLAUDE-skills.md — Skill Index

*Loaded on demand. Not loaded every session.*
*98 skills installed at `~/.claude/skills/`. Last synced: 2026-08-17.*

**Before creating a new skill: search this file first.** A duplicate skill is worse than no skill — it splits the trigger surface and neither version gets maintained.

---

# QA Lifecycle (STLC) — the primary flow

**Happy path:** `/explore` → `/test-case-creation` → `/test-case-execution` → `/test-closure`
**One command for all of it:** `/qa-run`

| Phase | Skill | Command | What it does |
|---|---|---|---|
| **1. Requirement Analysis** | test-case-creation *(Step 1C)* | — | 5-dimension gap scan of the Epic/doc before scenarios exist. ⚠️/❌ rows become findings, never invented ACs |
| **2. Test Planning** | test-plan-create-skill | `/test-plan` | Jira ticket → formal 14-section test plan (.md + .docx) |
| | epic-create | `/epic-create` | URL or brief → Jira Epic via Atlassian MCP |
| **3. Test Design** | explore | `/explore` | Live DOM via Playwright MCP → TypeScript POM |
| | create-page-object | — | POM class for the 8-layer architecture |
| | generate-test-data | `/generate-test-data` | Field spec → valid / invalid / boundary / SQLi / XSS data |
| **4. Test Development** | test-case-creation | `/test-case-creation` | Epic (A), UI-only (B), or spec doc via RAG (C) → test cases in Jira or markdown |
| | spec-quality | `/spec-quality` | Static 0–100 scorer on `.spec.ts` — flaky patterns, secrets, missing expects |
| **5. Test Execution** | test-case-execution | `/test-case-execution` | Headed Playwright run + anti-hallucination verify + auto-fix + bug filing |
| | qa-run | `/qa-run` | Orchestrates explore → creation → execution with checkpoints |
| | e2e-runner | — | Vercel Agent Browser (Playwright fallback), flaky quarantine, artifacts |
| **6. Defect Management** | bug-report-create-skill | `/create-bug` | Screenshot + notes → Jira bug on the team template |
| | bug-triage | `/bug-triage` | 3-agent pipeline (Triage → RCA → Test Rec) → posts to Jira |
| **7. Test Closure** | test-closure | `/test-closure` | Traceability matrix + counted coverage + defect tiers + GO/NO-GO verdict |

**Supporting QA:** `e2e-testing` · `react-testing` · `ai-regression-testing` · `browser-testing-with-devtools` · `playwright-ai-mcp-tutor` · `verification-loop`

---

# Engineering Discipline

| Skill | Use when |
|---|---|
| karpathy-guidelines | Any code change — 5 guardrails incl. "adopt for our pain, not to match others" |
| blindspot-pass | **Before** non-trivial build/strategy work — unknown-unknowns, irreversibility, cheapest disproof |
| doubt-driven-development | Correctness > speed; fresh-context adversarial review before a decision stands |
| tdd-workflow / test-driven-development | New features, bug fixes, refactors |
| spec-driven-development | New project or feature — spec before code |
| source-driven-development | Ground decisions in official docs, not recall |
| incremental-implementation | Change touches more than one file |
| planning-and-task-breakdown | Spec exists, needs ordered tasks |
| debugging-and-error-recovery | Tests fail, builds break — root cause not guesswork |
| code-simplification | Works but harder to read than it should be |

---

# Review & Security

`code-review-and-quality` · `code-reviewer` · `typescript-reviewer` · `caveman-review` (compressed PR comments) · `security-review` · `security-and-hardening` · `performance-optimization` · `observability-and-instrumentation`

---

# Decision & Thinking

| Skill | Scope |
|---|---|
| council | 5-role adversarial council — **strategy/business only** (pricing, positioning, pivot) |
| devil | Single contrarian voice — argue the opposite case |
| roast | Brutally honest grading, zero sugarcoating |
| steal | Reverse-engineer *why* something works so the mechanism transfers |
| idea-refine | Raw idea → sharp actionable concept |
| interview-me | Extract what the user actually wants vs what they say |

**Don't confuse these three:** `council` = multi-role synthesis, strategy layer · `devil` = one voice, decision layer · `doubt-driven-development` = adversarial review, code layer.

---

# Architecture & Delivery

`api-and-interface-design` · `frontend-ui-engineering` · `ci-cd-and-automation` · `shipping-and-launch` · `deprecation-and-migration` · `documentation-and-adrs` · `git-workflow-and-versioning` · `git-commit-push` · `caveman-commit`

---

# Context & Session Management

| Skill | Command |
|---|---|
| context-autopilot | Background — forces compaction protocol at 70% fill |
| context-engineering | Session start / output quality degrading |
| token-optimizer | Audit where context actually goes |
| recall | Search **all** past chats across every project |
| navigate | Find where a topic was discussed *this* session |
| recap | `/recap` — what was done this session |
| export-convo / show-me-html | `/export`, `/show-me-html` |

---

# Caveman (token compression)

`caveman` (mode) · `caveman-commit` · `caveman-review` · `caveman-compress` · `caveman-stats` · `caveman-help` · `cavecrew` (subagent delegation)

---

# Skill Meta

`skill-creator` (build new) · `skill-improve` (update from corrections) · `skill-list` (enumerate) · `using-agent-skills` (discovery)

---

# Model & Workflow

`fable5-brain` (always-on general brain) · `fable-5-skill` (6-stage content workflow) · `fable-5-prompting` (Fable 5 prompt guide) · `loop` (`/loop` — iterate to outcome)

---

# Trading (separate domain)

`trendline-bot-brain` (always-on for trading projects) · `bot-ops` (live bot health/start/stop) · `honest-backtest` (anti-self-deception validation)

⚠️ Money-touching. `blindspot-pass` is mandatory before changes here.

---

# Video / HyperFrames

**Entry point: `hyperframes` — read first for any video request.**

Core: `hyperframes-core` · `hyperframes-animation` · `hyperframes-creative` · `hyperframes-media` · `hyperframes-cli` · `hyperframes-registry`
Formats: `embedded-captions` · `talking-head-recut` · `faceless-explainer` · `motion-graphics` · `slideshow` · `general-video` · `music-to-video` · `website-to-video` · `pr-to-video` · `product-launch-video` · `remotion-to-hyperframes` · `media-use`

---

# Repo Safety

`guard` — `/guard` installs a local pre-commit hook + `.git/info/exclude` so private qa-ai-stack files can never reach a company GitHub. Run once per machine/clone (`.git/` never travels).

---

## Skill Locations

- Global: `~/.claude/skills/{skill-name}/SKILL.md`
- Portable copies: `qa-ai-stack/skills/` (tracked in git — the live ones are **not**)

⚠️ **Known drift risk:** `~/.claude/skills/` is unversioned. The `qa-ai-stack` copy of `test-case-creation` was found 132 lines stale on 2026-08-17. Re-sync when editing a skill that has a portable copy.

## Key Skill Rules

- `/test-case-creation` — Epic/doc = source of truth for assertions. UI = locators only.
- `/test-case-creation` — a missing AC is a **finding**, not a blank to fill (Step 1C).
- `/test-case-execution` — headed mode always (AH Rule 17). Never fix a test that correctly caught a bug.
- `/test-closure` — no execution block in `progress.md` = 0% coverage, not 100%. Hard stop.
- `/explore` — ARIA snapshot does not expose `data-test`; use `getByRole` + `// VERIFICATION REQUIRED`.
- `/council` — strategy only. Not for code review, lookups, or simple yes/no.

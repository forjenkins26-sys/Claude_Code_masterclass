# B.L.A.S.T. Framework Reference

**B**lueprint · **L**ink · **A**rchitect · **S**tylize · **T**rigger

A deterministic, self-healing automation protocol using the A.N.T. 3-layer architecture. LLMs handle routing; Python tools handle execution; business logic never lives inside the LLM.

---

## Identity: System Pilot

Role: Build deterministic, self-healing automation.
Priority: Reliability over speed. Never guess at business logic.
Architecture: A.N.T. — Architecture (SOPs) → Navigation (routing) → Tools (Python scripts)

---

## Protocol 0: Initialization (Mandatory — runs before any code)

### Memory Files to Create First

| File | Purpose |
|---|---|
| `task_plan.md` | Phases, goals, checklists |
| `findings.md` | Research, discoveries, constraints |
| `progress.md` | What was done, errors, tests, results |
| `CLAUDE.md` | **Project Constitution** — data schemas, behavioral rules, architectural invariants |

### Hard Stop Conditions

Do NOT write any scripts in `tools/` until:
- [ ] Discovery Questions (Phase 1) answered by user
- [ ] Data Schema defined in `CLAUDE.md`
- [ ] `task_plan.md` has approved Blueprint

---

## Phase 1: B — Blueprint

### Discovery Questions (ask all 5)

1. **North Star** — What is the singular desired outcome?
2. **Integrations** — Which external services (Slack, Shopify, etc.)? API keys ready?
3. **Source of Truth** — Where does the primary data live?
4. **Delivery Payload** — How and where should the final result be delivered?
5. **Behavioral Rules** — Tone, logic constraints, "Do Not" rules?

### Data-First Rule

Define the **JSON Data Schema** in `CLAUDE.md` before any code:

```json
{
  "input": {
    "field": "type — description"
  },
  "output": {
    "field": "type — description"
  }
}
```

Coding begins only after payload shape is confirmed.

### Research

Search GitHub repos and reference databases for relevant libraries, patterns, or prior art before designing the architecture.

---

## Phase 2: L — Link

1. **Verify** all API connections and `.env` credentials
2. **Handshake** — build minimal scripts in `tools/` to confirm external services respond
3. **Block** — do not proceed to full logic if any Link is broken

---

## Phase 3: A — Architect (3-Layer Build)

### Layer 1: Architecture (`architecture/`)

- Technical SOPs written in Markdown
- Define: goals, inputs, tool logic, edge cases
- **Golden Rule:** If logic changes → update the SOP *before* updating the code

### Layer 2: Navigation (Decision Making)

- Reasoning/routing layer — routes data between SOPs and Tools
- Does NOT perform complex tasks directly — calls execution tools in the right order
- Lives in the LLM (prompt) — not a file

### Layer 3: Tools (`tools/`)

- Deterministic Python scripts — atomic and independently testable
- Secrets stored in `.env` only
- All intermediate file operations use `.tmp/`

---

## Phase 4: S — Stylize

1. **Payload Refinement** — format outputs (Slack blocks, Notion layouts, Email HTML) for professional delivery
2. **UI/UX** — if project includes dashboard/frontend, apply clean CSS/HTML and intuitive layouts
3. **Feedback** — present stylized results to user before final deployment

---

## Phase 5: T — Trigger

1. **Cloud Transfer** — move finalized logic from local to production cloud environment
2. **Automation** — set up execution triggers (Cron, Webhooks, Listeners)
3. **Documentation** — finalize Maintenance Log in `CLAUDE.md` for long-term stability

---

## Operating Principles

### Data-First Rule

`CLAUDE.md` is **law**. Planning files (`task_plan.md`, `findings.md`, `progress.md`) are **memory**.

Update rules:
- `progress.md` → after every meaningful task (what happened, errors)
- `findings.md` → discoveries, constraints, API quirks
- `CLAUDE.md` → ONLY when schema changes, rule added, or architecture modified

### Self-Annealing (Repair Loop)

When any Tool fails:

1. **Analyze** — read stack trace. Do not guess.
2. **Patch** — fix the script in `tools/`
3. **Test** — verify fix works
4. **Update Architecture** — add learning to `architecture/*.md` so error never repeats

Example learnings to capture: "API requires X-Custom-Header", "Rate limit is 5 calls/sec", "Response wraps data in nested `content` array"

### Deliverables vs. Intermediates

| Location | Type | Rule |
|---|---|---|
| `.tmp/` | Intermediate | Ephemeral — scraped data, logs, temp files. Can be deleted. |
| Cloud | Payload | **Project is only "Complete" when payload reaches final cloud destination.** |

---

## File Structure

```
├── CLAUDE.md             # Project Constitution — schemas, rules, invariants
├── .env                  # API keys/secrets (verified in Link phase, never committed)
├── task_plan.md          # Phases, goals, checklists
├── findings.md           # Research, discoveries, constraints
├── progress.md           # Run log — what happened, errors, results
├── architecture/         # Layer 1: SOPs (the "How-To" in Markdown)
│   └── {feature}.md
├── tools/                # Layer 3: Python scripts (the "Engines")
│   └── {action}.py
└── .tmp/                 # Temporary workbench (intermediates only)
```

---

## Quick Reference Card

| Phase | Name | Gating Condition | Output |
|---|---|---|---|
| 0 | Init | Always first | `CLAUDE.md`, `task_plan.md`, `findings.md`, `progress.md` |
| 1 | Blueprint | 5 discovery questions answered | Approved `task_plan.md` + JSON schema in `CLAUDE.md` |
| 2 | Link | Schema confirmed | Working API handshake scripts in `tools/` |
| 3 | Architect | All links verified | `architecture/` SOPs + deterministic `tools/` scripts |
| 4 | Stylize | Logic complete | Formatted payload, UI feedback |
| 5 | Trigger | User approval | Live cron/webhook, `CLAUDE.md` maintenance log |

---

## CLAUDE.md Template

```markdown
# Project Constitution

## Data Schema

### Input
{json input shape}

### Output
{json output shape}

## Behavioral Rules
- Rule 1:
- Rule 2:

## Architectural Invariants
- Invariant 1:

## API Notes
| Service | Endpoint | Auth | Rate Limit | Notes |
|---|---|---|---|---|

## Maintenance Log
| Date | Change | Reason |
|---|---|---|
```

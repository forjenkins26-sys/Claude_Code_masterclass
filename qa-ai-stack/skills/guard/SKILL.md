---
name: guard
description: Install a local git guard so private qa-ai-stack files (CLAUDE.md, ANTI-HALLUCINATION-RULES.md, AUTO-FIX-PROTOCOL.md, skills/, agent-factory/, knowledge-base/, rules/, scripts/rule-engine.js, settings-hooks.json, package-scripts.json, .env, .vercel/) can NEVER be committed or pushed to the company's GitHub. Use when the user says "/guard", "guard this repo", "set up the guard", "protect the stack", "new company setup", or before any commit/push in a company repo that has the qa-ai-stack cloned in. Installs a .git/hooks/pre-commit hook + .git/info/exclude block list (both local-only, never pushed), self-tests the hook, and scans for leaks. Refuses to run on the stack repo itself.
---

# Guard — keep the qa-ai-stack OFF the company git

Real, deterministic protection. Not LLM best-effort — installs an actual git `pre-commit` hook that hard-blocks (`exit 1`) any commit containing stack files. Once installed, git enforces it on every commit, with or without Claude.

## When to run

Run on the user's VERY FIRST action in a company repo, or whenever they say `/guard`. Trigger phrases: "guard this repo", "set up the guard", "protect the stack", "new company setup", or any time you're about to `git commit`/`git push` in a company repo and no guard exists yet.

## Instructions

### Step 1: Locate the project root
The guard runs from the **git repo root** the user is working in (the company project), NOT from the skill folder. Determine the current working directory / the repo the user means. If ambiguous, ask which repo.

### Step 2: Pre-check (decide whether to install)
Run from the target repo root:

```sh
git rev-parse --git-dir   # must be a git repo; if not, offer: git init
git remote -v             # inspect origin
```

- If **origin IS the stack repo** (`AI_E2E_QA_Automation_Playwright_Master_Framework`) → **STOP. Do not install.** Stack files belong tracked there. Report this and exit.
- If `.git/hooks/pre-commit` **already exists** and contains the guard → guard is live. Report "already installed", exit.
- Else → proceed to Step 3.

### Step 3: Run the bundled guard script
The skill bundles a self-contained, idempotent script. Run it **from the target repo root**:

```sh
sh "$HOME/.claude/skills/guard/scripts/setup-local-guard.sh"
```

(On Windows, the Bash tool resolves `$HOME` to the user profile. If `$HOME` doesn't resolve, use the absolute path `C:/Users/<user>/.claude/skills/guard/scripts/setup-local-guard.sh`.)

The script does all of this idempotently:
1. Verifies it's in a git repo and NOT the stack repo (aborts on the stack repo).
2. Writes the stack block list to `.git/info/exclude` (local-only, never pushed).
3. Installs `.git/hooks/pre-commit` that hard-blocks staged stack files.
4. If stack files are already TRACKED (repo cloned FROM the stack), untracks them with `git rm -r --cached` (files stay on disk) and commits the removal.
5. Self-tests the hook (forces a CLAUDE.md commit — must be blocked).
6. Final scan — must end `CLEAN`.

### Step 4: Report the result
Tell the user, concisely:
- Which repo (origin).
- What changed: `.git/info/exclude` block + `.git/hooks/pre-commit` installed.
- Self-test result: PASS (hook blocked) or FAIL (investigate).
- Final scan: `CLEAN` (safe to push) or `LEAK` (list tracked files, tell them to `git rm -r --cached <path>` then commit).

### Step 5: Hard rules going forward
After the guard is installed, in this repo:
- **Never** `--no-verify` (bypasses the hook).
- **Never** `git add -A` / `git add .` — stage real work by name so stack files never get staged.
- The guard is **local only** — `.git/` contents never travel. Re-run this skill once per machine / per fresh clone.

## What counts as a "stack file" (blocked)

`CLAUDE.md`, `ANTI-HALLUCINATION-RULES.md`, `AUTO-FIX-PROTOCOL.md`, `QA-SKILLS-CHEATSHEET.md`, `LOCAL-GUARD-SETUP.md`, `HOW-TO-USE-GUARD.md`, `INSTALL.md`, `skills/`, `agent-factory/`, `agent-factory-cli/`, `knowledge-base/`, `rules/`, `scripts/rule-engine.js`, `settings-hooks.json`, `package-scripts.json`, `setup-local-guard.sh`, `verify-locators-*`, `progress.md`, `rca-log.md`, `findings.md`, `task_plan.md`, `.env`, `.env.*`, `.vercel/`.

## Anti-patterns

❌ **Don't:**
- Run the guard on the stack repo itself — it refuses, and you shouldn't try to force it.
- Rely on CLAUDE.md text alone for protection — that's LLM best-effort. The git hook is the real wall.
- Use `--no-verify` or `git add -A` after installing — both defeat the guard.

✅ **Do:**
- Run on first contact with a company repo.
- Re-run after every fresh clone / on a new machine (`.git/` never travels).
- Stage files by name, always.

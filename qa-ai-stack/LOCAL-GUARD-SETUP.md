# Local Guard Setup — keep the stack OFF the company repo

> Run this AFTER installing the stack (see `INSTALL.md`) and AFTER `git init` / cloning the company repo.
>
> **Why:** A new company may not allow pushing private rules / skills / KB to their GitHub. The stack must run on your machine only and stay invisible to their git. This sets up two local-only guards that are **never pushed** and **never cloned** (git refuses to clone anything inside `.git/`), so they must be re-created **once per machine / per clone**.

## What's already safe (no action needed)

| Asset | Where | Pushes to company? |
|---|---|---|
| Skills | `~/.claude/skills/` | ❌ outside the repo — can't leak |
| Settings hooks | `~/.claude/settings.json` | ❌ outside the repo |

Only **repo-root** stack files need guarding: `CLAUDE.md`, `ANTI-HALLUCINATION-RULES.md`, `AUTO-FIX-PROTOCOL.md`, `QA-SKILLS-CHEATSHEET.md`, `knowledge-base/`, `agent-factory-cli/`, `rules/framework-rule-engine.json`, `scripts/rule-engine.js`, plus secrets (`.env`, `.vercel/`) and BLAST memory (`progress.md`, `rca-log.md`, `findings.md`, `task_plan.md`).

## Two guards

| Guard | File | Pushed? | Catches |
|---|---|---|---|
| Local ignore | `.git/info/exclude` | ❌ never | files invisible to `git status` / `git add .` |
| Pre-commit hook | `.git/hooks/pre-commit` | ❌ never | files force-staged with `git add -f` |
| Stage-by-name rule | behavior | — | `git add -A` sweeping everything |

`.git/info/exclude` is used **instead of** `.gitignore` on purpose: `.gitignore` is tracked and would push to the company repo, revealing you run a private stack. `.git/info/exclude` is local — zero footprint.

---

## Prompt 1 — local ignore (`.git/info/exclude`)

Paste into the project's Claude:

```
This is a COMPANY repo. qa-ai-stack files (my private rules/skills/KB) must NEVER be committed or pushed here. Make them invisible to git:

1. Append these to .git/info/exclude (local-only, never pushed — NOT .gitignore which IS tracked):

   CLAUDE.md
   ANTI-HALLUCINATION-RULES.md
   AUTO-FIX-PROTOCOL.md
   QA-SKILLS-CHEATSHEET.md
   knowledge-base/
   agent-factory-cli/
   rules/framework-rule-engine.json
   scripts/rule-engine.js
   .env
   .vercel/
   verify-locators-*.js
   progress.md
   rca-log.md
   findings.md
   task_plan.md

2. Verify ignored: git check-ignore CLAUDE.md ANTI-HALLUCINATION-RULES.md knowledge-base/ agent-factory-cli/ .env
   (every line must echo back = ignored)

3. Confirm none already tracked: git ls-files | grep -E 'CLAUDE.md|ANTI-HALLUCINATION|AUTO-FIX|knowledge-base|agent-factory|rule-engine'
   (empty = clean. If any show: git rm --cached <file> — do NOT delete from disk)

4. Show git status — stack files must NOT appear under untracked or staged.

RULE: when I commit/push, stage files EXPLICITLY by name. NEVER git add -A or git add . — could sweep stack files. If a commit would include any stack file, STOP and warn me. Confirm all checks pass and repeat the staging rule.
```

## Prompt 2 — pre-commit hook (`.git/hooks/pre-commit`)

Paste into the project's Claude (run AFTER Prompt 1):

```
Add a LOCAL pre-commit hook that hard-blocks any commit touching qa-ai-stack files. Lives in .git/hooks/, never pushed.

Create .git/hooks/pre-commit with EXACTLY:

#!/bin/sh
# Local guard — blocks committing private qa-ai-stack files to company repo.
# Lives in .git/hooks/, never pushed. Bypass (DON'T) with --no-verify.

BLOCKED='CLAUDE\.md|ANTI-HALLUCINATION|AUTO-FIX|QA-SKILLS-CHEATSHEET|knowledge-base/|agent-factory-cli/|rule-engine|framework-rule-engine|verify-locators-|progress\.md|rca-log\.md|findings\.md|task_plan\.md|\.env$|\.vercel/'

STAGED=$(git diff --cached --name-only | grep -E "$BLOCKED")

if [ -n "$STAGED" ]; then
  echo "════════════════════════════════════════════════════"
  echo "  COMMIT BLOCKED — private qa-ai-stack files staged:"
  echo "════════════════════════════════════════════════════"
  echo "$STAGED" | sed 's/^/  ✗ /'
  echo "════════════════════════════════════════════════════"
  echo "  These are LOCAL-ONLY. Do not push to company repo."
  echo "  Unstage them:  git restore --staged <file>"
  echo "════════════════════════════════════════════════════"
  exit 1
fi
exit 0

Then: chmod +x .git/hooks/pre-commit

TEST it fires (prove, don't assume):
  1. echo x > CLAUDE.md && git add -f CLAUDE.md
  2. git commit -m "should be blocked"
     Expected: "COMMIT BLOCKED" banner + exit 1, commit does NOT happen.
  3. Clean up: git rm --cached CLAUDE.md && rm -f CLAUDE.md
     (NOTE: on a fresh repo with ZERO commits, `git restore --staged` fails — no HEAD yet. Use `git rm --cached` instead.)

Confirm the BLOCKED banner printed and the commit was refused. Report pass/fail.
```

---

## Per-clone checklist

Every new machine / fresh clone of the company repo:

- [ ] Stack installed (`INSTALL.md` bootstrap)
- [ ] Prompt 1 run → `git check-ignore` confirms stack files ignored
- [ ] Prompt 2 run → hook blocks a forced `git add -f CLAUDE.md` commit
- [ ] `git ls-files` scan returns **empty** for stack patterns
- [ ] Never use `--no-verify`; stage by name, never `git add -A`

## Before any push to the company repo

```
git ls-files | grep -E 'CLAUDE\.md|ANTI-HALLUCINATION|AUTO-FIX|QA-SKILLS|knowledge-base|agent-factory|rule-engine|framework-rule-engine|progress\.md|rca-log\.md|findings\.md|task_plan\.md|\.env|\.vercel'
```

Must be **empty**. If anything prints → `git rm --cached <file>`, re-commit, re-scan. Only push when clean.

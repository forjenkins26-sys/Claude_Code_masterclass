# How to use the guard (simple)

**Goal:** use my QA stack (skills, rules, knowledge-base) for testing at a new company —
but NEVER push those files to the company's git by mistake.

---

## Do this ONCE per company project

### 1. Get your company project (the git repo you push to)
Clone it or `git init` it as normal. This is YOUR working folder.

### 2. Put the stack files inside it
Clone the stack, then copy the stack files into your company project folder:

```sh
git clone https://github.com/forjenkins26-sys/AI_E2E_QA_Automation_Playwright_Master_Framework.git qa-ai-stack
cp -r qa-ai-stack/* qa-ai-stack/.* your-company-project/   2>/dev/null
```

(Or simpler: just copy the folders you need — `skills/`, `rules/`, `agent-factory/`,
`knowledge-base/`, `scripts/`, and the `.md` files — into the project.)

### 3. Run the guard ONCE — inside the company project
```sh
cd your-company-project
sh setup-local-guard.sh
```

Script prints `RESULT: CLEAN — safe to push`. **Done.**

---

## What the guard does (so you trust it)

- Hides all stack files from `git status` and `git add .` (via `.git/info/exclude`)
- Installs a `pre-commit` hook that **blocks** any commit containing a stack file
- If stack files were already tracked, it untracks them (keeps them on disk)
- Self-tests the hook and scans — must end CLEAN

After this you commit/push the company project normally. The stack files stay invisible to git.

---

## The ONE rule to follow

- ✅ Stage your real work by name: `git add src/file.ts`
- ❌ Never `git add -A` or `git add .` blindly (the hook still catches it, but don't rely on luck)
- ❌ Never `git commit --no-verify` (that skips the guard)

---

## Important facts (why it's not 100% automatic)

1. The guard lives inside `.git/` — git **never clones or copies `.git/`**.
   So the guard does **NOT** travel. You must run `setup-local-guard.sh` **once per new project / new laptop**.
2. That's a git limitation, not a bug. One command per project is the smallest it can be.

---

## Quick check before any push

```sh
git ls-files | grep -E 'CLAUDE\.md|skills/|agent-factory|knowledge-base|rules/|\.env'
```

Must print **nothing**. If it does → `git rm -r --cached <that path>`, commit, push.

---

## If you want it automatic for EVERY project on one laptop (optional, advanced)

Set git global hooks + global ignore once per laptop, then every project is auto-guarded
with no per-project command. Ask Claude: *"set up the global guard"*. Trade-off: applies to
ALL repos on that machine.

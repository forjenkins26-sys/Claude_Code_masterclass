#!/bin/sh
# setup-local-guard.sh — one-shot local guard for the qa-ai-stack.
#
# WHAT IT DOES (idempotent — safe to re-run):
#   1. Verifies you are inside a git repo and NOT the stack repo itself.
#   2. Writes the stack block list to .git/info/exclude (local-only, never pushed).
#   3. Installs .git/hooks/pre-commit that hard-blocks staged stack files.
#   4. If stack files are ALREADY TRACKED (repo was cloned FROM the stack),
#      untracks them with `git rm -r --cached` (files stay on disk) and commits.
#   5. Self-tests the hook, then scans — must end EMPTY.
#
# RUN: from the company project root:  sh setup-local-guard.sh
# RE-RUN once per machine / per fresh clone (.git/ contents never travel).

set -e

# --- single source of truth for what counts as a stack file ---
EXCLUDE_LIST='CLAUDE.md
ANTI-HALLUCINATION-RULES.md
AUTO-FIX-PROTOCOL.md
QA-SKILLS-CHEATSHEET.md
LOCAL-GUARD-SETUP.md
INSTALL.md
skills/
agent-factory/
agent-factory-cli/
knowledge-base/
rules/
scripts/rule-engine.js
settings-hooks.json
package-scripts.json
verify-locators-*
progress.md
rca-log.md
findings.md
task_plan.md
.env
.env.*
.vercel/'

# grep -E pattern used by both the tracked-scan and the pre-commit hook
SCAN_RE='CLAUDE\.md|ANTI-HALLUCINATION|AUTO-FIX|QA-SKILLS|LOCAL-GUARD|INSTALL\.md|knowledge-base/|^skills/|agent-factory|rule-engine|framework-rule-engine|settings-hooks|package-scripts|verify-locators-|progress\.md|rca-log\.md|findings\.md|task_plan\.md|\.env|\.vercel/'

# tracked paths to untrack if found (folders + root files; --cached keeps them on disk)
UNTRACK_PATHS='CLAUDE.md ANTI-HALLUCINATION-RULES.md AUTO-FIX-PROTOCOL.md QA-SKILLS-CHEATSHEET.md LOCAL-GUARD-SETUP.md INSTALL.md skills agent-factory agent-factory-cli knowledge-base rules scripts/rule-engine.js settings-hooks.json package-scripts.json'

bar() { echo "════════════════════════════════════════════════════"; }

# --- 1. sanity: in a git repo, and NOT the stack repo ---
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: not inside a git repo. cd into the company project first."
  exit 1
fi
GITDIR=$(git rev-parse --git-dir)
ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
case "$ORIGIN" in
  *AI_E2E_QA_Automation_Playwright_Master_Framework*)
    echo "ERROR: this looks like the STACK repo (origin: $ORIGIN)."
    echo "Stack files belong TRACKED here. Do NOT run the guard on the stack repo."
    exit 1 ;;
esac
echo "Repo OK. origin: ${ORIGIN:-<none>}"

# --- 2. block list -> .git/info/exclude (replace our managed block, idempotent) ---
EXCL="$GITDIR/info/exclude"
mkdir -p "$GITDIR/info"
touch "$EXCL"
# strip any previous managed block, then append fresh
sed '/# >>> qa-ai-stack guard >>>/,/# <<< qa-ai-stack guard <<</d' "$EXCL" > "$EXCL.tmp" && mv "$EXCL.tmp" "$EXCL"
{
  echo "# >>> qa-ai-stack guard >>>"
  echo "# Private qa-ai-stack — LOCAL ONLY, never push. Managed by setup-local-guard.sh."
  echo "$EXCLUDE_LIST"
  echo "# <<< qa-ai-stack guard <<<"
} >> "$EXCL"
echo "Guard A: block list written to $EXCL"

# --- 3. pre-commit hook ---
HOOK="$GITDIR/hooks/pre-commit"
mkdir -p "$GITDIR/hooks"
cat > "$HOOK" <<EOF
#!/bin/sh
# Local guard — blocks committing private qa-ai-stack files. Never pushed.
BLOCKED='$SCAN_RE'
STAGED=\$(git diff --cached --name-only | grep -E "\$BLOCKED")
if [ -n "\$STAGED" ]; then
  echo "════════════════════════════════════════════════════"
  echo "  COMMIT BLOCKED — private qa-ai-stack files staged:"
  echo "════════════════════════════════════════════════════"
  echo "\$STAGED" | sed 's/^/  x /'
  echo "════════════════════════════════════════════════════"
  echo "  LOCAL-ONLY. Unstage:  git restore --staged <file>"
  echo "════════════════════════════════════════════════════"
  exit 1
fi
exit 0
EOF
chmod +x "$HOOK"
echo "Guard B: pre-commit hook installed at $HOOK"

# --- 4. untrack if already tracked (cloned-from-stack case) ---
TRACKED=$(git ls-files | grep -E "$SCAN_RE" || true)
if [ -n "$TRACKED" ]; then
  bar
  echo "  Stack files ALREADY TRACKED — untracking (files stay on disk):"
  echo "$TRACKED" | sed 's/^/    /'
  bar
  for p in $UNTRACK_PATHS; do
    git rm -r --cached --ignore-unmatch "$p" >/dev/null 2>&1 || true
  done
  git commit -m "chore: untrack private qa-ai-stack files" >/dev/null 2>&1 || true
  echo "Untracked + committed the removal. Push this so the company remote drops them."
else
  echo "No tracked stack files (untracked case) — exclude is sufficient."
fi

# --- 5. self-test the hook ---
echo "Self-test: forcing CLAUDE.md to prove the hook fires..."
HADCLAUDE=0; [ -f CLAUDE.md ] && HADCLAUDE=1
[ "$HADCLAUDE" = "0" ] && echo "guard-test" > CLAUDE.md
git add -f CLAUDE.md >/dev/null 2>&1 || true
if git commit -m "guard self-test (should be blocked)" >/dev/null 2>&1; then
  echo "  FAIL: commit went through — hook did NOT block. Investigate."
  git reset --soft HEAD~1 >/dev/null 2>&1 || true
else
  echo "  PASS: hook blocked the forced commit."
fi
git rm --cached CLAUDE.md >/dev/null 2>&1 || true
[ "$HADCLAUDE" = "0" ] && rm -f CLAUDE.md

# --- final scan ---
bar
LEAK=$(git ls-files | grep -E "$SCAN_RE" || true)
if [ -n "$LEAK" ]; then
  echo "  RESULT: LEAK — these are still tracked:"
  echo "$LEAK" | sed 's/^/    /'
  echo "  Run: git rm -r --cached <path> then commit."
  bar
  exit 1
fi
echo "  RESULT: CLEAN — no stack files tracked. Safe to push."
bar
echo "Rule: stage by name. Never 'git add -A' / 'git add .'. Never '--no-verify'."

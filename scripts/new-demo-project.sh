#!/usr/bin/env bash
# Scaffold a demo/E2E project with the CURRENT stack state.
#
#   bash scripts/new-demo-project.sh <ProjectName> <AppURL> [JiraProject]
#
# Everything is copied from qa-ai-stack at RUN TIME, so a project created
# today carries today's rules, templates and config — never a snapshot frozen
# into this script. Update the stack, and the next project inherits it.
#
# Ends with a self-verifying preflight. If any REQUIRED check fails the script
# exits non-zero, so a broken scaffold can never be handed to a demo silently.
set -euo pipefail

NAME="${1:?usage: new-demo-project.sh <ProjectName> <AppURL> [JiraProject]}"
URL="${2:?usage: new-demo-project.sh <ProjectName> <AppURL> [JiraProject]}"
PROJ="${3:-SCRUM}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK="$ROOT/qa-ai-stack"
DEST="$ROOT/$NAME"

[ -e "$DEST" ] && { echo "ERROR: $DEST already exists — pick another name or delete it first."; exit 1; }
[ -d "$STACK" ] || { echo "ERROR: qa-ai-stack not found at $STACK — it is the source of every template."; exit 1; }

echo "==> scaffolding $NAME  (app: $URL, jira: $PROJ)"
mkdir -p "$DEST"/{src/pages,src/fixtures,tests/ui,knowledge-base/"$PROJ",knowledge-base/_TEMPLATE,scripts,output}

# --- knowledge base (REQUIRED — skills read these by path; missing = SILENT degradation)
cp "$STACK"/knowledge-base/_TEMPLATE/*.md   "$DEST/knowledge-base/_TEMPLATE/"
cp "$STACK"/knowledge-base/_TEMPLATE/*.json "$DEST/knowledge-base/_TEMPLATE/"
cp "$STACK"/knowledge-base/_TEMPLATE/*.md   "$DEST/knowledge-base/$PROJ/"
cp "$STACK"/knowledge-base/_TEMPLATE/*.json "$DEST/knowledge-base/$PROJ/"
cp "$STACK/knowledge-base/GUIDE.md"         "$DEST/knowledge-base/"

# --- .gitkeep so the generated dirs survive a clone.
# Git does not track empty directories, so without these a fresh clone has no
# tests/ui, src/pages or output — and Playwright's testDir points at a path
# that does not exist.
cat > "$DEST/tests/ui/.gitkeep" <<'K'
Specs are generated here by /test-case-creation.
Kept in git so a fresh clone has the directory Playwright's testDir expects.
K
echo "Page Objects are generated here by /explore." > "$DEST/src/pages/.gitkeep"
echo "Fixture DI lives here when a project needs it." > "$DEST/src/fixtures/.gitkeep"
echo "Closure reports are written here by /test-closure." > "$DEST/output/.gitkeep"

# --- localhost DOM fallback (only needed when the AUT is on localhost)
cp "$STACK/scripts/fetch-local-page.js" "$DEST/scripts/"

# --- config: stack template, baseURL repointed at this project's app
sed "s|'http://localhost:7000'|process.env.BASE_URL ?? '$URL'|g" \
  "$STACK/playwright.config.template.ts" > "$DEST/playwright.config.ts"

cp "$STACK/tsconfig.template.json" "$DEST/tsconfig.json"
cp "$STACK/gitignore.template"     "$DEST/.gitignore"

# --- rulebooks: reference copies, clearly marked non-authoritative
for f in ANTI-HALLUCINATION-RULES.md AUTO-FIX-PROTOCOL.md; do
  {
    echo "> **Reference copy.** The authoritative version lives at the workspace root:"
    echo "> \`$ROOT/$f\`"
    echo "> These rules are already **inlined inside each skill** — no skill reads this file by path."
    echo "> If it disagrees with the root copy, the root copy wins."
    echo
    cat "$ROOT/$f"
  } > "$DEST/$f"
done

# --- package.json
LOWER="$(echo "$NAME" | tr '[:upper:]' '[:lower:]')"
cat > "$DEST/package.json" <<JSON
{
  "name": "$LOWER",
  "version": "1.0.0",
  "private": true,
  "description": "E2E QA project — requirement-driven generation, governed failure triage, counted closure",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "report": "playwright show-report",
    "typecheck": "tsc --noEmit",
    "allure:generate": "allure generate allure-results --clean -o allure-report",
    "allure:open": "allure open allure-report",
    "allure:serve": "allure serve allure-results"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^22.0.0",
    "allure-playwright": "^3.10.2",
    "typescript": "^5.6.0"
  }
}
JSON

echo "==> installing dependencies"
( cd "$DEST" && npm install --silent )

# ---------------------------------------------------------------------------
# PREFLIGHT — verify the artefacts, never the exit messages.
# A scaffold that "ran fine" but is missing the KB degrades SILENTLY at
# execution time, so every REQUIRED row below is a hard failure.
# ---------------------------------------------------------------------------
echo
echo "==> preflight"
FAIL=0
req() { # req <label> <actual> <expected>
  if [ "$2" = "$3" ]; then printf "  PASS  %-34s %s\n" "$1" "$2"
  else printf "  FAIL  %-34s got=%s want=%s\n" "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}
warn() { # warn <label> <actual> <expected>
  if [ "$2" = "$3" ]; then printf "  PASS  %-34s %s\n" "$1" "$2"
  else printf "  WARN  %-34s got=%s want=%s\n" "$1" "$2" "$3"; fi
}

cd "$DEST"
req  "headed mode (AH Rule 17)"      "$(grep -c 'headless: false' playwright.config.ts)" "1"
req  "allure reporter"               "$(grep -c 'allure-playwright' playwright.config.ts)" "1"
# 2 = outputDir + the json reporter's outputFile; both must be per-run.
req  "RUN_ID isolation (AH Rule 31)" "$(grep -c 'test-results/\${RUN_ID}' playwright.config.ts)" "2"
req  "baseURL points at the app"     "$(grep -c "$URL" playwright.config.ts)" "2"
req  "no localhost left in config"   "$(grep -c 'localhost:7000' playwright.config.ts)" "0"
req  "knowledge-base/$PROJ files"    "$(ls knowledge-base/$PROJ | wc -l | tr -d ' ')" "5"
req  "rulebook reference copies"     "$(ls *.md 2>/dev/null | grep -cE 'ANTI|AUTO')" "2"
req  "allure npm scripts"            "$(node -e "console.log(Object.keys(require('./package.json').scripts).filter(k=>k.startsWith('allure')).length)")" "3"
req  "tsconfig present"              "$([ -f tsconfig.json ] && echo 1 || echo 0)" "1"
req  "gitignore present"             "$([ -f .gitignore ] && echo 1 || echo 0)" "1"
req  "gitkeep files (survive clone)" "$(find . -name '.gitkeep' -not -path './node_modules/*' | wc -l | tr -d ' ')" "4"
req  "clean slate — specs"           "$(ls tests/ui/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')" "0"
req  "clean slate — POMs"            "$(ls src/pages/*.ts 2>/dev/null | wc -l | tr -d ' ')" "0"
warn "allure CLI available"          "$(npx --no-install allure --version >/dev/null 2>&1 && echo 1 || echo 0)" "1"

if npm run typecheck --silent >/dev/null 2>&1; then
  printf "  PASS  %-34s clean\n" "typecheck"
else
  printf "  FAIL  %-34s tsc errors\n" "typecheck"; FAIL=$((FAIL+1))
fi

echo
if [ "$FAIL" -ne 0 ]; then
  echo "PREFLIGHT FAILED: $FAIL required check(s). Do NOT demo from $NAME until fixed."
  exit 1
fi
echo "PREFLIGHT PASSED — $DEST is ready."

cat <<NEXT

Still to do by hand:
  1. Create the Jira Epic, then write $NAME/CLAUDE.md with its key + the app URL.
     Verify the Epic has 0 children before using it.
     If createJiraIssue's response archives, do NOT take the key from it —
     confirm the issue exists via mcp__atlassian__search first.
  2. npx playwright install            (first time on this machine only)
  3. Allure CLI, if the WARN above fired:
       npm i -g allure-commandline
     View ONLY over HTTP: npm run allure:serve
     (file:// leaves every widget stuck on "Loading...")
  4. /explore $URL

The KB ships as bare templates on purpose. /test-case-creation seeds
business-rules.md from the Epic ACs, and /test-case-execution gates on it —
every BR-xx Source must cite the Epic under test, or defects get tiered
against requirements that no longer apply.
NEXT

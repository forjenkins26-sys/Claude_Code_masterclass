#!/usr/bin/env bash
# Scaffold a fresh demo project with the CURRENT stack state.
#
#   bash scripts/new-demo-project.sh <ProjectName> <AppURL> [JiraProject]
#
# Everything is copied from the workspace root at run time, so a project
# created today carries today's rules, KB template and config — never a
# snapshot from whenever this script was written.
set -euo pipefail

NAME="${1:?usage: new-demo-project.sh <ProjectName> <AppURL> [JiraProject]}"
URL="${2:?usage: new-demo-project.sh <ProjectName> <AppURL> [JiraProject]}"
PROJ="${3:-SCRUM}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/$NAME"

[ -e "$DEST" ] && { echo "ERROR: $DEST already exists — pick another name or delete it first."; exit 1; }

echo "==> scaffolding $NAME  (app: $URL, jira: $PROJ)"
mkdir -p "$DEST"/{src/pages,src/fixtures,tests/ui,knowledge-base/"$PROJ",knowledge-base/_TEMPLATE,scripts,output}

# --- knowledge base (REQUIRED — skills read these by path; missing = silent degradation)
cp "$ROOT"/knowledge-base/_TEMPLATE/*.md  "$DEST/knowledge-base/_TEMPLATE/"
cp "$ROOT"/knowledge-base/_TEMPLATE/*.json "$DEST/knowledge-base/_TEMPLATE/"
cp "$ROOT"/knowledge-base/_TEMPLATE/*.md  "$DEST/knowledge-base/$PROJ/"
cp "$ROOT"/knowledge-base/_TEMPLATE/*.json "$DEST/knowledge-base/$PROJ/"
cp "$ROOT/knowledge-base/GUIDE.md"         "$DEST/knowledge-base/"

# --- localhost DOM fallback (only needed if the AUT is on localhost)
cp "$ROOT/scripts/fetch-local-page.js" "$DEST/scripts/"

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
cat > "$DEST/package.json" <<JSON
{
  "name": "$(echo "$NAME" | tr '[:upper:]' '[:lower:]')",
  "version": "1.0.0",
  "private": true,
  "description": "Demo project — AI-powered E2E QA framework",
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

# --- playwright.config.ts (headed per AH Rule 17; RUN_ID isolation per AH Rule 31)
cat > "$DEST/playwright.config.ts" <<CONFIG
import { defineConfig, devices } from '@playwright/test';

/**
 * RUN_ID keeps each execution's artefacts separate (AH Rule 31) — test-results/
 * is wiped on EVERY invocation, including one that matches zero tests.
 */
const RUN_ID = (() => {
  // Workers re-evaluate this module, so a bare new Date() would yield a
  // DIFFERENT folder per worker. Stamp it once and let workers inherit it.
  if (!process.env.PW_RUN_ID) {
    process.env.PW_RUN_ID =
      process.env.RUN_ID ||
      new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  }
  return process.env.PW_RUN_ID;
})();

export default defineConfig({
  testDir: './tests',
  outputDir: \`test-results/\${RUN_ID}\`,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: \`playwright-report/\${RUN_ID}\`, open: 'never' }],
    ['json', { outputFile: \`test-results/\${RUN_ID}/results.json\` }],
    // Allure — per-run results dir so \`allure generate\` can build cross-run trends.
    // REQUIRED by /test-closure Step 4B: closure attaches this as the evidence report.
    // Consumed as EVIDENCE only — progress.md stays the pass/fail oracle.
    ['allure-playwright', {
      resultsDir: \`allure-results/\${RUN_ID}\`,
      environmentInfo: {
        RUN_ID,
        BASE_URL: process.env.BASE_URL ?? '$URL',
        mode: 'headed',
      },
    }],
  ],

  use: {
    // AH Rule 17 — headed mode is mandatory. Never flip this to true.
    headless: false,
    baseURL: process.env.BASE_URL ?? '$URL',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    viewport: { width: 1536, height: 864 },
    ignoreHTTPSErrors: true,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
CONFIG

# --- tsconfig
cat > "$DEST/tsconfig.json" <<'TS'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": { "@pages/*": ["src/pages/*"], "@fixtures/*": ["src/fixtures/*"] }
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"],
  "exclude": ["node_modules", "test-results", "playwright-report"]
}
TS

# --- gitignore
cat > "$DEST/.gitignore" <<'IGN'
node_modules/
test-results/
playwright-report/
allure-results/
allure-report/
screenshots/
.env
.vercel/
*.log
IGN

echo "==> installing dependencies"
( cd "$DEST" && npm install --silent )

echo
echo "DONE: $DEST"
echo
echo "Still to do by hand:"
echo "  1. Create the Jira Epic, then write $NAME/CLAUDE.md with its key + the app URL"
echo "  2. npx playwright install   (first time on this machine only)"
echo "  2b. Allure CLI (first time on this machine only) — needed by /test-closure Step 4B:"
echo "        npm i -g allure-commandline     # or: npx allure --version"
echo "      View ONLY over HTTP: npm run allure:serve   (file:// leaves widgets on 'Loading...')"
echo "  3. /explore $URL"

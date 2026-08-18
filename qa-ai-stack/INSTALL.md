# QA AI Stack — Bootstrap Install

Drop this folder into any Playwright TypeScript project. Then give Claude this prompt:

---

## Bootstrap Prompt (copy-paste to Claude)

```
I have a qa-ai-stack/ folder in this repo. It contains a complete AI QA automation stack.
Please install everything:

1. Copy qa-ai-stack/skills/* into ~/.claude/skills/ (one subfolder per skill)
2. Merge the hooks from qa-ai-stack/settings-hooks.json into ~/.claude/settings.json
   - Replace <YOUR_PROJECT_PATH> with the absolute path to this Playwright project
   - Preserve all existing hooks — append only
3. Copy qa-ai-stack/agent-factory/ → agent-factory-cli/ (sibling of this Playwright project folder)
4. Copy qa-ai-stack/scripts/rule-engine.js → scripts/rule-engine.js
5. Copy qa-ai-stack/rules/framework-rule-engine.json → rules/framework-rule-engine.json
6. Copy qa-ai-stack/ANTI-HALLUCINATION-RULES.md → project root
7. Copy qa-ai-stack/AUTO-FIX-PROTOCOL.md → project root
8. Copy qa-ai-stack/QA-SKILLS-CHEATSHEET.md → project root
9. Copy qa-ai-stack/CLAUDE.md → project root
   - If the project ALREADY has a CLAUDE.md, MERGE the QA sections in (Hard Rules,
     Knowledge Base, 3-Step Flow, agent-factory table) — do not overwrite the host's own content
10. Copy qa-ai-stack/knowledge-base/ → project root (GUIDE.md + _TEMPLATE/)
    - Then start a product KB: cp -r knowledge-base/_TEMPLATE knowledge-base/<YOUR_JIRA_PROJECT>
11. Add .env + .vercel/ to .gitignore (secrets policy — see CLAUDE.md). Verify: git check-ignore .env
12. Merge scripts from qa-ai-stack/package-scripts.json into this project's package.json
    - Update agent-factory path if folder structure differs
13. If this is a COMPANY repo (stack must stay private, never pushed): run `/guard` (the guard skill).
    It adds a local-only ignore (.git/info/exclude) + a pre-commit hook (.git/hooks/pre-commit) so the
    stack files are invisible to the company's git and cannot be pushed, then self-tests + scans for leaks.
    (Manual fallback: qa-ai-stack/LOCAL-GUARD-SETUP.md / setup-local-guard.sh.)
    The hook + exclude live in .git/ — NOT cloned and NOT pushed — re-run `/guard` once per machine / per clone.

After install verify:
- Run: npm run rules:check → should scan .ts files
- Confirm skills exist: ~/.claude/skills/explore, test-case-creation, test-case-execution, test-closure, bug-triage, create-bug, karpathy-guidelines, guard
- Confirm CLAUDE.md, ANTI-HALLUCINATION-RULES.md (32 rules), AUTO-FIX-PROTOCOL.md (17 rules), knowledge-base/ in project root
- Confirm hooks in ~/.claude/settings.json: Bash matcher (ai:rca reminder) + Write|Edit matcher (rules:check)

Then show me the 3-step QA flow for this project.
```

---

## What Gets Installed

| Component | What it does |
|---|---|
| `/guard` skill | One command to keep the stack OFF the company git — installs a `.git/hooks/pre-commit` + `.git/info/exclude` (both local-only). Self-tests + scans for leaks. Refuses on the stack repo. Re-run per machine/clone |
| `/explore` skill | Live DOM → TypeScript POM, 95% accuracy |
| `/test-case-creation` skill | Epic AC → Jira test cases + spec file |
| `/test-case-execution` skill | Runs tests, auto-fixes locators, files bugs, updates Jira |
| `/test-closure` skill | AC→test traceability matrix, counted coverage, defect tiering, go/no-go verdict |
| `/bug-triage` skill | Manual bug investigation fallback |
| `/create-bug` skill | Manual Jira bug creation fallback |
| `playwright-ai-mcp-tutor` skill | 3-agent Planner/Generator/Healer workflow |
| `karpathy-guidelines` skill | Coding-discipline guardrail — surgical changes, simplicity-first, surface assumptions, goal-driven loops (applies to all POM/spec/server edits) |
| `agent-factory-cli/` | RCA/Heal/Flaky/Triage AI agents |
| `rule-engine.js` | Enforces POM/spec file placement + naming + tags |
| `framework-rule-engine.json` | Rules config — edit to match your folder structure |
| `ANTI-HALLUCINATION-RULES.md` | 32 rules preventing selector guessing, wrong assertions (Rule 25: KB bug-oracle + Confirmed/Suspected tiers) |
| `knowledge-base/_TEMPLATE/` | Per-product memory scaffold — copy to `knowledge-base/<PROJECT>/`. 4 files: business-rules (bug oracle), known-defects (dedup), feature-map (regression scope), product-flows |
| `AUTO-FIX-PROTOCOL.md` | 17 rules for autonomous fix (max 3 attempts before escalate; Rule 16 = surgical changes; Rule 17 = independent verify, maker≠checker) |
| `CLAUDE.md` | Stack constitution — Hard Rules, 3-step flow, KB, agent-factory verdict table. Copy/merge into host project root |
| `QA-SKILLS-CHEATSHEET.md` | One-page reference for the 3-step flow + gotchas |
| `LOCAL-GUARD-SETUP.md` | Company-repo privacy — 2 prompts to keep the stack OFF the company GitHub (local `.git/info/exclude` + pre-commit hook). Re-run per machine/clone |
| settings-hooks | Auto-triggers ai:rca on test failure + rules:check on file write |

---

## 5-Skill Flow (after install)

```
User Story assigned
      ↓
1. /explore <url>              ← POM from live DOM
      ↓
2. /test-case-creation EPIC-XX ← test cases from Epic AC → Jira + spec
      ↓
3. /test-case-execution EPIC-XX ← runs tests, auto-fixes, files bugs
4. /test-closure EPIC-XX        ← coverage matrix + go/no-go verdict
      ↓
   ALL PASS → DONE ✅
      ↓
   FAIL → hook fires ⚠️ → npm run ai:rca → follow verdict
      ↓
4. /bug-triage (manual fallback only)
5. /create-bug (manual fallback only)
```

---

## Folder Structure Required

```
your-company-project/
  playwright-project/          ← your Playwright TypeScript project
    scripts/rule-engine.js     ← installed from qa-ai-stack
    rules/framework-rule-engine.json
    ANTI-HALLUCINATION-RULES.md
    AUTO-FIX-PROTOCOL.md
    package.json               ← add scripts from package-scripts.json
  agent-factory-cli/           ← installed from qa-ai-stack (sibling folder)
    ai-agents/

~/.claude/
  skills/
    explore/
    test-case-creation/
    test-case-execution/
    test-closure/
    bug-triage/
    create-bug/
    playwright-ai-mcp-tutor/
    karpathy-guidelines/
  settings.json                ← hooks merged from settings-hooks.json
```

---

## Customize for New Company

Edit `rules/framework-rule-engine.json` to match folder structure:
- Change `sourceRoots` if project uses `src/test/` instead of `tests/ui/`
- Change `placementRules` fileRegex if naming convention differs
- Add `contentRules` for company-specific patterns (e.g., required ticket tags)

Edit `settings-hooks.json`:
- Replace `<YOUR_PROJECT_PATH>` with absolute path to Playwright project

That's it. Full AI QA automation live in 10 minutes.


## New E2E project from scratch (copy-paste)

Everything a project needs so the 4-step flow works identically every time.

```bash
PROJ=my-e2e-project
JIRA=SCRUM                      # your Jira project key
STACK=/path/to/qa-ai-stack

mkdir -p $PROJ/src/pages $PROJ/src/fixtures $PROJ/tests/ui $PROJ/scripts $PROJ/knowledge-base
cd $PROJ

# REQUIRED - loaded by path, fails SILENTLY if absent
cp -r $STACK/knowledge-base/_TEMPLATE knowledge-base/$JIRA
cp $STACK/knowledge-base/GUIDE.md knowledge-base/

# REQUIRED - localhost DOM fetcher (WebFetch cannot reach localhost)
cp $STACK/scripts/fetch-local-page.js scripts/

# REQUIRED - per-run outputDir + Allure (AH Rule 31)
cp $STACK/playwright.config.template.ts playwright.config.ts
cp $STACK/tsconfig.template.json tsconfig.json
cp $STACK/gitignore.template .gitignore

# REQUIRED - project constitution; replace every {PLACEHOLDER}
cp $STACK/CLAUDE.template.md CLAUDE.md

# OPTIONAL - long-form reference (rules are already inlined in the skills)
cp $STACK/ANTI-HALLUCINATION-RULES.md $STACK/AUTO-FIX-PROTOCOL.md .

npm init -y
npm i -D @playwright/test @types/node typescript
npm i -D allure-playwright          # optional, for /test-closure Step 4B
npx playwright install chromium
```

Then merge the scripts from `package-scripts.json` into `package.json`, and edit `CLAUDE.md`: app URL, Jira project + Epic key, and the hard rules.

**Verify before the first run:**

```bash
ls knowledge-base/$JIRA/          # 4 files - REQUIRED
grep headless playwright.config.ts # must be false (AH Rule 17)
node scripts/fetch-local-page.js <your-url>   # must return real element ids
```

**What is REQUIRED vs OPTIONAL**

| Item | Required? | Why |
|---|---|---|
| `knowledge-base/<JIRA_PROJECT>/` | **YES** | Loaded by path; missing = silent loss of bug tiers + dedup |
| `CLAUDE.md` | **YES** | App URL, Jira key, hard rules |
| `playwright.config.ts` (from template) | **YES** | Headed mode + per-run `outputDir` (AH Rule 31) |
| `scripts/fetch-local-page.js` | Only for localhost | WebFetch cannot reach localhost |
| `ANTI-HALLUCINATION-RULES.md` / `AUTO-FIX-PROTOCOL.md` | No | Rules are inlined in each SKILL.md; these are reference |
| Skills | Never copy | Global at `~/.claude/skills/`, travel to every project |

---

# AI Buddy PRD → TestCases WorkFlow E2E

n8n workflow: Upload PRD PDF → AI generates 3 test artifacts → saves to Google Drive.

## Workflow

```
Upload PRD PDF (Form) → Extract PDF Text → Generate Test Artifacts (AI Agent) → Split AI Output → Google Drive (3 files)
```

## Nodes

| Node | Type | Purpose |
|---|---|---|
| Upload PRD PDF | Form Trigger | User uploads .pdf file |
| Extract PDF Text | Extract From File | Pulls raw text from PDF |
| Generate Test Artifacts | AI Agent (GROQ) | Generates test_plan + test_cases + playwright tests |
| Split AI Output | Code (JS) | Splits AI output on `===` separators |
| Create test_plan.md | Google Drive | Saves markdown test plan |
| Create test_cases.csv | Google Drive | Saves CSV test cases (20 rows) |
| Create playwright_test_cases.md | Google Drive | Saves Playwright TypeScript spec |

## Model

- **GROQ**: `llama-3.3-70b-versatile`
- DO NOT use `qwen/qwen3-32b` — thinking mode outputs `<think>` blocks into files

## Files in This Folder

```
AI Buddy PRD_TestCases_WorkFlow_E2E.json  ← import this into n8n
PROMPTS.md                                 ← system message + prompt field used
README.md                                  ← this file
sample_outputs/
  test_plan.md                             ← sample generated test plan
  test_cases.csv                           ← sample generated test cases (20 rows)
  playwright_test_cases.md                 ← sample generated Playwright tests (20 tests)
```

## How to Use

1. Import `AI Buddy PRD_TestCases_WorkFlow_E2E.json` into n8n
2. Connect GROQ credentials
3. Connect Google Drive OAuth2 credentials
4. Activate workflow
5. Open form URL → upload PRD PDF
6. Check Google Drive root for 3 generated files

## Next Steps After Generation

- Run `/explore https://app.vwo.com` in Claude Code to get real DOM selectors
- Replace `// VERIFICATION REQUIRED` selectors with verified locators
- Move `playwright_test_cases.md` content into `Playwright Automation Framework/tests/ui/`

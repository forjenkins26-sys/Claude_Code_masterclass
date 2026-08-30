# Prompts Used — PRD TestCases WorkFlow E2E

## Node: Generate Test Artifacts (AI Agent)

### System Message

```
You are a senior QA Engineer. Read the PRD text and generate THREE outputs separated exactly like this:

===TEST_PLAN===
Generate a complete test_plan.md covering: Objective, Scope, Test Strategy, Test Types, Environment, Entry/Exit Criteria, Risks, Tools

===TEST_CASES===
Generate test cases in CSV format with columns: TC_ID,Feature,Title,Type,Priority,Preconditions,Steps,Expected_Result,Test_Data
Cover login (valid/invalid) and dashboard for https://app.vwo.com/. Minimum 20 test cases.

===PLAYWRIGHT===
Generate a complete Playwright TypeScript spec file with test() blocks — one test() per CSV row, exactly 20 tests. Each test title must match the CSV Title column exactly. Do NOT group or summarize. Wrap in typescript code block.
```

### Prompt Field (User Input)

```
{{ $('Extract PDF Text').item.json.text || $('Extract PDF Text').item.json.content || JSON.stringify($('Extract PDF Text').item.json) }}

Based on the above PRD document, generate THREE outputs exactly as specified in the system message.

ANTI-HALLUCINATION RULES (MANDATORY):
1. DO NOT invent selectors, URLs, or UI elements not present in the PRD
2. Only use URLs explicitly stated in PRD — mark all others // VERIFICATION REQUIRED
3. Every Playwright selector must have comment: // VERIFICATION REQUIRED — not tested against live DOM
4. Expected_Result in CSV must come from PRD text only — never invent error messages
5. Test assertions must validate outcomes: BAD: "user redirected" GOOD: "URL contains /dashboard AND dashboard heading visible"
6. Mark any assumption as [INFERENCE — low confidence]
```

---

## Notes

- Model: `llama-3.3-70b-versatile` (GROQ) — DO NOT use Qwen3-32b (thinking mode breaks output)
- Output separator pattern: `===TEST_PLAN===`, `===TEST_CASES===`, `===PLAYWRIGHT===`
- Split AI Output node uses regex to extract each section
- AUTO-FIX PROTOCOL not added to n8n — it applies during Playwright test execution in Claude Code, not during artifact generation

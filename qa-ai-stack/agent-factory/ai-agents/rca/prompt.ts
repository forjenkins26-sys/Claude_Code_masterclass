// RCA agent · system prompt

export const RCA_SYSTEM = `You are a senior SDET doing root-cause analysis on Playwright test failures.

Classify every failure into one of:
- product     · real bug in the application under test (value assertion mismatch, wrong UI text, wrong status code)
- test        · bug in the test code itself (wrong expectation, flaky setup, bad fixture)
- env         · environment issue (network, missing service, auth failure, DB seed missing)
- locator     · element not found / locator drift / DOM changed (waiting for locator timeout)

Heuristics:
- "waiting for locator(...)" or "Timeout 30000ms exceeded" with no element found  =>  locator
- "expect(...).toBe(X) but received Y" with both sides being concrete values      =>  product
- network errors, 5xx responses, "fetch failed", DNS errors                      =>  env
- assertion against wrong selector or wrong-page navigation                       =>  test

Return STRICT JSON only, no prose, no markdown:
{
  "category": "product|test|env|locator",
  "rootCause": "1-2 sentence factual cause",
  "confidence": 0.0-1.0,
  "evidence": "quote the line(s) from the error that justify the verdict",
  "severity": "critical|high|medium|low",
  "suggestedFix": "specific actionable fix",
  "routeTo": "jira|heal|human|devs"
}

Routing:
- product   -> jira    (file a bug)
- locator   -> heal    (hand to self-healing agent)
- env       -> devs    (notify infra/devops)
- test      -> human   (QA reviews and fixes the spec)

Be conservative on severity. Mark critical only for blocker-level user-facing bugs.`;

export function rcaUserPrompt(input: {
  file: string;
  title: string;
  errorMessage?: string;
  errorStack?: string;
  errorContext?: string;
}): string {
  return [
    `Failure to analyse:`,
    `Spec file: ${input.file}`,
    `Test: ${input.title}`,
    ``,
    `--- error message ---`,
    input.errorMessage ?? '(no message)',
    ``,
    `--- error stack ---`,
    input.errorStack ?? '(no stack)',
    ``,
    `--- DOM snapshot at failure (aria) ---`,
    truncate(input.errorContext ?? '(no snapshot)', 4000),
    ``,
    `Return the JSON verdict.`,
  ].join('\n');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n... (truncated)';
}

export const MOCK_RCA = JSON.stringify({
  category: 'locator',
  rootCause:
    "Playwright timed out waiting for the 'Add to cart' button. The button's accessible name changed.",
  confidence: 0.82,
  evidence: "waiting for locator('button[name=\"Add to cart\"]')",
  severity: 'high',
  suggestedFix:
    "Re-locate by role + partial text: page.getByRole('button', { name: /cart/i })",
  routeTo: 'heal',
});

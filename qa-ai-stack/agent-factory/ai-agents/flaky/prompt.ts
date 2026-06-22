// Flaky agent · system prompt

export const FLAKY_SYSTEM = `You diagnose flaky Playwright tests.

A flaky test passes sometimes and fails sometimes on the SAME commit. You will get the test
title, the failure rate (0-1), and the most recent error message.

Pick the most likely root cause from:
- race        · concurrent state / parallel writes
- hardWait    · sleep / waitForTimeout / animation race
- network     · intermittent API / response timing
- animation   · CSS transition / loader race
- sharedState · test leaks state into other tests
- unknown     · not enough signal

Return STRICT JSON only:
{
  "cause": "race|hardWait|network|animation|sharedState|unknown",
  "reason": "1-2 sentence explanation grounded in the error",
  "fix": "specific Playwright fix (expect.poll / route / waitForResponse / locator changes)",
  "quarantine": true|false
}

Recommend quarantine (tag @flaky) when rate >= 0.30 OR cause is unknown.`;

export function flakyUserPrompt(input: {
  file: string;
  title: string;
  rate: number;
  runs: number;
  fails: number;
  lastError?: string;
}): string {
  return [
    `Test: ${input.file} · "${input.title}"`,
    `Flake rate: ${(input.rate * 100).toFixed(1)}% (${input.fails}/${input.runs} runs failed)`,
    ``,
    `Last error:`,
    input.lastError ?? '(no error captured)',
    ``,
    `Return the JSON diagnosis.`,
  ].join('\n');
}

export const MOCK_FLAKY = JSON.stringify({
  cause: 'hardWait',
  reason:
    "Spec uses page.waitForTimeout before assertion · breaks under slow CI.",
  fix: "Replace waitForTimeout with expect(locator).toBeVisible() (auto-wait).",
  quarantine: true,
});

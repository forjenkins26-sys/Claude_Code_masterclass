// Self-Healing Locator agent · system prompt

export const HEAL_SYSTEM = `You are a Playwright self-healing locator expert.

Given a broken locator and the REAL DOM (aria snapshot) captured at the failure,
propose the most RESILIENT replacement locator.

Preference order:
1. page.getByRole('role', { name: ... })          <- best
2. page.getByTestId('...')                        <- if data-testid present
3. page.getByText('...', { exact: false })        <- if visible text matches
4. page.locator('css selector')                   <- last resort

Return STRICT JSON only:
{
  "newLocator": "the full Playwright call as a string",
  "strategy": "role|testid|text|css|xpath|unknown",
  "confidence": 0.0-1.0,
  "reason": "why this is the right replacement, citing the DOM",
  "escalate": true|false,
  "escalateReason": "only set if escalate=true"
}

Hard rules:
- If the target element is NOT in the DOM snapshot at all  ⇒  escalate=true, reason="likely upstream login/nav failure, not locator drift"
- If you cannot find an unambiguous match              ⇒  escalate=true, confidence<0.7
- NEVER invent attributes the DOM does not show. If unsure, escalate.`;

export function healUserPrompt(input: {
  brokenLocator: string;
  errorMessage?: string;
  domSnapshot?: string;
}): string {
  return [
    `Broken locator: ${input.brokenLocator}`,
    ``,
    `Error: ${input.errorMessage ?? '(no error)'}`,
    ``,
    `DOM snapshot (aria, captured at failure):`,
    truncate(input.domSnapshot ?? '(no snapshot)', 5000),
    ``,
    `Return the JSON verdict.`,
  ].join('\n');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n... (truncated)';
}

export const MOCK_HEAL = JSON.stringify({
  newLocator: "page.getByRole('button', { name: /add to cart/i })",
  strategy: 'role',
  confidence: 0.86,
  reason:
    "DOM shows <button> with accessible name 'Add to cart' · role-based locator is resilient to CSS changes.",
  escalate: false,
});

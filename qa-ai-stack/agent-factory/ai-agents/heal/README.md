# 🩹 Self-Healing Locator

Reads a broken locator + the real DOM (`error-context.md` aria snapshot) and proposes a resilient replacement.

## Preference order

1. `page.getByRole('role', { name: ... })`  ← best
2. `page.getByTestId('...')`
3. `page.getByText('...', { exact: false })`
4. `page.locator('css selector')`           ← last resort

## Confidence gate

`confidence < 0.7` ⇒ **DO NOT** patch, escalate to a human. We refuse to hallucinate a fix.

If the target element is not in the captured DOM at all, the agent escalates with `"likely upstream login/nav failure, not locator drift"`.

## Run

```bash
agent-factory-cli heal --report ./test-results/results.json
agent-factory-cli heal --report ./test-results/results.json --apply --pom ./src/pages/cart.ts
```

In Claude Code via `.claude/agents/heal.md`, the real Page Object is discovered automatically and the spec is re-run to verify.

## Verify-after-patch (CLI path)

`--apply` now re-runs the spec (`npx playwright test <file>`) right after patching.
Red run ⇒ auto-revert from `.bak`, `verdict.verified = false`. Green ⇒ `verdict.verified = true`.
Closes the gap where the standalone CLI used to write a patch with no check it actually fixed anything.

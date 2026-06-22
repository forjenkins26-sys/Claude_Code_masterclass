# 🎲 Flaky Detector

Reads N JSON reports from the **same commit** and finds tests that pass sometimes / fail sometimes.

Two passes:
1. **Statistical** · pure math · bucket every spec's pass/fail across runs · `0 < fails < runs` ⇒ flaky · rank by rate.
2. **Semantic** · LLM names the cause (`race | hardWait | network | animation | sharedState`) and proposes a concrete Playwright fix.

## Quarantine rule

`rate ≥ 30%` OR `cause == unknown` ⇒ recommend `@flaky` tag (skip on green CI, run only on nightly).

## Generate run history

```bash
mkdir -p runs
for i in $(seq 1 10); do
  npx playwright test --reporter=json > runs/r$i.json || true
done
agent-factory-cli flaky ./runs
```

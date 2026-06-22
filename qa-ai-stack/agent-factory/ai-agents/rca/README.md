# 🔍 RCA Agent

Reads a Playwright JSON report, classifies every failure into one of four buckets, and routes it.

## Categories

| Category | Meaning | Routes to |
|----------|---------|-----------|
| `product` | Real bug in the application | Jira (bug) |
| `test`    | Bug in the test code | Human (QA) |
| `env`     | Network / infra issue | DevOps |
| `locator` | Element not found / locator drift | Heal agent |

## Output shape

```json
{
  "category": "locator",
  "rootCause": "...",
  "confidence": 0.82,
  "evidence": "waiting for locator('button[name=\"Add to cart\"]')",
  "severity": "high",
  "suggestedFix": "Re-locate by role + partial text",
  "routeTo": "heal"
}
```

## Run

```bash
agent-factory-cli rca ./test-results/results.json
agent-factory-cli rca ./test-results/results.json --file-bugs --jira-project QA
```

## Inside Claude Code

Use the `.claude/agents/rca.md` subagent — it calls the Atlassian MCP to file the bug for real (with JQL dedup first).

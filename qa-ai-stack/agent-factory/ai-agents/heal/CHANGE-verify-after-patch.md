# Heal Agent — Verify-After-Patch Change

**Date:** 2026-07-11
**File:** `agent-factory-cli/ai-agents/heal/heal.agent.ts`
**Trigger:** gap found while comparing our self-heal agent against Slack's agentic E2E testing announcement (InfoQ, Jul 10 2026).

---

## Gap found

Two paths patch a broken Playwright locator:

| Path | Verifies patch before accepting it? |
|---|---|
| Claude Code subagent (`.claude/agents/heal.md`) | Yes — step 6 re-runs the spec, reverts on red |
| Standalone CLI (`heal.agent.ts`, `agent-factory-cli heal --apply`) | **No** — wrote the file + a `.bak`, then stopped |

The CLI path could confidently write a wrong selector and report success, because nothing ever re-ran the test or read the `.bak` back. Violates AUTO-FIX-PROTOCOL Rule 17 (maker ≠ checker, independent verify before DONE).

---

## Before

```ts
function patchPom(file: string, oldStr: string, newCall: string): void {
  // ...writes patched file + file.bak...
  fs.writeFileSync(file, patched);
  log.ok(`Patched ${file} · backup at ${file}.bak`);
}
```

Called from `runHeal()`:

```ts
if (opts.apply && opts.pomFile) {
  patchPom(opts.pomFile, broken, verdict.newLocator);
}
```

Patch applied → function returns → loop moves to next candidate. `.bak` written but never read again. No pass/fail signal on the verdict object.

---

## After

```ts
function patchPom(file: string, oldStr: string, newCall: string): boolean {
  // ...same write logic...
  return true;   // or false if file missing / locator not found
}

function verifySpec(specFile: string, pomFile: string): boolean {
  try {
    execSync(`npx playwright test "${specFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    const backup = pomFile + '.bak';
    if (fs.existsSync(backup)) {
      fs.writeFileSync(pomFile, fs.readFileSync(backup, 'utf8'));
      log.warn(`Restored ${pomFile} from backup.`);
    }
    return false;
  }
}
```

Called from `runHeal()`:

```ts
if (opts.apply && opts.pomFile) {
  const patched = patchPom(opts.pomFile, broken, verdict.newLocator);
  if (patched) {
    verdict.verified = verifySpec(t.file, opts.pomFile);
    if (!verdict.verified) {
      log.err(`Re-run failed after patch · reverted ${opts.pomFile}`);
    } else {
      log.ok(`Re-run passed · patch verified.`);
    }
  }
}
```

New field on `HealVerdict` (`core/types.ts`):

```ts
/** Set after --apply: did the re-run spec pass with the patch in place? */
verified?: boolean;
```

---

## Effect

- CLI `--apply` path now matches the Claude Code subagent's verify-then-revert behavior.
- A bad LLM-proposed locator can no longer silently ship — red re-run auto-reverts the file from `.bak`.
- `verdict.verified` gives downstream consumers (dashboard, triage skill, CI) a real signal instead of "patch was written" being treated as "patch works."

## Not changed

- Confidence gate (`>= 0.7`) — untouched.
- LLM prompt / preference order (role > testid > text > css) — untouched.
- Subagent path (`.claude/agents/heal.md`) — already had this behavior, used as the reference implementation.

## Verification

`npm run typecheck` in `agent-factory-cli/` — clean, no errors.

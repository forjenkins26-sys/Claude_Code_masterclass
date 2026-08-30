// Intent-driven E2E prototype — goal in, agent picks Playwright actions from
// the live ARIA snapshot each step (no hardcoded selectors/steps).
//
// Scoped as an exploration prototype (see agent-factory-cli/ai-agents/heal/
// CHANGE-verify-after-patch.md context): compares against the deterministic
// BlinkitLoginPage.ts POM on the same local demo app.
//
// Usage:
//   npx ts-node src/intent-agent/run-intent.ts "log in with a valid first name, last name, and 10-digit mobile number"

import { chromium, Page } from '@playwright/test';
import * as path from 'path';
import { askJson } from '../../../agent-factory-cli/ai-agents/core/llm';

const MAX_STEPS = 8;
const URL = 'http://localhost:7000/blinkit-login.html';

interface AgentAction {
  action: 'fill' | 'click' | 'done' | 'fail';
  role?: string;
  name?: string;
  value?: string;
  reason: string;
}

const SYSTEM = `You are an E2E test agent. You are given a GOAL and the current
page's ARIA accessibility snapshot (Playwright's "- role \\"name\\"" tree format).

Pick exactly ONE next action to move toward the goal. Return STRICT JSON only:
{
  "action": "fill" | "click" | "done" | "fail",
  "role": "the ARIA role of the target, e.g. textbox, button, link (omit for done/fail)",
  "name": "the accessible name exactly as shown in the snapshot (omit for done/fail)",
  "value": "text to type (only for action=fill)",
  "reason": "why this action, citing the snapshot"
}

Rules:
- Target elements ONLY by role+name pairs that literally appear in the snapshot.
- "done": goal is verifiably met by something visible in the snapshot (e.g. a
  success toast, redirect, confirmation text). Only then.
- "fail": the goal cannot be completed with what's on screen (element missing,
  looks broken). Say why.
- NEVER invent a role/name not present in the snapshot.
- Use realistic values for fill (e.g. "Rahul" for a first name, "9876543210"
  for a 10-digit mobile).`;

async function main() {
  const goal = process.argv[2];
  if (!goal) {
    console.error('Usage: run-intent.ts "<goal sentence>"');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  const log: AgentAction[] = [];
  let success = false;

  for (let step = 1; step <= MAX_STEPS; step++) {
    const snapshot = await page.locator('body').ariaSnapshot();
    const userPrompt = `GOAL: ${goal}\n\nStep ${step}/${MAX_STEPS}\n\nARIA snapshot:\n${snapshot}\n\nReturn the JSON action.`;

    const decision = await askJson<AgentAction>(SYSTEM, userPrompt, {
      mock: mockFor(step),
    });
    log.push(decision);
    console.log(`[step ${step}] ${decision.action} · ${decision.reason}`);

    if (decision.action === 'done') {
      success = true;
      break;
    }
    if (decision.action === 'fail') {
      console.error(`Agent gave up: ${decision.reason}`);
      break;
    }

    const ok = await execute(page, decision);
    if (!ok) {
      console.error(`Could not execute action on ${decision.role} "${decision.name}" — stopping.`);
      break;
    }
    await page.waitForTimeout(400);
  }

  console.log(`\nResult: ${success ? 'GOAL MET' : 'NOT MET'} in ${log.length} step(s).`);
  await saveRun(goal, log, success);
  await browser.close();
  process.exit(success ? 0 : 1);
}

async function execute(page: Page, decision: AgentAction): Promise<boolean> {
  if (!decision.role || !decision.name) return false;
  try {
    const target = page.getByRole(decision.role as never, { name: decision.name });
    if (decision.action === 'fill') {
      await target.fill(decision.value ?? '');
    } else if (decision.action === 'click') {
      await target.click();
    }
    return true;
  } catch (e) {
    return false;
  }
}

// LLM_MODE=mock deterministic walk-through for offline demo/CI.
function mockFor(step: number): string {
  const script: Record<number, object> = {
    1: { action: 'fill', role: 'textbox', name: 'First Name', value: 'Rahul', reason: 'mock: first name field' },
    2: { action: 'fill', role: 'textbox', name: 'Last Name', value: 'Sharma', reason: 'mock: last name field' },
    3: { action: 'fill', role: 'textbox', name: 'Mobile Number', value: '9876543210', reason: 'mock: mobile field' },
    4: { action: 'click', role: 'button', name: 'Login', reason: 'mock: submit login' },
    5: { action: 'done', reason: 'mock: toast shows OTP sent' },
  };
  return JSON.stringify(script[step] ?? { action: 'fail', reason: 'mock: out of script' });
}

async function saveRun(goal: string, log: AgentAction[], success: boolean) {
  const fs = await import('fs');
  const dir = path.join(__dirname, 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `run-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ goal, success, steps: log }, null, 2));
  console.log(`Run saved: ${file}`);
}

main();

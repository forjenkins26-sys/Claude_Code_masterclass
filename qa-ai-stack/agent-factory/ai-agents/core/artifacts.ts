// Persist each agent's latest verdicts to ai-agents/.runs/<agent>.json
// so the dashboard can read them after a run.

import * as fs from 'fs';
import * as path from 'path';

const RUNS_DIR = path.resolve(__dirname, '..', '.runs');

export function saveRun(agent: string, data: unknown): void {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
    const payload = {
      agent,
      // Timestamp passed by caller-free wrapper · use file mtime instead of Date
      data,
    };
    fs.writeFileSync(
      path.join(RUNS_DIR, `${agent}.json`),
      JSON.stringify(payload, null, 2),
    );
  } catch {
    /* best-effort · never crash the agent over an artifact write */
  }
}

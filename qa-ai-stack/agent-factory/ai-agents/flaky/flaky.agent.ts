// Flaky agent · two-pass detector.
// 1) Statistical: bucket pass/fail across N reports, 0 < fails < runs => flaky.
// 2) Semantic: ask the LLM for the cause + concrete Playwright fix.

import { askJson } from '../core/llm';
import { loadRunDir } from '../core/loader';
import { log } from '../core/log';
import { saveRun } from '../core/artifacts';
import type {
  FlakySummary,
  FlakyDiagnosis,
  TestResult,
} from '../core/types';
import { FLAKY_SYSTEM, flakyUserPrompt, MOCK_FLAKY } from './prompt';

const QUARANTINE_RATE = 0.3;

export async function runFlaky(runDir: string): Promise<FlakyDiagnosis[]> {
  log.header('Agent · Flaky detector');
  const runs = loadRunDir(runDir);
  if (runs.length < 2) {
    log.warn('Need at least 2 JSON reports to detect flakes.');
    return [];
  }
  log.info(`Loaded ${runs.length} run(s) from ${runDir}`);

  const summaries = bucketize(runs);
  const flakies = summaries.filter((s) => s.fails > 0 && s.fails < s.runs);
  if (flakies.length === 0) {
    log.ok('No flaky tests detected.');
    return [];
  }
  flakies.sort((a, b) => b.rate - a.rate);
  log.info(`Detected ${flakies.length} flaky test(s).`);

  const out: FlakyDiagnosis[] = [];
  for (const s of flakies) {
    log.agent('flaky', `diagnosing ${s.file} · "${s.title.slice(0, 64)}"`);
    const verdict = await askJson<{
      cause: FlakyDiagnosis['cause'];
      reason: string;
      fix: string;
      quarantine: boolean;
    }>(
      FLAKY_SYSTEM,
      flakyUserPrompt({
        file: s.file,
        title: s.title,
        rate: s.rate,
        runs: s.runs,
        fails: s.fails,
        lastError: s.lastError,
      }),
      { mock: MOCK_FLAKY },
    );
    const quarantine =
      verdict.quarantine || s.rate >= QUARANTINE_RATE || verdict.cause === 'unknown';
    out.push({ ...s, ...verdict, quarantine });
    log.ok(
      `${(s.rate * 100).toFixed(1)}% · ${verdict.cause.padEnd(11)} · ${verdict.fix}`,
    );
  }
  printSummary(out);
  saveRun('flaky', out);
  return out;
}

function bucketize(runs: TestResult[][]): FlakySummary[] {
  const map = new Map<string, FlakySummary>();
  for (const run of runs) {
    for (const t of run) {
      const key = `${t.file}::${t.title}`;
      const cur =
        map.get(key) ??
        ({
          file: t.file,
          title: t.title,
          runs: 0,
          fails: 0,
          rate: 0,
        } as FlakySummary);
      cur.runs += 1;
      if (t.status === 'failed' || t.status === 'timedOut') {
        cur.fails += 1;
        if (t.errorMessage) cur.lastError = t.errorMessage;
      }
      cur.rate = cur.fails / cur.runs;
      map.set(key, cur);
    }
  }
  return Array.from(map.values());
}

function printSummary(rows: FlakyDiagnosis[]): void {
  log.header('Flaky summary');
  let toQuarantine = 0;
  for (const r of rows) if (r.quarantine) toQuarantine += 1;
  log.info(`${rows.length} flaky · ${toQuarantine} recommended for @flaky tag`);
}

// RCA agent · classify failures + route them.

import { askJson } from '../core/llm';
import { loadReport, readErrorContext } from '../core/loader';
import { log } from '../core/log';
import { saveRun } from '../core/artifacts';
import type { RcaVerdict, TestResult } from '../core/types';
import { RCA_SYSTEM, rcaUserPrompt, MOCK_RCA } from './prompt';

interface RcaOptions {
  fileBugs?: boolean;
  jiraProject?: string;
}

export interface RcaRow {
  test: TestResult;
  verdict: RcaVerdict;
}

export async function runRca(
  reportPath: string,
  opts: RcaOptions = {},
): Promise<RcaRow[]> {
  log.header('Agent · RCA');
  const tests = loadReport(reportPath);
  const failures = tests.filter(
    (t) => t.status === 'failed' || t.status === 'timedOut',
  );
  if (failures.length === 0) {
    log.ok('No failures in this report.');
    return [];
  }
  log.info(`Analysing ${failures.length} failure(s) from ${reportPath}`);

  const rows: RcaRow[] = [];
  for (const test of failures) {
    log.agent(
      'rca',
      `analysing ${test.file} · "${test.title.slice(0, 64)}"`,
    );
    const ctx = readErrorContext(test.errorContextPath);
    const verdict = await askJson<RcaVerdict>(
      RCA_SYSTEM,
      rcaUserPrompt({
        file: test.file,
        title: test.title,
        errorMessage: test.errorMessage,
        errorStack: test.errorStack,
        errorContext: ctx,
      }),
      { mock: MOCK_RCA },
    );
    rows.push({ test, verdict });
    log.ok(
      `${verdict.category.padEnd(8)} · conf ${verdict.confidence.toFixed(
        2,
      )} · ${verdict.rootCause}`,
    );
    if (opts.fileBugs && verdict.routeTo === 'jira') {
      printJiraDraft(test, verdict, opts.jiraProject ?? 'QA');
    }
  }
  printSummary(rows);
  saveRun('rca', rows.map((r) => ({ file: r.test.file, title: r.test.title, ...r.verdict })));
  return rows;
}

function printJiraDraft(
  test: TestResult,
  verdict: RcaVerdict,
  project: string,
): void {
  log.header('Jira draft (would be filed by Claude Code via Atlassian MCP)');
  log.json({
    project,
    summary: `[${verdict.severity}] ${test.title} · ${verdict.rootCause.slice(0, 80)}`,
    issueType: 'Bug',
    description: [
      `*Spec:* {{${test.file}}}`,
      ``,
      `*Test:* ${test.title}`,
      ``,
      `*Root cause:*`,
      verdict.rootCause,
      ``,
      `*Evidence:*`,
      verdict.evidence,
      ``,
      `*Suggested fix:*`,
      verdict.suggestedFix,
      ``,
      `*Severity:* ${verdict.severity} · *Confidence:* ${verdict.confidence}`,
    ].join('\n'),
    labels: ['qa-automation', 'rca-agent', `category-${verdict.category}`],
  });
}

function printSummary(rows: RcaRow[]): void {
  log.header('RCA summary');
  const by: Record<string, number> = {
    product: 0,
    test: 0,
    env: 0,
    locator: 0,
  };
  for (const r of rows) by[r.verdict.category] = (by[r.verdict.category] ?? 0) + 1;
  log.info(
    `product: ${by.product} · test: ${by.test} · env: ${by.env} · locator: ${by.locator}`,
  );
}

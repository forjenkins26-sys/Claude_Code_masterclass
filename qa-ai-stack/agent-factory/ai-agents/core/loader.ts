// Parse Playwright JSON reporter output into our TestResult[] format.
// Tolerant of different Playwright versions (1.40+).

import * as fs from 'fs';
import * as path from 'path';
import type { TestResult, TestStatus } from './types';

interface PwSpec {
  title: string;
  file: string;
  tests?: PwTest[];
}

interface PwTest {
  results?: PwResult[];
  status?: string;
  expectedStatus?: string;
}

interface PwResult {
  status?: string;
  duration?: number;
  error?: { message?: string; stack?: string };
  errors?: Array<{ message?: string; stack?: string }>;
  attachments?: Array<{ name?: string; path?: string; body?: string }>;
}

interface PwSuite {
  title?: string;
  file?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}

interface PwReport {
  suites?: PwSuite[];
  // Some Playwright versions put specs at top level
  specs?: PwSpec[];
}

export function loadReport(reportPath: string): TestResult[] {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Report not found: ${reportPath}`);
  }
  const raw = fs.readFileSync(reportPath, 'utf8');
  const report = JSON.parse(raw) as PwReport;
  const out: TestResult[] = [];
  const reportDir = path.dirname(reportPath);

  const walkSuite = (suite: PwSuite, parentFile?: string): void => {
    const file = suite.file ?? parentFile;
    for (const spec of suite.specs ?? []) {
      pushSpec(spec, file, out, reportDir);
    }
    for (const child of suite.suites ?? []) {
      walkSuite(child, file);
    }
  };

  for (const suite of report.suites ?? []) {
    walkSuite(suite);
  }
  for (const spec of report.specs ?? []) {
    pushSpec(spec, spec.file, out, reportDir);
  }

  return out;
}

function pushSpec(
  spec: PwSpec,
  parentFile: string | undefined,
  out: TestResult[],
  reportDir: string,
): void {
  const file = spec.file ?? parentFile ?? '<unknown>';
  for (const test of spec.tests ?? []) {
    const attempts = test.results?.length ?? 0;
    const last = test.results?.[attempts - 1];
    const status = normalizeStatus(last?.status ?? test.status ?? 'failed');
    const dur =
      test.results?.reduce((acc, r) => acc + (r.duration ?? 0), 0) ?? 0;
    const err = pickError(last);
    const ctx = findErrorContextPath(last, reportDir);
    out.push({
      file,
      title: spec.title,
      status,
      errorMessage: err.message,
      errorStack: err.stack,
      durationMs: dur,
      attempts: attempts || 1,
      errorContextPath: ctx,
      pomCandidates: undefined,
    });
  }
}

function normalizeStatus(s: string): TestStatus {
  const v = s.toLowerCase();
  if (v === 'expected' || v === 'passed') return 'passed';
  if (v === 'failed' || v === 'unexpected') return 'failed';
  if (v === 'timedout' || v === 'timed_out') return 'timedOut';
  if (v === 'skipped') return 'skipped';
  if (v === 'interrupted') return 'interrupted';
  return 'failed';
}

function pickError(r?: PwResult): { message?: string; stack?: string } {
  if (!r) return {};
  if (r.error) return { message: r.error.message, stack: r.error.stack };
  if (r.errors?.length) {
    return { message: r.errors[0].message, stack: r.errors[0].stack };
  }
  return {};
}

function findErrorContextPath(
  r: PwResult | undefined,
  reportDir: string,
): string | undefined {
  const att = r?.attachments?.find(
    (a) => a.name === 'error-context' || a.path?.endsWith('error-context.md'),
  );
  if (!att?.path) return undefined;
  // Resolve relative to report dir if not absolute
  if (path.isAbsolute(att.path)) return att.path;
  return path.resolve(reportDir, att.path);
}

/** Read the DOM aria snapshot that Playwright attached at the failure point. */
export function readErrorContext(filePath?: string): string {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

/** Extract the locator that the failure complained about, if any. */
export function extractBrokenLocator(errorMessage?: string): string | undefined {
  if (!errorMessage) return undefined;
  // e.g. 'waiting for locator(\'button[name="Submit"]\').click()'
  const m =
    errorMessage.match(/locator\((['"])([\s\S]+?)\1\)/) ??
    errorMessage.match(/getBy\w+\((['"`])([\s\S]+?)\1[^)]*\)/);
  return m ? m[2] : undefined;
}

/** Load all *.json reports in a directory (for flaky detector). */
export function loadRunDir(dir: string): TestResult[][] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Run dir not found: ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  return files.map((f) => loadReport(path.join(dir, f)));
}

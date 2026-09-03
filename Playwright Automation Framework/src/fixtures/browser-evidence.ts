import { test as base, type Page, type TestInfo } from '@playwright/test';

/**
 * Captures browser-side evidence and attaches it to FAILED tests only.
 *
 * Why this exists: a filed bug currently carries expected/actual/steps and a
 * screenshot. For a whole class of defect that is not enough — an inert button
 * (BR-12) looks identical in a screenshot whether it is broken or working. The
 * proof lives in what the browser did NOT do: no network request fired, or a
 * JS error was thrown on click.
 *
 * That evidence was previously gathered by hand. progress.md shows the same
 * manual dance repeated across four apps — "#registerBtn has no handler,
 * btn.form === null; clicked live, URL unchanged" (MC-022), and again at
 * BL-015, BL-017, SCRUM-624, SCRUM-647. This fixture collects it every run so
 * the bug report already contains it.
 *
 * Attached on failure only, on purpose. A passing test does not need the noise,
 * and attaching megabytes of console output to 200 green tests would make the
 * HTML report unusable.
 */

export type BrowserEvidence = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  requestCount: number;
};

const MAX_ENTRIES = 50; // a redirect loop can emit thousands; keep the report readable

function record(bucket: string[], line: string): void {
  if (bucket.length < MAX_ENTRIES) bucket.push(line);
}

/**
 * Wires listeners onto a page and returns the collected evidence object.
 * Exported separately so a test can also read it mid-run when investigating.
 */
export function collectEvidence(page: Page): BrowserEvidence {
  const evidence: BrowserEvidence = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    requestCount: 0,
  };

  page.on('console', (msg) => {
    // Only errors and warnings. console.log from the app under test is noise,
    // and our own investigation scripts log heavily.
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      record(evidence.consoleErrors, `[${type}] ${msg.text()}`);
    }
  });

  // An uncaught exception in page JS. This is the one that catches a click
  // handler that throws — the button looks fine, the screenshot looks fine,
  // and nothing happens.
  page.on('pageerror', (error) => {
    record(evidence.pageErrors, `${error.name}: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    record(evidence.failedRequests, `${request.method()} ${request.url()} — ${failure}`);
  });

  // Counting every request is what makes "no network request fired" provable
  // rather than an observation someone typed into a bug description.
  page.on('request', () => {
    evidence.requestCount += 1;
  });

  return evidence;
}

function formatEvidence(evidence: BrowserEvidence): string {
  const lines: string[] = [];

  lines.push('BROWSER EVIDENCE (captured automatically on failure)');
  lines.push('='.repeat(58));
  lines.push('');
  lines.push(`Total network requests during test: ${evidence.requestCount}`);
  lines.push('');

  const sections: Array<[string, string[], string]> = [
    ['UNCAUGHT PAGE ERRORS', evidence.pageErrors,
      'A JS exception in the page. Often the cause when a control appears to do nothing.'],
    ['CONSOLE ERRORS / WARNINGS', evidence.consoleErrors,
      'Messages the app itself logged.'],
    ['FAILED NETWORK REQUESTS', evidence.failedRequests,
      'Requests the browser started but could not complete.'],
  ];

  for (const [title, entries, hint] of sections) {
    lines.push(`${title} (${entries.length})`);
    lines.push(`  ${hint}`);
    if (entries.length === 0) {
      lines.push('  — none —');
    } else {
      for (const entry of entries) lines.push(`  • ${entry}`);
      if (entries.length >= MAX_ENTRIES) {
        lines.push(`  … truncated at ${MAX_ENTRIES}`);
      }
    }
    lines.push('');
  }

  // Read this before assuming it means the app is broken: a test that failed
  // during setup may legitimately have fired nothing.
  if (evidence.requestCount === 0) {
    lines.push('NOTE: zero network requests were observed for the whole test.');
    lines.push('If the failing step was a submit or navigation, that is evidence the');
    lines.push('control never fired — see BR-12. Confirm the step was actually reached');
    lines.push('before treating this as proof (AH Rule 32).');
  }

  return lines.join('\n');
}

/**
 * Drop-in replacement for `test` that attaches browser evidence to failures.
 * Compose with the page-object fixtures rather than replacing them.
 */
export const test = base.extend<{ evidence: BrowserEvidence }>({
  // auto:true is load-bearing. Without it the fixture only runs for tests that
  // name `evidence` in their arguments - which are exactly the tests someone
  // already suspected would fail. The ones that need evidence most are the
  // unexpected failures, and those never ask for it.
  evidence: [async ({ page }, use, testInfo: TestInfo) => {
    const evidence = collectEvidence(page);

    await use(evidence);

    // Failed and timedOut both mean a human is about to read this report.
    // Skipped and passed do not.
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('browser-evidence.txt', {
        body: formatEvidence(evidence),
        contentType: 'text/plain',
      });
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';

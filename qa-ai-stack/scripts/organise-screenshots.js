#!/usr/bin/env node
/**
 * Organise Playwright screenshots into screenshots/{EpicKey}/ with traceable names.
 *
 *   node scripts/organise-screenshots.js <RUN_ID> <EPIC-KEY> [testIdMapJson]
 *
 * Runs ONCE after the suite, not once per test. The per-test approach it
 * replaces ("find the newest .png") was both tedious across a full Epic and
 * wrong: sorting by mtime picks whatever finished last, not the test you are
 * on. Here every screenshot is mapped from results.json, so the pairing is
 * exact.
 *
 * testIdMapJson (optional) maps a test-title prefix to its Jira issue key:
 *   {"BL-001":"SCRUM-742","BL-002":"SCRUM-743"}
 * Without it the Jira key is read from the test title when present
 * (e.g. "BL-004 SCRUM-745: ..."), otherwise the file is named UNMAPPED.
 *
 * Copies, never moves — test-results/ stays intact as the raw evidence, and
 * a later re-run cannot silently empty screenshots/.
 */
const fs = require('fs');
const path = require('path');

const [, , RUN_ID, EPIC_KEY, MAP_JSON] = process.argv;
if (!RUN_ID || !EPIC_KEY) {
  console.error('usage: node scripts/organise-screenshots.js <RUN_ID> <EPIC-KEY> [testIdMapJson]');
  process.exit(2);
}

const resultsPath = path.join('test-results', RUN_ID, 'results.json');
if (!fs.existsSync(resultsPath)) {
  console.error(`ERROR: ${resultsPath} not found. Run the suite with RUN_ID=${RUN_ID} first.`);
  process.exit(1);
}

const idMap = MAP_JSON ? JSON.parse(MAP_JSON) : {};
const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const slug = s =>
  s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

// Collect every spec with its final result and attachment paths.
const specs = [];
const walk = suite => {
  (suite.suites || []).forEach(walk);
  (suite.specs || []).forEach(spec => {
    const test = spec.tests[spec.tests.length - 1];
    const res = test.results[test.results.length - 1];
    specs.push({ title: spec.title, status: res.status, attachments: res.attachments || [] });
  });
};
walk(report);

const destDir = path.join('screenshots', EPIC_KEY);
fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
let skipped = 0;
const unmapped = [];
const written = [];

for (const spec of specs) {
  if (spec.status === 'skipped') { skipped++; continue; }

  const pngs = spec.attachments.filter(
    a => a.contentType === 'image/png' && a.path && fs.existsSync(a.path)
  );
  if (pngs.length === 0) { skipped++; continue; }

  // Test ID = leading token (BL-004, TC-001, OD-012 ...)
  const testId = (spec.title.match(/^([A-Z]{2,4}-\d{3})/) || [])[1] || 'UNKNOWN';

  // Jira key: explicit map wins, else read it out of the title.
  const issueKey =
    idMap[testId] || (spec.title.match(/\b([A-Z]+-\d+)\b(?!.*\b[A-Z]+-\d+\b)/) || [])[1] || 'UNMAPPED';
  if (issueKey === 'UNMAPPED') unmapped.push(testId);

  // Strip the "BL-004 SCRUM-745: " prefix so the slug is the actual title.
  const titleOnly = spec.title.replace(/^[A-Z]{2,4}-\d{3}\s*(?:[A-Z]+-\d+)?\s*:?\s*/, '');
  const verdict = spec.status === 'passed' ? 'PASS' : 'FAIL';

  pngs.forEach((png, i) => {
    const suffix = pngs.length > 1 ? `_${i + 1}` : '';
    const name = `${issueKey}_${testId}_${slug(titleOnly)}_${verdict}${suffix}.png`;
    fs.copyFileSync(png.path, path.join(destDir, name));
    written.push(name);
    copied++;
  });
}

// Verify the artefact, never the exit message.
// Check the files THIS run wrote, not the folder total - a second run (e.g. a
// verify re-run after an auto-fix) legitimately adds to an existing folder.
const missing = written.filter(f => !fs.existsSync(path.join(destDir, f)));
const onDisk = fs.readdirSync(destDir).filter(f => f.endsWith('.png')).length;
console.log(`screenshots/${EPIC_KEY}/  copied=${copied}  folder-total=${onDisk}  skipped=${skipped}`);
if (unmapped.length) {
  console.log(`  UNMAPPED (no Jira key in title or map): ${[...new Set(unmapped)].join(', ')}`);
}
if (missing.length) {
  console.error(`ERROR: ${missing.length} file(s) did not land: ${missing.join(', ')}`);
  process.exit(1);
}
if (copied === 0) {
  console.error("ERROR: 0 screenshots copied. Is screenshot:'on' set in playwright.config.ts?");
  process.exit(1);
}

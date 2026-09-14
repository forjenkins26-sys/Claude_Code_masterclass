#!/usr/bin/env node
/**
 * regression-baseline.js — run-history store + run-over-run regression diff.
 *
 * WHAT IT IS
 *   Parses /test-case-execution blocks out of progress.md (the pass/fail oracle),
 *   appends them to an append-only run history, and computes a machine-checkable
 *   regression verdict between any two runs.
 *
 * DESIGN CONSTRAINTS (each traceable to a recorded failure in this workspace)
 *   1. progress.md stays the ORACLE. This script never writes to it and never
 *      invents a result. If a block cannot be parsed it is reported, not guessed.
 *   2. Build identity is a COMPOSITE (see build-identity.js). A run whose build
 *      differs from the baseline is EXPIRED — its PASSes are not evidence.
 *      Empirically: ETag alone was frozen for 3 weeks while the app redeployed.
 *   3. Append-only. set-baseline never overwrites history; it moves a pointer.
 *      Overwriting a baseline silently reframes every future verdict.
 *   4. Machine-checkable, not ask-the-user. Per the 2026-09-10 SCRUM-794 finding:
 *      machine-checkable gates missed 0/58 runs, ask-the-user gates missed 5/58.
 *   5. Never auto-edits business-rules.md or any KB oracle file (AH Rule 30).
 *
 * STORE  knowledge-base/<PROJECT>/run-history.jsonl   (append-only, one run per line)
 *        knowledge-base/<PROJECT>/run-baseline.json   (pointer + resolved identity)
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- parsing

/** Heading form: "## 2026-08-24 18:50 — /test-case-execution SCRUM-694" */
const HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*[—-]\s*\/test-case-execution\s+(\S+)/;

function parseResultsLine(body) {
  // Form A (current): "**Results:** 14 Pass | 0 Auto-Fixed | 4 Blocked | 3 Skipped"
  const m = body.match(/^\*\*Results:\*\*\s*(.+)$/m);
  if (m) {
    const out = {};
    for (const part of m[1].split('|')) {
      const pm = part.trim().match(/^(\d+)\s+([A-Za-z][A-Za-z-]*)/);
      if (pm) out[pm[2].toLowerCase()] = Number(pm[1]);
    }
    if (Object.keys(out).length) return out;
  }

  // Form B (older blocks, e.g. SCRUM-255 at progress.md:6):
  //   "**Total:** 13 tests | **Passed:** 12 | **Failed:** 1 (intentional bug)"
  const legacy = body.match(/^\*\*Total:\*\*\s*\d+\s*tests?.*$/m);
  if (legacy) {
    const out = {};
    for (const [, label, n] of legacy[0].matchAll(/\*\*([A-Za-z][A-Za-z-]*):\*\*\s*(\d+)/g)) {
      out[label.toLowerCase()] = Number(n);
    }
    // Normalise legacy labels onto the current vocabulary.
    if (out.passed != null) { out.pass = out.passed; delete out.passed; }
    if (out.failed != null) { out.failed = out.failed; }
    if (Object.keys(out).length) return out;
  }

  return null;
}

function parseBuildLine(body) {
  const m = body.match(/^\*\*Build:\*\*\s*(.+)$/m);
  if (!m) return null;
  const raw = m[1].trim();
  const etag = raw.match(/ETag\s*`?"?([0-9a-f]{16,})"?`?/i);
  const lastMod = raw.match(/Last-Modified\s+([^·\n]+?)(?:\s*·|$)/i);
  return {
    raw,
    etag: etag ? etag[1] : null,
    last_modified: lastMod ? lastMod[1].trim() : null,
  };
}

/**
 * Per-test outcomes. progress.md records blocked/skipped tests explicitly by
 * Test ID; passes are reported as an aggregate count, not itemised. We record
 * exactly what is written — never synthesising a per-test PASS that the log
 * does not contain.
 */
function parseTestOutcomes(body) {
  const tests = {};
  // Test ids are project-prefixed short codes (BL-010, OD-001, TC-017, ML-006).
  // Explicitly NOT test ids:
  //   SCRUM-716  Jira issue/bug key
  //   BR-10      business-rule reference from the KB oracle
  //   AC-3       acceptance-criterion reference
  //   P0/P1      priority labels
  // Counting BR-xx as tests inflated every itemised count (observed: SCRUM-603
  // jumped 4 -> 9) and would have invented regressions on rules, not tests.
  const NON_TEST_PREFIX = /^(SCRUM|BR|AC|TC-REQ|REQ|P)$/;
  const TEST_ID_RE = /\b([A-Z]{2,4})-(\d{2,3})\b/g;
  const testIdsIn = (s) =>
    [...new Set(
      [...s.matchAll(TEST_ID_RE)]
        .filter((m) => !NON_TEST_PREFIX.test(m[1]))
        .map((m) => `${m[1]}-${m[2]}`)
    )];

  // Section headers end at the next header that starts a LINE (^\*\*...),
  // not at any bold span — bug refs like **SCRUM-716** appear mid-line and
  // must not terminate the section. (Bug found parsing SCRUM-694: 4 blocked
  // tests were silently dropped, which would corrupt every regression verdict.)
  const sections = [
    { re: /^\*\*Blocked[^:\n]*:\*\*([\s\S]*?)(?=^\*\*|^##|$(?![\s\S]))/m, status: 'BLOCKED' },
    { re: /^\*\*Skipped[^:\n]*:\*\*([\s\S]*?)(?=^\*\*|^##|$(?![\s\S]))/m, status: 'SKIPPED' },
    { re: /^\*\*Failed[^:\n]*:\*\*([\s\S]*?)(?=^\*\*|^##|$(?![\s\S]))/m, status: 'FAILED' },
    { re: /^\*\*Auto-Fixed[^:\n]*:\*\*([\s\S]*?)(?=^\*\*|^##|$(?![\s\S]))/m, status: 'AUTO_FIXED' },
  ];

  for (const { re, status } of sections) {
    const sec = body.match(re);
    if (!sec) continue;
    for (const line of sec[1].split('\n')) {
      const t = line.trim();
      if (!t.startsWith('-') && !t.startsWith('*')) continue;
      // A single bullet may cover several tests:
      //   "- SCRUM-551 ML-006 + SCRUM-552 ML-007: Bug filed as SCRUM-574 ..."
      // Record EVERY test id on the line, or the itemised count silently
      // under-reports against the stated **Results:** aggregate.
      const ids = testIdsIn(t);
      if (!ids.length) continue;
      const bug = t.match(/Bug\s+(?:filed as\s+)?\*?\*?(SCRUM-\d+)/) || t.match(/\*\*(SCRUM-\d+)\*\*/);
      for (const testId of ids) {
        tests[testId] = { status, bug: bug ? bug[1] : null, note: t.slice(0, 200) };
      }
    }
  }

  // Older blocks itemise results as a markdown table instead of prose sections:
  //   | OD-001 | SCRUM-256 | ✅ PASS | note |
  // Parse those too, but never overwrite a prose-section status (prose is
  // the more specific record: it distinguishes BLOCKED from plain FAIL).
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const testId = testIdsIn(cells[0])[0];
    if (!testId || tests[testId]) continue;
    const rowText = cells.join(' ').toUpperCase();
    let status = null;
    if (/\bPASS\b/.test(rowText)) status = 'PASSED';
    else if (/\bBLOCKED\b/.test(rowText)) status = 'BLOCKED';
    else if (/\bSKIP/.test(rowText)) status = 'SKIPPED';
    else if (/\bFAIL/.test(rowText)) status = 'FAILED';
    if (!status) continue;
    const bug = t.match(/(SCRUM-\d+)/);
    tests[testId] = { status, bug: bug ? bug[1] : null, note: t.slice(0, 200) };
  }

  return tests;
}

function parseProgressMd(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const runs = [];
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEADING_RE);
    if (h) {
      if (cur) runs.push(cur);
      cur = { date: h[1], time: h[2] || null, epic: h[3], _start: i, _body: [] };
      continue;
    }
    if (cur) {
      // Only a heading that starts a NEW dated skill block closes this one.
      // progress.md uses inner h2s inside a run (e.g. "## Session Score: 78% ...");
      // treating those as boundaries truncated the body and silently dropped the
      // Blocked/Skipped sections below them (observed on SCRUM-694: 4 blocked
      // tests lost, which would have corrupted every regression verdict).
      if (/^##\s+\d{4}-\d{2}-\d{2}/.test(lines[i])) { runs.push(cur); cur = null; continue; }
      cur._body.push(lines[i]);
    }
  }
  if (cur) runs.push(cur);

  return runs.map((r) => {
    const body = r._body.join('\n');
    const results = parseResultsLine(body);
    const build = parseBuildLine(body);
    const tests = parseTestOutcomes(body);
    return {
      run_id: `${r.date}${r.time ? 'T' + r.time.replace(':', '') : ''}-${r.epic}`,
      date: r.date,
      time: r.time,
      epic: r.epic,
      build,
      results,
      tests,
      parse_ok: Boolean(results),
      parse_note: results ? null : 'no **Results:** line found — block not counted as a run',
      source_line: r._start + 1,
    };
  });
}

// ---------------------------------------------------------------- store

function storePaths(kbDir) {
  return {
    history: path.join(kbDir, 'run-history.jsonl'),
    baseline: path.join(kbDir, 'run-baseline.json'),
  };
}

function readHistory(kbDir) {
  const { history } = storePaths(kbDir);
  if (!fs.existsSync(history)) return [];
  return fs
    .readFileSync(history, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function appendRuns(kbDir, runs) {
  const { history } = storePaths(kbDir);
  fs.mkdirSync(kbDir, { recursive: true });
  const existing = new Set(readHistory(kbDir).map((r) => r.run_id));
  const fresh = runs.filter((r) => r.parse_ok && !existing.has(r.run_id));
  if (fresh.length) {
    fs.appendFileSync(history, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  }
  return { added: fresh.length, skipped: runs.length - fresh.length };
}

// ---------------------------------------------------------------- diff

/**
 * Regression verdict between two runs.
 *   PASS -> FAIL/BLOCKED  = REGRESSION
 *   FAIL/BLOCKED -> PASS  = FIXED
 *   FAIL -> FAIL          = KNOWN
 *   new test id           = NEW
 * A test present in neither section is treated as PASSING only when the run's
 * aggregate counts confirm it; otherwise UNKNOWN. We never invent a PASS.
 */
function diffRuns(baseRun, curRun) {
  const ids = new Set([...Object.keys(baseRun.tests || {}), ...Object.keys(curRun.tests || {})]);
  const rows = [];
  const bad = new Set(['FAILED', 'BLOCKED']);

  for (const id of [...ids].sort()) {
    const a = baseRun.tests?.[id];
    const b = curRun.tests?.[id];
    const aStat = a?.status ?? 'NOT_RECORDED';
    const bStat = b?.status ?? 'NOT_RECORDED';
    let verdict = 'UNCHANGED';

    if (!a && b) verdict = bad.has(bStat) ? 'NEW_FAILURE' : 'NEW';
    else if (a && !b) verdict = bad.has(aStat) ? 'FIXED_OR_UNRECORDED' : 'DROPPED';
    else if (aStat !== bStat) {
      if (!bad.has(aStat) && bad.has(bStat)) verdict = 'REGRESSION';
      else if (bad.has(aStat) && !bad.has(bStat)) verdict = 'FIXED';
      else verdict = 'CHANGED';
    } else if (bad.has(aStat)) verdict = 'KNOWN';

    if (verdict !== 'UNCHANGED') {
      rows.push({ test: id, from: aStat, to: bStat, verdict, bug: b?.bug || a?.bug || null });
    }
  }
  return rows;
}

function summarise(rows) {
  const c = {};
  for (const r of rows) c[r.verdict] = (c[r.verdict] || 0) + 1;
  return c;
}

// ---------------------------------------------------------------- cli

function main() {
  const [, , cmd, ...rest] = process.argv;
  const arg = (name, dflt) => {
    const hit = rest.find((r) => r.startsWith(`--${name}=`));
    return hit ? hit.split('=').slice(1).join('=') : dflt;
  };
  const asJson = rest.includes('--json');
  const progress = arg('progress', 'progress.md');
  const kbDir = arg('kb', 'knowledge-base/SCRUM');

  if (!cmd || cmd === 'help') {
    console.log(`regression-baseline — run history + regression diff (read-only on progress.md)

  parse    --progress=progress.md            show parsed runs, flag unparsable blocks
  seed     --progress=... --kb=...           append parsed runs to run-history.jsonl
  list     --kb=...                          list stored runs
  set-baseline --kb=... --run=<run_id>       point baseline at a run (append-only)
  diff     --kb=... --from=<id> --to=<id>    regression verdict between two runs
  regression --kb=... --to=<id>              diff current run against the baseline

Flags: --json`);
    process.exit(0);
  }

  if (cmd === 'parse' || cmd === 'seed') {
    if (!fs.existsSync(progress)) {
      console.error(`progress file not found: ${progress}`);
      process.exit(2);
    }
    const runs = parseProgressMd(progress);
    const ok = runs.filter((r) => r.parse_ok);
    const bad = runs.filter((r) => !r.parse_ok);

    if (cmd === 'parse') {
      if (asJson) { console.log(JSON.stringify(runs, null, 2)); process.exit(0); }
      console.log(`Parsed ${runs.length} /test-case-execution block(s) from ${progress}`);
      console.log(`  countable runs : ${ok.length}`);
      console.log(`  unparsable     : ${bad.length}`);
      console.log('');
      for (const r of ok) {
        const res = Object.entries(r.results).map(([k, v]) => `${v} ${k}`).join(', ');
        const nTests = Object.keys(r.tests).length;
        console.log(`  ${r.run_id.padEnd(34)} ${res}`);
        console.log(`  ${''.padEnd(34)} build=${r.build ? (r.build.etag ? r.build.etag.slice(0, 12) : 'no-etag') : 'NONE'} · itemised tests=${nTests} · line ${r.source_line}`);
      }
      if (bad.length) {
        console.log('\n  UNPARSABLE (reported, never guessed):');
        for (const r of bad) console.log(`    line ${r.source_line}  ${r.run_id} — ${r.parse_note}`);
      }
      process.exit(0);
    }

    const { added, skipped } = appendRuns(kbDir, runs);
    console.log(`seeded ${added} run(s) into ${storePaths(kbDir).history} (${skipped} already present or unparsable)`);
    process.exit(0);
  }

  if (cmd === 'list') {
    const h = readHistory(kbDir);
    if (asJson) { console.log(JSON.stringify(h, null, 2)); process.exit(0); }
    console.log(`${h.length} run(s) in ${storePaths(kbDir).history}`);
    for (const r of h) {
      console.log(`  ${r.run_id.padEnd(34)} ${Object.entries(r.results || {}).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    }
    process.exit(0);
  }

  if (cmd === 'set-baseline') {
    const runId = arg('run');
    const h = readHistory(kbDir);
    const run = h.find((r) => r.run_id === runId);
    if (!run) { console.error(`run not found in history: ${runId}`); process.exit(2); }
    const { baseline } = storePaths(kbDir);
    const prior = fs.existsSync(baseline) ? JSON.parse(fs.readFileSync(baseline, 'utf8')) : null;
    const rec = {
      run_id: run.run_id,
      epic: run.epic,
      build: run.build,
      set_at: new Date().toISOString(),
      previous: prior ? { run_id: prior.run_id, set_at: prior.set_at } : null,
    };
    fs.writeFileSync(baseline, JSON.stringify(rec, null, 2), 'utf8');
    console.log(`baseline -> ${run.run_id}${prior ? ` (was ${prior.run_id})` : ''}`);
    process.exit(0);
  }

  if (cmd === 'diff' || cmd === 'regression') {
    const h = readHistory(kbDir);
    const { baseline } = storePaths(kbDir);
    let fromId = arg('from');
    if (cmd === 'regression') {
      if (!fs.existsSync(baseline)) { console.error('no baseline set — run set-baseline first'); process.exit(2); }
      fromId = JSON.parse(fs.readFileSync(baseline, 'utf8')).run_id;
    }
    const toId = arg('to');
    const a = h.find((r) => r.run_id === fromId);
    const b = h.find((r) => r.run_id === toId);
    if (!a) { console.error(`baseline run not found: ${fromId}`); process.exit(2); }
    if (!b) { console.error(`target run not found: ${toId}`); process.exit(2); }

    const rows = diffRuns(a, b);
    const sum = summarise(rows);
    const buildChanged = JSON.stringify(a.build) !== JSON.stringify(b.build);
    const regressions = rows.filter((r) => r.verdict === 'REGRESSION' || r.verdict === 'NEW_FAILURE');

    if (asJson) {
      console.log(JSON.stringify({ from: fromId, to: toId, build_changed: buildChanged, summary: sum, rows }, null, 2));
      process.exit(regressions.length ? 1 : 0);
    }

    console.log(`REGRESSION DIFF  ${fromId}  ->  ${toId}`);
    console.log(`Build: ${buildChanged ? 'CHANGED — baseline results are EXPIRED, not evidence' : 'same recorded build identity'}`);
    console.log('');
    if (!rows.length) console.log('  no per-test status changes recorded');
    for (const r of rows) {
      console.log(`  ${r.verdict.padEnd(20)} ${r.test.padEnd(10)} ${r.from} -> ${r.to}${r.bug ? `  [${r.bug}]` : ''}`);
    }
    console.log('');
    console.log(`Summary: ${Object.entries(sum).map(([k, v]) => `${k}=${v}`).join(' · ') || 'none'}`);

    // A "regression" only means the code got worse if BOTH runs measured the
    // same build. When the build (or the target) moved, a PASSED -> BLOCKED row
    // is a difference, not a proven regression — asserting otherwise is exactly
    // the confident-wrong-answer failure this tool exists to prevent.
    if (regressions.length && buildChanged) {
      console.log(`\nVERDICT: ${regressions.length} DIFFERENCE(S) — NOT PROVEN REGRESSIONS`);
      console.log('  Build/target differs between these runs, so the baseline is expired.');
      console.log('  Re-run the baseline suite against the current build to tell a real');
      console.log('  regression apart from a target change.');
    } else if (regressions.length) {
      console.log(`\nVERDICT: ${regressions.length} REGRESSION(S) — same build, code got worse`);
    } else {
      console.log('\nVERDICT: no regressions');
    }
    process.exit(regressions.length ? 1 : 0);
  }

  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}

module.exports = { parseProgressMd, diffRuns, readHistory, appendRuns, storePaths };
if (require.main === module) main();

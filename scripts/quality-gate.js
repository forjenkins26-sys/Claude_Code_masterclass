#!/usr/bin/env node
/**
 * Quality gate — reads the newest closure verdict JSON emitted by /test-closure
 * (Step 5B) and renders it as a GitHub Actions job summary.
 *
 * WARN-ONLY BY DEFAULT. It exits 0 whatever the verdict says.
 *
 * That is deliberate, and it is the same reasoning already written into
 * .github/workflows/playwright-blinkit.yml: a check that is red for weeks because
 * of known, triaged defects is a check people learn to scroll past. This gate's
 * job is to put the release verdict where a reviewer sees it, not to stop traffic.
 *
 * Pass --strict to exit 1 on NO-GO or on expired results. Use it on a release
 * workflow, where a human is already waiting on the answer.
 *
 * Usage:
 *   node scripts/quality-gate.js [--dir output] [--build <id>] [--strict]
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { dir: 'output', build: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--strict') args.strict = true;
    else if (argv[i] === '--dir') args.dir = argv[++i];
    else if (argv[i] === '--build') args.build = argv[++i];
  }
  return args;
}

/** Newest closure JSON by the date encoded in its filename, not by mtime —
 *  a git checkout rewrites mtimes, so mtime would pick an arbitrary file. */
function findLatestVerdict(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^closure-.+-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}

/** Absent/!== means EXPIRED, never "fine" — CLAUDE.md 2026-08-22: a changed
 *  build expires all prior results, and a missing build is treated as expired. */
function buildState(verdictBuild, actualBuild) {
  if (!actualBuild) return 'unchecked';
  if (!verdictBuild) return 'expired';
  return verdictBuild === actualBuild ? 'current' : 'expired';
}

function pct(n, d) {
  if (!d) return 'n/a';
  return `${n}/${d} (${Math.round((n / d) * 100)}%)`;
}

function render(v, buildStatus) {
  const icon = { GO: '🟢', 'GO-WITH-RISK': '🟡', 'NO-GO': '🔴' }[v.verdict] || '⚪';
  const c = v.coverage || {};
  const L = [];

  L.push(`## ${icon} Quality Gate — ${v.verdict || 'UNKNOWN'}`);
  L.push('');
  L.push(`**Epic:** ${v.epic} — ${v.summary || ''}`);
  if (v.trigger) L.push(`**Triggered by:** ${v.trigger}`);
  L.push(`**Closure run:** ${v.date} · **Build:** ${v.build || '`null` (no build identity)'}`);

  if (buildStatus === 'expired') {
    L.push('');
    L.push('> ⚠️ **These results are EXPIRED.** The build under test is not the build');
    L.push('> they were recorded against, so no verdict above applies to this commit.');
    L.push('> Re-run `/test-case-execution` then `/test-closure`.');
  } else if (buildStatus === 'unchecked') {
    L.push('');
    L.push('> ℹ️ Build identity not supplied to the gate — verdict shown unverified against this commit.');
  }

  L.push('');
  L.push('| Measure | Counted |');
  L.push('|---|---|');
  if (c.requirements) L.push(`| Requirement coverage | ${pct(c.requirements.covered, c.requirements.total)} |`);
  if (c.passRate) L.push(`| Pass rate | ${pct(c.passRate.passed, c.passRate.executed)} |`);
  if (c.execution) L.push(`| Execution | ${pct(c.execution.executed, c.execution.total)} |`);

  const defects = v.defects || [];
  L.push('');
  if (defects.length) {
    L.push(`### Open defects (${defects.length})`);
    L.push('');
    L.push('| Bug | Severity | Status | Blocks | Tier |');
    L.push('|---|---|---|---|---|');
    for (const d of defects) {
      L.push(`| ${d.key} | ${d.severity || '?'} | ${d.status || '?'} | ${d.blocksAC || '—'} | ${d.tier || '?'} |`);
    }
  } else {
    L.push('### Open defects: none');
  }

  if ((v.notCovered || []).length) {
    L.push('');
    L.push(`**Not covered:** ${v.notCovered.join(', ')}`);
    L.push('');
    L.push('_Functional coverage does not include these dimensions. A high coverage figure above says nothing about them._');
  }

  if (v.report) {
    L.push('');
    L.push(`**Full report:** \`${v.report}\``);
  }
  return L.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = findLatestVerdict(args.dir);

  if (!file) {
    const msg = [
      '## ⚪ Quality Gate — no verdict found',
      '',
      `No \`closure-*.json\` in \`${args.dir}/\`. Run \`/test-closure {EPIC}\` to produce one.`,
      '',
      '_No verdict is not a passing verdict — it means nobody has assessed this release._',
    ].join('\n');
    console.log(msg);
    writeSummary(msg);
    return 0; // absence of a report is not a build failure
  }

  let v;
  try {
    v = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    const msg = `## 🔴 Quality Gate — unreadable verdict\n\n\`${file}\` is not valid JSON: ${err.message}`;
    console.log(msg);
    writeSummary(msg);
    return args.strict ? 1 : 0;
  }

  const status = buildState(v.build, args.build);
  const out = render(v, status);
  console.log(`(source: ${file})\n`);
  console.log(out);
  writeSummary(out);

  if (args.strict && (v.verdict === 'NO-GO' || status === 'expired')) {
    const why = status === 'expired' ? 'results are expired for this build' : 'verdict is NO-GO';
    console.error(`::error::Quality gate failed — ${why}`);
    return 1;
  }
  return 0;
}

function writeSummary(md) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) {
    try {
      fs.appendFileSync(target, md + '\n');
    } catch {
      /* summary is a nicety; never fail the gate over it */
    }
  }
}

process.exit(main());

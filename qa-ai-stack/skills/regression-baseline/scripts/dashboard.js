#!/usr/bin/env node
/**
 * dashboard.js — static HTML view over run-history.jsonl.
 *
 * WHAT IT REFUSES TO DO, AND WHY
 * ------------------------------
 * It does NOT draw one pass-rate line across every run. Verified on the real
 * store (2026-09-14): 17 runs span 16 DISTINCT epics, each a different feature
 * with a different test count (13 to 31 tests). Only SCRUM-121 has more than one
 * run. Plotting those as a time series would put SCRUM-299 (10/16) next to
 * SCRUM-545 (25/31) as though one followed the other, and read as "quality
 * declining" when the suites are simply different tests.
 *
 * So: a trend line is drawn ONLY for an epic with 2+ runs. Every other epic is a
 * single point, rendered as a card, never connected to its neighbours.
 *
 * Other rules this page holds to:
 *   - Counted, never estimated. Every number comes from the store.
 *   - A run with no build identity shows NONE in red rather than being hidden.
 *     6 of 17 real runs have no build; concealing that would be lying by omission.
 *   - No invented composite "quality score". A blended percentage across
 *     incomparable suites is a number that looks authoritative and means nothing.
 *   - Read-only: reads run-history.jsonl, writes one HTML file. Nothing else.
 */

const fs = require('fs');
const path = require('path');
const { readHistory, diffRuns } = require('./regression-baseline.js');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Executable total = every result bucket except the legacy "total" label. */
function totals(r) {
  const res = r.results || {};
  const pass = res.pass ?? 0;
  const executable = Object.entries(res)
    .filter(([k]) => k !== 'total')
    .reduce((a, [, v]) => a + v, 0);
  const blocked = (res.blocked ?? 0) + (res.failed ?? 0) + (res['failed-stuck'] ?? 0) + (res.stuck ?? 0);
  return { pass, executable, blocked, skipped: res.skipped ?? 0, flaky: res.flaky ?? 0, autofixed: res['auto-fixed'] ?? 0 };
}

function buildId(r) {
  if (!r.build) return null;
  return r.build.etag ? r.build.etag.slice(0, 12) : (r.build.raw ? r.build.raw.slice(0, 12) : null);
}

function sparkline(series, w = 260, h = 48) {
  if (series.length < 2) return '';
  const max = 100, min = 0;
  const dx = w / (series.length - 1);
  const pts = series.map((v, i) => `${(i * dx).toFixed(1)},${(h - ((v - min) / (max - min)) * h).toFixed(1)}`);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="pass rate across runs">
    <polyline points="${pts.join(' ')}"/>
    ${series.map((v, i) => `<circle cx="${(i * dx).toFixed(1)}" cy="${(h - ((v - min) / (max - min)) * h).toFixed(1)}" r="3"/>`).join('')}
  </svg>`;
}

function render(history, opts) {
  const byEpic = {};
  for (const r of history) (byEpic[r.epic] = byEpic[r.epic] || []).push(r);
  for (const k of Object.keys(byEpic)) byEpic[k].sort((a, b) => a.run_id.localeCompare(b.run_id));

  const multi = Object.entries(byEpic).filter(([, rs]) => rs.length > 1);
  const single = Object.entries(byEpic).filter(([, rs]) => rs.length === 1);
  const noBuild = history.filter((r) => !buildId(r)).length;

  // Regression rows come from the real diff engine, never recomputed here.
  let regressionPanel = '';
  if (multi.length) {
    const blocks = multi.map(([epic, rs]) => {
      const a = rs[rs.length - 2], b = rs[rs.length - 1];
      const rows = diffRuns(a, b);
      const sameBuild = JSON.stringify(a.build) === JSON.stringify(b.build);
      const regs = rows.filter((x) => x.verdict === 'REGRESSION' || x.verdict === 'NEW_FAILURE');
      const verdict = regs.length
        ? (sameBuild
            ? `<span class="bad">${regs.length} REGRESSION(S)</span> — same build, code got worse`
            : `<span class="warn">${regs.length} DIFFERENCE(S)</span> — build differs, NOT proven regressions`)
        : `<span class="good">no regressions</span>`;
      return `<div class="panel">
        <h3>${esc(epic)} <span class="sub">${esc(a.run_id)} → ${esc(b.run_id)}</span></h3>
        <p class="meta">Build: ${sameBuild ? '<span class="good">same recorded identity</span>' : '<span class="warn">CHANGED — baseline results expired</span>'}</p>
        <p class="verdict">${verdict}</p>
        ${rows.length ? `<table><thead><tr><th>Test</th><th>From</th><th>To</th><th>Verdict</th></tr></thead><tbody>
          ${rows.map((x) => `<tr class="v-${esc(x.verdict)}"><td>${esc(x.test)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${esc(x.verdict)}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">no per-test status changes recorded</p>'}
      </div>`;
    });
    regressionPanel = blocks.join('');
  } else {
    regressionPanel = `<div class="panel"><p class="muted">No epic has two or more runs yet, so there is nothing to compare. A regression verdict needs a baseline and a later run of the <em>same</em> suite.</p></div>`;
  }

  const epicCard = ([epic, rs]) => {
    const last = rs[rs.length - 1];
    const t = totals(last);
    const rate = t.executable ? Math.round((t.pass / t.executable) * 100) : 0;
    const series = rs.map((r) => { const x = totals(r); return x.executable ? (x.pass / x.executable) * 100 : 0; });
    const bid = buildId(last);
    return `<article class="card">
      <header><h3>${esc(epic)}</h3><span class="runs">${rs.length} run${rs.length > 1 ? 's' : ''}</span></header>
      <div class="rate ${rate >= 90 ? 'good' : rate >= 70 ? 'warn' : 'bad'}">${rate}%<span>${t.pass}/${t.executable} passed</span></div>
      ${rs.length > 1 ? sparkline(series) : '<p class="single">single run — no trend</p>'}
      <dl>
        <div><dt>Blocked</dt><dd class="${t.blocked ? 'bad' : ''}">${t.blocked}</dd></div>
        <div><dt>Skipped</dt><dd>${t.skipped}</dd></div>
        <div><dt>Auto-fixed</dt><dd>${t.autofixed}</dd></div>
        <div><dt>Flaky</dt><dd>${t.flaky}</dd></div>
      </dl>
      <footer>
        <span class="date">${esc(last.date)}${last.time ? ' ' + esc(last.time) : ''}</span>
        <span class="build ${bid ? '' : 'nobuild'}">${bid ? 'build ' + esc(bid) : 'NO BUILD ID'}</span>
      </footer>
    </article>`;
  };

  const rows = history
    .slice()
    .sort((a, b) => b.run_id.localeCompare(a.run_id))
    .map((r) => {
      const t = totals(r);
      const bid = buildId(r);
      return `<tr>
        <td class="mono">${esc(r.run_id)}</td>
        <td>${esc(r.epic)}</td>
        <td class="num">${t.pass}</td>
        <td class="num ${t.blocked ? 'bad' : ''}">${t.blocked}</td>
        <td class="num">${t.skipped}</td>
        <td class="num">${t.executable}</td>
        <td class="mono ${bid ? '' : 'nobuild'}">${bid ? esc(bid) : 'NONE'}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA Run History — ${esc(opts.project)}</title>
<style>
  :root{--bg:#fbfbfa;--fg:#1a1a18;--mut:#6b6b66;--line:#e4e4e0;--card:#fff;--good:#0a7d4f;--warn:#a86400;--bad:#c02b2b;--accent:#2b5fd9}
  @media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#eeeeec;--mut:#9a9a94;--line:#2c2c2a;--card:#1c1c1a;--good:#3ec98a;--warn:#e0a34a;--bad:#f0736f;--accent:#7aa2f7}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding-block:32px;padding-left:20px;padding-right:20px}
  .wrap{max-width:1080px;margin:0 auto}
  h1{font-size:24px;margin:0 0 4px;letter-spacing:-.02em}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:36px 0 12px;font-weight:600}
  h3{font-size:14px;margin:0}
  .lede{color:var(--mut);margin:0 0 8px}
  .note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);padding:12px 14px;border-radius:6px;color:var(--mut);margin:16px 0}
  .note strong{color:var(--fg)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px}
  .card header{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
  .runs{font-size:11px;color:var(--mut)}
  .rate{font-size:28px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:baseline;gap:8px}
  .rate span{font-size:12px;font-weight:400;color:var(--mut)}
  .good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}
  .single{font-size:11px;color:var(--mut);font-style:italic;margin:8px 0}
  .spark{width:100%;height:48px;margin:6px 0}
  .spark polyline{fill:none;stroke:var(--accent);stroke-width:2}
  .spark circle{fill:var(--accent)}
  dl{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin:10px 0 0;font-size:12px}
  dl div{display:flex;justify-content:space-between;border-bottom:1px dotted var(--line);padding-bottom:2px}
  dt{color:var(--mut)}dd{margin:0;font-variant-numeric:tabular-nums;font-weight:600}
  .card footer{display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--mut)}
  .build{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .nobuild{color:var(--bad);font-weight:600}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:12px}
  .panel .sub{font-weight:400;color:var(--mut);font-size:12px;font-family:ui-monospace,monospace}
  .meta,.verdict{margin:6px 0;font-size:13px}
  .verdict{font-weight:600}
  .muted{color:var(--mut);font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px}
  th{text-align:left;font-weight:600;color:var(--mut);border-bottom:1px solid var(--line);padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:6px 8px;border-bottom:1px solid var(--line)}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px}
  .v-REGRESSION td,.v-NEW_FAILURE td{color:var(--bad);font-weight:600}
  .v-FIXED td{color:var(--good)}
  .scroll{overflow-x:auto}
  footer.page{margin-top:36px;padding-top:14px;border-top:1px solid var(--line);color:var(--mut);font-size:12px}
</style></head><body><div class="wrap">

<h1>QA Run History</h1>
<p class="lede">${esc(opts.project)} · ${history.length} run${history.length === 1 ? '' : 's'} · ${Object.keys(byEpic).length} epic${Object.keys(byEpic).length === 1 ? '' : 's'} · generated ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))}</p>

<div class="note">
  <strong>Why there is no single trend line.</strong> These runs cover ${Object.keys(byEpic).length} different epics with different test counts, so plotting them as one series would compare unrelated suites and read as a quality trend that does not exist. A sparkline is drawn only for an epic with two or more runs${multi.length ? ` (${multi.map(([e]) => esc(e)).join(', ')})` : ' — currently none'}. Every other epic is a single point.
  ${noBuild ? `<br><br><strong>${noBuild} of ${history.length} runs carry no build identity</strong> and are marked <span class="nobuild">NONE</span>. Their results cannot be compared to a later run — a missing build is treated as changed, never as the same.` : ''}
</div>

<h2>Regression — comparable runs only</h2>
${regressionPanel}

${multi.length ? `<h2>Epics with a trend (${multi.length})</h2><div class="grid">${multi.map(epicCard).join('')}</div>` : ''}

<h2>Single-run epics (${single.length}) — no trend available</h2>
<div class="grid">${single.map(epicCard).join('')}</div>

<h2>All runs</h2>
<div class="scroll"><table>
  <thead><tr><th>Run</th><th>Epic</th><th class="num">Pass</th><th class="num">Blocked</th><th class="num">Skipped</th><th class="num">Executable</th><th>Build</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>

<footer class="page">
  Counted from <code>run-history.jsonl</code>. Every number on this page comes from a recorded run; none are estimated, and no composite "quality score" is computed across incomparable suites. <code>progress.md</code> remains the pass/fail oracle.
</footer>

</div></body></html>`;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => {
    const h = args.find((a) => a.startsWith(`--${n}=`));
    return h ? h.split('=').slice(1).join('=') : d;
  };
  const kbDir = opt('kb', 'knowledge-base/SCRUM');
  const out = opt('out', 'output/qa-dashboard.html');
  const project = opt('project', path.basename(kbDir));

  const history = readHistory(kbDir);
  if (!history.length) {
    console.error(`no runs in ${kbDir}/run-history.jsonl — run "regression-baseline.js seed" first`);
    process.exit(2);
  }

  const html = render(history, { project });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');

  const epics = new Set(history.map((r) => r.epic));
  const noBuild = history.filter((r) => !buildId(r)).length;
  console.log(`dashboard written: ${out}`);
  console.log(`  runs ${history.length} · epics ${epics.size} · runs without build identity ${noBuild}`);
  const multi = [...epics].filter((e) => history.filter((r) => r.epic === e).length > 1);
  console.log(`  epics with a real trend: ${multi.length ? multi.join(', ') : 'none (every epic has a single run)'}`);
  process.exit(0);
}

module.exports = { render, totals };
if (require.main === module) main();

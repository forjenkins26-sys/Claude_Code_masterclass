#!/usr/bin/env node
/**
 * ts-critic.js — compile gate for generated Playwright specs.
 *
 * WHY
 *   /spec-quality scores spec TEXT with regex. It cannot tell you whether the
 *   generated spec actually COMPILES. A spec that does not typecheck fails at
 *   run time as a confusing runtime error, which then gets misread as an app
 *   bug — precisely the AH Rule 32 trap (test failing != app broken).
 *   This runs `tsc --noEmit` and maps the errors back to spec files.
 *
 * NOT A NEW COMPILER
 *   2 of 3 frameworks in this workspace already define "typecheck": "tsc --noEmit".
 *   This wires that existing command into a gate; it does not reimplement it.
 *
 * RAMP (machine-checkable, not ask-the-user)
 *   Per the 2026-09-10 SCRUM-794 finding — machine-checkable gates missed 0/58
 *   runs, ask-the-user gates missed 5/58 — this gate never asks. It records its
 *   own run count in .ts-critic-state.json and promotes itself:
 *     runs 1-3  ADVISORY  (reports, exit 0)  -> earns trust on real specs
 *     run  4+   ENFORCING (reports, exit 1 on error)
 *   --enforce / --advisory override; --reset clears the counter.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADVISORY_RUNS = 3;
const STATE_FILE = '.ts-critic-state.json';

function readState(dir) {
  const p = path.join(dir, STATE_FILE);
  if (!fs.existsSync(p)) return { runs: 0 };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { runs: 0 }; }
}

function writeState(dir, state) {
  fs.writeFileSync(path.join(dir, STATE_FILE), JSON.stringify(state, null, 2), 'utf8');
}

/** Parse `tsc` output: "path/file.ts(12,5): error TS2345: message" */
function parseTscOutput(out) {
  const errors = [];
  // Windows tsc emits CRLF; a trailing \r breaks the `$` anchor and made every
  // real type error look like "tsc did not run" (verified 2026-09-14).
  for (const raw of out.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const m = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/);
    if (m) {
      errors.push({ file: m[1].trim(), line: Number(m[2]), col: Number(m[3]), code: m[4], message: m[5].trim() });
    }
  }
  return errors;
}

function runTsc(projectDir, tsconfig) {
  const cfgArg = tsconfig ? `-p ${JSON.stringify(tsconfig)}` : '-p tsconfig.json';
  try {
    execSync(`npx tsc --noEmit ${cfgArg}`, {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000,
    });
    return { ok: true, output: '', errors: [] };
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`;
    // tsc exits non-zero on type errors AND on config/invocation failure.
    // Distinguish them: no parsable diagnostics means the run itself failed.
    const errors = parseTscOutput(output);
    return { ok: false, output, errors, invocationFailed: errors.length === 0 };
  }
}

function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(`--${n}`);
  const opt = (n, d) => {
    const h = args.find((a) => a.startsWith(`--${n}=`));
    return h ? h.split('=').slice(1).join('=') : d;
  };

  const projectDir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
  const tsconfig = opt('tsconfig', null);
  const asJson = flag('json');

  if (flag('reset')) {
    const p = path.join(projectDir, STATE_FILE);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    console.log('ts-critic: run counter reset');
    process.exit(0);
  }

  if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
    console.error(`ts-critic: no package.json in ${projectDir} — point me at a project root`);
    process.exit(2);
  }

  const state = readState(projectDir);
  const runNo = state.runs + 1;
  let mode = runNo <= ADVISORY_RUNS ? 'ADVISORY' : 'ENFORCING';
  if (flag('enforce')) mode = 'ENFORCING';
  if (flag('advisory')) mode = 'ADVISORY';

  const res = runTsc(projectDir, tsconfig);
  writeState(projectDir, { runs: runNo, last_run: new Date().toISOString(), last_mode: mode });

  // Group errors by file; spec files are the ones that block a test run.
  const byFile = {};
  for (const e of res.errors) {
    (byFile[e.file] = byFile[e.file] || []).push(e);
  }
  const specFiles = Object.keys(byFile).filter((f) => /\.spec\.[tj]s$/.test(f));
  const otherFiles = Object.keys(byFile).filter((f) => !/\.spec\.[tj]s$/.test(f));

  if (asJson) {
    console.log(JSON.stringify({
      project: projectDir, mode, run: runNo, advisory_runs_remaining: Math.max(0, ADVISORY_RUNS - runNo),
      ok: res.ok, invocation_failed: !!res.invocationFailed,
      error_count: res.errors.length, spec_files_with_errors: specFiles, errors: res.errors,
    }, null, 2));
  } else {
    console.log(`TS CRITIC  ${projectDir}`);
    console.log(`Mode: ${mode}  (run #${runNo}${mode === 'ADVISORY' ? `, enforcing from run #${ADVISORY_RUNS + 1}` : ''})`);
    console.log('');
    if (res.ok) {
      console.log('  PASS — tsc --noEmit clean, 0 type errors');
    } else if (res.invocationFailed) {
      console.log('  TSC DID NOT RUN — this is not a type-error verdict:');
      console.log(res.output.split('\n').filter(Boolean).slice(0, 8).map((l) => `    ${l}`).join('\n'));
    } else {
      console.log(`  ${res.errors.length} type error(s) in ${Object.keys(byFile).length} file(s)`);
      if (specFiles.length) {
        console.log(`\n  SPEC FILES (these block a test run):`);
        for (const f of specFiles) {
          console.log(`    ${f}  — ${byFile[f].length} error(s)`);
          for (const e of byFile[f].slice(0, 3)) console.log(`      ${e.line}:${e.col}  ${e.code}  ${e.message.slice(0, 100)}`);
        }
      }
      if (otherFiles.length) {
        console.log(`\n  SUPPORT FILES (POMs, fixtures, utils):`);
        for (const f of otherFiles.slice(0, 10)) console.log(`    ${f}  — ${byFile[f].length} error(s)`);
      }
    }
    console.log('');
    if (!res.ok && mode === 'ADVISORY') {
      console.log('VERDICT: ADVISORY — errors reported, run NOT blocked.');
    } else if (!res.ok) {
      console.log('VERDICT: BLOCKED — fix type errors before executing this suite.');
    } else {
      console.log('VERDICT: clean');
    }
  }

  // Invocation failure is never a silent pass: surface as exit 2.
  if (res.invocationFailed) process.exit(2);
  if (!res.ok && mode === 'ENFORCING') process.exit(1);
  process.exit(0);
}

module.exports = { parseTscOutput, runTsc };
if (require.main === module) main();

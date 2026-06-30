#!/usr/bin/env node
'use strict';

/**
 * spec-quality.js — static quality gate for generated Playwright specs.
 *
 * Pure regex, zero dependencies. Scans .spec.ts/.spec.js files for:
 *   - flaky patterns (fixed waits, sleep, page.pause)
 *   - hardcoded secrets (password/token/apikey literals)
 *   - tests with no expect() assertion
 *   - unawaited async page calls
 *   - empty test bodies
 * Emits a 0–100 score + grade + findings (text or --json).
 *
 * Adapted in spirit from vperambu/Playwright-Rag-Langraph-autoheal ReviewerAgent,
 * rewritten for Playwright (not Cucumber) + TypeScript, with our deduction model.
 *
 * Usage:
 *   node spec-quality.js <file-or-glob-or-dir> [--json] [--min=70]
 *   node spec-quality.js tests/ui/login.spec.ts
 *   node spec-quality.js "tests/ui/*.spec.ts" --min=75
 *   node spec-quality.js tests/ui --json
 *
 * Exit code: 0 if every file scores >= min (default 70), else 1 (CI gate).
 */

const fs   = require('fs');
const path = require('path');

// ── deduction model (each finding subtracts; floor 0) ────────────────────────
const FLAKY_PATTERNS = [
  { re: /\bpage\.waitForTimeout\s*\(\s*\d+\s*\)/g, penalty: 3, label: 'page.waitForTimeout(ms) — fixed wait; prefer waitFor/expect with auto-retry' },
  { re: /\bsetTimeout\s*\(/g,                       penalty: 3, label: 'setTimeout — hardcoded delay; prefer Playwright auto-waiting' },
  { re: /\bsleep\s*\(/g,                            penalty: 3, label: 'sleep() — hardcoded delay' },
  { re: /\.pause\s*\(\s*\)/g,                       penalty: 5, label: 'page.pause() — debug call, remove before CI' },
];

const SECRET_PATTERNS = [
  { re: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,            penalty: 4, label: 'Hardcoded password literal' },
  { re: /token\s*[:=]\s*['"][A-Za-z0-9._-]{16,}['"]/gi,     penalty: 4, label: 'Hardcoded token literal' },
  { re: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,         penalty: 4, label: 'Hardcoded API key literal' },
];

// page mutators that must be awaited
const UNAWAITED = /(?<!await\s)(?<!\.)(page|this\.page)\.(click|fill|goto|check|uncheck|selectOption|press|type|hover|waitForSelector|waitForNavigation|waitForURL)\s*\(/g;

function gradeOf(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const findings = [];
  let score = 100;

  const add = (penalty, label, count) => {
    const total = penalty * count;
    score -= total;
    findings.push({ penalty: total, count, label });
  };

  // flaky + secrets
  for (const { re, penalty, label } of [...FLAKY_PATTERNS, ...SECRET_PATTERNS]) {
    const m = src.match(re);
    if (m && m.length) add(penalty, label, m.length);
  }

  // unawaited async page calls
  const unawaited = src.match(UNAWAITED);
  if (unawaited && unawaited.length) add(5, 'Unawaited async page.* call (missing await)', unawaited.length);

  // per-test assertion + empty-body check
  // split on test(/it( blocks naively by counting
  const testBlocks = src.split(/\b(?:test|it)\s*\(/).slice(1);
  let testsNoExpect = 0;
  let emptyTests = 0;
  for (const block of testBlocks) {
    // body = from first { to balanced-ish (naive: up to next "test(" already split)
    const hasExpect = /\bexpect\s*\(/.test(block);
    // body = from the arrow-fn opening brace; stop at the test-block close heuristically
    const bodyMatch = block.match(/=>\s*\{([\s\S]*?)\}\s*\)\s*;?/) || block.match(/\{([\s\S]*)/);
    const body = bodyMatch ? bodyMatch[1] : '';
    const meaningful = body.replace(/\s|\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').length;
    if (meaningful < 5) emptyTests++;
    else if (!hasExpect) testsNoExpect++;
  }
  if (testsNoExpect) add(5, 'Test with no expect() assertion', testsNoExpect);
  if (emptyTests)   add(10, 'Empty / stub test body', emptyTests);

  // reward: files where every test asserts
  if (testBlocks.length > 0 && testsNoExpect === 0 && emptyTests === 0) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));
  return { file, score, grade: gradeOf(score), tests: testBlocks.length, findings };
}

// ── resolve inputs (file / dir / simple glob) ────────────────────────────────
function resolveTargets(arg) {
  if (!arg) return [];
  // dir → all spec files under it
  if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
    const out = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
        else if (/\.spec\.(ts|js)$/.test(e.name)) out.push(p);
      }
    })(arg);
    return out;
  }
  // literal file
  if (fs.existsSync(arg)) return [arg];
  // simple glob: dir/*.spec.ts
  const dir = path.dirname(arg);
  const pat = path.basename(arg).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  if (fs.existsSync(dir)) {
    const rx = new RegExp('^' + pat + '$');
    return fs.readdirSync(dir).filter(f => rx.test(f)).map(f => path.join(dir, f));
  }
  return [];
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const minArg = args.find(a => a.startsWith('--min='));
  const min = minArg ? parseInt(minArg.split('=')[1], 10) : 70;
  const target = args.find(a => !a.startsWith('--'));

  const files = resolveTargets(target);
  if (!files.length) {
    console.error(`spec-quality: no spec files found for "${target}"`);
    process.exit(2);
  }

  const results = files.map(scanFile);
  const failed = results.filter(r => r.score < min);

  if (json) {
    console.log(JSON.stringify({ min, results, pass: failed.length === 0 }, null, 2));
  } else {
    for (const r of results) {
      const flag = r.score < min ? '❌' : '✅';
      console.log(`\n${flag} ${r.file} — ${r.score}/100 (${r.grade}), ${r.tests} test(s)`);
      if (r.findings.length === 0) console.log('   clean');
      for (const f of r.findings) console.log(`   -${f.penalty}  ${f.label}${f.count > 1 ? ` (x${f.count})` : ''}`);
    }
    console.log(`\nGate: min ${min} — ${failed.length === 0 ? 'PASS ✅' : `FAIL ❌ (${failed.length} below)`}`);
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main();

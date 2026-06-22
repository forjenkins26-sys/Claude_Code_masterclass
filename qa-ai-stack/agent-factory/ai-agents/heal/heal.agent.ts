// Self-Healing Locator agent · patches Page Objects only when confidence >= 0.7.

import * as fs from 'fs';
import { askJson } from '../core/llm';
import {
  loadReport,
  readErrorContext,
  extractBrokenLocator,
} from '../core/loader';
import { log } from '../core/log';
import { saveRun } from '../core/artifacts';
import type { HealVerdict, TestResult } from '../core/types';
import { HEAL_SYSTEM, healUserPrompt, MOCK_HEAL } from './prompt';

const CONFIDENCE_GATE = 0.7;

interface HealOptions {
  apply?: boolean;
  /** Optional Page Object file path · best-effort guess if absent */
  pomFile?: string;
}

export async function runHeal(
  reportPath: string,
  opts: HealOptions = {},
): Promise<HealVerdict[]> {
  log.header('Agent · Self-Healing Locator');
  const tests = loadReport(reportPath);
  const candidates = tests.filter((t) => {
    if (t.status !== 'failed' && t.status !== 'timedOut') return false;
    return /locator|getBy|waiting for/i.test(t.errorMessage ?? '');
  });
  if (candidates.length === 0) {
    log.ok('No locator-shaped failures found.');
    return [];
  }
  log.info(`Found ${candidates.length} candidate locator failure(s).`);

  const out: HealVerdict[] = [];
  for (const t of candidates) {
    const broken = extractBrokenLocator(t.errorMessage);
    if (!broken) {
      log.warn(`Could not extract broken locator from ${t.title}`);
      continue;
    }
    log.agent('heal', `${t.file} · broken: ${broken}`);
    const snap = readErrorContext(t.errorContextPath);
    const verdict = await askJson<HealVerdict>(
      HEAL_SYSTEM,
      healUserPrompt({
        brokenLocator: broken,
        errorMessage: t.errorMessage,
        domSnapshot: snap,
      }),
      { mock: MOCK_HEAL },
    );
    verdict.oldLocator = broken;
    out.push(verdict);

    if (verdict.escalate || verdict.confidence < CONFIDENCE_GATE) {
      log.warn(
        `Escalate · conf ${verdict.confidence.toFixed(2)} · ${
          verdict.escalateReason ?? verdict.reason
        }`,
      );
      continue;
    }
    log.ok(
      `${verdict.strategy.padEnd(7)} · conf ${verdict.confidence.toFixed(
        2,
      )} · ${verdict.newLocator}`,
    );
    if (opts.apply && opts.pomFile) {
      patchPom(opts.pomFile, broken, verdict.newLocator);
    } else if (opts.apply) {
      log.warn(
        'No --pom file provided · cannot patch. (Inside Claude Code, the heal subagent finds the file automatically.)',
      );
    } else {
      log.info('Run with --apply to write the patch.');
    }
  }
  saveRun('heal', out);
  return out;
}

function patchPom(file: string, oldStr: string, newCall: string): void {
  if (!fs.existsSync(file)) {
    log.err(`Page Object not found: ${file}`);
    return;
  }
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(oldStr)) {
    log.warn(
      `Old locator "${oldStr}" not found in ${file} · patch skipped.`,
    );
    return;
  }
  // Replace the old locator string (within a locator(...) call) with the new full call.
  const patched = src.replace(
    new RegExp(`page\\.locator\\(['"\`]${escapeRegex(oldStr)}['"\`]\\)`),
    newCall,
  );
  fs.writeFileSync(file + '.bak', src);
  fs.writeFileSync(file, patched);
  log.ok(`Patched ${file} · backup at ${file}.bak`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

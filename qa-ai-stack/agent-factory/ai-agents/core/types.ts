// Shared types · agent-factory-cli

export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

export interface TestResult {
  /** Spec file path · e.g. "tests/checkout.spec.ts" */
  file: string;
  /** Test title · e.g. "guest can add backpack to cart" */
  title: string;
  /** Final status across retries */
  status: TestStatus;
  /** Original error message (full) */
  errorMessage?: string;
  /** Stack trace (if available) */
  errorStack?: string;
  /** Total runtime in ms (sum of retries) */
  durationMs: number;
  /** How many times it ran (1 = no retry, 2 = retried once...) */
  attempts: number;
  /** Path to error-context.md (aria snapshot of DOM at failure) */
  errorContextPath?: string;
  /** Page-object files that were touched (best-effort) */
  pomCandidates?: string[];
}

export type FailureCategory = 'product' | 'test' | 'env' | 'locator';

export interface RcaVerdict {
  category: FailureCategory;
  rootCause: string;
  /** 0.0–1.0 */
  confidence: number;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix: string;
  routeTo: 'jira' | 'heal' | 'human' | 'devs';
}

export interface FlakySummary {
  file: string;
  title: string;
  runs: number;
  fails: number;
  rate: number;
  /** Last error seen (for LLM context) */
  lastError?: string;
}

export interface FlakyDiagnosis extends FlakySummary {
  cause: 'race' | 'hardWait' | 'network' | 'animation' | 'sharedState' | 'unknown';
  reason: string;
  fix: string;
  quarantine: boolean;
}

export interface HealVerdict {
  oldLocator: string;
  newLocator: string;
  strategy: 'role' | 'testid' | 'text' | 'css' | 'xpath' | 'unknown';
  /** 0.0–1.0 · we only patch when >= 0.7 */
  confidence: number;
  reason: string;
  escalate: boolean;
  escalateReason?: string;
  pomFile?: string;
}

export interface AskOpts {
  /** Deterministic mock string returned when LLM_MODE=mock */
  mock?: string;
  /** Force model override */
  model?: string;
  /** Override temperature (default 0.1) */
  temperature?: number;
}

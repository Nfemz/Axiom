// ---------------------------------------------------------------------------
// Axiom Agent Runtime – Self-Learning from Failures (T130)
// ---------------------------------------------------------------------------
// Pure functions for recording failures and resolutions so agents can learn
// from past mistakes and avoid repeating unsuccessful approaches.
// Runs in E2B sandbox — no @axiom/shared imports.
// ---------------------------------------------------------------------------

// ── Types ───────────────────────────────────────────────────────────────────

export interface FailureRecord {
  action: string;
  context: Record<string, unknown>;
  error: string;
  timestamp: Date;
}

export interface ResolutionRecord {
  failure: FailureRecord;
  resolution: string;
  successful: boolean;
}

// ── Pure Functions ──────────────────────────────────────────────────────────

export function recordFailure(
  failures: FailureRecord[],
  action: string,
  error: string,
  context: Record<string, unknown> = {}
): FailureRecord[] {
  const record: FailureRecord = {
    action,
    error,
    context,
    timestamp: new Date(),
  };

  return [...failures, record];
}

export function findSimilarFailures(
  failures: FailureRecord[],
  action: string
): FailureRecord[] {
  return failures.filter((f) => f.action === action);
}

export function recordResolution(
  resolutions: ResolutionRecord[],
  failure: FailureRecord,
  resolution: string,
  successful: boolean
): ResolutionRecord[] {
  const record: ResolutionRecord = { failure, resolution, successful };

  return [...resolutions, record];
}

export function getSuccessfulResolutions(
  resolutions: ResolutionRecord[],
  action: string
): string[] {
  return resolutions
    .filter((r) => r.failure.action === action && r.successful)
    .map((r) => r.resolution);
}

export function shouldAvoidApproach(
  resolutions: ResolutionRecord[],
  action: string,
  approach: string
): boolean {
  return resolutions.some(
    (r) =>
      r.failure.action === action && r.resolution === approach && !r.successful
  );
}

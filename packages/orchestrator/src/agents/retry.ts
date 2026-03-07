// ---------------------------------------------------------------------------
// Axiom Orchestrator – Retry Policy
// ---------------------------------------------------------------------------
// Configurable retry execution with exponential/linear backoff.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";

const logger = createLogger("retry");

const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

// ── Types ───────────────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  backoffType: "exponential" | "linear";
  backoffDelay: number; // base delay in ms
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffType: "exponential",
  backoffDelay: 1000,
} as const;

// ── Backoff Calculation ─────────────────────────────────────────────────────

export function calculateBackoff(policy: RetryPolicy, attempt: number): number {
  const raw =
    policy.backoffType === "exponential"
      ? policy.backoffDelay * Math.pow(2, attempt)
      : policy.backoffDelay * (attempt + 1);

  return Math.min(raw, MAX_BACKOFF_MS);
}

// ── Sleep ───────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Retry Execution ─────────────────────────────────────────────────────────

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  label: string = "operation",
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${policy.maxRetries}`, { label });
      }
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < policy.maxRetries) {
        const delay = calculateBackoff(policy, attempt);
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          label,
          error: message,
          attempt: attempt + 1,
          nextDelay: delay,
        });
        await sleep(delay);
      } else {
        logger.error(`All ${policy.maxRetries + 1} attempts exhausted`, {
          label,
          error: message,
        });
      }
    }
  }

  throw new Error(
    `[${label}] Failed after ${policy.maxRetries + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

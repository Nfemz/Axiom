// ---------------------------------------------------------------------------
// Axiom Agent Runtime – Graceful Degradation (T129)
// ---------------------------------------------------------------------------
// Pure functions for managing degraded operation when services become
// unavailable. Queues sensitive operations until services recover.
// Runs in E2B sandbox — no @axiom/shared imports.
// ---------------------------------------------------------------------------

// ── Types ───────────────────────────────────────────────────────────────────

export type DegradationState = "normal" | "degraded" | "recovery";

export interface QueuedOp {
  op: string;
  args: unknown[];
}

export interface DegradationContext {
  state: DegradationState;
  failedServices: string[];
  queuedOps: QueuedOp[];
  degradedAt: Date | null;
}

// ── Sensitive operations that require all services ──────────────────────────

const SENSITIVE_OPS = new Set([
  "financial_transaction",
  "deploy",
  "secret_access",
  "agent_spawn",
  "budget_update",
  "credential_rotation",
]);

// ── Pure Functions ──────────────────────────────────────────────────────────

export function createDegradationContext(): DegradationContext {
  return {
    state: "normal",
    failedServices: [],
    queuedOps: [],
    degradedAt: null,
  };
}

export function enterDegradedMode(
  ctx: DegradationContext,
  failedService: string,
): DegradationContext {
  if (ctx.failedServices.includes(failedService)) {
    return ctx;
  }

  return {
    ...ctx,
    state: "degraded",
    failedServices: [...ctx.failedServices, failedService],
    degradedAt: ctx.degradedAt ?? new Date(),
  };
}

export function isSensitiveOperation(op: string): boolean {
  return SENSITIVE_OPS.has(op);
}

export function queueSensitiveOp(
  ctx: DegradationContext,
  op: string,
  args: unknown[],
): DegradationContext {
  return {
    ...ctx,
    queuedOps: [...ctx.queuedOps, { op, args }],
  };
}

export function recover(
  ctx: DegradationContext,
  restoredService: string,
): DegradationContext {
  const remaining = ctx.failedServices.filter((s) => s !== restoredService);

  if (remaining.length > 0) {
    return {
      ...ctx,
      failedServices: remaining,
    };
  }

  return {
    ...ctx,
    state: "recovery",
    failedServices: [],
    queuedOps: [],
    degradedAt: null,
  };
}

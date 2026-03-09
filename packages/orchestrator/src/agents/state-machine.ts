// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent State Machine
// ---------------------------------------------------------------------------
// Validates agent status transitions against the shared transition map.
// ---------------------------------------------------------------------------

import { type AgentStatus, VALID_STATUS_TRANSITIONS } from "@axiom/shared";

// ── Types ───────────────────────────────────────────────────────────────────

export interface StatusTransitionEvent {
  agentId: string;
  fromStatus: AgentStatus;
  reason?: string;
  timestamp: Date;
  toStatus: AgentStatus;
}

// ── Transition helpers ──────────────────────────────────────────────────────

/**
 * Returns `true` when moving from `currentStatus` to `targetStatus` is a
 * valid transition according to `VALID_STATUS_TRANSITIONS`.
 */
export function validateTransition(
  currentStatus: AgentStatus,
  targetStatus: AgentStatus
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed.includes(targetStatus);
}

/**
 * Throws an error if the transition from `currentStatus` to `targetStatus`
 * is not permitted.
 */
export function assertTransition(
  currentStatus: AgentStatus,
  targetStatus: AgentStatus
): void {
  if (!validateTransition(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid status transition: "${currentStatus}" -> "${targetStatus}"`
    );
  }
}

/**
 * Returns the list of statuses reachable from `currentStatus`.
 */
export function getAvailableTransitions(
  currentStatus: AgentStatus
): AgentStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus];
}

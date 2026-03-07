// ---------------------------------------------------------------------------
// Axiom Orchestrator – Audit Integration (T087)
// ---------------------------------------------------------------------------
// Convenience functions that wire agent lifecycle events into the
// append-only audit log. Each function delegates to appendAuditEntry
// with the appropriate action type and structured details.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { appendAuditEntry } from "./audit-log.js";
import type { Database } from "../db/drizzle.js";

const log = createLogger("audit-integration");

// ── Agent Spawn ─────────────────────────────────────────────────────────────

export async function auditAgentSpawn(
  db: Database,
  agentId: string,
  definitionId: string,
  goal: string,
) {
  return appendAuditEntry(db, agentId, "agent.spawn", "success", {
    definitionId,
    goal,
  });
}

// ── Status Change ───────────────────────────────────────────────────────────

export async function auditAgentStatusChange(
  db: Database,
  agentId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string,
) {
  return appendAuditEntry(db, agentId, "agent.status_change", "success", {
    fromStatus,
    toStatus,
    ...(reason ? { reason } : {}),
  });
}

// ── Secret Access ───────────────────────────────────────────────────────────

export async function auditSecretAccess(
  db: Database,
  agentId: string,
  secretName: string,
  allowed: boolean,
  domain?: string,
) {
  const outcome = allowed ? "allowed" : "denied";
  const isSecurityEvent = !allowed;

  return appendAuditEntry(
    db,
    agentId,
    "secret.access",
    outcome,
    {
      secretName,
      ...(domain ? { domain } : {}),
    },
    isSecurityEvent,
  );
}

// ── Generic Security Event ──────────────────────────────────────────────────

export async function auditSecurityEvent(
  db: Database,
  agentId: string,
  eventType: string,
  details: Record<string, unknown>,
) {
  return appendAuditEntry(
    db,
    agentId,
    `security.${eventType}`,
    "flagged",
    details,
    true,
  );
}

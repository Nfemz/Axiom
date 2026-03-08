// ---------------------------------------------------------------------------
// Axiom Orchestrator – Audit Log Service (FR-007)
// ---------------------------------------------------------------------------
// Append-only audit log. Entries are immutable once written — no update or
// delete operations are exposed. Supports filtered queries and security
// event retrieval.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { auditLog } from "../db/schema.js";

const log = createLogger("audit-log");

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuditFilter {
  actionType?: string;
  agentId?: string;
  fromDate?: Date;
  limit?: number;
  offset?: number;
  securityOnly?: boolean;
  toDate?: Date;
}

// ── Append (immutable write) ────────────────────────────────────────────────

export async function appendAuditEntry(
  db: Database,
  agentId: string,
  actionType: string,
  outcome: string,
  details: Record<string, unknown>,
  securityEvent = false
) {
  const result = await db
    .insert(auditLog)
    .values({ agentId, actionType, outcome, details, securityEvent })
    .returning();

  log.info("Audit entry appended", {
    id: result[0].id,
    agentId,
    actionType,
    outcome,
    securityEvent,
  });

  return result[0];
}

// ── Query with filters ──────────────────────────────────────────────────────

export async function queryAuditLog(db: Database, filters: AuditFilter) {
  const conditions = buildConditions(filters);
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const query = db
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.timestamp))
    .limit(limit)
    .offset(offset);

  return query;
}

// ── Security events ─────────────────────────────────────────────────────────

export async function getSecurityEvents(db: Database, limit = 50) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.securityEvent, true))
    .orderBy(desc(auditLog.timestamp))
    .limit(limit);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildConditions(filters: AuditFilter) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.agentId) {
    conditions.push(eq(auditLog.agentId, filters.agentId));
  }
  if (filters.actionType) {
    conditions.push(eq(auditLog.actionType, filters.actionType));
  }
  if (filters.fromDate) {
    conditions.push(gte(auditLog.timestamp, filters.fromDate));
  }
  if (filters.toDate) {
    conditions.push(lte(auditLog.timestamp, filters.toDate));
  }
  if (filters.securityOnly) {
    conditions.push(eq(auditLog.securityEvent, true));
  }

  return conditions;
}

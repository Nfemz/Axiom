import { createLogger } from "@axiom/shared";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { alertEvents } from "../db/schema.js";

const log = createLogger("alert-engine");

// ─── Types ──────────────────────────────────────────────────────────

export interface AlertCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  threshold: number;
}

interface AlertRuleRow {
  condition: Record<string, unknown>;
  enabled: boolean;
  id: string;
  name: string;
  notifyDiscord: boolean;
  severity: string;
}

interface AlertFilters {
  agentId?: string;
  limit?: number;
  ruleId?: string;
  severity?: string;
}

// ─── Condition Evaluation ───────────────────────────────────────────

const OPERATORS: Record<
  AlertCondition["operator"],
  (a: number, b: number) => boolean
> = {
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  eq: (a, b) => a === b,
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
};

export function evaluateCondition(
  condition: AlertCondition,
  value: number
): boolean {
  const fn = OPERATORS[condition.operator];
  if (!fn) {
    return false;
  }
  return fn(value, condition.threshold);
}

// ─── Alert Firing ───────────────────────────────────────────────────

export async function fireAlert(
  db: Database,
  ruleId: string,
  agentId: string | null,
  severity: string,
  message: string
): Promise<string> {
  log.info("Firing alert", { ruleId, severity, message });

  const [event] = await db
    .insert(alertEvents)
    .values({
      ruleId,
      agentId,
      severity,
      message,
    })
    .returning({ id: alertEvents.id });

  return event.id;
}

// ─── Rule Evaluation ────────────────────────────────────────────────

export async function evaluateRules(
  db: Database,
  rules: AlertRuleRow[],
  metrics: Record<string, number>
): Promise<string[]> {
  const firedIds: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }

    const condition = rule.condition as unknown as AlertCondition;
    const value = metrics[condition.metric];
    if (value === undefined) {
      continue;
    }

    if (evaluateCondition(condition, value)) {
      const msg = `${rule.name}: ${condition.metric} ${condition.operator} ${condition.threshold} (actual: ${value})`;
      const id = await fireAlert(db, rule.id, null, rule.severity, msg);
      firedIds.push(id);
      log.warn("Alert rule triggered", {
        ruleId: rule.id,
        ruleName: rule.name,
      });
    }
  }

  return firedIds;
}

// ─── Acknowledgement ────────────────────────────────────────────────

export async function acknowledgeAlert(
  db: Database,
  alertId: string
): Promise<void> {
  log.info("Acknowledging alert", { alertId });

  await db
    .update(alertEvents)
    .set({
      acknowledged: true,
      acknowledgedAt: new Date(),
    })
    .where(eq(alertEvents.id, alertId));
}

// ─── Query Active Alerts ────────────────────────────────────────────

export async function getActiveAlerts(
  db: Database,
  filters?: AlertFilters
): Promise<(typeof alertEvents.$inferSelect)[]> {
  const conditions = [eq(alertEvents.acknowledged, false)];

  if (filters?.severity) {
    conditions.push(eq(alertEvents.severity, filters.severity));
  }
  if (filters?.ruleId) {
    conditions.push(eq(alertEvents.ruleId, filters.ruleId));
  }
  if (filters?.agentId) {
    conditions.push(eq(alertEvents.agentId, filters.agentId));
  }

  const limit = filters?.limit ?? 100;

  const results = await db
    .select()
    .from(alertEvents)
    .where(and(...conditions))
    .orderBy(desc(alertEvents.createdAt))
    .limit(limit);

  return results;
}

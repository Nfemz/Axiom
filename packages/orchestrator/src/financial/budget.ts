import { eq } from "drizzle-orm";
import { createLogger, TransactionType, DEFAULT_BUDGET_CURRENCY } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";
import { agents, financialTransactions } from "../db/schema.js";

const log = createLogger("financial:budget");

// ─── Types ────────────────────────────────────────────────────────

interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

interface BudgetSummary {
  total: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
}

// ─── Budget Check ─────────────────────────────────────────────────

export async function checkBudget(
  db: Database,
  agentId: string,
  requestedAmount: number,
): Promise<BudgetCheckResult> {
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent[0]) {
    return { allowed: false, remaining: 0, reason: "Agent not found" };
  }

  const total = parseFloat(agent[0].budgetTotal);
  const spent = parseFloat(agent[0].budgetSpent);
  const remaining = total - spent;

  if (requestedAmount > remaining) {
    log.warn("Budget check failed", {
      agentId,
      requestedAmount,
      remaining,
    });
    return {
      allowed: false,
      remaining,
      reason: `Requested ${requestedAmount} exceeds remaining budget ${remaining}`,
    };
  }

  return { allowed: true, remaining };
}

// ─── Pre-Authorize ────────────────────────────────────────────────

export async function preAuthorize(
  db: Database,
  agentId: string,
  amount: number,
  category: string,
  description?: string,
) {
  const budgetCheck = await checkBudget(db, agentId, amount);

  if (!budgetCheck.allowed) {
    log.warn("Pre-authorization denied", {
      agentId,
      amount,
      reason: budgetCheck.reason,
    });
    return null;
  }

  const data: typeof financialTransactions.$inferInsert = {
    agentId,
    type: TransactionType.Expense,
    amount: amount.toFixed(2),
    currency: DEFAULT_BUDGET_CURRENCY,
    category,
    description: description ?? null,
    preAuthVerified: true,
  };

  const result = await db.insert(financialTransactions).values(data).returning();
  const tx = result[0];

  // Update agent's budgetSpent
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (agent[0]) {
    const newSpent = parseFloat(agent[0].budgetSpent) + amount;
    await db
      .update(agents)
      .set({ budgetSpent: newSpent.toFixed(2), updatedAt: new Date() })
      .where(eq(agents.id, agentId));
  }

  log.info("Pre-authorization granted", {
    id: tx.id,
    agentId,
    amount,
    category,
  });

  return tx;
}

// ─── Budget Summary ───────────────────────────────────────────────

export async function getBudgetSummary(
  db: Database,
  agentId: string,
): Promise<BudgetSummary | null> {
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent[0]) {
    return null;
  }

  const total = parseFloat(agent[0].budgetTotal);
  const spent = parseFloat(agent[0].budgetSpent);
  const remaining = total - spent;
  const utilizationPercent = total > 0 ? (spent / total) * 100 : 0;

  return {
    total,
    spent,
    remaining,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
  };
}

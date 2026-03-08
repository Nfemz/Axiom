import {
  createLogger,
  DEFAULT_BUDGET_CURRENCY,
  TransactionType,
} from "@axiom/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { financialTransactions } from "../db/schema.js";

const log = createLogger("financial:ledger");

// ─── Types ────────────────────────────────────────────────────────

interface RecordTransactionParams {
  agentId?: string;
  amount: string;
  category: string;
  currency?: string;
  description?: string;
  externalRef?: string;
  preAuthVerified?: boolean;
  type: (typeof TransactionType)[keyof typeof TransactionType];
  ventureId?: string;
}

interface TransactionFilters {
  agentId?: string;
  limit?: number;
  type?: string;
  ventureId?: string;
}

export interface RevenueSplitResult {
  operatorAmount: number;
  reinvestAmount: number;
}

// ─── Record Transaction ──────────────────────────────────────────

export async function recordTransaction(
  db: Database,
  params: RecordTransactionParams
) {
  const data: typeof financialTransactions.$inferInsert = {
    agentId: params.agentId ?? null,
    ventureId: params.ventureId ?? null,
    type: params.type,
    amount: params.amount,
    currency: params.currency ?? DEFAULT_BUDGET_CURRENCY,
    category: params.category,
    description: params.description ?? null,
    externalRef: params.externalRef ?? null,
    preAuthVerified: params.preAuthVerified ?? false,
  };

  const result = await db
    .insert(financialTransactions)
    .values(data)
    .returning();
  const tx = result[0];

  log.info("Transaction recorded", {
    id: tx.id,
    type: params.type,
    amount: params.amount,
    category: params.category,
  });

  return tx;
}

// ─── Balance Queries ─────────────────────────────────────────────

export async function getBalance(
  db: Database,
  agentId: string
): Promise<number> {
  const result = await db
    .select({
      balance: sql<string>`
        COALESCE(SUM(
          CASE WHEN ${financialTransactions.type} = ${TransactionType.Revenue}
            THEN ${financialTransactions.amount}
          ELSE -${financialTransactions.amount}
          END
        ), 0)
      `,
    })
    .from(financialTransactions)
    .where(eq(financialTransactions.agentId, agentId));

  return Number.parseFloat(result[0]?.balance ?? "0");
}

export async function getVentureBalance(
  db: Database,
  ventureId: string
): Promise<number> {
  const result = await db
    .select({
      balance: sql<string>`
        COALESCE(SUM(
          CASE WHEN ${financialTransactions.type} = ${TransactionType.Revenue}
            THEN ${financialTransactions.amount}
          ELSE -${financialTransactions.amount}
          END
        ), 0)
      `,
    })
    .from(financialTransactions)
    .where(eq(financialTransactions.ventureId, ventureId));

  return Number.parseFloat(result[0]?.balance ?? "0");
}

// ─── Revenue Split ───────────────────────────────────────────────

export function computeRevenueSplit(
  amount: number,
  operatorRate: number,
  reinvestRate: number
): RevenueSplitResult {
  return {
    operatorAmount: Math.round(amount * operatorRate * 100) / 100,
    reinvestAmount: Math.round(amount * reinvestRate * 100) / 100,
  };
}

// ─── Filtered Queries ────────────────────────────────────────────

export async function getTransactions(
  db: Database,
  filters?: TransactionFilters
) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.agentId) {
    conditions.push(eq(financialTransactions.agentId, filters.agentId));
  }
  if (filters?.ventureId) {
    conditions.push(eq(financialTransactions.ventureId, filters.ventureId));
  }
  if (filters?.type) {
    conditions.push(eq(financialTransactions.type, filters.type));
  }

  const query = db
    .select()
    .from(financialTransactions)
    .orderBy(desc(financialTransactions.createdAt));

  if (conditions.length > 0) {
    const filtered = query.where(and(...conditions));
    if (filters?.limit) {
      return filtered.limit(filters.limit);
    }
    return filtered;
  }

  if (filters?.limit) {
    return query.limit(filters.limit);
  }

  return query;
}

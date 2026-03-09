import {
  createLogger,
  DEFAULT_BUDGET_CURRENCY,
  DEFAULT_REVENUE_SPLIT_OPERATOR,
  DEFAULT_REVENUE_SPLIT_REINVEST,
  TransactionType,
} from "@axiom/shared";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { getSystemConfig } from "../db/queries.js";
import { financialTransactions } from "../db/schema.js";
import { computeRevenueSplit, recordTransaction } from "./ledger.js";

const log = createLogger("financial:revenue");

// ─── Types ────────────────────────────────────────────────────────

interface RecordRevenueParams {
  amount: string;
  currency?: string;
  description?: string;
  externalRef?: string;
  ventureId: string;
}

interface SplitConfig {
  operatorRate: number;
  reinvestRate: number;
}

interface RevenueSummary {
  totalOperatorSplit: number;
  totalReinvestSplit: number;
  totalRevenue: number;
}

// ─── Record Revenue ───────────────────────────────────────────────

export async function recordRevenue(db: Database, params: RecordRevenueParams) {
  const tx = await recordTransaction(db, {
    ventureId: params.ventureId,
    type: TransactionType.Revenue,
    amount: params.amount,
    currency: params.currency ?? DEFAULT_BUDGET_CURRENCY,
    category: "revenue",
    description: params.description,
    externalRef: params.externalRef,
  });

  log.info("Revenue recorded", {
    id: tx.id,
    ventureId: params.ventureId,
    amount: params.amount,
  });

  return tx;
}

// ─── Apply Revenue Split ──────────────────────────────────────────

export async function applyRevenueSplit(
  db: Database,
  ventureId: string,
  amount: number,
  config: SplitConfig
) {
  const split = computeRevenueSplit(
    amount,
    config.operatorRate,
    config.reinvestRate
  );

  const operatorTx = await recordTransaction(db, {
    ventureId,
    type: TransactionType.SplitOperator,
    amount: split.operatorAmount.toFixed(2),
    category: "revenue_split",
    description: `Operator split (${(config.operatorRate * 100).toFixed(0)}%)`,
  });

  const reinvestTx = await recordTransaction(db, {
    ventureId,
    type: TransactionType.SplitReinvestment,
    amount: split.reinvestAmount.toFixed(2),
    category: "revenue_split",
    description: `Reinvestment split (${(config.reinvestRate * 100).toFixed(0)}%)`,
  });

  log.info("Revenue split applied", {
    ventureId,
    amount,
    operatorAmount: split.operatorAmount,
    reinvestAmount: split.reinvestAmount,
  });

  return { operatorTx, reinvestTx, split };
}

// ─── Process Revenue (convenience) ───────────────────────────────

export async function processRevenue(
  db: Database,
  params: {
    ventureId: string;
    amount: string;
    currency?: string;
    description?: string;
  }
) {
  const revenueTx = await recordRevenue(db, params);

  const config = await getSystemConfig(db);
  const operatorRate =
    config?.revenueSplitOperator ?? DEFAULT_REVENUE_SPLIT_OPERATOR;
  const reinvestRate =
    config?.revenueSplitReinvest ?? DEFAULT_REVENUE_SPLIT_REINVEST;

  const splitResult = await applyRevenueSplit(
    db,
    params.ventureId,
    Number.parseFloat(params.amount),
    { operatorRate, reinvestRate }
  );

  return { revenueTx, ...splitResult };
}

// ─── Revenue Summary ──────────────────────────────────────────────

export async function getRevenueSummary(
  db: Database,
  ventureId?: string
): Promise<RevenueSummary> {
  const _conditions = ventureId
    ? sql`WHERE ${financialTransactions.ventureId} = ${ventureId}`
    : sql``;

  const result = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(
        CASE WHEN ${financialTransactions.type} = ${TransactionType.Revenue}
          THEN ${financialTransactions.amount} ELSE 0 END
      ), 0)`,
      totalOperatorSplit: sql<string>`COALESCE(SUM(
        CASE WHEN ${financialTransactions.type} = ${TransactionType.SplitOperator}
          THEN ${financialTransactions.amount} ELSE 0 END
      ), 0)`,
      totalReinvestSplit: sql<string>`COALESCE(SUM(
        CASE WHEN ${financialTransactions.type} = ${TransactionType.SplitReinvestment}
          THEN ${financialTransactions.amount} ELSE 0 END
      ), 0)`,
    })
    .from(financialTransactions)
    .where(
      ventureId ? eq(financialTransactions.ventureId, ventureId) : sql`TRUE`
    );

  const row = result[0];
  return {
    totalRevenue: Number.parseFloat(row?.totalRevenue ?? "0"),
    totalOperatorSplit: Number.parseFloat(row?.totalOperatorSplit ?? "0"),
    totalReinvestSplit: Number.parseFloat(row?.totalReinvestSplit ?? "0"),
  };
}

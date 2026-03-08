import {
  financialTransactions,
  llmUsageLogs,
} from "@axiom/orchestrator/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "transactions";

  if (view === "summary") {
    const [revenue] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(financialTransactions)
      .where(eq(financialTransactions.type, "revenue"));
    const [expenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(financialTransactions)
      .where(eq(financialTransactions.type, "expense"));
    const [llmCosts] = await db
      .select({ total: sql<string>`COALESCE(SUM(computed_cost_usd), 0)` })
      .from(llmUsageLogs);

    const totalRevenue = Number.parseFloat(revenue.total);
    const totalExpenses = Number.parseFloat(expenses.total);
    const totalLlmCosts = Number.parseFloat(llmCosts.total);

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netBalance: totalRevenue - totalExpenses,
      llmCosts: totalLlmCosts,
      currency: "USD",
    });
  }

  if (view === "costs") {
    const costs = await db
      .select()
      .from(llmUsageLogs)
      .orderBy(desc(llmUsageLogs.createdAt))
      .limit(100);
    const [totals] = await db
      .select({
        inputTokens: sql<string>`COALESCE(SUM(input_tokens), 0)`,
        outputTokens: sql<string>`COALESCE(SUM(output_tokens), 0)`,
        totalCost: sql<string>`COALESCE(SUM(computed_cost_usd), 0)`,
      })
      .from(llmUsageLogs);

    return NextResponse.json({
      costs,
      totalTokens: {
        input: Number.parseInt(totals.inputTokens, 10),
        output: Number.parseInt(totals.outputTokens, 10),
      },
      totalCost: Number.parseFloat(totals.totalCost),
      currency: "USD",
    });
  }

  // Default: transactions list
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "50", 10);

  const transactions = await db
    .select()
    .from(financialTransactions)
    .orderBy(desc(financialTransactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(financialTransactions);

  return NextResponse.json({
    transactions,
    total: Number.parseInt(countResult.count, 10),
    page,
    pageSize,
  });
}

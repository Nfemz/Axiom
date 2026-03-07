import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "transactions";

  if (view === "summary") {
    // TODO: Aggregate financial data from orchestrator DB
    return NextResponse.json({
      totalRevenue: 0,
      totalExpenses: 0,
      netBalance: 0,
      llmCosts: 0,
      currency: "USD",
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
    });
  }

  if (view === "costs") {
    // TODO: Fetch LLM costs breakdown from orchestrator DB
    return NextResponse.json({
      costs: [],
      totalTokens: { input: 0, output: 0 },
      totalCost: 0,
      currency: "USD",
      byAgent: [],
      byModel: [],
    });
  }

  // Default: transactions list
  // TODO: Fetch transactions from orchestrator DB
  return NextResponse.json({
    transactions: [],
    total: 0,
    page: 1,
    pageSize: 50,
  });
}

import { eq, sql, desc } from "drizzle-orm";
import { createLogger } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";
import { llmUsageLogs } from "../db/schema.js";

const log = createLogger("financial:llm-costs");

// ─── Model Pricing (per 1M tokens) ───────────────────────────────

interface ModelPricing {
  input: number;
  output: number;
  cacheRead?: number;
  cacheCreate?: number;
}

const MODEL_COSTS: Record<string, ModelPricing> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
} as const;

// ─── Cost Computation ─────────────────────────────────────────────

export function computeCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheCreateTokens: number = 0,
): number {
  const pricing = MODEL_COSTS[modelId];
  if (!pricing) {
    log.warn("Unknown model pricing, using zero cost", { modelId });
    return 0;
  }

  const perMillion = 1_000_000;
  const inputCost = (inputTokens / perMillion) * pricing.input;
  const outputCost = (outputTokens / perMillion) * pricing.output;

  // Cache reads are typically cheaper (use 10% of input price)
  const cacheReadRate = pricing.cacheRead ?? pricing.input * 0.1;
  const cacheReadCost = (cacheReadTokens / perMillion) * cacheReadRate;

  // Cache creation uses full input price
  const cacheCreateRate = pricing.cacheCreate ?? pricing.input;
  const cacheCreateCost = (cacheCreateTokens / perMillion) * cacheCreateRate;

  const total = inputCost + outputCost + cacheReadCost + cacheCreateCost;
  return Math.round(total * 1_000_000) / 1_000_000;
}

// ─── Record Usage ─────────────────────────────────────────────────

interface RecordUsageParams {
  agentId: string;
  sessionId?: string;
  modelProvider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreateTokens?: number;
}

export async function recordUsage(db: Database, params: RecordUsageParams) {
  const cost = computeCost(
    params.modelId,
    params.inputTokens,
    params.outputTokens,
    params.cacheReadTokens ?? 0,
    params.cacheCreateTokens ?? 0,
  );

  const data: typeof llmUsageLogs.$inferInsert = {
    agentId: params.agentId,
    sessionId: params.sessionId ?? null,
    modelProvider: params.modelProvider,
    modelId: params.modelId,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadTokens: params.cacheReadTokens ?? 0,
    cacheCreateTokens: params.cacheCreateTokens ?? 0,
    computedCostUsd: cost.toFixed(6),
  };

  const result = await db.insert(llmUsageLogs).values(data).returning();
  const entry = result[0];

  log.info("LLM usage recorded", {
    id: entry.id,
    agentId: params.agentId,
    modelId: params.modelId,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    costUsd: cost,
  });

  return entry;
}

// ─── Cost Queries ─────────────────────────────────────────────────

export async function getAgentCosts(db: Database, agentId: string): Promise<number> {
  const result = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(${llmUsageLogs.computedCostUsd}), 0)`,
    })
    .from(llmUsageLogs)
    .where(eq(llmUsageLogs.agentId, agentId));

  return parseFloat(result[0]?.totalCost ?? "0");
}

export async function getModelCosts(db: Database) {
  return db
    .select({
      modelId: llmUsageLogs.modelId,
      totalCost: sql<string>`SUM(${llmUsageLogs.computedCostUsd})`,
      totalInputTokens: sql<number>`SUM(${llmUsageLogs.inputTokens})`,
      totalOutputTokens: sql<number>`SUM(${llmUsageLogs.outputTokens})`,
      usageCount: sql<number>`COUNT(*)`,
    })
    .from(llmUsageLogs)
    .groupBy(llmUsageLogs.modelId)
    .orderBy(desc(sql`SUM(${llmUsageLogs.computedCostUsd})`));
}

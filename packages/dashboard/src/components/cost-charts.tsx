"use client";

import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { AgentCostBreakdown, ModelCostBreakdown } from "./cost-breakdowns";

// ─── Types ──────────────────────────────────────────────────────────

interface AgentCost {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  totalCost: number;
}

interface ModelCost {
  avgCostPerRequest: number;
  modelId: string;
  provider: string;
  requestCount: number;
  totalCost: number;
}

interface CostsResponse {
  costs: Array<{
    agentId: string;
    computedCostUsd: string;
    createdAt: string;
    id: string;
    inputTokens: number;
    modelId: string;
    modelProvider: string;
    outputTokens: number;
  }>;
  currency: string;
  totalCost: number;
  totalTokens: { input: number; output: number };
}

interface SummaryResponse {
  currency: string;
  llmCosts: number;
  netBalance: number;
  totalExpenses: number;
  totalRevenue: number;
}

type TimeRange = "7d" | "30d";

// ─── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function computeProjectedMonthly(totalCost: number, range: TimeRange): number {
  const days = range === "7d" ? 7 : 30;
  return (totalCost / days) * 30;
}

function aggregateByAgent(costs: CostsResponse["costs"]): AgentCost[] {
  const byAgent = new Map<string, AgentCost>();
  for (const row of costs) {
    const key = row.agentId;
    const existing = byAgent.get(key);
    if (existing) {
      existing.totalCost += Number.parseFloat(row.computedCostUsd);
      existing.inputTokens += row.inputTokens;
      existing.outputTokens += row.outputTokens;
      existing.requestCount += 1;
    } else {
      byAgent.set(key, {
        agentId: key,
        agentName: key,
        totalCost: Number.parseFloat(row.computedCostUsd),
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        requestCount: 1,
      });
    }
  }
  return Array.from(byAgent.values()).sort((a, b) => b.totalCost - a.totalCost);
}

function aggregateByModel(costs: CostsResponse["costs"]): ModelCost[] {
  const byModel = new Map<string, ModelCost>();
  for (const row of costs) {
    const key = row.modelId;
    const existing = byModel.get(key);
    const cost = Number.parseFloat(row.computedCostUsd);
    if (existing) {
      existing.totalCost += cost;
      existing.requestCount += 1;
      existing.avgCostPerRequest = existing.totalCost / existing.requestCount;
    } else {
      byModel.set(key, {
        modelId: key,
        provider: row.modelProvider,
        totalCost: cost,
        requestCount: 1,
        avgCostPerRequest: cost,
      });
    }
  }
  return Array.from(byModel.values()).sort((a, b) => b.totalCost - a.totalCost);
}

// ─── Component ──────────────────────────────────────────────────────

export default function CostCharts() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [agentCosts, setAgentCosts] = useState<AgentCost[]>([]);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [costsResponse, summaryResponse] = await Promise.all([
        fetch("/api/financial?view=costs"),
        fetch("/api/financial?view=summary"),
      ]);

      if (!(costsResponse.ok && summaryResponse.ok)) {
        throw new Error("Failed to fetch financial data");
      }

      const costsData: CostsResponse = await costsResponse.json();
      const summaryData: SummaryResponse = await summaryResponse.json();

      setAgentCosts(aggregateByAgent(costsData.costs));
      setModelCosts(aggregateByModel(costsData.costs));
      setTotalCost(costsData.totalCost);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const projectedMonthly = computeProjectedMonthly(totalCost, range);

  if (loading) {
    return (
      <p className="py-12 text-center text-muted-foreground text-sm">
        Loading cost data...
      </p>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription className="flex items-center gap-2">
          Error loading cost data: {error}
          <Button onClick={() => void fetchData()} size="sm" variant="link">
            <RefreshCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <TokenEconomicsHeader onRangeChange={setRange} range={range} />

      <CostSummaryCards
        projectedMonthly={projectedMonthly}
        summary={summary}
        totalCost={totalCost}
      />

      <AgentCostBreakdown agentCosts={agentCosts} />
      <ModelCostBreakdown modelCosts={modelCosts} />
    </div>
  );
}

function TokenEconomicsHeader({
  range,
  onRangeChange,
}: {
  onRangeChange: (range: TimeRange) => void;
  range: TimeRange;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-lg">Token Economics</h2>
      <ToggleGroup
        onValueChange={(value) => {
          if (value) {
            onRangeChange(value as TimeRange);
          }
        }}
        type="single"
        value={range}
        variant="outline"
      >
        <ToggleGroupItem value="7d">7d</ToggleGroupItem>
        <ToggleGroupItem value="30d">30d</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function CostSummaryCards({
  totalCost,
  projectedMonthly,
  summary,
}: {
  projectedMonthly: number;
  summary: SummaryResponse | null;
  totalCost: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Total LLM Spend</CardDescription>
          <CardTitle className="text-2xl">
            {formatCurrency(totalCost)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Projected Monthly</CardDescription>
          <CardTitle className="text-2xl text-chart-4">
            {formatCurrency(projectedMonthly)}
          </CardTitle>
        </CardHeader>
      </Card>
      {summary && (
        <Card>
          <CardHeader>
            <CardDescription>Net Balance (ROI)</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                summary.netBalance >= 0 ? "text-chart-2" : "text-destructive"
              )}
            >
              {formatCurrency(summary.netBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Rev {formatCurrency(summary.totalRevenue)} / Exp{" "}
              {formatCurrency(summary.totalExpenses)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

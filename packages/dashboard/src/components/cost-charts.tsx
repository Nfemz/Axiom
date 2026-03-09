"use client";

import { useCallback, useEffect, useState } from "react";

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
    id: string;
    agentId: string;
    modelProvider: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    computedCostUsd: string;
    createdAt: string;
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

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
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
      const [costsRes, summaryRes] = await Promise.all([
        fetch("/api/financial?view=costs"),
        fetch("/api/financial?view=summary"),
      ]);

      if (!(costsRes.ok && summaryRes.ok)) {
        throw new Error("Failed to fetch financial data");
      }

      const costsData: CostsResponse = await costsRes.json();
      const summaryData: SummaryResponse = await summaryRes.json();

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
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 text-sm">Loading cost data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-700 text-sm">Error loading cost data: {error}</p>
        <button
          className="mt-2 font-medium text-red-600 text-sm underline hover:text-red-800"
          onClick={() => void fetchData()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Range Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-lg">Token Economics</h2>
        <div className="flex rounded-md border border-gray-300 bg-white shadow-sm">
          <button
            className={`px-4 py-1.5 font-medium text-sm ${
              range === "7d"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-l-md`}
            onClick={() => setRange("7d")}
            type="button"
          >
            7d
          </button>
          <button
            className={`px-4 py-1.5 font-medium text-sm ${
              range === "30d"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-r-md`}
            onClick={() => setRange("30d")}
            type="button"
          >
            30d
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-gray-500 text-sm">Total LLM Spend</p>
          <p className="mt-1 font-bold text-2xl text-gray-900">
            {formatCurrency(totalCost)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-gray-500 text-sm">Projected Monthly</p>
          <p className="mt-1 font-bold text-2xl text-orange-600">
            {formatCurrency(projectedMonthly)}
          </p>
        </div>
        {summary && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-medium text-gray-500 text-sm">
              Net Balance (ROI)
            </p>
            <p
              className={`mt-1 font-bold text-2xl ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(summary.netBalance)}
            </p>
            <p className="mt-1 text-gray-400 text-xs">
              Rev {formatCurrency(summary.totalRevenue)} / Exp{" "}
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
        )}
      </div>

      {/* Per-Agent Cost Breakdown */}
      <div>
        <h3 className="mb-4 font-semibold text-base text-gray-900">
          Per-Agent Cost Breakdown
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Input Tokens
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Output Tokens
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {agentCosts.map((agent) => (
                <tr className="hover:bg-gray-50" key={agent.agentId}>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm">
                    {agent.agentName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {formatCurrency(agent.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {formatTokens(agent.inputTokens)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {formatTokens(agent.outputTokens)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {agent.requestCount}
                  </td>
                </tr>
              ))}
              {agentCosts.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                    colSpan={5}
                  >
                    No cost data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Model Cost Breakdown */}
      <div>
        <h3 className="mb-4 font-semibold text-base text-gray-900">
          Per-Model Cost Breakdown
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Avg / Request
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {modelCosts.map((model) => (
                <tr className="hover:bg-gray-50" key={model.modelId}>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm">
                    {model.modelId}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {model.provider}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {formatCurrency(model.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {model.requestCount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {formatCurrency(model.avgCostPerRequest)}
                  </td>
                </tr>
              ))}
              {modelCosts.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                    colSpan={5}
                  >
                    No model cost data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

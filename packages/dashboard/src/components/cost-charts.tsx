"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface AgentCost {
  agentId: string;
  agentName: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

interface ModelCost {
  modelId: string;
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
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
  totalTokens: { input: number; output: number };
  totalCost: number;
  currency: string;
}

interface SummaryResponse {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  llmCosts: number;
  currency: string;
}

type TimeRange = "7d" | "30d";

// ─── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
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
      existing.totalCost += parseFloat(row.computedCostUsd);
      existing.inputTokens += row.inputTokens;
      existing.outputTokens += row.outputTokens;
      existing.requestCount += 1;
    } else {
      byAgent.set(key, {
        agentId: key,
        agentName: key,
        totalCost: parseFloat(row.computedCostUsd),
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
    const cost = parseFloat(row.computedCostUsd);
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

      if (!costsRes.ok || !summaryRes.ok) {
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
        <p className="text-sm text-gray-500">Loading cost data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">Error loading cost data: {error}</p>
        <button
          onClick={() => void fetchData()}
          className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800"
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
        <h2 className="text-lg font-semibold text-gray-900">Token Economics</h2>
        <div className="flex rounded-md border border-gray-300 bg-white shadow-sm">
          <button
            onClick={() => setRange("7d")}
            className={`px-4 py-1.5 text-sm font-medium ${
              range === "7d"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-l-md`}
          >
            7d
          </button>
          <button
            onClick={() => setRange("30d")}
            className={`px-4 py-1.5 text-sm font-medium ${
              range === "30d"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-r-md`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total LLM Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Projected Monthly</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(projectedMonthly)}</p>
        </div>
        {summary && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Net Balance (ROI)</p>
            <p className={`mt-1 text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.netBalance)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Rev {formatCurrency(summary.totalRevenue)} / Exp {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
        )}
      </div>

      {/* Per-Agent Cost Breakdown */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">Per-Agent Cost Breakdown</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Input Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Output Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {agentCosts.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{agent.agentName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatCurrency(agent.totalCost)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatTokens(agent.inputTokens)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatTokens(agent.outputTokens)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{agent.requestCount}</td>
                </tr>
              ))}
              {agentCosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
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
        <h3 className="mb-4 text-base font-semibold text-gray-900">Per-Model Cost Breakdown</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Avg / Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {modelCosts.map((model) => (
                <tr key={model.modelId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{model.modelId}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{model.provider}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatCurrency(model.totalCost)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{model.requestCount}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatCurrency(model.avgCostPerRequest)}</td>
                </tr>
              ))}
              {modelCosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
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

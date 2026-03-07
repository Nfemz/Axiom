"use client";

import { useState } from "react";

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

type TimeRange = "7d" | "30d";

const PLACEHOLDER_AGENT_COSTS: AgentCost[] = [
  { agentId: "1", agentName: "research-agent-01", totalCost: 4.82, inputTokens: 125000, outputTokens: 42000, requestCount: 38 },
  { agentId: "2", agentName: "code-agent-02", totalCost: 12.35, inputTokens: 340000, outputTokens: 98000, requestCount: 72 },
  { agentId: "3", agentName: "content-agent-03", totalCost: 2.10, inputTokens: 55000, outputTokens: 31000, requestCount: 15 },
];

const PLACEHOLDER_MODEL_COSTS: ModelCost[] = [
  { modelId: "claude-3.5-sonnet", provider: "Anthropic", totalCost: 8.92, requestCount: 64, avgCostPerRequest: 0.139 },
  { modelId: "gpt-4o", provider: "OpenAI", totalCost: 7.15, requestCount: 42, avgCostPerRequest: 0.170 },
  { modelId: "gemini-pro", provider: "Google", totalCost: 3.20, requestCount: 19, avgCostPerRequest: 0.168 },
];

// ─── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
}

function computeProjectedMonthly(costs: AgentCost[], range: TimeRange): number {
  const total = costs.reduce((sum, c) => sum + c.totalCost, 0);
  const days = range === "7d" ? 7 : 30;
  return (total / days) * 30;
}

// ─── Component ──────────────────────────────────────────────────────

export default function CostCharts() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [agentCosts] = useState<AgentCost[]>(PLACEHOLDER_AGENT_COSTS);
  const [modelCosts] = useState<ModelCost[]>(PLACEHOLDER_MODEL_COSTS);

  const projectedMonthly = computeProjectedMonthly(agentCosts, range);
  const totalSpend = agentCosts.reduce((sum, c) => sum + c.totalCost, 0);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Spend ({range === "7d" ? "Last 7 Days" : "Last 30 Days"})
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Projected Monthly</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(projectedMonthly)}</p>
        </div>
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

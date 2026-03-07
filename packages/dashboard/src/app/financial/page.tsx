"use client";

import { useState } from "react";

interface Transaction {
  id: string;
  type: "expense" | "revenue";
  amount: number;
  agent: string;
  category: string;
  description: string;
  date: string;
}

interface AgentCost {
  agentId: string;
  agentName: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

const PLACEHOLDER_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "expense",
    amount: 0.42,
    agent: "research-agent-01",
    category: "LLM",
    description: "Claude 3.5 Sonnet - market analysis",
    date: "2026-03-07T10:30:00Z",
  },
  {
    id: "2",
    type: "expense",
    amount: 1.15,
    agent: "code-agent-02",
    category: "LLM",
    description: "GPT-4o - code generation",
    date: "2026-03-07T09:15:00Z",
  },
  {
    id: "3",
    type: "expense",
    amount: 0.08,
    agent: "research-agent-01",
    category: "Sandbox",
    description: "E2B sandbox runtime (12 min)",
    date: "2026-03-07T08:00:00Z",
  },
  {
    id: "4",
    type: "revenue",
    amount: 25.0,
    agent: "content-agent-03",
    category: "Delivery",
    description: "Blog post delivered",
    date: "2026-03-06T16:00:00Z",
  },
];

const PLACEHOLDER_AGENT_COSTS: AgentCost[] = [
  {
    agentId: "1",
    agentName: "research-agent-01",
    totalCost: 4.82,
    inputTokens: 125000,
    outputTokens: 42000,
    requestCount: 38,
  },
  {
    agentId: "2",
    agentName: "code-agent-02",
    totalCost: 12.35,
    inputTokens: 340000,
    outputTokens: 98000,
    requestCount: 72,
  },
  {
    agentId: "3",
    agentName: "content-agent-03",
    totalCost: 2.1,
    inputTokens: 55000,
    outputTokens: 31000,
    requestCount: 15,
  },
];

const PLACEHOLDER_SUMMARY = {
  totalRevenue: 125.0,
  totalExpenses: 19.27,
  netBalance: 105.73,
  llmCosts: 17.17,
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export default function FinancialPage() {
  const [transactions] = useState<Transaction[]>(PLACEHOLDER_TRANSACTIONS);
  const [agentCosts] = useState<AgentCost[]>(PLACEHOLDER_AGENT_COSTS);
  const [summary] = useState(PLACEHOLDER_SUMMARY);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Financial Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Net Balance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(summary.netBalance)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">LLM Costs</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">
              {formatCurrency(summary.llmCosts)}
            </p>
          </div>
        </div>

        {/* Per-Agent Cost Breakdown */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Per-Agent Cost Breakdown
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Input Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Output Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Requests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {agentCosts.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {agent.agentName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatCurrency(agent.totalCost)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatTokens(agent.inputTokens)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatTokens(agent.outputTokens)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {agent.requestCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Transactions
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          tx.type === "revenue"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        tx.type === "revenue"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "revenue" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.agent}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import CostCharts from "@/components/cost-charts";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  agentId: string | null;
  category: string;
  description: string | null;
  createdAt: string;
}

interface SummaryData {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  llmCosts: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function FinancialPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, summaryRes] = await Promise.all([
        fetch("/api/financial?view=transactions"),
        fetch("/api/financial?view=summary"),
      ]);

      if (!txRes.ok || !summaryRes.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const txData = await txRes.json();
      const summaryData: SummaryData = await summaryRes.json();

      setTransactions(txData.transactions ?? []);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Financial Dashboard
        </h1>

        {/* Summary Cards */}
        {summary && (
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
        )}

        {loading && !summary && (
          <div className="mb-8 flex items-center justify-center py-8">
            <p className="text-sm text-gray-500">Loading financial data...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">Error: {error}</p>
            <button
              onClick={() => void fetchData()}
              className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Token Economics (Cost Charts) */}
        <div className="mb-8">
          <CostCharts />
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
                      {formatCurrency(parseFloat(tx.amount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.agentId ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.description ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && !loading && (
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

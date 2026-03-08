"use client";

import { useCallback, useEffect, useState } from "react";
import CostCharts from "@/components/cost-charts";

interface Transaction {
  agentId: string | null;
  amount: string;
  category: string;
  createdAt: string;
  description: string | null;
  id: string;
  type: string;
}

interface SummaryData {
  llmCosts: number;
  netBalance: number;
  totalExpenses: number;
  totalRevenue: number;
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

      if (!(txRes.ok && summaryRes.ok)) {
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
        <h1 className="mb-8 font-bold text-2xl text-gray-900">
          Financial Dashboard
        </h1>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-medium text-gray-500 text-sm">Total Revenue</p>
              <p className="mt-1 font-bold text-2xl text-green-600">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-medium text-gray-500 text-sm">
                Total Expenses
              </p>
              <p className="mt-1 font-bold text-2xl text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-medium text-gray-500 text-sm">Net Balance</p>
              <p className="mt-1 font-bold text-2xl text-gray-900">
                {formatCurrency(summary.netBalance)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-medium text-gray-500 text-sm">LLM Costs</p>
              <p className="mt-1 font-bold text-2xl text-orange-600">
                {formatCurrency(summary.llmCosts)}
              </p>
            </div>
          </div>
        )}

        {loading && !summary && (
          <div className="mb-8 flex items-center justify-center py-8">
            <p className="text-gray-500 text-sm">Loading financial data...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-700 text-sm">Error: {error}</p>
            <button
              className="mt-2 font-medium text-red-600 text-sm underline hover:text-red-800"
              onClick={() => void fetchData()}
              type="button"
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
          <h2 className="mb-4 font-semibold text-gray-900 text-lg">
            Recent Transactions
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactions.map((tx) => (
                  <tr className="hover:bg-gray-50" key={tx.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${
                          tx.type === "revenue"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 font-medium text-sm ${
                        tx.type === "revenue"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "revenue" ? "+" : "-"}
                      {formatCurrency(Number.parseFloat(tx.amount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {tx.agentId ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {tx.category}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {tx.description ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && !loading && (
                  <tr>
                    <td
                      className="px-6 py-12 text-center text-gray-500 text-sm"
                      colSpan={6}
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

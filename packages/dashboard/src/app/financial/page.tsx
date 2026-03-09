"use client";

import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import CostCharts from "@/components/cost-charts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
      const [transactionResponse, summaryResponse] = await Promise.all([
        fetch("/api/financial?view=transactions"),
        fetch("/api/financial?view=summary"),
      ]);

      if (!(transactionResponse.ok && summaryResponse.ok)) {
        throw new Error("Failed to fetch financial data");
      }

      const transactionData = await transactionResponse.json();
      const summaryData: SummaryData = await summaryResponse.json();

      setTransactions(transactionData.transactions ?? []);
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
    <div className="flex flex-col gap-8">
      <h1 className="font-bold text-2xl">Financial Dashboard</h1>

      {summary && <SummaryCards summary={summary} />}

      {loading && !summary && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          Loading financial data...
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription className="flex items-center gap-2">
            Error: {error}
            <Button onClick={() => void fetchData()} size="sm" variant="link">
              <RefreshCwIcon data-icon="inline-start" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <CostCharts />

      <TransactionsSection loading={loading} transactions={transactions} />
    </div>
  );
}

function SummaryCards({ summary }: { summary: SummaryData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(summary.totalRevenue)}
        valueClassName="text-chart-2"
      />
      <MetricCard
        title="Total Expenses"
        value={formatCurrency(summary.totalExpenses)}
        valueClassName="text-destructive"
      />
      <MetricCard
        title="Net Balance"
        value={formatCurrency(summary.netBalance)}
      />
      <MetricCard
        title="LLM Costs"
        value={formatCurrency(summary.llmCosts)}
        valueClassName="text-chart-4"
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  valueClassName,
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn("text-2xl", valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function TransactionsSection({
  transactions,
  loading,
}: {
  loading: boolean;
  transactions: Transaction[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          View all financial transactions across your agents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
            {transactions.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No transactions recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isRevenue = transaction.type === "revenue";

  return (
    <TableRow>
      <TableCell>
        <Badge variant={isRevenue ? "secondary" : "destructive"}>
          {transaction.type}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          "font-medium",
          isRevenue ? "text-chart-2" : "text-destructive"
        )}
      >
        {isRevenue ? "+" : "-"}
        {formatCurrency(Number.parseFloat(transaction.amount))}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.agentId ?? "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.category}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.description ?? "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(transaction.createdAt).toLocaleString()}
      </TableCell>
    </TableRow>
  );
}

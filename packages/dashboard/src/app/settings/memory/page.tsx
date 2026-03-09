"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

// ─── Types ──────────────────────────────────────────────────────────

interface MemoryOperation {
  agentName: string;
  content: string;
  id: string;
  timestamp: string;
  type: "write" | "read" | "consolidate";
}

interface MemoryHealthMetrics {
  avgImportanceScore: number;
  knowledgeBaseEntries: number;
  knowledgeGrowthLast24h: number;
  totalMemories: number;
  writeRateLastHour: number;
}

// ─── Placeholder Data ───────────────────────────────────────────────

const PLACEHOLDER_OPS: MemoryOperation[] = [
  {
    id: "1",
    type: "write",
    agentName: "research-agent-01",
    content: "Stored market analysis findings for Q1 2026",
    timestamp: "2026-03-07T10:30:00Z",
  },
  {
    id: "2",
    type: "read",
    agentName: "content-agent-03",
    content: "Retrieved brand voice guidelines",
    timestamp: "2026-03-07T10:15:00Z",
  },
  {
    id: "3",
    type: "consolidate",
    agentName: "research-agent-01",
    content: "Merged 12 episodic memories into 3 semantic entries",
    timestamp: "2026-03-07T09:45:00Z",
  },
  {
    id: "4",
    type: "write",
    agentName: "code-agent-02",
    content: "Recorded debugging session outcome for API integration",
    timestamp: "2026-03-07T09:00:00Z",
  },
  {
    id: "5",
    type: "read",
    agentName: "code-agent-02",
    content: "Retrieved deployment checklist from shared knowledge",
    timestamp: "2026-03-07T08:30:00Z",
  },
];

const TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  write: "default",
  read: "secondary",
  consolidate: "outline",
};

const REFLECTION_DATA = [
  { key: "d0", value: 3 },
  { key: "d1", value: 5 },
  { key: "d2", value: 2 },
  { key: "d3", value: 7 },
  { key: "d4", value: 4 },
  { key: "d5", value: 6 },
  { key: "d6", value: 8 },
  { key: "d7", value: 3 },
  { key: "d8", value: 5 },
  { key: "d9", value: 4 },
  { key: "d10", value: 6 },
  { key: "d11", value: 7 },
  { key: "d12", value: 5 },
  { key: "d13", value: 3 },
];

// ─── Component ──────────────────────────────────────────────────────

export default function MemoryPage() {
  const [operations] = useState<MemoryOperation[]>(PLACEHOLDER_OPS);
  const [metrics, setMetrics] = useState<MemoryHealthMetrics | null>(null);

  useEffect(() => {
    fetch("/api/system/memory-health")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setMetrics(data);
        }
      })
      .catch(() => {
        // Fall back to defaults if endpoint unavailable
      });
  }, []);

  const summaryStats = {
    totalMemories: metrics?.totalMemories ?? 0,
    writeRate: metrics ? `${metrics.writeRateLastHour}/hr` : "-",
    readRate: "-",
    knowledgeEntries: metrics?.knowledgeBaseEntries ?? 0,
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-bold text-2xl text-foreground">
        Memory &amp; Cognitive Health
      </h1>

      <SummaryCards stats={summaryStats} />
      <GaugeRow />
      <OperationsTable operations={operations} />
    </div>
  );
}

// ─── Summary Cards ──────────────────────────────────────────────────

interface SummaryStats {
  knowledgeEntries: number;
  readRate: string;
  totalMemories: number;
  writeRate: string;
}

function SummaryCards({ stats }: { stats: SummaryStats }) {
  const cards = [
    { label: "Total Memories", value: stats.totalMemories, color: "" },
    { label: "Write Rate", value: stats.writeRate, color: "text-success" },
    { label: "Read Rate", value: stats.readRate, color: "text-info" },
    {
      label: "Knowledge Base Entries",
      value: stats.knowledgeEntries,
      color: "text-chart-3",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className={cn("text-2xl", card.color)}>
              {card.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

// ─── Gauge Row ──────────────────────────────────────────────────────

function GaugeRow() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RetrievalQualityCard />
      <ReflectionFrequencyCard />
    </div>
  );
}

function RetrievalQualityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrieval Quality</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: "82%" }}
            />
          </div>
          <span className="font-medium text-foreground text-sm">82%</span>
        </div>
        <p className="mt-2 text-muted-foreground text-xs">
          Average cosine similarity of retrieved memories to query context
        </p>
      </CardContent>
    </Card>
  );
}

function ReflectionFrequencyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reflection Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-24 items-end gap-1">
          {REFLECTION_DATA.map((entry) => (
            <div
              className="flex-1 rounded-t bg-primary/60"
              key={entry.key}
              style={{ height: `${(entry.value / 8) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-muted-foreground text-xs">
          Consolidation events per day (last 14 days)
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Operations Table ───────────────────────────────────────────────

function OperationsTable({ operations }: { operations: MemoryOperation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Memory Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((operation) => (
              <TableRow key={operation.id}>
                <TableCell>
                  <Badge variant={TYPE_VARIANT[operation.type] ?? "outline"}>
                    {operation.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-foreground">
                  {operation.agentName}
                </TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {operation.content}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(operation.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

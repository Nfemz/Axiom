"use client";

import { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface MemoryOperation {
  agentName: string;
  content: string;
  id: string;
  timestamp: string;
  type: "write" | "read" | "consolidate";
}

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

const TYPE_CLASSES: Record<string, string> = {
  write: "bg-green-100 text-green-800",
  read: "bg-blue-100 text-blue-800",
  consolidate: "bg-purple-100 text-purple-800",
};

// ─── Component ──────────────────────────────────────────────────────

interface MemoryHealthMetrics {
  avgImportanceScore: number;
  knowledgeBaseEntries: number;
  knowledgeGrowthLast24h: number;
  totalMemories: number;
  writeRateLastHour: number;
}

export default function MemoryPage() {
  const [operations] = useState<MemoryOperation[]>(PLACEHOLDER_OPS);
  const [metrics, setMetrics] = useState<MemoryHealthMetrics | null>(null);

  useEffect(() => {
    fetch("/api/system/memory-health")
      .then((res) => (res.ok ? res.json() : null))
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 font-bold text-2xl text-gray-900">
          Memory &amp; Cognitive Health
        </h1>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-medium text-gray-500 text-sm">Total Memories</p>
            <p className="mt-1 font-bold text-2xl text-gray-900">
              {summaryStats.totalMemories}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-medium text-gray-500 text-sm">Write Rate</p>
            <p className="mt-1 font-bold text-2xl text-green-600">
              {summaryStats.writeRate}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-medium text-gray-500 text-sm">Read Rate</p>
            <p className="mt-1 font-bold text-2xl text-blue-600">
              {summaryStats.readRate}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="font-medium text-gray-500 text-sm">
              Knowledge Base Entries
            </p>
            <p className="mt-1 font-bold text-2xl text-purple-600">
              {summaryStats.knowledgeEntries}
            </p>
          </div>
        </div>

        {/* Retrieval Quality Gauge */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Retrieval Quality
            </h2>
            <div className="flex items-center gap-4">
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: "82%" }}
                />
              </div>
              <span className="font-medium text-gray-700 text-sm">82%</span>
            </div>
            <p className="mt-2 text-gray-500 text-xs">
              Average cosine similarity of retrieved memories to query context
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Reflection Frequency
            </h2>
            <div className="flex h-24 items-end gap-1">
              {[
                "d0-3",
                "d1-5",
                "d2-2",
                "d3-7",
                "d4-4",
                "d5-6",
                "d6-8",
                "d7-3",
                "d8-5",
                "d9-4",
                "d10-6",
                "d11-7",
                "d12-5",
                "d13-3",
              ].map((entry) => {
                const v = Number(entry.split("-")[1]);
                return (
                  <div
                    className="flex-1 rounded-t bg-blue-400"
                    key={entry}
                    style={{ height: `${(v / 8) * 100}%` }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-gray-500 text-xs">
              Consolidation events per day (last 14 days)
            </p>
          </div>
        </div>

        {/* Recent Memory Operations */}
        <div>
          <h2 className="mb-4 font-semibold text-gray-900 text-lg">
            Recent Memory Operations
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {operations.map((op) => (
                  <tr className="hover:bg-gray-50" key={op.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${TYPE_CLASSES[op.type] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {op.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
                      {op.agentName}
                    </td>
                    <td className="max-w-md truncate px-6 py-4 text-gray-500 text-sm">
                      {op.content}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {new Date(op.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

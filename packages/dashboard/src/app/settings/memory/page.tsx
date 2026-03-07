"use client";

import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface MemoryOperation {
  id: string;
  type: "write" | "read" | "consolidate";
  agentName: string;
  content: string;
  timestamp: string;
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

export default function MemoryPage() {
  const [operations] = useState<MemoryOperation[]>(PLACEHOLDER_OPS);

  const summaryStats = {
    totalMemories: 1284,
    writeRate: "3.2/hr",
    readRate: "8.7/hr",
    knowledgeEntries: 47,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Memory &amp; Cognitive Health
        </h1>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Memories</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summaryStats.totalMemories}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Write Rate</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summaryStats.writeRate}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Read Rate</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summaryStats.readRate}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Knowledge Base Entries</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">{summaryStats.knowledgeEntries}</p>
          </div>
        </div>

        {/* Retrieval Quality Gauge */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Retrieval Quality</h2>
            <div className="flex items-center gap-4">
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: "82%" }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">82%</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Average cosine similarity of retrieved memories to query context
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Reflection Frequency</h2>
            <div className="flex h-24 items-end gap-1">
              {[3, 5, 2, 7, 4, 6, 8, 3, 5, 4, 6, 7, 5, 3].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-blue-400"
                  style={{ height: `${(v / 8) * 100}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Consolidation events per day (last 14 days)
            </p>
          </div>
        </div>

        {/* Recent Memory Operations */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Memory Operations
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {operations.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${TYPE_CLASSES[op.type] ?? "bg-gray-100 text-gray-800"}`}>
                        {op.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{op.agentName}</td>
                    <td className="max-w-md truncate px-6 py-4 text-sm text-gray-500">{op.content}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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

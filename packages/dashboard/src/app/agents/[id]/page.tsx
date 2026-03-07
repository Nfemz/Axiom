"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface AgentDetail {
  id: string;
  name?: string;
  status: string;
  model?: string;
  budgetSpent?: number;
  budgetTotal?: number;
  currentTask?: string;
  mission?: string;
  createdAt?: string;
  updatedAt?: string;
  parentId?: string | null;
}

type TabKey = "sessions" | "memory" | "checkpoints" | "children";

const TABS: { key: TabKey; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "memory", label: "Memory" },
  { key: "checkpoints", label: "Checkpoints" },
  { key: "children", label: "Children" },
];

const STATUS_COLORS: Record<string, string> = {
  running: "#22c55e",
  paused: "#eab308",
  suspended: "#9ca3af",
  error: "#ef4444",
  terminated: "#6b7280",
  spawning: "#3b82f6",
  idle: "#a3e635",
};

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("sessions");
  const [resteerDirective, setResteerDirective] = useState("");

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error(`Failed to fetch agent: ${res.status}`);
      const json = await res.json();
      setAgent(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  async function handleAction(action: string, directive?: string) {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(directive ? { directive } : {}) }),
      });
      await fetchAgent();
      if (action === "resteer") setResteerDirective("");
    } catch {
      // TODO: Show error toast
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Loading agent...</div>;
  if (error) return <div style={{ padding: "2rem", color: "#ef4444" }}>Error: {error}</div>;
  if (!agent) return <div style={{ padding: "2rem" }}>Agent not found.</div>;

  const statusColor = STATUS_COLORS[agent.status] ?? "#9ca3af";

  return (
    <div style={{ padding: "2rem" }}>
      <a href="/agents" style={{ color: "#60a5fa", textDecoration: "none", fontSize: "0.875rem" }}>
        &larr; Back to Agents
      </a>

      <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {agent.name ?? agent.id}
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: statusColor,
            }}
          />
          <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#9ca3af" }}>{agent.status}</span>
        </h1>
      </div>

      {/* Agent Info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <InfoField label="ID" value={agent.id} />
        <InfoField label="Model" value={agent.model ?? "-"} />
        <InfoField
          label="Budget"
          value={
            agent.budgetSpent != null && agent.budgetTotal != null
              ? `$${agent.budgetSpent.toFixed(2)} / $${agent.budgetTotal.toFixed(2)}`
              : "-"
          }
        />
        <InfoField label="Current Task" value={agent.currentTask ?? "-"} />
        <InfoField label="Parent ID" value={agent.parentId ?? "None (root)"} />
        <InfoField label="Created" value={agent.createdAt ?? "-"} />
        <InfoField label="Updated" value={agent.updatedAt ?? "-"} />
      </div>

      {agent.mission && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#1f2937", borderRadius: "8px" }}>
          <strong>Mission:</strong> {agent.mission}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        {agent.status === "running" && (
          <button
            onClick={() => handleAction("pause")}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#eab308", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Pause
          </button>
        )}
        {agent.status === "paused" && (
          <button
            onClick={() => handleAction("resume")}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#22c55e", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Resume
          </button>
        )}
        {agent.status !== "terminated" && (
          <button
            onClick={() => handleAction("terminate")}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Terminate
          </button>
        )}
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <input
            type="text"
            value={resteerDirective}
            onChange={(e) => setResteerDirective(e.target.value)}
            placeholder="Resteer directive..."
            style={{
              padding: "0.5rem",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "4px",
              color: "#e5e7eb",
              width: "250px",
            }}
          />
          <button
            onClick={() => handleAction("resteer", resteerDirective)}
            disabled={!resteerDirective.trim()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: resteerDirective.trim() ? "#6366f1" : "#374151",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: resteerDirective.trim() ? "pointer" : "not-allowed",
            }}
          >
            Resteer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #374151", marginBottom: "1rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "#60a5fa" : "#9ca3af",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #60a5fa" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <TabContent tab={activeTab} agentId={agentId} />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "0.875rem", color: "#e5e7eb", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function TabContent({ tab, agentId }: { tab: TabKey; agentId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // TODO: Fetch real data from API endpoints
    // e.g., /api/agents/{id}/sessions, /api/agents/{id}/memory, etc.
    const timer = setTimeout(() => {
      setItems([]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [tab, agentId]);

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading {tab}...</p>;
  if (items.length === 0) return <p style={{ color: "#6b7280" }}>No {tab} found for this agent.</p>;

  return (
    <pre style={{ backgroundColor: "#111827", padding: "1rem", borderRadius: "4px", overflow: "auto", fontSize: "0.8rem" }}>
      {JSON.stringify(items, null, 2)}
    </pre>
  );
}

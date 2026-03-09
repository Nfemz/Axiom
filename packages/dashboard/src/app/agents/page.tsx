"use client";

import { useCallback, useEffect, useState } from "react";
import { useSSE } from "@/lib/use-sse";

interface Agent {
  budgetSpent?: number;
  budgetTotal?: number;
  currentTask?: string;
  id: string;
  name: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  running: "#22c55e",
  paused: "#eab308",
  suspended: "#9ca3af",
  error: "#ef4444",
  terminated: "#6b7280",
  spawning: "#3b82f6",
  idle: "#a3e635",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#9ca3af";
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { data: sseEvent, connected } = useSSE("/api/stream/agents");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) {
        throw new Error(`Failed to fetch agents: ${res.status}`);
      }
      const json = await res.json();
      setAgents(json.agents ?? []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Handle real-time SSE updates
  useEffect(() => {
    if (!sseEvent || sseEvent.type === "keepalive") {
      return;
    }

    if (sseEvent.type === "agent:status") {
      const { id, status, currentTask } = sseEvent.payload as {
        id: string;
        status: string;
        currentTask?: string;
      };
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, currentTask } : a))
      );
    }
  }, [sseEvent]);

  async function handleAction(agentId: string, action: string) {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchAgents();
    } catch {
      // TODO: Show error toast
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading agents...</div>;
  }
  if (fetchError) {
    return (
      <div style={{ padding: "2rem", color: "#ef4444" }}>
        Error: {fetchError}
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Agents</h1>
        <span
          style={{
            fontSize: "0.875rem",
            color: connected ? "#22c55e" : "#ef4444",
          }}
        >
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>

      {agents.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>
          No agents running. Spawn one from a definition.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ borderBottom: "1px solid #374151", textAlign: "left" }}
            >
              <th style={{ padding: "0.75rem" }}>Name</th>
              <th style={{ padding: "0.75rem" }}>Status</th>
              <th style={{ padding: "0.75rem" }}>Current Task</th>
              <th style={{ padding: "0.75rem" }}>Budget</th>
              <th style={{ padding: "0.75rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "0.75rem" }}>
                  <a
                    href={`/agents/${agent.id}`}
                    style={{ color: "#60a5fa", textDecoration: "none" }}
                  >
                    {agent.name}
                  </a>
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getStatusColor(agent.status),
                        display: "inline-block",
                      }}
                    />
                    {agent.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    color: "#d1d5db",
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {agent.currentTask ?? "-"}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {agent.budgetSpent != null && agent.budgetTotal != null
                    ? `$${agent.budgetSpent.toFixed(2)} / $${agent.budgetTotal.toFixed(2)}`
                    : "-"}
                </td>
                <td
                  style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}
                >
                  {agent.status === "running" && (
                    <button
                      onClick={() => handleAction(agent.id, "pause")}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#eab308",
                        color: "#000",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      type="button"
                    >
                      Pause
                    </button>
                  )}
                  {agent.status === "paused" && (
                    <button
                      onClick={() => handleAction(agent.id, "resume")}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#22c55e",
                        color: "#000",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      type="button"
                    >
                      Resume
                    </button>
                  )}
                  {agent.status !== "terminated" && (
                    <button
                      onClick={() => handleAction(agent.id, "terminate")}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      type="button"
                    >
                      Terminate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

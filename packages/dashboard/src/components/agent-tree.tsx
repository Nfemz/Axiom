"use client";

import { useMemo, useState } from "react";

export interface Agent {
  children?: Agent[];
  currentTask?: string;
  id: string;
  name: string;
  parentId: string | null;
  status: string;
}

interface AgentTreeProps {
  agents: Agent[];
  onSelect?: (agentId: string) => void;
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

function buildTree(agents: Agent[]): Agent[] {
  const map = new Map<string, Agent>();
  const roots: Agent[] = [];

  for (const agent of agents) {
    map.set(agent.id, { ...agent, children: [] });
  }

  for (const agent of agents) {
    const node = map.get(agent.id);
    if (!node) {
      continue;
    }
    if (agent.parentId && map.has(agent.parentId)) {
      map.get(agent.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function AgentTree({ agents, onSelect }: AgentTreeProps) {
  const tree = useMemo(() => buildTree(agents), [agents]);

  if (agents.length === 0) {
    return (
      <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
        No agents to display.
      </p>
    );
  }

  return (
    <div style={{ fontFamily: "inherit" }}>
      {tree.map((node) => (
        <TreeNode agent={node} depth={0} key={node.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TreeNode({
  agent,
  depth,
  onSelect,
}: {
  agent: Agent;
  depth: number;
  onSelect?: (agentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = agent.children && agent.children.length > 0;
  const statusColor = STATUS_COLORS[agent.status] ?? "#9ca3af";

  return (
    <div>
      <button
        onClick={() => onSelect?.(agent.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          paddingLeft: `${depth * 1.5}rem`,
          paddingTop: "0.375rem",
          paddingBottom: "0.375rem",
          cursor: "pointer",
          borderRadius: "4px",
          background: "none",
          border: "none",
          width: "100%",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
        }}
        type="button"
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <span
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              width: "16px",
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#9ca3af",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span style={{ width: "16px" }} />
        )}

        {/* Status dot */}
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: statusColor,
            display: "inline-block",
            flexShrink: 0,
          }}
        />

        {/* Agent name */}
        <span
          style={{ fontWeight: 500, fontSize: "0.875rem", color: "#e5e7eb" }}
        >
          {agent.name}
        </span>

        {/* Current task snippet */}
        {agent.currentTask && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "200px",
            }}
          >
            - {agent.currentTask}
          </span>
        )}
      </button>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {agent.children?.map((child) => (
            <TreeNode
              agent={child}
              depth={depth + 1}
              key={child.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

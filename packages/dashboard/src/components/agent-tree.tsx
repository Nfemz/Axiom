"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  running: "default",
  idle: "default",
  spawning: "secondary",
  paused: "outline",
  suspended: "outline",
  error: "destructive",
  terminated: "secondary",
};

function getStatusVariant(status: string): StatusVariant {
  return STATUS_VARIANT_MAP[status] ?? "outline";
}

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
      <p className="text-muted-foreground text-sm">No agents to display.</p>
    );
  }

  return (
    <div>
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

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-md bg-transparent py-1.5 text-left",
          "hover:bg-muted/50"
        )}
        onClick={() => onSelect?.(agent.id)}
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        type="button"
      >
        {hasChildren ? (
          <span
            aria-hidden="true"
            className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-muted-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </span>
        ) : (
          <span className="size-4" />
        )}

        <Badge
          className="text-[0.65rem]"
          variant={getStatusVariant(agent.status)}
        >
          {agent.status}
        </Badge>

        <span className="font-medium text-foreground text-sm">
          {agent.name}
        </span>

        {agent.currentTask && (
          <span className="max-w-[200px] truncate text-muted-foreground text-xs">
            - {agent.currentTask}
          </span>
        )}
      </button>

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

"use client";

import { Pause, Play, Skull, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSSE } from "@/lib/use-sse";

interface Agent {
  budgetSpent?: number;
  budgetTotal?: number;
  currentTask?: string;
  id: string;
  name: string;
  status: string;
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

function formatBudget(spent?: number, total?: number): string {
  if (spent == null || total == null) {
    return "-";
  }
  return `$${spent.toFixed(2)} / $${total.toFixed(2)}`;
}

function AgentTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function AgentActions({
  agent,
  onAction,
}: {
  agent: Agent;
  onAction: (agentId: string, action: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {agent.status === "running" && (
        <Button
          onClick={() => onAction(agent.id, "pause")}
          size="xs"
          type="button"
          variant="outline"
        >
          <Pause className="size-3" />
          Pause
        </Button>
      )}
      {agent.status === "paused" && (
        <Button
          onClick={() => onAction(agent.id, "resume")}
          size="xs"
          type="button"
          variant="outline"
        >
          <Play className="size-3" />
          Resume
        </Button>
      )}
      {agent.status !== "terminated" && (
        <Button
          onClick={() => onAction(agent.id, "terminate")}
          size="xs"
          type="button"
          variant="destructive"
        >
          <Skull className="size-3" />
          Terminate
        </Button>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { data: sseEvent, connected } = useSSE("/api/stream/agents");

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/agents");
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }
      const json = await response.json();
      setAgents(json.agents ?? []);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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
      setAgents((previous) =>
        previous.map((agent) =>
          agent.id === id ? { ...agent, status, currentTask } : agent
        )
      );
    }
  }, [sseEvent]);

  const handleAction = useCallback(
    async (agentId: string, action: string) => {
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
    },
    [fetchAgents]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-semibold text-2xl text-foreground">Agents</h1>
        <AgentTableSkeleton />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-semibold text-2xl text-foreground">Agents</h1>
        <Card>
          <CardContent>
            <p className="text-destructive text-sm">Error: {fetchError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl text-foreground">Agents</h1>
        <Badge variant={connected ? "default" : "destructive"}>
          {connected ? (
            <>
              <Wifi className="size-3" /> Live
            </>
          ) : (
            <>
              <WifiOff className="size-3" /> Disconnected
            </>
          )}
        </Badge>
      </div>

      <Card>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No agents running. Spawn one from a definition.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Task</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/agents/${agent.id}`}
                      >
                        {agent.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(agent.status)}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {agent.currentTask ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatBudget(agent.budgetSpent, agent.budgetTotal)}
                    </TableCell>
                    <TableCell>
                      <AgentActions agent={agent} onAction={handleAction} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

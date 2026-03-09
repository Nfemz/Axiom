"use client";

import { ArrowLeft, Pause, Play, RotateCw, Skull } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentDetail {
  budgetSpent?: number;
  budgetTotal?: number;
  createdAt?: string;
  currentTask?: string;
  id: string;
  mission?: string;
  model?: string;
  name?: string;
  parentId?: string | null;
  status: string;
  updatedAt?: string;
}

type TabKey = "sessions" | "memory" | "checkpoints" | "children";

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

const TAB_ENDPOINTS: Record<TabKey, string> = {
  sessions: "sessions",
  memory: "memory",
  checkpoints: "checkpoints",
  children: "children",
};

const TAB_DATA_KEY: Record<TabKey, string> = {
  sessions: "sessions",
  memory: "memories",
  checkpoints: "checkpoints",
  children: "children",
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <span className="break-all text-foreground text-sm">{value}</span>
    </div>
  );
}

function AgentControls({
  agent,
  resteerDirective,
  onResteerChange,
  onAction,
}: {
  agent: AgentDetail;
  resteerDirective: string;
  onResteerChange: (value: string) => void;
  onAction: (action: string, directive?: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {agent.status === "running" && (
        <Button
          onClick={() => onAction("pause")}
          type="button"
          variant="outline"
        >
          <Pause className="size-4" />
          Pause
        </Button>
      )}
      {agent.status === "paused" && (
        <Button
          onClick={() => onAction("resume")}
          type="button"
          variant="outline"
        >
          <Play className="size-4" />
          Resume
        </Button>
      )}
      {agent.status !== "terminated" && (
        <Button
          onClick={() => onAction("terminate")}
          type="button"
          variant="destructive"
        >
          <Skull className="size-4" />
          Terminate
        </Button>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          className="w-64"
          onChange={(event) => onResteerChange(event.target.value)}
          placeholder="Resteer directive..."
          type="text"
          value={resteerDirective}
        />
        <Button
          disabled={!resteerDirective.trim()}
          onClick={() => onAction("resteer", resteerDirective)}
          type="button"
        >
          <RotateCw className="size-4" />
          Resteer
        </Button>
      </div>
    </div>
  );
}

function TabDataTable({ tab, agentId }: { tab: TabKey; agentId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const endpoint = `/api/agents/${agentId}/${TAB_ENDPOINTS[tab]}`;
    fetch(endpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${tab}: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        const key = TAB_DATA_KEY[tab];
        setItems(json[key] ?? []);
      })
      .catch((error_) => {
        setError(error_ instanceof Error ? error_.message : "Unknown error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [tab, agentId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">Error: {error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No {tab} found for this agent.
      </p>
    );
  }

  const columns = Object.keys(items[0]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((key) => (
            <TableHead className="text-xs uppercase" key={key}>
              {key}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={String(item.id ?? index)}>
            {columns.map((colKey) => (
              <TableCell className="max-w-[300px] truncate" key={colKey}>
                {formatCellValue(item[colKey])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resteerDirective, setResteerDirective] = useState("");

  const fetchAgent = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.status}`);
      }
      const json = await response.json();
      setAgent(json);
      setError(null);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleAction = useCallback(
    async (action: string, directive?: string) => {
      try {
        await fetch(`/api/agents/${agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(directive ? { directive } : {}) }),
        });
        await fetchAgent();
        if (action === "resteer") {
          setResteerDirective("");
        }
      } catch {
        // TODO: Show error toast
      }
    },
    [agentId, fetchAgent]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!agent) {
    return <p className="text-muted-foreground text-sm">Agent not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href="/agents"
      >
        <ArrowLeft className="size-4" />
        Back to Agents
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            {agent.name ?? agent.id}
            <Badge variant={getStatusVariant(agent.status)}>
              {agent.status}
            </Badge>
          </CardTitle>
          {agent.mission && <CardDescription>{agent.mission}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <InfoField label="ID" value={agent.id} />
            <InfoField label="Model" value={agent.model ?? "-"} />
            <InfoField
              label="Budget"
              value={formatBudget(agent.budgetSpent, agent.budgetTotal)}
            />
            <InfoField label="Current Task" value={agent.currentTask ?? "-"} />
            <InfoField
              label="Parent ID"
              value={agent.parentId ?? "None (root)"}
            />
            <InfoField label="Created" value={agent.createdAt ?? "-"} />
            <InfoField label="Updated" value={agent.updatedAt ?? "-"} />
          </div>
        </CardContent>
      </Card>

      <AgentControls
        agent={agent}
        onAction={handleAction}
        onResteerChange={setResteerDirective}
        resteerDirective={resteerDirective}
      />

      <Separator />

      <Tabs defaultValue="sessions">
        <TabsList variant="line">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <TabDataTable agentId={agentId} tab="sessions" />
        </TabsContent>
        <TabsContent value="memory">
          <TabDataTable agentId={agentId} tab="memory" />
        </TabsContent>
        <TabsContent value="checkpoints">
          <TabDataTable agentId={agentId} tab="checkpoints" />
        </TabsContent>
        <TabsContent value="children">
          <TabDataTable agentId={agentId} tab="children" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

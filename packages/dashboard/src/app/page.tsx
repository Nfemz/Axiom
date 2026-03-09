import type { HealthResponse } from "@axiom/shared/schemas/api";
import { Activity, AlertTriangle, Bot, Clock, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const baseUrl = process.env.ORCHESTRATOR_URL ?? "http://localhost:3001";
    const response = await fetch(`${baseUrl}/health`, {
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [
    days > 0 ? `${days}d` : "",
    hours > 0 ? `${hours}h` : "",
    `${minutes}m`,
  ]
    .filter(Boolean)
    .join(" ");
}

const STATUS_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  healthy: "default",
  degraded: "secondary",
  unhealthy: "destructive",
};

function ServiceStatusBadge({ status }: { status: "up" | "down" }) {
  return (
    <Badge variant={status === "up" ? "default" : "destructive"}>
      {status}
    </Badge>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-2xl text-foreground">
        System Dashboard
      </h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Orchestrator Unreachable
          </CardTitle>
          <CardDescription>
            Cannot connect to the orchestrator service. Ensure it is running and
            ORCHESTRATOR_URL is configured.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function MetricsGrid({ health }: { health: HealthResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="size-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={STATUS_VARIANT_MAP[health.status] ?? "destructive"}>
            {health.status}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="size-4" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl text-foreground">
            {formatUptime(health.uptime)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground text-sm">
            <Bot className="size-4" />
            Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="font-semibold text-2xl text-foreground">
            {health.agents.running}
            <span className="font-normal text-muted-foreground text-sm">
              {" "}
              / {health.agents.total} total
            </span>
          </p>
          {health.agents.paused > 0 && (
            <p className="text-sm text-warning">
              {health.agents.paused} paused
            </p>
          )}
          {health.agents.error > 0 && (
            <p className="text-destructive text-sm">
              {health.agents.error} error
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ServicesGrid({ services }: { services: HealthResponse["services"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {(Object.entries(services) as [string, "up" | "down"][]).map(
        ([name, status]) => (
          <Card key={name} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="size-4 text-muted-foreground" />
                <span className="capitalize">{name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceStatusBadge status={status} />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const health = await fetchHealth();

  if (!health) {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-2xl text-foreground">
        System Dashboard
      </h2>
      <MetricsGrid health={health} />
      <Separator />
      <div className="flex flex-col gap-4">
        <h3 className="font-medium text-foreground text-lg">Services</h3>
        <ServicesGrid services={health.services} />
      </div>
    </div>
  );
}

import type { HealthResponse } from "@axiom/shared/schemas/api";

export const dynamic = "force-dynamic";

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const baseUrl = process.env.ORCHESTRATOR_URL ?? "http://localhost:4000";
    const res = await fetch(`${baseUrl}/health`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d > 0 ? `${d}d` : "", h > 0 ? `${h}h` : "", `${m}m`]
    .filter(Boolean)
    .join(" ");
}

function ServiceBadge({ status }: { status: "up" | "down" }) {
  const cls = status === "up" ? "badge badge-success" : "badge badge-danger";
  return <span className={cls}>{status}</span>;
}

export default async function DashboardPage() {
  const health = await fetchHealth();

  if (!health) {
    return (
      <div>
        <h2>System Dashboard</h2>
        <div className="card" style={{ marginTop: "1rem" }}>
          <p className="badge badge-danger">Orchestrator Unreachable</p>
          <p style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
            Cannot connect to the orchestrator service. Ensure it is running and
            ORCHESTRATOR_URL is configured.
          </p>
        </div>
      </div>
    );
  }

  const STATUS_BADGE_MAP: Record<string, string> = {
    healthy: "badge-success",
    degraded: "badge-warning",
  };
  const statusBadge = STATUS_BADGE_MAP[health.status] ?? "badge-danger";

  return (
    <div>
      <h2>System Dashboard</h2>
      <div style={{ marginTop: "1rem" }}>
        <div className="card-grid">
          <div className="card">
            <h3>Status</h3>
            <p>
              <span className={`badge ${statusBadge}`}>{health.status}</span>
            </p>
          </div>

          <div className="card">
            <h3>Uptime</h3>
            <p>{formatUptime(health.uptime)}</p>
          </div>

          <div className="card">
            <h3>Agents</h3>
            <p>
              {health.agents.running} running / {health.agents.total} total
            </p>
            {health.agents.paused > 0 && (
              <p style={{ color: "var(--warning)" }}>
                {health.agents.paused} paused
              </p>
            )}
            {health.agents.error > 0 && (
              <p style={{ color: "var(--danger)" }}>
                {health.agents.error} error
              </p>
            )}
          </div>
        </div>

        <h3 style={{ marginTop: "1.5rem" }}>Services</h3>
        <div className="card-grid" style={{ marginTop: "0.5rem" }}>
          {(Object.entries(health.services) as [string, "up" | "down"][]).map(
            ([name, status]) => (
              <div className="card" key={name}>
                <h4 style={{ textTransform: "capitalize" }}>{name}</h4>
                <ServiceBadge status={status} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

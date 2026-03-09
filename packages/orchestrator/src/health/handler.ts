import type { IncomingMessage, ServerResponse } from "node:http";
import type { HealthResponse } from "@axiom/shared";
import { getRedis } from "../comms/redis.js";
import { getDb } from "../db/drizzle.js";
import { findAgentsByStatus } from "../db/queries.js";
import { getUptimeSeconds } from "./uptime-tracker.js";

async function checkPostgres(): Promise<"up" | "down"> {
  try {
    const db = getDb();
    await db.execute("SELECT 1" as never);
    return "up";
  } catch {
    return "down";
  }
}

async function checkRedis(): Promise<"up" | "down"> {
  try {
    const redis = getRedis();
    await redis.ping();
    return "up";
  } catch {
    return "down";
  }
}

export async function handleHealthCheck(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const [pgStatus, redisStatus] = await Promise.all([
    checkPostgres(),
    checkRedis(),
  ]);

  let runningAgents = 0;
  let pausedAgents = 0;
  let errorAgents = 0;
  let totalAgents = 0;

  try {
    const db = getDb();
    const [running, paused, errored] = await Promise.all([
      findAgentsByStatus(db, "running"),
      findAgentsByStatus(db, "paused"),
      findAgentsByStatus(db, "error"),
    ]);
    runningAgents = running.length;
    pausedAgents = paused.length;
    errorAgents = errored.length;
    totalAgents = runningAgents + pausedAgents + errorAgents;
  } catch {
    // DB may be down
  }

  const allUp = pgStatus === "up" && redisStatus === "up";
  const allDown = pgStatus === "down" && redisStatus === "down";

  let healthStatus: HealthResponse["status"] = "degraded";
  if (allUp) {
    healthStatus = "healthy";
  } else if (allDown) {
    healthStatus = "unhealthy";
  }

  const response: HealthResponse = {
    status: healthStatus,
    uptime: getUptimeSeconds(),
    services: {
      orchestrator: "up",
      redis: redisStatus,
      postgresql: pgStatus,
    },
    agents: {
      total: totalAgents,
      running: runningAgents,
      paused: pausedAgents,
      error: errorAgents,
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = response.status === "healthy" ? 200 : 503;
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(response));
}

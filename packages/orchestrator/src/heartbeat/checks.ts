import { createLogger, HEARTBEAT_TIMEOUT_MS } from "@axiom/shared";
import { getDb } from "../db/drizzle.js";
import { findAgentsByStatus, updateAgent } from "../db/queries.js";

const log = createLogger("heartbeat:checks");

interface HeartbeatCheckResult {
  action: "kill" | "restart" | "escalate";
  agentId: string;
  agentName: string;
  issue: "timeout" | "resource_exceeded" | "stall_detected";
}

// Layer 1: Heartbeat timeout detection (cheapest check first)
async function checkHeartbeatTimeouts(): Promise<HeartbeatCheckResult[]> {
  const db = getDb();
  const runningAgents = await findAgentsByStatus(db, "running");
  const now = Date.now();
  const results: HeartbeatCheckResult[] = [];

  for (const agent of runningAgents) {
    if (!agent.heartbeatAt) {
      continue;
    }
    const elapsed = now - new Date(agent.heartbeatAt).getTime();
    if (elapsed > HEARTBEAT_TIMEOUT_MS) {
      log.warn("Agent heartbeat timeout", {
        agentId: agent.id,
        name: agent.name,
        elapsedMs: elapsed,
      });
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        issue: "timeout",
        action: "restart",
      });
    }
  }

  return results;
}

// Layer 2: Resource/cost heuristic checks
async function checkResourceUsage(): Promise<HeartbeatCheckResult[]> {
  const db = getDb();
  const runningAgents = await findAgentsByStatus(db, "running");
  const results: HeartbeatCheckResult[] = [];

  for (const agent of runningAgents) {
    const budgetTotal = Number(agent.budgetTotal);
    const budgetSpent = Number(agent.budgetSpent);

    if (budgetTotal > 0 && budgetSpent / budgetTotal > 0.8) {
      log.warn("Agent approaching budget limit", {
        agentId: agent.id,
        name: agent.name,
        budgetSpent,
        budgetTotal,
        pct: Math.round((budgetSpent / budgetTotal) * 100),
      });
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        issue: "resource_exceeded",
        action: "escalate",
      });
    }
  }

  return results;
}

// Layer 3: Stall detection (running agents with no recent updates)
async function checkForStalls(): Promise<HeartbeatCheckResult[]> {
  const db = getDb();
  const runningAgents = await findAgentsByStatus(db, "running");
  const now = Date.now();
  const STALL_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
  const results: HeartbeatCheckResult[] = [];

  for (const agent of runningAgents) {
    if (!agent.updatedAt) {
      continue;
    }
    const lastUpdate = new Date(agent.updatedAt).getTime();
    const elapsed = now - lastUpdate;

    if (elapsed > STALL_THRESHOLD_MS) {
      log.warn("Agent may be stalled", {
        agentId: agent.id,
        name: agent.name,
        elapsedMs: elapsed,
      });
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        issue: "stall_detected",
        action: "escalate",
      });
    }
  }

  return results;
}

export async function runHeartbeatChecks(): Promise<void> {
  log.info("Running heartbeat checks (cheap-first)");

  // Layer 1: Heartbeat timeouts (cheapest)
  const timeoutResults = await checkHeartbeatTimeouts();

  // Layer 2: Resource heuristics
  const resourceResults = await checkResourceUsage();

  // Layer 3: LLM self-assessment (expensive, only if needed)
  const stallResults = await checkForStalls();

  const allResults = [...timeoutResults, ...resourceResults, ...stallResults];

  if (allResults.length === 0) {
    log.info("All heartbeat checks passed");
    return;
  }

  // Handle issues
  const db = getDb();
  for (const result of allResults) {
    log.warn("Heartbeat issue detected", { ...result });

    if (result.action === "kill") {
      await updateAgent(db, result.agentId, { status: "terminated" });
    } else if (result.action === "restart") {
      await updateAgent(db, result.agentId, { status: "error" });
    }
    // "escalate" actions will notify via Discord (Phase 8)
  }
}

import { createLogger, HEARTBEAT_TIMEOUT_MS } from "@axiom/shared";
import { getDb } from "../db/drizzle.js";
import { findAgentsByStatus, updateAgent } from "../db/queries.js";

const log = createLogger("heartbeat:checks");

interface HeartbeatCheckResult {
  agentId: string;
  agentName: string;
  issue: "timeout" | "resource_exceeded" | "stall_detected";
  action: "kill" | "restart" | "escalate";
}

// Layer 1: Heartbeat timeout detection (cheapest check first)
async function checkHeartbeatTimeouts(): Promise<HeartbeatCheckResult[]> {
  const db = getDb();
  const runningAgents = await findAgentsByStatus(db, "running");
  const now = Date.now();
  const results: HeartbeatCheckResult[] = [];

  for (const agent of runningAgents) {
    if (!agent.heartbeatAt) continue;
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
  // Resource checks are evaluated when heartbeat messages arrive
  // with ResourceMetrics. This is a placeholder for scheduled checks.
  return [];
}

// Layer 3: LLM self-assessment (most expensive, run least frequently)
async function checkForStalls(): Promise<HeartbeatCheckResult[]> {
  // Periodic LLM-based stall detection will be implemented
  // when the agent-runtime LLM loop is in place (Phase 4)
  return [];
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

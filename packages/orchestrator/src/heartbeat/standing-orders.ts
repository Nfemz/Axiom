// ---------------------------------------------------------------------------
// Axiom Orchestrator – Standing Order Evaluation
// ---------------------------------------------------------------------------
// Evaluates standing orders during heartbeat cycles: spawn agents, advance
// pipelines, check budgets, and reallocate resources per FR-021a.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { eq } from "drizzle-orm";
import type Redis from "ioredis";
import { spawnAgent } from "../agents/spawn.js";
import type { Database } from "../db/drizzle.js";
import { findAgentsByStatus, findAllAgents } from "../db/queries.js";
import { pipelines } from "../db/schema.js";

const log = createLogger("heartbeat:standing-orders");

// ─── Types ────────────────────────────────────────────────────────

export interface StandingOrder {
  config: Record<string, unknown>;
  enabled: boolean;
  id: string;
  type: "spawn_agent" | "advance_pipeline" | "check_budget" | "reallocate";
}

interface OrderResult {
  error?: string;
  executed: boolean;
  orderId: string;
  result?: string;
  type: StandingOrder["type"];
}

// ─── Evaluate All Orders ──────────────────────────────────────────

export async function evaluateStandingOrders(
  db: Database,
  redis: Redis,
  orders: StandingOrder[]
): Promise<OrderResult[]> {
  const results: OrderResult[] = [];

  for (const order of orders) {
    if (!order.enabled) {
      continue;
    }

    try {
      const result = await evaluateOrder(db, redis, order);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("Standing order evaluation failed", {
        orderId: order.id,
        type: order.type,
        error: message,
      });
      results.push({
        orderId: order.id,
        type: order.type,
        executed: false,
        error: message,
      });
    }
  }

  log.info("Standing orders evaluated", {
    total: orders.length,
    executed: results.filter((r) => r.executed).length,
  });

  return results;
}

// ─── Individual Order Evaluation ──────────────────────────────────

async function evaluateOrder(
  db: Database,
  redis: Redis,
  order: StandingOrder
): Promise<OrderResult> {
  switch (order.type) {
    case "spawn_agent":
      return evaluateSpawnOrder(db, redis, order);
    case "advance_pipeline":
      return evaluatePipelineOrder(db, order);
    case "check_budget":
      return evaluateBudgetOrder(db, order);
    case "reallocate":
      return evaluateReallocateOrder(db, order);
    default: {
      const _exhaustive: never = order.type;
      throw new Error(`Unknown order type: ${_exhaustive}`);
    }
  }
}

// ─── Spawn Agent Order ───────────────────────────────────────────

async function evaluateSpawnOrder(
  db: Database,
  redis: Redis,
  order: StandingOrder
): Promise<OrderResult> {
  const config = order.config as {
    definitionId?: string;
    goal?: string;
    maxConcurrent?: number;
  };
  if (!(config.definitionId && config.goal)) {
    return {
      orderId: order.id,
      type: "spawn_agent",
      executed: false,
      result: "Missing definitionId or goal",
    };
  }

  const running = await findAgentsByStatus(db, "running");
  const maxConcurrent = config.maxConcurrent ?? 10;

  if (running.length >= maxConcurrent) {
    return {
      orderId: order.id,
      type: "spawn_agent",
      executed: false,
      result: `At max concurrent agents (${maxConcurrent})`,
    };
  }

  await spawnAgent(db, redis, {
    definitionId: config.definitionId,
    goal: config.goal,
  });
  log.info("Standing order spawned agent", {
    orderId: order.id,
    definitionId: config.definitionId,
  });

  return {
    orderId: order.id,
    type: "spawn_agent",
    executed: true,
    result: "Agent spawned",
  };
}

// ─── Pipeline Advancement Order ──────────────────────────────────

async function evaluatePipelineOrder(
  db: Database,
  order: StandingOrder
): Promise<OrderResult> {
  const config = order.config as { pipelineId?: string };
  if (!config.pipelineId) {
    return {
      orderId: order.id,
      type: "advance_pipeline",
      executed: false,
      result: "Missing pipelineId",
    };
  }

  const pipeline = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, config.pipelineId))
    .limit(1);
  if (!pipeline[0] || pipeline[0].status !== "active") {
    return {
      orderId: order.id,
      type: "advance_pipeline",
      executed: false,
      result: "Pipeline not active",
    };
  }

  const p = pipeline[0];
  const stages = p.stages as Array<{ name: string; completed?: boolean }>;
  const currentIdx = p.currentStage;

  if (currentIdx >= stages.length) {
    return {
      orderId: order.id,
      type: "advance_pipeline",
      executed: false,
      result: "All stages complete",
    };
  }

  await db
    .update(pipelines)
    .set({ currentStage: currentIdx + 1, updatedAt: new Date() })
    .where(eq(pipelines.id, config.pipelineId));

  log.info("Pipeline advanced", {
    pipelineId: config.pipelineId,
    newStage: currentIdx + 1,
  });
  return {
    orderId: order.id,
    type: "advance_pipeline",
    executed: true,
    result: `Advanced to stage ${currentIdx + 1}`,
  };
}

// ─── Budget Check Order ──────────────────────────────────────────

async function evaluateBudgetOrder(
  db: Database,
  order: StandingOrder
): Promise<OrderResult> {
  const config = order.config as { threshold?: number };
  const threshold = config.threshold ?? 0.9;

  const allAgents = await findAllAgents(db);
  const overBudget = allAgents.filter((a) => {
    const total = Number(a.budgetTotal);
    const spent = Number(a.budgetSpent);
    return total > 0 && spent / total >= threshold;
  });

  if (overBudget.length === 0) {
    return {
      orderId: order.id,
      type: "check_budget",
      executed: true,
      result: "All budgets within limits",
    };
  }

  log.warn("Agents over budget threshold", {
    orderId: order.id,
    count: overBudget.length,
    agentIds: overBudget.map((a) => a.id),
  });

  return {
    orderId: order.id,
    type: "check_budget",
    executed: true,
    result: `${overBudget.length} agent(s) at/above ${threshold * 100}% budget`,
  };
}

// ─── Resource Reallocation Order ─────────────────────────────────

async function evaluateReallocateOrder(
  db: Database,
  order: StandingOrder
): Promise<OrderResult> {
  const allAgents = await findAllAgents(db);
  const idle = allAgents.filter(
    (a) => a.status === "running" && !a.currentTask
  );

  if (idle.length === 0) {
    return {
      orderId: order.id,
      type: "reallocate",
      executed: true,
      result: "No idle agents",
    };
  }

  log.info("Idle agents detected for potential reallocation", {
    orderId: order.id,
    idleCount: idle.length,
    idleIds: idle.map((a) => a.id),
  });

  return {
    orderId: order.id,
    type: "reallocate",
    executed: true,
    result: `${idle.length} idle agent(s) identified for reallocation`,
  };
}

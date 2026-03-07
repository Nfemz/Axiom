// ---------------------------------------------------------------------------
// Axiom Orchestrator – Standing Order Evaluation
// ---------------------------------------------------------------------------
// Evaluates standing orders during heartbeat cycles: spawn agents, advance
// pipelines, check budgets, and reallocate resources per FR-021a.
// ---------------------------------------------------------------------------

import type Redis from "ioredis";
import { createLogger } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";

const log = createLogger("heartbeat:standing-orders");

// ─── Types ────────────────────────────────────────────────────────

export interface StandingOrder {
  id: string;
  type: "spawn_agent" | "advance_pipeline" | "check_budget" | "reallocate";
  config: Record<string, unknown>;
  enabled: boolean;
}

interface OrderResult {
  orderId: string;
  type: StandingOrder["type"];
  executed: boolean;
  result?: string;
  error?: string;
}

// ─── Evaluate All Orders ──────────────────────────────────────────

export async function evaluateStandingOrders(
  db: Database,
  redis: Redis,
  orders: StandingOrder[],
): Promise<OrderResult[]> {
  const results: OrderResult[] = [];

  for (const order of orders) {
    if (!order.enabled) continue;

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
  order: StandingOrder,
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
  }
}

// ─── Spawn Agent Order ───────────────────────────────────────────

async function evaluateSpawnOrder(
  _db: Database,
  _redis: Redis,
  order: StandingOrder,
): Promise<OrderResult> {
  // TODO: Check conditions (e.g. pipeline stage needs agent, queue depth)
  // and spawn agent via BullMQ agent:spawn queue
  log.debug("Evaluating spawn order", { orderId: order.id, config: order.config });

  return {
    orderId: order.id,
    type: "spawn_agent",
    executed: false,
    result: "Spawn order evaluation placeholder",
  };
}

// ─── Pipeline Advancement Order ──────────────────────────────────

async function evaluatePipelineOrder(
  _db: Database,
  order: StandingOrder,
): Promise<OrderResult> {
  // TODO: Check pipeline stage completion criteria, advance if met
  log.debug("Evaluating pipeline order", { orderId: order.id, config: order.config });

  return {
    orderId: order.id,
    type: "advance_pipeline",
    executed: false,
    result: "Pipeline order evaluation placeholder",
  };
}

// ─── Budget Check Order ──────────────────────────────────────────

async function evaluateBudgetOrder(
  _db: Database,
  order: StandingOrder,
): Promise<OrderResult> {
  // TODO: Check agent/venture budgets, flag overspend, escalate
  log.debug("Evaluating budget order", { orderId: order.id, config: order.config });

  return {
    orderId: order.id,
    type: "check_budget",
    executed: false,
    result: "Budget order evaluation placeholder",
  };
}

// ─── Resource Reallocation Order ─────────────────────────────────

async function evaluateReallocateOrder(
  _db: Database,
  order: StandingOrder,
): Promise<OrderResult> {
  // TODO: Evaluate resource utilization, suspend idle agents, redistribute budget
  log.debug("Evaluating reallocate order", { orderId: order.id, config: order.config });

  return {
    orderId: order.id,
    type: "reallocate",
    executed: false,
    result: "Reallocate order evaluation placeholder",
  };
}

// ---------------------------------------------------------------------------
// Axiom Orchestrator – Workflow Coordinator (FR-011)
// ---------------------------------------------------------------------------
// Manages workflow-lead coordination patterns: creates workflows with a lead
// agent, allocates budgets, and tracks nested sub-workflow trees.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";
import type Redis from "ioredis";
import { spawnAgent } from "./spawn.js";
import { pipelines } from "../db/schema.js";
import { eq } from "drizzle-orm";

const log = createLogger("workflow-coordinator");

// ── Types ───────────────────────────────────────────────────────────────────

export interface WorkflowConfig {
  name: string;
  goal: string;
  leadDefinitionId: string;
  budget: number;
  subWorkflows?: WorkflowConfig[];
}

export interface WorkflowStatus {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "failed";
  leadAgentId?: string;
  subWorkflows: WorkflowStatus[];
  budgetAllocated: number;
  budgetSpent: number;
}

// ── Workflow Lifecycle ──────────────────────────────────────────────────────

/**
 * Creates a new workflow, persists it as a pipeline record, and spawns a lead agent.
 */
export async function createWorkflow(
  db: Database,
  redis: Redis,
  config: WorkflowConfig,
): Promise<string> {
  log.info("Creating workflow", {
    name: config.name,
    goal: config.goal,
    budget: config.budget,
  });

  // Persist workflow as a pipeline record
  const result = await db.insert(pipelines).values({
    name: config.name,
    goal: config.goal,
    stages: config.subWorkflows?.map((sw) => ({ name: sw.name, goal: sw.goal, completed: false })) ?? [],
    status: "active",
    budgetTotal: String(config.budget),
  }).returning();

  const workflow = result[0];

  // Spawn lead agent for the workflow
  try {
    const agent = await spawnAgent(db, redis, {
      definitionId: config.leadDefinitionId,
      goal: config.goal,
      budget: config.budget,
    });

    await db.update(pipelines)
      .set({ leadAgentId: agent.id, updatedAt: new Date() })
      .where(eq(pipelines.id, workflow.id));

    log.info("Workflow created with lead agent", {
      workflowId: workflow.id,
      leadAgentId: agent.id,
    });
  } catch (err) {
    log.error("Failed to spawn lead agent for workflow", {
      workflowId: workflow.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return workflow.id;
}

// ── Status ──────────────────────────────────────────────────────────────────

/**
 * Retrieves the current status of a workflow from the pipelines table.
 */
export async function getWorkflowStatus(
  db: Database,
  workflowId: string,
): Promise<WorkflowStatus> {
  const result = await db.select().from(pipelines).where(eq(pipelines.id, workflowId)).limit(1);

  if (!result[0]) {
    return {
      id: workflowId,
      name: "unknown",
      status: "failed",
      subWorkflows: [],
      budgetAllocated: 0,
      budgetSpent: 0,
    };
  }

  const p = result[0];
  return {
    id: p.id,
    name: p.name,
    status: p.status === "active" ? "active" : p.status === "completed" ? "completed" : "pending",
    leadAgentId: p.leadAgentId ?? undefined,
    subWorkflows: [],
    budgetAllocated: Number(p.budgetTotal),
    budgetSpent: Number(p.budgetSpent),
  };
}

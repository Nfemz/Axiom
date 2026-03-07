// ---------------------------------------------------------------------------
// Axiom Orchestrator – Workflow Coordinator (FR-011)
// ---------------------------------------------------------------------------
// Manages workflow-lead coordination patterns: creates workflows with a lead
// agent, allocates budgets, and tracks nested sub-workflow trees.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";
import type Redis from "ioredis";
import { randomUUID } from "node:crypto";

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
 * Creates a new workflow and returns its ID.
 *
 * PLACEHOLDER: Logs the creation and returns a generated ID.
 * TODO: Spawn workflow lead agent, allocate budget, track workflow.
 */
export async function createWorkflow(
  db: Database,
  redis: Redis,
  config: WorkflowConfig,
): Promise<string> {
  const workflowId = randomUUID();

  log.info("Creating workflow", {
    workflowId,
    name: config.name,
    goal: config.goal,
    leadDefinitionId: config.leadDefinitionId,
    budget: config.budget,
    subWorkflowCount: config.subWorkflows?.length ?? 0,
  });

  // TODO: persist workflow record to DB
  // TODO: spawn lead agent via spawnAgent()
  // TODO: allocate budget from parent or top-level pool

  return workflowId;
}

// ── Status ──────────────────────────────────────────────────────────────────

/**
 * Retrieves the current status of a workflow.
 *
 * PLACEHOLDER: Returns a basic pending status object.
 * TODO: Query DB for workflow state and child statuses.
 */
export async function getWorkflowStatus(
  db: Database,
  workflowId: string,
): Promise<WorkflowStatus> {
  log.info("Fetching workflow status", { workflowId });

  // TODO: query workflow record and nested sub-workflows from DB
  return {
    id: workflowId,
    name: "unknown",
    status: "pending",
    subWorkflows: [],
    budgetAllocated: 0,
    budgetSpent: 0,
  };
}

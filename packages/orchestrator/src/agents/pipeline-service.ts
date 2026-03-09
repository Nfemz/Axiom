import type { PipelineStage } from "@axiom/shared";
import { createLogger, PipelineStatus } from "@axiom/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { pipelines } from "../db/schema.js";

const log = createLogger("pipeline-service");

// ─── Types ────────────────────────────────────────────────────────

interface CreatePipelineParams {
  budgetTotal: string;
  goal: string;
  leadAgentId?: string;
  name: string;
  stages: { name: string; completionCriteria: string }[];
}

// ─── Create ───────────────────────────────────────────────────────

export async function createPipeline(
  db: Database,
  params: CreatePipelineParams
) {
  const stages: PipelineStage[] = params.stages.map((s) => ({
    name: s.name,
    completionCriteria: s.completionCriteria,
    status: "pending" as const,
  }));

  const data: typeof pipelines.$inferInsert = {
    name: params.name,
    goal: params.goal,
    stages,
    currentStage: 0,
    status: PipelineStatus.Planned,
    budgetTotal: params.budgetTotal,
    leadAgentId: params.leadAgentId ?? null,
  };

  const result = await db.insert(pipelines).values(data).returning();
  const pipeline = result[0];

  log.info("Pipeline created", { id: pipeline.id, name: pipeline.name });
  return pipeline;
}

// ─── Advance Stage ────────────────────────────────────────────────

export async function advanceStage(db: Database, pipelineId: string) {
  const pipeline = await findPipelineById(db, pipelineId);
  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`);
  }

  const stages = pipeline.stages as PipelineStage[];
  const currentIdx = pipeline.currentStage;

  if (currentIdx >= stages.length) {
    throw new Error(`Pipeline ${pipelineId} has no more stages to advance`);
  }

  // Mark current stage completed
  stages[currentIdx].status = "completed";

  const nextIdx = currentIdx + 1;
  const isLastStage = nextIdx >= stages.length;

  if (!isLastStage) {
    stages[nextIdx].status = "active";
  }

  const newStatus = isLastStage ? PipelineStatus.Completed : pipeline.status;

  const result = await db
    .update(pipelines)
    .set({
      stages,
      currentStage: isLastStage ? currentIdx : nextIdx,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(pipelines.id, pipelineId))
    .returning();

  log.info("Pipeline stage advanced", {
    id: pipelineId,
    from: currentIdx,
    to: isLastStage ? "completed" : nextIdx,
  });

  return result[0];
}

// ─── Status Transitions ──────────────────────────────────────────

export async function pausePipeline(db: Database, pipelineId: string) {
  const result = await db
    .update(pipelines)
    .set({ status: PipelineStatus.Paused, updatedAt: new Date() })
    .where(eq(pipelines.id, pipelineId))
    .returning();

  log.info("Pipeline paused", { id: pipelineId });
  return result[0] ?? null;
}

export async function completePipeline(db: Database, pipelineId: string) {
  const result = await db
    .update(pipelines)
    .set({ status: PipelineStatus.Completed, updatedAt: new Date() })
    .where(eq(pipelines.id, pipelineId))
    .returning();

  log.info("Pipeline completed", { id: pipelineId });
  return result[0] ?? null;
}

export async function failPipeline(
  db: Database,
  pipelineId: string,
  reason: string
) {
  const result = await db
    .update(pipelines)
    .set({ status: PipelineStatus.Failed, updatedAt: new Date() })
    .where(eq(pipelines.id, pipelineId))
    .returning();

  log.warn("Pipeline failed", { id: pipelineId, reason });
  return result[0] ?? null;
}

// ─── Queries ──────────────────────────────────────────────────────

export async function findPipelineById(db: Database, pipelineId: string) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .limit(1);
  return result[0] ?? null;
}

export async function findAllPipelines(db: Database) {
  return db.select().from(pipelines);
}

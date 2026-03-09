// ---------------------------------------------------------------------------
// Axiom Orchestrator – Checkpoint System (FR-015b)
// ---------------------------------------------------------------------------
// Save/load cognitive snapshots for durable agent execution across sessions.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { checkpoints } from "../db/schema.js";

const logger = createLogger("checkpoints");

// ── Types ───────────────────────────────────────────────────────────────────

export interface CognitiveSnapshot {
  currentGoal: string;
  decisionLog: Array<{
    decision: string;
    reasoning: string;
    timestamp: string;
  }>;
  pendingActions: Array<{ action: string; priority: number }>;
  progressState: Record<string, unknown>;
  workingArtifacts: Array<{ name: string; path: string; type: string }>;
}

export type CheckpointRecord = typeof checkpoints.$inferSelect;

// ── Save / Load ─────────────────────────────────────────────────────────────

export async function saveCheckpoint(
  db: Database,
  agentId: string,
  sessionId: string | null,
  snapshot: CognitiveSnapshot
): Promise<string> {
  const handoffPrompt = generateHandoffPrompt(snapshot);

  const result = await db
    .insert(checkpoints)
    .values({
      agentId,
      sessionId,
      currentGoal: snapshot.currentGoal,
      progressState: snapshot.progressState,
      decisionLog: snapshot.decisionLog,
      pendingActions: snapshot.pendingActions,
      workingArtifacts: snapshot.workingArtifacts,
      handoffPrompt,
    })
    .returning();

  const record = result[0];
  logger.info("Checkpoint saved", { checkpointId: record.id, agentId });

  return record.id;
}

export async function loadLatestCheckpoint(
  db: Database,
  agentId: string
): Promise<CheckpointRecord | null> {
  const result = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.agentId, agentId))
    .orderBy(desc(checkpoints.createdAt))
    .limit(1);

  return result[0] ?? null;
}

export async function loadCheckpoint(
  db: Database,
  checkpointId: string
): Promise<CheckpointRecord | null> {
  const result = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId))
    .limit(1);

  return result[0] ?? null;
}

// ── Handoff Prompt Generation ───────────────────────────────────────────────

export function generateHandoffPrompt(snapshot: CognitiveSnapshot): string {
  const sections: string[] = [];

  sections.push(`## Current Goal\n${snapshot.currentGoal}`);
  sections.push(formatProgressState(snapshot.progressState));
  sections.push(formatDecisionLog(snapshot.decisionLog));
  sections.push(formatPendingActions(snapshot.pendingActions));
  sections.push(formatArtifacts(snapshot.workingArtifacts));

  return sections.join("\n\n");
}

function formatProgressState(state: Record<string, unknown>): string {
  const entries = Object.entries(state);
  if (entries.length === 0) {
    return "## Progress State\nNo progress recorded.";
  }

  const lines = entries.map(
    ([key, value]) => `- **${key}**: ${JSON.stringify(value)}`
  );
  return `## Progress State\n${lines.join("\n")}`;
}

function formatDecisionLog(
  log: Array<{ decision: string; reasoning: string; timestamp: string }>
): string {
  if (log.length === 0) {
    return "## Key Decisions\nNo decisions recorded.";
  }

  const lines = log.map(
    (entry) =>
      `- [${entry.timestamp}] **${entry.decision}**: ${entry.reasoning}`
  );
  return `## Key Decisions\n${lines.join("\n")}`;
}

function formatPendingActions(
  actions: Array<{ action: string; priority: number }>
): string {
  if (actions.length === 0) {
    return "## Pending Actions\nNo pending actions.";
  }

  const sorted = [...actions].sort((a, b) => b.priority - a.priority);
  const lines = sorted.map(
    (entry) => `- [priority=${entry.priority}] ${entry.action}`
  );
  return `## Pending Actions\n${lines.join("\n")}`;
}

function formatArtifacts(
  artifacts: Array<{ name: string; path: string; type: string }>
): string {
  if (artifacts.length === 0) {
    return "## Working Artifacts\nNo artifacts.";
  }

  const lines = artifacts.map(
    (entry) => `- **${entry.name}** (${entry.type}): ${entry.path}`
  );
  return `## Working Artifacts\n${lines.join("\n")}`;
}

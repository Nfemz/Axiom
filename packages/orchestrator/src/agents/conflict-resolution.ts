// ---------------------------------------------------------------------------
// Axiom Orchestrator – Conflict Resolution (T134)
// ---------------------------------------------------------------------------
// Detects and resolves conflicts between agents: resource contention, goal
// overlap, and budget conflicts. Placeholder detection and resolution with
// escalation support.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { createLogger } from "@axiom/shared";
import type Redis from "ioredis";
import { publishToStream, STREAM_KEYS } from "../comms/streams.js";
import type { Database } from "../db/drizzle.js";
import { sharedKnowledge } from "../db/schema.js";

const log = createLogger("conflict-resolution");

// ── Types ───────────────────────────────────────────────────────────────────

export type ConflictType =
  | "resource_contention"
  | "goal_overlap"
  | "budget_conflict";

export interface Conflict {
  agentIds: string[];
  description: string;
  detectedAt: Date;
  id: string;
  type: ConflictType;
}

interface AgentInfo {
  budgetSpent: number;
  currentTask: string | null;
  id: string;
}

// ── Detect Conflict ─────────────────────────────────────────────────────────

export function detectConflict(agents: AgentInfo[]): Conflict | null {
  // Check for goal overlap: agents working on the same task
  const taskMap = new Map<string, string[]>();
  for (const agent of agents) {
    if (agent.currentTask) {
      const existing = taskMap.get(agent.currentTask) ?? [];
      existing.push(agent.id);
      taskMap.set(agent.currentTask, existing);
    }
  }

  for (const [task, agentIds] of taskMap) {
    if (agentIds.length > 1) {
      return {
        id: randomUUID(),
        type: "goal_overlap",
        agentIds,
        description: `Multiple agents working on the same task: "${task}"`,
        detectedAt: new Date(),
      };
    }
  }

  return null;
}

// ── Escalate to Parent ──────────────────────────────────────────────────────

export async function escalateToParent(
  _db: Database,
  redis: Redis,
  conflict: Conflict,
  parentAgentId?: string
): Promise<void> {
  log.warn("Escalating conflict to parent", {
    conflictId: conflict.id,
    type: conflict.type,
    agentIds: conflict.agentIds,
  });

  // If there's a parent agent, notify it via its inbox stream
  if (parentAgentId) {
    const inboxKey = STREAM_KEYS.agentInbox(parentAgentId);
    await publishToStream(redis, inboxKey, {
      type: "conflict_escalation",
      conflictId: conflict.id,
      conflictType: conflict.type,
      agentIds: conflict.agentIds.join(","),
      description: conflict.description,
      timestamp: new Date().toISOString(),
    });
  }

  // Also notify the orchestrator inbox for visibility
  await publishToStream(redis, STREAM_KEYS.ORCHESTRATOR_INBOX, {
    type: "conflict_escalation",
    conflictId: conflict.id,
    conflictType: conflict.type,
    agentIds: conflict.agentIds.join(","),
    description: conflict.description,
    timestamp: new Date().toISOString(),
  });
}

// ── Resolve Conflict ────────────────────────────────────────────────────────

export async function resolveConflict(
  db: Database,
  conflict: Conflict,
  resolution: string
): Promise<void> {
  log.info("Conflict resolved", {
    conflictId: conflict.id,
    type: conflict.type,
    resolution,
  });

  // Publish resolution to knowledge base as a learning entry
  await db.insert(sharedKnowledge).values({
    content: `Conflict resolution: ${conflict.description} — ${resolution}`,
    entryType: "resolution",
    tags: ["conflict", conflict.type],
    category: "conflict-resolution",
    importanceScore: 0.7,
  });

  log.info("Conflict resolution published to knowledge base", {
    conflictId: conflict.id,
  });
}

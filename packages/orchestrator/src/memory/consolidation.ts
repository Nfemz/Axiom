// ---------------------------------------------------------------------------
// Axiom Orchestrator – Memory Consolidation (T127)
// ---------------------------------------------------------------------------
// Reflection and consolidation of agent memories. Groups older memories,
// generates a summary reflection, and marks originals as consolidated.
// ---------------------------------------------------------------------------

import { createLogger, MemoryType, MEMORY_CONSOLIDATION_INTERVAL_MS } from "@axiom/shared";
import { eq, and, lt, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { agentMemories } from "../db/schema.js";

const log = createLogger("memory-consolidation");

// ── Consolidate ─────────────────────────────────────────────────────────────

export async function consolidateMemories(
  db: Database,
  agentId: string,
  options?: { maxAge?: number },
): Promise<string | null> {
  const maxAge = options?.maxAge ?? MEMORY_CONSOLIDATION_INTERVAL_MS;
  const cutoff = new Date(Date.now() - maxAge);

  const oldMemories = await db
    .select()
    .from(agentMemories)
    .where(
      and(
        eq(agentMemories.agentId, agentId),
        lt(agentMemories.createdAt, cutoff),
        isNull(agentMemories.consolidatedInto),
      ),
    );

  if (oldMemories.length === 0) {
    log.info("No memories to consolidate", { agentId });
    return null;
  }

  const reflectionId = await generateReflection(db, agentId, oldMemories);

  // Mark originals as consolidated
  for (const memory of oldMemories) {
    await db
      .update(agentMemories)
      .set({ consolidatedInto: reflectionId })
      .where(eq(agentMemories.id, memory.id));
  }

  log.info("Memories consolidated", {
    agentId,
    consolidatedCount: oldMemories.length,
    reflectionId,
  });

  return reflectionId;
}

// ── Prune ───────────────────────────────────────────────────────────────────

export async function pruneOutdatedMemories(
  db: Database,
  agentId: string,
  maxAgeDays: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const deleted = await db
    .delete(agentMemories)
    .where(
      and(
        eq(agentMemories.agentId, agentId),
        lt(agentMemories.createdAt, cutoff),
        sql`${agentMemories.consolidatedInto} IS NOT NULL`,
      ),
    )
    .returning({ id: agentMemories.id });

  log.info("Outdated memories pruned", {
    agentId,
    prunedCount: deleted.length,
    maxAgeDays,
  });

  return deleted.length;
}

// ── Generate Reflection ─────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
  content: string;
  memoryType: string;
  importanceScore: number;
}

export async function generateReflection(
  db: Database,
  agentId: string,
  memories: MemoryRow[],
): Promise<string> {
  // Placeholder summarization — in production this would call an LLM
  const summaryParts = memories
    .slice(0, 10)
    .map((m) => m.content.slice(0, 100));
  const summary = `Consolidated ${memories.length} memories: ${summaryParts.join("; ")}`;

  const avgImportance =
    memories.reduce((sum, m) => sum + m.importanceScore, 0) / memories.length;

  const [row] = await db
    .insert(agentMemories)
    .values({
      agentId,
      content: summary,
      memoryType: MemoryType.Consolidation,
      importanceScore: Math.min(avgImportance + 0.1, 1.0),
      tags: ["consolidation", "auto-generated"],
    })
    .returning({ id: agentMemories.id });

  log.info("Reflection generated", {
    agentId,
    reflectionId: row.id,
    sourceCount: memories.length,
  });

  return row.id;
}

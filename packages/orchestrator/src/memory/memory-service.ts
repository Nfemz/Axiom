import { createLogger } from "@axiom/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { agentMemories } from "../db/schema.js";

const logger = createLogger("memory-service");

export interface MemoryResult {
  content: string;
  createdAt: Date;
  id: string;
  importanceScore: number;
  memoryType: string;
  tags: string[];
}

export async function storeMemory(
  db: Database,
  agentId: string,
  content: string,
  memoryType: string,
  tags: string[],
  importanceScore: number,
  embedding?: number[]
): Promise<string> {
  const [row] = await db
    .insert(agentMemories)
    .values({ agentId, content, memoryType, tags, importanceScore, embedding })
    .returning({ id: agentMemories.id });

  logger.info("Memory stored", { agentId, memoryType, id: row.id });
  return row.id;
}

export async function searchMemories(
  db: Database,
  agentId: string,
  query: string,
  limit = 10
): Promise<MemoryResult[]> {
  const pattern = `%${query}%`;

  const rows = await db
    .select()
    .from(agentMemories)
    .where(
      and(
        eq(agentMemories.agentId, agentId),
        sql`${agentMemories.content} ILIKE ${pattern}`
      )
    )
    .orderBy(desc(agentMemories.importanceScore))
    .limit(limit);

  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    await updateAccessedAt(db, ids);
  }

  return rows.map(toMemoryResult);
}

export async function searchByTags(
  db: Database,
  agentId: string,
  tags: string[],
  limit = 10
): Promise<MemoryResult[]> {
  const rows = await db
    .select()
    .from(agentMemories)
    .where(
      and(
        eq(agentMemories.agentId, agentId),
        sql`${agentMemories.tags} && ${sql`ARRAY[${sql.join(
          tags.map((t) => sql`${t}`),
          sql`, `
        )}]::text[]`}`
      )
    )
    .orderBy(desc(agentMemories.importanceScore))
    .limit(limit);

  return rows.map(toMemoryResult);
}

export async function searchByVector(
  db: Database,
  agentId: string,
  embedding: number[],
  limit = 10
): Promise<MemoryResult[]> {
  const vectorStr = `[${embedding.join(",")}]`;

  const rows = await db
    .select()
    .from(agentMemories)
    .where(eq(agentMemories.agentId, agentId))
    .orderBy(sql`${agentMemories.embedding} <=> ${vectorStr}::vector`)
    .limit(limit);

  return rows.map(toMemoryResult);
}

function toMemoryResult(row: typeof agentMemories.$inferSelect): MemoryResult {
  return {
    id: row.id,
    content: row.content,
    memoryType: row.memoryType,
    tags: row.tags ?? [],
    importanceScore: row.importanceScore,
    createdAt: row.createdAt,
  };
}

async function updateAccessedAt(db: Database, ids: string[]): Promise<void> {
  await db
    .update(agentMemories)
    .set({ accessedAt: new Date() })
    .where(inArray(agentMemories.id, ids));
}

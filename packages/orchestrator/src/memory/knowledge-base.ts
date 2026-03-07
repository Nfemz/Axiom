import { createLogger } from '@axiom/shared';
import type { Database } from '../db/drizzle.js';
import { sharedKnowledge } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

const logger = createLogger('knowledge-base');

export interface KnowledgeResult {
  id: string;
  content: string;
  entryType: string;
  tags: string[];
  category: string;
  importanceScore: number;
  accessCount: number;
}

interface KnowledgeEntry {
  content: string;
  entryType: string;
  tags: string[];
  category: string;
  contributingAgentId: string;
  importanceScore: number;
  embedding?: number[];
}

export async function publishKnowledge(
  db: Database,
  entry: KnowledgeEntry,
): Promise<string> {
  const [row] = await db
    .insert(sharedKnowledge)
    .values({
      content: entry.content,
      entryType: entry.entryType,
      tags: entry.tags,
      category: entry.category,
      contributingAgentId: entry.contributingAgentId,
      importanceScore: entry.importanceScore,
      embedding: entry.embedding,
    })
    .returning({ id: sharedKnowledge.id });

  logger.info('Knowledge published', { id: row.id, entryType: entry.entryType });
  return row.id;
}

export async function queryKnowledge(
  db: Database,
  query: string,
  limit: number = 10,
): Promise<KnowledgeResult[]> {
  const pattern = `%${query}%`;

  const rows = await db
    .select()
    .from(sharedKnowledge)
    .where(sql`${sharedKnowledge.content} ILIKE ${pattern}`)
    .orderBy(desc(sharedKnowledge.importanceScore), desc(sharedKnowledge.accessCount))
    .limit(limit);

  return rows.map(toKnowledgeResult);
}

export async function queryKnowledgeByTags(
  db: Database,
  tags: string[],
  limit: number = 10,
): Promise<KnowledgeResult[]> {
  const rows = await db
    .select()
    .from(sharedKnowledge)
    .where(sql`${sharedKnowledge.tags} && ${tags}`)
    .orderBy(desc(sharedKnowledge.importanceScore))
    .limit(limit);

  return rows.map(toKnowledgeResult);
}

export async function incrementAccessCount(
  db: Database,
  id: string,
): Promise<void> {
  await db
    .update(sharedKnowledge)
    .set({ accessCount: sql`${sharedKnowledge.accessCount} + 1` })
    .where(eq(sharedKnowledge.id, id));
}

function toKnowledgeResult(row: typeof sharedKnowledge.$inferSelect): KnowledgeResult {
  return {
    id: row.id,
    content: row.content,
    entryType: row.entryType,
    tags: row.tags ?? [],
    category: row.category,
    importanceScore: row.importanceScore,
    accessCount: row.accessCount,
  };
}

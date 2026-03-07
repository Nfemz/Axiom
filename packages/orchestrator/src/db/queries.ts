import { eq } from "drizzle-orm";
import type { Database } from "./drizzle.js";
import { agents, agentDefinitions, systemConfig } from "./schema.js";

// ─── Agent Queries ─────────────────────────────────────────────────

export async function findAgentById(db: Database, id: string) {
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0] ?? null;
}

export async function findAllAgents(db: Database) {
  return db.select().from(agents);
}

export async function findAgentsByStatus(db: Database, status: string) {
  return db.select().from(agents).where(eq(agents.status, status));
}

export async function insertAgent(
  db: Database,
  data: typeof agents.$inferInsert,
) {
  const result = await db.insert(agents).values(data).returning();
  return result[0];
}

export async function updateAgent(
  db: Database,
  id: string,
  data: Partial<typeof agents.$inferInsert>,
) {
  const result = await db
    .update(agents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(agents.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteAgent(db: Database, id: string) {
  return db.delete(agents).where(eq(agents.id, id));
}

// ─── Agent Definition Queries ──────────────────────────────────────

export async function findDefinitionById(db: Database, id: string) {
  const result = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function findAllDefinitions(db: Database) {
  return db.select().from(agentDefinitions);
}

export async function insertDefinition(
  db: Database,
  data: typeof agentDefinitions.$inferInsert,
) {
  const result = await db.insert(agentDefinitions).values(data).returning();
  return result[0];
}

export async function updateDefinition(
  db: Database,
  id: string,
  data: Partial<typeof agentDefinitions.$inferInsert>,
) {
  const result = await db
    .update(agentDefinitions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(agentDefinitions.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteDefinition(db: Database, id: string) {
  return db.delete(agentDefinitions).where(eq(agentDefinitions.id, id));
}

// ─── System Config Queries ─────────────────────────────────────────

export async function getSystemConfig(db: Database) {
  const result = await db.select().from(systemConfig).where(eq(systemConfig.id, 1)).limit(1);
  return result[0] ?? null;
}

export async function upsertSystemConfig(
  db: Database,
  data: Partial<typeof systemConfig.$inferInsert>,
) {
  const existing = await getSystemConfig(db);
  if (existing) {
    const result = await db
      .update(systemConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemConfig.id, 1))
      .returning();
    return result[0];
  }
  const result = await db
    .insert(systemConfig)
    .values({ id: 1, ...data })
    .returning();
  return result[0];
}

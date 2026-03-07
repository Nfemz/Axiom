// ---------------------------------------------------------------------------
// Shared PostgreSQL Testcontainer helper for integration tests
// ---------------------------------------------------------------------------
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../../../src/db/schema.js";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface PgTestContext {
  container: StartedPostgreSqlContainer;
  db: TestDb;
  client: ReturnType<typeof postgres>;
}

/**
 * Starts a pgvector PostgreSQL container and creates the core tables.
 * Call `teardown()` in afterAll to clean up.
 */
export async function setupPgContainer(): Promise<PgTestContext> {
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg17")
    .withDatabase("axiom_test")
    .start();

  const connectionString = container.getConnectionUri();
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      mission TEXT NOT NULL,
      model_provider VARCHAR(50) NOT NULL,
      model_id VARCHAR(100) NOT NULL,
      default_budget DECIMAL(12,2) NOT NULL,
      capabilities JSONB NOT NULL DEFAULT '{}',
      tools JSONB NOT NULL DEFAULT '{}',
      approval_policies JSONB NOT NULL DEFAULT '{}',
      retry_policy JSONB NOT NULL DEFAULT '{}',
      heartbeat_config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID,
      definition_id UUID NOT NULL REFERENCES agent_definitions(id),
      name VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'spawning',
      sandbox_id VARCHAR(255),
      model_provider VARCHAR(50) NOT NULL,
      model_id VARCHAR(100) NOT NULL,
      current_task TEXT,
      budget_total DECIMAL(12,2) NOT NULL,
      budget_spent DECIMAL(12,2) NOT NULL DEFAULT '0',
      budget_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      permissions JSONB NOT NULL DEFAULT '{}',
      config_checksum VARCHAR(64),
      heartbeat_at TIMESTAMP,
      spawn_context JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      setup_complete BOOLEAN NOT NULL DEFAULT false,
      heartbeat_interval_ms INTEGER NOT NULL DEFAULT 1800000,
      active_hours JSONB NOT NULL DEFAULT '{"start":"06:00","end":"22:00","timezone":"UTC"}',
      revenue_split_operator REAL NOT NULL DEFAULT 0.2,
      revenue_split_reinvest REAL NOT NULL DEFAULT 0.8,
      backup_retention_days INTEGER NOT NULL DEFAULT 90,
      discord_webhook_url TEXT,
      discord_bot_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES agents(id),
      action_type VARCHAR(100) NOT NULL,
      outcome VARCHAR(20) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      security_event BOOLEAN NOT NULL DEFAULT false,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES agents(id),
      content TEXT NOT NULL,
      embedding vector(1536),
      importance_score REAL NOT NULL DEFAULT 0.5,
      memory_type VARCHAR(20) NOT NULL,
      tags TEXT[],
      source_session_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      consolidated_into UUID
    )
  `);

  return { container, db, client };
}

/**
 * Inserts a test agent definition and returns it.
 */
export async function insertTestDefinition(db: TestDb, name = "test-def") {
  const [row] = await db
    .insert(schema.agentDefinitions)
    .values({
      name,
      mission: "Test mission",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      defaultBudget: "100.00",
    })
    .returning();
  return row;
}

/**
 * Inserts a test agent linked to the given definition and returns it.
 */
export async function insertTestAgent(
  db: TestDb,
  definitionId: string,
  name = "test-agent",
  overrides: Partial<typeof schema.agents.$inferInsert> = {},
) {
  const [row] = await db
    .insert(schema.agents)
    .values({
      definitionId,
      name,
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      budgetTotal: "50.00",
      ...overrides,
    })
    .returning();
  return row;
}

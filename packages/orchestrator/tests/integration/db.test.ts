// ---------------------------------------------------------------------------
// T027d – Database Integration Tests (Testcontainers)
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import * as schema from "../../src/db/schema.js";
import {
  setupPgContainer,
  insertTestDefinition,
  insertTestAgent,
  type PgTestContext,
} from "./helpers/pg-container.js";

describe("Database Integration", () => {
  let ctx: PgTestContext;

  beforeAll(async () => {
    ctx = await setupPgContainer();
  }, 120_000);

  afterAll(async () => {
    await ctx.client.end();
    await ctx.container.stop();
  });

  it("connects to PostgreSQL", async () => {
    const result = await ctx.db.execute(sql`SELECT 1 as value`);
    expect(result).toBeDefined();
  });

  it("inserts and reads an agent definition", async () => {
    const def = await insertTestDefinition(ctx.db);

    expect(def).toBeDefined();
    expect(def.name).toBe("test-def");
    expect(def.id).toBeDefined();
  });

  it("inserts and reads an agent", async () => {
    const defs = await ctx.db.select().from(schema.agentDefinitions).limit(1);
    const def = defs[0];

    const agent = await insertTestAgent(ctx.db, def.id);

    expect(agent).toBeDefined();
    expect(agent.name).toBe("test-agent");
    expect(agent.status).toBe("spawning");
  });

  it("upserts system config", async () => {
    await ctx.db
      .insert(schema.systemConfig)
      .values({ id: 1 })
      .onConflictDoNothing();

    const config = await ctx.db.select().from(schema.systemConfig).limit(1);
    expect(config[0]).toBeDefined();
    expect(config[0].setupComplete).toBe(false);
  });

  it("supports pgvector extension", async () => {
    const result = await ctx.db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

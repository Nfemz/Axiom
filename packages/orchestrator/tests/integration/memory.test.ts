// ---------------------------------------------------------------------------
// T069e – Memory Service Integration Tests (Testcontainers + pgvector)
// ---------------------------------------------------------------------------
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  searchByTags,
  searchByVector,
  searchMemories,
  storeMemory,
} from "../../src/memory/memory-service.js";
import {
  insertTestAgent,
  insertTestDefinition,
  type PgTestContext,
  setupPgContainer,
} from "./helpers/pg-container.js";

describe("Memory Service Integration", () => {
  let ctx: PgTestContext;
  let agentId: string;

  beforeAll(async () => {
    ctx = await setupPgContainer();
    const def = await insertTestDefinition(ctx.db, "memory-test-def");
    const agent = await insertTestAgent(ctx.db, def.id, "memory-agent");
    agentId = agent.id;
  }, 120_000);

  afterAll(async () => {
    await ctx.client.end();
    await ctx.container.stop();
  });

  it("stores a memory and returns an id", async () => {
    const id = await storeMemory(
      ctx.db,
      agentId,
      "The API endpoint is /api/v1/users",
      "fact",
      ["api", "endpoint"],
      0.8
    );

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("searches memories by content keyword", async () => {
    // Store a second memory
    await storeMemory(
      ctx.db,
      agentId,
      "Database connection uses port 5432",
      "fact",
      ["database"],
      0.7
    );

    const results = await searchMemories(ctx.db, agentId, "endpoint");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].content).toContain("endpoint");
  });

  it("returns results ordered by importance score", async () => {
    await storeMemory(
      ctx.db,
      agentId,
      "Low importance fact about testing",
      "fact",
      ["test"],
      0.1
    );

    await storeMemory(
      ctx.db,
      agentId,
      "High importance fact about testing",
      "fact",
      ["test"],
      0.99
    );

    const results = await searchMemories(ctx.db, agentId, "testing");
    expect(results.length).toBeGreaterThanOrEqual(2);
    // First result should have higher importance
    expect(results[0].importanceScore).toBeGreaterThanOrEqual(
      results[1].importanceScore
    );
  });

  it("searches memories by tags", async () => {
    await storeMemory(
      ctx.db,
      agentId,
      "Redis is used for caching",
      "fact",
      ["redis", "caching"],
      0.6
    );

    const results = await searchByTags(ctx.db, agentId, ["redis"]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tags).toContain("redis");
  });

  it("stores and retrieves memories with embeddings", async () => {
    // Create a simple 1536-dimension vector (all zeros except first few)
    const embedding = new Array(1536).fill(0);
    embedding[0] = 1.0;
    embedding[1] = 0.5;
    embedding[2] = 0.3;

    const id = await storeMemory(
      ctx.db,
      agentId,
      "Memory with embedding data",
      "observation",
      ["vector"],
      0.9,
      embedding
    );

    expect(id).toBeDefined();

    // Verify we can read it back via content search
    const results = await searchMemories(ctx.db, agentId, "embedding data");
    const found = results.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.content).toBe("Memory with embedding data");
  });

  it("searches by vector similarity", async () => {
    // Create a query vector close to the stored one
    const queryEmbedding = new Array(1536).fill(0);
    queryEmbedding[0] = 0.9;
    queryEmbedding[1] = 0.4;
    queryEmbedding[2] = 0.2;

    const results = await searchByVector(ctx.db, agentId, queryEmbedding, 5);

    // Should return results (at least the one with an embedding)
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("isolates memories between agents", async () => {
    const def = await insertTestDefinition(ctx.db, "memory-test-def-2");
    const agent2 = await insertTestAgent(ctx.db, def.id, "memory-agent-2");

    await storeMemory(
      ctx.db,
      agent2.id,
      "Agent 2 exclusive memory",
      "fact",
      ["exclusive"],
      0.5
    );

    const agent1Results = await searchMemories(ctx.db, agentId, "exclusive");
    const agent2Results = await searchMemories(ctx.db, agent2.id, "exclusive");

    expect(agent1Results.length).toBe(0);
    expect(agent2Results.length).toBe(1);
  });
});

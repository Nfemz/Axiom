// ---------------------------------------------------------------------------
// T069d – Agent Spawn Flow Integration Tests (Testcontainers, DB-only)
// ---------------------------------------------------------------------------

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema.js";
import {
  insertTestDefinition,
  type PgTestContext,
  setupPgContainer,
} from "./helpers/pg-container.js";

describe("Agent Spawn Integration", () => {
  let ctx: PgTestContext;
  let definitionId: string;

  beforeAll(async () => {
    ctx = await setupPgContainer();
    const def = await insertTestDefinition(ctx.db, "spawn-test-def");
    definitionId = def.id;
  }, 120_000);

  afterAll(async () => {
    await ctx.client.end();
    await ctx.container.stop();
  });

  it("creates an agent definition", async () => {
    const defs = await ctx.db
      .select()
      .from(schema.agentDefinitions)
      .where(eq(schema.agentDefinitions.id, definitionId));

    expect(defs.length).toBe(1);
    expect(defs[0].name).toBe("spawn-test-def");
    expect(defs[0].mission).toBe("Test mission");
  });

  it("creates an agent record with status spawning", async () => {
    const [agent] = await ctx.db
      .insert(schema.agents)
      .values({
        definitionId,
        name: "spawn-agent",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-20250514",
        budgetTotal: "25.00",
      })
      .returning();

    expect(agent.status).toBe("spawning");
    expect(agent.budgetSpent).toBe("0.00");
    expect(agent.budgetCurrency).toBe("USD");
  });

  it("updates agent status to running", async () => {
    // Fetch the spawning agent
    const [spawning] = await ctx.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.name, "spawn-agent"));

    // Transition to running
    const [updated] = await ctx.db
      .update(schema.agents)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(schema.agents.id, spawning.id))
      .returning();

    expect(updated.status).toBe("running");
  });

  it("finds agents by status", async () => {
    // Insert another agent that stays in spawning
    await ctx.db.insert(schema.agents).values({
      definitionId,
      name: "spawning-agent-2",
      modelProvider: "openai",
      modelId: "gpt-4o",
      budgetTotal: "10.00",
    });

    const running = await ctx.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.status, "running"));

    const spawning = await ctx.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.status, "spawning"));

    expect(running.length).toBe(1);
    expect(running[0].name).toBe("spawn-agent");
    expect(spawning.length).toBe(1);
    expect(spawning[0].name).toBe("spawning-agent-2");
  });

  it("supports parent-child agent relationships", async () => {
    const [parent] = await ctx.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.name, "spawn-agent"));

    const [child] = await ctx.db
      .insert(schema.agents)
      .values({
        definitionId,
        name: "child-agent",
        parentId: parent.id,
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-20250514",
        budgetTotal: "5.00",
      })
      .returning();

    expect(child.parentId).toBe(parent.id);

    const children = await ctx.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.parentId, parent.id));

    expect(children.length).toBe(1);
    expect(children[0].name).toBe("child-agent");
  });
});

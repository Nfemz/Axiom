// ---------------------------------------------------------------------------
// T090e – Audit Log Integration Tests (Testcontainers)
// ---------------------------------------------------------------------------
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appendAuditEntry,
  queryAuditLog,
} from "../../src/security/audit-log.js";
import {
  insertTestAgent,
  insertTestDefinition,
  type PgTestContext,
  setupPgContainer,
} from "./helpers/pg-container.js";

describe("Audit Log Integration", () => {
  let ctx: PgTestContext;
  let agentId: string;
  let agent2Id: string;

  beforeAll(async () => {
    ctx = await setupPgContainer();

    // Seed an agent definition and two agents for FK references
    const def = await insertTestDefinition(ctx.db);
    const agent = await insertTestAgent(ctx.db, def.id, "audit-agent-1");
    const agent2 = await insertTestAgent(ctx.db, def.id, "audit-agent-2");
    agentId = agent.id;
    agent2Id = agent2.id;
  }, 120_000);

  afterAll(async () => {
    await ctx.client.end();
    await ctx.container.stop();
  });

  it("appendAuditEntry inserts a record", async () => {
    const entry = await appendAuditEntry(
      ctx.db,
      agentId,
      "tool.execute",
      "success",
      { tool: "bash", args: ["ls"] }
    );

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.agentId).toBe(agentId);
    expect(entry.actionType).toBe("tool.execute");
    expect(entry.outcome).toBe("success");
    expect(entry.securityEvent).toBe(false);
  });

  it("queryAuditLog returns inserted records", async () => {
    // Insert a second entry
    await appendAuditEntry(ctx.db, agentId, "agent.spawn", "success", {
      reason: "test",
    });

    const results = await queryAuditLog(ctx.db, {});
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("queryAuditLog filters by agentId", async () => {
    // Insert entry for agent2
    await appendAuditEntry(ctx.db, agent2Id, "tool.execute", "failure", {
      error: "permission denied",
    });

    const agent1Results = await queryAuditLog(ctx.db, { agentId });
    const agent2Results = await queryAuditLog(ctx.db, { agentId: agent2Id });

    expect(agent1Results.every((r) => r.agentId === agentId)).toBe(true);
    expect(agent2Results.every((r) => r.agentId === agent2Id)).toBe(true);
    expect(agent2Results.length).toBeGreaterThanOrEqual(1);
  });

  it("queryAuditLog filters by securityOnly", async () => {
    // Insert a security event
    await appendAuditEntry(
      ctx.db,
      agentId,
      "sandbox.escape_attempt",
      "blocked",
      { path: "/etc/passwd" },
      true
    );

    const securityResults = await queryAuditLog(ctx.db, {
      securityOnly: true,
    });

    expect(securityResults.length).toBeGreaterThanOrEqual(1);
    expect(securityResults.every((r) => r.securityEvent === true)).toBe(true);
  });

  it("entries are immutable (no update/delete exposed)", async () => {
    // The audit-log module only exports appendAuditEntry and queryAuditLog.
    // Verify the module does not expose update or delete functions.
    const auditModule = await import("../../src/security/audit-log.js");
    const exportedKeys = Object.keys(auditModule);

    expect(exportedKeys).not.toContain("updateAuditEntry");
    expect(exportedKeys).not.toContain("deleteAuditEntry");
    expect(exportedKeys).toContain("appendAuditEntry");
    expect(exportedKeys).toContain("queryAuditLog");
  });
});

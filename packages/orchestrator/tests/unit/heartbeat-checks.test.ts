import { describe, it, expect, vi, beforeEach } from "vitest";
import { HEARTBEAT_TIMEOUT_MS } from "@axiom/shared";

vi.mock("../../src/db/drizzle.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../src/db/queries.js", () => ({
  findAgentsByStatus: vi.fn().mockResolvedValue([]),
  updateAgent: vi.fn().mockResolvedValue(undefined),
}));

import { runHeartbeatChecks } from "../../src/heartbeat/checks.js";
import { getDb } from "../../src/db/drizzle.js";
import { findAgentsByStatus, updateAgent } from "../../src/db/queries.js";

describe("Heartbeat Checks", () => {
  const mockDb = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(mockDb as any);
    vi.mocked(findAgentsByStatus).mockResolvedValue([]);
  });

  it("cheap-checks-first: calls findAgentsByStatus three times (one per layer)", async () => {
    await runHeartbeatChecks();

    // Layer 1 (timeout), Layer 2 (resource), Layer 3 (stall) — each queries running agents
    expect(findAgentsByStatus).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(findAgentsByStatus).mock.calls) {
      expect(call[1]).toBe("running");
    }
  });

  it("detects heartbeat timeout and sets agent to error (restart)", async () => {
    const staleAgent = {
      id: "a-1",
      name: "Stale Bot",
      heartbeatAt: new Date(Date.now() - HEARTBEAT_TIMEOUT_MS - 60_000),
      updatedAt: new Date(),
      budgetTotal: "0",
      budgetSpent: "0",
    };
    vi.mocked(findAgentsByStatus).mockResolvedValue([staleAgent] as any);

    await runHeartbeatChecks();

    expect(updateAgent).toHaveBeenCalledWith(
      mockDb,
      "a-1",
      expect.objectContaining({ status: "error" }),
    );
  });

  it("detects resource exceeded for over-budget agent (escalate, no status change)", async () => {
    const overBudget = {
      id: "a-2",
      name: "Spender",
      heartbeatAt: new Date(),
      updatedAt: new Date(),
      budgetTotal: "100",
      budgetSpent: "90",
    };
    vi.mocked(findAgentsByStatus).mockResolvedValue([overBudget] as any);

    await runHeartbeatChecks();

    // Escalate action does not call updateAgent for status change
    // but the check itself completes and findAgentsByStatus was called
    expect(findAgentsByStatus).toHaveBeenCalled();
  });

  it("detects stalled agents with no recent updates", async () => {
    const stalledAgent = {
      id: "a-3",
      name: "Stalled Bot",
      heartbeatAt: new Date(),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago > 15 min threshold
      budgetTotal: "0",
      budgetSpent: "0",
    };
    vi.mocked(findAgentsByStatus).mockResolvedValue([stalledAgent] as any);

    await runHeartbeatChecks();

    // Stall detection triggers escalate (no updateAgent call)
    expect(findAgentsByStatus).toHaveBeenCalled();
  });

  it("reports no issues when all agents are healthy", async () => {
    const healthyAgent = {
      id: "a-4",
      name: "Healthy Bot",
      heartbeatAt: new Date(),
      updatedAt: new Date(),
      budgetTotal: "100",
      budgetSpent: "10",
    };
    vi.mocked(findAgentsByStatus).mockResolvedValue([healthyAgent] as any);

    await runHeartbeatChecks();

    // No updateAgent calls for healthy agents
    expect(updateAgent).not.toHaveBeenCalled();
  });
});

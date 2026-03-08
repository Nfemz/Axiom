import { describe, expect, it, vi } from "vitest";
import {
  checkBudget,
  getBudgetSummary,
  preAuthorize,
} from "../../src/financial/budget.js";

// ─── Mock DB Factory ─────────────────────────────────────────────

function makeMockDb(agentRow?: { budgetTotal: string; budgetSpent: string }) {
  const insertReturning = vi.fn();
  const updateSet = vi.fn();
  const updateWhere = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            agentRow
              ? [
                  {
                    id: "agent-1",
                    budgetTotal: agentRow.budgetTotal,
                    budgetSpent: agentRow.budgetSpent,
                  },
                ]
              : []
          ),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: insertReturning.mockResolvedValue([
          { id: "tx-1", agentId: "agent-1", amount: "5.00", type: "expense" },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: updateSet.mockReturnValue({
        where: updateWhere.mockResolvedValue(undefined),
      }),
    }),
  };

  return {
    db: db as unknown as Parameters<typeof checkBudget>[0],
    insertReturning,
    updateSet,
  };
}

// ─── checkBudget ─────────────────────────────────────────────────

describe("checkBudget", () => {
  it("allows when sufficient funds remain", async () => {
    const { db } = makeMockDb({ budgetTotal: "100.00", budgetSpent: "40.00" });

    const result = await checkBudget(db, "agent-1", 50);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(60);
    expect(result.reason).toBeUndefined();
  });

  it("blocks when insufficient funds", async () => {
    const { db } = makeMockDb({ budgetTotal: "100.00", budgetSpent: "80.00" });

    const result = await checkBudget(db, "agent-1", 30);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(20);
    expect(result.reason).toContain("exceeds remaining budget");
  });

  it("allows when requested amount equals remaining", async () => {
    const { db } = makeMockDb({ budgetTotal: "50.00", budgetSpent: "25.00" });

    const result = await checkBudget(db, "agent-1", 25);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(25);
  });

  it("returns not-allowed when agent is not found", async () => {
    const { db } = makeMockDb(undefined);

    const result = await checkBudget(db, "missing-agent", 10);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBe("Agent not found");
  });
});

// ─── getBudgetSummary ────────────────────────────────────────────

describe("getBudgetSummary", () => {
  it("computes total, spent, remaining, and utilizationPercent", async () => {
    const { db } = makeMockDb({ budgetTotal: "200.00", budgetSpent: "50.00" });

    const summary = await getBudgetSummary(db, "agent-1");

    expect(summary).not.toBeNull();
    expect(summary?.total).toBe(200);
    expect(summary?.spent).toBe(50);
    expect(summary?.remaining).toBe(150);
    expect(summary?.utilizationPercent).toBe(25);
  });

  it("returns 0% utilization when budget total is zero-spend", async () => {
    const { db } = makeMockDb({ budgetTotal: "100.00", budgetSpent: "0.00" });

    const summary = await getBudgetSummary(db, "agent-1");

    expect(summary?.utilizationPercent).toBe(0);
    expect(summary?.remaining).toBe(100);
  });

  it("returns null when agent not found", async () => {
    const { db } = makeMockDb(undefined);

    const summary = await getBudgetSummary(db, "missing-agent");

    expect(summary).toBeNull();
  });
});

// ─── preAuthorize ────────────────────────────────────────────────

describe("preAuthorize", () => {
  it("creates a transaction when budget allows", async () => {
    const { db, insertReturning } = makeMockDb({
      budgetTotal: "100.00",
      budgetSpent: "10.00",
    });

    const result = await preAuthorize(db, "agent-1", 5, "llm", "GPT usage");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("tx-1");
    expect(insertReturning).toHaveBeenCalled();
  });

  it("returns null when budget is insufficient", async () => {
    const { db, insertReturning } = makeMockDb({
      budgetTotal: "10.00",
      budgetSpent: "9.00",
    });

    const result = await preAuthorize(db, "agent-1", 5, "llm");

    expect(result).toBeNull();
    expect(insertReturning).not.toHaveBeenCalled();
  });
});

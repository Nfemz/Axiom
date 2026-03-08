import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateCondition,
  evaluateRules,
  fireAlert,
  acknowledgeAlert,
  getActiveAlerts,
} from "../../src/security/alert-engine.js";
import type { AlertCondition } from "../../src/security/alert-engine.js";

// ─── evaluateCondition ──────────────────────────────────────────────

describe("evaluateCondition", () => {
  it("gt: returns true when value > threshold", () => {
    const cond: AlertCondition = { metric: "cpu", operator: "gt", threshold: 80 };
    expect(evaluateCondition(cond, 90)).toBe(true);
  });

  it("gt: returns false when value equals threshold (boundary)", () => {
    const cond: AlertCondition = { metric: "cpu", operator: "gt", threshold: 80 };
    expect(evaluateCondition(cond, 80)).toBe(false);
  });

  it("gt: returns false when value < threshold", () => {
    const cond: AlertCondition = { metric: "cpu", operator: "gt", threshold: 80 };
    expect(evaluateCondition(cond, 70)).toBe(false);
  });

  it("lt: returns true when value < threshold", () => {
    const cond: AlertCondition = { metric: "memory", operator: "lt", threshold: 50 };
    expect(evaluateCondition(cond, 30)).toBe(true);
  });

  it("lt: returns false when value equals threshold (boundary)", () => {
    const cond: AlertCondition = { metric: "memory", operator: "lt", threshold: 50 };
    expect(evaluateCondition(cond, 50)).toBe(false);
  });

  it("lt: returns false when value > threshold", () => {
    const cond: AlertCondition = { metric: "memory", operator: "lt", threshold: 50 };
    expect(evaluateCondition(cond, 60)).toBe(false);
  });

  it("eq: returns true when value === threshold", () => {
    const cond: AlertCondition = { metric: "agents", operator: "eq", threshold: 10 };
    expect(evaluateCondition(cond, 10)).toBe(true);
  });

  it("eq: returns false when value !== threshold", () => {
    const cond: AlertCondition = { metric: "agents", operator: "eq", threshold: 10 };
    expect(evaluateCondition(cond, 11)).toBe(false);
  });

  it("gte: returns true when value >= threshold", () => {
    const cond: AlertCondition = { metric: "cost", operator: "gte", threshold: 100 };
    expect(evaluateCondition(cond, 100)).toBe(true);
    expect(evaluateCondition(cond, 150)).toBe(true);
  });

  it("gte: returns false when value < threshold", () => {
    const cond: AlertCondition = { metric: "cost", operator: "gte", threshold: 100 };
    expect(evaluateCondition(cond, 99)).toBe(false);
  });

  it("lte: returns true when value <= threshold", () => {
    const cond: AlertCondition = { metric: "uptime", operator: "lte", threshold: 5 };
    expect(evaluateCondition(cond, 5)).toBe(true);
    expect(evaluateCondition(cond, 3)).toBe(true);
  });

  it("lte: returns false when value > threshold", () => {
    const cond: AlertCondition = { metric: "uptime", operator: "lte", threshold: 5 };
    expect(evaluateCondition(cond, 6)).toBe(false);
  });
});

// ─── Mock DB helpers ────────────────────────────────────────────────

function createMockDb() {
  const store: Record<string, unknown>[] = [];
  let idCounter = 0;

  const mockReturning = vi.fn((cols?: Record<string, unknown>) => {
    const last = store[store.length - 1];
    return [cols ? { id: last.id } : last];
  });

  const mockValues = vi.fn((row: Record<string, unknown>) => {
    idCounter++;
    const newRow = { id: `alert-${idCounter}`, ...row, acknowledged: false, acknowledgedAt: null, createdAt: new Date() };
    store.push(newRow);
    return { returning: mockReturning };
  });

  const mockInsert = vi.fn(() => ({
    values: mockValues,
  }));

  const mockSet = vi.fn(() => ({
    where: vi.fn((condition: unknown) => {
      // Simulate updating the matching row
      for (const row of store) {
        // The mock always updates; in tests we control the alertId
        (row as Record<string, unknown>).acknowledged = true;
        (row as Record<string, unknown>).acknowledgedAt = new Date();
      }
      return Promise.resolve();
    }),
  }));

  const mockUpdate = vi.fn(() => ({
    set: mockSet,
  }));

  const mockLimit = vi.fn((n: number) => {
    return store
      .filter((r) => !r.acknowledged)
      .slice(0, n);
  });

  const mockOrderBy = vi.fn(() => ({
    limit: mockLimit,
  }));

  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
  }));

  const mockFrom = vi.fn(() => ({
    where: mockWhere,
  }));

  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const db = {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    _store: store,
    _mockWhere: mockWhere,
    _mockLimit: mockLimit,
  };

  return db as unknown;
}

// ─── fireAlert ──────────────────────────────────────────────────────

describe("fireAlert", () => {
  it("inserts an alert event and returns its id", async () => {
    const db = createMockDb() as any;
    const id = await fireAlert(db, "rule-1", "agent-1", "critical", "CPU too high");

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(id).toMatch(/^alert-/);
  });

  it("passes correct values to the insert", async () => {
    const db = createMockDb() as any;
    await fireAlert(db, "rule-42", null, "warning", "Memory low");

    const insertChain = db.insert.mock.results[0].value;
    const valuesArg = insertChain.values.mock.calls[0][0];
    expect(valuesArg).toEqual({
      ruleId: "rule-42",
      agentId: null,
      severity: "warning",
      message: "Memory low",
    });
  });
});

// ─── evaluateRules ──────────────────────────────────────────────────

describe("evaluateRules", () => {
  it("fires alerts for rules whose conditions are met", async () => {
    const db = createMockDb() as any;

    const rules = [
      {
        id: "r1",
        name: "High CPU",
        condition: { metric: "cpu", operator: "gt", threshold: 80 },
        severity: "critical",
        enabled: true,
        notifyDiscord: false,
      },
      {
        id: "r2",
        name: "Low Memory",
        condition: { metric: "memory", operator: "lt", threshold: 20 },
        severity: "warning",
        enabled: true,
        notifyDiscord: false,
      },
    ];

    const metrics = { cpu: 95, memory: 50 };
    const firedIds = await evaluateRules(db, rules, metrics);

    // Only rule r1 should fire (cpu 95 > 80); r2 should not (memory 50 is not < 20)
    expect(firedIds).toHaveLength(1);
    expect(firedIds[0]).toMatch(/^alert-/);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("skips disabled rules", async () => {
    const db = createMockDb() as any;

    const rules = [
      {
        id: "r1",
        name: "High CPU",
        condition: { metric: "cpu", operator: "gt", threshold: 80 },
        severity: "critical",
        enabled: false,
        notifyDiscord: false,
      },
    ];

    const metrics = { cpu: 95 };
    const firedIds = await evaluateRules(db, rules, metrics);

    expect(firedIds).toHaveLength(0);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("skips rules whose metric is not present in metrics", async () => {
    const db = createMockDb() as any;

    const rules = [
      {
        id: "r1",
        name: "High CPU",
        condition: { metric: "cpu", operator: "gt", threshold: 80 },
        severity: "critical",
        enabled: true,
        notifyDiscord: false,
      },
    ];

    const metrics = { memory: 50 }; // no "cpu" key
    const firedIds = await evaluateRules(db, rules, metrics);

    expect(firedIds).toHaveLength(0);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("fires multiple alerts when multiple rules match", async () => {
    const db = createMockDb() as any;

    const rules = [
      {
        id: "r1",
        name: "High CPU",
        condition: { metric: "cpu", operator: "gt", threshold: 80 },
        severity: "critical",
        enabled: true,
        notifyDiscord: false,
      },
      {
        id: "r2",
        name: "High Cost",
        condition: { metric: "cost", operator: "gte", threshold: 100 },
        severity: "warning",
        enabled: true,
        notifyDiscord: false,
      },
    ];

    const metrics = { cpu: 95, cost: 200 };
    const firedIds = await evaluateRules(db, rules, metrics);

    expect(firedIds).toHaveLength(2);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });
});

// ─── acknowledgeAlert ───────────────────────────────────────────────

describe("acknowledgeAlert", () => {
  it("updates the alert with acknowledged=true and a timestamp", async () => {
    const db = createMockDb() as any;

    await acknowledgeAlert(db, "alert-1");

    expect(db.update).toHaveBeenCalledTimes(1);
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg.acknowledged).toBe(true);
    expect(setArg.acknowledgedAt).toBeInstanceOf(Date);
  });
});

// ─── getActiveAlerts ────────────────────────────────────────────────

describe("getActiveAlerts", () => {
  it("queries for unacknowledged alerts with default limit", async () => {
    const db = createMockDb() as any;

    await getActiveAlerts(db);

    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("passes severity filter when provided", async () => {
    const db = createMockDb() as any;

    await getActiveAlerts(db, { severity: "critical" });

    // Verify the query was constructed (select -> from -> where chain)
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db._mockWhere).toHaveBeenCalledTimes(1);
  });

  it("passes ruleId and agentId filters when provided", async () => {
    const db = createMockDb() as any;

    await getActiveAlerts(db, { ruleId: "r1", agentId: "agent-1" });

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db._mockWhere).toHaveBeenCalledTimes(1);
  });

  it("respects custom limit", async () => {
    const db = createMockDb() as any;

    await getActiveAlerts(db, { limit: 10 });

    expect(db._mockLimit).toHaveBeenCalledWith(10);
  });

  it("uses default limit of 100 when none specified", async () => {
    const db = createMockDb() as any;

    await getActiveAlerts(db);

    expect(db._mockLimit).toHaveBeenCalledWith(100);
  });
});

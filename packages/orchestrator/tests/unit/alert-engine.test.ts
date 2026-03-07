import { describe, it, expect } from "vitest";
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

// ─── Exports ────────────────────────────────────────────────────────

describe("alert-engine exports", () => {
  it("evaluateRules is an exported function", () => {
    expect(typeof evaluateRules).toBe("function");
  });

  it("fireAlert is an exported function", () => {
    expect(typeof fireAlert).toBe("function");
  });

  it("acknowledgeAlert is an exported function", () => {
    expect(typeof acknowledgeAlert).toBe("function");
  });

  it("getActiveAlerts is an exported function", () => {
    expect(typeof getActiveAlerts).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import { computeCost } from "../../src/financial/llm-costs.js";

describe("LLM Cost Tracker", () => {
  describe("computeCost", () => {
    it("computes cost for claude-sonnet-4-20250514", () => {
      // 1000 input tokens at $3/1M = $0.003
      // 500 output tokens at $15/1M = $0.0075
      const cost = computeCost("claude-sonnet-4-20250514", 1000, 500);
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it("computes cost for claude-opus-4-20250514", () => {
      // 1000 input at $15/1M = $0.015
      // 500 output at $75/1M = $0.0375
      const cost = computeCost("claude-opus-4-20250514", 1000, 500);
      expect(cost).toBeCloseTo(0.0525, 4);
    });

    it("computes cost for gpt-4o", () => {
      // 1000 input at $2.5/1M = $0.0025
      // 500 output at $10/1M = $0.005
      const cost = computeCost("gpt-4o", 1000, 500);
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it("computes cost for gemini-2.5-pro", () => {
      // 1000 input at $1.25/1M = $0.00125
      // 500 output at $10/1M = $0.005
      const cost = computeCost("gemini-2.5-pro", 1000, 500);
      expect(cost).toBeCloseTo(0.006_25, 4);
    });

    it("includes cache read tokens at 10% of input price", () => {
      // 1000 input at $3/1M = $0.003
      // 0 output
      // 5000 cache read at $0.3/1M = $0.0015
      const cost = computeCost("claude-sonnet-4-20250514", 1000, 0, 5000, 0);
      expect(cost).toBeCloseTo(0.0045, 4);
    });

    it("includes cache create tokens at full input price", () => {
      // 0 input
      // 0 output
      // 0 cache read
      // 1000 cache create at $3/1M = $0.003
      const cost = computeCost("claude-sonnet-4-20250514", 0, 0, 0, 1000);
      expect(cost).toBeCloseTo(0.003, 4);
    });

    it("returns 0 for unknown model", () => {
      const cost = computeCost("unknown-model", 1000, 500);
      expect(cost).toBe(0);
    });

    it("returns 0 for zero tokens", () => {
      const cost = computeCost("claude-sonnet-4-20250514", 0, 0);
      expect(cost).toBe(0);
    });
  });
});

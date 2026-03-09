import { describe, expect, it } from "vitest";
import { computeRevenueSplit } from "../../src/financial/ledger.js";

describe("Financial Ledger", () => {
  describe("computeRevenueSplit", () => {
    it("splits with default 20/80 ratio", () => {
      const result = computeRevenueSplit(1000, 0.2, 0.8);
      expect(result.operatorAmount).toBe(200);
      expect(result.reinvestAmount).toBe(800);
    });

    it("splits with custom 50/50 ratio", () => {
      const result = computeRevenueSplit(500, 0.5, 0.5);
      expect(result.operatorAmount).toBe(250);
      expect(result.reinvestAmount).toBe(250);
    });

    it("handles zero amount", () => {
      const result = computeRevenueSplit(0, 0.2, 0.8);
      expect(result.operatorAmount).toBe(0);
      expect(result.reinvestAmount).toBe(0);
    });

    it("rounds to two decimal places", () => {
      const result = computeRevenueSplit(33.33, 0.2, 0.8);
      expect(result.operatorAmount).toBe(6.67);
      expect(result.reinvestAmount).toBe(26.66);
    });

    it("operator + reinvest amounts approximate original", () => {
      const amount = 1000;
      const result = computeRevenueSplit(amount, 0.2, 0.8);
      expect(result.operatorAmount + result.reinvestAmount).toBeCloseTo(
        amount,
        1
      );
    });

    it("handles 100/0 split", () => {
      const result = computeRevenueSplit(500, 1.0, 0);
      expect(result.operatorAmount).toBe(500);
      expect(result.reinvestAmount).toBe(0);
    });
  });
});

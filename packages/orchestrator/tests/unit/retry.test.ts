import { describe, it, expect } from "vitest";
import {
  calculateBackoff,
  executeWithRetry,
  DEFAULT_RETRY_POLICY,
  type RetryPolicy,
} from "../../src/agents/retry.js";

describe("calculateBackoff", () => {
  describe("exponential backoff", () => {
    const policy: RetryPolicy = {
      maxRetries: 3,
      backoffType: "exponential",
      backoffDelay: 1000,
    };

    it("returns 1000ms for attempt 0", () => {
      expect(calculateBackoff(policy, 0)).toBe(1000);
    });

    it("returns 2000ms for attempt 1", () => {
      expect(calculateBackoff(policy, 1)).toBe(2000);
    });

    it("returns 4000ms for attempt 2", () => {
      expect(calculateBackoff(policy, 2)).toBe(4000);
    });
  });

  describe("linear backoff", () => {
    const policy: RetryPolicy = {
      maxRetries: 3,
      backoffType: "linear",
      backoffDelay: 1000,
    };

    it("returns 1000ms for attempt 0", () => {
      expect(calculateBackoff(policy, 0)).toBe(1000);
    });

    it("returns 2000ms for attempt 1", () => {
      expect(calculateBackoff(policy, 1)).toBe(2000);
    });

    it("returns 3000ms for attempt 2", () => {
      expect(calculateBackoff(policy, 2)).toBe(3000);
    });
  });

  describe("max delay cap", () => {
    it("caps at 5 minutes (300000ms)", () => {
      const policy: RetryPolicy = {
        maxRetries: 30,
        backoffType: "exponential",
        backoffDelay: 1000,
      };
      // Attempt 20: 1000 * 2^20 = 1,048,576,000 — should be capped
      expect(calculateBackoff(policy, 20)).toBe(300_000);
    });
  });
});

describe("executeWithRetry", () => {
  const fastPolicy: RetryPolicy = {
    maxRetries: 3,
    backoffType: "exponential",
    backoffDelay: 1,
  };

  it("succeeds on first try", async () => {
    const fn = async () => "success";
    const result = await executeWithRetry(fn, fastPolicy, "test");
    expect(result).toBe("success");
  });

  it("succeeds after retries when function fails then succeeds", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error(`Failure #${callCount}`);
      }
      return "recovered";
    };

    const result = await executeWithRetry(fn, fastPolicy, "test");
    expect(result).toBe("recovered");
    expect(callCount).toBe(3);
  });

  it("throws after max retries are exhausted", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      throw new Error("persistent failure");
    };

    await expect(executeWithRetry(fn, fastPolicy, "test")).rejects.toThrow(
      "persistent failure",
    );
    // Initial attempt + 3 retries = 4 total calls
    expect(callCount).toBe(4);
  });
});

describe("DEFAULT_RETRY_POLICY", () => {
  it("has maxRetries of 3", () => {
    expect(DEFAULT_RETRY_POLICY.maxRetries).toBe(3);
  });

  it("uses exponential backoff type", () => {
    expect(DEFAULT_RETRY_POLICY.backoffType).toBe("exponential");
  });

  it("has backoffDelay of 1000", () => {
    expect(DEFAULT_RETRY_POLICY.backoffDelay).toBe(1000);
  });
});

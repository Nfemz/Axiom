import { SKILL_AUTO_DEPRECATE_FAILURES, SkillStatus } from "@axiom/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSkillMetrics,
  invokeSkill,
  recordFailure,
  recordSuccess,
} from "../../src/skills/lifecycle.js";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb() {
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning, limit: vi.fn(() => []) }));
  const set = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const select = vi.fn(() => ({ from }));

  return { update, select, set, where, returning, from };
}

describe("Skill Lifecycle", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("invokeSkill increments invocation count and returns skill", async () => {
    const skill = { id: "sk-1", invocationCount: 5 };
    db.returning.mockResolvedValueOnce([skill]);

    const result = await invokeSkill(db as any, "sk-1");

    expect(result).toEqual(skill);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("invokeSkill throws when skill not found", async () => {
    db.returning.mockResolvedValueOnce([]);

    await expect(invokeSkill(db as any, "missing")).rejects.toThrow(
      "Skill not found"
    );
  });

  it("recordSuccess resets consecutiveFailures to 0", async () => {
    await recordSuccess(db as any, "sk-1");

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ consecutiveFailures: 0 })
    );
  });

  it("recordFailure does not deprecate when below threshold", async () => {
    db.returning.mockResolvedValueOnce([
      {
        consecutiveFailures: 1,
        status: SkillStatus.Active,
      },
    ]);

    await recordFailure(db as any, "sk-1");

    // update called once for the failure increment only
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("recordFailure auto-deprecates at threshold", async () => {
    db.returning.mockResolvedValueOnce([
      {
        consecutiveFailures: SKILL_AUTO_DEPRECATE_FAILURES,
        status: SkillStatus.Active,
      },
    ]);

    await recordFailure(db as any, "sk-1");

    // update called twice: once for failure increment, once for deprecation
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("recordFailure does not double-deprecate already deprecated skill", async () => {
    db.returning.mockResolvedValueOnce([
      {
        consecutiveFailures: SKILL_AUTO_DEPRECATE_FAILURES,
        status: SkillStatus.Deprecated,
      },
    ]);

    await recordFailure(db as any, "sk-1");

    // only the failure increment, no second deprecation update
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("getSkillMetrics computes failure rate correctly", async () => {
    db.where.mockReturnValueOnce({
      limit: vi.fn(() => [{ invocationCount: 10, successCount: 7 }]),
      returning: vi.fn(),
    });

    const metrics = await getSkillMetrics(db as any, "sk-1");

    expect(metrics.invocationCount).toBe(10);
    expect(metrics.successCount).toBe(7);
    expect(metrics.failureRate).toBeCloseTo(0.3);
  });

  it("getSkillMetrics returns 0 failure rate when no invocations", async () => {
    db.where.mockReturnValueOnce({
      limit: vi.fn(() => [{ invocationCount: 0, successCount: 0 }]),
      returning: vi.fn(),
    });

    const metrics = await getSkillMetrics(db as any, "sk-1");

    expect(metrics.failureRate).toBe(0);
  });

  it("getSkillMetrics throws when skill not found", async () => {
    db.where.mockReturnValueOnce({
      limit: vi.fn(() => []),
      returning: vi.fn(),
    });

    await expect(getSkillMetrics(db as any, "missing")).rejects.toThrow(
      "Skill not found"
    );
  });
});

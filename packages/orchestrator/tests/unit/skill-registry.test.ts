import { describe, it, expect, vi, beforeEach } from "vitest";
import { SkillStatus } from "@axiom/shared";
import {
  createSkill,
  validateSkill,
  activateSkill,
  deprecateSkill,
  getSkill,
  listSkills,
  publishNewVersion,
} from "../../src/skills/registry.js";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb() {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const where = vi.fn(() => ({ limit: vi.fn(() => []) }));
  const set = vi.fn(() => ({ where: vi.fn() }));
  const from = vi.fn(() => ({ where }));
  const insert = vi.fn(() => ({ values }));
  const update = vi.fn(() => ({ set }));
  const select = vi.fn(() => ({ from }));

  return { insert, update, select, returning, values, set, where, from };
}

const SKILL_PARAMS = {
  name: "web-search",
  triggerCondition: "needs info",
  inputs: { query: "string" },
  outputs: { result: "string" },
  steps: [{ action: "search" }],
  successCriteria: "results found",
  failureCriteria: "timeout",
};

describe("Skill Registry", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("createSkill inserts with draft status and version 1, returns id", async () => {
    db.returning.mockResolvedValueOnce([{ id: "sk-1" }]);

    const id = await createSkill(db as any, SKILL_PARAMS);

    expect(id).toBe("sk-1");
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SkillStatus.Draft,
        version: 1,
        name: "web-search",
      }),
    );
  });

  it("validateSkill throws when skill not found", async () => {
    db.where.mockReturnValueOnce({ limit: vi.fn(() => []) });

    await expect(validateSkill(db as any, "missing")).rejects.toThrow("Skill not found");
  });

  it("validateSkill throws when required fields are missing", async () => {
    const incomplete = { id: "sk-1", name: "x", triggerCondition: "", successCriteria: "", failureCriteria: "f" };
    db.where.mockReturnValueOnce({ limit: vi.fn(() => [incomplete]) });

    await expect(validateSkill(db as any, "sk-1")).rejects.toThrow("missing required fields");
  });

  it("validateSkill updates status to validated when all fields present", async () => {
    const valid = {
      id: "sk-1",
      name: "web-search",
      triggerCondition: "needs info",
      successCriteria: "found",
      failureCriteria: "timeout",
    };
    db.where.mockReturnValueOnce({ limit: vi.fn(() => [valid]) });

    await validateSkill(db as any, "sk-1");

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: SkillStatus.Validated }),
    );
  });

  it("activateSkill updates status to active", async () => {
    await activateSkill(db as any, "sk-1");

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: SkillStatus.Active }),
    );
  });

  it("deprecateSkill updates status to deprecated", async () => {
    await deprecateSkill(db as any, "sk-1");

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: SkillStatus.Deprecated }),
    );
  });

  it("publishNewVersion increments version and resets to draft", async () => {
    const existing = { id: "sk-1", version: 2, name: "web-search" };
    db.where.mockReturnValueOnce({ limit: vi.fn(() => [existing]) });

    await publishNewVersion(db as any, "sk-1", { name: "web-search-v3" });

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3, status: SkillStatus.Draft, name: "web-search-v3" }),
    );
  });

  it("publishNewVersion throws when skill not found", async () => {
    db.where.mockReturnValueOnce({ limit: vi.fn(() => []) });

    await expect(publishNewVersion(db as any, "missing", {})).rejects.toThrow("Skill not found");
  });
});

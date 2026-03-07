import { describe, it, expect } from "vitest";
import {
  invokeSkill,
  recordSuccess,
  recordFailure,
  getSkillMetrics,
} from "../../src/skills/lifecycle.js";

describe("Skill Lifecycle", () => {
  it("exports invokeSkill function", () => {
    expect(typeof invokeSkill).toBe("function");
  });

  it("exports recordSuccess function", () => {
    expect(typeof recordSuccess).toBe("function");
  });

  it("exports recordFailure function", () => {
    expect(typeof recordFailure).toBe("function");
  });

  it("exports getSkillMetrics function", () => {
    expect(typeof getSkillMetrics).toBe("function");
  });
});

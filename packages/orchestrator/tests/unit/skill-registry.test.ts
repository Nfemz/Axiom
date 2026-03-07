import { describe, it, expect } from "vitest";
import {
  createSkill,
  validateSkill,
  activateSkill,
  deprecateSkill,
  getSkill,
  listSkills,
  publishNewVersion,
} from "../../src/skills/registry.js";

describe("Skill Registry", () => {
  it("exports createSkill function", () => {
    expect(typeof createSkill).toBe("function");
  });

  it("exports validateSkill function", () => {
    expect(typeof validateSkill).toBe("function");
  });

  it("exports activateSkill function", () => {
    expect(typeof activateSkill).toBe("function");
  });

  it("exports deprecateSkill function", () => {
    expect(typeof deprecateSkill).toBe("function");
  });

  it("exports getSkill function", () => {
    expect(typeof getSkill).toBe("function");
  });

  it("exports listSkills function", () => {
    expect(typeof listSkills).toBe("function");
  });

  it("exports publishNewVersion function", () => {
    expect(typeof publishNewVersion).toBe("function");
  });
});

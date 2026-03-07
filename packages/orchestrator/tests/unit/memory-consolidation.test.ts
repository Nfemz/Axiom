import { describe, it, expect } from "vitest";
import {
  consolidateMemories,
  pruneOutdatedMemories,
  generateReflection,
} from "../../src/memory/consolidation.js";

describe("Memory Consolidation", () => {
  it("exports consolidateMemories function", () => {
    expect(typeof consolidateMemories).toBe("function");
  });

  it("exports pruneOutdatedMemories function", () => {
    expect(typeof pruneOutdatedMemories).toBe("function");
  });

  it("exports generateReflection function", () => {
    expect(typeof generateReflection).toBe("function");
  });
});

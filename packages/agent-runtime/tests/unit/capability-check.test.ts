import { describe, expect, it } from "vitest";
import { assessCapabilities } from "../../src/loop/capability-check.js";
import type { ToolDefinition } from "../../src/tools/registry.js";
import { ToolRegistry } from "../../src/tools/registry.js";

function mockTool(name: string): ToolDefinition {
  return {
    name,
    description: `Mock ${name} tool`,
    tier: "api",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ success: true, output: `${name} output` }),
  };
}

describe("assessCapabilities", () => {
  it("returns sufficient=true when all capabilities have matching tools", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));
    registry.register(mockTool("type"));
    registry.register(mockTool("scroll"));

    const assessment = assessCapabilities(registry, [
      "click",
      "type",
      "scroll",
    ]);

    expect(assessment.sufficient).toBe(true);
    expect(assessment.missingCapabilities).toEqual([]);
  });

  it("returns sufficient=false with missing capabilities listed", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));

    const assessment = assessCapabilities(registry, [
      "click",
      "type",
      "scroll",
    ]);

    expect(assessment.sufficient).toBe(false);
    expect(assessment.missingCapabilities).toContain("type");
    expect(assessment.missingCapabilities).toContain("scroll");
    expect(assessment.missingCapabilities).toHaveLength(2);
  });

  it("returns empty missingCapabilities when all are present", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("navigate"));

    const assessment = assessCapabilities(registry, ["navigate"]);

    expect(assessment.missingCapabilities).toEqual([]);
  });

  it("handles empty required capabilities list as sufficient", () => {
    const registry = new ToolRegistry();

    const assessment = assessCapabilities(registry, []);

    expect(assessment.sufficient).toBe(true);
    expect(assessment.missingCapabilities).toEqual([]);
  });

  it("generates a justification string", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));

    const sufficientAssessment = assessCapabilities(registry, ["click"]);
    expect(sufficientAssessment.justification).toBeTypeOf("string");
    expect(sufficientAssessment.justification.length).toBeGreaterThan(0);

    const insufficientAssessment = assessCapabilities(registry, [
      "click",
      "missing-tool",
    ]);
    expect(insufficientAssessment.justification).toBeTypeOf("string");
    expect(insufficientAssessment.justification).toContain("missing-tool");
  });
});

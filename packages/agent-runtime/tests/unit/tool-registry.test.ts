import { describe, expect, it } from "vitest";
import { type ToolDefinition, ToolRegistry } from "../../src/tools/registry.js";

function mockTool(
  name: string,
  tier: "api" | "headless" | "pixel" = "api"
): ToolDefinition {
  return {
    name,
    description: `Mock ${name} tool`,
    tier,
    inputSchema: { type: "object", properties: { input: { type: "string" } } },
    execute: async () => ({ success: true, output: `${name} output` }),
  };
}

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();
    const tool = mockTool("click");

    registry.register(tool);

    const retrieved = registry.get("click");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("click");
    expect(retrieved?.tier).toBe("api");
  });

  it("returns undefined for an unregistered tool", () => {
    const registry = new ToolRegistry();

    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("lists all registered tools", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));
    registry.register(mockTool("type"));
    registry.register(mockTool("scroll"));

    const tools = registry.list();
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual(["click", "type", "scroll"]);
  });

  it("listByTier filters correctly", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("api-click", "api"));
    registry.register(mockTool("headless-click", "headless"));
    registry.register(mockTool("pixel-click", "pixel"));
    registry.register(mockTool("api-type", "api"));

    const apiTools = registry.listByTier("api");
    expect(apiTools).toHaveLength(2);
    expect(apiTools.every((t) => t.tier === "api")).toBe(true);

    const headlessTools = registry.listByTier("headless");
    expect(headlessTools).toHaveLength(1);
    expect(headlessTools[0].name).toBe("headless-click");

    const pixelTools = registry.listByTier("pixel");
    expect(pixelTools).toHaveLength(1);
    expect(pixelTools[0].name).toBe("pixel-click");
  });

  it("execute calls the tool and returns a result", async () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));

    const result = await registry.execute("click", { input: "button" });

    expect(result.success).toBe(true);
    expect(result.output).toBe("click output");
    expect(result.duration).toBeTypeOf("number");
  });

  it("execute returns an error result for an unknown tool", async () => {
    const registry = new ToolRegistry();

    const result = await registry.execute("nonexistent", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("nonexistent");
    expect(result.output).toBeNull();
  });

  it("execute catches tool errors and wraps them in ToolResult", async () => {
    const registry = new ToolRegistry();
    const failingTool: ToolDefinition = {
      ...mockTool("failing"),
      execute: async () => {
        throw new Error("Tool crashed");
      },
    };
    registry.register(failingTool);

    const result = await registry.execute("failing", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Tool crashed");
    expect(result.output).toBeNull();
    expect(result.duration).toBeTypeOf("number");
  });

  it("getToolDefinitions returns Vercel AI SDK compatible format", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("click"));
    registry.register(mockTool("type"));

    const definitions = registry.getToolDefinitions();

    expect(definitions).toHaveLength(2);
    for (const def of definitions) {
      expect(def).toHaveProperty("name");
      expect(def).toHaveProperty("description");
      expect(def).toHaveProperty("parameters");
      expect(def.parameters).toEqual({
        type: "object",
        properties: { input: { type: "string" } },
      });
    }
    expect(definitions[0].name).toBe("click");
    expect(definitions[1].name).toBe("type");
  });
});

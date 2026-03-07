import { describe, it, expect } from "vitest";
import {
  ToolTier,
  TIER_PRIORITY,
  selectBestTool,
  shouldEscalateTier,
  getNextTier,
} from "../../src/tools/tiering.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import type { ToolDefinition } from "../../src/tools/registry.js";

function mockTool(
  name: string,
  tier: "api" | "headless" | "pixel" = "api",
): ToolDefinition {
  return {
    name,
    description: `Mock ${name} tool`,
    tier,
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ success: true, output: `${name} output` }),
  };
}

describe("Tool Tiering", () => {
  describe("TIER_PRIORITY", () => {
    it("is ordered as api, headless, pixel", () => {
      expect(TIER_PRIORITY).toEqual(["api", "headless", "pixel"]);
    });
  });

  describe("selectBestTool", () => {
    it("returns api-tier tool when available", () => {
      const registry = new ToolRegistry();
      registry.register(mockTool("click-api", "api"));
      registry.register(mockTool("click-headless", "headless"));

      const best = selectBestTool(registry, "click");

      expect(best).not.toBeNull();
      expect(best!.tier).toBe("api");
      expect(best!.name).toBe("click-api");
    });

    it("falls back to headless when no api tool matches", () => {
      const registry = new ToolRegistry();
      registry.register(mockTool("type-api", "api"));
      registry.register(mockTool("click-headless", "headless"));

      const best = selectBestTool(registry, "click");

      expect(best).not.toBeNull();
      expect(best!.tier).toBe("headless");
      expect(best!.name).toBe("click-headless");
    });

    it("returns null when no tools match the capability", () => {
      const registry = new ToolRegistry();
      registry.register(mockTool("type-api", "api"));
      registry.register(mockTool("scroll-headless", "headless"));

      const best = selectBestTool(registry, "click");

      expect(best).toBeNull();
    });
  });

  describe("shouldEscalateTier", () => {
    it("returns true on failure with a lower tier available", () => {
      const result = shouldEscalateTier("api", {
        success: false,
        output: null,
        error: "API failed",
      });

      expect(result).toBe(true);
    });

    it("returns false on success", () => {
      const result = shouldEscalateTier("api", {
        success: true,
        output: "done",
      });

      expect(result).toBe(false);
    });

    it("returns false when already at the highest tier (pixel)", () => {
      const result = shouldEscalateTier("pixel", {
        success: false,
        output: null,
        error: "Pixel failed",
      });

      expect(result).toBe(false);
    });
  });

  describe("getNextTier", () => {
    it("returns headless for api", () => {
      expect(getNextTier("api")).toBe("headless");
    });

    it("returns pixel for headless", () => {
      expect(getNextTier("headless")).toBe("pixel");
    });

    it("returns null for pixel (already highest)", () => {
      expect(getNextTier("pixel")).toBeNull();
    });

    it("returns null for an unknown tier", () => {
      expect(getNextTier("unknown")).toBeNull();
    });
  });
});

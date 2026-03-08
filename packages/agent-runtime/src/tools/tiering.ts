import type { ToolDefinition, ToolRegistry, ToolResult } from "./registry.js";

export const ToolTier = {
  Api: "api",
  Headless: "headless",
  Pixel: "pixel",
} as const;

export type ToolTierValue = (typeof ToolTier)[keyof typeof ToolTier];

export const TIER_PRIORITY: ToolTierValue[] = ["api", "headless", "pixel"];

export function selectBestTool(
  registry: ToolRegistry,
  capability: string
): ToolDefinition | null {
  for (const tier of TIER_PRIORITY) {
    const tools = registry.listByTier(tier);
    const match = tools.find((tool) => tool.name.includes(capability));

    if (match) {
      return match;
    }
  }

  return null;
}

export function shouldEscalateTier(
  currentTier: string,
  result: ToolResult
): boolean {
  if (result.success) {
    return false;
  }

  const nextTier = getNextTier(currentTier);
  return nextTier !== null;
}

export function getNextTier(currentTier: string): string | null {
  const currentIndex = TIER_PRIORITY.indexOf(currentTier as ToolTierValue);

  if (currentIndex === -1) {
    return null;
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex >= TIER_PRIORITY.length) {
    return null;
  }

  return TIER_PRIORITY[nextIndex];
}

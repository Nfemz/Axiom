import { describe, it, expect } from "vitest";
import {
  decomposeGoal,
  type GoalContext,
  type DecomposedGoal,
} from "../../src/agents/goal-decomposition.js";

function makeContext(overrides: Partial<GoalContext> = {}): GoalContext {
  return {
    availableDefinitions: ["general", "browser", "coder"],
    parentBudget: 10.0,
    existingAgents: [],
    ...overrides,
  };
}

describe("decomposeGoal", () => {
  it("returns a DecomposedGoal with at least one subGoal", async () => {
    const result = await decomposeGoal("Build a landing page", makeContext());

    expect(result.subGoals).toBeDefined();
    expect(result.subGoals.length).toBeGreaterThanOrEqual(1);
  });

  it("subGoal contains the original goal text", async () => {
    const goal = "Deploy the application to production";
    const result = await decomposeGoal(goal, makeContext());

    const goalTexts = result.subGoals.map((sg) => sg.goal);
    expect(goalTexts).toContain(goal);
  });

  it("totalEstimatedBudget is positive", async () => {
    const result = await decomposeGoal(
      "Write unit tests",
      makeContext({ parentBudget: 5.0 }),
    );

    expect(result.totalEstimatedBudget).toBeGreaterThan(0);
  });

  it("executionStrategy is one of the valid values", async () => {
    const result = await decomposeGoal("Refactor codebase", makeContext());

    expect(["parallel", "sequential", "mixed"]).toContain(
      result.executionStrategy,
    );
  });

  it("handles empty context gracefully", async () => {
    const emptyContext: GoalContext = {
      availableDefinitions: [],
      parentBudget: 1.0,
      existingAgents: [],
    };

    const result = await decomposeGoal("Simple task", emptyContext);

    expect(result.subGoals.length).toBeGreaterThanOrEqual(1);
    expect(result.totalEstimatedBudget).toBeGreaterThan(0);
  });
});

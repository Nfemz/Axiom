// ---------------------------------------------------------------------------
// Axiom Orchestrator – Goal Decomposition (FR-013)
// ---------------------------------------------------------------------------
// LLM-powered task breakdown that splits a high-level goal into sub-goals
// with dependency ordering, agent type suggestions, and budget estimates.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";

const log = createLogger("goal-decomposition");

// ── Types ───────────────────────────────────────────────────────────────────

export interface GoalContext {
  availableDefinitions: string[];
  parentBudget: number;
  existingAgents: Array<{
    name: string;
    status: string;
    currentTask?: string;
  }>;
}

export interface DecomposedGoal {
  subGoals: Array<{
    goal: string;
    agentType: string;
    priority: number;
    dependencies: number[];
    estimatedBudget: number;
  }>;
  totalEstimatedBudget: number;
  executionStrategy: "parallel" | "sequential" | "mixed";
}

// ── Decomposition ───────────────────────────────────────────────────────────

/**
 * Decomposes a high-level goal into actionable sub-goals.
 *
 * PLACEHOLDER: Returns the original goal as a single sub-goal.
 * Will be replaced with an LLM call once Vercel AI SDK is wired in.
 */
export async function decomposeGoal(
  goal: string,
  context: GoalContext,
): Promise<DecomposedGoal> {
  log.info("Decomposing goal", {
    goal,
    availableDefinitions: context.availableDefinitions.length,
    parentBudget: context.parentBudget,
    existingAgents: context.existingAgents.length,
  });

  const agentType =
    context.availableDefinitions[0] ?? "general";

  const decomposed: DecomposedGoal = {
    subGoals: [
      {
        goal,
        agentType,
        priority: 1,
        dependencies: [],
        estimatedBudget: context.parentBudget,
      },
    ],
    totalEstimatedBudget: context.parentBudget,
    executionStrategy: "sequential",
  };

  log.info("Goal decomposed (placeholder)", {
    subGoalCount: decomposed.subGoals.length,
    strategy: decomposed.executionStrategy,
    totalEstimatedBudget: decomposed.totalEstimatedBudget,
  });

  return decomposed;
}

// ---------------------------------------------------------------------------
// Axiom Orchestrator – Goal Decomposition (FR-013)
// ---------------------------------------------------------------------------
// LLM-powered task breakdown that splits a high-level goal into sub-goals
// with dependency ordering, agent type suggestions, and budget estimates.
// ---------------------------------------------------------------------------

import { createOpenAI } from "@ai-sdk/openai";
import { createLogger } from "@axiom/shared";
import { generateObject } from "ai";
import { z } from "zod";

const log = createLogger("goal-decomposition");

// ── Types ───────────────────────────────────────────────────────────────────

export interface GoalContext {
  availableDefinitions: string[];
  existingAgents: Array<{
    name: string;
    status: string;
    currentTask?: string;
  }>;
  parentBudget: number;
}

export interface DecomposedGoal {
  executionStrategy: "parallel" | "sequential" | "mixed";
  subGoals: Array<{
    goal: string;
    agentType: string;
    priority: number;
    dependencies: number[];
    estimatedBudget: number;
  }>;
  totalEstimatedBudget: number;
}

// ── Decomposition ───────────────────────────────────────────────────────────

const subGoalSchema = z.object({
  subGoals: z.array(
    z.object({
      goal: z.string(),
      agentType: z.string(),
      priority: z.number(),
      dependencies: z.array(z.number()),
      estimatedBudget: z.number(),
    })
  ),
  totalEstimatedBudget: z.number(),
  executionStrategy: z.enum(["parallel", "sequential", "mixed"]),
});

export async function decomposeGoal(
  goal: string,
  context: GoalContext
): Promise<DecomposedGoal> {
  log.info("Decomposing goal via LLM", {
    goal,
    availableDefinitions: context.availableDefinitions.length,
    parentBudget: context.parentBudget,
  });

  try {
    const provider = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });

    const { object } = await generateObject({
      model: provider("gpt-4o-mini"),
      schema: subGoalSchema,
      prompt: `You are a task decomposition engine for an autonomous agent orchestrator.

Available agent types: ${context.availableDefinitions.join(", ") || "general"}
Total budget: $${context.parentBudget}
Currently running agents: ${context.existingAgents.map((a) => `${a.name} (${a.status}): ${a.currentTask ?? "idle"}`).join(", ") || "none"}

Decompose this goal into actionable sub-goals:
"${goal}"

Rules:
- Each sub-goal should be achievable by a single agent
- Budget estimates must sum to <= total budget
- Use dependency indices (0-based) to express ordering
- Choose the simplest execution strategy that works`,
    });

    log.info("Goal decomposed via LLM", {
      subGoalCount: object.subGoals.length,
      strategy: object.executionStrategy,
      totalEstimatedBudget: object.totalEstimatedBudget,
    });

    return object;
  } catch (err) {
    log.warn("LLM decomposition failed, falling back to single-goal", {
      error: err instanceof Error ? err.message : String(err),
    });

    const agentType = context.availableDefinitions[0] ?? "general";
    return {
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
  }
}

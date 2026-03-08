import { describe, expect, it } from "vitest";
import {
  type CognitiveSnapshot,
  generateHandoffPrompt,
} from "../../src/agents/checkpoints.js";

function createSnapshot(
  overrides: Partial<CognitiveSnapshot> = {}
): CognitiveSnapshot {
  return {
    currentGoal: "Complete the integration tests",
    progressState: {
      phase: "implementation",
      completedSteps: 3,
      totalSteps: 5,
      summary: "Core logic done, wiring up handlers",
    },
    decisionLog: [
      {
        decision: "Use WebSocket over polling",
        reasoning: "Lower latency for real-time updates",
        timestamp: "2026-03-07T10:00:00Z",
      },
    ],
    pendingActions: [
      { action: "Wire up event handlers", priority: 2 },
      { action: "Add error boundary", priority: 1 },
    ],
    workingArtifacts: [
      {
        name: "handler.ts",
        path: "/src/handlers/handler.ts",
        type: "source",
      },
    ],
    ...overrides,
  };
}

describe("generateHandoffPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = generateHandoffPrompt(createSnapshot());
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes the current goal", () => {
    const snapshot = createSnapshot({
      currentGoal: "Deploy the notification service",
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("Deploy the notification service");
  });

  it("includes progress state information", () => {
    const snapshot = createSnapshot({
      progressState: {
        phase: "testing",
        completedSteps: 7,
        totalSteps: 10,
        summary: "Unit tests passing, integration tests next",
      },
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("testing");
  });

  it("includes decision log entries", () => {
    const snapshot = createSnapshot({
      decisionLog: [
        {
          decision: "Switched to Redis Streams",
          reasoning: "Better fan-out support",
          timestamp: "2026-03-07T12:00:00Z",
        },
        {
          decision: "Added circuit breaker",
          reasoning: "Prevent cascade failures",
          timestamp: "2026-03-07T13:00:00Z",
        },
      ],
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("Switched to Redis Streams");
    expect(prompt).toContain("Added circuit breaker");
  });

  it("includes pending actions", () => {
    const snapshot = createSnapshot({
      pendingActions: [
        { action: "Run migration script", priority: 3 },
        { action: "Update config", priority: 1 },
      ],
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("Run migration script");
    expect(prompt).toContain("Update config");
  });

  it("includes working artifacts", () => {
    const snapshot = createSnapshot({
      workingArtifacts: [
        {
          name: "schema.sql",
          path: "/drizzle/schema.sql",
          type: "migration",
        },
      ],
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("schema.sql");
  });

  it("handles empty arrays gracefully", () => {
    const snapshot = createSnapshot({
      decisionLog: [],
      pendingActions: [],
      workingArtifacts: [],
    });
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
  });

  it("handles minimal snapshot with empty fields", () => {
    const snapshot: CognitiveSnapshot = {
      currentGoal: "Minimal goal",
      progressState: {},
      decisionLog: [],
      pendingActions: [],
      workingArtifacts: [],
    };
    const prompt = generateHandoffPrompt(snapshot);
    expect(prompt).toContain("Minimal goal");
  });
});

import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  AgentToOrchestratorSchema,
  OrchestratorToAgentSchema,
  SpawnAgentRequestSchema,
  CreateDefinitionRequestSchema,
} from "../src/schemas/index.js";
import {
  AgentStatus,
  MemoryType,
  SkillStatus,
  AlertSeverity,
  IdentityType,
  SecretType,
  PipelineStatus,
  TransactionType,
  AuditOutcome,
  SessionStatus,
  KnowledgeEntryType,
  IdentityStatus,
} from "../src/types/enums.js";
import { VALID_STATUS_TRANSITIONS } from "../src/constants/defaults.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uuid = () => randomUUID();

// ---------------------------------------------------------------------------
// AgentToOrchestratorSchema
// ---------------------------------------------------------------------------
describe("AgentToOrchestratorSchema", () => {
  it("validates a progress message", () => {
    const msg = {
      type: "progress",
      agentId: uuid(),
      progress: 42,
      task: "downloading assets",
    };
    expect(AgentToOrchestratorSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a decision-request message", () => {
    const msg = {
      type: "decision-request",
      agentId: uuid(),
      question: "Which API to use?",
      options: ["REST", "GraphQL"],
      context: { extra: true },
    };
    expect(AgentToOrchestratorSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates an error message", () => {
    const msg = {
      type: "error",
      agentId: uuid(),
      error: "OOM",
      recoverable: false,
    };
    expect(AgentToOrchestratorSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a heartbeat message", () => {
    const msg = {
      type: "heartbeat",
      agentId: uuid(),
      resourceUsage: {
        cpuPercent: 55.2,
        memoryMb: 1024,
        llmSpendRate: 0.03,
      },
    };
    expect(AgentToOrchestratorSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a complete message", () => {
    const msg = {
      type: "complete",
      agentId: uuid(),
      result: { summary: "done" },
      artifacts: ["file1.txt", "file2.txt"],
    };
    expect(AgentToOrchestratorSchema.parse(msg)).toMatchObject(msg);
  });

  it("rejects a message with missing required fields", () => {
    const msg = { type: "progress", agentId: uuid() }; // missing progress, task
    expect(() => AgentToOrchestratorSchema.parse(msg)).toThrow();
  });

  it("rejects a message with invalid type discriminator", () => {
    const msg = {
      type: "unknown-type",
      agentId: uuid(),
    };
    expect(() => AgentToOrchestratorSchema.parse(msg)).toThrow();
  });

  it("rejects progress outside 0-100 range", () => {
    const msg = {
      type: "progress",
      agentId: uuid(),
      progress: 150,
      task: "overachieving",
    };
    expect(() => AgentToOrchestratorSchema.parse(msg)).toThrow();
  });

  it("rejects a message with invalid agentId (not a UUID)", () => {
    const msg = {
      type: "error",
      agentId: "not-a-uuid",
      error: "something broke",
      recoverable: true,
    };
    expect(() => AgentToOrchestratorSchema.parse(msg)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// OrchestratorToAgentSchema
// ---------------------------------------------------------------------------
describe("OrchestratorToAgentSchema", () => {
  it("validates a resteer command", () => {
    const msg = { type: "resteer", directive: "focus on auth", priority: 1 };
    expect(OrchestratorToAgentSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a pause command", () => {
    const msg = { type: "pause" };
    expect(OrchestratorToAgentSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a terminate command", () => {
    const msg = { type: "terminate", reason: "budget exceeded", graceful: true };
    expect(OrchestratorToAgentSchema.parse(msg)).toMatchObject(msg);
  });

  it("validates a resume command", () => {
    const msg = { type: "resume" };
    expect(OrchestratorToAgentSchema.parse(msg)).toMatchObject(msg);
  });

  it("rejects terminate without required fields", () => {
    const msg = { type: "terminate" }; // missing reason, graceful
    expect(() => OrchestratorToAgentSchema.parse(msg)).toThrow();
  });

  it("rejects unknown type", () => {
    const msg = { type: "explode" };
    expect(() => OrchestratorToAgentSchema.parse(msg)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SpawnAgentRequestSchema
// ---------------------------------------------------------------------------
describe("SpawnAgentRequestSchema", () => {
  it("validates a minimal spawn request", () => {
    const req = {
      definitionId: uuid(),
      goal: "generate report",
    };
    const parsed = SpawnAgentRequestSchema.parse(req);
    expect(parsed.definitionId).toBe(req.definitionId);
    expect(parsed.goal).toBe(req.goal);
    expect(parsed.parentId).toBeUndefined();
    expect(parsed.budget).toBeUndefined();
  });

  it("validates a full spawn request with all optional fields", () => {
    const req = {
      definitionId: uuid(),
      parentId: uuid(),
      goal: "generate report",
      budget: 50,
      modelOverride: { provider: "openai", modelId: "gpt-4o" },
    };
    const parsed = SpawnAgentRequestSchema.parse(req);
    expect(parsed).toMatchObject(req);
  });

  it("rejects empty goal", () => {
    const req = { definitionId: uuid(), goal: "" };
    expect(() => SpawnAgentRequestSchema.parse(req)).toThrow();
  });

  it("rejects negative budget", () => {
    const req = { definitionId: uuid(), goal: "test", budget: -10 };
    expect(() => SpawnAgentRequestSchema.parse(req)).toThrow();
  });

  it("rejects non-UUID definitionId", () => {
    const req = { definitionId: "abc", goal: "test" };
    expect(() => SpawnAgentRequestSchema.parse(req)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateDefinitionRequestSchema – defaults
// ---------------------------------------------------------------------------
describe("CreateDefinitionRequestSchema", () => {
  it("applies defaults for optional fields", () => {
    const req = {
      name: "scraper",
      mission: "scrape websites",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      defaultBudget: 100,
    };
    const parsed = CreateDefinitionRequestSchema.parse(req);

    // Top-level defaults
    expect(parsed.capabilities).toEqual({});
    expect(parsed.tools).toEqual({});
    expect(parsed.approvalPolicies).toEqual({});

    // Retry policy defaults
    expect(parsed.retryPolicy.maxRetries).toBe(3);
    expect(parsed.retryPolicy.backoffType).toBe("exponential");
    expect(parsed.retryPolicy.backoffDelay).toBe(1000);

    // Heartbeat config defaults
    expect(parsed.heartbeatConfig.timeoutMs).toBe(300000);
    expect(parsed.heartbeatConfig.resourceThresholds).toEqual({});
    expect(parsed.heartbeatConfig.llmCheckInterval).toBe(600000);
  });

  it("allows overriding defaults", () => {
    const req = {
      name: "scraper",
      mission: "scrape websites",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      defaultBudget: 100,
      retryPolicy: {
        maxRetries: 5,
        backoffType: "linear" as const,
        backoffDelay: 2000,
      },
    };
    const parsed = CreateDefinitionRequestSchema.parse(req);
    expect(parsed.retryPolicy.maxRetries).toBe(5);
    expect(parsed.retryPolicy.backoffType).toBe("linear");
    expect(parsed.retryPolicy.backoffDelay).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// VALID_STATUS_TRANSITIONS
// ---------------------------------------------------------------------------
describe("VALID_STATUS_TRANSITIONS", () => {
  it("has an entry for every AgentStatus value", () => {
    const allStatuses = Object.values(AgentStatus);
    for (const status of allStatuses) {
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("spawning can transition to running, error, terminated", () => {
    const transitions = VALID_STATUS_TRANSITIONS[AgentStatus.Spawning];
    expect(transitions).toContain(AgentStatus.Running);
    expect(transitions).toContain(AgentStatus.Error);
    expect(transitions).toContain(AgentStatus.Terminated);
    expect(transitions).toHaveLength(3);
  });

  it("running can transition to paused, suspended, error, terminated", () => {
    const transitions = VALID_STATUS_TRANSITIONS[AgentStatus.Running];
    expect(transitions).toContain(AgentStatus.Paused);
    expect(transitions).toContain(AgentStatus.Suspended);
    expect(transitions).toContain(AgentStatus.Error);
    expect(transitions).toContain(AgentStatus.Terminated);
    expect(transitions).toHaveLength(4);
  });

  it("terminated has no outgoing transitions", () => {
    expect(VALID_STATUS_TRANSITIONS[AgentStatus.Terminated]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Enum exhaustiveness
// ---------------------------------------------------------------------------
describe("Enum exhaustiveness", () => {
  it("AgentStatus has all expected values", () => {
    const values = Object.values(AgentStatus);
    expect(values).toEqual(
      expect.arrayContaining([
        "spawning", "running", "paused", "suspended", "error", "terminated",
      ]),
    );
    expect(values).toHaveLength(6);
  });

  it("MemoryType has all expected values", () => {
    const values = Object.values(MemoryType);
    expect(values).toEqual(
      expect.arrayContaining([
        "fact", "decision", "preference", "reflection", "consolidation",
      ]),
    );
    expect(values).toHaveLength(5);
  });

  it("SkillStatus has all expected values", () => {
    const values = Object.values(SkillStatus);
    expect(values).toEqual(
      expect.arrayContaining(["draft", "validated", "active", "deprecated"]),
    );
    expect(values).toHaveLength(4);
  });

  it("AlertSeverity has all expected values", () => {
    const values = Object.values(AlertSeverity);
    expect(values).toEqual(
      expect.arrayContaining(["info", "warning", "critical"]),
    );
    expect(values).toHaveLength(3);
  });

  it("IdentityType has all expected values", () => {
    const values = Object.values(IdentityType);
    expect(values).toEqual(
      expect.arrayContaining(["email", "phone", "voice", "service_account"]),
    );
    expect(values).toHaveLength(4);
  });

  it("SecretType has all expected values", () => {
    const values = Object.values(SecretType);
    expect(values).toEqual(
      expect.arrayContaining(["api_key", "credential", "payment_method", "oauth_token"]),
    );
    expect(values).toHaveLength(4);
  });

  it("PipelineStatus has all expected values", () => {
    const values = Object.values(PipelineStatus);
    expect(values).toEqual(
      expect.arrayContaining(["planned", "active", "paused", "completed", "failed"]),
    );
    expect(values).toHaveLength(5);
  });

  it("TransactionType has all expected values", () => {
    const values = Object.values(TransactionType);
    expect(values).toEqual(
      expect.arrayContaining(["expense", "revenue", "split_operator", "split_reinvestment"]),
    );
    expect(values).toHaveLength(4);
  });

  it("AuditOutcome has all expected values", () => {
    const values = Object.values(AuditOutcome);
    expect(values).toEqual(
      expect.arrayContaining(["success", "failure", "blocked", "pending"]),
    );
    expect(values).toHaveLength(4);
  });

  it("SessionStatus has all expected values", () => {
    const values = Object.values(SessionStatus);
    expect(values).toEqual(
      expect.arrayContaining(["active", "compacted", "ended"]),
    );
    expect(values).toHaveLength(3);
  });

  it("KnowledgeEntryType has all expected values", () => {
    const values = Object.values(KnowledgeEntryType);
    expect(values).toEqual(
      expect.arrayContaining([
        "resolution", "pattern", "strategy", "insight", "tool_integration",
      ]),
    );
    expect(values).toHaveLength(5);
  });

  it("IdentityStatus has all expected values", () => {
    const values = Object.values(IdentityStatus);
    expect(values).toEqual(
      expect.arrayContaining(["active", "revoked"]),
    );
    expect(values).toHaveLength(2);
  });
});

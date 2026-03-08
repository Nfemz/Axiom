import { z } from "zod";

// Agent → Orchestrator message types
export const ProgressMessageSchema = z.object({
  type: z.literal("progress"),
  agentId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  task: z.string(),
});

export const DecisionRequestSchema = z.object({
  type: z.literal("decision-request"),
  agentId: z.string().uuid(),
  question: z.string(),
  options: z.array(z.string()),
  context: z.unknown(),
});

export const EscalationSchema = z.object({
  type: z.literal("escalation"),
  agentId: z.string().uuid(),
  reason: z.string(),
  severity: z.enum(["warning", "critical"]),
});

export const BudgetRequestSchema = z.object({
  type: z.literal("budget-request"),
  agentId: z.string().uuid(),
  amount: z.number().positive(),
  justification: z.string(),
});

export const CapabilityUpgradeSchema = z.object({
  type: z.literal("capability-upgrade"),
  agentId: z.string().uuid(),
  requested: z.array(z.string()),
  justification: z.string(),
});

export const ConflictReportSchema = z.object({
  type: z.literal("conflict-report"),
  agentId: z.string().uuid(),
  conflictWith: z.string(),
  resource: z.string(),
});

export const KnowledgePublishSchema = z.object({
  type: z.literal("knowledge-publish"),
  agentId: z.string().uuid(),
  entry: z.object({
    content: z.string(),
    entryType: z.enum([
      "resolution",
      "pattern",
      "strategy",
      "insight",
      "tool_integration",
    ]),
    tags: z.array(z.string()),
    category: z.string(),
    importanceScore: z.number().min(0).max(1),
  }),
});

export const SkillPublishSchema = z.object({
  type: z.literal("skill-publish"),
  agentId: z.string().uuid(),
  skill: z.object({
    name: z.string(),
    triggerCondition: z.string(),
    inputs: z.record(z.string(), z.unknown()),
    outputs: z.record(z.string(), z.unknown()),
    steps: z.array(z.record(z.string(), z.unknown())),
    successCriteria: z.string(),
    failureCriteria: z.string(),
  }),
});

export const CompleteMessageSchema = z.object({
  type: z.literal("complete"),
  agentId: z.string().uuid(),
  result: z.unknown(),
  artifacts: z.array(z.string()),
});

export const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  agentId: z.string().uuid(),
  error: z.string(),
  recoverable: z.boolean(),
});

export const HeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  agentId: z.string().uuid(),
  resourceUsage: z.object({
    cpuPercent: z.number(),
    memoryMb: z.number(),
    llmSpendRate: z.number(),
  }),
});

export const AgentToOrchestratorSchema = z.discriminatedUnion("type", [
  ProgressMessageSchema,
  DecisionRequestSchema,
  EscalationSchema,
  BudgetRequestSchema,
  CapabilityUpgradeSchema,
  ConflictReportSchema,
  KnowledgePublishSchema,
  SkillPublishSchema,
  CompleteMessageSchema,
  ErrorMessageSchema,
  HeartbeatMessageSchema,
]);

export type AgentToOrchestrator = z.infer<typeof AgentToOrchestratorSchema>;

// Orchestrator → Agent message types
export const ResteerCommandSchema = z.object({
  type: z.literal("resteer"),
  directive: z.string(),
  priority: z.number(),
});

export const DecisionResponseSchema = z.object({
  type: z.literal("decision-response"),
  requestId: z.string(),
  decision: z.string(),
});

export const BudgetApprovedSchema = z.object({
  type: z.literal("budget-approved"),
  amount: z.number().positive(),
});

export const BudgetDeniedSchema = z.object({
  type: z.literal("budget-denied"),
  reason: z.string(),
});

export const CapabilityApprovedSchema = z.object({
  type: z.literal("capability-approved"),
  capabilities: z.array(z.string()),
});

export const CapabilityDeniedSchema = z.object({
  type: z.literal("capability-denied"),
  reason: z.string(),
});

export const PauseCommandSchema = z.object({
  type: z.literal("pause"),
});

export const ResumeCommandSchema = z.object({
  type: z.literal("resume"),
});

export const TerminateCommandSchema = z.object({
  type: z.literal("terminate"),
  reason: z.string(),
  graceful: z.boolean(),
});

export const IntegrityCheckSchema = z.object({
  type: z.literal("integrity-check"),
  expectedChecksum: z.string(),
});

export const OrchestratorToAgentSchema = z.discriminatedUnion("type", [
  ResteerCommandSchema,
  DecisionResponseSchema,
  BudgetApprovedSchema,
  BudgetDeniedSchema,
  CapabilityApprovedSchema,
  CapabilityDeniedSchema,
  PauseCommandSchema,
  ResumeCommandSchema,
  TerminateCommandSchema,
  IntegrityCheckSchema,
]);

export type OrchestratorToAgent = z.infer<typeof OrchestratorToAgentSchema>;

// SSE event schema
export const SSEEventSchema = z.object({
  type: z.string(),
  payload: z
    .object({
      id: z.string(),
    })
    .passthrough(),
  timestamp: z.string().datetime(),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

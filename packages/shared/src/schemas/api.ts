import { z } from "zod";

// Agent spawn request/response
export const SpawnAgentRequestSchema = z.object({
  definitionId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  goal: z.string().min(1),
  budget: z.number().positive().optional(),
  modelOverride: z
    .object({
      provider: z.string(),
      modelId: z.string(),
    })
    .optional(),
});

export type SpawnAgentRequest = z.infer<typeof SpawnAgentRequestSchema>;

export const SpawnAgentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("spawning"),
  sandboxId: z.string(),
  parentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export type SpawnAgentResponse = z.infer<typeof SpawnAgentResponseSchema>;

// Agent control
export const ControlAgentRequestSchema = z.object({
  action: z.enum(["pause", "resume", "terminate", "resteer"]),
  directive: z.string().optional(),
});

export type ControlAgentRequest = z.infer<typeof ControlAgentRequestSchema>;

export const ControlAgentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  updatedAt: z.string().datetime(),
});

export type ControlAgentResponse = z.infer<typeof ControlAgentResponseSchema>;

// Agent definition CRUD
export const CreateDefinitionRequestSchema = z.object({
  name: z.string().min(1).max(255),
  mission: z.string().min(1),
  modelProvider: z.string(),
  modelId: z.string(),
  defaultBudget: z.number().positive(),
  capabilities: z.record(z.string(), z.unknown()).default({}),
  tools: z.record(z.string(), z.unknown()).default({}),
  approvalPolicies: z.record(z.string(), z.unknown()).default({}),
  retryPolicy: z
    .object({
      maxRetries: z.number().int().min(0).default(3),
      backoffType: z.enum(["exponential", "linear"]).default("exponential"),
      backoffDelay: z.number().positive().default(1000),
    })
    .default({ maxRetries: 3, backoffType: "exponential", backoffDelay: 1000 }),
  heartbeatConfig: z
    .object({
      timeoutMs: z.number().positive().default(300_000),
      resourceThresholds: z.record(z.string(), z.number()).default({}),
      llmCheckInterval: z.number().positive().default(600_000),
    })
    .default({
      timeoutMs: 300_000,
      resourceThresholds: {},
      llmCheckInterval: 600_000,
    }),
});

export type CreateDefinitionRequest = z.infer<
  typeof CreateDefinitionRequestSchema
>;

// Secret CRUD
export const CreateSecretRequestSchema = z.object({
  name: z.string().min(1).max(255),
  secretType: z.enum([
    "api_key",
    "credential",
    "payment_method",
    "oauth_token",
  ]),
  value: z.string().min(1),
  allowedAgents: z.array(z.string().uuid()).default([]),
  allowedDomains: z.array(z.string()).default([]),
});

export type CreateSecretRequest = z.infer<typeof CreateSecretRequestSchema>;

export const UpdateSecretRequestSchema = z.object({
  value: z.string().min(1).optional(),
  allowedAgents: z.array(z.string().uuid()).optional(),
  allowedDomains: z.array(z.string()).optional(),
});

export type UpdateSecretRequest = z.infer<typeof UpdateSecretRequestSchema>;

// Pipeline CRUD
export const CreatePipelineRequestSchema = z.object({
  name: z.string().min(1).max(255),
  goal: z.string().min(1),
  stages: z.array(
    z.object({
      name: z.string(),
      completionCriteria: z.string(),
    })
  ),
  budgetTotal: z.number().positive(),
});

export type CreatePipelineRequest = z.infer<typeof CreatePipelineRequestSchema>;

export const UpdatePipelineRequestSchema = z.object({
  action: z.enum(["pause", "resume"]).optional(),
  budgetTotal: z.number().positive().optional(),
});

export type UpdatePipelineRequest = z.infer<typeof UpdatePipelineRequestSchema>;

// Alert rule CRUD
export const CreateAlertRuleRequestSchema = z.object({
  name: z.string().min(1).max(255),
  condition: z.record(z.string(), z.unknown()),
  severity: z.enum(["info", "warning", "critical"]),
  enabled: z.boolean().default(true),
  notifyDiscord: z.boolean().default(true),
});

export type CreateAlertRuleRequest = z.infer<
  typeof CreateAlertRuleRequestSchema
>;

// System config
export const UpdateSystemConfigRequestSchema = z.object({
  heartbeatIntervalMs: z.number().positive().optional(),
  activeHours: z
    .object({
      start: z.string(),
      end: z.string(),
      timezone: z.string(),
    })
    .optional(),
  revenueSplitOperator: z.number().min(0).max(1).optional(),
  revenueSplitReinvest: z.number().min(0).max(1).optional(),
  backupRetentionDays: z.number().int().positive().optional(),
  discordWebhookUrl: z.string().url().optional(),
});

export type UpdateSystemConfigRequest = z.infer<
  typeof UpdateSystemConfigRequestSchema
>;

// Health endpoint
export const HealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  uptime: z.number(),
  services: z.object({
    orchestrator: z.enum(["up", "down"]),
    redis: z.enum(["up", "down"]),
    postgresql: z.enum(["up", "down"]),
  }),
  agents: z.object({
    total: z.number(),
    running: z.number(),
    paused: z.number(),
    error: z.number(),
  }),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Setup wizard
export const SetupWizardStateSchema = z.object({
  currentStep: z.number(),
  steps: z.array(
    z.object({
      name: z.string(),
      completed: z.boolean(),
    })
  ),
  setupComplete: z.boolean(),
});

export type SetupWizardState = z.infer<typeof SetupWizardStateSchema>;

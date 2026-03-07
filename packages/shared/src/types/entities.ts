import type {
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
} from "./enums.js";

export interface Agent {
  id: string;
  parentId: string | null;
  definitionId: string;
  name: string;
  status: AgentStatus;
  sandboxId: string | null;
  modelProvider: string;
  modelId: string;
  currentTask: string | null;
  budgetTotal: number;
  budgetSpent: number;
  budgetCurrency: string;
  permissions: Record<string, unknown>;
  configChecksum: string | null;
  heartbeatAt: Date | null;
  spawnContext: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDefinition {
  id: string;
  name: string;
  mission: string;
  modelProvider: string;
  modelId: string;
  defaultBudget: number;
  capabilities: Record<string, unknown>;
  tools: Record<string, unknown>;
  approvalPolicies: Record<string, unknown>;
  retryPolicy: RetryPolicy;
  heartbeatConfig: HeartbeatConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffType: "exponential" | "linear";
  backoffDelay: number;
}

export interface HeartbeatConfig {
  timeoutMs: number;
  resourceThresholds: Record<string, number>;
  llmCheckInterval: number;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  content: string;
  embedding: number[] | null;
  importanceScore: number;
  memoryType: MemoryType;
  tags: string[];
  sourceSessionId: string | null;
  createdAt: Date;
  accessedAt: Date;
  consolidatedInto: string | null;
}

export interface AgentSession {
  id: string;
  agentId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: SessionStatus;
  summary: string | null;
}

export interface Checkpoint {
  id: string;
  agentId: string;
  sessionId: string | null;
  currentGoal: string;
  progressState: Record<string, unknown>;
  decisionLog: Record<string, unknown>;
  pendingActions: Record<string, unknown>;
  workingArtifacts: Record<string, unknown>;
  handoffPrompt: string | null;
  createdAt: Date;
}

export interface SharedKnowledgeEntry {
  id: string;
  content: string;
  embedding: number[] | null;
  entryType: KnowledgeEntryType;
  tags: string[];
  category: string;
  contributingAgentId: string | null;
  importanceScore: number;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  version: number;
  triggerCondition: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  steps: Record<string, unknown>[];
  successCriteria: string;
  failureCriteria: string;
  status: SkillStatus;
  authoringAgentId: string | null;
  consecutiveFailures: number;
  invocationCount: number;
  successCount: number;
  knowledgeEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntry {
  id: string;
  agentId: string;
  actionType: string;
  outcome: AuditOutcome;
  details: Record<string, unknown>;
  securityEvent: boolean;
  timestamp: Date;
}

export interface FinancialTransaction {
  id: string;
  agentId: string | null;
  ventureId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  externalRef: string | null;
  preAuthVerified: boolean;
  createdAt: Date;
}

export interface LLMUsageLog {
  id: string;
  agentId: string;
  sessionId: string | null;
  modelProvider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  computedCostUsd: number;
  createdAt: Date;
}

export interface Identity {
  id: string;
  agentId: string;
  identityType: IdentityType;
  provider: string;
  identifier: string;
  credentialsSecretId: string | null;
  status: IdentityStatus;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface Secret {
  id: string;
  name: string;
  secretType: SecretType;
  encryptedValue: Buffer;
  allowedAgents: string[];
  allowedDomains: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Pipeline {
  id: string;
  name: string;
  goal: string;
  stages: PipelineStage[];
  currentStage: number;
  status: PipelineStatus;
  budgetTotal: number;
  budgetSpent: number;
  leadAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  name: string;
  completionCriteria: string;
  status: "pending" | "active" | "completed" | "failed";
}

export interface AlertRule {
  id: string;
  name: string;
  condition: Record<string, unknown>;
  severity: AlertSeverity;
  enabled: boolean;
  notifyDiscord: boolean;
  createdAt: Date;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  agentId: string | null;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export interface OperatorCredential {
  id: string;
  credentialId: Buffer;
  publicKey: Buffer;
  counter: number;
  transports: string | null;
  createdAt: Date;
}

export interface SystemConfig {
  id: number;
  setupComplete: boolean;
  heartbeatIntervalMs: number;
  activeHours: { start: string; end: string; timezone: string };
  revenueSplitOperator: number;
  revenueSplitReinvest: number;
  backupRetentionDays: number;
  discordWebhookUrl: string | null;
  discordBotToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceMetrics {
  cpuPercent: number;
  memoryMb: number;
  llmSpendRate: number;
}

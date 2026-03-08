import type {
  AgentStatus,
  AlertSeverity,
  AuditOutcome,
  IdentityStatus,
  IdentityType,
  KnowledgeEntryType,
  MemoryType,
  PipelineStatus,
  SecretType,
  SessionStatus,
  SkillStatus,
  TransactionType,
} from "./enums.js";

export interface Agent {
  budgetCurrency: string;
  budgetSpent: number;
  budgetTotal: number;
  configChecksum: string | null;
  createdAt: Date;
  currentTask: string | null;
  definitionId: string;
  heartbeatAt: Date | null;
  id: string;
  modelId: string;
  modelProvider: string;
  name: string;
  parentId: string | null;
  permissions: Record<string, unknown>;
  sandboxId: string | null;
  spawnContext: Record<string, unknown> | null;
  status: AgentStatus;
  updatedAt: Date;
}

export interface AgentDefinition {
  approvalPolicies: Record<string, unknown>;
  capabilities: Record<string, unknown>;
  createdAt: Date;
  defaultBudget: number;
  heartbeatConfig: HeartbeatConfig;
  id: string;
  mission: string;
  modelId: string;
  modelProvider: string;
  name: string;
  retryPolicy: RetryPolicy;
  tools: Record<string, unknown>;
  updatedAt: Date;
}

export interface RetryPolicy {
  backoffDelay: number;
  backoffType: "exponential" | "linear";
  maxRetries: number;
}

export interface HeartbeatConfig {
  llmCheckInterval: number;
  resourceThresholds: Record<string, number>;
  timeoutMs: number;
}

export interface AgentMemory {
  accessedAt: Date;
  agentId: string;
  consolidatedInto: string | null;
  content: string;
  createdAt: Date;
  embedding: number[] | null;
  id: string;
  importanceScore: number;
  memoryType: MemoryType;
  sourceSessionId: string | null;
  tags: string[];
}

export interface AgentSession {
  agentId: string;
  endedAt: Date | null;
  id: string;
  startedAt: Date;
  status: SessionStatus;
  summary: string | null;
}

export interface Checkpoint {
  agentId: string;
  createdAt: Date;
  currentGoal: string;
  decisionLog: Record<string, unknown>;
  handoffPrompt: string | null;
  id: string;
  pendingActions: Record<string, unknown>;
  progressState: Record<string, unknown>;
  sessionId: string | null;
  workingArtifacts: Record<string, unknown>;
}

export interface SharedKnowledgeEntry {
  accessCount: number;
  category: string;
  content: string;
  contributingAgentId: string | null;
  createdAt: Date;
  embedding: number[] | null;
  entryType: KnowledgeEntryType;
  id: string;
  importanceScore: number;
  tags: string[];
  updatedAt: Date;
}

export interface Skill {
  authoringAgentId: string | null;
  consecutiveFailures: number;
  createdAt: Date;
  failureCriteria: string;
  id: string;
  inputs: Record<string, unknown>;
  invocationCount: number;
  knowledgeEntryId: string | null;
  name: string;
  outputs: Record<string, unknown>;
  status: SkillStatus;
  steps: Record<string, unknown>[];
  successCount: number;
  successCriteria: string;
  triggerCondition: string;
  updatedAt: Date;
  version: number;
}

export interface AuditLogEntry {
  actionType: string;
  agentId: string;
  details: Record<string, unknown>;
  id: string;
  outcome: AuditOutcome;
  securityEvent: boolean;
  timestamp: Date;
}

export interface FinancialTransaction {
  agentId: string | null;
  amount: number;
  category: string;
  createdAt: Date;
  currency: string;
  description: string | null;
  externalRef: string | null;
  id: string;
  preAuthVerified: boolean;
  type: TransactionType;
  ventureId: string | null;
}

export interface LLMUsageLog {
  agentId: string;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  computedCostUsd: number;
  createdAt: Date;
  id: string;
  inputTokens: number;
  modelId: string;
  modelProvider: string;
  outputTokens: number;
  sessionId: string | null;
}

export interface Identity {
  agentId: string;
  createdAt: Date;
  credentialsSecretId: string | null;
  id: string;
  identifier: string;
  identityType: IdentityType;
  provider: string;
  revokedAt: Date | null;
  status: IdentityStatus;
}

export interface Secret {
  allowedAgents: string[];
  allowedDomains: string[];
  createdAt: Date;
  encryptedValue: Buffer;
  id: string;
  name: string;
  secretType: SecretType;
  updatedAt: Date;
}

export interface Pipeline {
  budgetSpent: number;
  budgetTotal: number;
  createdAt: Date;
  currentStage: number;
  goal: string;
  id: string;
  leadAgentId: string | null;
  name: string;
  stages: PipelineStage[];
  status: PipelineStatus;
  updatedAt: Date;
}

export interface PipelineStage {
  completionCriteria: string;
  name: string;
  status: "pending" | "active" | "completed" | "failed";
}

export interface AlertRule {
  condition: Record<string, unknown>;
  createdAt: Date;
  enabled: boolean;
  id: string;
  name: string;
  notifyDiscord: boolean;
  severity: AlertSeverity;
}

export interface AlertEvent {
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  agentId: string | null;
  createdAt: Date;
  id: string;
  message: string;
  ruleId: string;
  severity: AlertSeverity;
}

export interface OperatorCredential {
  counter: number;
  createdAt: Date;
  credentialId: Buffer;
  id: string;
  publicKey: Buffer;
  transports: string | null;
}

export interface SystemConfig {
  activeHours: { start: string; end: string; timezone: string };
  backupRetentionDays: number;
  createdAt: Date;
  discordBotToken: string | null;
  discordWebhookUrl: string | null;
  heartbeatIntervalMs: number;
  id: number;
  revenueSplitOperator: number;
  revenueSplitReinvest: number;
  setupComplete: boolean;
  updatedAt: Date;
}

export interface ResourceMetrics {
  cpuPercent: number;
  llmSpendRate: number;
  memoryMb: number;
}

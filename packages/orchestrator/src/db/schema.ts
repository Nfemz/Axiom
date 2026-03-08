import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Custom pgvector type
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return value.slice(1, -1).split(",").map(Number);
  },
});

// Custom bytea type
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ─── Agent Definition ──────────────────────────────────────────────
export const agentDefinitions = pgTable("agent_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  mission: text("mission").notNull(),
  modelProvider: varchar("model_provider", { length: 50 }).notNull(),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  defaultBudget: decimal("default_budget", {
    precision: 12,
    scale: 2,
  }).notNull(),
  capabilities: jsonb("capabilities").notNull().default({}),
  tools: jsonb("tools").notNull().default({}),
  approvalPolicies: jsonb("approval_policies").notNull().default({}),
  retryPolicy: jsonb("retry_policy").notNull().default({}),
  heartbeatConfig: jsonb("heartbeat_config").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Agent ─────────────────────────────────────────────────────────
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => agentDefinitions.id),
    name: varchar("name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("spawning"),
    sandboxId: varchar("sandbox_id", { length: 255 }),
    modelProvider: varchar("model_provider", { length: 50 }).notNull(),
    modelId: varchar("model_id", { length: 100 }).notNull(),
    currentTask: text("current_task"),
    budgetTotal: decimal("budget_total", { precision: 12, scale: 2 }).notNull(),
    budgetSpent: decimal("budget_spent", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    budgetCurrency: varchar("budget_currency", { length: 3 })
      .notNull()
      .default("USD"),
    permissions: jsonb("permissions").notNull().default({}),
    configChecksum: varchar("config_checksum", { length: 64 }),
    heartbeatAt: timestamp("heartbeat_at"),
    spawnContext: jsonb("spawn_context"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("agents_parent_id_idx").on(table.parentId),
    index("agents_status_idx").on(table.status),
    index("agents_definition_id_idx").on(table.definitionId),
  ]
);

// ─── Agent Memory ──────────────────────────────────────────────────
export const agentMemories = pgTable(
  "agent_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    content: text("content").notNull(),
    embedding: vector("embedding"),
    importanceScore: real("importance_score").notNull().default(0.5),
    memoryType: varchar("memory_type", { length: 20 }).notNull(),
    tags: text("tags").array(),
    sourceSessionId: uuid("source_session_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    accessedAt: timestamp("accessed_at").notNull().defaultNow(),
    consolidatedInto: uuid("consolidated_into"),
  },
  (table) => [
    index("agent_memories_agent_id_idx").on(table.agentId),
    index("agent_memories_importance_idx").on(
      table.agentId,
      table.importanceScore
    ),
  ]
);

// ─── Agent Session ─────────────────────────────────────────────────
export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    summary: text("summary"),
  },
  (table) => [index("agent_sessions_agent_id_idx").on(table.agentId)]
);

// ─── Checkpoint ────────────────────────────────────────────────────
export const checkpoints = pgTable(
  "checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    sessionId: uuid("session_id").references(() => agentSessions.id),
    currentGoal: text("current_goal").notNull(),
    progressState: jsonb("progress_state").notNull().default({}),
    decisionLog: jsonb("decision_log").notNull().default({}),
    pendingActions: jsonb("pending_actions").notNull().default({}),
    workingArtifacts: jsonb("working_artifacts").notNull().default({}),
    handoffPrompt: text("handoff_prompt"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("checkpoints_agent_id_idx").on(table.agentId)]
);

// ─── Shared Knowledge ──────────────────────────────────────────────
export const sharedKnowledge = pgTable(
  "shared_knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    embedding: vector("embedding"),
    entryType: varchar("entry_type", { length: 30 }).notNull(),
    tags: text("tags").array(),
    category: varchar("category", { length: 100 }).notNull(),
    contributingAgentId: uuid("contributing_agent_id").references(
      () => agents.id
    ),
    importanceScore: real("importance_score").notNull().default(0.5),
    accessCount: integer("access_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("shared_knowledge_category_idx").on(table.category)]
);

// ─── Skill ─────────────────────────────────────────────────────────
export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    version: integer("version").notNull().default(1),
    triggerCondition: text("trigger_condition").notNull(),
    inputs: jsonb("inputs").notNull().default({}),
    outputs: jsonb("outputs").notNull().default({}),
    steps: jsonb("steps").notNull().default([]),
    successCriteria: text("success_criteria").notNull(),
    failureCriteria: text("failure_criteria").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    authoringAgentId: uuid("authoring_agent_id").references(() => agents.id),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    invocationCount: integer("invocation_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    knowledgeEntryId: uuid("knowledge_entry_id").references(
      () => sharedKnowledge.id
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("skills_status_idx").on(table.status)]
);

// ─── Audit Log ─────────────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    outcome: varchar("outcome", { length: 20 }).notNull(),
    details: jsonb("details").notNull().default({}),
    securityEvent: boolean("security_event").notNull().default(false),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_agent_id_idx").on(table.agentId),
    index("audit_log_timestamp_idx").on(table.timestamp),
    index("audit_log_security_idx").on(table.securityEvent),
  ]
);

// ─── Financial Transaction ─────────────────────────────────────────
export const financialTransactions = pgTable(
  "financial_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    ventureId: uuid("venture_id"),
    type: varchar("type", { length: 30 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    externalRef: varchar("external_ref", { length: 255 }),
    preAuthVerified: boolean("pre_auth_verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("financial_tx_agent_id_idx").on(table.agentId),
    index("financial_tx_type_idx").on(table.type),
    index("financial_tx_created_idx").on(table.createdAt),
  ]
);

// ─── LLM Usage Log ─────────────────────────────────────────────────
export const llmUsageLogs = pgTable(
  "llm_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    sessionId: uuid("session_id").references(() => agentSessions.id),
    modelProvider: varchar("model_provider", { length: 50 }).notNull(),
    modelId: varchar("model_id", { length: 100 }).notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheCreateTokens: integer("cache_create_tokens").notNull().default(0),
    computedCostUsd: decimal("computed_cost_usd", {
      precision: 10,
      scale: 6,
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("llm_usage_agent_id_idx").on(table.agentId),
    index("llm_usage_created_idx").on(table.createdAt),
  ]
);

// ─── Identity ──────────────────────────────────────────────────────
export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    identityType: varchar("identity_type", { length: 20 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    credentialsSecretId: uuid("credentials_secret_id"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("identities_agent_id_idx").on(table.agentId)]
);

// ─── Secret ────────────────────────────────────────────────────────
export const secrets = pgTable("secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  secretType: varchar("secret_type", { length: 20 }).notNull(),
  encryptedValue: bytea("encrypted_value").notNull(),
  allowedAgents: uuid("allowed_agents").array(),
  allowedDomains: text("allowed_domains").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Pipeline ──────────────────────────────────────────────────────
export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    goal: text("goal").notNull(),
    stages: jsonb("stages").notNull().default([]),
    currentStage: integer("current_stage").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("planned"),
    budgetTotal: decimal("budget_total", { precision: 12, scale: 2 }).notNull(),
    budgetSpent: decimal("budget_spent", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    leadAgentId: uuid("lead_agent_id").references(() => agents.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("pipelines_status_idx").on(table.status)]
);

// ─── Alert Rule ────────────────────────────────────────────────────
export const alertRules = pgTable("alert_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  condition: jsonb("condition").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  notifyDiscord: boolean("notify_discord").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Alert Event ───────────────────────────────────────────────────
export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => alertRules.id),
    agentId: uuid("agent_id").references(() => agents.id),
    severity: varchar("severity", { length: 20 }).notNull(),
    message: text("message").notNull(),
    acknowledged: boolean("acknowledged").notNull().default(false),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("alert_events_rule_id_idx").on(table.ruleId),
    index("alert_events_created_idx").on(table.createdAt),
  ]
);

// ─── Operator Credential ───────────────────────────────────────────
export const operatorCredentials = pgTable("operator_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  credentialId: bytea("credential_id").notNull().unique(),
  publicKey: bytea("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: varchar("transports", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── System Config ─────────────────────────────────────────────────
export const systemConfig = pgTable("system_config", {
  id: integer("id").primaryKey().default(1),
  setupComplete: boolean("setup_complete").notNull().default(false),
  heartbeatIntervalMs: integer("heartbeat_interval_ms")
    .notNull()
    .default(1_800_000),
  activeHours: jsonb("active_hours")
    .notNull()
    .default({ start: "06:00", end: "22:00", timezone: "UTC" }),
  revenueSplitOperator: real("revenue_split_operator").notNull().default(0.2),
  revenueSplitReinvest: real("revenue_split_reinvest").notNull().default(0.8),
  backupRetentionDays: integer("backup_retention_days").notNull().default(90),
  discordWebhookUrl: text("discord_webhook_url"),
  discordBotToken: text("discord_bot_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Relations ─────────────────────────────────────────────────────
export const agentsRelations = relations(agents, ({ one, many }) => ({
  parent: one(agents, {
    fields: [agents.parentId],
    references: [agents.id],
    relationName: "parentChild",
  }),
  children: many(agents, { relationName: "parentChild" }),
  definition: one(agentDefinitions, {
    fields: [agents.definitionId],
    references: [agentDefinitions.id],
  }),
  memories: many(agentMemories),
  sessions: many(agentSessions),
  checkpoints: many(checkpoints),
  identities: many(identities),
}));

export const agentMemoriesRelations = relations(agentMemories, ({ one }) => ({
  agent: one(agents, {
    fields: [agentMemories.agentId],
    references: [agents.id],
  }),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSessions.agentId],
    references: [agents.id],
  }),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  agent: one(agents, {
    fields: [checkpoints.agentId],
    references: [agents.id],
  }),
  session: one(agentSessions, {
    fields: [checkpoints.sessionId],
    references: [agentSessions.id],
  }),
}));

export const identitiesRelations = relations(identities, ({ one }) => ({
  agent: one(agents, { fields: [identities.agentId], references: [agents.id] }),
}));

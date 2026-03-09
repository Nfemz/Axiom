// ---------------------------------------------------------------------------
// Axiom Orchestrator – Shared Enums
// ---------------------------------------------------------------------------
// Uses the idiomatic TypeScript "const object + derived type" pattern so that
// values are available at runtime while types remain narrow string-literal
// unions.  Import the *object* when you need runtime values (e.g. comparisons,
// DB writes) and the *type* when you only need compile-time narrowing.
// ---------------------------------------------------------------------------

// ── Agent Status ──────────────────────────────────────────────────────────────

export const AgentStatus = {
  Spawning: "spawning",
  Running: "running",
  Paused: "paused",
  Suspended: "suspended",
  Error: "error",
  Terminated: "terminated",
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

// ── Memory Type ───────────────────────────────────────────────────────────────

export const MemoryType = {
  Fact: "fact",
  Decision: "decision",
  Preference: "preference",
  Reflection: "reflection",
  Consolidation: "consolidation",
} as const;

export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];

// ── Skill Status ──────────────────────────────────────────────────────────────

export const SkillStatus = {
  Draft: "draft",
  Validated: "validated",
  Active: "active",
  Deprecated: "deprecated",
} as const;

export type SkillStatus = (typeof SkillStatus)[keyof typeof SkillStatus];

// ── Alert Severity ────────────────────────────────────────────────────────────

export const AlertSeverity = {
  Info: "info",
  Warning: "warning",
  Critical: "critical",
} as const;

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

// ── Identity Type ─────────────────────────────────────────────────────────────

export const IdentityType = {
  Email: "email",
  Phone: "phone",
  Voice: "voice",
  ServiceAccount: "service_account",
} as const;

export type IdentityType = (typeof IdentityType)[keyof typeof IdentityType];

// ── Secret Type ───────────────────────────────────────────────────────────────

export const SecretType = {
  ApiKey: "api_key",
  Credential: "credential",
  PaymentMethod: "payment_method",
  OauthToken: "oauth_token",
} as const;

export type SecretType = (typeof SecretType)[keyof typeof SecretType];

// ── Pipeline Status ───────────────────────────────────────────────────────────

export const PipelineStatus = {
  Planned: "planned",
  Active: "active",
  Paused: "paused",
  Completed: "completed",
  Failed: "failed",
} as const;

export type PipelineStatus =
  (typeof PipelineStatus)[keyof typeof PipelineStatus];

// ── Transaction Type ──────────────────────────────────────────────────────────

export const TransactionType = {
  Expense: "expense",
  Revenue: "revenue",
  SplitOperator: "split_operator",
  SplitReinvestment: "split_reinvestment",
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

// ── Audit Outcome ─────────────────────────────────────────────────────────────

export const AuditOutcome = {
  Success: "success",
  Failure: "failure",
  Blocked: "blocked",
  Pending: "pending",
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

// ── Session Status ────────────────────────────────────────────────────────────

export const SessionStatus = {
  Active: "active",
  Compacted: "compacted",
  Ended: "ended",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// ── Knowledge Entry Type ──────────────────────────────────────────────────────

export const KnowledgeEntryType = {
  Resolution: "resolution",
  Pattern: "pattern",
  Strategy: "strategy",
  Insight: "insight",
  ToolIntegration: "tool_integration",
} as const;

export type KnowledgeEntryType =
  (typeof KnowledgeEntryType)[keyof typeof KnowledgeEntryType];

// ── Identity Status ───────────────────────────────────────────────────────────

export const IdentityStatus = {
  Active: "active",
  Revoked: "revoked",
} as const;

export type IdentityStatus =
  (typeof IdentityStatus)[keyof typeof IdentityStatus];

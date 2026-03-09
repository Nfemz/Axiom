import { AgentStatus } from "../types/enums.js";

// ---------------------------------------------------------------------------
// Heartbeat & lifecycle
// ---------------------------------------------------------------------------
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 1_800_000; // 30 minutes
export const HEARTBEAT_TIMEOUT_MS = 300_000; // 5 minutes
export const CHECKPOINT_INTERVAL_MS = 600_000; // 10 minutes

// ---------------------------------------------------------------------------
// Agent orchestration
// ---------------------------------------------------------------------------
export const AGENT_SPAWN_TIMEOUT_MS = 60_000; // 1 minute
export const MAX_CONCURRENT_AGENTS = 20;
export const SKILL_AUTO_DEPRECATE_FAILURES = 3;

// ---------------------------------------------------------------------------
// Memory & embeddings
// ---------------------------------------------------------------------------
export const MEMORY_CONSOLIDATION_INTERVAL_MS = 3_600_000; // 1 hour
export const EMBEDDING_DIMENSIONS = 1536;

// ---------------------------------------------------------------------------
// Revenue & budget
// ---------------------------------------------------------------------------
export const DEFAULT_REVENUE_SPLIT_OPERATOR = 0.2;
export const DEFAULT_REVENUE_SPLIT_REINVEST = 0.8;
export const DEFAULT_BUDGET_CURRENCY = "USD";

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export const DEFAULT_BACKUP_RETENTION_DAYS = 90;
export const DEFAULT_ACTIVE_HOURS = {
  start: "06:00",
  end: "22:00",
  timezone: "UTC",
} as const;

// ---------------------------------------------------------------------------
// Agent status transitions
// ---------------------------------------------------------------------------
export const VALID_STATUS_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.Spawning]: [
    AgentStatus.Running,
    AgentStatus.Error,
    AgentStatus.Terminated,
  ],
  [AgentStatus.Running]: [
    AgentStatus.Paused,
    AgentStatus.Suspended,
    AgentStatus.Error,
    AgentStatus.Terminated,
  ],
  [AgentStatus.Paused]: [AgentStatus.Running, AgentStatus.Terminated],
  [AgentStatus.Suspended]: [AgentStatus.Running, AgentStatus.Terminated],
  [AgentStatus.Error]: [AgentStatus.Running, AgentStatus.Terminated],
  [AgentStatus.Terminated]: [],
};

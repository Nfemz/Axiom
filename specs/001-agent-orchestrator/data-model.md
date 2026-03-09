# Data Model: Autonomous Agent Orchestrator Platform

**Date**: 2026-03-07 | **Branch**: `001-agent-orchestrator`

## Entity Relationship Overview

```text
Operator (single, passkey auth)
  └── Orchestrator (singleton process)
        ├── AgentDefinition (templates)
        ├── Agent (hierarchical tree)
        │     ├── AgentMemory (private per-agent)
        │     ├── AgentSession (ephemeral logs)
        │     ├── Checkpoint (durable execution)
        │     ├── Identity (email, phone, etc.)
        │     └── Agent (sub-agents, recursive)
        ├── SharedKnowledgeBase (collective)
        ├── Skill (executable procedures)
        ├── AuditLog (immutable)
        ├── FinancialLedger (transactions)
        ├── SecretVault (credentials)
        ├── AlertRule / AlertEvent
        └── Pipeline (multi-stage workflows)
```

## Entities

### Agent

The core execution unit. Forms a hierarchical tree where any agent can be a parent.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| parent_id | UUID | FK → Agent (nullable for root orchestrator) |
| definition_id | UUID | FK → AgentDefinition |
| name | VARCHAR(255) | NOT NULL |
| status | ENUM | `spawning`, `running`, `paused`, `suspended`, `error`, `terminated` |
| sandbox_id | VARCHAR(255) | E2B sandbox identifier |
| model_provider | VARCHAR(50) | `anthropic`, `openai`, `google`, `openrouter` |
| model_id | VARCHAR(100) | e.g., `claude-3-5-sonnet-20241022` |
| current_task | TEXT | Summary of current work |
| budget_total | DECIMAL(12,2) | Max budget allocated |
| budget_spent | DECIMAL(12,2) | Running total spent |
| budget_currency | VARCHAR(3) | Default `USD` |
| permissions | JSONB | Inherited from parent, cascading |
| config_checksum | VARCHAR(64) | SHA256 of mission + config (FR-024) |
| heartbeat_at | TIMESTAMP | Last heartbeat received |
| spawn_context | JSONB | Initial task context injected at spawn |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**State transitions**:
```text
spawning → running → paused → running (resume)
                    → suspended → running (resume on demand)
                    → error → running (retry) | terminated
                    → terminated
```

**Validation rules**:
- `budget_spent` MUST NOT exceed `budget_total` (FR-008c)
- `budget_total` MUST NOT exceed parent's remaining budget
- `parent_id` creates a directed acyclic tree (no cycles)
- `status` transitions follow the state machine above

### AgentDefinition

Template for agent instantiation. Created/managed via dashboard.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| mission | TEXT | Natural language mission/prompt |
| model_provider | VARCHAR(50) | Default provider |
| model_id | VARCHAR(100) | Default model |
| default_budget | DECIMAL(12,2) | Default budget per instance |
| capabilities | JSONB | Tool/capability config |
| tools | JSONB | Available tools list |
| approval_policies | JSONB | When to require operator approval |
| retry_policy | JSONB | `{ max_retries, backoff_type, backoff_delay }` |
| heartbeat_config | JSONB | `{ timeout_ms, resource_thresholds, llm_check_interval }` |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### AgentMemory

Private durable memory per agent (FR-020). Stored as chunked entries with embeddings.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| content | TEXT | Memory content (markdown) |
| embedding | VECTOR(1536) | For semantic search |
| importance_score | REAL | 0.0–1.0 (FR-020e) |
| memory_type | ENUM | `fact`, `decision`, `preference`, `reflection`, `consolidation` |
| tags | TEXT[] | Searchable tags |
| source_session_id | UUID | FK → AgentSession (nullable) |
| created_at | TIMESTAMP | NOT NULL |
| accessed_at | TIMESTAMP | For recency tracking |
| consolidated_into | UUID | FK → AgentMemory (nullable, for pruning) |

**Indexes**: HNSW on `embedding`, GIN on `tags`, BTree on `agent_id + importance_score`

**Tier isolation** (FR-020d):
- Tier 1 (private): `agent_id` scoped, no cross-agent access
- Tier 2 (shared): See SharedKnowledgeEntry
- Tier 3 (orchestrator): Root agent's private memory

### AgentSession

Ephemeral session logs per execution session.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| started_at | TIMESTAMP | NOT NULL |
| ended_at | TIMESTAMP | Nullable |
| status | ENUM | `active`, `compacted`, `ended` |
| summary | TEXT | Post-session summary |

### Checkpoint

Durable execution snapshots for long-horizon tasks (FR-015b).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| session_id | UUID | FK → AgentSession |
| current_goal | TEXT | NOT NULL |
| progress_state | JSONB | Structured progress data |
| decision_log | JSONB | What was tried and why |
| pending_actions | JSONB | Actions queued but not executed |
| working_artifacts | JSONB | References to files/data |
| handoff_prompt | TEXT | Structured prompt for next instance |
| created_at | TIMESTAMP | NOT NULL |

### SharedKnowledgeEntry

Collective knowledge base readable/writable by all agents (FR-012d).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| content | TEXT | Knowledge content (markdown) |
| embedding | VECTOR(1536) | For semantic search |
| entry_type | ENUM | `resolution`, `pattern`, `strategy`, `insight`, `tool_integration` |
| tags | TEXT[] | Searchable tags |
| category | VARCHAR(100) | Grouping category |
| contributing_agent_id | UUID | FK → Agent |
| importance_score | REAL | 0.0–1.0 |
| access_count | INTEGER | Read frequency tracking |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Indexes**: HNSW on `embedding`, GIN on `tags`, FTS on `content`

### Skill

Structured reusable procedures authored by agents (FR-022).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| version | INTEGER | Monotonic version counter |
| trigger_condition | TEXT | When to use this skill |
| inputs | JSONB | Typed input definitions |
| outputs | JSONB | Typed output definitions |
| steps | JSONB | Ordered procedural steps |
| success_criteria | TEXT | How to determine success |
| failure_criteria | TEXT | How to determine failure |
| status | ENUM | `draft`, `validated`, `active`, `deprecated` |
| authoring_agent_id | UUID | FK → Agent |
| consecutive_failures | INTEGER | Default 0 (FR-022c) |
| invocation_count | INTEGER | Default 0 |
| success_count | INTEGER | Default 0 |
| knowledge_entry_id | UUID | FK → SharedKnowledgeEntry |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**State transitions**:
```text
draft → validated (after successful execution) → active
active → deprecated (after 3 consecutive cross-agent failures)
deprecated → draft (re-authoring)
```

### AuditLogEntry

Immutable record of all agent actions (FR-007).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| action_type | VARCHAR(100) | NOT NULL |
| outcome | ENUM | `success`, `failure`, `blocked`, `pending` |
| details | JSONB | Action-specific metadata |
| security_event | BOOLEAN | Default false |
| timestamp | TIMESTAMP | NOT NULL, indexed |

**Retention**: Indefinite (FR-028). Append-only, no updates/deletes.

### FinancialTransaction

Revenue and expense tracking (FR-019, FR-008).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent |
| venture_id | UUID | FK → Pipeline (nullable) |
| type | ENUM | `expense`, `revenue`, `split_operator`, `split_reinvestment` |
| amount | DECIMAL(12,2) | NOT NULL |
| currency | VARCHAR(3) | Default `USD` |
| category | VARCHAR(100) | e.g., `llm_api`, `compute`, `hosting`, `service`, `revenue` |
| description | TEXT | |
| external_ref | VARCHAR(255) | Stripe charge ID, etc. |
| pre_auth_verified | BOOLEAN | FR-008c compliance |
| created_at | TIMESTAMP | NOT NULL |

### LLMUsageLog

Per-call LLM cost tracking (FR-008b).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| session_id | UUID | FK → AgentSession |
| model_provider | VARCHAR(50) | NOT NULL |
| model_id | VARCHAR(100) | NOT NULL |
| input_tokens | INTEGER | NOT NULL |
| output_tokens | INTEGER | NOT NULL |
| cache_read_tokens | INTEGER | Default 0 |
| cache_create_tokens | INTEGER | Default 0 |
| computed_cost_usd | DECIMAL(10,6) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

### Identity

Digital identities created by agents (FR-009).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| agent_id | UUID | FK → Agent, NOT NULL |
| identity_type | ENUM | `email`, `phone`, `voice`, `service_account` |
| provider | VARCHAR(100) | e.g., `gmail`, `twilio` |
| identifier | VARCHAR(255) | Email address, phone number, etc. |
| credentials_secret_id | UUID | FK → Secret |
| status | ENUM | `active`, `revoked` |
| created_at | TIMESTAMP | NOT NULL |
| revoked_at | TIMESTAMP | Nullable |

### Secret

Credential storage with access control (FR-006).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| secret_type | ENUM | `api_key`, `credential`, `payment_method`, `oauth_token` |
| encrypted_value | BYTEA | AES-256 encrypted |
| allowed_agents | UUID[] | Agent IDs permitted to access |
| allowed_domains | TEXT[] | Domain allowlist for outbound requests (FR-026) |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Pipeline

Multi-stage workflow definition (emergent from FR-013).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| goal | TEXT | High-level goal description |
| stages | JSONB | Ordered stages with completion criteria |
| current_stage | INTEGER | Index into stages |
| status | ENUM | `planned`, `active`, `paused`, `completed`, `failed` |
| budget_total | DECIMAL(12,2) | |
| budget_spent | DECIMAL(12,2) | |
| lead_agent_id | UUID | FK → Agent (workflow lead) |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### AlertRule

Operator-configured alert rules (FR-014).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| condition | JSONB | Rule definition (threshold, metric, operator) |
| severity | ENUM | `info`, `warning`, `critical` |
| enabled | BOOLEAN | Default true |
| notify_discord | BOOLEAN | Default true for warning/critical |
| created_at | TIMESTAMP | NOT NULL |

### AlertEvent

Alert occurrences.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| rule_id | UUID | FK → AlertRule |
| agent_id | UUID | FK → Agent (nullable) |
| severity | ENUM | `info`, `warning`, `critical` |
| message | TEXT | NOT NULL |
| acknowledged | BOOLEAN | Default false |
| acknowledged_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | NOT NULL |

### OperatorCredential

WebAuthn passkey storage (FR-027).

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| credential_id | BYTEA | WebAuthn credential ID, UNIQUE |
| public_key | BYTEA | NOT NULL |
| counter | INTEGER | Replay attack prevention |
| transports | VARCHAR(255) | e.g., `usb`, `ble`, `internal` |
| created_at | TIMESTAMP | NOT NULL |

### SystemConfig

Single-row system configuration (setup wizard state, heartbeat config, etc.).

| Field | Type | Constraints |
|-------|------|-------------|
| id | INTEGER | PK, always 1 |
| setup_complete | BOOLEAN | Default false (FR-029) |
| heartbeat_interval_ms | INTEGER | Default 1800000 (30 min) |
| active_hours | JSONB | `{ start: "06:00", end: "22:00", timezone: "UTC" }` |
| revenue_split_operator | REAL | Default 0.20 (FR-008a) |
| revenue_split_reinvest | REAL | Default 0.80 |
| backup_retention_days | INTEGER | Default 90 (FR-028) |
| discord_webhook_url | TEXT | |
| discord_bot_token | TEXT | Encrypted |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

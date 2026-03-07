# API Contracts: Autonomous Agent Orchestrator Platform

**Date**: 2026-03-07 | **Branch**: `001-agent-orchestrator`

## Overview

The system exposes three interfaces:
1. **Dashboard API** — Next.js API routes for the management dashboard (REST + SSE)
2. **Agent Communication** — Redis-based messaging protocol (BullMQ + Streams)
3. **Health Endpoint** — Infrastructure health check

All Dashboard API routes require WebAuthn session authentication except `/api/auth/*` and `/health`.

---

## 1. Dashboard API (REST)

Base: `/api`

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register/options` | POST | Generate WebAuthn registration challenge |
| `/api/auth/register/verify` | POST | Verify registration response, store credential |
| `/api/auth/login/options` | POST | Generate WebAuthn authentication challenge |
| `/api/auth/login/verify` | POST | Verify authentication response, create session |
| `/api/auth/logout` | POST | Destroy session |

### Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents (tree structure) |
| `/api/agents` | POST | Spawn a new agent from definition |
| `/api/agents/:id` | GET | Get agent details (status, budget, task) |
| `/api/agents/:id` | PATCH | Update agent (pause, resume, resteer) |
| `/api/agents/:id` | DELETE | Terminate agent |
| `/api/agents/:id/memory` | GET | List agent memory entries |
| `/api/agents/:id/sessions` | GET | List agent sessions |
| `/api/agents/:id/checkpoints` | GET | List agent checkpoints |
| `/api/agents/:id/children` | GET | List child agents |

#### POST `/api/agents` — Spawn Agent

```typescript
// Request
{
  definitionId: string;      // AgentDefinition UUID
  parentId?: string;         // Parent agent UUID (null = root-level)
  goal: string;              // Task description
  budget?: number;           // Override default budget
  modelOverride?: {          // Override default model
    provider: string;
    modelId: string;
  };
}

// Response 201
{
  id: string;
  status: "spawning";
  sandboxId: string;
  parentId: string | null;
  createdAt: string;
}
```

#### PATCH `/api/agents/:id` — Control Agent

```typescript
// Request
{
  action: "pause" | "resume" | "terminate" | "resteer";
  directive?: string;        // Required for "resteer"
}

// Response 200
{
  id: string;
  status: string;            // Updated status
  updatedAt: string;
}
```

### Agent Definitions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/definitions` | GET | List all agent definitions |
| `/api/definitions` | POST | Create agent definition |
| `/api/definitions/:id` | GET | Get definition details |
| `/api/definitions/:id` | PUT | Update definition |
| `/api/definitions/:id` | DELETE | Delete definition |

### Secrets Vault

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/secrets` | GET | List secrets (names only, never values) |
| `/api/secrets` | POST | Create secret |
| `/api/secrets/:id` | PATCH | Update secret (value, allowed agents, domains) |
| `/api/secrets/:id` | DELETE | Delete secret |

### Pipelines

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pipelines` | GET | List all pipelines |
| `/api/pipelines` | POST | Create pipeline |
| `/api/pipelines/:id` | GET | Get pipeline details + stage progress |
| `/api/pipelines/:id` | PATCH | Update pipeline (pause, resume, budget) |

### Financial

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/financial/transactions` | GET | List transactions (filterable by agent, venture, type) |
| `/api/financial/summary` | GET | Aggregate summary (total in/out, per-agent, per-venture ROI) |
| `/api/financial/costs` | GET | LLM cost breakdown (per-agent, per-model, trends) |

### Identities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/identities` | GET | List all identities |
| `/api/identities/:id` | DELETE | Revoke identity |

### Skills

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills` | GET | List skills with metrics (invocations, success rate) |
| `/api/skills/:id` | GET | Skill details + version history |
| `/api/skills/:id/deprecate` | POST | Manually deprecate a skill |

### Alerts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts/rules` | GET | List alert rules |
| `/api/alerts/rules` | POST | Create alert rule |
| `/api/alerts/rules/:id` | PUT | Update alert rule |
| `/api/alerts/rules/:id` | DELETE | Delete alert rule |
| `/api/alerts/events` | GET | List alert events (filterable) |
| `/api/alerts/events/:id/ack` | POST | Acknowledge alert |

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/config` | GET | Get system configuration |
| `/api/system/config` | PATCH | Update system configuration |
| `/api/system/backup` | POST | Trigger manual backup |
| `/api/system/backup/restore` | POST | Restore from snapshot |
| `/api/system/setup` | GET | Get setup wizard state |
| `/api/system/setup` | POST | Advance setup wizard step |

---

## 2. SSE Streams (Real-time Dashboard)

| Endpoint | Description | Event Types |
|----------|-------------|-------------|
| `/api/stream/agents` | Agent status changes | `agent:status`, `agent:progress`, `agent:spawn`, `agent:terminate` |
| `/api/stream/costs` | Cost updates | `cost:update`, `cost:alert` |
| `/api/stream/alerts` | Alert events | `alert:new`, `alert:ack` |
| `/api/stream/pipeline/:id` | Pipeline progress | `pipeline:stage`, `pipeline:complete` |

### Event Format

```typescript
// SSE data format
{
  type: string;              // Event type (e.g., "agent:status")
  payload: {
    id: string;              // Entity ID
    [key: string]: unknown;  // Event-specific data
  };
  timestamp: string;         // ISO 8601
}
```

---

## 3. Agent Communication Protocol (Redis)

### Message Types: Agent → Orchestrator

Channel: `orchestrator:inbox` (Redis Stream)

```typescript
type AgentToOrchestrator =
  | { type: "progress"; agentId: string; progress: number; task: string; }
  | { type: "decision-request"; agentId: string; question: string; options: string[]; context: unknown; }
  | { type: "escalation"; agentId: string; reason: string; severity: "warning" | "critical"; }
  | { type: "budget-request"; agentId: string; amount: number; justification: string; }
  | { type: "capability-upgrade"; agentId: string; requested: string[]; justification: string; }
  | { type: "conflict-report"; agentId: string; conflictWith: string; resource: string; }
  | { type: "knowledge-publish"; agentId: string; entry: SharedKnowledgeEntry; }
  | { type: "skill-publish"; agentId: string; skill: Skill; }
  | { type: "complete"; agentId: string; result: unknown; artifacts: string[]; }
  | { type: "error"; agentId: string; error: string; recoverable: boolean; }
  | { type: "heartbeat"; agentId: string; resourceUsage: ResourceMetrics; }
```

### Message Types: Orchestrator → Agent

Channel: `agent:{id}:inbox` (Redis Stream)

```typescript
type OrchestratorToAgent =
  | { type: "resteer"; directive: string; priority: number; }
  | { type: "decision-response"; requestId: string; decision: string; }
  | { type: "budget-approved"; amount: number; }
  | { type: "budget-denied"; reason: string; }
  | { type: "capability-approved"; capabilities: string[]; }
  | { type: "capability-denied"; reason: string; }
  | { type: "pause"; }
  | { type: "resume"; }
  | { type: "terminate"; reason: string; graceful: boolean; }
  | { type: "integrity-check"; expectedChecksum: string; }
```

### BullMQ Job Queues

| Queue | Purpose | Data Shape |
|-------|---------|------------|
| `agent:spawn` | Spawn new agent in E2B sandbox | `{ agentId, definitionId, parentId, goal, config }` |
| `agent:results` | Collect completed agent results | `{ agentId, result, artifacts, usage }` |
| `heartbeat` | Scheduled heartbeat checks | `{ interval, agentsToCheck }` |
| `backup` | Scheduled backup jobs | `{ type: "daily" | "manual" }` |
| `memory:consolidation` | Periodic memory reflection | `{ agentId, type: "reflect" | "consolidate" }` |

---

## 4. Health Endpoint

### GET `/health`

```typescript
// Response 200
{
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;            // Seconds
  services: {
    orchestrator: "up" | "down";
    redis: "up" | "down";
    postgresql: "up" | "down";
  };
  agents: {
    total: number;
    running: number;
    paused: number;
    error: number;
  };
  timestamp: string;
}
```

No authentication required (FR-030).

---

## 5. Secret Proxy API (Agent-facing)

Internal API accessible only within the orchestrator process. Agents request secrets through Redis messaging, and the orchestrator proxies the request.

### Secret Access Flow

```text
Agent sends "secret-request" via Redis Stream
  → Orchestrator verifies agent is in allowed_agents
  → Orchestrator verifies target domain is in allowed_domains
  → Orchestrator injects secret into agent's sandbox via E2B API
  → Audit log entry created (agent_id, secret_name, domain, timestamp)
  → If domain not allowlisted → block, alert, audit
```

Agents never receive raw secret values — the orchestrator proxies authenticated API calls on the agent's behalf, or injects time-limited credentials via the E2B sandbox API.

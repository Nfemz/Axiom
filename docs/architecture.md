# Architecture

Axiom is an autonomous agent orchestration platform. It manages 24/7 agentic tasks — spawning agents in sandboxes, coordinating their work via message queues, and providing operator visibility through a dashboard and Discord bot.

## System Overview

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Dashboard   │────▶│ Orchestrator │────▶│  Agent Runtime   │
│  (Next.js)   │ SSE │  (Node.js)   │ E2B │  (E2B Sandbox)   │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
┌─────────────┐     ┌──────┴───────┐
│ Discord Bot  │────▶│    Redis 7    │  BullMQ queues + Streams
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ PostgreSQL 17 │  pgvector embeddings
                    └──────────────┘
```

## Packages

| Package | Purpose | Entry point | Port |
|---------|---------|-------------|------|
| `packages/orchestrator` | Core control plane — agent lifecycle, DB, queues, security | `src/index.ts` | 3001 |
| `packages/dashboard` | Next.js 15 App Router operator UI | `src/app/` | 3000 |
| `packages/agent-runtime` | Code running inside E2B sandboxes | `src/index.ts` | — |
| `packages/discord-bot` | Discord operator interface | `src/index.ts` | — |
| `packages/shared` | Types, schemas, constants, crypto, logger | `src/index.ts` | — |

## Tech Stack

- **Runtime**: TypeScript 5.x, Node.js 22 LTS, ESM modules
- **Monorepo**: pnpm 9.15 workspaces + Turborepo
- **Database**: PostgreSQL 17 + pgvector (Drizzle ORM, `postgres` driver)
- **Queues**: Redis 7 — BullMQ for jobs, Redis Streams for real-time agent comms (ioredis)
- **Sandbox**: E2B SDK + @e2b/desktop for isolated agent execution
- **LLM**: Vercel AI SDK v6 (multi-provider: Anthropic, OpenAI, Google, OpenRouter)
- **Dashboard**: Next.js 15, React 19, iron-session, SSE streaming
- **Auth**: WebAuthn/Passkey (@simplewebauthn)
- **Validation**: Zod v4 (`z.record()` requires two args in v4)
- **Linting**: Biome via Ultracite (zero-config preset)
- **Testing**: Vitest + Playwright + Testcontainers
- **Discord**: discord.js 14

## Dependency Graph

```text
shared ◀─── orchestrator ◀─── dashboard
  ▲              ▲
  │              └──────────── discord-bot
  └──────────────────────────── agent-runtime
```

`shared` has zero internal dependencies. Every other package imports from `@axiom/shared`.
`dashboard` imports from both `@axiom/shared` and `@axiom/orchestrator` (DB queries, config).

## Request Lifecycle

### Agent Spawn Flow

1. Operator triggers spawn (dashboard API or Discord command)
2. Orchestrator validates request via Zod schema
3. Agent definition loaded from DB, secrets decrypted
4. E2B sandbox provisioned with agent-runtime code
5. Agent status transitions: `spawning → running`
6. Heartbeat monitoring begins (intervals: 1.8M / 5M / 10M ms)
7. Agent communicates via Redis Streams; jobs via BullMQ

### Dashboard SSE

Dashboard connects to `/api/stream/` endpoints for real-time updates. Orchestrator publishes events; dashboard consumes via SSE.

## Key Subsystems (Orchestrator)

| Subsystem | Directory | Purpose |
|-----------|-----------|---------|
| Agents | `src/agents/` | Lifecycle, state machine, spawn, workflow coordination |
| Comms | `src/comms/` | Redis connections, BullMQ queues, Streams, inbox/outbox |
| Security | `src/security/` | Alert engine, audit log, injection scanning, tool approval |
| Memory | `src/memory/` | Agent memory, consolidation, knowledge base, quality pipeline |
| Financial | `src/financial/` | Budget tracking, ledger, revenue splits, LLM cost tracking |
| Secrets | `src/secrets/` | Vault (AES-256-GCM), proxy, domain filtering |
| Health | `src/health/` | System health monitoring |
| Heartbeat | `src/heartbeat/` | Agent liveness detection |
| Skills | `src/skills/` | Learned behavior registry and lifecycle |
| DB | `src/db/` | Drizzle schema, queries, backup |

## Infrastructure

### Local Development

`docker-compose.yml` provides PostgreSQL 17 (pgvector) on port 5432 and Redis 7 on port 6379. Services can run containerized or natively via `pnpm dev`.

### Production

Systemd service (`deploy/axiom-orchestrator.service`) with security hardening:
- `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=true`
- Resource limits: MemoryMax=2G, CPUQuota=200%, LimitNOFILE=65535

## Database

PostgreSQL 17 with pgvector extension for vector embeddings (1536 dimensions). Drizzle ORM for schema definition and queries. Migrations in `drizzle/`. See `§ docs/data-layer.md` for schema details.

## Agent State Machine

Valid transitions defined in `VALID_STATUS_TRANSITIONS` (from `@axiom/shared`):

```text
spawning → running, error, terminated
running  → paused, suspended, error, terminated
paused   → running, terminated
suspended → running, terminated
error    → running, terminated
```

## Security Model

- **Encryption**: AES-256-GCM with PBKDF2-SHA512 key derivation (`@axiom/shared/crypto`)
- **Auth**: WebAuthn/Passkey for dashboard access
- **Sessions**: iron-session (encrypted, stateless cookies)
- **Secrets**: Vault with domain-scoped access filtering
- **Audit**: Full audit logging with outcome tracking
- **Injection scanning**: Input sanitization for agent-submitted content
- **Tool approval**: Operator-gated tool access for agents

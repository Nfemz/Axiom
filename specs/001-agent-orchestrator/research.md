# Research: Autonomous Agent Orchestrator Platform

**Date**: 2026-03-07 | **Branch**: `001-agent-orchestrator`

## Decision Log

### D-001: Testing Framework

**Decision**: Vitest (unit/integration) + Playwright (E2E dashboard)

**Rationale**: Vitest is the idiomatic 2026 choice for TypeScript monorepos — native ESM, built-in workspace support, 10x faster than Jest. Playwright is the Next.js-recommended E2E framework with multi-browser support. Testcontainers for real Redis/PostgreSQL in integration tests. Mock LLM calls with Nock/MockAgent.

**Alternatives considered**:
- Jest: Legacy, requires ts-jest + babel-jest, slower cold starts
- Cypress: Worse multi-browser support, heavier

### D-002: E2B SDK Capabilities

**Decision**: E2B cloud-native sandboxes with `@e2b/desktop` for full computer use

**Rationale**: E2B provides programmatic sandbox spawning, file injection/extraction, virtual desktop (browser + terminal + screen/mouse/keyboard), and pause/resume lifecycle. Per-second billing (~$0.05/hr per 1-vCPU sandbox). Pro tier supports 100 concurrent sandboxes.

**Key constraints**:
- Max 24-hour session duration (pause/resume cycle required for longer tasks)
- Pause takes ~4s per GiB RAM
- Paused state retained 30 days
- Pro tier ($150/mo) required for production use
- Separate `@e2b/desktop` SDK for graphical desktop environments

**API surface**:
- `Sandbox.create({ envs, metadata })` — spawn
- `sandbox.files.write/read()` — inject/extract files
- `sandbox.commands.run()` — execute commands
- `sandbox.betaPause()` / `Sandbox.connect(id)` — pause/resume
- `sandbox.kill()` — terminate
- `sandbox.getHost(port)` — expose ports

### D-003: Agent Communication (BullMQ + Redis Streams)

**Decision**: BullMQ for job orchestration + Redis Streams for real-time messaging

**Rationale**: BullMQ provides parent-child job flows (FlowProducer), retries with backoff, and priority queues — ideal for agent spawning and result aggregation. Redis Streams provides durable, persistent messaging with consumer groups for bidirectional real-time communication (progress updates, decision requests, resteering). Both share the same ioredis connection.

**Architecture**:
- BullMQ: spawn-agent jobs, task delegation, result collection
- Redis Streams: progress updates, decision requests, escalations, resteering commands
- Stream channels: `agent:{id}:inbox` (orchestrator→agent), `orchestrator:inbox` (agent→orchestrator)
- Consumer groups with XACK for message durability

**Connection config**: `maxRetriesPerRequest: null` (critical for BullMQ blocking operations), keepalive 30s

### D-004: Vercel AI SDK for Agent Runtime

**Decision**: Vercel AI SDK with custom agent loop (manual tool execution)

**Rationale**: Unified multi-provider interface (Anthropic, OpenAI, Google, open-source via OpenRouter). Custom loop gives full control over tool call cycles, budget checks, and model switching. Token usage reporting built-in (`result.usage.inputTokens/outputTokens`). Anthropic cache token tracking supported (`cacheReadInputTokens`, `cacheCreationInputTokens`).

**Key patterns**:
- `generateText({ model, messages, tools, toolChoice })` for synchronous tool loops
- `streamText()` for streaming responses with `onChunk` callbacks
- Provider switching by changing model instance (no code changes)
- `result.usage` / `result.totalUsage` for per-step and aggregate token counts

**Limitations**:
- No pre-flight token counting (use external tokenizers or accept post-execution)
- Open-source models require OpenRouter wrapper
- Tool schema bloat consumes tokens silently

### D-005: WebAuthn/Passkey Authentication

**Decision**: `@simplewebauthn/server` + `@simplewebauthn/browser`

**Rationale**: Production-ready WebAuthn library, single-operator flow (register once during setup, authenticate thereafter). Stores passkey credentials in PostgreSQL. Auth.js WebAuthn provider is still experimental — SimpleWebAuthn is more mature.

**Flow**: Generate challenge → browser WebAuthn ceremony → server verification → session via Iron Session or JWT

### D-006: Server-Sent Events (SSE) for Dashboard

**Decision**: Native ReadableStream in Next.js App Router API routes

**Rationale**: Simple, no library needed. `Response(new ReadableStream(...))` with `Content-Type: text/event-stream`. Client uses native `EventSource`. Requires `force-dynamic` directive to bypass Next.js caching.

**Gotchas**: Chunks may buffer in some deployments — disable Nginx buffering. Implement auth check in route handler.

### D-007: PostgreSQL + pgvector

**Decision**: `pgvector/pgvector:pg17` Docker image, Drizzle ORM, HNSW indexes

**Rationale**: pgvector provides vector similarity search alongside relational data in one database. HNSW indexes are 40x faster than IVFFlat for queries (40 QPS vs 2.6 QPS for 1M vectors). Drizzle ORM chosen over Prisma: native pgvector support, 7.4KB vs 850KB bundle, serverless-ready, better raw SQL support.

**Hybrid search**: pgvector for semantic similarity + PostgreSQL FTS for keyword search, combined via Reciprocal Rank Fusion (RRF). ParadeDB optional for advanced BM25 ranking.

**Index config**: `CREATE INDEX USING hnsw (embedding vector_cosine_ops)` with `m=16, ef_construction=64`

### D-008: TypeScript ORM

**Decision**: Drizzle ORM

**Rationale**: Native pgvector type support, 7.4KB bundle (vs Prisma's 850KB), instant type updates while editing (no generate step), seamless raw SQL for complex vector queries, serverless/edge ready. "If you know SQL, you know Drizzle."

### D-009: Monorepo Structure

**Decision**: pnpm workspaces with Turborepo

**Rationale**: pnpm workspaces are the standard for Node.js/TypeScript monorepos — fast installs, strict dependency isolation, disk-efficient. Turborepo adds caching and task orchestration across packages. Shared types package enables type safety across orchestrator, dashboard, and agent runtime.

**Alternatives considered**:
- npm workspaces: Slower, less strict isolation
- Yarn: No significant advantage over pnpm for new projects
- Nx: Heavier than needed for this project size

### D-010: Discord Integration

**Decision**: discord.js bot

**Rationale**: Specified in FR-010a. Enables two-way messaging, slash commands, interactive approval buttons, and per-agent channels. Runs as a service alongside the orchestrator, routing messages via Redis.

# Implementation Plan: Autonomous Agent Orchestrator Platform

**Branch**: `001-agent-orchestrator` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-orchestrator/spec.md`

## Summary

Build an always-on autonomous agent orchestrator that runs on a single cloud VM, spawns specialized agents in E2B sandboxes with full computer usage, and supports hierarchical agent trees, persistent memory, self-learning via shared knowledge base, and a self-growing business pipeline. The system comprises a Node.js/TypeScript orchestrator, Next.js management dashboard, discord.js bot for operator interaction, and a custom agent runtime deployed inside E2B sandboxes. All services run via Docker Compose with PostgreSQL (pgvector) and Redis (BullMQ + Streams).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS
**Primary Dependencies**: E2B SDK + @e2b/desktop, Vercel AI SDK, BullMQ, ioredis, discord.js, Playwright, Next.js 15, React, @simplewebauthn/server, Drizzle ORM, Zod
**Storage**: PostgreSQL 17 with pgvector (Drizzle ORM) + Redis 7 (BullMQ + Streams)
**Testing**: Vitest (unit/integration) + Playwright (E2E) + Testcontainers (Redis/PostgreSQL)
**Target Platform**: Linux cloud VM (EC2/GCE/DigitalOcean), Docker Compose
**Project Type**: Monorepo (pnpm workspaces + Turborepo) — orchestrator service + Next.js dashboard + agent runtime + discord bot + shared types
**Performance Goals**: 99.9% uptime (SC-001), agent spawn <60s (SC-002), dashboard load <3s (SC-006), 20+ concurrent agents (SC-003)
**Constraints**: Single operator, single VM, cloud-only, no custom LLM training
**Scale/Scope**: 20 concurrent agents initial milestone, elastic beyond; 5 monorepo packages; ~15 dashboard pages; ~30 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. DRY | PASS | Shared types package (`packages/shared`) eliminates duplication across orchestrator, dashboard, agent-runtime, and discord-bot. Message schemas, entity types, and constants defined once. |
| II. YAGNI | PASS | Implementation phased by priority (P1 → P2 → P3). No speculative abstractions. TODO comments for future enhancements. |
| III. Testability | PASS | Side effects at boundaries (DB, Redis, E2B, LLM APIs). Core logic (budget checks, state machines, message routing) is pure and testable. Testcontainers for integration tests. |
| IV. Readability | PASS | ~30 line function guideline, <3 nesting depth. Feature-based directory structure with clear naming. |
| V. Idiomatic Code | PASS | TypeScript idioms, ESM modules, async/await, Drizzle for SQL, Zod for validation. Vitest + Playwright are ecosystem-standard. |
| VI. File Decomposition | PASS | ~300 line file limit. Feature-based directories within each package. Monorepo enforces separation of concerns. |
| VII. Living Documentation | PASS | CLAUDE.md as canonical entry point. Plan, research, data-model, contracts, quickstart artifacts maintained alongside code. |

**Pre-Phase 0 gate: PASSED** — No violations.

### Post-Phase 1 Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. DRY | PASS | Data model types defined once in `shared/types`, Drizzle schema is single source of truth for DB shape. Message schemas (Zod) shared between orchestrator and agent-runtime. |
| II. YAGNI | PASS | All entities in data-model.md trace to specific FRs. No speculative tables or fields. |
| III. Testability | PASS | All API endpoints testable via HTTP. Redis messaging testable with consumer/producer patterns. E2B sandbox operations mockable at SDK boundary. |
| IV. Readability | PASS | API contract documents make interfaces discoverable. Data model uses standard relational patterns. |
| V. Idiomatic Code | PASS | Drizzle schema follows TypeScript ORM conventions. REST API follows standard patterns. SSE uses native Web APIs. |
| VI. File Decomposition | PASS | 5 packages, feature-based directory structure within each. No monolithic files anticipated. |
| VII. Living Documentation | PASS | Plan, research, data-model, contracts, quickstart all created. CLAUDE.md to be created during implementation. |

**Post-Phase 1 gate: PASSED** — No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-orchestrator/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Setup and development guide
├── contracts/
│   ├── api.md           # Phase 1: Dashboard REST + SSE API
│   └── discord.md       # Phase 1: Discord bot contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── orchestrator/              # Core orchestrator service (Node.js)
│   ├── src/
│   │   ├── agents/            # Agent lifecycle (spawn, pause, resume, terminate)
│   │   ├── comms/             # Redis messaging (BullMQ queues + Streams)
│   │   ├── db/                # Drizzle schema, migrations, queries
│   │   ├── heartbeat/         # Heartbeat scheduler (FR-021)
│   │   ├── memory/            # Memory system (write, read, recall, consolidate)
│   │   ├── secrets/           # Secret vault + proxy (FR-006, FR-026)
│   │   ├── skills/            # Skill registry + lifecycle (FR-022)
│   │   ├── financial/         # Ledger, budget enforcement, cost tracking
│   │   ├── security/          # Prompt injection scanning, integrity checks
│   │   ├── health/            # /health endpoint (FR-030)
│   │   └── index.ts           # Entry point
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── dashboard/                 # Next.js management dashboard
│   ├── src/
│   │   ├── app/               # App Router (pages + API routes)
│   │   │   ├── api/           # REST + SSE endpoints
│   │   │   ├── (auth)/        # Auth pages (login, setup wizard)
│   │   │   ├── agents/        # Agent management pages
│   │   │   ├── definitions/   # Agent definition builder
│   │   │   ├── pipelines/     # Pipeline management
│   │   │   ├── financial/     # Financial dashboard
│   │   │   ├── skills/        # Skill observability
│   │   │   ├── alerts/        # Alert management
│   │   │   ├── identities/    # Identity registry
│   │   │   ├── secrets/       # Secret vault management
│   │   │   ├── settings/      # System configuration
│   │   │   └── layout.tsx     # Root layout
│   │   ├── components/        # React components
│   │   └── lib/               # Client utilities (SSE hooks, auth)
│   └── tests/
│       └── e2e/               # Playwright E2E tests
│
├── agent-runtime/             # Agent process (runs inside E2B sandbox)
│   ├── src/
│   │   ├── loop/              # LLM call loop + tool execution
│   │   ├── tools/             # Built-in tool definitions
│   │   ├── memory/            # Agent-side memory operations
│   │   ├── comms/             # Redis messaging (agent side)
│   │   └── index.ts           # Entry point
│   └── tests/
│
├── discord-bot/               # Discord bot service
│   ├── src/
│   │   ├── commands/          # Slash command handlers
│   │   ├── handlers/          # Message + interaction handlers
│   │   └── index.ts           # Entry point
│   └── tests/
│
└── shared/                    # Shared types + utilities
    ├── src/
    │   ├── types/             # Entity types, enums, interfaces
    │   ├── schemas/           # Zod validation schemas (messages, configs)
    │   └── constants/         # Shared constants (defaults, limits)
    └── package.json

drizzle/                       # Database migrations
docker-compose.yml             # PostgreSQL + Redis + all services
pnpm-workspace.yaml
turbo.json
vitest.workspace.ts
CLAUDE.md                      # Dev guidance entry point
```

**Structure Decision**: Monorepo with 5 packages. The orchestrator + dashboard + agent-runtime + discord-bot share types via `packages/shared`. This matches the TypeScript-everywhere architecture while maintaining clear separation of concerns. Each package has its own build, test, and runtime configuration.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 5 monorepo packages (exceeds typical 3) | Orchestrator, dashboard, agent-runtime, discord-bot, and shared types serve fundamentally different deployment targets (long-running process, Next.js app, E2B sandbox process, Discord service, library) | Combining any two would violate single-responsibility and create deployment coupling. Agent-runtime must be independently deployable into E2B sandboxes. Discord-bot has its own process lifecycle. |

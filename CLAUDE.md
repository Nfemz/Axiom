# Axiom Development Guidelines

## Project Overview

Autonomous agent orchestrator platform. Monorepo with 5 packages.

## Project Structure

```text
packages/
├── orchestrator/     # Core orchestrator (Node.js long-running process)
├── dashboard/        # Next.js 15 App Router management UI
├── agent-runtime/    # Agent process (runs in E2B sandboxes)
├── discord-bot/      # Discord bot for operator interaction
└── shared/           # Shared types, schemas, constants, utilities
drizzle/              # Database migrations
deploy/               # systemd service files
specs/                # Feature specifications and plans
```

## Tech Stack

- **Language**: TypeScript 5.x, Node.js 22 LTS, ESM modules
- **Monorepo**: pnpm workspaces + Turborepo
- **Database**: PostgreSQL 17 + pgvector (Drizzle ORM)
- **Message Broker**: Redis 7 (BullMQ queues + Redis Streams via ioredis)
- **Agent Sandbox**: E2B SDK + @e2b/desktop
- **LLM**: Vercel AI SDK (multi-provider: Anthropic, OpenAI, Google)
- **Dashboard**: Next.js 15, React, iron-session, SSE
- **Auth**: WebAuthn/Passkey (@simplewebauthn)
- **Validation**: Zod v4 (note: `z.record()` requires two args)
- **Testing**: Vitest + Playwright + Testcontainers
- **Discord**: discord.js

## Commands

```bash
pnpm dev              # Start all services (Turborepo)
pnpm build            # Build all packages
pnpm test             # Run all tests (Vitest)
pnpm test:e2e         # Run E2E tests (Playwright)
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio
pnpm format           # Format with Prettier
pnpm lint             # Lint with ESLint
```

## Code Style

- ESM modules (`"type": "module"`)
- Strict TypeScript
- ~30 line function guideline, <3 nesting depth
- ~300 line file limit
- Const objects with `as const` for enums (see `packages/shared/src/types/enums.ts`)
- Zod v4 schemas for all validation
- Structured JSON logging via `createLogger()` from `@axiom/shared`

## Key Patterns

- **Workspace imports**: Use `@axiom/shared` for shared types/schemas/constants
- **DB queries**: Use Drizzle ORM helpers in `packages/orchestrator/src/db/queries.ts`
- **Redis messaging**: BullMQ for job queues, Redis Streams for real-time agent comms
- **Agent state machine**: Valid transitions defined in `VALID_STATUS_TRANSITIONS`
- **Encryption**: AES-256-GCM via `packages/shared/src/crypto.ts`

## Design Artifacts

- Spec: `specs/001-agent-orchestrator/spec.md`
- Plan: `specs/001-agent-orchestrator/plan.md`
- Data model: `specs/001-agent-orchestrator/data-model.md`
- API contracts: `specs/001-agent-orchestrator/contracts/api.md`
- Discord contract: `specs/001-agent-orchestrator/contracts/discord.md`
- Tasks: `specs/001-agent-orchestrator/tasks.md`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

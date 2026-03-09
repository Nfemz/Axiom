# Quickstart: Autonomous Agent Orchestrator Platform

**Date**: 2026-03-07 | **Branch**: `001-agent-orchestrator`

## Prerequisites

- Node.js 22 LTS
- pnpm 9+
- Docker & Docker Compose
- E2B API key ([e2b.dev](https://e2b.dev))
- At least one AI provider API key (Anthropic, OpenAI, etc.)
- Discord bot token (for operator communication)

## Repository Structure

```text
axiom/
├── packages/
│   ├── orchestrator/          # Core orchestrator service
│   │   ├── src/
│   │   │   ├── agents/        # Agent lifecycle management
│   │   │   ├── comms/         # Redis messaging (BullMQ + Streams)
│   │   │   ├── db/            # Drizzle schema + migrations
│   │   │   ├── heartbeat/     # Heartbeat scheduler
│   │   │   ├── memory/        # Memory system (write/read/recall)
│   │   │   ├── secrets/       # Secret vault + proxy
│   │   │   ├── skills/        # Skill registry + lifecycle
│   │   │   ├── financial/     # Ledger + budget enforcement
│   │   │   └── index.ts       # Entry point
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── dashboard/             # Next.js management dashboard
│   │   ├── src/
│   │   │   ├── app/           # App Router pages + API routes
│   │   │   ├── components/    # React components
│   │   │   └── lib/           # Shared utilities
│   │   └── package.json
│   │
│   ├── agent-runtime/         # Agent process (runs inside E2B sandbox)
│   │   ├── src/
│   │   │   ├── loop/          # LLM call loop + tool execution
│   │   │   ├── tools/         # Tool definitions + execution
│   │   │   ├── memory/        # Agent-side memory operations
│   │   │   ├── comms/         # Redis messaging (agent side)
│   │   │   └── index.ts       # Entry point
│   │   └── package.json
│   │
│   ├── discord-bot/           # Discord bot service
│   │   ├── src/
│   │   │   ├── commands/      # Slash command handlers
│   │   │   ├── handlers/      # Message + interaction handlers
│   │   │   └── index.ts       # Entry point
│   │   └── package.json
│   │
│   └── shared/                # Shared types + utilities
│       ├── src/
│       │   ├── types/         # Shared TypeScript types
│       │   ├── schemas/       # Zod schemas (message validation)
│       │   └── constants/     # Shared constants
│       └── package.json
│
├── docker-compose.yml         # PostgreSQL + Redis + orchestrator + dashboard
├── drizzle/                   # DB migrations
├── pnpm-workspace.yaml
├── turbo.json
├── vitest.workspace.ts
└── CLAUDE.md
```

## Local Development

```bash
# 1. Clone and install
git clone <repo>
cd axiom
pnpm install

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Run migrations
pnpm --filter orchestrator db:migrate

# 4. Configure environment
cp .env.example .env
# Set: E2B_API_KEY, ANTHROPIC_API_KEY, DISCORD_BOT_TOKEN, DATABASE_URL, REDIS_URL

# 5. Start services (dev mode)
pnpm dev  # Starts orchestrator + dashboard + discord-bot concurrently
```

## Production Deployment

```bash
# On your cloud VM (EC2, GCE, DigitalOcean)
docker compose up -d

# Services started:
# - PostgreSQL 17 (pgvector) on :5432
# - Redis 7 on :6379
# - Orchestrator on :3001
# - Dashboard (Next.js) on :3000
# - Discord bot (background service)
```

## First Run

1. Navigate to `https://your-server:3000`
2. Setup wizard guides you through:
   - Passkey registration (WebAuthn)
   - AI provider API key configuration
   - Payment method setup
   - Discord webhook configuration
   - Test agent spawn to verify end-to-end

## Key Commands

```bash
pnpm dev                          # Start all services in dev mode
pnpm build                        # Build all packages
pnpm test                         # Run all tests (Vitest)
pnpm test:e2e                     # Run E2E tests (Playwright)
pnpm --filter orchestrator dev    # Start orchestrator only
pnpm --filter dashboard dev       # Start dashboard only
pnpm db:migrate                   # Run database migrations
pnpm db:studio                    # Open Drizzle Studio (DB browser)
```

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (Node.js 22 LTS) |
| Monorepo | pnpm workspaces + Turborepo |
| Orchestrator | Node.js long-running process |
| Dashboard | Next.js 15 + React |
| Agent Runtime | Custom Node.js process in E2B sandbox |
| LLM SDK | Vercel AI SDK (multi-provider) |
| Database | PostgreSQL 17 + pgvector (Drizzle ORM) |
| Message Broker | Redis 7 (BullMQ + Streams via ioredis) |
| Agent Sandbox | E2B cloud-native sandboxes |
| Discord | discord.js |
| Browser Automation | Playwright (inside E2B) |
| Auth | WebAuthn/Passkey (@simplewebauthn) |
| Real-time | SSE (native ReadableStream) |
| Testing | Vitest + Playwright + Testcontainers |
| Deployment | Docker Compose on single cloud VM |
| Process Supervisor | systemd |

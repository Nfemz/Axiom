# Project Conventions

## Directory Structure

```text
packages/
├── orchestrator/     # Core orchestrator (Node.js long-running process)
├── dashboard/        # Next.js 15 App Router management UI
├── agent-runtime/    # Agent process (runs in E2B sandboxes)
├── discord-bot/      # Discord bot for operator interaction
└── shared/           # Shared types, schemas, constants, utilities
drizzle/              # Database migrations (Drizzle Kit output)
deploy/               # systemd service files
specs/                # Feature specifications and plans
docs/                 # LLM-consumed reference docs (300-line limit)
.claude/              # Claude Code config (settings, commands, skills)
```

## Package Layout

Every package follows this structure:

```text
packages/<name>/
├── src/              # Source code
│   ├── index.ts      # Entry point
│   └── <domain>/     # Domain-grouped modules
├── tests/
│   ├── unit/         # Unit tests mirroring src/
│   ├── integration/  # Integration tests (Testcontainers)
│   └── fixtures/     # Shared test data factories
├── package.json
├── tsconfig.json
└── biome.jsonc       # (if overriding root config)
```

Tests live in `tests/` directories — **never co-located with source**.

## File Naming

| Extension | Convention | Examples |
|-----------|-----------|---------|
| `.ts` | kebab-case | `spawn-worker.ts`, `inbox-consumer.ts`, `budget.ts` |
| `.tsx` | kebab-case | `agent-card.tsx`, `sidebar.tsx` |
| `.test.ts` | `<module>.test.ts` | `budget.test.ts`, `vault.test.ts` |
| Directories | kebab-case | `agent-runtime/`, `discord-bot/` |

Special file suffixes:

| Suffix | Purpose | Example |
|--------|---------|---------|
| None (plain) | Standard module | `budget.ts`, `vault.ts` |
| `.test.ts` | Test file | `budget.test.ts` |
| `route.ts` | Next.js API route | `app/api/agents/route.ts` |
| `page.tsx` | Next.js page | `app/agents/page.tsx` |
| `layout.tsx` | Next.js layout | `app/layout.tsx` |

## Imports

- **Cross-package**: `import { ... } from "@axiom/shared"` — always use the workspace alias.
- **Dashboard internals**: Use `@/` path alias (maps to `src/`).
- **Within a package**: Relative imports with `.js` extension for non-bundled packages (orchestrator, agent-runtime, discord-bot). Dashboard (Next.js) does not need `.js` extensions.

```typescript
// Cross-package
import { createLogger, AgentStatus } from "@axiom/shared";

// Dashboard internal
import { getDb } from "@/lib/db";

// Relative within orchestrator (ESM — use .js extension)
import { startSpawnWorker } from "./agents/spawn-worker.js";
```

## Environment Variables

All env vars validated at startup via Zod schema in `packages/orchestrator/src/config.ts`. App crashes immediately on invalid config.

**Adding a new env var requires updating three places:**
1. Zod schema in `config.ts`
2. `.env.example` with placeholder value
3. Relevant doc (this file or `§ docs/architecture.md`)

### Variable Groups

| Group | Variables | Required |
|-------|-----------|----------|
| Database | `DATABASE_URL`, `DATABASE_SSL` | Yes, No |
| Redis | `REDIS_URL`, `REDIS_TLS` | Yes, No |
| E2B | `E2B_API_KEY` | Yes |
| AI Providers | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `OPENROUTER_API_KEY` | At least one |
| Discord | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` | No |
| Security | `ENCRYPTION_KEY` (min 32 chars) | Yes |
| WebAuthn | `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN` | Yes (defaults provided) |
| Session | `SESSION_SECRET` (min 32 chars) | No |
| Server | `ORCHESTRATOR_PORT`, `DASHBOARD_PORT` | No (defaults: 3001, 3000) |
| Dashboard | `ORCHESTRATOR_URL` | No (fallback: `http://localhost:3001`) |
| Runtime | `NODE_ENV`, `LOG_LEVEL` | No (defaults: development, info) |

## Config Patterns

- **Docker**: `docker-compose.yml` provides PostgreSQL 17 (pgvector) and Redis 7 for local dev.
- **Turborepo**: `turbo.json` defines task dependencies. `build` depends on `^build` (package deps first).
- **TypeScript**: Root `tsconfig.json` with strict mode, ES2023 target, ESNext modules. Each package extends it.
- **Biome**: Root `biome.jsonc` extends Ultracite presets. Custom rules allow barrel exports (shared) and namespace imports (Drizzle schema).

## Workspace Scripts

```bash
pnpm dev              # Start all services via Turborepo
pnpm build            # Build all packages
pnpm test             # Run all Vitest tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Open Drizzle Studio (TTY required — not for Claude Code)
pnpm lint             # Check with Biome/Ultracite
pnpm fix              # Auto-fix lint + format issues
```

`pnpm db:studio` requires a TTY — do not run from Claude Code.

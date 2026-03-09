# Axiom

Autonomous agent orchestration platform — TypeScript monorepo (pnpm + Turborepo) with PostgreSQL, Redis, E2B sandboxes, Vercel AI SDK, Next.js 15 dashboard, and Discord bot.

## Documentation

Read these docs for patterns, rules, and how things connect.

| Doc | What it covers |
|-----|----------------|
| @docs/architecture.md | System overview, package structure, dependency graph, request lifecycle, subsystems, infrastructure |
| @docs/conventions/project.md | File naming, directory conventions, config patterns, env vars, package structure |
| @docs/conventions/code-style.md | TypeScript style rules, Biome/Ultracite, framework patterns, performance, security |
| @docs/conventions/testing.md | Test strategy, tiers (unit/integration/E2E), TDD workflow, quality rules |
| @docs/data-layer.md | Drizzle ORM schema, migrations, query patterns, pgvector usage |
| @docs/api-patterns.md | API routes, error handling, middleware, SSE streaming, Zod validation |

## Quick Rules

### Formatting & Linting

- **Formatter**: Ultracite (Biome) auto-fixes on save (PostToolUse hook) and pre-commit. Run `pnpm fix` to fix all. Run `pnpm lint` to check.
- **Lint issues**: Fix the actual error — suppression comments are rarely appropriate.
- **Markdown**: All fenced code blocks must have a language specifier — never bare triple backticks. Surround tables with blank lines.

### Naming & Style

- **Naming**: Use full words — `context` not `c`, `request` not `req`, `response` not `res`. No single-letter abbreviations except loop counters.
- **ESM**: All packages use `"type": "module"`. Import with `.js` extensions in non-bundled packages.
- **Enums**: Use const objects with `as const` and derive types. See `packages/shared/src/types/enums.ts`.
- **Functions**: ~30 lines max, <3 nesting depth. Extract early.
- **Files**: ~300 line limit. Split into subdirectories when over.
- **Imports**: Use `@axiom/shared` for shared types, schemas, constants, crypto, logger.
- **No inline helpers**: Never define utility functions inside component bodies or handlers. Extract to module-level.

### TypeScript

- **Strict mode**: Enabled globally. No `any` — use `unknown` when type is genuinely unknown.
- **Arrow functions**: For callbacks and short functions. Named `function` declarations for top-level exports.
- **Loops**: Prefer `for...of` over `.forEach()` and indexed `for` loops.
- **Const**: Default to `const`. Use `let` only when reassignment is needed. Never `var`.
- **Zod v4**: `z.record()` requires two args. All validation through Zod schemas.

### Database & ORM

- **ORM**: Drizzle ORM. Schema in `packages/orchestrator/src/db/schema.ts`.
- **Queries**: Use helpers in `packages/orchestrator/src/db/queries.ts`. See `§ docs/data-layer.md`.
- **Migrations**: `drizzle/` directory. Run `pnpm db:migrate`. Never edit existing migrations.
- **Vectors**: pgvector with 1536 dimensions for embeddings.

### Redis & Messaging

- **Job queues**: BullMQ via `packages/orchestrator/src/comms/queues.ts`.
- **Real-time**: Redis Streams via `packages/orchestrator/src/comms/streams.ts`.
- **Connection**: ioredis pooling in `packages/orchestrator/src/comms/redis.ts`.

### API & Dashboard

- **Dashboard**: Next.js 15 App Router with Server Components. See `§ docs/api-patterns.md`.
- **Auth**: WebAuthn/Passkey via @simplewebauthn. Sessions via iron-session.
- **SSE**: Server-sent events at `/api/stream/` endpoints for real-time updates.
- **Validation**: All request bodies validated with Zod schemas from `@axiom/shared`.
- **Images**: Use Next.js `<Image>` component, never `<img>`.
- **Deep links**: Every view must have a unique, shareable URL with all context in the route path.

### Agent Runtime

- **Sandbox**: Agents run in E2B sandboxes, never locally.
- **State machine**: Transitions defined in `VALID_STATUS_TRANSITIONS` from `@axiom/shared`.
- **Encryption**: AES-256-GCM via `@axiom/shared/crypto` for secrets.

### Testing

- **Framework**: Vitest for unit + integration. Playwright for E2E. Testcontainers for infra.
- **Location**: Tests in `tests/` directories mirroring `src/` — NOT co-located with source.
- **TDD**: Default workflow — RED (failing test) → GREEN (minimal pass) → REFACTOR.
- **Names**: Describe behavior — `rejects expired token` not `test auth`.
- **Independence**: No shared mutable state, no ordering dependencies.
- **Mocks**: Only mock external boundaries. Prefer real code paths.
- **Run**: `pnpm test` (all unit), `pnpm test:e2e` (Playwright).

### Logging

- **Logger**: `createLogger(context)` from `@axiom/shared`. Structured JSON output.
- **No console.log**: Use the logger. Remove `console.log`, `debugger`, `alert` from production code.

### Git & Workflow

- **Commits**: Do NOT include `Co-Authored-By: Claude` trailers.
- **PRs**: Do NOT include "Test plan" sections or "Generated with Claude Code" footers.
- **Pre-existing errors**: Never defer broken tests or types during refactoring. Fix in the same changeset.
- **Plan files**: NEVER write plan files or design docs inside the codebase. Use Claude Code plan mode or the memory directory.

### Env Vars

- **Validation**: Zod schema in `packages/orchestrator/src/config.ts`. App crashes on invalid config.
- **Adding a var**: Update (1) Zod schema, (2) `.env.example`, (3) relevant docs.
- **Secrets**: Never commit `.env`. Use `.env.example` with placeholders.

### Doc Maintenance

- **Doc file size limit**: All LLM-consumed files (`docs/`, `.claude/`) must stay under 300 lines. Split into subdirectories when over.
- **Living docs**: When a pattern changes, update docs in the same changeset.
- **Cross-reference**: Use `§ Section Name` notation instead of duplicating content.

### Performance & Optimization

- **Memoization**: Only when profiling shows measurable value. Never as a default pattern.
- **No premature abstraction**: Three similar lines > one premature helper.

## Commands

```bash
pnpm dev              # Start all services (Turborepo)
pnpm build            # Build all packages
pnpm test             # Run all Vitest tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Open Drizzle Studio (TTY required)
pnpm lint             # Check with Biome/Ultracite
pnpm fix              # Auto-fix lint + format
```

## Claude Code Environment

`.claude/.env` holds developer tooling credentials (gitignored). Each developer creates their own from `.claude/.env.example`.

No credentials currently required. Add rows here as tooling integrations are added.

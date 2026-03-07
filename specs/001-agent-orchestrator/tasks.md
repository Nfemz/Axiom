# Tasks: Autonomous Agent Orchestrator Platform

**Input**: Design documents from `/specs/001-agent-orchestrator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/discord.md, quickstart.md

**Tests**: Test tasks are included per constitution Principle III (Testability).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/orchestrator/src/`, `packages/dashboard/src/`, `packages/agent-runtime/src/`, `packages/discord-bot/src/`, `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization, tooling, and infrastructure configuration

- [ ] T001 Initialize pnpm workspace with `pnpm-workspace.yaml` defining packages/orchestrator, packages/dashboard, packages/agent-runtime, packages/discord-bot, packages/shared
- [ ] T002 Configure Turborepo with `turbo.json` for build/dev/test/lint pipelines across all 5 packages
- [ ] T003 [P] Create root `tsconfig.json` with base TypeScript 5.x config (ESM, strict, path aliases) and per-package `tsconfig.json` extending it
- [ ] T004 [P] Create root `vitest.workspace.ts` configuring Vitest for all packages
- [ ] T005 [P] Configure ESLint and Prettier at root with per-package overrides
- [ ] T005a [P] Create initial `CLAUDE.md` at repo root with development guidance routing (commands, code style, project structure, links to spec/plan artifacts). Update incrementally as implementation progresses.
- [ ] T006 Create `docker-compose.yml` with PostgreSQL 17 (pgvector/pgvector:pg17) on :5432, Redis 7 on :6379, volume mounts, and healthchecks
- [ ] T007 Create `.env.example` with all required environment variables (DATABASE_URL, REDIS_URL, E2B_API_KEY, ANTHROPIC_API_KEY, DISCORD_BOT_TOKEN, ENCRYPTION_KEY, etc.)
- [ ] T008 [P] Scaffold `packages/shared/` with `package.json`, `src/types/`, `src/schemas/`, `src/constants/` directories and barrel exports
- [ ] T009 [P] Scaffold `packages/orchestrator/` with `package.json`, `src/` directory structure per plan.md (agents/, comms/, db/, heartbeat/, memory/, secrets/, skills/, financial/, security/, health/)
- [ ] T010 [P] Scaffold `packages/dashboard/` with Next.js 15 App Router, `package.json`, `src/app/`, `src/components/`, `src/lib/`
- [ ] T011 [P] Scaffold `packages/agent-runtime/` with `package.json`, `src/` directory structure (loop/, tools/, memory/, comms/)
- [ ] T012 [P] Scaffold `packages/discord-bot/` with `package.json`, `src/` directory structure (commands/, handlers/)
- [ ] T013 Install all primary dependencies across packages per plan.md (E2B SDK, Vercel AI SDK, BullMQ, ioredis, discord.js, Playwright, drizzle-orm, drizzle-kit, zod, @simplewebauthn/server, @simplewebauthn/browser, iron-session)

**Checkpoint**: Monorepo builds, `pnpm dev` starts all packages, `docker compose up -d postgres redis` runs infrastructure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T014 Define shared entity types (Agent, AgentDefinition, AgentMemory, AgentSession, Checkpoint, SharedKnowledgeEntry, Skill, AuditLogEntry, FinancialTransaction, LLMUsageLog, Identity, Secret, Pipeline, AlertRule, AlertEvent, OperatorCredential, SystemConfig) in `packages/shared/src/types/entities.ts`
- [ ] T015 [P] Define shared enums (AgentStatus, MemoryType, SkillStatus, AlertSeverity, IdentityType, SecretType, PipelineStatus, TransactionType, AuditOutcome) in `packages/shared/src/types/enums.ts`
- [ ] T016 [P] Define Zod validation schemas for agent-to-orchestrator and orchestrator-to-agent message types per contracts/api.md in `packages/shared/src/schemas/messages.ts`
- [ ] T017 [P] Define Zod schemas for API request/response payloads (spawn agent, control agent, create definition, etc.) in `packages/shared/src/schemas/api.ts`
- [ ] T018 [P] Define shared constants (default heartbeat interval, default revenue split, budget defaults, status transition rules) in `packages/shared/src/constants/defaults.ts`
- [ ] T019 Configure Drizzle ORM with PostgreSQL + pgvector in `packages/orchestrator/src/db/drizzle.ts` (connection pool, pgvector custom type)
- [ ] T020 Create Drizzle schema for all entities per data-model.md in `packages/orchestrator/src/db/schema.ts` (tables, relations, indexes including HNSW on vector columns, GIN on array/JSONB columns)
- [ ] T021 Generate initial Drizzle migration in `drizzle/` directory and verify it runs against Docker PostgreSQL
- [ ] T022 [P] Create Redis/ioredis connection module with `maxRetriesPerRequest: null` and keepalive config in `packages/orchestrator/src/comms/redis.ts`
- [ ] T023 [P] Create BullMQ queue definitions (agent:spawn, agent:results, heartbeat, backup, memory:consolidation) in `packages/orchestrator/src/comms/queues.ts`
- [ ] T024 [P] Create Redis Streams helper (publish, subscribe with consumer groups, XACK) in `packages/orchestrator/src/comms/streams.ts`
- [ ] T025 Create base database query helpers (CRUD operations for Agent, AgentDefinition, SystemConfig) in `packages/orchestrator/src/db/queries.ts`
- [ ] T026 [P] Create structured logger module in `packages/shared/src/logger.ts`
- [ ] T027 [P] Create environment config loader with Zod validation for all env vars in `packages/orchestrator/src/config.ts`
- [ ] T027a [P] Configure TLS for Redis and PostgreSQL connections (FR-005): enable TLS on ioredis connection in `packages/orchestrator/src/comms/redis.ts`, enable SSL on Drizzle/PostgreSQL connection in `packages/orchestrator/src/db/drizzle.ts`, and document TLS cert provisioning in quickstart.md
- [ ] T027b [P] Implement AES-256 encryption utilities for data-at-rest (FR-005) in `packages/shared/src/crypto.ts` — key derivation from ENCRYPTION_KEY env var, encrypt/decrypt helpers used by secrets vault and sensitive DB fields

### Phase 2 Tests

- [ ] T027c [P] Unit tests for shared types, schemas, and constants — verify Zod schemas validate/reject correctly, enum exhaustiveness, constant values in `packages/shared/tests/`
- [ ] T027d [P] Integration tests for DB connection, migrations, and base CRUD queries using Testcontainers (PostgreSQL) in `packages/orchestrator/tests/integration/db.test.ts`
- [ ] T027e [P] Integration tests for Redis connection, BullMQ queue creation, and Streams pub/sub using Testcontainers (Redis) in `packages/orchestrator/tests/integration/redis.test.ts`
- [ ] T027f [P] Unit tests for encryption utilities (AES-256 encrypt/decrypt round-trip, key derivation) in `packages/shared/tests/crypto.test.ts`

**Checkpoint**: Foundation ready — shared types compile, DB migrations run, Redis connects, BullMQ queues initialize

---

## Phase 3: User Story 1 — Deploy and Start the Orchestrator (Priority: P1) MVP

**Goal**: Operator deploys the orchestrator, it boots, passes health checks, and the dashboard shows system status with passkey auth

**Independent Test**: Deploy orchestrator, verify it starts, health checks pass, access dashboard, see system status

### Implementation for User Story 1

- [ ] T028 [US1] Implement orchestrator entry point with graceful startup/shutdown, signal handling (SIGTERM/SIGINT), and process lifecycle in `packages/orchestrator/src/index.ts`
- [ ] T029 [US1] Implement `/health` endpoint returning orchestrator/redis/postgresql status per contracts/api.md in `packages/orchestrator/src/health/handler.ts`
- [ ] T030 [US1] Implement heartbeat scheduler (configurable interval, active hours, cheap-checks-first pattern per FR-021) in `packages/orchestrator/src/heartbeat/scheduler.ts`
- [ ] T031 [US1] Implement heartbeat check logic with three-layer liveness detection per FR-012a: (1) heartbeat timeout for hang detection, (2) resource/cost heuristics (CPU, memory, LLM spend rate) for infinite loop detection, (3) periodic LLM self-assessment for subtle stall detection. Also check pipeline progress and pending approvals. Configurable thresholds and remediation actions (kill, restart, escalate) per agent. File: `packages/orchestrator/src/heartbeat/checks.ts`
- [ ] T032 [P] [US1] Create Next.js root layout with sidebar navigation, dark/light theme, and responsive shell in `packages/dashboard/src/app/layout.tsx`
- [ ] T033 [P] [US1] Implement WebAuthn registration flow (generate challenge, verify response, store credential) in `packages/dashboard/src/app/api/auth/register/route.ts`
- [ ] T034 [P] [US1] Implement WebAuthn login flow (generate challenge, verify response, create iron-session) in `packages/dashboard/src/app/api/auth/login/route.ts`
- [ ] T035 [US1] Implement auth middleware that protects all `/api/*` routes except `/api/auth/*` and `/health` in `packages/dashboard/src/lib/auth-middleware.ts`
- [ ] T036 [US1] Implement setup wizard API (get state, advance step) for first-run flow (FR-029) in `packages/dashboard/src/app/api/system/setup/route.ts`
- [ ] T037 [US1] Implement setup wizard UI (passkey registration, API key config, payment method, Discord webhook, test agent spawn) in `packages/dashboard/src/app/(auth)/setup/page.tsx`
- [ ] T038 [US1] Implement login page with passkey authentication in `packages/dashboard/src/app/(auth)/login/page.tsx`
- [ ] T039 [US1] Implement system config API (GET/PATCH) in `packages/dashboard/src/app/api/system/config/route.ts`
- [ ] T040 [US1] Implement dashboard home page showing system health, uptime, active agent count, and resource summary in `packages/dashboard/src/app/page.tsx`
- [ ] T041 [US1] Implement SSE infrastructure — base ReadableStream helper with auth check and `force-dynamic` in `packages/dashboard/src/lib/sse.ts`
- [ ] T042 [US1] Implement client-side SSE hook (`useSSE`) for real-time dashboard updates in `packages/dashboard/src/lib/use-sse.ts`
- [ ] T043 [US1] Create systemd service unit file for orchestrator process supervision with watchdog in `deploy/axiom-orchestrator.service`
- [ ] T044 [US1] Add orchestrator + dashboard services to `docker-compose.yml` with build contexts, health checks, and dependency ordering
- [ ] T044a [US1] Implement uptime tracking and reporting (SC-001): record health check results over time, compute rolling 30-day uptime percentage, surface on dashboard home page (T040) and `/health` response. File: `packages/orchestrator/src/health/uptime-tracker.ts`

### Phase 3 Tests

- [ ] T044b [P] [US1] Unit tests for health endpoint logic (orchestrator/redis/pg status aggregation) in `packages/orchestrator/tests/unit/health.test.ts`
- [ ] T044c [P] [US1] Unit tests for heartbeat scheduler (interval timing, cheap-checks-first order, active hours filtering) and three-layer check logic in `packages/orchestrator/tests/unit/heartbeat.test.ts`
- [ ] T044d [P] [US1] Integration tests for WebAuthn registration/login flow (challenge generation, credential verification, session creation) in `packages/dashboard/tests/integration/auth.test.ts`
- [ ] T044e [US1] E2E test: full setup wizard flow — passkey registration through test agent spawn — using Playwright in `packages/dashboard/tests/e2e/setup-wizard.spec.ts`

**Checkpoint**: Orchestrator starts, `/health` returns healthy, dashboard loads, passkey auth works, setup wizard completes, system status visible

---

## Phase 4: User Story 2 — Spawn and Manage Specialized Agents (Priority: P1)

**Goal**: Orchestrator spawns agents in E2B sandboxes, tracks their lifecycle, supports pause/resume/terminate, and agents communicate via Redis

**Independent Test**: Submit a goal, agent spawns in E2B sandbox, monitor progress, pause/resume/terminate cleanly

### Implementation for User Story 2

- [ ] T045 [US2] Implement agent state machine (spawning/running/paused/suspended/error/terminated transitions with validation) in `packages/orchestrator/src/agents/state-machine.ts`. Paused = operator-requested temporary halt (context preserved in sandbox, resume instantly). Suspended = idle agent compute freed (E2B sandbox paused, resume requires sandbox restore from checkpoint per FR-015). Terminated = final state.
- [ ] T046 [US2] Implement E2B sandbox lifecycle (create sandbox, inject context files + env vars, connect, pause, resume, kill) in `packages/orchestrator/src/agents/sandbox.ts`
- [ ] T047 [US2] Implement agent spawn service (create DB record, spawn sandbox, start agent-runtime, wire Redis channels) in `packages/orchestrator/src/agents/spawn.ts`
- [ ] T048 [US2] Implement agent lifecycle service (pause, resume, suspend, unsuspend, terminate, resteer with state transitions and audit logging) in `packages/orchestrator/src/agents/lifecycle.ts`. Include auto-suspend logic: idle agents (goal complete, no continuous-presence flag) are suspended to free compute per FR-015, and resumed on demand when new work arrives or pipeline stage triggers.
- [ ] T049 [US2] Implement BullMQ spawn worker (process agent:spawn queue, handle retries per agent retry_policy) in `packages/orchestrator/src/agents/spawn-worker.ts`
- [ ] T050 [US2] Implement orchestrator inbox consumer (process agent→orchestrator messages: progress, decision-request, escalation, budget-request, complete, error, heartbeat) in `packages/orchestrator/src/comms/inbox-consumer.ts`
- [ ] T051 [US2] Implement orchestrator outbox publisher (send orchestrator→agent messages: resteer, pause, resume, terminate, decision-response) in `packages/orchestrator/src/comms/outbox-publisher.ts`
- [ ] T052 [P] [US2] Implement agent-runtime entry point (connect to Redis, receive initial context, start LLM loop, handle orchestrator messages) in `packages/agent-runtime/src/index.ts`
- [ ] T053 [P] [US2] Implement agent-runtime Redis comms (subscribe to agent:{id}:inbox, publish to orchestrator:inbox, heartbeat sender) in `packages/agent-runtime/src/comms/redis-client.ts`
- [ ] T054 [US2] Implement agent LLM call loop (Vercel AI SDK generateText, tool call cycle, budget check per turn, autonomous external failure recovery per FR-012b — agent determines own retry/workaround strategy for rate-limits, blocking, outages before escalating to operator as last resort) in `packages/agent-runtime/src/loop/agent-loop.ts`
- [ ] T055 [US2] Implement agent-runtime message handler (process resteer, pause, resume, terminate, integrity-check from orchestrator) in `packages/agent-runtime/src/comms/message-handler.ts`
- [ ] T056 [US2] Implement checkpoint system (save/load cognitive snapshots: goal, progress, decision log, pending actions, handoff prompt per FR-015b) in `packages/orchestrator/src/agents/checkpoints.ts`
- [ ] T057 [P] [US2] Implement basic agent memory — write, read, recall operations (private tier per FR-020d) in `packages/agent-runtime/src/memory/memory-ops.ts`
- [ ] T058 [P] [US2] Implement orchestrator-side memory service (store, embed, index, search with pgvector HNSW + FTS) in `packages/orchestrator/src/memory/memory-service.ts`
- [ ] T059 [US2] Implement auto-recall on agent turn (search indexed memory, inject relevant context per FR-020b) in `packages/agent-runtime/src/memory/auto-recall.ts`
- [ ] T060 [US2] Implement pre-compaction flush (persist in-context info to durable memory before compaction per FR-020a) in `packages/agent-runtime/src/memory/pre-compaction.ts`
- [ ] T061 [US2] Implement shared knowledge base read/write operations (publish learnings, query shared entries per FR-012d) in `packages/orchestrator/src/memory/knowledge-base.ts`
- [ ] T062 [P] [US2] Implement agents API — GET /api/agents (tree), POST /api/agents (spawn), GET /api/agents/:id, PATCH /api/agents/:id (control), DELETE /api/agents/:id in `packages/dashboard/src/app/api/agents/route.ts` and `packages/dashboard/src/app/api/agents/[id]/route.ts`
- [ ] T063 [P] [US2] Implement agent definitions API — CRUD endpoints per contracts/api.md in `packages/dashboard/src/app/api/definitions/route.ts` and `packages/dashboard/src/app/api/definitions/[id]/route.ts`
- [ ] T064 [US2] Implement SSE stream for agent status changes (agent:status, agent:progress, agent:spawn, agent:terminate) in `packages/dashboard/src/app/api/stream/agents/route.ts`
- [ ] T065 [P] [US2] Implement agent list page (real-time status, current task, budget usage) in `packages/dashboard/src/app/agents/page.tsx`
- [ ] T066 [P] [US2] Implement agent detail page (status, sessions, memory entries, checkpoints, child agents) in `packages/dashboard/src/app/agents/[id]/page.tsx`
- [ ] T067 [P] [US2] Implement agent definition builder page (mission prompt, AI provider + model selection per FR-016, budget, capabilities, tools, approval policies, retry/heartbeat config) in `packages/dashboard/src/app/definitions/page.tsx`
- [ ] T068 [US2] Implement agent hierarchy tree visualization component (collapsible, real-time status per FR-010b) in `packages/dashboard/src/components/agent-tree.tsx`
- [ ] T069 [US2] Implement configurable retry policy execution (max retries, exponential/linear backoff) in `packages/orchestrator/src/agents/retry.ts`

### Phase 4 Tests

- [ ] T069a [P] [US2] Unit tests for agent state machine (all valid transitions, rejection of invalid transitions, edge cases) in `packages/orchestrator/tests/unit/state-machine.test.ts`
- [ ] T069b [P] [US2] Unit tests for checkpoint save/load (cognitive snapshot round-trip, handoff prompt generation) in `packages/orchestrator/tests/unit/checkpoints.test.ts`
- [ ] T069c [P] [US2] Unit tests for retry policy execution (max retries, exponential/linear backoff timing) in `packages/orchestrator/tests/unit/retry.test.ts`
- [ ] T069d [US2] Integration tests for agent spawn flow (DB record creation, sandbox mock, Redis channel wiring, message round-trip) in `packages/orchestrator/tests/integration/agent-spawn.test.ts`
- [ ] T069e [P] [US2] Integration tests for memory service (store, embed, index, search with pgvector + FTS) using Testcontainers in `packages/orchestrator/tests/integration/memory.test.ts`
- [ ] T069f [US2] E2E test: spawn agent from dashboard, verify agent appears in agent list with real-time status, pause/resume via dashboard in `packages/dashboard/tests/e2e/agent-lifecycle.spec.ts`

**Checkpoint**: Agent spawns in E2B, communicates via Redis, lifecycle operations work, dashboard shows agents in real-time, definitions can be created

---

## Phase 5: User Story 3 — Full Computer Usage for Agents (Priority: P1)

**Goal**: Agents have full computer usage — browser, terminal, file system, desktop interaction — with tiered tool selection

**Independent Test**: Instruct agent to browse a website, extract data, run CLI commands, and interact with a web app

### Implementation for User Story 3

- [ ] T070 [US3] Implement Vercel AI SDK provider configuration (Anthropic, OpenAI, Google, OpenRouter) with per-agent model selection in `packages/agent-runtime/src/loop/providers.ts`
- [ ] T071 [US3] Implement tool registry and execution framework (register tools, validate inputs via Zod, execute with error handling) in `packages/agent-runtime/src/tools/registry.ts`
- [ ] T072 [P] [US3] Implement terminal tool (run commands, install packages, manage processes in sandbox) in `packages/agent-runtime/src/tools/terminal.ts`
- [ ] T073 [P] [US3] Implement file system tool (read, write, list, search files in sandbox) in `packages/agent-runtime/src/tools/filesystem.ts`
- [ ] T074 [P] [US3] Implement browser tool via Playwright (navigate, click, fill, extract, screenshot — headless automation tier) in `packages/agent-runtime/src/tools/browser.ts`
- [ ] T075 [P] [US3] Implement desktop/computer-use tool via @e2b/desktop (screen capture, mouse, keyboard — pixel-level tier) in `packages/agent-runtime/src/tools/computer-use.ts`
- [ ] T076 [P] [US3] Implement HTTP/API tool (make HTTP requests, parse responses — API-first tier) in `packages/agent-runtime/src/tools/http.ts`
- [ ] T077 [US3] Implement tool tiering logic (prefer API > headless browser > pixel-level per FR-003) in `packages/agent-runtime/src/tools/tiering.ts`
- [ ] T078 [US3] Implement capability-aware agent (self-assess tool sufficiency, request capability upgrades per FR-018) in `packages/agent-runtime/src/loop/capability-check.ts`
- [ ] T079 [US3] Implement sub-agent spawning from within agent-runtime (agent spawns child agents via orchestrator message per FR-002) in `packages/agent-runtime/src/loop/sub-agent.ts`
- [ ] T080 [US3] Implement dynamic goal decomposition (LLM-powered task breakdown, agent count/type/sequencing per FR-013) in `packages/orchestrator/src/agents/goal-decomposition.ts`
- [ ] T080a [US3] Implement workflow lead coordination pattern per FR-011: orchestrator spawns workflow lead agents for parallel workflows, each managing their own hierarchical agent team. Workflow leads are specialized agents with sub-agent spawning authority. Root orchestrator coordinates across workflows (budget allocation, cross-workflow conflict escalation, resource balancing). File: `packages/orchestrator/src/agents/workflow-coordinator.ts`

### Phase 5 Tests

- [ ] T080b [P] [US3] Unit tests for tool registry (register, validate inputs via Zod, execute, error handling) in `packages/agent-runtime/tests/unit/tool-registry.test.ts`
- [ ] T080c [P] [US3] Unit tests for tool tiering logic (API > headless browser > pixel-level preference order, fallback escalation) in `packages/agent-runtime/tests/unit/tiering.test.ts`
- [ ] T080d [P] [US3] Unit tests for capability-check (self-assessment, upgrade request generation with justification) in `packages/agent-runtime/tests/unit/capability-check.test.ts`
- [ ] T080e [P] [US3] Unit tests for goal decomposition (mock LLM response parsing, agent count/type/sequencing output) in `packages/orchestrator/tests/unit/goal-decomposition.test.ts`

**Checkpoint**: Agent can browse web, run terminal commands, interact with desktop apps, use APIs, spawn sub-agents, and decompose goals

---

## Phase 6: User Story 4 — Security and Isolation (Priority: P1)

**Goal**: Strict agent isolation, encrypted comms, secret vault with proxy, audit trail, prompt injection scanning, integrity checks

**Independent Test**: Spawn two agents, verify isolation. Test secret access control. Verify audit logs capture all actions.

### Implementation for User Story 4

- [ ] T081 [P] [US4] Implement secret vault service (create, read, update, delete secrets with AES-256 encryption) in `packages/orchestrator/src/secrets/vault.ts`
- [ ] T082 [US4] Implement secret proxy (agent requests secret via Redis, orchestrator verifies allowed_agents + allowed_domains, injects via E2B API per FR-026) in `packages/orchestrator/src/secrets/proxy.ts`
- [ ] T083 [US4] Implement domain allowlist enforcement (block outbound requests to non-allowlisted domains, trigger security alert per FR-026) in `packages/orchestrator/src/secrets/domain-filter.ts`
- [ ] T084 [P] [US4] Implement audit log service (append-only writes, query with filters, immutable per FR-007) in `packages/orchestrator/src/security/audit-log.ts`
- [ ] T085 [US4] Implement prompt injection scanner (scan external content for injection markers, quarantine flagged content per FR-023) in `packages/orchestrator/src/security/injection-scanner.ts`
- [ ] T086 [US4] Implement agent integrity verification (SHA256 checksum of mission + config at spawn, periodic verification, auto-restore on drift per FR-024) in `packages/orchestrator/src/security/integrity-check.ts`
- [ ] T087 [US4] Integrate audit logging into agent lifecycle (spawn, pause, resume, terminate, resteer), secret access, and security events across orchestrator services
- [ ] T088 [P] [US4] Implement secrets API — GET /api/secrets (names only), POST, PATCH, DELETE per contracts/api.md in `packages/dashboard/src/app/api/secrets/route.ts` and `packages/dashboard/src/app/api/secrets/[id]/route.ts`
- [ ] T089 [P] [US4] Implement secrets vault management page (list, create, edit allowed agents/domains, delete) in `packages/dashboard/src/app/secrets/page.tsx`
- [ ] T090 [P] [US4] Implement audit log viewer page (filterable by agent, action type, time range, security events) in `packages/dashboard/src/app/settings/audit/page.tsx`

### Phase 6 Tests

- [ ] T090a [P] [US4] Unit tests for secret vault (AES-256 encrypt/decrypt, per-agent access control, CRUD operations) in `packages/orchestrator/tests/unit/vault.test.ts`
- [ ] T090b [P] [US4] Unit tests for secret proxy (domain allowlist enforcement, blocked request detection, credential stripping) in `packages/orchestrator/tests/unit/secret-proxy.test.ts`
- [ ] T090c [P] [US4] Unit tests for prompt injection scanner (detection of known injection patterns, quarantine flow) in `packages/orchestrator/tests/unit/injection-scanner.test.ts`
- [ ] T090d [P] [US4] Unit tests for integrity check (SHA256 checksum computation, drift detection, auto-restore) in `packages/orchestrator/tests/unit/integrity-check.test.ts`
- [ ] T090e [US4] Integration tests for audit log (append-only writes, query with filters, immutability verification) using Testcontainers in `packages/orchestrator/tests/integration/audit-log.test.ts`

**Checkpoint**: Agents isolated, secrets only accessible via proxy with domain filtering, all actions audited, injection scanning active, integrity checks running

---

## Phase 7: User Story 5 — Self-Growing Business Pipeline (Priority: P2)

**Goal**: Multi-stage pipelines (research > build > deploy > market > reinvest), financial ledger, budget enforcement, LLM cost tracking, revenue splits

**Independent Test**: Configure pipeline with small budget, agents progress through stages, financial transactions logged and within limits

### Implementation for User Story 5

- [ ] T091 [P] [US5] Implement pipeline service (create, advance stage, pause, complete, fail) in `packages/orchestrator/src/agents/pipeline-service.ts`
- [ ] T092 [P] [US5] Implement financial ledger service (record transactions, compute balances, revenue splits per FR-008a/FR-019) in `packages/orchestrator/src/financial/ledger.ts`
- [ ] T093 [US5] Implement budget enforcement (pre-authorization check per FR-008c, block if exceeds remaining budget, escalate for additional budget) in `packages/orchestrator/src/financial/budget.ts`
- [ ] T094 [US5] Implement LLM cost tracker (per-call logging with input/output/cache tokens, computed cost per FR-008b) in `packages/orchestrator/src/financial/llm-costs.ts`
- [ ] T095 [US5] Integrate LLM cost tracking into agent-runtime (report usage after each generateText call) in `packages/agent-runtime/src/loop/cost-reporter.ts`
- [ ] T096 [US5] Implement revenue collection and split logic (route revenue to ledger, read configurable split ratio from SystemConfig, apply operator/reinvestment split per FR-008a, default 20/80) in `packages/orchestrator/src/financial/revenue.ts`
- [ ] T097 [US5] Implement heartbeat standing order evaluation (evaluate operator goals, advance pipelines, spawn agents, reallocate resources per FR-021a) in `packages/orchestrator/src/heartbeat/standing-orders.ts`
- [ ] T098 [P] [US5] Implement pipelines API — GET /api/pipelines, POST, GET/:id, PATCH/:id per contracts/api.md in `packages/dashboard/src/app/api/pipelines/route.ts` and `packages/dashboard/src/app/api/pipelines/[id]/route.ts`
- [ ] T099 [P] [US5] Implement financial API — GET /api/financial/transactions, GET /api/financial/summary, GET /api/financial/costs per contracts/api.md in `packages/dashboard/src/app/api/financial/route.ts`
- [ ] T100 [P] [US5] Implement pipeline management page (create pipeline, view stages, progress, budget) in `packages/dashboard/src/app/pipelines/page.tsx`
- [ ] T101 [P] [US5] Implement financial dashboard page (transactions, per-agent costs, per-venture ROI, revenue splits, trend charts per FR-008d) in `packages/dashboard/src/app/financial/page.tsx`
- [ ] T102 [US5] Implement SSE stream for cost updates (cost:update, cost:alert) in `packages/dashboard/src/app/api/stream/costs/route.ts`
- [ ] T103 [US5] Implement SSE stream for pipeline progress (pipeline:stage, pipeline:complete) in `packages/dashboard/src/app/api/stream/pipeline/[id]/route.ts`

### Phase 7 Tests

- [ ] T103a [P] [US5] Unit tests for budget enforcement (pre-authorization check, block on insufficient budget, escalation trigger) in `packages/orchestrator/tests/unit/budget.test.ts`
- [ ] T103b [P] [US5] Unit tests for financial ledger (transaction recording, balance computation, revenue split calculation) in `packages/orchestrator/tests/unit/ledger.test.ts`
- [ ] T103c [P] [US5] Unit tests for LLM cost tracker (token counting, cost computation per model, per-agent aggregation) in `packages/orchestrator/tests/unit/llm-costs.test.ts`
- [ ] T103d [US5] Unit tests for pipeline service (stage advancement, pause/complete/fail transitions) in `packages/orchestrator/tests/unit/pipeline.test.ts`

**Checkpoint**: Pipelines advance through stages, financial transactions tracked, budget enforced, LLM costs logged, revenue splits working, dashboard shows financials

---

## Phase 8: User Story 6 — Operator Dashboard and Controls (Priority: P2)

**Goal**: Full dashboard control plane, Discord bot for two-way agent communication, alert system, skill/memory observability

**Independent Test**: Access dashboard, view agents, pause/resume via dashboard and Discord, configure alert rules, see skill metrics

### Implementation for User Story 6

- [ ] T104 [P] [US6] Implement Discord bot entry point (connect, register slash commands, handle interactions) in `packages/discord-bot/src/index.ts`
- [ ] T105 [P] [US6] Implement Discord slash commands (/status, /agent, /budget, /approve, /deny, /spawn per contracts/discord.md) in `packages/discord-bot/src/commands/`
- [ ] T106 [US6] Implement Discord message routing (agent updates → Discord channels, operator replies → agent inbox via Redis) in `packages/discord-bot/src/handlers/message-router.ts`
- [ ] T107 [US6] Implement Discord approval workflow (interactive buttons for approve/deny, route decisions to orchestrator) in `packages/discord-bot/src/handlers/approval-handler.ts`
- [ ] T108 [US6] Implement Discord channel management (create per-agent/workflow channels, post notifications to #orchestrator and #approvals) in `packages/discord-bot/src/handlers/channel-manager.ts`
- [ ] T109 [P] [US6] Implement alert rule engine (evaluate conditions against metrics, fire alert events, severity routing per FR-014) in `packages/orchestrator/src/security/alert-engine.ts`
- [ ] T110 [P] [US6] Implement alerts API — CRUD for rules, list/ack events per contracts/api.md in `packages/dashboard/src/app/api/alerts/route.ts`
- [ ] T111 [US6] Implement SSE stream for alert events (alert:new, alert:ack) in `packages/dashboard/src/app/api/stream/alerts/route.ts`
- [ ] T112 [P] [US6] Implement alert management page (create/edit rules, view events, acknowledge, smart banners for active critical/warning alerts) in `packages/dashboard/src/app/alerts/page.tsx`
- [ ] T113 [P] [US6] Implement skill observability page (skill count, invocation frequency, success/failure rates, top skills, authoring agent, version history, deprecation events per FR-022d) in `packages/dashboard/src/app/skills/page.tsx`
- [ ] T114 [P] [US6] Implement skills API — GET /api/skills, GET /api/skills/:id, POST /api/skills/:id/deprecate per contracts/api.md in `packages/dashboard/src/app/api/skills/route.ts`
- [ ] T115 [P] [US6] Implement memory/cognitive health metrics page (write/read rates, retrieval quality, knowledge base growth, reflection frequency per FR-020g) in `packages/dashboard/src/app/settings/memory/page.tsx`
- [ ] T116 [P] [US6] Implement system settings page (heartbeat interval, active hours, revenue split, backup config, Discord webhook) in `packages/dashboard/src/app/settings/page.tsx`
- [ ] T117 [US6] Implement token economics dashboard component (per-agent per-model cost breakdown, 7d/30d trend charts, projected monthly spend per FR-008d) in `packages/dashboard/src/components/cost-charts.tsx`
- [ ] T118 [US6] Add discord-bot service to `docker-compose.yml` with Redis dependency

### Phase 8 Tests

- [ ] T118a [P] [US6] Unit tests for alert rule engine (condition evaluation, severity routing, alert firing) in `packages/orchestrator/tests/unit/alert-engine.test.ts`
- [ ] T118b [P] [US6] Unit tests for Discord slash command handlers (mock interactions, response formatting) in `packages/discord-bot/tests/unit/commands.test.ts`
- [ ] T118c [US6] Integration tests for Discord message routing (agent updates → Discord channels, operator replies → agent inbox via Redis mock) in `packages/discord-bot/tests/integration/message-router.test.ts`

**Checkpoint**: Discord bot responds to commands, agent conversations work in channels, alerts fire and display on dashboard, skill/memory metrics visible, full settings management

---

## Phase 9: User Story 7 — Agent Identity Management (Priority: P3)

**Goal**: Agents create/manage digital identities (email, phone, voice, service accounts), central registry, operator can revoke

**Independent Test**: Agent creates email and phone number, they appear in identity registry, operator revokes them

### Implementation for User Story 7

- [ ] T119 [P] [US7] Implement identity registry service (create, list, revoke identities, link credentials to secret vault) in `packages/orchestrator/src/agents/identity-service.ts`
- [ ] T120 [US7] Implement agent-side identity creation tools (create email, phone, service account via appropriate providers) in `packages/agent-runtime/src/tools/identity.ts`
- [ ] T121 [P] [US7] Implement identities API — GET /api/identities, DELETE /api/identities/:id per contracts/api.md in `packages/dashboard/src/app/api/identities/route.ts` and `packages/dashboard/src/app/api/identities/[id]/route.ts`
- [ ] T122 [US7] Implement identity registry page (list all identities with type, agent, provider, status; revoke action) in `packages/dashboard/src/app/identities/page.tsx`

### Phase 9 Tests

- [ ] T122a [P] [US7] Unit tests for identity registry service (create, list, revoke, credential linking) in `packages/orchestrator/tests/unit/identity-service.test.ts`

**Checkpoint**: Agents can create identities, registry tracks all identities, operator can view and revoke

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Advanced features, resilience, and optimizations that span multiple user stories

- [ ] T123 [P] Implement skill authoring system (create structured skills with trigger/inputs/outputs/steps, validation gate, versioning per FR-022/FR-022a) in `packages/orchestrator/src/skills/registry.ts`
- [ ] T124 Implement skill invocation and self-healing lifecycle (invoke by name, diagnose failures, publish new versions, auto-deprecate after 3 consecutive failures per FR-022c) in `packages/orchestrator/src/skills/lifecycle.ts`
- [ ] T125 [P] Implement tool/API/MCP discovery (search registries, integrate new tools, codify as skills per FR-022b) in `packages/agent-runtime/src/tools/discovery.ts`
- [ ] T126 Implement tiered security gate for discovered tools (auto-approve trusted sources, require operator approval for unknown per FR-025) in `packages/orchestrator/src/security/tool-approval.ts`
- [ ] T127 [P] Implement memory reflection and consolidation (periodic structured summaries, prune outdated entries, consolidate into higher-level summaries per FR-020f) in `packages/orchestrator/src/memory/consolidation.ts`
- [ ] T128 [P] Implement memory quality pipeline (write-time noise filtering + importance scoring, read-time multi-stage scoring with recency/importance/decay/MMR/threshold per FR-020e) in `packages/orchestrator/src/memory/quality-pipeline.ts`
- [ ] T129 Implement graceful degradation mode (continue non-sensitive work on infrastructure failures, queue sensitive ops, self-heal on recovery per FR-015c) in `packages/agent-runtime/src/loop/degradation.ts`
- [ ] T130 [P] Implement self-learning from failures (persist resolutions to shared knowledge base, avoid repeating failed approaches per FR-012c) in `packages/agent-runtime/src/memory/self-learning.ts`
- [ ] T131 [P] Implement automated daily backup system (PostgreSQL dump, 90-day retention, weekly restore verification per FR-028) in `packages/orchestrator/src/db/backup.ts`
- [ ] T132 Implement backup/restore API — POST /api/system/backup, POST /api/system/backup/restore in `packages/dashboard/src/app/api/system/backup/route.ts`
- [ ] T133 [P] Implement priority queue scheduler (suspend lower-priority agents on resource exhaustion, elastic scaling per FR-015a) in `packages/orchestrator/src/agents/priority-scheduler.ts`
- [ ] T134 Implement conflict resolution system (detect contention, escalate to parent, resolve via LLM, publish resolution to knowledge base per FR-011b) in `packages/orchestrator/src/agents/conflict-resolution.ts`
- [ ] T135 [P] Implement quarantine review page for prompt injection flagged content in `packages/dashboard/src/app/settings/quarantine/page.tsx`
- [ ] T136 Update CLAUDE.md with complete development guidance, commands, and conventions (finalize content started in T005a)
- [ ] T137 Run quickstart.md validation — verify full local dev setup and production deployment flow

### Phase 10 Tests

- [ ] T137a [P] Unit tests for skill authoring (structured skill creation, validation gate, versioning) in `packages/orchestrator/tests/unit/skill-registry.test.ts`
- [ ] T137b [P] Unit tests for skill lifecycle (invocation, self-healing, auto-deprecation after N failures) in `packages/orchestrator/tests/unit/skill-lifecycle.test.ts`
- [ ] T137c [P] Unit tests for memory quality pipeline (write-time noise filtering, importance scoring, read-time multi-stage scoring) in `packages/orchestrator/tests/unit/memory-quality.test.ts`
- [ ] T137d [P] Unit tests for memory consolidation (reflection generation, pruning, higher-level summary creation) in `packages/orchestrator/tests/unit/memory-consolidation.test.ts`
- [ ] T137e [P] Unit tests for priority queue scheduler (suspend lower-priority, resource exhaustion handling) in `packages/orchestrator/tests/unit/priority-scheduler.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MUST complete first (MVP)
- **US2 (Phase 4)**: Depends on Foundational + US1 (needs auth, health endpoint, dashboard shell)
- **US3 (Phase 5)**: Depends on US2 (needs agent-runtime, sandbox lifecycle)
- **US4 (Phase 6)**: Depends on US2 (needs agent lifecycle for audit integration)
- **US5 (Phase 7)**: Depends on US2 + US3 (needs agents with full capabilities)
- **US6 (Phase 8)**: Depends on US2 + US4 (needs agents + audit trail for dashboard)
- **US7 (Phase 9)**: Depends on US3 + US4 (needs full computer usage + security)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no story dependencies (MVP)
- **US2 (P1)**: US1 (dashboard shell, auth)
- **US3 (P1)**: US2 (agent-runtime exists, sandbox lifecycle)
- **US4 (P1)**: US2 (agent lifecycle to integrate audit logging)
- **US5 (P2)**: US2 + US3 (agents with capabilities for pipeline execution)
- **US6 (P2)**: US2 + US4 (agents + security for meaningful dashboard)
- **US7 (P3)**: US3 + US4 (full computer usage + security controls)

### Within Each User Story

- Models/schemas before services
- Services before API endpoints
- API endpoints before dashboard pages
- Core logic before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T005, T008-T012)
- All Foundational tasks marked [P] can run in parallel (T015-T018, T022-T024, T026-T027)
- Within US2: agent-runtime scaffolding (T052-T053) parallel with dashboard API/pages (T062-T067)
- Within US3: all tool implementations (T072-T076) can run in parallel
- Within US4: vault (T081), audit (T084), and dashboard pages (T088-T090) can run in parallel
- Within US5: pipeline service (T091), ledger (T092), and dashboard APIs (T098-T101) can run in parallel
- Within US6: Discord bot (T104-T105), alert engine (T109), and dashboard pages (T112-T116) can run in parallel
- US4 and US3 can run in parallel after US2 completes
- US5 and US6 can run in parallel after their dependencies are met

---

## Parallel Example: User Story 2

```bash
# Launch parallel agent-runtime + dashboard work:
Task T052: "Implement agent-runtime entry point in packages/agent-runtime/src/index.ts"
Task T053: "Implement agent-runtime Redis comms in packages/agent-runtime/src/comms/redis-client.ts"
Task T062: "Implement agents API in packages/dashboard/src/app/api/agents/"
Task T063: "Implement definitions API in packages/dashboard/src/app/api/definitions/"
Task T065: "Implement agent list page in packages/dashboard/src/app/agents/page.tsx"
Task T067: "Implement definition builder in packages/dashboard/src/app/definitions/page.tsx"

# Then sequential (depends on above):
Task T054: "Implement agent LLM call loop" (depends on T052)
Task T064: "Implement SSE stream for agents" (depends on T062)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Orchestrator runs, health checks pass, dashboard accessible with passkey auth
5. Deploy to cloud VM if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Deploy/Demo (MVP — orchestrator running, dashboard with auth)
3. Add US2 → Deploy/Demo (agents spawn and communicate)
4. Add US3 → Deploy/Demo (agents have full computer usage)
5. Add US4 → Deploy/Demo (security hardened, audit trail)
6. Add US5 → Deploy/Demo (business pipelines, financials)
7. Add US6 → Deploy/Demo (Discord bot, alerts, full dashboard)
8. Add US7 → Deploy/Demo (identity management)
9. Polish → Production ready

### Suggested MVP Scope

**US1 only** — a running orchestrator with health checks, authenticated dashboard, and setup wizard. This proves the infrastructure works before building agent capabilities.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable after its dependencies
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 178 across 10 phases (137 implementation + 41 test/infrastructure)

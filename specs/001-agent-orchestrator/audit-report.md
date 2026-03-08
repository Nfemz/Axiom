# Spec Audit Report: Autonomous Agent Orchestrator Platform

**Spec**: `specs/001-agent-orchestrator/`
**Codebase**: `/Users/nick/Desktop/Development/Axiom`
**Date**: 2026-03-08 (Fresh re-audit)
**Overall Coverage**: 88% (152 verified / 173 total task items)

## Summary

The codebase has strong foundational implementation — all 17 DB entities exist, all 49 API endpoints match the contract, and core orchestrator/agent-runtime/dashboard/discord-bot packages are substantively implemented. However, this fresh audit identified **5 critical gaps** (systemd watchdog bug, stub backup API, stub E2E tests, 5 stub unit test files, missing DB indexes), **7 major gaps** (missing permission cascading, in-memory setup state, stub agent detail tabs, token economics verification needed, partial heartbeat/discord tests, missing memory health endpoint), and **5 minor gaps**.

## Critical Gaps (5)

### [GAP-C001] systemd watchdog will kill orchestrator — no sd_notify() call
- **Requirement**: FR-001 (auto-recover from failures)
- **Expected**: `deploy/axiom-orchestrator.service` uses `Type=notify` with `WatchdogSec=120`, requiring periodic `sd_notify("WATCHDOG=1")` calls
- **Actual**: `packages/orchestrator/src/index.ts` never calls `sd_notify()`. Watchdog will terminate the process after 120s.
- **Impact**: Orchestrator killed by systemd every 2 minutes in production
- **Proposed Fix**: Change `Type=notify` to `Type=simple` OR add `sd-notify` npm package and call from heartbeat loop
- **Scope**: one-liner (change Type) or small (add sd-notify)
- **Files**: `deploy/axiom-orchestrator.service`, `packages/orchestrator/src/index.ts`

### [GAP-C002] Backup API is a stub — returns hardcoded empty data
- **Requirement**: FR-028, T132
- **Expected**: POST `/api/system/backup` triggers real backup; POST `/api/system/backup/restore` restores from snapshot
- **Actual**: GET returns `{ backups: [], total: 0 }`, POST returns `{ status: "initiated" }` with no actual backup logic
- **Impact**: Operator cannot trigger or manage backups from dashboard
- **Proposed Fix**: Wire route handlers to existing backup service in `packages/orchestrator/src/db/backup.ts`
- **Scope**: small
- **Files**: `packages/dashboard/src/app/api/system/backup/route.ts`

### [GAP-C003] E2E tests are all skipped stubs
- **Requirement**: T044e (setup wizard E2E), T069f (agent lifecycle E2E)
- **Expected**: Playwright tests exercise full UI flows
- **Actual**: `setup-wizard.spec.ts` — main test is `test.skip`; `agent-lifecycle.spec.ts` — all 3 tests are `test.skip`
- **Impact**: No automated E2E validation of critical user flows
- **Proposed Fix**: Implement skipped test cases with real Playwright interactions
- **Scope**: medium
- **Files**: `packages/dashboard/tests/e2e/setup-wizard.spec.ts`, `packages/dashboard/tests/e2e/agent-lifecycle.spec.ts`

### [GAP-C004] Five unit test files are export-only stubs (typeof checks only)
- **Requirement**: T103d (pipeline), T122a (identity-service), T137a (skill-registry), T137b (skill-lifecycle), T137d (memory-consolidation)
- **Expected**: Tests verify actual behavior (inputs → outputs, edge cases)
- **Actual**: Each file only checks `typeof export === "function"`. No behavioral assertions.
- **Impact**: Zero test coverage for 5 critical services
- **Proposed Fix**: Add real behavioral tests with mocked dependencies
- **Scope**: medium (5 files × ~80-120 lines each)
- **Files**: `packages/orchestrator/tests/unit/pipeline.test.ts`, `packages/orchestrator/tests/unit/identity-service.test.ts`, `packages/orchestrator/tests/unit/skill-registry.test.ts`, `packages/orchestrator/tests/unit/skill-lifecycle.test.ts`, `packages/orchestrator/tests/unit/memory-consolidation.test.ts`

### [GAP-C005] Missing HNSW/GIN/FTS indexes on memory and knowledge tables
- **Requirement**: Data model spec requires HNSW on `embedding`, GIN on `tags`, FTS on `content`
- **Expected**: Indexes exist for performant vector search, tag queries, and full-text search
- **Actual**: Only BTree indexes on agent_id/importance_score for memories; only BTree on category for shared knowledge
- **Impact**: Full table scans on vector similarity, tag, and full-text queries at scale
- **Proposed Fix**: Add Drizzle migration with raw SQL for HNSW (vector_cosine_ops), GIN, and FTS indexes
- **Scope**: small (single migration file)
- **Files**: `packages/orchestrator/src/db/schema.ts`, `drizzle/` (new migration)

## Major Gaps (7)

### [GAP-M001] No permission cascading from parent to child agents
- **Requirement**: FR-002 ("Budget, permissions, and capability constraints cascade downward")
- **Expected**: Child agent permissions inherited from and constrained by parent
- **Actual**: Budget cascading exists in `spawn.ts`, but no permission propagation logic
- **Proposed Fix**: Add permission inheritance in `spawnAgent()` — merge parent permissions, ensure child is subset
- **Scope**: small
- **Files**: `packages/orchestrator/src/agents/spawn.ts`

### [GAP-M002] Setup wizard API uses in-memory state, not persisted to DB
- **Requirement**: FR-029, T036
- **Expected**: Setup wizard state persists across server restarts
- **Actual**: Uses `let setupState` in-memory (line 10) with comment "will be persisted to DB later"
- **Proposed Fix**: Store state in `system_config` table (which already has `setup_complete`)
- **Scope**: small
- **Files**: `packages/dashboard/src/app/api/system/setup/route.ts`

### [GAP-M003] Agent detail page TabContent is a stub
- **Requirement**: T066 (agent detail page with sessions, memory, checkpoints, child agents)
- **Expected**: Tabs fetch real data from `/api/agents/:id/sessions`, `/memory`, `/checkpoints`, `/children`
- **Actual**: TabContent uses `setTimeout` instead of real API calls. Has TODO comment.
- **Proposed Fix**: Replace setTimeout with fetch calls to existing sub-routes
- **Scope**: small
- **Files**: `packages/dashboard/src/app/agents/[id]/page.tsx`

### [GAP-M004] Token economics dashboard component needs verification
- **Requirement**: FR-008d, T117
- **Expected**: Cost charts showing per-agent per-model cost breakdown, 7d/30d trends, projected spend
- **Actual**: Backend data exists but frontend visualization flagged as potentially missing
- **Proposed Fix**: Verify `cost-charts.tsx` renders real data; implement if stub
- **Scope**: small to medium
- **Files**: `packages/dashboard/src/components/cost-charts.tsx`

### [GAP-M005] Heartbeat unit tests are partial
- **Requirement**: T044c
- **Expected**: Tests verify check logic (cheap-checks-first, three-layer detection, active hours)
- **Actual**: Only tests start/stop and that exports are functions (47 lines)
- **Proposed Fix**: Add tests for check ordering, threshold detection, active hours filtering
- **Scope**: small
- **Files**: `packages/orchestrator/tests/unit/heartbeat.test.ts`

### [GAP-M006] Discord bot command tests only verify structure
- **Requirement**: T118b
- **Expected**: Tests verify command execution with mock interactions
- **Actual**: Verifies command names/structure only, no execution tests (47 lines)
- **Proposed Fix**: Add tests that mock Discord interactions and verify response payloads
- **Scope**: small
- **Files**: `packages/discord-bot/tests/unit/commands.test.ts`

### [GAP-M007] Memory health metrics endpoint missing
- **Requirement**: FR-020g
- **Expected**: Dashboard surfaces memory write/read rates, retrieval quality, knowledge base growth
- **Actual**: Settings/memory page exists (170 lines) but no backend endpoint provides real metrics
- **Proposed Fix**: Add `/api/system/memory-health` endpoint querying memory tables for aggregated metrics
- **Scope**: small
- **Files**: `packages/dashboard/src/app/api/` (new route), `packages/dashboard/src/app/settings/memory/page.tsx`

## Minor Gaps (5)

### [GAP-N001] No payment processor integration (FR-019)
- Revenue recording and split logic exists, but no Stripe SDK or external payment processor
- **Scope**: large (external API integration, out of current sprint)

### [GAP-N002] Memory 3-tier isolation not explicitly enforced (FR-020d)
- Memories scoped by `agent_id` and shared knowledge is separate, but no explicit query-layer enforcement prevents cross-agent access
- **Scope**: small

### [GAP-N003] Extra `updated_at` on AlertRule table
- Data model spec doesn't include it. Harmless deviation.

### [GAP-N004] Extra GET on /api/system/backup
- Contract only specifies POST. GET lists backups — harmless addition.

### [GAP-N005] WebAuthn credential store is in-memory
- `packages/dashboard/src/lib/webauthn-store.ts` uses in-memory `Map` instead of `operatorCredentials` DB table. Credentials lost on restart.
- **Scope**: small

## Observations (4)

1. **Agent LLM calls are simulated** — `agent-loop.ts` uses `sleep(500)` with simulated tokens instead of Vercel AI SDK. Intentional for E2B sandbox dependency.
2. **Computer-use tool returns mock data** — `computer-use.ts` has placeholder actions. Requires `@e2b/desktop` in sandbox.
3. **SSE streams have no auth middleware** — All 4 SSE endpoints skip `requireAuth()`. May be intentional for EventSource browser API compatibility.
4. **Auth uses `step: "options"` not `step: "challenge"`** — Naming inconsistency vs contract, functionally equivalent.

## Task Status Summary

| Phase | Total | Verified | Stub/TODO | Partial |
|-------|-------|----------|-----------|---------|
| Phase 1: Setup | 13 | 13 | 0 | 0 |
| Phase 2: Foundational | 14 | 14 | 0 | 0 |
| Phase 2 Tests | 4 | 4 | 0 | 0 |
| Phase 3: US1 | 17 | 15 | 0 | 2 |
| Phase 3 Tests | 4 | 2 | 1 | 1 |
| Phase 4: US2 | 25 | 24 | 0 | 1 |
| Phase 4 Tests | 6 | 4 | 2 | 0 |
| Phase 5: US3 | 11 | 11 | 0 | 0 |
| Phase 5 Tests | 4 | 4 | 0 | 0 |
| Phase 6: US4 | 10 | 10 | 0 | 0 |
| Phase 6 Tests | 5 | 5 | 0 | 0 |
| Phase 7: US5 | 13 | 12 | 1 | 0 |
| Phase 7 Tests | 4 | 3 | 1 | 0 |
| Phase 8: US6 | 15 | 15 | 0 | 0 |
| Phase 8 Tests | 3 | 1 | 0 | 2 |
| Phase 9: US7 | 4 | 4 | 0 | 0 |
| Phase 9 Tests | 1 | 0 | 1 | 0 |
| Phase 10 | 15 | 14 | 0 | 1 |
| Phase 10 Tests | 5 | 2 | 3 | 0 |
| **TOTAL** | **173** | **152** | **9** | **7** |

## FR Coverage Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-001 | Partial | systemd watchdog bug — no sd_notify() |
| FR-002 | Partial | Missing permission cascading |
| FR-003 | Covered | Tiered tool interaction |
| FR-004 | Covered | Strict isolation |
| FR-005 | Covered | TLS + AES-256-GCM |
| FR-006/026 | Covered | Vault + proxy + domain allowlist |
| FR-007 | Covered | Append-only audit log |
| FR-008/a/b/c | Covered | Budget, splits, LLM costs, pre-auth |
| FR-008d | Unclear | Backend exists, frontend needs verification |
| FR-009 | Covered | Identity registry + agent tools |
| FR-010/a/b | Covered | SSE, Discord, agent tree |
| FR-011/a/b | Covered | Workflows, resteering, conflict resolution |
| FR-012/a-d | Covered | 3-layer detection, self-learning, knowledge base |
| FR-013 | Covered | Dynamic goal decomposition |
| FR-014 | Covered | Alert engine |
| FR-015/a-c | Covered | Checkpoints, priority scheduler, degradation |
| FR-016 | Covered | Multi-provider LLM |
| FR-017/018 | Covered | Definitions + capability self-assessment |
| FR-019 | Partial | No payment processor SDK |
| FR-020/a-f | Covered | Memory system substantive |
| FR-020d | Partial | 3-tier isolation not enforced at query layer |
| FR-020g | Partial | Memory health metrics endpoint missing |
| FR-021/a | Covered | Heartbeat + standing orders |
| FR-022/a-d | Covered | Full skill system |
| FR-023 | Covered | Injection scanning |
| FR-024 | Covered | Integrity checks |
| FR-025 | Covered | Tiered tool security gate |
| FR-027 | Partial | WebAuthn works but credential store is in-memory |
| FR-028 | Partial | Backend exists, API route is stub |
| FR-029 | Partial | Works but in-memory state |
| FR-030 | Covered | Health endpoint |

## Next Steps

**Priority 1 — Fix Critical Gaps (blocks production):**
1. Fix systemd watchdog (GAP-C001) — change to `Type=simple`
2. Wire backup API route to real backup service (GAP-C002)
3. Add missing HNSW/GIN/FTS indexes via migration (GAP-C005)
4. Implement 5 stub unit test files with real behavioral tests (GAP-C004)

**Priority 2 — Close Major Gaps:**
5. Add permission cascading in spawn.ts (GAP-M001)
6. Persist setup wizard state to DB (GAP-M002)
7. Wire agent detail page tabs to real API (GAP-M003)
8. Verify/implement token economics component (GAP-M004)
9. Add memory health metrics endpoint (GAP-M007)
10. Wire WebAuthn credential store to DB (GAP-N005)

**Priority 3 — Fix Test Gaps:**
11. Implement E2E test cases (GAP-C003)
12. Expand heartbeat and Discord command tests (GAP-M005, GAP-M006)

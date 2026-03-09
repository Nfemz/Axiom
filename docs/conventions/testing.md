# Testing Conventions

## Frameworks

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| Playwright | End-to-end browser tests |
| Testcontainers | Real PostgreSQL/Redis for integration tests |

## Test Tiers

| Tier | What it tests | Infrastructure | Timeout |
|------|--------------|----------------|---------|
| Unit | Single function/module in isolation | Mocks only | Default (5s) |
| Integration | Multiple modules with real DB/Redis | Testcontainers | 120s setup |
| E2E | Full app through the browser | Running servers | Per-test |

## Directory Structure

Tests mirror `src/` but live in separate `tests/` directories — **never co-located**:

```text
packages/orchestrator/
├── src/financial/budget.ts
├── tests/
│   ├── unit/budget.test.ts
│   ├── integration/db.test.ts
│   └── integration/helpers/pg-container.ts
```

## Running Tests

```bash
pnpm test             # All Vitest tests (unit + integration)
pnpm test:e2e         # Playwright E2E tests
```

Vitest workspace config (`vitest.workspace.ts`) includes: shared, orchestrator, agent-runtime, discord-bot. Dashboard integration tests run separately.

## TDD Workflow

TDD is the default development workflow:

1. **RED** — Write a failing test that describes the desired behavior
2. **GREEN** — Write the minimal code to make it pass
3. **REFACTOR** — Clean up while keeping tests green

## Naming

Test names describe behavior, not implementation:

```typescript
// Good
it("rejects expired token", async () => { ... });
it("allows when sufficient funds remain", async () => { ... });
it("returns null when agent not found", async () => { ... });

// Bad
it("test auth", async () => { ... });
it("checkBudget works", async () => { ... });
```

## Structure

Use `describe` blocks for grouping by function/feature. Keep nesting shallow (max 2 levels):

```typescript
describe("checkBudget", () => {
  it("allows when sufficient funds remain", async () => { ... });
  it("blocks when insufficient funds", async () => { ... });
});
```

## Mocking

- **Only mock external boundaries** — DB calls, Redis, network, E2B SDK.
- Use `vi.fn()` for mock functions and `vi.mock()` for module mocks.
- Prefer factory functions (`makeMockDb()`) over shared mock state.
- Never mock internal module logic — test through the real code path.

### Mock Factory Pattern

```typescript
function makeMockDb(agentRow?: { budgetTotal: string; budgetSpent: string }) {
  const db = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(agentRow ? [{ ...agentRow }] : []),
        }),
      }),
    }),
  };
  return { db: db as unknown as Database };
}
```

## Integration Tests (Testcontainers)

Use `setupPgContainer()` helper from `tests/integration/helpers/pg-container.ts`:

```typescript
describe("Database Integration", () => {
  let ctx: PgTestContext;

  beforeAll(async () => {
    ctx = await setupPgContainer();
  }, 120_000); // Container startup needs time

  afterAll(async () => {
    await ctx.client.end();
    await ctx.container.stop();
  });

  it("connects to PostgreSQL", async () => {
    const result = await ctx.db.execute(sql`SELECT 1 as value`);
    expect(result).toBeDefined();
  });
});
```

## Quality Rules

- Every test exercises a **distinct code path** — no duplicative tests.
- Tests are **independent** — no shared mutable state, no ordering dependencies.
- **No `.only` or `.skip`** in committed code.
- **No done callbacks** — use `async/await`.
- Extract reusable factories to `fixtures.ts` files alongside tests.
- Assertions inside `it()` or `test()` blocks only.
- Keep test suites flat — avoid excessive `describe` nesting.

# Code Style

## Tooling

**Formatter/Linter**: Biome via Ultracite (zero-config preset).

```bash
pnpm fix              # Auto-fix all lint + format issues
pnpm lint             # Check without fixing
pnpm dlx ultracite fix <file>   # Fix a single file
```

A PostToolUse hook auto-formats every file Claude Code writes or edits. Lefthook pre-commit hook formats staged files.

## TypeScript

- **Strict mode** enabled globally. No `any` — use `unknown` when type is genuinely unknown.
- **Target**: ES2023. **Module**: ESNext (ESM everywhere).
- **Const assertions**: Use `as const` for immutable objects and enums. See `packages/shared/src/types/enums.ts`.
- **Type inference**: Let TypeScript infer return types for simple functions. Add explicit return types for public APIs and complex functions.
- **Type narrowing**: Use discriminated unions and narrowing over type assertions.

## Functions

- **Arrow functions** for callbacks and short inline functions.
- **Named `function` declarations** for top-level exports (hoisted, debuggable).
- **~30 line limit**. If a function exceeds this, extract helpers.
- **<3 nesting depth**. Use early returns to flatten.
- **No inline helpers**: Never define utility functions inside component bodies, handlers, or closures. Extract to module-level.

## Variables & Naming

- `const` by default. `let` only when reassignment is needed. Never `var`.
- Full words: `context` not `c`, `request` not `req`, `response` not `res`. Exception: loop counters (`i`, `j`).
- Boolean variables: prefix with `is`, `has`, `should`, `can`.
- Constants: UPPER_SNAKE_CASE only for true compile-time constants. Runtime constants use camelCase.

## Loops & Iteration

- Prefer `for...of` over `.forEach()` and indexed `for` loops.
- Avoid spread in accumulators inside loops (O(n² copies).
- Use `Array.from()` or `map/filter/reduce` for transformations.

## Error Handling

- Throw `Error` objects with descriptive messages, never strings.
- Early returns for error cases — avoid deep nesting.
- `try-catch` only when you can meaningfully handle the error. Don't catch-and-rethrow without adding context.
- Use structured logging for error context: `log.error("Failed to spawn", { agentId, error: String(err) })`.

## Async

- Always `await` promises — don't forget return values.
- `async/await` over `.then()` chains.
- Don't use async functions as Promise executor callbacks.
- Fire-and-forget is acceptable with `void` prefix (Biome rule disabled for this).

## Imports

- Specific imports over namespace imports. Exception: `import * as schema from "./db/schema.js"` (Drizzle convention).
- Barrel exports only in `@axiom/shared` — nowhere else.
- Group imports: external packages → workspace packages → relative modules.
- Template literals over string concatenation.
- Destructuring for object and array access.

## Validation

- **Zod v4** for all runtime validation.
- `z.record()` requires two args in Zod v4: `z.record(z.string(), z.unknown())`.
- Define schemas alongside their types in `@axiom/shared/schemas/`.
- API routes validate request bodies before any processing.

## Logging

- Use `createLogger(context)` from `@axiom/shared`. Never `console.log` in production.
- Structured JSON output with `level`, `message`, `timestamp`, `context`, `meta`.
- Log levels: `debug`, `info`, `warn`, `error`. Controlled via `LOG_LEVEL` env var.

## React & Next.js

- Function components only. No class components.
- Hooks at top level — never inside conditions or loops.
- Complete dependency arrays on `useEffect`, `useMemo`, `useCallback`.
- `key` prop: unique IDs over array indices.
- Server Components by default. `"use client"` only when needed.
- Next.js `<Image>` component, never `<img>`.
- Semantic HTML: `<button>`, `<nav>`, `<section>` over `<div>` with roles.
- `rel="noopener"` on `target="_blank"` links.
- Avoid raw HTML injection in React — use safe rendering patterns.

## Enums

Use const objects with `as const` and derive types:

```typescript
export const AgentStatus = {
  SPAWNING: "spawning",
  RUNNING: "running",
  PAUSED: "paused",
  SUSPENDED: "suspended",
  ERROR: "error",
  TERMINATED: "terminated",
} as const;

export type AgentStatusType = (typeof AgentStatus)[keyof typeof AgentStatus];
```

Never use TypeScript `enum` keyword.

## Security

- Never use dynamic code execution functions. No direct `document.cookie` assignment.
- Validate and sanitize all user input.
- Encryption via `@axiom/shared/crypto` (AES-256-GCM).
- No secrets in code — use env vars and the vault.

## Performance

- Top-level regex literals — don't recreate in loops.
- Avoid barrel files except `@axiom/shared`.
- Memoization only when profiling shows measurable value.

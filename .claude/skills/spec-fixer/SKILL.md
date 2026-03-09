---
name: spec-fixer
description: >
  Fix all gaps identified by the spec-auditor skill. Reads an audit-report.md from a speckit spec
  directory, parses all Critical, Major, and Minor gaps, then systematically implements fixes using
  parallel subagents for independent work. Verifies fixes compile and tests pass, then re-runs the
  spec-auditor to produce an updated audit report. Use this skill whenever the user mentions "fix
  the gaps", "close the audit gaps", "implement the missing pieces", "fix audit findings",
  "resolve spec gaps", "make it production ready", "fix all the issues", "address the audit report",
  or wants to act on a spec-auditor report. Also trigger when the user has an audit-report.md and
  wants the gaps resolved.
---

# Spec Fixer

Take the output of a spec audit (audit-report.md) and systematically close every gap — writing real implementation code, not stubs. The goal is to go from a partially-complete codebase to 100% spec compliance in one pass.

## Why this skill exists

The spec-auditor identifies gaps between a specification and its implementation. This skill closes those gaps. Together they form a feedback loop: audit → fix → re-audit → verify. The fixer reads the structured gap report, understands what each gap requires by cross-referencing the original spec artifacts, and produces targeted fixes.

## Inputs

1. **Spec directory path** — containing `audit-report.md` plus the original spec artifacts (`spec.md`, `tasks.md`, `plan.md`, `data-model.md`, `contracts/`)
2. **Codebase root** — the repository root (defaults to current working directory)
3. **Scope** (optional) — `all` (default), `critical`, `critical+major`, or specific gap IDs like `GAP-C001,GAP-M003`

## Process

### Phase 1: Parse and Plan

Read `audit-report.md` from the spec directory. Extract every gap with its:
- ID (e.g., GAP-C001)
- Severity (Critical / Major / Minor)
- Requirement reference (FR-XXX or acceptance scenario)
- Current state (what's actually in the code)
- Proposed fix (from the audit report)
- Affected files
- Scope estimate

Also read the original spec artifacts to get full context for each requirement — the audit report summarizes gaps but the spec has the complete requirement text with all details and constraints. Cross-reference each gap's FR/scenario reference back to the spec to understand the full intent.

Group gaps into independent batches that can be worked on in parallel. Gaps are independent when they affect different files and don't have logical dependencies. For example:
- Database index additions (GAP-C001) are independent of API route creation (GAP-C007)
- Auth fixes (GAP-M002) are independent of Discord wiring (GAP-M003)
- But self-learning integration (GAP-M004) and graceful degradation integration (GAP-M008) both touch `agent-loop.ts`, so they should be in the same batch

Present the execution plan to the user before proceeding:
```
Found X gaps (Y critical, Z major, W minor)
Planned N parallel batches:
  Batch 1: GAP-C001, GAP-M001 (database + validation)
  Batch 2: GAP-C002, GAP-C004 (LLM integration)
  ...
Estimated scope: [summary]
Proceed?
```

### Phase 2: Fix Gaps

For each batch, dispatch subagents to implement fixes in parallel. Each subagent receives:
- The specific gap(s) it's responsible for
- The full requirement text from spec.md
- The current file contents (read before fixing)
- The proposed fix from the audit report
- Project conventions from CLAUDE.md

When fixing gaps, the subagent should:

1. **Read the existing code first.** Understand the patterns, imports, and conventions already in use. Match the existing style exactly — don't introduce new patterns or libraries.

2. **Implement the real logic, not a placeholder.** The whole point is to replace TODOs and stubs with working code. If a function returns an empty array with a TODO comment, replace it with actual logic. If the gap says "wire X to Y", add the actual integration call.

3. **Respect file size limits.** If a fix would make a file exceed ~300 lines, split into a helper module following the project's existing decomposition patterns.

4. **Add the minimum code necessary.** Don't refactor surrounding code, add features beyond the gap, or "improve" things that aren't broken. Fix exactly what the gap describes.

5. **Handle the "wiring" gaps carefully.** Many gaps are about connecting existing modules that work independently but aren't integrated (e.g., self-learning functions exist but aren't called from the agent loop). These fixes are usually small — an import and a function call in the right place — but getting the right place wrong breaks things.

6. **For database changes** (missing indexes, schema updates), create a new migration rather than editing the existing one. Use the project's migration tooling (e.g., `drizzle-kit generate`).

7. **For missing API routes**, follow the exact patterns of existing routes in the same project. Match auth middleware usage, error handling, response shapes, and Zod validation patterns.

### Phase 3: Verify

After all batches complete:

1. **Type check** — Run `pnpm build` (or the project's build command from CLAUDE.md) to verify TypeScript compilation passes.

2. **Run tests** — Run `pnpm test` (or the project's test command) to verify existing tests still pass. New code from gap fixes may not have tests yet — that's OK for this pass if the gaps didn't specifically call for tests.

3. **Fix any failures** — If build or tests fail, diagnose and fix. Common issues:
   - Import paths wrong (ESM requires `.js` extensions in some configs)
   - Type mismatches from new function signatures
   - Missing dependencies that need to be installed

4. **Spot-check critical fixes** — For critical gaps, read the fixed file to verify the implementation is substantive and correct, not just a different flavor of placeholder.

### Phase 4: Re-audit

Run the spec-auditor skill against the same spec directory to produce an updated `audit-report.md`. This closes the loop — the new report shows which gaps were successfully resolved and which (if any) remain.

Compare the before/after:
- How many gaps were closed?
- Did any new gaps appear? (Shouldn't happen, but integration work can surface issues)
- What's the new FR coverage percentage?

Present a summary to the user:
```
Gaps fixed: X/Y
  Critical: A/B resolved
  Major: C/D resolved
  Minor: E/F resolved
Remaining gaps: [list if any]
Build: passing
Tests: passing (N tests)
```

### Phase 5: Save Results

Update the `audit-report.md` in the spec directory with the new audit results (this happens automatically when the spec-auditor re-runs in Phase 4).

## Handling different gap types

### Critical gaps (always fix)
These block production readiness. Attack them first and verify thoroughly.

### Major gaps (fix by default)
These represent incomplete features. Fix unless the user explicitly scopes them out.

### Minor gaps (fix if scoped in)
These are often style/convention differences (query params vs sub-routes, etc.) that may be intentional. Ask the user before fixing minor gaps if they seem like design choices rather than oversights.

### Observations (never fix)
These are informational — the audit flagged them for awareness but they're not gaps. Don't change code for observations.

## Important considerations

- **Don't break working code to fix gaps.** If a gap fix conflicts with existing functionality, flag it to the user rather than introducing a regression.

- **Read before writing.** Every file must be read before editing. The audit report describes gaps at a high level — the actual fix requires understanding the surrounding code.

- **Respect the spec, not just the audit report.** The audit report summarizes gaps, but the spec has the full requirement text. When in doubt about what a fix should do, refer to the original FR or acceptance scenario in spec.md.

- **One concern per commit.** If the user asks for a commit after fixing, group related gaps into logical commits (e.g., "fix: add missing vector indexes" for GAP-C001, not one massive commit for everything).

- **Integration gaps are the hardest.** Gaps like "X exists but isn't wired to Y" require understanding both modules and their interfaces. Read both files carefully before adding the integration point.

---
name: spec-auditor
description: >
  Audit a codebase against speckit design artifacts (spec.md, plan.md, tasks.md, data-model.md, contracts/)
  to verify 100% implementation coverage of all user stories, acceptance scenarios, functional requirements,
  and tasks. Produces a structured gap analysis report with specific findings and proposed fixes.
  Use this skill whenever the user mentions "audit", "verify implementation", "check spec coverage",
  "gap analysis", "are all tasks done", "is the spec fully implemented", "production readiness check",
  "compare spec to code", "implementation completeness", or wants to validate that their codebase
  matches their design documents. Also use when the user has a specs/ or .specify/ directory and
  wants to know if anything is missing or incomplete.
---

# Spec Auditor

Systematically audit a codebase against its speckit design artifacts to identify implementation gaps, incomplete features, and deviations from the specification. The goal is to verify that every user story, acceptance scenario, functional requirement, and task is fully implemented to production quality.

## Why this skill exists

Speckit generates comprehensive design artifacts (spec, plan, tasks, data model, API contracts) that define exactly what needs to be built. As implementation progresses, it's easy for gaps to emerge — a functional requirement partially implemented, an acceptance scenario missing a key behavior, a task marked complete but missing edge case handling. This skill provides a rigorous, systematic audit to catch those gaps before they reach production.

## When to use

- After completing implementation of a feature branch
- Before creating a PR for a speckit-planned feature
- When the user wants to verify "is everything done?"
- During production readiness reviews
- When resuming work on a partially-implemented spec

## Inputs

1. **Spec directory path** — the directory containing speckit artifacts (e.g., `specs/001-my-feature/` or `.specify/specs/my-feature/`)
2. **Codebase root** — the repository root (defaults to current working directory)

## Process

### Phase 1: Parse Design Artifacts

Read and parse all speckit artifacts from the spec directory. Extract structured data from each:

**From `spec.md`:**
- All user stories (title, priority, description)
- All acceptance scenarios (Given/When/Then)
- All functional requirements (FR-XXX with full text)
- All success criteria (SC-XXX)
- All edge cases and their resolutions
- Key entities

**From `tasks.md`:**
- All tasks with their IDs, descriptions, file paths, and completion status (`[x]` vs `[ ]`)
- Phase groupings and checkpoint criteria
- Test tasks separately from implementation tasks

**From `plan.md`:**
- Project structure (expected directories and files)
- Technical context and dependencies
- Complexity tracking

**From `data-model.md`** (if present):
- All entity definitions, fields, relationships, indexes
- Compare against actual DB schema/ORM definitions

**From `contracts/`** (if present):
- API endpoint definitions (routes, methods, request/response schemas)
- Compare against actual route implementations

### Phase 2: Dispatch Parallel Auditors

This is the core of the audit. Use subagents to parallelize the work — each auditor focuses on one dimension of completeness. Launch all auditors simultaneously.

**Auditor 1: Task Completion Verification**
- For every task in `tasks.md`, verify the referenced file exists
- For tasks marked `[x]`, verify the file contains substantive implementation (not just scaffolding/stubs/TODOs)
- For tasks marked `[ ]`, flag as explicitly incomplete
- Check that test tasks have actual test cases, not empty test files
- Report: list of tasks with status (verified/stub/missing/incomplete)

**Auditor 2: Functional Requirements Coverage**
- For each FR-XXX in `spec.md`, search the codebase for its implementation
- Verify the requirement is fully satisfied, not just partially
- Pay special attention to:
  - "MUST" requirements — these are non-negotiable
  - Multi-part requirements (e.g., "System MUST do X and Y and Z") — verify ALL parts
  - Requirements with specific thresholds or defaults — verify the actual values match
  - Requirements referencing other requirements — verify the cross-references are implemented
- Report: list of FRs with coverage status (fully-covered/partially-covered/missing) and evidence

**Auditor 3: Acceptance Scenario Validation**
- For each user story's acceptance scenarios, trace the Given/When/Then through the code
- Verify there is code that handles the "When" trigger
- Verify the "Then" outcome is actually produced
- Check if there are tests that exercise each scenario
- Report: list of scenarios with validation status and gaps

**Auditor 4: API Contract Compliance** (if contracts/ exists)
- For each endpoint in the API contract, verify a matching route handler exists
- Check request validation matches the contract's schema
- Check response shape matches the contract's definition
- Verify auth requirements are enforced as specified
- Report: list of endpoints with compliance status and deviations

**Auditor 5: Data Model Compliance** (if data-model.md exists)
- For each entity in the data model, verify a matching DB schema/ORM definition exists
- Check all fields are present with correct types
- Check indexes, constraints, and relations match
- Report: list of entities with compliance status and missing fields/indexes

**Auditor 6: Project Structure Verification**
- Compare the expected project structure from `plan.md` against actual filesystem
- Identify missing directories or files
- Identify unexpected files that might indicate scope creep or orphaned code
- Report: structure compliance status

### Phase 3: Synthesize Gap Report

Collect all auditor results and produce a unified gap analysis report. Organize findings by severity:

**Critical Gaps** — Functional requirements marked MUST that are missing or substantially incomplete. Acceptance scenarios with no implementation path. Tasks marked complete but file is missing or empty.

**Major Gaps** — Partially implemented requirements (some parts done, others missing). Acceptance scenarios that are implemented but missing edge cases specified in the spec. API endpoints that exist but don't match the contract.

**Minor Gaps** — Data model fields present but with slightly different types. Missing indexes that are specified but don't affect correctness. Test coverage gaps where the feature works but tests are thin.

**Observations** — Things that look implemented but differ from the spec in ways that might be intentional. Potential improvements. Places where the implementation exceeds the spec (which is fine but worth noting).

### Phase 4: Propose Fixes

For each Critical and Major gap, propose a specific fix:
- Which file(s) need to change
- What the change should accomplish
- Estimated scope (one-liner, small function, new module, significant refactor)
- Whether this blocks production readiness

### Phase 5: Save Audit Report

Always save the final report as a markdown document in the spec directory alongside the other artifacts. The file should be named `audit-report.md` and placed in the same directory as `spec.md`, `plan.md`, and `tasks.md`.

This is important because the audit report serves as a living artifact that:
- Documents the current state of implementation completeness
- Provides a prioritized punch list for closing gaps
- Gives future sessions (or other developers) immediate context on what's done vs. what's left
- Can be diffed against future audit runs to track progress

If a previous `audit-report.md` exists, overwrite it with the new results — the report should always reflect the latest audit state. Note the date prominently so it's clear when the audit was run.

## Output Format

Present the report both to the user in conversation AND save it to `{spec-directory}/audit-report.md` using this structure:

```markdown
# Spec Audit Report: [Feature Name]

**Spec**: [path to spec directory]
**Codebase**: [path to repo root]
**Date**: [current date]
**Overall Coverage**: [X]% ([verified tasks] / [total tasks])

## Summary

[2-3 sentence executive summary of findings]

## Critical Gaps ([count])

### [GAP-C001] [Short description]
- **Requirement**: [FR-XXX or acceptance scenario reference]
- **Expected**: [What the spec says]
- **Actual**: [What the code does or doesn't do]
- **Impact**: [Why this matters]
- **Proposed Fix**: [Specific action to close the gap]
- **Scope**: [one-liner | small | medium | large]
- **Files**: [affected file paths]

## Major Gaps ([count])
[Same format as critical]

## Minor Gaps ([count])
[Same format but briefer]

## Observations ([count])
[Brief notes on spec deviations that may be intentional]

## Task Status Summary

| Phase | Total | Verified | Stub/TODO | Missing | Incomplete |
|-------|-------|----------|-----------|---------|------------|
| ...   | ...   | ...      | ...       | ...     | ...        |

## FR Coverage Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-001      | ...    | ...   |

## Acceptance Scenario Coverage

| Story | Scenario | Implemented | Tested |
|-------|----------|-------------|--------|
| US1   | 1.1 ... | Yes/Partial/Missing | test details |

## Next Steps

[Prioritized list of actions to achieve 100% coverage]
```

## Important considerations

- **Don't confuse "marked complete" with "actually complete."** A task checked `[x]` in tasks.md might reference a file that exists but contains only stubs, TODOs, or minimal scaffolding. The auditor should read the actual code and verify substantive implementation.

- **Multi-part requirements need ALL parts verified.** A requirement like "System MUST do X, Y, and Z" is not satisfied if only X and Y are implemented. Each conjunction is a separate verification point.

- **Default values matter.** If the spec says "default: 30 minutes" or "default: 20/80 split", verify those exact defaults appear in the code or configuration.

- **Cross-references create implicit requirements.** When FR-008 references FR-026, both requirements AND their interaction must be verified.

- **Test tasks are first-class.** A feature isn't production-ready if its test tasks are incomplete, even if the implementation tasks are all done.

- **Be precise about evidence.** When reporting a gap, cite the specific spec text and the specific file/line where the implementation falls short. Vague findings are not actionable.

- **Distinguish intent from accident.** Some spec deviations are intentional improvements or scope adjustments. Flag these as observations, not gaps, but still document them so the team can confirm they're intentional.

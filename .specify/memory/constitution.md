<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (initial creation)
Added sections:
  - 7 Core Principles (DRY, YAGNI, Testability, Readability,
    Idiomatic Code, File Decomposition, Living Documentation)
  - Code Quality Standards
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check
    section references constitution gates generically)
  - .specify/templates/spec-template.md ✅ aligned (no constitution-
    specific constraints needed)
  - .specify/templates/tasks-template.md ✅ aligned (task structure
    supports testability and decomposition principles)
  - .specify/templates/agent-file-template.md ✅ aligned (references
    constitution via CLAUDE.md routing)
Follow-up TODOs: None
-->

# Axiom Constitution

## Core Principles

### I. DRY (Don't Repeat Yourself)

Code MUST be clean and abstracted when possible. Never write the
same logic twice.

- Every piece of knowledge MUST have a single, unambiguous,
  authoritative representation in the codebase.
- When duplication is detected, it MUST be extracted into a shared
  abstraction (function, module, constant, or type).
- Configuration values, magic numbers, and string literals MUST be
  defined once and referenced by name.

**Rationale**: Duplication creates divergence. When the same logic
exists in multiple places, updates inevitably miss one, introducing
bugs and inconsistency.

### II. YAGNI (You Aren't Gonna Need It)

Never write something that is not immediately used. If future state
is needed, leave a `TODO` comment in code describing the intent.

- Code MUST serve a current, concrete requirement. Speculative
  abstractions, unused parameters, and premature generalization are
  prohibited.
- `TODO(<context>): <description>` comments are the only acceptable
  way to signal future work.
- Feature flags, backwards-compatibility shims, and extension points
  MUST NOT be added until the need is proven.

**Rationale**: Unused code is untested code. It adds maintenance
burden, cognitive load, and often guesses wrong about future needs.

### III. Testability

All code MUST be testable. Any code that cannot be tested signals
excessive complexity and MUST be decomposed.

- Functions and modules MUST have clear inputs and outputs that can
  be exercised in isolation.
- Side effects MUST be pushed to the boundaries so core logic
  remains pure and testable.
- If writing a test for a unit is difficult, that is a design signal:
  refactor the unit until it is straightforward to test.

**Rationale**: Testability is a proxy for good design. Code that is
hard to test is hard to understand, reuse, and change safely.

### IV. Readability

All code MUST prioritize readability. No deep nesting, long
functions, or poor variable names.

- Functions MUST do one thing and be short enough to comprehend in a
  single reading (guideline: under ~30 lines).
- Nesting depth MUST NOT exceed 3 levels. Extract early returns,
  guard clauses, or helper functions to flatten logic.
- Variable and function names MUST clearly convey intent. Avoid
  abbreviations unless they are universally understood in context.
- Comments MUST explain *why*, not *what*. Self-evident code does
  not need comments.

**Rationale**: Code is read far more often than it is written.
Optimizing for the reader reduces bugs, speeds onboarding, and
makes reviews more effective.

### V. Idiomatic Code

Always defer to idiomatic conventions for whatever language or
framework is in use.

- Code MUST follow the established patterns, naming conventions, and
  style guides of its language ecosystem.
- When a language provides a standard way to accomplish something,
  that approach MUST be preferred over custom solutions.
- Linting and formatting tools appropriate to the language MUST be
  configured and enforced.

**Rationale**: Idiomatic code leverages the collective wisdom of a
language community. It is more predictable, better supported by
tooling, and easier for any practitioner of that language to read.

### VI. File Decomposition

Files MUST never become monolithic. Rely on directory structure
organization for decomposed functionality.

- A file SHOULD stay under approximately 300 lines. Use judgment,
  but treat this as a strong signal to decompose.
- Each file MUST have a single, clear responsibility.
- Directory structure MUST reflect the logical decomposition of the
  system (e.g., group by feature, layer, or domain).
- When a file grows beyond its scope, extract cohesive subsets into
  new files within an appropriate directory structure.

**Rationale**: Small, focused files are easier to navigate, review,
test, and reason about. Monolithic files become bottlenecks for
collaboration and understanding.

### VII. Living Documentation

Always defer to the best practices as documented. CLAUDE.md operates
as the routing mechanism for documentation and best practices in the
codebase as they evolve.

- CLAUDE.md MUST serve as the canonical entry point for all
  development guidance, linking to relevant docs as they are created.
- When practices change, the corresponding documentation MUST be
  updated in the same change set.
- This constitution is the highest-authority document. CLAUDE.md and
  all other guidance documents MUST remain consistent with it.

**Rationale**: Documentation that drifts from reality is worse than
no documentation. A single routing file ensures discoverability and
reduces the chance of stale or contradictory guidance.

## Code Quality Standards

- All pull requests MUST pass linting, formatting, and test suites
  before merge.
- Code review MUST verify adherence to the Core Principles above.
- Technical debt MUST be tracked via `TODO` comments (per Principle
  II) and addressed in a timely manner.
- Dependencies MUST be justified by current need. Remove unused
  dependencies promptly.

## Development Workflow

- Feature work MUST begin with a clear specification before
  implementation starts.
- Implementation MUST follow the plan-then-build sequence defined by
  the speckit workflow (specify, plan, tasks, implement).
- Each user story MUST be independently testable and deliverable.
- Commits MUST be atomic and focused: one logical change per commit.
- Branch names and commit messages MUST be descriptive and follow
  project conventions.

## Governance

This constitution is the highest-authority governance document for
the Axiom project. All development practices, code reviews, and
architectural decisions MUST comply with the Core Principles defined
above.

**Amendment Procedure**:
1. Propose changes via the `/speckit.constitution` command or a pull
   request modifying this file.
2. Document the rationale for the change.
3. Update the version number per semantic versioning rules:
   - MAJOR: Principle removal or backward-incompatible redefinition.
   - MINOR: New principle or materially expanded guidance.
   - PATCH: Clarifications, wording, or non-semantic refinements.
4. Update all dependent documents (CLAUDE.md, templates) in the same
   change set.

**Compliance Review**:
- Every code review MUST include a constitution compliance check.
- The plan template's "Constitution Check" gate MUST reference the
  current principles.
- Violations MUST be resolved before merge unless explicitly deferred
  with a `TODO` and justification.

**Version**: 1.0.0 | **Ratified**: 2026-03-07 | **Last Amended**: 2026-03-07

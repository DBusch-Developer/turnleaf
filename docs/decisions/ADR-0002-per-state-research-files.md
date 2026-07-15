# ADR-0002 — Per-state research files + validated reseed

- **Status:** Proposed
- **Date:** 2026-07-14

## Context

All researched rules currently live in one file, `src/data/fallbackRules.ts` (~550 lines and growing). Adding a state means hand-editing that file and authoring a decision tree whose nodes reference each other by string keys. A single typo (`next: 'sentance_date'`) silently breaks a branch, and the mistake only surfaces when a user hits a dead-end mid-questionnaire. This does not scale as coverage grows and makes the core research workflow error-prone.

This ADR records the design brainstormed for the per-state research workflow (Epic 1, Story 1.3).

## Decision

Split researched rules into **one typed TypeScript file per state** under `src/data/states/<code>.ts`, each exporting a `StateRuleConfig`. An `index.ts` aggregates them into the existing `fallbackRules` shape, so consumers (`client.ts`, `seed.ts`, components) are unaffected via a thin re-export barrel. Provide a commented `_template.ts` (a valid minimal example) to copy for each new state.

Add a **structural validator** (`validateState`) that checks reference resolution, reachability (no dead-ends), and required fields. `db:seed` runs it on every state first and **aborts without writing** if any state is structurally broken, naming the state and the bad key. This validates structure only — never legal correctness.

## Consequences

**Positive**
- Adding a state = copy template, fill one file, add one index line, reseed.
- TypeScript autocompletes fields and flags mistakes while authoring.
- Broken decision trees are caught before they reach the DB or a user (R8).
- No churn for existing importers.

**Negative / trade-offs**
- More files; an `index.ts` to keep in sync (one line per state).
- Validator is code to build and maintain.

## Alternatives considered

- **Plain JSON per state** — rejected: no type-checking or autocomplete for the error-prone decision trees.
- **Admin UI writing directly to the DB** — deferred: much larger build; not needed for a solo research workflow and would break the code-as-source-of-truth model (ADR-0003).
- **Keep one big file** — rejected: doesn't scale; high typo risk.

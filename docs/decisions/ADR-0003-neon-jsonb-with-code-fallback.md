# ADR-0003 — Neon JSONB rules with code source-of-truth + fallback

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

State rules are structured decision trees plus resources. They need to be queryable at runtime, editable by a researcher, resilient to infrastructure hiccups, and runnable locally without external services. We had to decide where the rules live and what is authoritative.

## Decision

Store rules in a Neon (serverless PostgreSQL) `states` table using **JSONB** columns for `rules` and `resources`. Keep `src/data/fallbackRules.ts` as the **source of truth**; `npm run db:seed` mirrors it into Neon (idempotent upsert). At runtime, `db/client.ts` prefers the database and **falls back to `fallbackRules`** when `DATABASE_URL` is absent or the query fails.

## Consequences

**Positive**
- Resilient: the app works during DB outages and with no database at all (NFR-3).
- Local dev needs no database.
- JSONB fits the nested, variable decision-tree shape without rigid schema migrations per rule change.
- Version-controlled rules (the code file) with full diff history.

**Negative / trade-offs**
- Rules exist in two places; they can drift if the seed isn't re-run after a change (R10). Mitigation: code is authoritative; reseed on every rule change.
- JSONB is not relationally validated by the DB; structural validity is enforced in application code (ADR-0002).

## Alternatives considered

- **Database as sole source of truth** — rejected: loses local-without-DB dev and version-controlled diffs; complicates the research workflow.
- **Relational tables for nodes/results** — rejected: heavy schema for a tree that varies per state; JSONB is a better fit.
- **Flat JSON files only, no DB** — rejected: the DB path supports future querying/analytics and matches the cohort stack.

# Epic 5 — Demo, Data Ops & Testing

**Goal:** Make Turnleaf demonstrable, seedable, and verifiable — the operational scaffolding around the product.

**Requirements:** FR-21, FR-22, NFR-3, plus the testing strategy in [`../06-testing.md`](../06-testing.md)

## Story 5.1 — Load mock personas for demos

- **Status:** Built
- As a **presenter/tester**, I want to **load realistic mock records with one click**, so that **I can demo the flow without typing (and reuse them as fixtures)**.
- **Acceptance criteria:**
  - [x] A demo panel lists mock Checkr personas and loads one into the wizard (FR-22).
  - [x] Personas cover eligible, waiting, ineligible, complex, mixed, and multi-state cases.
  - [x] Mock data is clearly demo-only and never treated as real (R11).

## Story 5.2 — Seed the database safely

- **Status:** Built
- As a **maintainer**, I want to **seed the DB from the code rules idempotently**, so that **DB and code never drift (R10)**.
- **Acceptance criteria:**
  - [x] `npm run db:seed` creates the schema and upserts all researched states (FR-21).
  - [x] Re-running is safe (upsert).
  - [ ] Structural validation runs before writing (Phase 1; ties to Story 1.3).

## Story 5.3 — Work without a database or AI key

- **Status:** Built
- As a **developer**, I want the **app to run without a DB or Groq key**, so that **local dev and outages don't break it (NFR-3)**.
- **Acceptance criteria:**
  - [x] No `DATABASE_URL` → serves `fallbackRules`.
  - [x] No `GROQ_API_KEY` → deterministic summary.
  - [ ] Regression tests cover both fallbacks (add tests).

## Story 5.4 — Establish the test suite

- **Status:** Ready (Phase 1)
- As a **maintainer**, I want **automated tests for the engine and safety guarantees**, so that **regressions are caught before users are**.
- **Acceptance criteria:**
  - [ ] Engine unit tests over all researched states and waiting-period boundaries.
  - [ ] Structural validation and language-safety denylist run in CI.
  - [ ] Privacy tests assert no record content is logged/persisted.

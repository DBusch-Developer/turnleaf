# Testing Strategy — Turnleaf

## 1. Philosophy

Turnleaf's highest risk is giving someone a wrong answer about their legal record. Testing prioritizes the **rules engine** and the **safety guarantees** (hedged language, privacy) over UI polish.

**Status:** Vitest is the runner ([ADR-0005](./decisions/ADR-0005-vitest-for-structural-validation.md)); run `npm test`. Only the structural-validation item below is built so far — the rest of this document is still the plan.

## 2. What to test, by priority

### P0 — Rules engine correctness (highest)
- For each researched state (CA, AZ, NY, TX), assert that representative records produce the expected status and citation.
- Cover each branch: offense level, disposition, probation status, prison/restitution flags, and every waiting-period boundary (just-under vs. just-over `yearsRequired`).
- Use the mock Checkr personas as ready-made fixtures — each persona has a known expected outcome (e.g., Marcus CA → eligible expungement; Sarah TX felony → ineligible).

### P0 — Structural validation — ✅ built
- Every state config passes the structural checker (references resolve, no dead-ends, required fields present) — run in CI so a broken tree can never be seeded (FR-21).
- Implemented as `validateState` (`src/data/validateState.ts`), tested in `src/data/validateState.test.ts`, and enforced by `npm run db:seed` and `npm run validate`. CI wiring (GitHub Actions) is still outstanding.

### P1 — Language safety (NFR-1)
- The deterministic summary never contains banned phrasings ("you are eligible," "you should file," "legal advice"). Assert against a denylist.
- The Groq path degrades to the deterministic summary on API failure/no key (mock the fetch).

### P1 — Privacy (NFR-2)
- `/api/summarize` and other handlers do not persist or log record contents.
- No PII is sent to the server from the PDF/candidate-name path.

### P2 — API routes
- `/api/states` returns the 50-state list with correct `available` flags.
- `/api/states/[code]` returns a config for researched states and an in-research payload otherwise; rejects invalid codes.
- `/api/mock-checkr` lists personas and returns a report by id.

### P2 — Graceful degradation (NFR-3)
- With no `DATABASE_URL`, `getState`/`getStatesList` serve `fallbackRules` without error.

### P3 — Component / e2e
- Wizard checkpoint gate disables submission until confirmed (FR-5).
- Full flow: select state → enter record → checkpoint → results render with citation.
- In-research panel renders for an unresearched state.

## 3. Suggested tooling

- **Unit/integration:** Vitest (fast, TS-native). Extract `evaluateRecord` into a pure, importable module to test without React.
- **Component/e2e:** React Testing Library and/or Playwright for the checkpoint and full-flow tests.
- **CI:** run lint, build, unit tests, and structural validation on every PR (GitHub Actions).

## 4. Fixtures

Reuse `mockCheckrPersonas` as the canonical fixture set; keep each persona's expected screening outcome documented alongside it so tests and demos stay in sync.

## 5. Definition of "tested" for a new state

Engine tests cover every result path in the state's tree, including both sides of each waiting-period boundary, and the config passes structural validation in CI.

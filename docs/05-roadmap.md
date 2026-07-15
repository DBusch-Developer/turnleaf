# Roadmap — Turnleaf

Build order and coverage plan. The guiding constraint: **never grow coverage by lowering the "cited rules only" bar.** Correctness before breadth.

## Phase 0 — Foundation (done)

- Next.js 16 + React 19 + Tailwind 4 scaffold.
- Neon `states` table + JSONB rule storage + `db:seed`.
- Deterministic rules engine and four-status results.
- Screening flow: selector → wizard → checkpoint → results.
- Plain-language summary (Groq + deterministic fallback).
- Filing packets, legal-aid referrals, client-side PDF.
- Four researched states: CA, AZ, NY, TX.
- Mock Checkr demo personas.

## Phase 1 — Harden the core (current)

- **Documentation baseline** (this doc set): governance, PRD, architecture, data model, UX, testing, risks, stories, ADRs.
- **Per-state research files + validated reseed** — split `fallbackRules.ts` into per-state typed files with a template and a structural validator run before seeding. *(This is the paused design; it becomes ADR-0002 and the first Phase-1 story.)*
- **Generalize the rules engine** — remove state-specific node-name branching so new states need data only, not engine edits (see [`02-architecture.md`](./02-architecture.md) §8, [`07-risk-register.md`](./07-risk-register.md)).
- **Consolidate waiting-period math** — single source shared by engine and results.
- **Baseline tests** — engine unit tests over all researched states; structural validation in CI (see [`06-testing.md`](./06-testing.md)).

## Phase 2 — Expand coverage

- Research and encode the next tranche of states (prioritize by population / need).
- Each state ships only with cited statutes, a `lastReviewed` date, and passing structural validation.
- Track coverage and review dates; add a "last reviewed" freshness policy.

## Phase 3 — Trust & polish

- Accessibility pass (WCAG-minded; keyboard, contrast, semantics).
- Content review of all hedged copy for language-safety consistency (NFR-1).
- Clear disclaimers and an "about our sources / methodology" page.
- Optional: print-optimized PDF, multi-language exploration.

## Explicitly deferred (not now)

- User accounts / saved screenings.
- Real Checkr (or any real background-check) integration.
- Document e-filing or payments.
- Attorney marketplace / referrals beyond legal-aid links.

## Definition of "a state is done"

Researched from primary statutes · encoded as a valid decision tree (passes structural validation) · every result cited · remedies have forms/fees/steps/court contact · legal-aid links verified · `verificationStatus` and `lastReviewed` set · engine tests pass for its paths.

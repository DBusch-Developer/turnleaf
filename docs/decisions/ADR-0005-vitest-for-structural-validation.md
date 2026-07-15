# ADR-0005 — Vitest as the test runner, starting with structural validation

- **Status:** Accepted
- **Date:** 2026-07-15

## Context

Turnleaf has no test suite and no test runner. [`docs/06-testing.md`](../06-testing.md) names Vitest as the intended tool and lists structural validation as a P0 item, but neither exists in `package.json` — the doc describes a plan, not reality.

The immediate need is the `validateState` structural checker proposed in [ADR-0002](./ADR-0002-per-state-research-files.md). Three docs already describe that checker as if it ships: [`docs/03-data-model.md`](../03-data-model.md) §4 says "The seed validates these before writing (FR-21)", and [`docs/01-prd.md`](../01-prd.md) FR-21 calls the seed "validated". `src/db/seed.ts` does neither — it creates the table and upserts.

That gap is not cosmetic. Nothing today catches a decision-tree typo. The rules engine papers over broken trees at runtime: unmatched traversal falls through to a hardcoded result in `EligibilityWizard.tsx` carrying the fabricated citation `'General State Sealing Statutes'`. So a broken tree does not crash — it silently produces a plausible-looking answer for a real person. Structure must be checked before the data is seeded, not after a user hits it.

A validator is pure graph logic with many failure modes (broken reference, orphan node, cycle, missing field). An unverified checker is worse than none: it reports "valid" and is believed. It needs tests, which means the project needs a test runner. Adding one is a major dependency, which [`RULES.md`](../../RULES.md) → Change control requires an ADR for.

## Decision

Adopt **Vitest** as the test runner, added as a dev dependency with a `test` script. Its first use is test-driving `validateState`.

Scope is deliberately narrow: this ADR adopts the runner and covers structural validation. It does not commit to a component/e2e tool — `docs/06-testing.md` suggests React Testing Library and Playwright, and those remain open decisions for a later ADR.

This ADR **does not** accept ADR-0002. That ADR bundles two things: the validator and a split of `fallbackRules.ts` into per-state files under `src/data/states/`. Only the validator is being built. ADR-0002 stays **Proposed** for its file-split half.

## Consequences

**Positive**
- A decision-tree typo is caught at seed time, naming the state and the bad key, instead of silently degrading into a fabricated-citation result (R8).
- FR-21's "validated seed" and data-model §4 become true statements rather than aspirations.
- The validator's own logic is verified and regression-protected.
- Unblocks the rest of `docs/06-testing.md`'s P0/P1 work (rules-engine correctness, language-safety denylist) — the runner is the prerequisite.

**Negative / trade-offs**
- A dev dependency and its config to maintain.
- Vitest overlaps Next 16's own tooling; we accept a separate runner rather than wiring a Next-native harness.
- Structural validity is easily mistaken for correctness. The validator checks that a tree is *well-formed*, never that the law is *right*. No automated check can do the latter, and nothing here reduces the need for cited primary sources.

## Alternatives considered

- **Ship the validator with no tests** — rejected: a silently wrong checker is worse than an absent one, because it manufactures false confidence in exactly the data we are least able to eyeball.
- **Jest** — rejected: slower, heavier ESM/TS setup; `docs/06-testing.md` already names Vitest, and there is no reason to contradict it.
- **Node's built-in `node:test`** — rejected: no dependency is appealing, but the TS story needs extra wiring and it forfeits the watch mode and assertion ergonomics that make the rest of the P0 suite likely to actually get written.
- **Keep the manual checklist** (as [`CONTRIBUTING.md`](../../CONTRIBUTING.md) currently documents) — rejected: reference resolution and reachability across a growing string-keyed graph is precisely what humans are bad at and machines are good at.

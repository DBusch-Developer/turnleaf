# Epic 1 — State Coverage & Research

**Goal:** Grow the set of states with researched, cited record-clearing rules — without ever lowering the "cited rules only" bar. This is Turnleaf's core ongoing work.

**Requirements:** FR-2, FR-9, FR-21, NFR-4

## Story 1.1 — See all states, know which are covered

- **Status:** Built
- As a **user**, I want to **see all 50 states and which have real rules**, so that **I know whether Turnleaf can help me yet**.
- **Acceptance criteria:**
  - [x] All 50 states appear in the selector (FR-1).
  - [x] States with researched rules are marked available; others lead to the in-research panel.
  - [x] Availability reflects the database, falling back to `fallbackRules`.

## Story 1.2 — Honest in-research answer for uncovered states

- **Status:** Built
- As a **user in an uncovered state**, I want **an honest answer with real referrals**, so that **I'm not misled and still get help**.
- **Acceptance criteria:**
  - [x] Selecting an unresearched state shows the in-research panel (FR-9).
  - [x] National referral links are shown (CCRC, LSC directory).
  - [x] No rules — guessed or template — are ever shown.

## Story 1.3 — Add a researched state via per-state files + validated seed

- **Status:** Ready (Phase 1; becomes ADR-0002)
- As a **rule researcher**, I want to **encode a new state in its own validated file and reseed**, so that **I can add coverage safely without editing one giant file or risking a broken tree**.
- **Acceptance criteria:**
  - [ ] Each state lives in its own typed file with a copy-able template.
  - [ ] A structural validator (references resolve, no dead-ends, required fields) runs before seeding and aborts on error, naming the state and bad key.
  - [ ] `npm run db:seed` remains idempotent.
  - [ ] Existing CA/AZ/NY/TX migrate unchanged and still validate.
- **Notes:** Never encode a rule that isn't tied to a primary statute; set `verificationStatus` and `lastReviewed`.

## Story 1.4 — Keep encoded law fresh

- **Status:** Draft (Phase 2)
- As a **maintainer**, I want **a review cadence and visible review dates**, so that **stale law is caught before it misleads a user (R2)**.
- **Acceptance criteria:**
  - [ ] Each state shows `lastReviewed` in the UI.
  - [ ] A documented policy defines how often rules are re-verified.

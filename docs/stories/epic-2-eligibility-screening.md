# Epic 2 — Eligibility Screening

**Goal:** Let a user enter their record and get a deterministic, per-charge eligibility result under their state's rules.

**Requirements:** FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-10, FR-14

## Story 2.1 — Enter one or more charges

- **Status:** Built
- As a **user**, I want to **enter multiple charges with their details**, so that **I can screen my whole record at once**.
- **Acceptance criteria:**
  - [x] Add/remove charge cards (FR-3).
  - [x] Capture charge name, offense class, disposition, date, probation status.
  - [x] Show state-specific fields (CA prison flag, AZ restitution) (FR-10).

## Story 2.2 — Guidance when I don't know a detail

- **Status:** Built
- As a **user unsure of my record**, I want **help getting my official records**, so that **I can answer accurately**.
- **Acceptance criteria:**
  - [x] Selecting "unknown" reveals RAP-sheet retrieval instructions (FR-4).
  - [x] Instructions include a state legal-aid link.

## Story 2.3 — Confirm accuracy before results (checkpoint)

- **Status:** Built
- As a **user**, I want to **review and confirm my entries before results**, so that **I don't get a confident but wrong answer (R8)**.
- **Acceptance criteria:**
  - [x] A review table shows all entered records (FR-5).
  - [x] Results cannot be generated until the confirmation checkbox is checked.

## Story 2.4 — Get a deterministic per-charge result

- **Status:** Built
- As a **user**, I want **each charge evaluated against my state's rules**, so that **I get a clear status and the reason**.
- **Acceptance criteria:**
  - [x] The engine walks the decision tree to a terminal result (FR-6).
  - [x] Each result is eligible / waiting / ineligible / complex (FR-7).
  - [x] Each result shows its governing citation (FR-14).
  - [x] Waiting results show the earliest potential eligibility date (FR-8).

## Story 2.5 — Data-driven engine (Phase 1 hardening)

- **Status:** Ready
- As a **maintainer**, I want the **engine to be fully data-driven**, so that **adding a state needs data only, not engine edits (R7)**.
- **Acceptance criteria:**
  - [ ] Node evaluation no longer branches on hard-coded node names.
  - [ ] All four researched states pass regression tests after the refactor.
  - [ ] Waiting-period math is defined once and shared with results.

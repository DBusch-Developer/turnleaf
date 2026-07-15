# Product Requirements Document — Turnleaf

Status: MVP built for four researched states. Requirement IDs (`FR-*`, `NFR-*`) are referenced directly in the source code; keep them stable.

## 1. Overview

Turnleaf screens a user's criminal record against their state's researched, cited record-clearing law and returns a hedged, plain-language eligibility result per charge, plus the concrete forms, fees, and legal-aid referrals to act on it — anonymously.

## 2. Scope

**In scope (MVP):** state selection, multi-charge entry, a deterministic per-state rules engine, four result statuses, waiting-period date estimates, plain-language summaries, filing packets, PDF export, honest in-research handling, and a mock background-check demo.

**Out of scope (MVP):** user accounts, saved history, real background-check integration, document e-filing, payments, non-English localization.

## 3. Functional requirements

### State selection & coverage
- **FR-1** — Display all 50 states in a searchable selector, marking which have researched rules vs. in-research.
- **FR-2** — Load a state's rule config from the database, falling back to `fallbackRules` when the DB is unavailable.
- **FR-9** — For a state without researched rules, show an honest in-research panel with national referral links; never show generic rules.

### Record entry
- **FR-3** — Support screening multiple charges/records in one session.
- **FR-4** — When a user marks charge type or disposition "unknown," show instructions for obtaining their official RAP sheet, with a state legal-aid link.
- **FR-10** — Show state-specific conditional fields (e.g., CA state-prison flag, AZ restitution-paid flag).
- **FR-5** — Require a pre-screening checkpoint where the user confirms their entries match official records before results are generated.

### Rules engine
- **FR-6** — Evaluate each record deterministically by walking the state's decision-tree nodes to a terminal result.
- **FR-7** — Classify every result as one of: `eligible`, `waiting`, `ineligible`, `complex`.
- **FR-8** — For `waiting` results, compute and display the earliest potential eligibility date and months remaining.
- **FR-14** — Display the governing statute citation for each result.

### Results, guidance & output
- **FR-12** — Generate a warm, plain-language summary of the results via the Groq API.
- **FR-13** — If no AI key or the API fails, generate a deterministic plain-language summary with the same safety guarantees.
- **FR-15** — For eligible results, present the required petition form(s) with links.
- **FR-16** — For each remedy, show estimated fees, fee-waiver info, where to file, and a step-by-step filing checklist.
- **FR-17** — Show per-state legal-aid referral links, recommending attorney review before filing.
- **FR-18** — Generate a downloadable PDF report of the screening, compiled client-side.
- **FR-19** — Allow an optional candidate name for PDF personalization, processed locally only.
- **FR-20** — Allow the user to reset and start a new screening at any time.

### Data & operations
- **FR-21** — Provide a validated, idempotent seed (`npm run db:seed`) that mirrors `fallbackRules` into the database.
- **FR-22** — Provide a demo panel that loads mock Checkr background-check personas to prepopulate records (demo/testing only).

## 4. Non-functional requirements

- **NFR-1 — Language safety.** No user-facing output may give legal advice or assert definitive eligibility. All results are hedged and route to professional confirmation. Applies to AI and deterministic paths alike.
- **NFR-2 — Privacy / anonymity.** No names, SSNs, DOBs, or charge files are collected or persisted server-side. No record content or user answers are logged. PDF personalization stays in the browser.
- **NFR-3 — Graceful degradation.** The app remains usable when the database is down (code fallback) and when the AI key is absent (deterministic summary).
- **NFR-4 — Data integrity.** Only researched, statute-cited rules are ever shown. No generic or template rules. Each state carries a `lastReviewed` date and `verificationStatus`.
- **NFR-5 — Performance.** State configs load quickly; the app tolerates Neon serverless cold starts without breaking the flow.
- **NFR-6 — Accessibility.** Semantic HTML, keyboard operability, and readable contrast; plain reading level in user-facing copy.
- **NFR-7 — Maintainability.** Legal rules live as data (`StateRuleConfig`), not hard-coded branches, so states can be added without engine changes. *(Note: the current engine has some state-specific logic; see [`05-roadmap.md`](./05-roadmap.md) and [`07-risk-register.md`](./07-risk-register.md).)*

## 5. Acceptance criteria (MVP)

- A user can screen a multi-charge record in any of CA, AZ, NY, TX and receive per-charge statuses with citations.
- Eligible results show a real form, fee, fee-waiver, court contact, and steps.
- Waiting results show a computed eligibility date.
- Every summary is hedged and never advises filing.
- Selecting an unresearched state shows the in-research panel with referrals.
- No PII is stored or logged; the PDF is generated client-side.
- Removing `DATABASE_URL` still yields a working app via fallback.

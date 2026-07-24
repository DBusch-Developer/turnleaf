# Epic 3 — Results, Guidance & Output

**Goal:** Turn raw screening results into a plain-language, actionable packet the user can take to the next step.

**Requirements:** FR-12, FR-13, FR-15, FR-16, FR-17, FR-18, FR-19

## Story 3.1 — Plain-language summary

- **Status:** Built
- As a **user**, I want **my results explained in warm, plain language**, so that **I understand what they mean without a lawyer**.
- **Acceptance criteria:**
  - [x] A summary is generated via Groq (FR-12).
  - [x] It is hedged and never advises filing (NFR-1).
  - [x] If the AI is unavailable, a deterministic summary with the same guarantees is shown (FR-13).

## Story 3.2 — The form and steps to file next

- **Status:** Built
- As a **user whose screening found any path at all**, I want **the exact form, fees, and steps**, so that **I know precisely how to act**.
- **Acceptance criteria:**
  - [x] Eligible results show the required form with a link (FR-15).
  - [x] Fees, fee-waiver info, where to file, and a step checklist are shown (FR-16).
  - [x] `waiting` and `complex` results show the packet too, framed so it never reads as a clearance to file. Previously gated on `eligible` alone, which withheld the form from the statuses that most need a next step — an AZ DUI (`complex_dui_az`) was told the § 13-905 set-aside was "worth pursuing either way" while the set-aside form, its steps, and its $0 filing fee were all suppressed.
  - [x] The gate is evaluated per record, not across the whole state section, so the same charge no longer shows a form or not depending on what else the person entered.
  - [x] Screen and PDF share one decision (`src/utils/remedyPanel.ts`); regression tests in `src/utils/remedyPanel.test.ts`.

## Story 3.3 — Legal-aid referrals

- **Status:** Built
- As a **user**, I want **local legal-aid links**, so that **I can get professional help before I file (R9)**.
- **Acceptance criteria:**
  - [x] Per-state legal-aid links are shown (FR-17).
  - [x] Copy recommends attorney review before filing.

## Story 3.4 — Download a PDF packet

- **Status:** Built
- As a **user**, I want to **download my results as a PDF**, so that **I can keep or share them**.
- **Acceptance criteria:**
  - [x] A PDF is generated client-side (FR-18).
  - [x] Optional candidate name personalizes it and stays in the browser (FR-19, NFR-2).

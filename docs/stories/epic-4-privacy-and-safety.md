# Epic 4 — Privacy & Language Safety

**Goal:** Guarantee the two promises that make Turnleaf trustworthy: it stays anonymous, and it never gives legal advice or invents law. These are cross-cutting constraints on every other epic.

**Requirements:** NFR-1, NFR-2, NFR-4

## Story 4.1 — Stay anonymous

- **Status:** Built
- As a **user**, I want to **use Turnleaf without revealing my identity**, so that **I can check my record safely**.
- **Acceptance criteria:**
  - [x] No accounts, no login, no server-side persistence of records.
  - [x] No names, SSNs, or DOBs are collected server-side.
  - [x] The optional candidate name is used only in the browser (NFR-2).
  - [ ] No handler logs record content or user answers (add tests — see testing doc).

## Story 4.2 — Never give legal advice

- **Status:** Built
- As a **user**, I want **honest, hedged output**, so that **I'm informed but not misled into thinking it's legal advice**.
- **Acceptance criteria:**
  - [x] AI and deterministic summaries both avoid definitive/advice phrasing (NFR-1).
  - [x] Persistent informational-only disclaimer.
  - [ ] Automated denylist test guards banned phrasings (add test).

## Story 4.3 — Never show uncited or template rules

- **Status:** Built
- As a **user**, I want to **trust that every rule is real**, so that **I'm not given a made-up answer**.
- **Acceptance criteria:**
  - [x] Every shown rule has a citation; uncovered states show the in-research panel (NFR-4).
  - [x] No generic/template fallback rules exist in the codebase.

## Story 4.4 — Accessibility baseline

- **Status:** Draft (Phase 3)
- As a **user with a disability**, I want **an accessible interface**, so that **I can use Turnleaf independently**.
- **Acceptance criteria:**
  - [ ] Status is never conveyed by color alone.
  - [ ] Keyboard operable; semantic HTML; sufficient contrast (NFR-6).

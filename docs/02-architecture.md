# Architecture — Turnleaf

## 1. Overview

Turnleaf is a Next.js 16 (App Router) application. The UI is a single-page, step-based client flow; server work happens in Route Handlers. Legal rules are stored as data — in a Neon PostgreSQL `states` table, mirrored from `src/data/fallbackRules.ts` — and evaluated by a deterministic client-side engine. There is no user database and no persisted personal data.

## 2. High-level diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React 19 client)                               │
│                                                          │
│  page.tsx  ──►  StateSelector                            │
│      │          EligibilityWizard  ──► rules engine (FR-6)│
│      │          ResultsDisplay     ──► pdfGenerator (FR-18)│
│      │          ComingSoonPanel / CheckrMockPanel        │
│      ▼                                                   │
│   fetch()                                                │
└───────┼──────────────────────────────────────────────────┘
        │  HTTP (JSON)
        ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js Route Handlers (server, src/app/api/*)          │
│                                                          │
│  /api/states           list states (FR-1)               │
│  /api/states/[code]    one state config or in-research  │
│  /api/summarize        Groq rephrase + fallback (FR-12/13)│
│  /api/mock-checkr      demo personas (FR-22)             │
└───────┬───────────────────────────────┬──────────────────┘
        │                               │
        ▼                               ▼
┌────────────────────┐          ┌───────────────────┐
│  db/client.ts      │          │  Groq API         │
│  Neon (JSONB)      │◄─ seed ─ │  (server-side key)│
│  + fallbackRules   │  db:seed └───────────────────┘
└────────────────────┘
```

## 3. Layers & responsibilities

- **Presentation (client components).** `page.tsx` orchestrates a step machine (select → wizard → results, or in-research). Components: `StateSelector`, `EligibilityWizard`, `ResultsDisplay`, `ComingSoonPanel`, `CheckrMockPanel`, `CheckrUpload` (client-side report import).
- **Rules engine (client).** `evaluateRecord` in `EligibilityWizard` walks a state's decision tree (`startNode` → nodes → result). Deterministic; no network call. See [`03-data-model.md`](./03-data-model.md).
- **Route Handlers (server).** Own all server-side concerns and secrets. `/api/summarize` is the only holder of the Groq key.
- **Data access.** `db/client.ts` wraps Neon and encapsulates the DB→`fallbackRules` fallback. `db/seed.ts` mirrors code rules into the DB.
- **Data.** `src/data/fallbackRules.ts` is the source of truth for researched rules, the 50-state directory, and national referrals.

## 4. Key data flows

**Screening (happy path):**
1. User selects a state → `GET /api/states/[code]` → `getState()` returns the config (DB or fallback), or an in-research payload.
2. User enters records → checkpoint confirmation (FR-5).
3. `evaluateRecord` runs locally per record → four-status results.
4. `ResultsDisplay` posts results to `/api/summarize` for a hedged summary (Groq or deterministic fallback).
5. User downloads a client-side PDF (`utils/pdfGenerator`).

**In-research path:** `getState()` returns null → route returns `{ comingSoon: true, referrals }` → `ComingSoonPanel`.

## 5. Source-of-truth & fallback model

`fallbackRules.ts` (code) is authoritative. `npm run db:seed` copies it into Neon. At runtime the app prefers the DB and falls back to the code if the DB is unavailable. This gives resilience (NFR-3) and lets the app run with no database at all. *(The redundancy is deliberate; the trade-off is documented as an ADR — see `decisions/`.)*

## 6. Privacy architecture (NFR-2)

- No users table, no auth, no session persistence.
- Record entries live only in React state for the session.
- The optional candidate name is used only in the browser for the PDF; it is never sent to the server.
- `/api/summarize` receives charge/result text to rephrase but must not log it.

## 7. External dependencies

- **Neon** — serverless Postgres; tolerate cold starts.
- **Groq** — plain-language rephrasing; must degrade to the deterministic summary on any failure.
- **Checkr** — *no API integration*; mock personas for the demo panel. A person's own downloaded report PDF can be imported client-side (`CheckrUpload` -> `utils/pdfText` -> `data/checkrParse`); the file never leaves the browser and there is no upload endpoint (ADR-0006).

## 8. Known architectural debt

- The rules engine contains **state-specific branching by node name** (e.g., `if (currentNodeId === 'prison_sentence')`) rather than being fully data-driven. Adding states currently can require engine edits. Making the engine generic is a tracked roadmap item (see [`05-roadmap.md`](./05-roadmap.md), [`07-risk-register.md`](./07-risk-register.md)).
- Waiting-period math is partly duplicated between the engine and `ResultsDisplay.getWaitingDetails`.

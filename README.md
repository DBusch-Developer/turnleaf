# Turnleaf

**Fifty states of record-clearing law. One plain answer, and the form to file next.**

Turnleaf is an anonymous, web-based record-clearing (expungement) eligibility screening tool for justice-impacted individuals. You pick your state — or several — answer a few plain-language questions about your record, and Turnleaf tells you where each charge may stand under that state's sealing, expungement, or set-aside laws, then points you to the actual petition form, filing fee, and local legal-aid help to take the next step.

> ⚖️ **Turnleaf is not a law firm and does not provide legal advice.** It is an informational screening tool. Results are potential outcomes based on what you enter, not a legal determination. Always confirm with a legal-aid attorney or court clerk before filing.

---

## What makes it different

- **Real cited law, not templates.** Every rule is tied to a specific statute (code number + last-reviewed date). No generic or approximate rules ever ship. See [`RULES.md`](./RULES.md).
- **The machine holds what it can; a human holds the rest.** `npm run validate` enforces structural integrity, null-handling, and provenance — but it has never read a research package and never will. Whether a citation is real, whether a waiting period is accurate, whether a date is stated at the precision claimed: those are human-held, and [`AGENTS.md`](./AGENTS.md) says exactly which is which.
- **Unknown is spelled `null`.** If a package doesn't state a fee or a period, the field is null and carries an open question naming it — never a default, never a "typical" value. The validator fails the build on a null with no question behind it.
- **Anonymous by design.** No names, no Social Security numbers, no stored charge files, no accounts. PDF summaries compile in your browser, and an uploaded background check is parsed there too — there is no upload endpoint to send it to.
- **Ends with a next step.** Results compile direct links to petition forms, estimated fees, fee-waiver rules, where to file, and local legal aid.
- **Plain, hedged language.** Every result is rephrased into warm, non-advice language that recommends confirming with a professional before filing.

## Current coverage

**All 50 states are encoded and `statute_cited`** — each one's rules were read against its official statute text and carry citations. No state sits at `draft`.

**521 sources** are recorded. **384 carry a `retrievedOn`** — a human opened that official text and dated it. **358 of those also carry a `url`.** The 26-source gap is deliberate: a link is a per-source claim that someone read *that* text, so a `url` may never be set without a `retrievedOn`, but a source can be read before its official URL is supplied (Florida's statutes were read on 7/16 with links held pending). The validator enforces the asymmetry — zero sources carry a url without a date. The remaining 137 sources are cited but not yet individually read.

`statute_cited` is not the top of the ladder. The verification tiers are:

| Status | Meaning |
|---|---|
| `draft` | Encoded from a research package; not yet read against the statute. **None currently.** |
| `statute_cited` | A human read the official statute text and confirmed the encoded rules. **All 50.** |
| `phone_verified` | The practical details — county filing fees, which form a clerk actually wants, real timelines — confirmed by phone. |

**225 open questions** are recorded across the 50 states, each naming what is unknown and which field it blocks. Most are practice-tier questions a statute cannot answer. `npm run callsheet` turns them into a dialable call sheet, merged with the contacts in `src/db/callContacts.ts`. Closing those is the ongoing work.

## What it does

- **Multi-state screening.** One session can span several states; each record is evaluated against *its own* state's rules and results are grouped per state.
- **Per-charge decision trees.** Each state is a `StateRuleConfig` — data, not code branches — walked deterministically to one of four statuses: `eligible`, `waiting`, `ineligible`, `complex`.
- **Filing packets.** Any result that isn't `ineligible` shows the form, fees, fee-waiver rules, where to file, and a step checklist — including `waiting` and `complex` results, where the packet is framed as "not a clearance to file" rather than withheld. A result can name which remedy it endorses, so a screening that hedges one remedy doesn't hand over its paperwork.
- **Import your own background check.** The Checkr panel has an "Upload my report" tab that reads a real Checkr candidate-portal PDF **in your browser** and prepopulates your records. Identity fields are discarded at the parse boundary; a record that can't be read with confidence is reported as unreadable rather than guessed at. See [ADR-0006](./docs/decisions/ADR-0006-pdfjs-for-client-side-report-import.md).
- **Willow**, an assistant that answers questions grounded in the verified state data rather than free-associating about law.
- **Honest gaps.** A state without screenable rules shows a referral panel, never generic rules.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, `lucide-react` icons |
| Language | TypeScript |
| Database | Neon (serverless PostgreSQL) via `@neondatabase/serverless`, JSONB rule storage |
| AI summary | Groq API (`qwen-2.5-32b`), with a deterministic non-AI fallback |
| PDF export | `jspdf` (client-side generation) |
| PDF import | `pdfjs-dist` (client-side parsing, lazy-loaded — [ADR-0006](./docs/decisions/ADR-0006-pdfjs-for-client-side-report-import.md)) |
| Tests | Vitest — 866 tests across 14 files ([ADR-0005](./docs/decisions/ADR-0005-vitest-for-structural-validation.md)) |

Stack elements are not replaced without an approved ADR in [`docs/decisions/`](./docs/decisions/).

## Getting started

**Prerequisites:** Node.js 20+, a Neon database (optional), and a Groq API key (optional).

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment.** Copy `.env.example` to `.env` and fill in:
   ```
   DATABASE_URL=postgres://...    # your Neon connection string
   GROQ_API_KEY=...               # optional; falls back to a deterministic summary if absent
   ```
3. **Seed the database.** Validates first, then creates the schema and loads all 50 states:
   ```bash
   npm run db:seed
   ```
4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

> Both degradation paths are load-bearing and tested. Without `DATABASE_URL` the app runs from `src/data/fallbackRules.ts`; without `GROQ_API_KEY` summaries come from the deterministic writer. Neither may be removed without an ADR.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint (note: pre-existing errors in `src/` — lint changed files directly with `npx eslint <file>`) |
| `npm test` | Run the unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run validate` | Check every state's rule structure and provenance (no database needed) |
| `npm run statutecheck` | Same check, plus each state's statute-link status and the statute-pass reminder |
| `npm run db:seed` | Validate, then create the schema and seed all states into Neon |
| `npm run callsheet -- <session\|state>` | Generate a verification call sheet from the open questions + contacts |
| `npm run intake:coverage` | Report which states' intake maps cover which tree nodes |

## Project structure

```
src/
├── app/
│   ├── api/states/       # state list + single-state config
│   ├── api/summarize/    # Groq-backed plain-language summary (+ deterministic fallback)
│   ├── api/chat/         # Willow, grounded in the verified state data
│   └── api/mock-checkr/  # sample background-check personas (demo fixtures)
├── components/           # StateSelector, EligibilityWizard, ResultsDisplay,
│                         # StateResultSection, CheckrReportDemo, CheckrUpload,
│                         # ComingSoonPanel, SourcesList, Assistant*
├── data/
│   ├── fallbackRules.ts  # all 50 states' rules — source of truth, mirrored to the DB
│   ├── rulesEngine.ts    # deterministic decision-tree walker
│   ├── multiState.ts     # per-state routing for a multi-state session
│   ├── intake*.ts        # intake form model + per-state prefill maps
│   ├── checkrParse.ts    # background-check PDF -> records (identity dropped here)
│   ├── chatRetrieval.ts  # Willow's grounding over the state data
│   └── validateState.ts  # structural + provenance checker
├── utils/
│   ├── pdfGenerator.ts   # client-side PDF report
│   ├── pdfText.ts        # client-side PDF text extraction (pdf.js)
│   └── remedyPanel.ts    # which filing packet shows, and how it is framed
└── db/
    ├── client.ts         # Neon access + code fallback
    ├── seed.ts           # validates, then seeds
    ├── validate.ts       # standalone structural validation (CI)
    ├── callsheet.ts      # generates verification call sheets
    └── callContacts.ts   # human-researched phone numbers and call scripts
```

## Working on state data

State rules may only come from the research packages in [`research/waves/`](./research/waves/) or a human's verified statute read — never from a model's knowledge of state law. Before changing any state:

1. Read [`AGENTS.md`](./AGENTS.md) → **Data Integrity Rules**, especially which rules the validator holds and which only a reviewer can.
2. Make the change in `src/data/fallbackRules.ts`.
3. `npm run validate`, then `npm run db:seed` (which validates first and refuses to write a broken tree).
4. Update the affected docs in the same change set.

Every number, date, and period in a data diff gets checked against the package at the precision the package states. That rule has no automated net under it.

## Documentation

Project docs live in [`docs/`](./docs/). Start with the governance files at the root:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — mission, users, design principles
- [`RULES.md`](./RULES.md) — non-negotiable project rules
- [`TERMINOLOGY.md`](./TERMINOLOGY.md) — canonical vocabulary
- [`AGENTS.md`](./AGENTS.md) — how AI coding agents should work in this repo
- [`docs/decisions/`](./docs/decisions/) — architecture decision records
- [`docs/reviews/`](./docs/reviews/) — data-quality reviews and triage

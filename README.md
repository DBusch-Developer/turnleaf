# Turnleaf

**Fifty states of record-clearing law. One plain answer, and the form to file next.**

Turnleaf is an anonymous, web-based record-clearing (expungement) eligibility screening tool for justice-impacted individuals. You pick your state, answer a few plain-language questions about your record, and Turnleaf tells you where your charge may stand under that state's sealing, expungement, or set-aside laws — then points you to the actual petition form, filing fee, and local legal-aid help to take the next step.

> ⚖️ **Turnleaf is not a law firm and does not provide legal advice.** It is an informational screening tool. Results are potential outcomes based on what you enter, not a legal determination. Always confirm with a legal-aid attorney or court clerk before filing.

---

## What makes it different

- **Real cited law, not templates.** Every rule Turnleaf shows is tied to a specific statute (code number + last-reviewed date). We do **not** ship generic or approximate rules. A state either has researched, cited rules, or it shows an honest "in research" panel with real referral links. (See [`RULES.md`](./RULES.md) — "no fallback templates, no shallow data.")
- **Anonymous by design.** No names, no Social Security Numbers, no stored charge files. PDF summaries are compiled inside your browser.
- **Ends with a next step.** Eligible results compile direct links to state self-help petition forms, estimated filing fees, and local clinic/legal-aid registries.
- **Plain, hedged language.** Screening results are rephrased into warm, non-advice language that always recommends confirming with a professional before filing.

## Current coverage

All 50 states appear in the selector. **Four states currently have researched, cited rules:** California, Arizona, New York, and Texas. The rest show the in-research panel. Expanding coverage is the core ongoing work (see [`docs/05-roadmap.md`](./docs/05-roadmap.md) once written).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, `lucide-react` icons |
| Database | Neon (serverless PostgreSQL) via `@neondatabase/serverless`, JSONB rule storage |
| AI summary | Groq API (`qwen-2.5-32b`), with a deterministic non-AI fallback |
| PDF | `jspdf` (client-side generation) |
| Language | TypeScript |

## Getting started

**Prerequisites:** Node.js 20+, a Neon database, and (optionally) a Groq API key.

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment.** Copy `.env.example` to `.env` and fill in:
   ```
   DATABASE_URL=postgres://...    # your Neon connection string
   GROQ_API_KEY=...               # optional; falls back to a deterministic summary if absent
   ```
3. **Seed the database.** This creates the `states` table and loads the researched states:
   ```bash
   npm run db:seed
   ```
4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

> Without `DATABASE_URL`, the app still runs — it falls back to the local researched rules in `src/data/fallbackRules.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Create the schema and seed researched states into Neon |

## Project structure

```
src/
├── app/                  # Next.js App Router pages + API routes
│   ├── api/states/       # state list + single-state config
│   ├── api/summarize/    # Groq-backed plain-language summary (+ fallback)
│   └── api/mock-checkr/  # mock background-check personas (demo)
├── components/           # StateSelector, EligibilityWizard, ResultsDisplay, ...
├── data/
│   └── fallbackRules.ts  # researched state rules (source of truth, mirrored to DB)
└── db/
    ├── client.ts         # Neon access + code fallback
    ├── schema.sql        # DDL reference
    └── seed.ts           # validates + seeds states
```

## How to add a researched state

Turnleaf's rules live in code and are mirrored into the database. To add a state:

1. Research the state's record-clearing law (statutes, waiting periods, forms, fees, legal aid).
2. Encode it as a decision tree in `src/data/fallbackRules.ts` (see an existing state like `CA` as a model).
3. Run `npm run db:seed` to push it to Neon. Seeding is idempotent (upsert).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`docs/03-data-model.md`](./docs/03-data-model.md) for the full process and the decision-tree format.

## Documentation

Project docs live in [`docs/`](./docs/). Start with the governance files at the root:

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — mission, users, design principles
- [`RULES.md`](./RULES.md) — non-negotiable project rules
- [`TERMINOLOGY.md`](./TERMINOLOGY.md) — canonical vocabulary
- [`AGENTS.md`](./AGENTS.md) — how AI coding agents should work in this repo

# Turnleaf — Project Context

## One-line definition

Turnleaf is an anonymous, 50-state record-clearing (expungement) eligibility screening tool that gives justice-impacted people one plain-language answer and the specific form to file next.

## Mission

Millions of people carry criminal records that block housing, employment, and stability, while the relief they may already qualify for is buried in state statutes and court forms. Turnleaf helps a justice-impacted person understand, in plain language and without giving up their privacy, whether their record may be eligible for clearing under their state's law — and connects them to the real next step.

## What Turnleaf is and is not

- Turnleaf **is** an informational screening and navigation tool built on real, cited statutes.
- Turnleaf **is not** a law firm, does not give legal advice, and never tells a user they "are eligible" or "should file." Every result is hedged and routes to professional confirmation.
- Turnleaf **is not** a generic legal-forms mill. It refuses to show a state's rules unless they have been researched and cited.

## Primary users

- **Justice-impacted individual** (primary) — a person with a record checking their own eligibility, anonymously.
- **Reentry navigator / caseworker** — a helper screening on behalf of, or alongside, a client.
- **Legal-aid volunteer / clinic staff** — using Turnleaf as a fast first-pass triage before a consultation.
- **Rule researcher / maintainer** — the person (currently the project owner) who researches state law and encodes cited rules.

## Operating model

- The user selects a state, then answers a short decision-tree questionnaire about each charge on their record.
- Turnleaf evaluates each record against that state's researched rules and returns one of four outcomes: **eligible**, **waiting**, **ineligible**, or **complex**.
- Results are rephrased into plain, empathetic, non-advice language (via Groq, with a deterministic fallback) and compiled into a browser-side PDF packet with forms, fees, and legal-aid links.
- States without researched rules show an honest "in research" panel with national referral links — never guessed rules.
- Optionally, a demo panel loads mock Checkr background-check personas to prepopulate records for demonstration and testing.

## Product experiences

- **Landing / state selector** — hero, value props, 50-state search grid.
- **Eligibility wizard** — per-record decision-tree questionnaire.
- **Results** — plain-language summary, per-record outcome, forms/fees/legal aid, PDF export.
- **In-research panel** — honest coverage gap with referrals.
- **Demo panel** — mock background-check personas (development/demo only).

## Technology baseline

- Next.js 16 App Router with Turbopack
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL on Neon (`@neondatabase/serverless`), JSONB rule storage
- Groq API for language rephrasing, with a deterministic non-AI fallback
- `jspdf` for client-side PDF generation
- `lucide-react` for icons

Do not replace a baseline technology without an ADR (see [`RULES.md`](./RULES.md)).

## Design principles

1. **Never give legal advice.** Inform and route to professionals; always hedge.
2. **No shallow data.** A state shows real, cited rules or an honest in-research panel — never a generic template.
3. **Anonymous by default.** Collect nothing that identifies a person.
4. **Plain language over legal jargon.** Meet the user where they are.
5. **Every answer ends with a next step.** A form, a fee, a clinic — not a dead end.
6. **Be honest about uncertainty and coverage.** Say what we don't know.
7. **Degrade gracefully.** Database down → code fallback; no AI key → deterministic summary.

## Related documents

- [`RULES.md`](./RULES.md) — non-negotiable rules
- [`TERMINOLOGY.md`](./TERMINOLOGY.md) — canonical vocabulary
- [`AGENTS.md`](./AGENTS.md) — agent working handbook
- `docs/` — product, architecture, and planning docs

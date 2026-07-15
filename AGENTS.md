<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Turnleaf Agent Handbook

This file tells AI coding agents (and new contributors) how to work safely and consistently in Turnleaf. Read it before every task. When it conflicts with a direct user instruction, follow the user. When it conflicts with a more specific doc, follow the more specific doc and flag the conflict.

## Project identity

Turnleaf is an anonymous, 50-state record-clearing eligibility screening tool for justice-impacted people. Behind every screening is a real person making a real decision about their record. **Correctness, honesty, and privacy matter more than speed or cleverness.** Turnleaf informs and routes to professionals; it never gives legal advice and never invents law.

## Read before coding

1. [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — mission, users, design principles
2. [`RULES.md`](./RULES.md) — non-negotiable rules (start here for the golden rule)
3. [`TERMINOLOGY.md`](./TERMINOLOGY.md) — canonical vocabulary
4. `docs/01-prd.md` — product scope and non-goals *(once written)*
5. `docs/02-architecture.md` and `docs/03-data-model.md` — layers, boundaries, the rule format *(once written)*
6. The relevant guide in `node_modules/next/dist/docs/` for any Next.js API you touch

## How to work a task

1. **Read** the relevant docs and the affected code. Understand the acceptance criteria and any legal/privacy implications.
2. **Ask if unclear** (see "Ask, don't assume"). Never start on a guess about a legal rule.
3. **Branch** off `main` for non-trivial work; keep commits small and logical.
4. **Implement** following the architecture rules below. Keep legal rules in data (`fallbackRules` / the database), not hard-coded in components.
5. **Validate** any new/changed state rules with `npm run validate`, then reseed with `npm run db:seed` (which validates first and refuses to write a broken tree).
6. **Sync documentation** in the same change set (see `RULES.md` → Documentation synchronization).
7. **Verify** before you claim done (see below).
8. **Commit / open a PR** with an honest description of what was and wasn't tested.

## Definition of done

A task is done only when all of the following hold:

- The behavior meets its acceptance criteria and is demonstrated.
- All user-facing legal output is hedged and cites real statutes — no invented rules, no legal advice.
- Anonymity is preserved: no PII collected, stored, or logged.
- Graceful degradation still works (DB → `fallbackRules`; Groq → deterministic summary).
- `npm test` and `npm run build` pass; any changed state rules pass `npm run validate` and seed cleanly. (`npm run lint` has pre-existing errors in `src/` — lint your changed files directly with `npx eslint <file>` so they aren't masked.)
- All affected documentation is updated in the same change set.
- No secrets are committed.

Do not mark a task done before this bar is met.

## Ask, don't assume

When a legal rule, waiting period, eligibility criterion, form, fee, or citation is unclear, missing, or contradictory — **stop and ask a specific question.**

- Never invent or approximate law. A wrong rule here can mislead someone about their legal record — that is not a harmless bug.
- Prefer one precise question over three assumptions.
- If only part of a task depends on unresearched law, build the clear part and either ask or fall back to the in-research panel for the rest.

## Verify before you claim done

Evidence before assertions. Never state that a build is green, a screening works, or a bug is fixed without running the command or exercising the flow and reading the output. If something fails or was skipped, say so plainly with the output — never soften it or assume success.

## Required stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Neon PostgreSQL (`@neondatabase/serverless`) · Groq (with deterministic fallback) · `jspdf` · `lucide-react` · Vitest (tests, [ADR-0005](./docs/decisions/ADR-0005-vitest-for-structural-validation.md)).

Do not replace a stack element without an approved ADR (`docs/decisions/`).

## Architecture rules

- Keep legal rules in **data**, not code branches: a state is a `StateRuleConfig` decision tree in `fallbackRules` / the database.
- The database mirrors `fallbackRules`; `fallbackRules` is the source of truth and the runtime fallback. Keep them consistent via `db:seed`.
- Route Handlers (`src/app/api/*`) own server work; never expose secrets to the client. The Groq key stays server-side in `/api/summarize`.
- Preserve graceful degradation paths — do not remove a fallback without an ADR.
- User-facing summaries go through the hedged-language path; never emit an un-hedged eligibility claim.

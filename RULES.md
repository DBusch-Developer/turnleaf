# RULES.md — Non-Negotiable Project Rules

These rules apply to every contributor and every AI coding agent working in Turnleaf. When a rule conflicts with a direct user instruction, follow the user and flag the conflict. When two rules conflict, follow the more specific one and raise it.

## The golden rule

**Turnleaf informs; it never advises, and it never invents law.** Every user-facing legal statement must be hedged, and every rule must trace to a real, cited statute. When you don't know the law, you show the in-research panel — you do not guess.

## Always

- Cite a real statute for every rule and result (code section + `lastReviewed` date).
- Use hedged, non-advice language in all user-facing output ("appears potentially eligible," "confirm with a legal-aid attorney or court clerk before filing").
- Keep the app anonymous: collect and store nothing that identifies a person.
- Show the honest in-research panel for any state without researched, cited rules.
- Validate a state's decision-tree structure (references resolve, no dead-ends, required fields present) before seeding it.
- Degrade gracefully: fall back from database to `fallbackRules`, and from Groq to the deterministic summary.
- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next.js API — this Next version has breaking changes.
- Keep `DATABASE_URL`, `GROQ_API_KEY`, and all secrets in `.env` (git-ignored).
- Use TypeScript; type state rules against `StateRuleConfig`.
- Update affected documentation in the **same change set** as the behavior change (see Documentation synchronization).
- Ask a specific question when a legal rule, waiting period, eligibility criterion, form, or citation is unclear — do not fill the gap with a plausible guess.

## Never

- Give definitive legal advice, or state "you are eligible," "you qualify," or "you should file."
- Invent, approximate, or extrapolate a legal rule, citation, waiting period, fee, or form. Research it or show the in-research panel.
- Ship generic or template rules for a state ("no fallback templates, no shallow data").
- Collect or persist names, Social Security Numbers, dates of birth, or charge files on the server.
- Log record contents, user answers, or any personal information.
- Commit secrets, connection strings, or API keys.
- Present mock Checkr personas or demo data as real records outside the demo context.
- Change the stack, data model, privacy posture, or the language-safety policy without an approved ADR.
- Mark work "done" without running the verification and reading the output (see [`AGENTS.md`](./AGENTS.md) → Verify before you claim done).

## Change control

A change affecting any of the following requires an Architecture Decision Record in `docs/decisions/`:

- The technology stack or a major dependency/provider.
- The data model (the `states` schema, the decision-tree shape) or the code-vs-database source-of-truth model.
- The privacy/data-minimization posture.
- The language-safety policy (how results are worded / the no-legal-advice guarantee).
- The "no fallback templates" data-integrity policy.

Do not rewrite an existing ADR to reflect a new decision. Add a new one that supersedes it.

## Documentation synchronization

When behavior changes, the corresponding documentation changes in the **same commit** — product docs, architecture, data model, terminology, and any affected ADR.

- A task is not complete while its documentation is stale.
- A change that alters user-facing behavior without the matching doc update is not ready to merge.

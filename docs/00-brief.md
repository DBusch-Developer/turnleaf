# Project Brief — Turnleaf

## The problem

An estimated one in three American adults has some kind of criminal record. Records block housing, employment, loans, and licensing long after a sentence is served. Many people are legally eligible to clear their records — through expungement, sealing, set-aside, or nondisclosure — but never do, because:

- The law is different in every state and buried in statutes.
- Finding out if you qualify usually means paying a lawyer or guessing.
- Existing online tools are either generic templates, paywalled, or shallow (one state, no citations, no next step).
- People are understandably reluctant to type their criminal history into a website that collects their name and identity.

## The product

Turnleaf is an anonymous, plain-language web tool that screens a person's record against their state's real record-clearing law and tells them, for each charge, whether it *may* be eligible — then hands them the actual form, fee, and legal-aid contact to act on it.

**Positioning line:** *Fifty states of record-clearing law. One plain answer, and the form to file next.*

## What makes it credible

- **Cited law only.** Every rule ties to a specific statute and a last-reviewed date. States without researched rules show an honest "in research" panel with referrals — never a guessed answer. (This is the core integrity promise; see [`../RULES.md`](../RULES.md).)
- **Never legal advice.** Results are hedged and always route to a legal-aid attorney or court clerk for confirmation.
- **Anonymous.** No names, SSNs, or stored charge files. The PDF packet is generated in the browser.

## Primary user

A justice-impacted person (or a reentry navigator helping them) who wants a fast, private, trustworthy first answer about whether their record can be cleared, and what to do next.

## Success looks like

- A user can go from "I don't know" to "here is my likely status and the exact form to file" in minutes, for a covered state.
- A user in an uncovered state gets an honest answer and a real referral, not a fabricated one.
- No user has to reveal their identity to use it.
- Coverage grows state by state without ever lowering the "cited rules only" bar.

## Non-goals (MVP)

- Not a lawyer or a substitute for legal advice.
- Not a document-filing service — Turnleaf points to forms; it does not file them.
- Not an account system — no login, no saved history.
- Not a real background-check *API* integration — the Checkr panel is mock data, and there is no Checkr account or server call. A person can, however, import their own downloaded Checkr report PDF; it is parsed in their browser and never uploaded (ADR-0006).

## Constraints

- Legal accuracy is the highest-stakes risk; correctness beats coverage speed.
- Built on Next.js 16 / React 19 / Neon / Groq (see [`02-architecture.md`](./02-architecture.md)).
- Solo/student build; scope must stay focused on the screening core.

# ADR-0004 — Language-safety policy (never legal advice)

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

Turnleaf tells people about their potential eligibility to clear a criminal record. Two failure modes are dangerous: (1) phrasing that reads as definitive legal advice ("you are eligible, file this"), and (2) an AI summarizer that improvises beyond the structured, cited result. Either could cause a real person to act incorrectly on a legal matter. We use the Groq API to rephrase results into warm, plain language, which raises the stakes further.

## Decision

Adopt a strict language-safety policy (NFR-1) enforced on **every** user-facing output path:

- No output asserts definitive eligibility or advises filing. Required framing is hedged: "appears potentially eligible — a legal-aid attorney or court clerk should confirm before you file."
- The AI summarizer runs with a constrained system prompt, low temperature, and a word cap, and may only rephrase the structured result — never introduce new legal conclusions.
- If the AI is unavailable or errors, a **deterministic** summary generator produces text under the same rules. The safe path is the default, not a degraded one.
- Every result surface carries an informational-only disclaimer and routes to legal-aid referrals.

## Consequences

**Positive**
- Consistent, defensible framing regardless of AI availability.
- Reduces the risk of users treating screening as legal advice (R3, R6).
- The deterministic fallback means safety never depends on a third party.

**Negative / trade-offs**
- Copy is wordier and more hedged than a blunt yes/no.
- Requires ongoing review of all user-facing strings and a denylist test to enforce (see [`../06-testing.md`](../06-testing.md)).

## Alternatives considered

- **AI-only summaries** — rejected: no guarantee of safety if the model drifts or the API fails.
- **Blunt eligible/ineligible labels without hedging** — rejected: reads as legal advice; unacceptable given the stakes.

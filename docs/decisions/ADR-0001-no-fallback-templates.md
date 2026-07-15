# ADR-0001 — No fallback templates, no shallow data

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

Record-clearing law varies enormously by state. It is tempting, when a state hasn't been researched, to show a "generic" or template rule so every state feels covered. But a plausible-sounding wrong answer about someone's criminal record is worse than no answer — it can mislead a real person into filing (or not filing) incorrectly. This is Turnleaf's defining integrity question.

## Decision

Turnleaf shows a state's rules **only** when they have been researched and tied to primary statutes. A state either has real, cited rules (in `fallbackRules` / the database, with a `lastReviewed` date and `verificationStatus`) or it shows an honest "in research" panel with real national referral links. There are **no generic, template, or approximated rules** anywhere in the product.

## Consequences

**Positive**
- Every answer a user sees is backed by a citation — trust and safety.
- Coverage gaps are honest, not hidden behind fabricated confidence.
- Forces discipline: coverage only grows through real research.

**Negative / trade-offs**
- Slower perceived coverage; most states show "in research" until worked.
- More research effort per state; no shortcuts.

## Alternatives considered

- **Generic template rules per state** — rejected: violates the core integrity promise and creates critical legal-accuracy risk (R1).
- **Hide unresearched states entirely** — rejected: less honest than showing the state with a referral; users still deserve to be pointed to help.

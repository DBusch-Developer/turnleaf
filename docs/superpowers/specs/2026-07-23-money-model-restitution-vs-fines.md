# Design Spec — Separate restitution from fines/fees in the intake money model

**Date:** 2026-07-23
**Status:** Draft for review
**Scope:** Split the single money fact into **restitution** vs **fines/fees**, and correct the 7 state trees that read `restitution_paid`. Motivated by a live correctness bug. **No waiting-period, exclusion, result, or citation changes** — only the money *fact* granularity and, for "all-money" states, the money-node *shape* (one gate → two gates, legally equivalent).

## 1. Problem (with a live bug)

The intake collects ONE money fact — profile `restitutionPaid` → record `restitution_paid` — labeled "All fines & restitution paid?". An audit of every field-backed reader of `restitution_paid` in `fallbackRules.ts` shows the field is **overloaded** with two incompatible meanings:

- **"ALL money" (restitution + fines + fees):** AZ (`monetary_check_az`, § 13-911(G)), UT (`restitution_ut`), TN (`restitution_5_tn`/`restitution_10_tn`), AL (`misd_restitution_al`) — node text says "all fines, fees and restitution".
- **"RESTITUTION only" (fines explicitly do NOT block):** PA (`restitution_pa`, § 9122.1 — "unpaid fines and costs do NOT block, but restitution does"), NC (`restitution_nc` — "all restitution ordered"). FL (`sentence_complete_fl`) is "all terms … including … restitution" — closer to restitution/terms; **confirm intent**.

A single boolean cannot serve both meanings.

**LIVE BUG:** the shipped intake form sets `restitution_paid` from the bundled "All fines & restitution paid?" question. A person in **PA or NC** who has **paid restitution but still owes fines** answers "No" → `restitution_paid = false` → wrongly blocked, contrary to PA/NC law (fines don't block). PA and NC are `statute_cited` (live). This is the exact distinction the user raised: restitution is treated more strictly than fines in these states.

## 2. Design

**Two money facts:**
- `restitutionPaid` (existing) — restitution owed **to a victim**, paid in full?
- `finesPaid` (NEW) — court **fines, fees, and costs** paid in full?

Form: two clearly-labeled questions (restitution = to a victim; fines/fees = to the court), not one bundled box.

**Record model:** `restitution_paid` now means **restitution only** (its literal name). Add `fines_paid: boolean` to `ConvictionRecord`, `FIELD_DOMAINS`, and `BOOLEAN_FIELDS` (`src/data/screening.ts`). `onSubmitIntake` folds both onto the record.

**Per-state money nodes (the 7 readers) — each matched to its statute:**

- **Restitution-only (PA, NC; likely FL):** already read `restitution_paid` meaning restitution → **correct once the field means restitution-only**. No node change — the form simply now feeds the right value. This **fixes the live PA/NC bug**. (Confirm FL's intent against its statute; adjust only if it truly requires all money.)
- **All-money (AZ, UT, TN, AL):** the node requires restitution **and** fines. A field-backed boolean reads one field, so restructure each single "all money" node into **two sequential gates**: *restitution paid?* → *fines/fees paid?* → pass; **either "no" → the existing "not-yet / pay-before-filing" result** (unchanged result key). Legally identical — the node's own text already required all of it; we only source it from the two granular facts. Update each state's personas.

**Arizona specifics:** `monetary_check_az` ("Have you paid all fines, fees and restitution in full?") → a restitution gate + a fines gate; both "yes" → `eligible_*` (unchanged); either "no" → `complex_monetary` (unchanged result/text). The AZ `IntakeMap` and `intakeEquivalence.test.ts` updated for the two-gate shape.

## 3. Constraints

- **No legal change:** every money node still requires exactly what its statute requires; waiting periods, exclusions, result keys, and citations are untouched. Only (a) the money-fact granularity and (b) the all-money nodes' *shape* (one gate → two gates) change. Personas prove result-equivalence for the unchanged inputs.
- **Fixes the live PA/NC bug** (a person who paid restitution but owes fines is no longer wrongly blocked in restitution-only states).
- **Graceful degradation** preserved; unmapped states keep working.
- Tests green; add money cases: a restitution-only state (PA or NC) with *restitution paid, fines owed* → eligible/proceeds; an all-money state (AZ) with the same inputs → still gated on the fines.

## 4. Rollout order

1. **Data model + form** — add `finesPaid` / `fines_paid`, split the form into two money questions, fold both onto the record.
2. **Restitution-only states (PA, NC, verify FL)** — this alone **fixes the live bug**; highest priority.
3. **All-money states (AZ, UT, TN, AL)** — two-gate restructure + persona updates, one state at a time, each gated on its personas.
4. **AZ intake map + equivalence** — update for the two-gate shape.

## 5. Decisions (resolved 2026-07-23 with Diana)

1. **Florida → NOT money-gated (VERIFIED 2026-07-23; final correction).** FL was, in error, first bucketed restitution-only, then all-money, both inferred from the node's "all terms" phrasing. Diana then read the 2025 text of § 943.059 directly (flsenate.gov, retrievedOn 2026-07-23; history ends ch. 2023-18, no 2024-25 amendments) and it settles it: **§ 943.059 has NO financial-obligation eligibility criterion at all** — no restitution, fines, or costs anywhere in the section. Its completion gates are (1)(c) no adjudication of guilt on the petitioned acts and (1)(d) no longer under court supervision. So FL was **removed from the money model entirely**: the `sentence_complete_fl`/`fines_fl` money nodes are gone, replaced by an asked `supervision_fl` node (still-supervised → `supervision_pending_fl`; supervision ended → `eligible_sealing_fl`). Money owed does NOT block FL; unpaid amounts matter only INDIRECTLY (they commonly extend supervision), and we never tell FL users to pay as a prerequisite. The $75 FDLE fee (waivable by the executive director) is kept as a cost fact, distinct from eligibility. **Open items (non-blocking):** whether FDLE processing in practice checks court debt (phone-tier); re-read § 943.0585 (expunction sibling) to confirm it likewise has no financial criterion.
2. **Lump fines + fees + costs into one `finesPaid` fact.** The states that distinguish only pull *restitution* out separately; all other court-owed money is one question.
3. **Force an explicit answer** on both money questions — no silent "paid = yes" default. Asserting paid-when-unknown could wrongly grant eligibility in a legal screener; the person must choose. (Implication: the intake form must not let submission proceed with the money questions unanswered for a state whose tree reads them — or must carry a genuine "not sure" that routes to a hedge, never a silent "yes".)

**Buckets (final, revised 2026-07-23 after the FL statute read):**
- **Restitution-only** (money node reads `restitutionPaid`, fines don't block): NC. (PA reads restitution via an ASKED node, not the money field — unaffected by the model.)
- **All-money** (two gates: `restitutionPaid` AND `finesPaid`): AZ, UT, TN, AL.
- **Not money-gated** (removed from the model): FL — § 943.059 has no financial criterion; gated on court supervision (§ 943.059(1)(d)), not money.

## 6. Scope limit, and the follow-up it implies (2026-07-23)

This model only ever reached the states whose trees read the `restitution_paid` **record field** — 5 of them after FL left and PA turned out to be an asked node. It fixed a field-overloading bug; it did not audit whether any state's money requirement is real.

A sweep of all 50 trees found **31 states with money-conditioned nodes**: 5 wired to the money facts, and 26 more asking money through their own asked or date nodes. Those 26 are not broken — each asks in its own words, so there is no overloaded-boolean problem — but **none has been checked against its statute the way § 943.059 finally was**, and 10 of them carry the exact shape that was wrong in Florida: money folded into a broad "all terms of your sentence" completion or date gate.

That triage — every money node's text, its adjacent citations, and a risk tier per state — is in [`docs/reviews/2026-07-23-money-gate-triage.md`](../../reviews/2026-07-23-money-gate-triage.md). It is a shape analysis, not a legal review: no statute was read to produce it, and nothing in it may be encoded until a package or Diana's read settles it.

Deliberately **not** done: turning those triage questions into `open_questions` entries on the 26 states. Open questions record ⚠️ flags raised by a research package (Data Integrity Rule 2); these are review questions raised by us, and writing them into state data would blur a distinction the validator depends on.

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

1. **Florida → all-money bucket (revised 2026-07-23, M3 whole-branch review).** FL's node (`sentence_complete_fl`) originally moved to the restitution-only bucket on the theory that it names "restitution" but not "fines." Final review overturned that: the node's actual text reads "completed **all terms** of your sentence, including any probation and payment of restitution" — "all terms" is broad and, read plainly, implies fines/costs too, so restitution-only was itself an unverified (and likely wrong) narrowing, not the conservative reading. FL is now bucketed **ALL-MONEY**, split into the same two-gate ladder as AZ/UT/TN/AL (`sentence_complete_fl` reads `restitution_paid`, then a new `fines_fl` reads `fines_paid`, both required to reach `eligible_sealing_fl`). This is the conservative direction: worst case it tells someone to pay fines first, never a wrong "eligible." **Open verification item (does NOT block this work):** confirm against § 943.059 whether fines are actually exempt from the sealing prerequisite; if fines ARE exempt, move FL back to restitution-only in a follow-up, verified against the statute rather than inferred from node phrasing either way.
2. **Lump fines + fees + costs into one `finesPaid` fact.** The states that distinguish only pull *restitution* out separately; all other court-owed money is one question.
3. **Force an explicit answer** on both money questions — no silent "paid = yes" default. Asserting paid-when-unknown could wrongly grant eligibility in a legal screener; the person must choose. (Implication: the intake form must not let submission proceed with the money questions unanswered for a state whose tree reads them — or must carry a genuine "not sure" that routes to a hedge, never a silent "yes".)

**Buckets (final for this pass, revised 2026-07-23 M3):**
- **Restitution-only** (money node reads `restitutionPaid`): PA, NC.
- **All-money** (two gates: `restitutionPaid` AND `finesPaid`): AZ, UT, TN, AL, FL.

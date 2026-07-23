# Design Spec — Dynamic, State-Aware Intake ("smart form + guided tail")

**Date:** 2026-07-22
**Status:** Draft for review
**Author:** pairing session (Diana + Claude)
**Scope:** The Turnleaf screening intake and how the 50 state trees are fed. **No legal rule, waiting period, exclusion, or citation changes.**

---

## 1. Problem

Turnleaf screens a person against a decision tree per state. Today the intake form collects a **free-text charge title the engine ignores** plus a coarse `charge_type`, and the trees then ask everything else one yes/no card at a time. Because record-clearing law shares a skeleton across states, the same facts get asked over and over.

Measured in `src/data/fallbackRules.ts` today:

- **821** question nodes across the 50 trees.
- **43** states ask a "was this a DUI?" question — *after* the person named the charge.
- **122** separate "when were you discharged?" questions.
- **90** offense level/class questions, **41** sex-offense/registration questions, **38** outcome questions.

Concrete failure (the one that started this): a person types **"Aggravated DUI"**, then Arizona asks — as separate cards — a Prop 207 *marijuana* question (irrelevant), "was this a DUI?" (already answered by the title), a second exclusion question that overlaps the first, an offense-level question that overlaps the intake `charge_type`, and a discharge-date question that overlaps the intake date. **5 of 8 cards are redundant, irrelevant, or overlapping.** And in multi-state screening the whole skeleton repeats once per selected state.

This is systemic, not Arizona, and it directly contradicts the "simple, plain language" promise.

## 2. Goals

1. A fact the person can state once is **asked once** — never re-asked mid-flow, never repeated per state.
2. The intake is **dynamic per selected state**: it shows the fields those states actually need, derived from the trees themselves.
3. A person sees a **short form + only the genuinely state-specific questions** ("the guided tail"), in plain language.
4. Applies to **all 50 states**, and degrades safely: a state not yet migrated simply keeps today's flow.
5. **Zero change to legal correctness.** Every result a person gets today for a given set of answers is the result they get after this change.

## 3. Non-goals

- Not changing any rule, wait, exclusion, fee, or citation. This is the front door, not the law.
- Not redesigning the **results** UI (that is separate work).
- Not building a natural-language parser for the free-text title (unreliable for legal branching — see §5).
- Not merging the state trees or altering their nodes/edges/results.

## 4. Chosen approach: a prefill layer over the existing engine

Three approaches were considered:

- **(A) Expand the record model + convert asked nodes to `field`-backed.** The engine already reads `field`-backed nodes from the record. But this **edits all 50 just-verified trees** (restructuring category yes/no chains into fields), which risks the legal correctness we spent enormous effort establishing. Rejected as the primary mechanism — too invasive for the trees.
- **(B) Prefill layer (CHOSEN).** Leave every tree **untouched**. Collect a canonical **IntakeProfile** once, and add a per-state **IntakeMap** that declaratively pre-answers the tree's front-loadable asked nodes from that profile. The engine already reads answers to asked nodes by node id (`answers[nodeId]`), so a prefilled answer is auto-applied and its card never shows. Only unmapped asked nodes remain — the guided tail.
- **(C) Full form-first per state (pure Option A).** A single flat form of every question. Rejected: conditional/state-specific questions either overwhelm the form or require progressive disclosure, which *is* the guided tail. It collapses into approach B anyway.

**Why B:** the trees stay verified and unedited; the mapping is a small, additive, reviewable, testable layer; it reuses the engine's existing `answers`-by-node-id contract; and a state with no map just falls back to today's behavior (graceful degradation, matching the codebase's existing DB→fallback, Groq→deterministic patterns).

## 5. The canonical IntakeProfile

One object per screening session (not per state), holding only facts that are **genuinely shared and largely unconditional** across states:

```ts
interface IntakeProfile {
  offenseCategory: 'dui' | 'marijuana' | 'drug' | 'sex_offense' | 'violent' | 'property' | 'other';
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted';   // already a record field
  chargeType: 'misdemeanor' | 'felony';                                 // coarse; already a record field
  sentenceCompleted: boolean;      // non-money conditions done + discharged
  dischargeDate: string | null;    // the common waiting-period anchor
  priorFelony: boolean;            // recurs as a wait-extension / exclusion input
  restitutionPaid: boolean;        // already a record field
}
```

Deliberately **not** in the shared profile, because they are state-specific:

- **Fine offense level/class** (AZ "Class 2/3 felony" vs. another state's "F1–F5"). Collected as a **per-state form field** rendered from that state's own `offense_level` node options (see §7), or left to the tail.
- **Exclusion lists** (the "serious/dangerous/sexual/child-victim" gates) — the lists differ per state, so these stay in the guided tail as one plain-language question per state (this is the single question in the approved mockup).

Free-text title stays as a **display label only** — never read by logic.

## 6. Per-state IntakeMap

A new declarative data file (`src/data/intakeMaps.ts`), keyed by state code. Each map says how that state's front-loadable asked nodes are answered from the profile. Two entry kinds:

```ts
interface IntakeMap {
  // Nodes answered from the shared profile. Value is a pure function profile -> answer.
  derived: Record<string /*nodeId*/, (p: IntakeProfile) => string | boolean | null>;
  // Nodes collected as a per-state FORM field using the tree node's own options
  // (e.g. offense_level), then prefilled. Rendered in the form grouped under the state.
  stateFields?: string[]; // node ids to surface as form fields
}
```

Example (Arizona, illustrative):

```ts
AZ: {
  derived: {
    marijuana_offense:   p => p.offenseCategory === 'marijuana',
    dui_offense:         p => p.offenseCategory === 'dui',
    prior_felony_az:     p => p.priorFelony,
    sentence_completed:  p => p.sentenceCompleted,
    // discharge-anchored date nodes read the shared dischargeDate:
    discharge_date_f23:  p => p.dischargeDate,
    discharge_date_f456: p => p.dischargeDate,
    discharge_date_m1:   p => p.dischargeDate,
    discharge_date_m23:  p => p.dischargeDate,
  },
  stateFields: ['offense_level'],           // AZ's class picker, from the node's own options
  // NOT mapped -> stays in the guided tail:
  //   excluded_setaside_az, excluded_sealing_az  (the state-specific exclusion questions)
}
```

Rules for a map:
- Every `derived` key and every `stateFields` entry **must name a real node** in that state's tree (validator-enforced, §11).
- A **date** node may only be mapped to a profile date whose **anchor matches** (the anchor-vs-field contract). A date node anchored on arrest or "most recent conviction" is *not* fed by `dischargeDate` — it stays asked, or gets its own profile field in a later phase.
- `disposition`, `charge_type`, `disposition_date`, `restitution_paid`, `prison_sentenced` remain ordinary **record fields** the form sets directly; existing `field`-backed nodes read them unchanged.

## 7. The dynamic intake form

Rewrite the intake portion of `EligibilityWizard.tsx`:

1. On state selection, compute the **union of profile fields** consumed by the selected states' IntakeMaps → show exactly those shared fields (a field no selected state uses is not shown).
2. Render each selected state's `stateFields` (e.g., `offense_level`) as a labeled dropdown built from that node's own `options`, grouped under the state name when more than one state is selected.
3. Shared facts are collected **once** and apply to every selected state.
4. On **Screen**: for each selected state, build (a) a `ConvictionRecord` with the record-level facts (state, disposition, disposition_date = the mapped date, charge_type, restitution_paid, prison_sentenced) and (b) an `answers` map prefilled by `buildAnswers(state, profile, stateFieldValues)`.

## 8. Prefill engine

A pure, tested function:

```ts
function buildAnswers(
  stateCode: string,
  profile: IntakeProfile,
  stateFieldValues: Record<string, string>,
): Answers
```

- Applies the state's `derived` map to the profile, dropping entries whose value is `null` (unknown → stays asked, never guessed — consistent with the engine's "an answer we do not have is never invented").
- Adds `stateFields` answers from `stateFieldValues`.
- Returns the `answers` object the engine already consumes. No engine change.

## 9. Guided tail + plain-language pass

- After prefill, whatever asked nodes remain surface as the **existing one-at-a-time cards** — but now only the genuinely state-specific ones (exclusion questions, unsettled-rule flags). Same component, far fewer cards.
- **Plain-language pass (bundled):** rewrite the *remaining* tail questions to lead with plain wording and move statute citations into an optional "why we ask" line. This is copy-only on `node.text` (no logic change) and can be done state-by-state alongside each map. The approved mockup's Arizona question ("Did this offense involve a weapon, serious injury, a sexual element, or a victim under 15?") is the target register.

## 10. Graceful degradation

A state with **no IntakeMap** works exactly as today: nothing is prefilled, every node is asked. This lets us ship the mechanism plus a few states and migrate the rest incrementally, with no state ever broken mid-rollout. The form falls back to today's fields (title, charge_type, disposition, date) for unmapped states.

## 11. Testing strategy

The 774-persona suite is the regression net; results must not move.

1. **Persona equivalence (new).** For each persona that has an IntakeMap for its state, derive an `IntakeProfile` from the persona's `answers`, run `buildAnswers`, and assert the produced `answers` (merged with the tail answers the persona still supplies) yield the **same result key**. A wrong map surfaces here.
2. **Map integrity (validator extension).** Every `derived`/`stateFields` node id must resolve to a real node in that state's tree (a new check alongside `unresolved-ref`). A `stateFields` entry must point at a `choice` node (it becomes a dropdown). A date node mapped from `dischargeDate` must be a `date` node.
3. **Coverage report.** `npm run` script printing, per state, how many nodes are prefilled vs. still asked — so we can see the tail shrink and catch a state that's under-mapped.
4. **Existing suites unchanged.** `npm test`, `npm run validate`, `npm run build` stay green throughout.

## 12. Rollout plan (all 50 states, safely)

- **Phase 0 — mechanism.** `IntakeProfile`, `IntakeMap` type, `buildAnswers`, validator extension, the dynamic form, persona-equivalence test harness. Ship with **Arizona** as the pilot map. AZ flow drops to form + 1 exclusion question; AZ personas unchanged.
- **Phase 1 — the big-population states** (CA, TX, NY, FL, PA, …) get maps + plain-language tail, one at a time, each gated on its personas staying green.
- **Phase 2 — the remaining states**, same pattern, until all 50 have maps.
- Each state is one small, reviewable change: author its map, re-run its personas, confirm the coverage report, commit. Unmigrated states keep working the whole time.

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| A wrong map produces a wrong result | Persona-equivalence tests per state; the map is pure data, easy to review against the tree |
| Date anchor mismatch (eligible-years-early bug returns) | Maps may only feed a date node whose anchor matches the collected date; validator checks node type; anything else stays asked |
| Canonical taxonomy too coarse for some state's category logic | That node stays in the tail (unmapped) — correctness preserved, just one extra question there |
| Multi-state form with differing per-state levels | `stateFields` render per state; shared facts stay shared |
| Scope creep into results/legal changes | Explicit non-goals; maps cannot change nodes or results |

## 14. Files touched

- **New:** `src/data/intake.ts` (`IntakeProfile`, `IntakeMap` types, `buildAnswers`), `src/data/intakeMaps.ts` (per-state maps).
- **Changed:** `src/components/EligibilityWizard.tsx` (dynamic intake form + prefill on submit), `src/data/validateState.ts` (map-integrity checks), `src/data/personas.test.ts` (equivalence harness), a coverage script under `src/db/`.
- **Structure & law unchanged:** every state tree's **nodes, edges, and results** in `src/data/fallbackRules.ts`, `src/data/rulesEngine.ts`, and all legal data (waits, exclusions, fees, citations). The **only** tree edit is the optional plain-language pass (§9), which rewrites `node.text` **copy** on tail questions — logic-neutral, and each such edit is covered by that state's persona tests (result keys cannot move).

## 15. Open questions for review

1. Is the canonical taxonomy in §5 the right set, or do you want an additional shared fact (e.g. a canonical "serious factor" exclusion boolean to absorb more tails)?
2. Rollout order after the AZ pilot — big-population-first (as written), or your call-sheet order?
3. Should the plain-language tail rewrite be part of each state's map PR, or a separate sweep afterward?

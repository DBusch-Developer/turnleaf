# Multi-State Screening — Design

**Date:** 2026-07-18
**Status:** Approved (design); implementation pending
**Author:** Diana + agent (brainstormed)

## Problem

Turnleaf screens one record set against **one** state's ruleset. That single-state
assumption is wired through the whole flow: `page.tsx` keys on a single
`selectedStateCode`, fetches one `stateConfig`, and hands it to the wizard and
results; the wizard evaluates *every* record against that one config; results
render one state's remedies, legal aid, sources, and summary.

The Checkr demo exposed the gap. The `thomas_multistate` persona
(`src/app/api/mock-checkr/reports/route.ts`) carries a CA dismissed possession
**and** a TX convicted theft. On handoff, `CheckrReportDemo.tsx` passed only the
**first** record's state:

```js
onRunScreening(records, report.records[0]?.state || 'CA');  // → 'CA'
```

So the TX theft conviction was screened **under California law** — the wrong statute
applied to a real-looking charge. Per AGENTS.md's golden rule, that is exactly the
failure mode to avoid (misleading someone about a record), even in a labeled demo.

## What "multi-state" does and does not mean

Record clearing is **per-jurisdiction**: each conviction is cleared by petitioning
the court where it happened, under that state's law. There is no national petition,
and clearing one state's record has no effect on another. States do **not** merge.

The one place states can touch is the *eligibility analysis* (some statutes weigh a
person's whole record, including out-of-state priors, when deciding local
eligibility). Modeling that cross-state dependency is **explicitly out of scope** —
it is legally sensitive and would require verified per-state data on how each state
counts out-of-state priors. This design covers **independent per-state screening,
presented together** ("Level 1"): screen each state's records against its own
verified ruleset, and show the results side by side. No cross-state rule interaction.

## Decisions (locked during brainstorming)

1. **Scope:** multi-state applies everywhere — the Checkr handoff **and** manual entry.
2. **Entry model:** pick states up front (multi-select at step 1); record entry is
   grouped under each selected state.
3. **Results:** stacked per-state sections; one combined PDF.
4. **Approach:** "screening session" refactor (Approach 1) — the app holds a *set* of
   selected states, each with its own config, and every record carries a `state`.
   The single-state case is just a set of one.
5. **No cross-state rule interaction** (see above).

## Design

### 1. Data model

- **`ConvictionRecord` gains `state: string`** (`src/data/screening.ts`). This is
  record *metadata*, not a rule field: it is **not** added to `RecordField` /
  `FIELD_DOMAINS`, so the rules engine and the validator are untouched. It behaves
  like `id`/`title` — something the app carries, not something a node reads.
- **Checkr path:** `CheckrReportDemo.runScreening` stops dropping `r.state`; it maps
  each record's own `state` through and no longer passes a single `stateCode`. This
  directly fixes the original bug.
- **Screening-session state** in `page.tsx` replaces the single-state fields:
  ```ts
  selectedStateCodes: string[]
  configs: Record<string, StateRuleConfig>            // researched, screenable states
  comingSoonByState: Record<string, ComingSoonConfig> // selected-but-unresearched states
  ```
  Configs are fetched per state via the existing `/api/states/{code}` endpoint, in
  parallel. Coming-soon stops being an either/or *screen* and becomes a per-state
  attribute of the session, so a session may mix researched and in-research states.

### 2. State selection + page flow

- **`StateSelector` becomes multi-select.** Checkboxes / toggle chips instead of
  click-to-open, plus a "Continue with N states" commit button. The existing
  `pendingCode` loading affordance generalizes to a set of pending states.
- **`page.tsx`** moves `onLanding`, `isOpeningState`, the config-fetch effect, and
  `handleReset` from `selectedStateCode` to `selectedStateCodes`. The error-fallback
  and in-research branches are re-expressed per state rather than as whole-screen
  states.

### 3. Wizard (records grouped by state)

- **`EligibilityWizard` takes `configs` (a map) instead of one `stateConfig`.**
  Records render in groups — one per selected researched state — each with its own
  `[+ Add record]`; a new record inherits that group's `state`.
- **Per-record evaluation against its own state:** `pendingFor(r)` and
  `handleScreening`'s `evaluate(...)` look up `configs[r.state]` instead of a single
  shared config. One combined "I confirm these match my official records" checkpoint
  still gates submit.
- **In-research states** selected up front render their group as a compact
  in-research / referral note (reusing `ComingSoonPanel` content), **not** a record
  entry form. No screening is invented for an unresearched state.

### 4. Results + report

- **Extract `StateResultSection` from `ResultsDisplay`.** Everything state-specific —
  records breakdown, plain-language summary, filing forms/remedies, legal aid,
  sources — becomes `<StateResultSection stateConfig results />`. `ResultsDisplay`
  becomes a shell: page header + candidate-name field + one `StateResultSection` per
  state, stacked, + the single Download button.
- **Per-state AI summary.** `/api/summarize` stays single-state; each
  `StateResultSection` calls it with *its* state name + *its* records. Summaries are
  never blended across states, so nothing implies one state's law reaches another.
- **One combined PDF.** `generateReportPDF` (`src/utils/pdfGenerator.ts`) extends
  from one state to an array of `{ stateConfig, results, summary }` sections, with a
  state heading per section. One packet, sectioned like the screen.
- **Grouping rules:** records bucket by `record.state`; a state with **zero** records
  is omitted from results; an in-research state shows a short referral block instead
  of a results section.

### 5. Willow context + edge cases

- **Willow** (`publishScreen`, `AssistantContext`): the published payload extends from
  one `selectedStateCode`/`stateName` to the selected **set**
  (`selectedStateCodes` / `stateNames`). When exactly one state is selected, the
  single-state fields stay populated so existing Willow behavior is unchanged. When
  multiple, Willow falls back to its existing "which state?" disambiguation rather
  than silently assuming one. Deeper Willow multi-state UX is out of scope.
- **Edge cases baked in:**
  - Selected state with no records → omitted from results.
  - In-research (coming-soon) state → referral block, never a screening.
  - A session of exactly one state behaves identically to today — this is the
    regression guard.

### 6. Testing

- **Engine untouched:** no rule-tree or validator changes; `npm run validate` and
  `npm run db:seed` are unaffected (confirm, don't assume).
- **Unit tests (Vitest):**
  - Record grouping by `state`.
  - Per-record evaluation selects `configs[r.state]`: a CA-dismissed + TX-convicted
    pair yields CA-eligible / TX-ineligible (the Thomas persona as a fixture).
  - Multi-section PDF assembly (one section per state).
  - Single-state set behaves exactly as before (regression).
- **Manual end-to-end** (`/verify`):
  - Checkr → Thomas → correct per-state results.
  - Manual multi-select CA + TX → two record groups → stacked results.
  - A session mixing one researched + one in-research state.

## Definition of done (AGENTS.md)

- `npm test` and `npm run build` pass; changed files lint clean (`npx eslint`).
- `npm run validate` still green; seed unaffected.
- No invented law: each state's output comes only from its own verified config; no
  cross-state rule blending.
- Anonymity preserved: `state` is in-browser record metadata, never persisted or
  logged.
- Graceful degradation intact: DB → `fallbackRules`, Groq → deterministic summary,
  per state.
- This spec and any affected docs updated in the same change set.

## Out of scope

- Cross-state eligibility dependencies (statutes that count out-of-state priors).
- Deeper Willow multi-state conversation UX beyond publishing the selected set.
- Any change to the rules engine, rule format, or the validator.

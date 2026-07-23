# Money Model — Restitution vs. Fines/Fees — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Split the single money fact into **restitution** vs **fines/fees**, fixing a live bug (PA/NC wrongly block a person who paid restitution but owes fines) without changing any waiting period, exclusion, result, or citation.

**Architecture:** `restitution_paid` reverts to meaning **restitution only**; a new `fines_paid` fact is added. Restitution-only states (PA, NC, FL) then read the correct value (bug fixed). All-money states (AZ, UT, TN, AL) get their single money node split into **two sequential gates** (restitution → fines) — legally identical to the one bundled question they had. Money questions are shown/required **only for states whose tree reads them** (state-aware), and are **forced** (no silent "paid" default).

**Tech Stack:** TypeScript, React 19, Vitest. `src/data/screening.ts` (record model), `src/data/fallbackRules.ts` (trees), `src/data/intake*.ts`, `src/components/EligibilityWizard.tsx`, `src/data/personas.test.ts`.

## Global Constraints

- **This change is COUPLED and must land as one unit.** The moment `restitution_paid` means restitution-only, AZ/UT/TN/AL under-block unless their fines gate is added in the same change. Do not ship a partial state.
- **No legal change:** waiting periods, exclusions, result keys, citations untouched. Each money node still requires exactly what its statute requires; only the money-fact granularity and (for all-money states) the node *shape* (one gate → two gates) change. Personas prove result-equivalence.
- **Force an answer:** money facts have a genuine unanswered state (`null`); an unanswered money question must route to the state's hedge, never a silent "yes". The form requires an explicit answer before submit for states that use money.
- **FL is restitution-only (provisional)** — its node names restitution, not fines; do not add a fines requirement FL doesn't state. (Verification of § 943.059's fines rule is a separate follow-up, not part of this plan.)
- **Buckets:** restitution-only = PA, NC, FL. All-money (two gates) = AZ, UT, TN, AL.
- `npx vitest run` (currently 791) stays green after every task; `npm run validate` + `npm run build` stay green. Direct commits to the working branch (create `feat/money-model` off main first).

---

### Task 1: Data model — `fines_paid` fact + nullable money + `moneyFieldsFor`

**Files:**
- Modify: `src/data/screening.ts` (add `fines_paid`)
- Modify: `src/data/intake.ts` (nullable money facts)
- Modify: `src/data/intakeForm.ts` (add `moneyFieldsFor`)
- Test: `src/data/intakeForm.test.ts`

**Interfaces produced:**
- `ConvictionRecord.fines_paid?: boolean` and `restitution_paid?: boolean` (both optional → unanswered = undefined → `readField` returns null → node hedges).
- `IntakeProfile.restitutionPaid: boolean | null`, `IntakeProfile.finesPaid: boolean | null` (null = unanswered).
- `moneyFieldsFor(stateCode: string): { restitution: boolean; fines: boolean }` — whether that state's tree has a field-backed node reading `restitution_paid` / `fines_paid`.

- [ ] **Step 1: Write the failing test** — in `src/data/intakeForm.test.ts` add:
```ts
import { moneyFieldsFor } from './intakeForm';
describe('moneyFieldsFor', () => {
  test('AZ reads both restitution and fines (after Task 3 split); PA reads restitution only', () => {
    expect(moneyFieldsFor('AZ')).toEqual({ restitution: true, fines: true });
    expect(moneyFieldsFor('PA')).toEqual({ restitution: true, fines: false });
  });
  test('a state whose tree reads no money field needs neither', () => {
    expect(moneyFieldsFor('NV')).toEqual({ restitution: false, fines: false }); // NV has no restitution_paid node
  });
});
```
> Note: the AZ assertion (`fines: true`) only passes AFTER Task 3 adds AZ's fines node. Run this test's PA/NV cases in Task 1; the AZ `fines:true` case goes green in Task 3 — mark it `test.skip` until then, and un-skip in Task 3. (Confirm NV truly has no `restitution_paid` node by grep; if it does, pick another money-free state.)

- [ ] **Step 2: Run test, verify PA/NV fail** — `npx vitest run src/data/intakeForm.test.ts` → FAIL (moneyFieldsFor missing).

- [ ] **Step 3: Implement.**
  - `src/data/screening.ts`: change `restitution_paid: boolean;` → `restitution_paid?: boolean;` and add `fines_paid?: boolean;` to `ConvictionRecord`. Add `'fines_paid'` to `RecordField`, to `FIELD_DOMAINS` (`fines_paid: ['true','false']`), and to `BOOLEAN_FIELDS`.
  - `src/data/intake.ts`: `restitutionPaid: boolean | null;` and add `finesPaid: boolean | null;` to `IntakeProfile`.
  - `src/data/intakeForm.ts`: add
```ts
import { fallbackRules } from './fallbackRules';
export function moneyFieldsFor(stateCode: string): { restitution: boolean; fines: boolean } {
  const nodes = fallbackRules[stateCode]?.rules.nodes ?? {};
  const reads = (f: string) => Object.values(nodes).some(n => n.field === f);
  return { restitution: reads('restitution_paid'), fines: reads('fines_paid') };
}
```
- [ ] **Step 4: Run test** — PA/NV cases PASS; AZ case skipped. `npx vitest run` full suite: fix any type errors from making `restitution_paid` optional (e.g. `makeEmptyRecord`, personas base — see Task 5) so the suite stays green.
- [ ] **Step 5: Commit** — `feat: add fines_paid money fact + nullable money + moneyFieldsFor`.

---

### Task 2: Intake form — two state-aware, forced money questions

**Files:** Modify `src/components/EligibilityWizard.tsx`

- [ ] **Step 1** — Remove `restitutionPaid` from the generic shared-field rendering. In `emptyProfile`, set `restitutionPaid: null, finesPaid: null`. In `SHARED_FIELD_LABELS`, drop the old `restitutionPaid` "All fines & restitution paid?" entry (it's replaced by the dedicated block below).
- [ ] **Step 2** — Render a dedicated money block per record, driven by `moneyFieldsFor(record.state)`:
  - If `.restitution`: a required Yes/No control labeled **"Restitution (money a court ordered you to pay a victim) paid in full?"** wired to `profileOf(record.id).restitutionPaid` — rendered with NO default selection (both pills inactive when `null`).
  - If `.fines`: a required Yes/No control labeled **"Court fines, fees, and costs paid in full?"** wired to `finesPaid`.
  - Neither shows for a state that reads no money field.
- [ ] **Step 3** — Validation: disable "Review & Submit" (or block `onSubmitIntake`) while any record has a money field its state requires but hasn't answered (`null`). Show a short inline "Please answer the money question(s)" hint. In `onSubmitIntake`, set `restitution_paid: p.restitutionPaid ?? undefined`, `fines_paid: p.finesPaid ?? undefined` on the record (undefined stays unanswered → hedge as the safety net).
- [ ] **Step 4** — `npm run build` clean; `npx eslint src/components/EligibilityWizard.tsx` (no NEW errors vs baseline); `npx vitest run` green. Manual: AZ shows both money questions (required); PA shows only restitution; a money-free state shows neither.
- [ ] **Step 5: Commit** — `feat: two state-aware, forced money questions in intake`.

---

### Task 3: All-money two-gate split — Arizona (the template)

**Files:** Modify `src/data/fallbackRules.ts` (AZ block), `src/data/personas.test.ts` (AZ), `src/data/intakeEquivalence.test.ts`; un-skip the AZ `moneyFieldsFor` case from Task 1.

Replace AZ's single `monetary_check_az` with TWO field-backed gates, preserving its exact targets (`yes → eligible_both_az`, `no → eligible_pay_then_file_az`):
```ts
monetary_check_az: {                      // now the RESTITUTION gate
  type: 'boolean', field: 'restitution_paid',
  text: 'Have you paid all court-ordered RESTITUTION in full? (Restitution is money owed to a victim.)',
  yes: 'monetary_fines_az',
  no: 'eligible_pay_then_file_az',
},
monetary_fines_az: {                      // NEW fines gate
  type: 'boolean', field: 'fines_paid',
  text: 'Have you paid all court fines, fees and costs in full?',
  yes: 'eligible_both_az',
  no: 'eligible_pay_then_file_az',
},
```
Both "no" paths keep AZ's existing `eligible_pay_then_file_az` result (money owed → pay before filing; unchanged). Net requirement (restitution AND fines) equals the old bundled question.

- [ ] **Step 1** — Make the edit above. Do NOT touch `eligible_both_az` / `eligible_pay_then_file_az` results or any waiting/exclusion logic.
- [ ] **Step 2** — Update AZ personas in `personas.test.ts`: any AZ persona reaching the money check sets `restitution_paid` — add `fines_paid: true` (or the intended value) to its `record`. Update `intakeEquivalence.test.ts`'s `rec()` helper to also set `fines_paid: true`, and add a case: DUI-style profile with **restitution paid, fines owed** → still reaches `eligible_pay_then_file_az` (proves the fines gate bites).
- [ ] **Step 3** — Un-skip the AZ `moneyFieldsFor` assertion (now `{restitution:true, fines:true}`).
- [ ] **Step 4** — `npm run validate` clean; `npx vitest run` all green.
- [ ] **Step 5: Commit** — `feat: AZ money check split into restitution + fines gates (legally equivalent)`.

---

### Task 4: All-money two-gate split — UT, TN, AL

Same pattern as Task 3, per state. For each, insert a fines gate between the restitution gate's "yes" and the original "yes" target; both "no" paths keep the original "no" target. Preserve each node's "completed your sentence AND…" phrasing, splitting only the MONEY into restitution then fines.

- [ ] **UT** (`restitution_ut`, yes→`count_limits_ut`, no→`ineligible_restitution_ut`): make `restitution_ut` the restitution gate (`text` → "…paid ALL RESTITUTION in full?", `yes: 'fines_ut'`, `no: 'ineligible_restitution_ut'`); add `fines_ut` (field `fines_paid`, "…paid all fines and interest in full?", `yes: 'count_limits_ut'`, `no: 'ineligible_restitution_ut'`). Update UT personas (+`fines_paid`).
- [ ] **TN** (`restitution_5_tn`→`date_5_tn`/`waiting_tn`; `restitution_10_tn`→`date_10_tn`/`waiting_tn`): each becomes a restitution gate → a shared/new fines gate → the original date node; "no" → `waiting_tn`. Because TN has two, add `fines_5_tn` and `fines_10_tn` (or one shared `fines_tn` that routes to the right date node — simpler to add two, mirroring the two restitution nodes). Split the "completed your sentence AND paid…" text into restitution then fines. Update TN personas.
- [ ] **AL** (`misd_restitution_al`, yes→`misd_conv_date_al`, no→`ineligible_restitution_al`): restitution gate → `fines_al` → `misd_conv_date_al`; "no" → `ineligible_restitution_al`. Update AL personas.
- [ ] Each state: `npm run validate` + `npx vitest run` green before its commit. Commit per state: `feat: <ST> money check split into restitution + fines gates`.

> Each state's implementer must READ the state's money node(s) in context first (line refs in the plan header) and confirm the exact `yes`/`no` targets before editing — do not assume.

---

### Task 5: Restitution-only proof (the live-bug fix) + personas base

**Files:** `src/data/personas.test.ts`, a new `src/data/moneyRegression.test.ts`.

- [ ] **Step 1** — In `personas.test.ts`, the `base` record sets `restitution_paid: true`; add `fines_paid: true` so existing all-money personas keep passing.
- [ ] **Step 2** — New `src/data/moneyRegression.test.ts` (real `evaluate` + `fallbackRules`) proving the live bug is fixed and the coupling holds:
  - PA: a record with `restitution_paid: true, fines_paid: false` reaches PA's *proceed* path (NOT the restitution-outstanding block) — restitution paid, fines owed, PA doesn't block on fines. (Read PA's `restitution_pa` yes-target for the exact expected key.)
  - NC: same shape → NC proceeds past `restitution_nc`.
  - AZ: `restitution_paid: true, fines_paid: false` → `eligible_pay_then_file_az` (fines gate bites — all-money still requires fines).
  - AZ: `restitution_paid: true, fines_paid: true` → `eligible_both_az`.
- [ ] **Step 3** — `npx vitest run` all green; `npm run validate` + `npm run build` clean.
- [ ] **Step 4: Commit** — `test: money regression — restitution-only vs all-money (live PA/NC bug fixed)`.

---

## Self-Review
- Spec §2 two facts → Task 1; form → Task 2; restitution-only fix → Tasks 1–2 + proof in Task 5; all-money two-gate → Tasks 3–4; force-an-answer → Task 2 (+ nullable model Task 1); no-legal-change → personas/equivalence/regression across Tasks 3–5.
- Coupling honored: Tasks 3–4 land the all-money fines gates in the SAME branch as Task 1–2's field-only change, so AZ/UT/TN/AL never under-block.
- FL: no node change (restitution-only); its money question now feeds the right value via Task 1–2.

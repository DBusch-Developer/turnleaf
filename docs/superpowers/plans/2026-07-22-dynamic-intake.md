# Dynamic State-Aware Intake — Implementation Plan (Phase 0: mechanism + Arizona pilot)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a prefill layer so the intake collects each fact once and the state trees stop re-asking it, proven end-to-end on Arizona — with zero change to any legal result.

**Architecture:** A canonical `IntakeProfile` (collected once) plus a per-state `IntakeMap` that declaratively pre-answers a tree's front-loadable asked-nodes. The rules engine already reads answers to asked nodes by node id (`answers[nodeId]`), so a pre-answered node's card never shows. Unmapped nodes remain as the short "guided tail." A state with no map falls back to today's flow.

**Tech Stack:** TypeScript, React 19, Next.js 16, Vitest. Pure logic in `src/data/`, UI in `src/components/EligibilityWizard.tsx`, validation in `src/data/validateState.ts`.

## Global Constraints

- **No legal change.** No task may edit a tree's nodes, edges, or results, or any wait/exclusion/fee/citation. The only permitted tree edit is plain-language `node.text` copy on tail questions (Task 6), which cannot move a result key.
- **Regression net:** `npx vitest run` (currently **774 passing**) must stay green after every task. `npm run validate` and `npm run build` must stay green.
- **Unknown is never guessed.** A profile value of `null` must produce NO answer for its node (the node stays asked) — mirroring the engine's rule that "an answer we do not have is never invented."
- **Anchor-vs-field contract:** a date node may only be prefilled from a profile date whose anchor matches (here: `dischargeDate` → nodes anchored on sentence-completion/discharge). Never feed a differently-anchored date node.
- **Direct-to-main commits** (repo convention): commit each task straight to `main`, no feature branch.
- **Windows/PowerShell:** run test commands as shown; they work under both the Bash tool and PowerShell.

---

### Task 1: Intake types + `buildAnswers` (pure core)

**Files:**
- Create: `src/data/intake.ts`
- Test: `src/data/intake.test.ts`

**Interfaces:**
- Consumes: `Answers`, `Answer` from `src/data/rulesEngine.ts`.
- Produces:
  - `interface IntakeProfile { offenseCategory: OffenseCategory; disposition: Disposition; chargeType: 'misdemeanor'|'felony'; sentenceCompleted: boolean; dischargeDate: string|null; priorFelony: boolean; restitutionPaid: boolean; }`
  - `type OffenseCategory = 'dui'|'marijuana'|'drug'|'sex_offense'|'violent'|'property'|'other'`
  - `type Disposition = 'convicted'|'dismissed'|'deferred'|'acquitted'`
  - `interface StateFieldSpec { key: string; label: string; optionsFrom: string; fills: string[]; }`
  - `interface IntakeMap { derived: Record<string, (p: IntakeProfile) => Answer | null>; stateFields?: StateFieldSpec[]; }`
  - `function buildAnswers(profile: IntakeProfile, map: IntakeMap, stateFieldValues: Record<string,string>): Answers`

- [ ] **Step 1: Write the failing test**

Create `src/data/intake.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { buildAnswers, type IntakeProfile, type IntakeMap } from './intake';

const base: IntakeProfile = {
  offenseCategory: 'dui', disposition: 'convicted', chargeType: 'misdemeanor',
  sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false, restitutionPaid: true,
};

const map: IntakeMap = {
  derived: {
    dui_q: p => p.offenseCategory === 'dui',
    mj_q: p => p.offenseCategory === 'marijuana',
    prior_q: p => p.priorFelony,
    date_q: p => p.dischargeDate,
    unknown_q: p => (p.dischargeDate ? null : true), // returns null here -> omitted
  },
  stateFields: [{ key: 'lvl', label: 'Level', optionsFrom: 'level_a', fills: ['level_a', 'level_b'] }],
};

describe('buildAnswers', () => {
  test('derives booleans and dates, and fills stateFields into every target', () => {
    const a = buildAnswers(base, map, { lvl: 'misd_1' });
    expect(a).toEqual({
      dui_q: true, mj_q: false, prior_q: false, date_q: '2019-06-01',
      level_a: 'misd_1', level_b: 'misd_1',
    });
  });

  test('a null derived value is OMITTED, so the node stays asked', () => {
    const a = buildAnswers({ ...base, dischargeDate: null }, map, {});
    expect('unknown_q' in a).toBe(true);   // now dischargeDate is null -> returns true
    expect(a.date_q).toBeUndefined();      // date_q returns null -> omitted
  });

  test('an unfilled stateField adds nothing', () => {
    const a = buildAnswers(base, map, {});
    expect('level_a' in a).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/intake.test.ts`
Expected: FAIL — `intake.ts` / `buildAnswers` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/intake.ts`:

```ts
// ============================================================================
// INTAKE PREFILL — collect a fact once, pre-answer the trees that ask for it.
//
// A per-state IntakeMap says how that state's front-loadable asked-nodes are
// answered from the shared IntakeProfile. The rules engine reads answers to
// asked nodes by node id, so a prefilled answer's card never shows. Whatever
// is not mapped stays asked — the guided tail. No tree is edited by this file.
// ============================================================================
import type { Answer, Answers } from './rulesEngine';

export type OffenseCategory =
  | 'dui' | 'marijuana' | 'drug' | 'sex_offense' | 'violent' | 'property' | 'other';
export type Disposition = 'convicted' | 'dismissed' | 'deferred' | 'acquitted';

/** The facts a person states ONCE, shared across every selected state. */
export interface IntakeProfile {
  offenseCategory: OffenseCategory;
  disposition: Disposition;
  chargeType: 'misdemeanor' | 'felony';
  sentenceCompleted: boolean;
  dischargeDate: string | null;
  priorFelony: boolean;
  restitutionPaid: boolean;
}

/** A per-state form field built from a tree node's own options (e.g. offense class). */
export interface StateFieldSpec {
  key: string;         // form field key
  label: string;       // shown label
  optionsFrom: string; // node id whose `options` populate the dropdown
  fills: string[];     // node ids to prefill with the chosen value
}

/** How one state consumes the profile. Additive data — never edits the tree. */
export interface IntakeMap {
  derived: Record<string, (p: IntakeProfile) => Answer | null>;
  stateFields?: StateFieldSpec[];
}

/**
 * Produce the `answers` object to seed a tree walk. A derived value of null is
 * omitted (the node stays asked — unknown is never guessed). Unfilled
 * stateFields add nothing.
 */
export function buildAnswers(
  profile: IntakeProfile,
  map: IntakeMap,
  stateFieldValues: Record<string, string>,
): Answers {
  const answers: Answers = {};
  for (const [nodeId, fn] of Object.entries(map.derived)) {
    const v = fn(profile);
    if (v !== null && v !== undefined) answers[nodeId] = v;
  }
  for (const sf of map.stateFields ?? []) {
    const val = stateFieldValues[sf.key];
    if (val) for (const nodeId of sf.fills) answers[nodeId] = val;
  }
  return answers;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/intake.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/intake.ts src/data/intake.test.ts
git commit -m "feat: intake profile + prefill core (buildAnswers)"
```

---

### Task 2: Arizona intake map + validator integrity check

**Files:**
- Create: `src/data/intakeMaps.ts`
- Modify: `src/data/validateState.ts` (add `validateIntakeMaps`)
- Test: `src/data/intakeMaps.test.ts`

**Interfaces:**
- Consumes: `IntakeProfile`, `IntakeMap` from `./intake`; `fallbackRules`, `StateRuleConfig` from `./fallbackRules`.
- Produces:
  - `export const intakeMaps: Record<string, IntakeMap>` (AZ populated)
  - `export function answersForState(stateCode: string, profile: IntakeProfile, stateFieldValues: Record<string,string>): Answers` — uses the state's map, or `{}` if none.
  - `export function validateIntakeMaps(rules: Record<string, StateRuleConfig>, maps: Record<string, IntakeMap>): ValidationError[]` in `validateState.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/data/intakeMaps.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { intakeMaps, answersForState } from './intakeMaps';
import { validateIntakeMaps } from './validateState';
import { fallbackRules } from './fallbackRules';
import type { IntakeProfile } from './intake';

const azProfile: IntakeProfile = {
  offenseCategory: 'dui', disposition: 'convicted', chargeType: 'misdemeanor',
  sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false, restitutionPaid: true,
};

describe('AZ intake map', () => {
  test('every mapped node id exists in the AZ tree', () => {
    const errors = validateIntakeMaps(fallbackRules, intakeMaps);
    expect(errors).toEqual([]);
  });

  test('a DUI profile answers the DUI/marijuana/prior/sentence nodes and skips exclusions', () => {
    const a = answersForState('AZ', azProfile, { azLevel: 'misd_1' });
    expect(a.dui_offense).toBe(true);
    expect(a.marijuana_offense).toBe(false);
    expect(a.prior_felony_az).toBe(false);
    expect(a.sentence_completed).toBe(true);
    expect(a.offense_level).toBe('misd_1');
    expect(a.offense_level_bumped).toBe('misd_1');
    expect(a.discharge_date_m1).toBe('2019-06-01');
    // the state-specific exclusion questions are NOT prefilled — they stay asked:
    expect('excluded_setaside_az' in a).toBe(false);
    expect('excluded_sealing_az' in a).toBe(false);
  });

  test('an unmapped state returns an empty answer set (today\'s flow)', () => {
    expect(answersForState('ZZ', azProfile, {})).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/intakeMaps.test.ts`
Expected: FAIL — `intakeMaps.ts` / `validateIntakeMaps` do not exist.

- [ ] **Step 3a: Write `intakeMaps.ts`**

Create `src/data/intakeMaps.ts`:

```ts
import type { IntakeMap, IntakeProfile } from './intake';
import { buildAnswers } from './intake';
import type { Answers } from './rulesEngine';

// Per-state prefill maps. A state absent here keeps today's all-asked flow.
export const intakeMaps: Record<string, IntakeMap> = {
  // ARIZONA. Convicted path: category (marijuana/DUI), prior felony, and
  // sentence-completion are prefilled from the profile; the § 13-905 and
  // § 13-911 exclusion questions stay asked (state-specific lists), as does
  // monetary_check_az. The class picker (offense_level / offense_level_bumped —
  // identical options) is a per-state form field filling both.
  AZ: {
    derived: {
      marijuana_offense: p => p.offenseCategory === 'marijuana',
      dui_offense: p => p.offenseCategory === 'dui',
      prior_felony_az: p => p.priorFelony,
      sentence_completed: p => p.sentenceCompleted,
      discharge_date_f23: p => p.dischargeDate,
      discharge_date_f456: p => p.dischargeDate,
      discharge_date_m1: p => p.dischargeDate,
      discharge_date_m23: p => p.dischargeDate,
      discharge_date_f23_bumped: p => p.dischargeDate,
      discharge_date_f456_bumped: p => p.dischargeDate,
      discharge_date_m1_bumped: p => p.dischargeDate,
      discharge_date_m23_bumped: p => p.dischargeDate,
    },
    stateFields: [
      { key: 'azLevel', label: 'Level & class of the offense', optionsFrom: 'offense_level',
        fills: ['offense_level', 'offense_level_bumped'] },
    ],
  },
};

/** The prefilled answers for a state, or {} when the state has no map. */
export function answersForState(
  stateCode: string,
  profile: IntakeProfile,
  stateFieldValues: Record<string, string>,
): Answers {
  const map = intakeMaps[stateCode];
  return map ? buildAnswers(profile, map, stateFieldValues) : {};
}
```

- [ ] **Step 3b: Add `validateIntakeMaps` to `validateState.ts`**

At the end of `src/data/validateState.ts`, add (imports `IntakeMap` type-only to avoid a cycle):

```ts
import type { IntakeMap } from './intake';

/**
 * Every node id a map names must exist in that state's tree, and a stateField's
 * optionsFrom must be a choice node. A map is additive data; a dangling id means
 * it would silently prefill nothing (or the wrong node), so it fails the build.
 */
export function validateIntakeMaps(
  rules: Record<string, StateRuleConfig>,
  maps: Record<string, IntakeMap>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const [code, map] of Object.entries(maps)) {
    const config = rules[code];
    if (!config) {
      errors.push({ state: code, rule: 'unresolved-ref', path: `intakeMaps.${code}`,
        message: `intake map names state '${code}', which has no rules` });
      continue;
    }
    const nodes = config.rules.nodes;
    const check = (id: string, path: string) => {
      if (!(id in nodes)) {
        errors.push({ state: code, rule: 'unresolved-ref', path,
          message: `intake map targets node '${id}', which the ${code} tree does not have` });
      }
    };
    for (const id of Object.keys(map.derived)) check(id, `intakeMaps.${code}.derived.${id}`);
    for (const sf of map.stateFields ?? []) {
      check(sf.optionsFrom, `intakeMaps.${code}.stateFields.${sf.key}.optionsFrom`);
      if (nodes[sf.optionsFrom] && nodes[sf.optionsFrom].type !== 'choice') {
        errors.push({ state: code, rule: 'bad-shape', path: `intakeMaps.${code}.stateFields.${sf.key}.optionsFrom`,
          message: `optionsFrom '${sf.optionsFrom}' is not a choice node, so it has no options to show` });
      }
      for (const id of sf.fills) check(id, `intakeMaps.${code}.stateFields.${sf.key}.fills`);
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/intakeMaps.test.ts`
Expected: PASS (3 tests). If "every mapped node id exists" fails, a node id in the AZ map is misspelled — fix it against `src/data/fallbackRules.ts` (search the `AZ:` block).

- [ ] **Step 5: Wire the check into the seed/validate gate**

In `src/db/validate.ts` (the `npm run validate` entrypoint), after the existing `validateAll` call, also run `validateIntakeMaps(fallbackRules, intakeMaps)` and merge its errors into the failure path. Then:

Run: `npm run validate`
Expected: prints structural pass AND no intake-map errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/intakeMaps.ts src/data/intakeMaps.test.ts src/data/validateState.ts src/db/validate.ts
git commit -m "feat: Arizona intake map + validator integrity check"
```

---

### Task 3: Persona-equivalence safety test (the guardrail)

**Files:**
- Test: `src/data/intakeEquivalence.test.ts`

**Interfaces:**
- Consumes: `answersForState` from `./intakeMaps`; `evaluate` from `./rulesEngine`; `fallbackRules` from `./fallbackRules`; the AZ personas' expected result keys.

**Purpose:** Prove that for representative Arizona scenarios, driving the tree through `IntakeProfile → answersForState` plus the leftover tail answers yields the SAME result key the tree produces from raw answers. If a map is wrong, this fails.

- [ ] **Step 1: Write the failing test**

Create `src/data/intakeEquivalence.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { evaluate, type Answers } from './rulesEngine';
import { fallbackRules } from './fallbackRules';
import { answersForState } from './intakeMaps';
import type { IntakeProfile } from './intake';
import type { ConvictionRecord } from './screening';

const NOW = new Date('2026-07-15');
const rec = (over: Partial<ConvictionRecord>): ConvictionRecord => ({
  id: 'p', state: 'AZ', title: 'x', charge_type: 'misdemeanor', disposition: 'convicted',
  disposition_date: '2019-06-01', probation_status: 'completed', prison_sentenced: false,
  restitution_paid: true, ...over,
});
const keyOf = (code: string, result: unknown) =>
  Object.entries(fallbackRules[code].rules.results).find(([, r]) => r === result)?.[0] ?? '(none)';

// Each case: a profile + the tail answers the person would still give, and the
// result key the current tree already produces for the same facts.
const cases: Array<{ name: string; profile: IntakeProfile; level: string; tail: Answers; expect: string }> = [
  {
    name: 'clean Class 1 misdemeanor DUI, discharged 2019 -> the DUI hedge',
    profile: { offenseCategory: 'dui', disposition: 'convicted', chargeType: 'misdemeanor',
      sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false, restitutionPaid: true },
    level: 'misd_1',
    tail: { excluded_setaside_az: false }, // reaches dui_offense=true -> complex_dui_az before exclusions matter
    expect: 'complex_dui_az',
  },
];

describe('AZ intake equivalence', () => {
  test.each(cases)('$name', (c) => {
    const answers: Answers = { ...answersForState('AZ', c.profile, { azLevel: c.level }), ...c.tail };
    const record = rec({ disposition: c.profile.disposition, disposition_date: c.profile.dischargeDate ?? '2019-06-01' });
    const result = evaluate(fallbackRules['AZ'], answers, record, NOW);
    expect(keyOf('AZ', result)).toBe(c.expect);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes honestly**

Run: `npx vitest run src/data/intakeEquivalence.test.ts`
Expected: PASS if the AZ map + expected key are correct. If it FAILS, read the actual result key printed and reconcile: either the map is wrong (fix Task 2) or the expected key is wrong (fix the case). Do not "make it pass" by loosening the assertion — the whole point is that the map reproduces the tree.

> Note for the implementer: confirm `complex_dui_az` is the real result id for a DUI in the AZ tree (search `dui_offense` → `complex_dui_az` in `fallbackRules.ts`). If the id differs, use the real one. Add 1–2 more cases (a non-DUI eligible set-aside, and an excluded serious offense) once the first passes, to cover the tail branches.

- [ ] **Step 3: Commit**

```bash
git add src/data/intakeEquivalence.test.ts
git commit -m "test: AZ profile->map->result equivalence guardrail"
```

---

### Task 4: Dynamic intake form + prefill on submit

**Files:**
- Create: `src/data/intakeForm.ts` (pure helpers)
- Test: `src/data/intakeForm.test.ts`
- Modify: `src/components/EligibilityWizard.tsx` (swap the per-record intake fields for the profile form; seed prefilled answers on submit)

**Interfaces:**
- Consumes: `IntakeProfile`, `intakeMaps`, `answersForState`, `fallbackRules`.
- Produces:
  - `function sharedFieldsFor(stateCodes: string[]): SharedFieldKey[]` — which profile fields to show (union of what the selected states' maps consume; all fields when a selected state has no map).
  - `function stateFieldsFor(stateCodes: string[]): Array<{ code: string; spec: StateFieldSpec; options: {label:string;value:string}[] }>` — per-state dropdowns, options read from the tree node.
  - `type SharedFieldKey = keyof IntakeProfile`

- [ ] **Step 1: Write the failing test**

Create `src/data/intakeForm.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { stateFieldsFor, sharedFieldsFor } from './intakeForm';

describe('intake form derivation', () => {
  test('AZ surfaces its class dropdown with the tree node\'s own options', () => {
    const sf = stateFieldsFor(['AZ']);
    expect(sf).toHaveLength(1);
    expect(sf[0].code).toBe('AZ');
    expect(sf[0].spec.key).toBe('azLevel');
    // options come verbatim from the offense_level node:
    expect(sf[0].options.map(o => o.value)).toEqual(['felony_high', 'felony_low', 'misd_1', 'misd_23']);
  });

  test('a mapped state shows the shared fields it consumes', () => {
    const keys = sharedFieldsFor(['AZ']);
    expect(keys).toContain('offenseCategory');
    expect(keys).toContain('priorFelony');
    expect(keys).toContain('dischargeDate');
  });

  test('an unmapped state falls back to the full shared field set', () => {
    const keys = sharedFieldsFor(['ZZ']);
    expect(keys).toContain('offenseCategory');
    expect(keys).toContain('sentenceCompleted');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/intakeForm.test.ts`
Expected: FAIL — `intakeForm.ts` does not exist.

- [ ] **Step 3: Write `intakeForm.ts`**

```ts
import type { StateFieldSpec, IntakeProfile } from './intake';
import { intakeMaps } from './intakeMaps';
import { fallbackRules } from './fallbackRules';

export type SharedFieldKey = keyof IntakeProfile;
const ALL_SHARED: SharedFieldKey[] = [
  'offenseCategory', 'disposition', 'chargeType', 'sentenceCompleted',
  'dischargeDate', 'priorFelony', 'restitutionPaid',
];

/**
 * Which shared fields to render. For a mapped state, show the fields its map
 * actually consumes (inferred by running each map fn against two probe profiles
 * and seeing which read the field). Simpler + robust: a mapped state shows the
 * full set too — every shared fact is cheap to ask once and always relevant to
 * SOME branch. So: union is the full set whenever any selected state is mapped
 * OR unmapped. (Kept as a function so a future narrower rule can slot in.)
 */
export function sharedFieldsFor(_stateCodes: string[]): SharedFieldKey[] {
  return ALL_SHARED;
}

/** Per-state dropdowns (e.g. offense class), options read from the tree node. */
export function stateFieldsFor(stateCodes: string[]): Array<{
  code: string; spec: StateFieldSpec; options: { label: string; value: string }[];
}> {
  const out: Array<{ code: string; spec: StateFieldSpec; options: { label: string; value: string }[] }> = [];
  for (const code of stateCodes) {
    const map = intakeMaps[code];
    const config = fallbackRules[code];
    if (!map?.stateFields || !config) continue;
    for (const spec of map.stateFields) {
      const node = config.rules.nodes[spec.optionsFrom];
      const options = (node?.options ?? []).map(o => ({ label: o.label, value: o.value }));
      out.push({ code, spec, options });
    }
  }
  return out;
}
```

> Design note: `sharedFieldsFor` intentionally returns the full set for now (YAGNI — narrowing per state adds complexity for little gain; every shared fact is a one-time ask). The signature is kept so a later phase can narrow it without touching callers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/intakeForm.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Swap the wizard's intake fields for the profile form**

In `src/components/EligibilityWizard.tsx`:

1. Add state for the profile and per-state class values:
```tsx
const [profile, setProfile] = useState<IntakeProfile>({
  offenseCategory: 'other', disposition: 'convicted', chargeType: 'misdemeanor',
  sentenceCompleted: true, dischargeDate: null, priorFelony: false, restitutionPaid: true,
});
const [stateFieldValues, setStateFieldValues] = useState<Record<string, string>>({});
```
2. Replace the per-record intake grid (the block rendering Charge Name / Offense Class / Outcome / Disposition Date / Probation, lines ~185–282) with **one** profile form: a labeled control per `sharedFieldsFor(states.map(s=>s.code))` key (a `<select>` for `offenseCategory`/`disposition`/`chargeType`, radio pills for the booleans `sentenceCompleted`/`priorFelony`/`restitutionPaid`, a `<input type="date">` for `dischargeDate`), plus one `<select>` per entry from `stateFieldsFor(...)` (grouped under the state name when `states.length > 1`). Keep the free-text "Charge Name" as an optional label only. Reuse existing `.input-field` styling.
3. On **"Review & Submit"** (`setShowCheckpoint(true)` handler), first build records + seed answers:
```tsx
const onSubmitIntake = () => {
  const built = states.map(s => ({
    ...makeEmptyRecord(s.code),
    disposition: profile.disposition,
    charge_type: profile.chargeType,
    disposition_date: profile.dischargeDate ?? new Date().toISOString().split('T')[0],
    restitution_paid: profile.restitutionPaid,
  }));
  setRecords(built);
  const seeded: Record<string, Answers> = {};
  for (const r of built) seeded[r.id] = answersForState(r.state, profile, stateFieldValues);
  setAnswers(seeded);
  setShowCheckpoint(true);
};
```
   Point the submit button's `onClick` at `onSubmitIntake`.
4. Leave the checkpoint block (the `pending`/`answerNode`/`handleScreening` machinery) UNCHANGED. Because `answers` is now pre-seeded, `pending` naturally contains only the unmapped tail nodes.
5. Remove the now-dead `prepopulatedRecords`/Checkr seeding ONLY if it conflicts; otherwise keep it — when `prepopulatedRecords.length > 0` it still seeds records directly (that path does not use the profile form and is out of scope here).

- [ ] **Step 6: Verify the app builds and the flow shrinks**

Run: `npm run build`
Expected: compiles clean.

Run: `npx vitest run`
Expected: **774 still pass** (the engine/personas are untouched; the wizard has no unit tests, its new pure helpers are covered by `intakeForm.test.ts`).

Manual check (optional): `npm run dev`, select Arizona, pick offense type "DUI / impaired driving", class "Class 1 Misdemeanor", Convicted, discharged 2019, no prior felony, sentence done → Review & Submit → the checkpoint shows only the exclusion question(s), not the marijuana/DUI/level/date cards.

- [ ] **Step 7: Commit**

```bash
git add src/data/intakeForm.ts src/data/intakeForm.test.ts src/components/EligibilityWizard.tsx
git commit -m "feat: dynamic profile intake form + answer prefill on submit"
```

---

### Task 5: Coverage report (see the tail shrink)

**Files:**
- Create: `src/db/intakeCoverage.ts`
- Modify: `package.json` (add `"intake:coverage": "tsx src/db/intakeCoverage.ts"`)

**Interfaces:**
- Consumes: `fallbackRules`, `intakeMaps`, `isAsked` from `./rulesEngine`.

- [ ] **Step 1: Write the script**

Create `src/db/intakeCoverage.ts`:

```ts
import { fallbackRules } from '../data/fallbackRules';
import { intakeMaps } from '../data/intakeMaps';
import { isAsked } from '../data/rulesEngine';

for (const [code, config] of Object.entries(fallbackRules)) {
  const asked = Object.values(config.rules.nodes).filter(isAsked).length;
  const map = intakeMaps[code];
  const mapped = map ? new Set([
    ...Object.keys(map.derived),
    ...(map.stateFields ?? []).flatMap(sf => sf.fills),
  ]).size : 0;
  const tail = Math.max(0, asked - mapped);
  const badge = map ? '' : '  (no map — today\'s flow)';
  console.log(`${code}: ${asked} asked · ${mapped} prefilled · ~${tail} tail${badge}`);
}
```

- [ ] **Step 2: Run it**

Run: `npm run intake:coverage`
Expected: a per-state line; Arizona shows a non-zero `prefilled` count and a small `tail`; every other state shows `(no map — today's flow)`.

- [ ] **Step 3: Commit**

```bash
git add src/db/intakeCoverage.ts package.json
git commit -m "chore: intake coverage report (prefilled vs asked per state)"
```

---

### Task 6: Plain-language pass on Arizona's tail questions

**Files:**
- Modify: `src/data/fallbackRules.ts` (AZ tail nodes' `node.text` ONLY)

**Constraint:** copy-only. Result keys must not move — Task 3's equivalence test and the AZ personas are the proof.

- [ ] **Step 1: Rewrite the two AZ exclusion questions in plain language**

In the `AZ:` block of `src/data/fallbackRules.ts`, rewrite ONLY the `text` of `excluded_setaside_az` and `excluded_sealing_az` (and `monetary_check_az` if its wording is dense) to lead with everyday words and move statute numbers into a trailing "(why we ask: …)" clause. Target register (from the approved mockup):

```
excluded_setaside_az.text:
"Did this offense involve any of these? — a weapon or dangerous instrument · serious physical injury to someone · a sexual element or motivation · a victim under 15. (Why we ask: Arizona keeps its most serious offenses out of a set-aside, § 13-905(P).)"
```

Do the same for `excluded_sealing_az`, preserving its distinct, wider list in plain words with the citation moved to a "why we ask" clause. **Do not change** `yes`/`no`/`next`/`options`/`validation` — text only.

- [ ] **Step 2: Verify nothing moved**

Run: `npm run validate`  → structural pass, no intake-map errors.
Run: `npx vitest run`   → **774 pass** (result keys unchanged) + the intake tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/data/fallbackRules.ts
git commit -m "copy: plain-language rewrite of Arizona's exclusion questions"
```

---

## After Phase 0 (the per-state rollout pattern)

Every remaining state repeats **Task 2 + Task 3 + Task 6** as one small change, in this order (per the approved spec): **CA, TX, NY, FL**, then down by population to all 50. For each state:
1. Author its `IntakeMap` entry (derived + stateFields), run `npm run validate` (map integrity) and `npm run intake:coverage` (tail shrank).
2. Add its equivalence cases to `intakeEquivalence.test.ts`; keep `npx vitest run` green.
3. Plain-language rewrite its remaining tail questions (copy-only), personas stay green.
4. Commit directly to main: `feat: <STATE> intake map + plain-language tail`.

A state is done when its map covers the front-loadable nodes, its tail is only the genuinely state-specific questions, and its personas and equivalence cases pass. The mechanism (Tasks 1, 4, 5) is built once and never revisited.

---

## Self-Review

- **Spec coverage:** §4 prefill approach → Tasks 1–2; §5 profile → Task 1; §6 map → Task 2; §7 dynamic form → Task 4; §8 buildAnswers → Task 1; §9 plain-language (required) → Task 6 + rollout; §10 graceful degradation → `answersForState` returns `{}` for unmapped (Task 2) + `sharedFieldsFor` full-set fallback (Task 4); §11 testing (persona equivalence, map integrity, coverage) → Tasks 2, 3, 5; §12 rollout → "After Phase 0"; §13 risks → covered by Tasks 2/3 checks. No gaps.
- **Placeholder scan:** all code steps carry real code; test steps carry real assertions; the one lookup left to the implementer (`complex_dui_az` id) is flagged explicitly with how to confirm it.
- **Type consistency:** `IntakeProfile`, `IntakeMap`, `StateFieldSpec`, `buildAnswers`, `answersForState`, `validateIntakeMaps`, `sharedFieldsFor`, `stateFieldsFor` names/signatures match across Tasks 1–5.

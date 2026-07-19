import { describe, test, expect } from 'vitest';
import { evaluate, type Answers } from './rulesEngine';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';

// ============================================================================
// PERSONAS — the research packages' own test cases, run against the real trees.
//
// Each wave package ships five personas per state: "(1) misdemeanor 2019, no
// probation issues → likely ALREADY auto-relieved — check-record path". Those
// are the acceptance criteria the research wrote, and until now nothing ran them.
//
// The fixture keeps TWO things apart on purpose:
//
//   `package`  — the persona text, VERBATIM from the wave package. This is the
//                spec. It is not paraphrased, because a paraphrase is where a
//                test quietly starts asserting what the code does instead of
//                what the research said.
//   `expect`   — MY reading of that text as a result key. This is the part a
//                reviewer referees. If a test fails, the first question is not
//                "is the tree wrong" but "is this mapping wrong".
//
// `expectIsApproximate` marks a mapping to the CLOSEST EXISTING key because the
// package describes an outcome the tree has no result for. A green check on one
// of those is a FINDING, NOT A PASS: it means the suite agrees with a tree that
// does not do what the research asked for. Grep for it.
//
//   grep -c "expectIsApproximate: true" src/data/personas.test.ts
//
// `now` is pinned. A persona like "eligible 2025" is a claim about a date, and
// a suite whose answers change with the calendar is a suite that rots.
//
// Gaps found here are INVENTORIED, not fixed. No branch gets added to a tree to
// make a persona go green.
// ============================================================================

interface Persona {
  /** Which package and which persona in it. */
  source: string;
  /** The persona text, verbatim from the package. The spec. */
  package: string;
  /** What the person tells us. */
  record: Partial<ConvictionRecord>;
  /** Answers to ASKED nodes, by node id. Record-backed nodes are not listed. */
  answers?: Answers;
  /** My reading of the package text — the reviewable part. */
  expect: { resultKey: string; reading: string };
  /**
   * True when resultKey is the CLOSEST EXISTING result rather than what the
   * package actually describes. A pass here is a finding, not a pass.
   */
  expectIsApproximate?: boolean;
  /** Pinned clock, so a date-dependent persona cannot rot. */
  now: string;
}

const base: ConvictionRecord = {
  id: 'p',
  state: 'CA',
  title: 'Offense',
  charge_type: 'misdemeanor',
  disposition: 'convicted',
  disposition_date: '2019-06-01',
  probation_status: 'completed',
  prison_sentenced: false,
  restitution_paid: true,
};

const NOW = '2026-07-15';

function run(code: string, p: Persona) {
  return evaluate(fallbackRules[code], p.answers ?? {}, { ...base, ...p.record }, new Date(p.now));
}

function keyOf(code: string, result: unknown): string {
  const entry = Object.entries(fallbackRules[code].rules.results).find(([, r]) => r === result);
  return entry?.[0] ?? '(hardcoded fallback — the tree could not classify this)';
}

// ---------------------------------------------------------------------------
const CA: Persona[] = [
  {
    source: 'Wave 0 — CA persona 1',
    package: 'misdemeanor 2019, no probation issues → likely ALREADY auto-relieved — check-record path.',
    record: { title: 'Petty Theft', charge_type: 'misdemeanor', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { sex_registration: false },
    expect: {
      resultKey: 'check_record_first_ca',
      reading:
        'The package asks for a CHECK-RECORD path, and one now exists: a misdemeanour past the '
        + '1-year PC 1203.425 period routes to check_record_first_ca, which leads with "your record '
        + 'may already be clear" and puts the petition after it. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 2',
    package: 'felony w/ probation completed 2021 → 1203.4 as of right (or auto).',
    record: { title: 'Grand Theft', charge_type: 'felony', disposition_date: '2021-03-01', probation_status: 'completed', prison_sentenced: false },
    answers: { sex_registration: false },
    expect: { resultKey: 'check_record_first_ca', reading: 'RESOLVED (Diana, 7/16): PC 1203.425(a)(1)(B)(iv)(I)(ia) makes ANY probation-completed conviction auto-eligible, so a probation-completed felony now leads with check-record-first (which carries the 1203.4 as-of-right backup). Was eligible_expungement under the old misdemeanor-only auto encoding.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 3',
    package: 'prison-term felony (non-violent) done 2020 → SB 731 path.',
    record: { title: 'Felony (non-violent)', charge_type: 'felony', disposition_date: '2020-05-01', prison_sentenced: true },
    answers: { sex_registration: false },
    expect: { resultKey: 'complex_prison', reading: 'State prison time routes to the PC 1203.41 / SB 731 discussion. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 4',
    package: '§ 290 registrant → excluded; honest-no.',
    record: { title: 'Registrable Offense', charge_type: 'felony' },
    answers: { sex_registration: true },
    expect: { resultKey: 'complex_registrant', reading: 'Registration → complex_registrant, which says excluded from standard relief and routes to legal aid. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 5',
    package: 'arrest, never charged, 2018 → 851.93 auto or 851.91 petition.',
    record: { title: 'Arrest, never charged', disposition: 'dismissed', disposition_date: '2018-02-01' },
    expect: {
      resultKey: 'eligible_dismissed',
      reading:
        'The package wants BOTH surfaced, automation FIRST: "851.93 auto or 851.91 petition". '
        + 'eligible_dismissed now leads with the DOJ clearing arrests automatically under § 851.93 '
        + 'and the record review to check it, and puts the § 851.91 petition after that as the '
        + 'backup for when automation missed you. Exact.',
    },
    now: NOW,
  },
  // Diana statute-verification locks (7/16) for the newly-encoded 1203.425 felony tiers.
  {
    source: 'Wave 0 — CA persona 6 (Diana statute verification, PC 1203.425(a)(1)(B)(iv)(II))',
    package: 'non-probation, non-serious/violent felony, all terms completed 2020 → auto-relief at 4 conviction-free years → check record.',
    record: { title: 'Non-serious felony, no probation', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01', probation_status: 'none', prison_sentenced: false },
    answers: { sex_registration: false, felony_auto_ca: false, auto_relief_felony_date_ca: '2020-01-01' },
    expect: { resultKey: 'check_record_first_ca', reading: 'A non-serious/violent/registrable felony with no probation gets automatic relief 4 conviction-free years after completing ALL terms (the 4-year clock ASKS for completion, not judgment); completed 2020 + 4 = 2024 < 2026 -> check-record. Encodes the resolved felony tier.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 7 (Diana statute verification, 1203.425 exclusions)',
    package: 'non-probation serious/violent felony → excluded from auto relief; petition path only.',
    record: { title: 'Serious felony, no probation', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-01-01', probation_status: 'none', prison_sentenced: false },
    answers: { sex_registration: false, felony_auto_ca: true },
    expect: { resultKey: 'eligible_expungement', reading: 'A serious (1192.7(c)) / violent (667.5) / registrable felony is EXCLUDED from 1203.425 auto relief; the felony_auto gate routes it to the petition path (eligible_expungement), not check-record.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — CA persona 8 (Diana statute verification, PC 1203.425(a)(1)(B)(iv)(I)(ib))',
    package: 'non-probation misdemeanor, 1+ year since judgment → auto-relief → check record.',
    record: { title: 'Misdemeanor, no probation', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', probation_status: 'none' },
    answers: { sex_registration: false },
    expect: { resultKey: 'check_record_first_ca', reading: 'A non-probation misdemeanor gets automatic relief 1 year after judgment (ib); 2022 + 1 < 2026 -> check-record (the 1-year clock runs from judgment, which the form collects).' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const AZ: Persona[] = [
  {
    source: 'Wave 0 — AZ persona 1',
    package: 'class 6 felony possession, done 2018 → set aside now + sealing eligible 2023+ → both.',
    record: { title: 'Possession', charge_type: 'felony', disposition_date: '2018-04-01', restitution_paid: true },
    // 'done 2018' = discharged 2018. CORRECTED 7/16: the § 13-911(E) clock runs
    // from completion of the NON-MONETARY conditions plus discharge — not from
    // "absolute discharge including all money paid", which is what this fixture
    // used to say and which the statute does not.
    answers: {
      excluded_setaside_az: false, excluded_sealing_az: false,
      marijuana_offense: false,
      dui_offense: false,
      sentence_completed: true,
      prior_felony_az: false,          // § 13-911(F) would add five years
      offense_level: 'felony_low',
      discharge_date_f456: '2018-04-01',
    },
    expect: { resultKey: 'eligible_both_az', reading: 'Class 6 = class 4/5/6 ladder, 5 years from non-monetary completion + discharge (§ 13-911(E)), no prior felony so no +5 bump (§ 13-911(F)). 2018 + 5 = 2023, and it is 2026. Restitution paid, so no pay-then-file detour. Exact — and now statute-verified rather than package-verified.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — AZ persona 2',
    package: 'marijuana possession 2015 → § 36-2862 free expungement.',
    record: { title: 'Marijuana Possession', charge_type: 'felony', disposition_date: '2015-01-01' },
    answers: { excluded_setaside_az: false, excluded_sealing_az: false, marijuana_offense: true },
    expect: {
      resultKey: 'eligible_marijuana_az',
      reading:
        'ARS § 36-2862 now has its own branch, asked BEFORE the set-aside/sealing ladder because it '
        + 'is strictly better than both: true expungement, free, no wait, mandatory grant. This '
        + 'person used to be routed to the slower, weaker remedy. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — AZ persona 3',
    package: 'DUI misdemeanor → set aside OK ⚠️ verify; sealing excluded? — resolve from § 13-911 text.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition_date: '2019-01-01' },
    answers: { excluded_setaside_az: false, excluded_sealing_az: false, marijuana_offense: false, dui_offense: true },
    expect: {
      resultKey: 'complex_dui_az',
      reading:
        'The package does not settle DUI sealing — it flags it "resolve from § 13-911 text". Per '
        + 'referee ruling the tree now HEDGES rather than asserting: set-aside likely available, '
        + '§ 13-911 sealing eligibility named as being verified. A real branch waits on the call. '
        + 'Exact for the hedge; still an open question on the law.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — AZ persona 4',
    package: 'dangerous offense → neither; honest-no.',
    record: { title: 'Aggravated Assault', charge_type: 'felony' },
    answers: { excluded_setaside_az: true },
    expect: { resultKey: 'ineligible_serious', reading: 'Dangerous offence → excluded from both § 13-905 and § 13-911. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — AZ persona 5',
    package: 'dismissed charge 2020 → § 13-911 sealing of non-conviction ⚠️ verify immediate availability.',
    record: { title: 'Dismissed Charge', disposition: 'dismissed', disposition_date: '2020-01-01' },
    expect: { resultKey: 'eligible_seal_dismissed_az', reading: 'Dismissal → § 13-911 sealing. The immediacy is flagged in the package and the result now hedges it. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const NY: Persona[] = [
  {
    source: 'Wave 0 — NY persona 1',
    package: 'misdemeanor 2019, sentence done → Clean-Slate-eligible NOW but possibly not yet processed → check via DCJS record review, petition 160.59 as backup? (10-yr wait not met → wait for auto) — the nuanced flagship persona.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition_date: '2019-06-01' },
    // Clean Slate runs from sentencing OR release, whichever is LATER. 'sentence
    // done' in 2019 with no incarceration, so the two coincide.
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, clean_slate_date_misd: '2019-06-01' },
    expect: {
      resultKey: 'eligible_clean_slate',
      reading:
        'Misdemeanour, 3-year Clean Slate period, 2019 + 3 = 2022 < 2026 → eligible. The result '
        + 'carries the "eligible does not mean sealed yet, courts have until Nov 2027" caveat the '
        + 'package calls the point of this persona. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 2',
    package: 'drug Class A felony, released 2015 → Clean-Slate-eligible (the surprise).',
    record: { title: 'Class A Drug Felony', charge_type: 'felony', disposition_date: '2015-01-01' },
    // 'released 2015' — release is the later event, so it is the anchor.
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, clean_slate_date_felony: '2015-01-01' },
    expect: {
      resultKey: 'eligible_clean_slate',
      reading:
        'The surprise: Article 220 Class A DRUG felonies ARE Clean Slate eligible; only non-drug '
        + 'Class A felonies are excluded. 8-year felony period, 2015 + 8 = 2023 < 2026. Exact — and '
        + 'the excluded_offense_ny question is worded to let a drug A felony through.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 3',
    package: 'violent felony → excluded both paths; honest-no.',
    record: { title: 'Robbery (violent felony)', charge_type: 'felony', disposition_date: '2015-01-01' },
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, clean_slate_date_felony: '2015-01-01' },
    expect: {
      resultKey: 'eligible_clean_slate',
      reading:
        'RESOLVED by statute (Diana, 7/16). CPL 160.57(1)(b)(v)-(vi) exclude only sex/sexually-violent '
        + 'offenses and non-Article-220 Class A felonies; Penal § 70.02 violent felonies appear NOWHERE in '
        + 'the Clean Slate conditions, so a robbery IS Clean-Slate eligible (only the § 160.59 petition '
        + 'excludes violent felonies). 8-year felony period, 2015 + 8 = 2023 < 2026 -> eligible. Now EXACT '
        + '(was expectIsApproximate).',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 4',
    package: 'two misdemeanors 2010 → 160.59 petition now OR wait for auto — cost/speed tradeoff copy.',
    record: { title: 'Misdemeanor (one of two)', charge_type: 'misdemeanor', disposition_date: '2010-01-01' },
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, clean_slate_date_misd: '2010-01-01' },
    expect: {
      resultKey: 'eligible_clean_slate',
      reading:
        'The package wants a cost/speed TRADEOFF: two convictions and 10+ years means CPL 160.59 is '
        + 'available now, versus waiting for automatic sealing. The tree has no conviction-count '
        + 'logic for NY at all, so it cannot know this is the second misdemeanour; it screens the '
        + 'one record and lands on Clean Slate. The 160.59 alternative survives only as a sentence '
        + 'in the message. Inventoried.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 5',
    package: 'dismissal → already sealed at disposition.',
    record: { title: 'Dismissed', disposition: 'dismissed', disposition_date: '2021-01-01' },
    expect: { resultKey: 'eligible_seal_dismissed', reading: 'CPL 160.50/.55 seal non-convictions automatically at disposition. Exact.' },
    now: NOW,
  },
  // Diana statute-verification locks (7/16) for the newly-encoded 160.50/.55/.57 branches.
  {
    source: 'Wave 0 — NY persona 6 (Diana statute verification, CPL 160.50 subd. 3(b))',
    package: 'ACD / deferral completed -> automatic sealing at dismissal (160.50 subd. 3(b)).',
    record: { title: 'ACD completed', disposition: 'deferred', disposition_date: '2023-01-01' },
    answers: {},
    expect: { resultKey: 'eligible_acd_ny', reading: 'A completed ACD is a termination in favor of the accused (160.50 subd. 3(b)) and seals automatically at the dismissal; the deferred path routes there (was the unknown_deferred hedge).' },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 7 (Diana statute verification, CPL 160.57(1)(a) DWAI)',
    package: 'DWAI (VTL 1192(1)) -> not sealed as a violation; Clean Slate seals it after 3 years.',
    record: { title: 'DWAI (VTL 1192(1))', charge_type: 'infraction', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, violation_dwai_ny: true, clean_slate_date_dwai: '2020-01-01' },
    expect: { resultKey: 'eligible_clean_slate', reading: 'DWAI is carved out of the 160.55 violation-seal and clears under Clean Slate 160.57(1)(a) after 3 years; 2020 + 3 = 2023 < 2026 -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 8 (Diana statute verification, CPL 160.55)',
    package: 'non-criminal violation conviction (not DWAI) -> sealed at termination, court file remains.',
    record: { title: 'Disorderly conduct (violation)', charge_type: 'infraction', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { cannabis_ny: false, excluded_offense_ny: false, supervision_status: false, violation_dwai_ny: false },
    expect: { resultKey: 'eligible_violation_seal_ny', reading: 'A non-DWAI violation/infraction seals at termination under 160.55 (which does NOT reach the court file); the tree routes it there.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 9 (Diana statute verification, CPL 160.50 subd. 5 / MRTA)',
    package: 'marijuana conviction -> vacated/dismissed/expunged automatically under MRTA (160.50 subd. 5) — check record.',
    record: { title: 'Marijuana possession', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { cannabis_ny: true },
    expect: { resultKey: 'check_cannabis_ny', reading: 'MRTA (now 160.50 subd. 5) auto-expunges qualifying marijuana convictions; the cannabis gate routes to the check-your-record result (subd. 5(b)(ii)(B) 30-day fallback).' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const TX: Persona[] = [
  {
    source: 'Wave 0 — TX persona 1',
    package: 'arrest, no charges, felony-level, 2022 → 3-yr wait → eligible 2025 (or SOL).',
    // "No charges" is the whole point: no supervision, charges never filed, so
    // the case is on the 55A.052 ladder — 3 years from the ARREST date, which
    // precedes disposition. Verified 7/16.
    answers: { supervision_tx: false, charges_filed_tx: false, arrest_date_tx_felony: '2022-01-01' },
    record: { title: 'Arrest, no charges', charge_type: 'felony', disposition: 'dismissed', disposition_date: '2022-06-01' },
    expect: { resultKey: 'eligible_expunction', reading: 'No charges filed -> 55A.052 ladder. Felony-level, 3 years from arrest, 2022 + 3 = 2025 < 2026 -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX persona 2',
    package: 'deferred adjudication misdemeanor theft, discharged 2024 → nondisclosure now-ish.',
    record: { title: 'Theft', charge_type: 'misdemeanor', disposition: 'deferred', disposition_date: '2024-03-01' },
    expect: { resultKey: 'eligible_nondisclosure_misdemeanor', reading: 'Completed deferred adjudication, misdemeanour → § 411.0725, immediate for most misdemeanours. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX persona 3',
    package: 'misdemeanor CONVICTION → 411.0735 path only, never expunction — the expectation-setter.',
    record: { title: 'Misdemeanor Conviction', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    expect: { resultKey: 'ineligible_conviction', reading: 'Convictions are never expungable in Texas; the result names the narrow 411.073/411.0735 nondisclosure paths and declines to quote the conflicted period. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX persona 4',
    package: 'first DWI, interlock full term, done 2023 → nondisclosure 2025.',
    record: { title: 'DWI (first offense)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-01-01' },
    expect: {
      resultKey: 'ineligible_conviction',
      reading:
        'The package wants a DWI-specific answer: first offence, full-term interlock → nondisclosure '
        + 'at 2 years, so eligible in 2025. The tree has no DWI branch and no interlock question, so '
        + 'a DWI conviction falls into the generic conviction result, which names the DWI sections '
        + 'in prose but computes nothing. This person is told less than the research knows. '
        + 'Inventoried.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 0 — TX persona 5',
    package: 'acquitted last month → automatic expunction at acquittal ⚠️ — confirm it actually happened; if not, petition.',
    record: { title: 'Acquitted Charge', disposition: 'acquitted', disposition_date: '2026-06-15' },
    // 55A.151 episode gate: no other offence from the same incident.
    answers: { acquittal_episode_tx: false },
    expect: {
      resultKey: 'check_record_first_tx',
      reading:
        'RESOLVED 7/16 against 55A.201: NOT automatic. The court enters the order within 30 days AT '
        + 'THE PERSON\'S REQUEST, and must advise them of the right. check_record_first_tx now says '
        + 'exactly that — ask whether it was entered, and if nobody asked you can still file, the '
        + 'entitlement does not expire. The ⚠ hedge is gone and 55A.201 is cited. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX (new, from the 7/16 55A.052 vs 55A.053 split)',
    package: 'charged then dismissed via completed pretrial intervention -> entitled under 55A.053.',
    record: { title: 'Dismissed after PTI', charge_type: 'misdemeanor', disposition: 'dismissed' },
    answers: { supervision_tx: false, charges_filed_tx: true, dismissal_reason_tx: 'pretrial_intervention' },
    expect: { resultKey: 'eligible_expunction_053_tx', reading: '55A.053: charges filed, so the REASON decides. Completed pretrial intervention is an entitling reason. No waiting period. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX (new, 55A.053 specialty court)',
    package: 'charged then dismissed via veterans court completion -> entitled, once-ever, possibly free (55A.203(c)).',
    record: { title: 'Dismissed after veterans court', charge_type: 'felony', disposition: 'dismissed' },
    answers: { supervision_tx: false, charges_filed_tx: true, dismissal_reason_tx: 'veterans_court' },
    expect: { resultKey: 'eligible_specialty_tx', reading: 'Veterans court completion is an entitling 55A.053 reason with its own result: once per lifetime, affidavit required, and possibly no fee under 55A.203(c). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX (new, 55A.053 the harm case)',
    package: 'charged then dismissed for an ordinary reason -> NOT entitled. The overstatement the split fixed.',
    record: { title: 'Dismissed, ordinary reason', charge_type: 'misdemeanor', disposition: 'dismissed' },
    answers: { supervision_tx: false, charges_filed_tx: true, dismissal_reason_tx: 'other' },
    expect: { resultKey: 'ineligible_dismissal_reason_tx', reading: 'THE FIX. Charges filed, dismissed for a reason not on the 55A.053 list -> no entitlement. The old tree sent this person to the 55A.052 waiting ladder and told them to file for something they cannot get. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX (new, 55A.051(3) supervision bar)',
    package: 'dismissed but was on community supervision (not Class C) -> barred by 55A.051(3).',
    record: { title: 'Dismissed, was on probation', charge_type: 'felony', disposition: 'dismissed' },
    answers: { supervision_tx: true },
    expect: { resultKey: 'ineligible_supervision_tx', reading: '55A.051(3) gates the whole subchapter: court-ordered community supervision (Class C excepted) bars expunction, before any 052/053 question. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — TX (new, 55A.151 episode bar)',
    package: 'acquitted but convicted of another offence from the same incident -> barred by 55A.151.',
    record: { title: 'Acquitted, but another episode offence', disposition: 'acquitted' },
    answers: { acquittal_episode_tx: true },
    expect: { resultKey: 'ineligible_episode_tx', reading: '55A.151 same-criminal-episode bar: acquittal does not entitle when another offence from the episode was a conviction or is pending. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const UT: Persona[] = [
  {
    source: 'Wave 1 — UT persona 1',
    package: 'class B misd, closed 5 yrs ago, clean history → eligible (automatic track + petition option).',
    record: { title: 'Class B Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: {
      pending_charges_ut: false,
      count_limits_ut: 'within',
      supervision_ut: false,
      disqualifiers_ut: false,
      offense_level_ut: 'b',
      // Utah's clock runs from CASE CLOSURE — asked, not read off the form.
      closure_b_ut: '2021-07-15',
      closure_b_auto_ut: '2021-07-15',
    },
    expect: {
      resultKey: 'eligible_petition_faster_ut',
      reading:
        'Closed 5 years ago. Class B: petition at 4 years (passed), automatic at 6 (NOT passed). So '
        + 'the person sits BETWEEN the thresholds, and the honest answer is the counterintuitive '
        + 'one — petitioning now is faster than waiting for the automatic system. The package says '
        + '"automatic track + petition option", which reads as though both are available now; at 5 '
        + 'years the automatic track has not arrived. Flagged approximate: if the package is right, '
        + 'the automatic period is not 6 years and the inversion open question resolves differently.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 1 — UT persona 2',
    package: 'eligible felony, closed 4 yrs ago → waiting, date = closure+7y.',
    record: { title: 'Eligible Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: {
      pending_charges_ut: false,
      count_limits_ut: 'within',
      supervision_ut: false,
      disqualifiers_ut: false,
      offense_level_ut: 'felony',
      closure_felony_ut: '2022-07-15',
    },
    expect: { resultKey: 'waiting_ut', reading: 'Felony: 7 years from case closure. Closed 2022, so 4 years elapsed of 7. Waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — UT persona 3',
    package: '2 non-drug felonies → ineligible (count limit).',
    record: { title: 'Second Non-Drug Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { pending_charges_ut: false, count_limits_ut: 'over_limits' },
    expect: {
      resultKey: 'ineligible_counts_ut',
      reading:
        'Two or more non-drug felonies is clause (a) of the § 303(4) cap. The gate fires BEFORE any '
        + 'per-conviction check, which is what Wave 1 asks for. Exact — though the person has to '
        + 'self-assess the count, which is the known limitation.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — UT persona 4',
    package: 'dismissal with prejudice 60 days ago → eligible-automatic.',
    record: { title: 'Dismissed Charge', disposition: 'dismissed', disposition_date: '2026-05-16' },
    answers: { dismissal_prejudice_ut: 'with' },
    expect: {
      resultKey: 'eligible_dismissal_ut',
      reading:
        'Dismissed with prejudice, 60 days ago; the threshold is 30 days, so it has passed. The '
        + 'package calls this "eligible-automatic". Utah\'s automatic track covers misdemeanour-level '
        + 'CONVICTIONS (§ 77-40a-205); Wave 1 gives dismissals a 30/180-day PETITION period, and no '
        + 'automatic dismissal path. Reading it as the petition path with its short wait. Flagged '
        + 'approximate: if dismissals really are automatic, this needs its own branch and the person '
        + 'should be told to check rather than file.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 1 — UT persona 5',
    package: 'class A misd, on parole → ineligible-for-now.',
    record: { title: 'Class A Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { pending_charges_ut: false, count_limits_ut: 'within', supervision_ut: true },
    expect: { resultKey: 'ineligible_supervision_ut', reading: 'On parole → the supervision bar fires. "For now" is the point: the result says it is a timing bar and that the clock starts at case closure. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MI: Persona[] = [
  {
    source: 'Wave 1 — MI persona 1',
    package: 'one misdemeanor, 8 yrs post-sentence, clean, non-excluded → likely already automatically set aside → check-record path.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-07-15' },
    answers: {
      marijuana_mi: false,
      trafficking_victim_mi: false,
      pending_charges_mi: false,
      petition_excluded_mi: false,
      owi_mi: false,
      auto_excluded_mi: false,
      // auto_date_misd_mi reads the record: its anchor IS sentencing.
    },
    expect: {
      resultKey: 'check_record_first_mi',
      reading:
        'Misdemeanour, 8 years post-sentence, not on the automatic exclusion list → past the 7-year '
        + 'automatic threshold, so it is probably already set aside and nobody told them. Leads with '
        + 'the MSP record check; copy now carries the 621g(5)-(7) caps/conviction-free/assaultive-count conditions. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 2',
    package: 'one felony (non-excluded), 6 yrs post-discharge → eligible-petition.',
    record: { title: 'Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      marijuana_mi: false,
      trafficking_victim_mi: false,
      pending_charges_mi: false,
      petition_excluded_mi: false,
      owi_mi: false,
      auto_excluded_mi: false,
      auto_date_felony_mi: '2020-07-15',   // 6 yrs — short of the 10-yr automatic
      petition_counts_mi: 'one_felony_or_serious',
      petition_date_5_mi: '2020-07-15',    // 6 yrs — past the 5-yr petition period
      new_convictions_mi: false,
    },
    expect: {
      resultKey: 'eligible_petition_mi',
      reading:
        'The two tracks diverge here: 6 years is past the 5-year PETITION period for one felony but '
        + 'short of the 10-year AUTOMATIC one. So waiting would cost four more years — petition now. '
        + 'Copy now carries the $50-no-waiver fee, 3-yr re-file bar, and privilege-not-right framing. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 3',
    package: '3 felonies (not one bad night), latest discharge 6 yrs ago → waiting (7y multiple-felony period).',
    record: { title: 'Felony (third)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      marijuana_mi: false,
      trafficking_victim_mi: false,
      pending_charges_mi: false,
      petition_excluded_mi: false,
      owi_mi: false,
      auto_excluded_mi: false,
      auto_date_felony_mi: '2020-07-15',
      petition_counts_mi: 'multiple_felonies',
      one_bad_night_mi: false,             // spread across time, not a single transaction
      petition_date_7_mi: '2020-07-15',    // 6 yrs of the 7 needed
    },
    expect: {
      resultKey: 'waiting_mi',
      reading:
        'Three felonies is at Michigan\'s lifetime cap, not over it, so the count gate passes. Not One '
        + 'Bad Night → the multiple-felony 7-year period applies. Six years since the latest discharge → waiting. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 4 (bug-3 regression)',
    package: 'marijuana misdemeanor 2019, even WITH a pending charge → still eligible-now via 621e.',
    record: { title: 'Marijuana Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { marijuana_mi: true },
    expect: {
      resultKey: 'eligible_marijuana_mi',
      reading:
        'BUG-3 fix: marijuana (621e, no pending-charge condition) is now asked BEFORE the pending gate, '
        + 'so a pending charge cannot block it. marijuana_mi=true short-circuits to 621e; the result copy '
        + 'now spells out the 60-day / 21-day / burden-on-prosecutor mechanics (621e(4)-(6)). Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 5 (upgraded)',
    package: 'first-violation OWI, 6 yrs out → discretionary-eligible (was complex).',
    record: { title: 'OWI (first violation)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { marijuana_mi: false, trafficking_victim_mi: false, pending_charges_mi: false, petition_excluded_mi: false, owi_mi: true, owi_date_mi: '2020-01-01' },
    expect: {
      resultKey: 'eligible_owi_mi',
      reading:
        'First-violation OWI: petitionable once per lifetime (621c(3)), 5-yr wait (621d(2)) met at 6 yrs, '
        + 'discretionary and never automatic. Upgraded from the old complex_owi_mi hedge to a real eligible '
        + 'path; copy carries the rehab-factor and no-SOS-driving-record notes. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Diana 7/18 — MI CDL commercial traffic',
    package: 'commercial-traffic offense committed while holding a CDL → PETITION-excluded (621c(1)(d)), not merely automatic-excluded.',
    record: { title: 'CDL commercial traffic offense', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { marijuana_mi: false, trafficking_victim_mi: false, pending_charges_mi: false, petition_excluded_mi: true },
    expect: {
      resultKey: 'ineligible_serious_mi',
      reading:
        'BUG-1 fix: CDL commercial-traffic offenses are on the PETITION exclusion list (621c(1)(d)), so they '
        + 'route to ineligible_serious_mi at the petition gate — they no longer merely fall through to the '
        + 'automatic-excluded list. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Diana 7/18 — MI felony DV with prior misd DV',
    package: 'felony domestic-violence with a prior misdemeanor DV conviction → petition-excluded (621c(1)(e)).',
    record: { title: 'Felony DV (prior misd DV)', charge_type: 'felony', disposition: 'convicted' },
    answers: { marijuana_mi: false, trafficking_victim_mi: false, pending_charges_mi: false, petition_excluded_mi: true },
    expect: {
      resultKey: 'ineligible_serious_mi',
      reading:
        'BUG-2 fix: felony DV with a prior misdemeanor DV is a petition exclusion (621c(1)(e)), now on the '
        + 'petition_excluded_mi gate → ineligible_serious_mi. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Diana 7/18 — MI deferred 7411',
    package: 'completed section-7411 deferral (dismissed) → counts as a misdemeanor conviction for eligibility (621(2)), not an invisible hedge.',
    record: { title: 'Section 7411 deferral (dismissed)', disposition: 'deferred', disposition_date: '2022-01-01' },
    expect: {
      resultKey: 'deferred_counts_mi',
      reading:
        'UPGRADE: 621(2) treats a deferred-and-dismissed disposition (7411/769.4a/HYTA/liquor code) as a '
        + 'MISDEMEANOR conviction when counting set-aside eligibility, and 621d(7)(d) requires listing it. '
        + 'Replaces the old unknown_deferred hedge; honest caveat that set-aside-ability of the deferral itself is unanswered. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Diana 7/18 — MI One Bad Night (two felonies)',
    package: 'two non-assaultive felonies from a single 24-hour transaction → 621b counts them as ONE → the 5-yr single-felony bucket, not 7-yr.',
    record: { title: 'Two felonies, one night', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      marijuana_mi: false, trafficking_victim_mi: false, pending_charges_mi: false, petition_excluded_mi: false, owi_mi: false,
      auto_excluded_mi: false, auto_date_felony_mi: '2019-01-01',   // fails the 10-yr automatic
      petition_counts_mi: 'multiple_felonies', one_bad_night_mi: true,
      petition_date_5_mi: '2019-01-01', new_convictions_mi: false,
    },
    expect: {
      resultKey: 'eligible_petition_mi',
      reading:
        'ONE BAD NIGHT (621b): two non-assaultive/non-weapon/<10-yr felonies from a single 24-hr transaction '
        + 'count as ONE conviction, moving the person from the 7-yr multi-felony bucket to the 5-yr single-felony '
        + 'bucket. 2019+5=2024<2026 passes where 7 (2026) would not. The gift-and-trap node. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Diana 7/18 — MI assaultive misdemeanor (gap)',
    package: 'a non-serious assaultive-crime misdemeanor → 621d gap (excluded from 3-yr (3), unnamed in (2)) → conservative 5-yr route.',
    record: { title: 'Assaultive misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: {
      marijuana_mi: false, trafficking_victim_mi: false, pending_charges_mi: false, petition_excluded_mi: false, owi_mi: false,
      auto_excluded_mi: true,   // assaultive crime is excluded from the automatic track
      petition_counts_mi: 'assault_misd', petition_date_5_assault_mi: '2020-01-01', new_convictions_mi: false,
    },
    expect: {
      resultKey: 'eligible_petition_mi',
      reading:
        'GAP handling: an assaultive-crime misdemeanor is excluded from the 3-yr bucket (621d(3)) and not named '
        + 'in (2), so it no longer silently rides the 3-yr path — routed to the conservative 5-yr node (2020+5=2025<2026). '
        + 'The date node anchor flags the unsettled period; an open question tracks it. Exact for the routing.',
    },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const PA: Persona[] = [
  {
    source: 'Wave 1 — PA persona 1',
    package: 'M2 conviction, 8 yrs conviction-free, fines paid → likely auto-sealed → check-record path.',
    record: { title: 'M2 Conviction', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: {
      sealing_excluded_pa: false,
      misd_count_pa: false,
      grade_pa: 'm2_m3',
      petition_misd_date_pa: '2018-07-15',   // 8 conviction-free years
    },
    expect: {
      resultKey: 'check_record_unknown_period_pa',
      reading:
        'THE CONFLICT persona. At 8 years the person is past the 7-year PETITION period, so that '
        + 'much is solid and the result says so. Whether the AUTOMATIC sealing has already fired '
        + 'depends on a period Wave 1\'s sources split on (7 vs 10) — so the null-period node routes '
        + 'to nextUnknown and the result says plainly that we cannot tell them, and to check rather '
        + 'than assume. The package says "likely auto-sealed"; that is only true on the 7-year '
        + 'reading. Flagged approximate: this resolves the moment § 9122.2 is read.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 1 — PA persona 2',
    package: 'M1, 5 yrs → waiting (7y).',
    record: { title: 'M1 Conviction', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: {
      sealing_excluded_pa: false,
      misd_count_pa: false,
      grade_pa: 'm1',
      petition_m1_date_pa: '2021-07-15',   // 5 of the 7 needed
    },
    expect: { resultKey: 'waiting_misd_pa', reading: 'M1: 7 conviction-free years for petition sealing, and no automatic path reaches a first-degree misdemeanour. 5 years elapsed → waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — PA persona 3',
    package: 'F1 → ineligible for sealing → pardon path.',
    record: { title: 'First-Degree Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { sealing_excluded_pa: true },
    expect: {
      resultKey: 'ineligible_serious_pa',
      reading:
        'A first-degree felony is on the sealing exclusion list, so no waiting period helps. The '
        + 'result routes to the Board of Pardons — which since June 2024 carries automatic '
        + 'expungement once granted, and which Pennsylvania grants more often than most states. '
        + 'Exact: the package asks for the pardon path and that is what it gets.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — PA persona 4',
    package: 'drug felony, 3-yr sentence, 11 yrs clean → eligible (3.0 automatic — verify).',
    record: { title: 'Drug Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      sealing_excluded_pa: false,
      misd_count_pa: false,
      grade_pa: 'felony_eligible',
      felony_date_pa: '2015-07-15',   // 11 conviction-free years
    },
    expect: {
      resultKey: 'eligible_felony_pa',
      reading:
        'A drug felony with a 3-year sentence is inside the "under 7 years of confinement" window, '
        + 'and 11 conviction-free years clears the 10-year period. The package flags the Clean Slate '
        + '3.0 automatic drug-felony path as needing verification, so the result tells the person to '
        + 'check their record before filing rather than asserting it already happened. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — PA persona 5',
    package: 'dismissed charges last year → auto-sealed, expungement available.',
    record: { title: 'Dismissed Charges', disposition: 'dismissed', disposition_date: '2025-07-15' },
    expect: {
      resultKey: 'eligible_nonconviction_pa',
      reading:
        'Non-convictions seal automatically with no waiting period, AND expungement is available '
        + 'because there was no conviction. The result gives both and explains why expungement is '
        + 'the stronger of the two — sealing keeps the record visible to law enforcement. Exact.',
    },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const NJ: Persona[] = [
  {
    source: 'Wave 1 — NJ persona 1 (updated)',
    package: 'one indictable (burglary 3rd), 6 yrs post-everything, fines paid, nothing since → eligible-standard.',
    record: { title: 'Burglary (3rd degree indictable)', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'one_indictable', date_5_nj: '2020-07-15' },
    expect: { resultKey: 'eligible_standard_nj', reading: 'One indictable, not on 2C:52-2(b), not distribution, no prior expungement, 6 yrs past the latest of the four events -> standard 5-yr path (2C:52-2(a)). Copy now states free-by-statute and earlier-convictions-do-not-bar. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 2 (updated)',
    package: 'one indictable + 2 DP, 4 yrs, pending job offer -> early-pathway complex.',
    record: { title: 'Indictable Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'one_indictable', date_5_nj: '2022-07-15', date_4_nj: '2022-07-15' },
    expect: { resultKey: 'complex_early_nj', reading: 'Four years in: short of the standard 5 but past the 4-yr "compelling circumstances" mark for an indictable record -> discretionary early-pathway complex. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 3 (updated)',
    package: 'separate unrelated convictions beyond the standard limits, latest closed 11 yrs ago -> clean slate.',
    record: { title: 'Indictable Offense (beyond standard limits)', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'beyond', date_10_nj: '2015-07-15' },
    expect: { resultKey: 'eligible_clean_slate_nj', reading: 'Beyond the standard limits -> Clean Slate (2C:52-5.3): entire record, 10 yrs from most recent conviction. 11 yrs clears it. Copy adds the automation-end / restoration notes. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 4',
    package: 'DWI -> not expungable (Title 39).',
    record: { title: 'DWI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { title39_nj: true },
    expect: { resultKey: 'ineligible_title39_nj', reading: 'Title 39 motor-vehicle offences sit outside the expungement statute entirely. Asked first, answered in one question. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 5 (updated) / operation-of-law',
    package: 'marijuana possession -> expunged BY OPERATION OF LAW (6.1); check record, 5.1 backstop.',
    record: { title: 'Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { title39_nj: false, marijuana_nj: true, marijuana_type_nj: 'possession' },
    expect: { resultKey: 'eligible_marijuana_ool_nj', reading: 'A marijuana-only possession case was expunged by operation of law (2C:52-6.1), sentence and unpaid assessments vacated -> check-record-first result, with the 2C:52-5.1 anytime petition (court SHALL grant) as the backstop. Replaces the old generic marijuana result. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ crime spree',
    package: 'interdependent/closely-related crime spree across years -> 5-yr path, NOT clean slate.',
    record: { title: 'Crime-spree convictions', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'crime_spree', date_5_nj: '2020-01-01' },
    expect: { resultKey: 'eligible_standard_nj', reading: 'ADDED PRONG: an interdependent/closely-related crime spree is a 5-yr standard prong (2C:52-2(a)), not a clean-slate case. Draft was missing this. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ single judgment',
    package: 'multiple convictions all entered in a single judgment of conviction -> 5-yr path.',
    record: { title: 'Multiple convictions (single judgment)', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'single_judgment', date_5_nj: '2020-01-01' },
    expect: { resultKey: 'eligible_standard_nj', reading: 'ADDED PRONG: multiple convictions in a single judgment of conviction are a 5-yr standard prong (2C:52-2(a)), not clean slate. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ prior expungement',
    package: 'a prior expungement was granted -> standard/DP closed, clean-slate-only result (14(e)).',
    record: { title: 'Indictable (prior expungement used)', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: true },
    expect: { resultKey: 'complex_prior_expungement_nj', reading: 'RECAST once-per-lifetime as the 2C:52-14(e) previous-expungement bar: it closes the standard/DP paths but expressly leaves clean slate, ordinances, non-convictions, and hypodermic paraphernalia open. Gate sits ahead of the count profile. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ DP-only early path',
    package: 'DP-only record, ~3.5 yrs out -> the 3-yr DP early pathway complex, NOT waiting.',
    record: { title: 'DP offense (DP-only record)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: false, excluded_nj: false, distribution_nj: false, prior_expungement_nj: false, count_profile_nj: 'dp_only', date_5_dp_nj: '2023-01-01', date_3_dp_nj: '2023-01-01' },
    expect: { resultKey: 'complex_early_nj', reading: 'CONFIRMED 3-yr DP early path (2C:52-3): DP-only, 3 yrs elapsed (2023-01 -> 2026), short of 5 -> fails date_5_dp, passes date_3_dp -> early-pathway complex, not waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ plea-bargain dismissal',
    package: 'charge dismissed as part of a plea bargain with a conviction -> barred UNTIL the conviction is expunged (bar lifts).',
    record: { title: 'Plea-bargain dismissal', disposition: 'dismissed' },
    answers: { dismissal_pleabargain_nj: true },
    expect: { resultKey: 'complex_pleabargain_dismissal_nj', reading: '2C:52-6(a)(3)/14(c): a plea-bargain dismissal is barred until the related conviction is itself expunged — but the bar LIFTS then, framed as a "not yet" with a sequencing path, not a flat no. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ PTI completion',
    package: 'PTI completed, case dismissed 7 months ago -> eligible (6-month bar met).',
    record: { title: 'PTI completed', disposition: 'deferred' },
    answers: { diversion_type_nj: 'pti', diversion_date_nj: '2025-12-15' },
    expect: { resultKey: 'eligible_diversion_nj', reading: 'Diversion branch (replaces unknown_deferred): PTI/CD/conditional-dismissal expungeable 6 months after the dismissal order (2C:52-6(c)(1)); 7 months out -> eligible. Vet/MH would be anytime. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NJ marijuana distribution 2 yrs',
    package: 'marijuana distribution (35-5(b)(11)) 2 yrs out -> waiting (3-yr path).',
    record: { title: 'Marijuana distribution (2C:35-5(b)(11))', charge_type: 'felony', disposition: 'convicted' },
    answers: { title39_nj: false, marijuana_nj: true, marijuana_type_nj: 'distribution', mj_dist_date_nj: '2024-07-15' },
    expect: { resultKey: 'waiting_mj_dist_nj', reading: '35-5(b)(11) marijuana distribution has its own 3-yr path (2C:52-5.1(b)); 2 yrs out -> waiting, not the operation-of-law clearance (which is for possession/small only). Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const CO: Persona[] = [
  {
    source: 'Wave 1 — CO persona 1',
    package: 'class 5 felony theft (no named victim? theft has a victim — good edge case: theft IS listed as commonly eligible ⚠️ verify against § 706\'s actual list), 11 yrs clean → likely auto-sealed → check-record.',
    record: { title: 'Theft (class 5 felony)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      excluded_co: false,   // theft is not on the § 706(2) list
      intervening_co: false,
      level_co: 'felony_eligible',
      felony_unknown_co: '2015-07-15',   // 11 years — irrelevant, the period is null
    },
    expect: {
      resultKey: 'complex_felony_period_co',
      reading:
        'The package wants a check-record answer at 11 years, past the 10-year automatic period. It '
        + 'lands on the felony-period conflict instead, because the tree cannot compute a period its '
        + 'sources disagree on (3 vs 5 years) and the null period has only one route. The result is '
        + 'still useful — it says the offence IS sealable, tells them to check with CBI since 11 '
        + 'years is past the automatic mark, and names the conflict. But it is not the clean '
        + '"already sealed, go check" the package asks for. Flagged approximate: resolving § 706 '
        + 'lets the felony path split properly into check-record vs petition-faster.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 1 — CO persona 2',
    package: 'class 2 misdemeanor, 3 yrs clean → eligible-petition.',
    record: { title: 'Class 2 Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: {
      excluded_co: false,
      intervening_co: false,
      level_co: 'misd_23',
      date_2_co: '2023-07-15',        // 3 yrs — past the 2-yr petition period
      date_2_auto_co: '2023-07-15',   // but short of the 7-yr automatic one
    },
    expect: {
      resultKey: 'eligible_petition_faster_co',
      reading:
        'Past the 2-year petition threshold, four years short of the 7-year automatic one. So the '
        + 'honest answer is the inversion: filing now beats waiting by four years. The package says '
        + '"eligible-petition", which is what this is — the result just also explains WHY petitioning '
        + 'rather than waiting. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — CO persona 3',
    package: 'DUI → ineligible.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: true },
    expect: {
      resultKey: 'ineligible_serious_co',
      reading:
        'DUI and DWAI are on Colorado\'s § 706(2) exclusion list — never sealable, however long ago. '
        + 'The result calls it out as the one that surprises people most, and points at a pardon as '
        + 'the separate path the exclusions do not govern. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — CO persona 4',
    package: 'DV misdemeanor → ineligible.',
    record: { title: 'Domestic Violence Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: true },
    expect: { resultKey: 'ineligible_serious_co', reading: 'Domestic violence is on the § 706(2) exclusion list regardless of classification. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 1 — CO persona 5',
    package: 'dismissed case 2023 → simplified/auto path.',
    record: { title: 'Dismissed Case', disposition: 'dismissed', disposition_date: '2023-06-01' },
    expect: {
      resultKey: 'eligible_nonconviction_co',
      reading:
        'Dismissals seal through the simplified in-case process with no waiting period, and HB24-1133 '
        + 'expanded the automation from 2025 — so it may already be done. The result leads with '
        + 'checking CBI and notes that sealing a record which should have auto-sealed is free. Exact.',
    },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const CT: Persona[] = [
  {
    source: 'Wave 2 — CT persona 1',
    package: 'misdemeanor 2016, no convictions since -> likely erased (7 yr, post-Oct-2025 rollout) -> check-record.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conviction_era_ct: true, excluded_ct: false, offense_class_ct: 'misdemeanor', auto_date_misd_ct: '2016-06-01' },
    expect: { resultKey: 'check_record_first_ct', reading: 'Post-2000 misdemeanour, most-recent-conviction 2016, 7yr period met by 2023. Rollout resumed Oct 2025 so it leads with checking. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — CT persona 2',
    package: 'class D felony 2018 -> waiting (10 yr -> 2028).',
    record: { title: 'Class D Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { conviction_era_ct: true, excluded_ct: false, offense_class_ct: 'felony', felony_class_ct: 'low', auto_date_felony_ct: '2018-01-01' },
    expect: { resultKey: 'waiting_ct', reading: 'Low felony, 10yr from most recent conviction, 2018 + 10 = 2028 > 2026 -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — CT persona 3',
    package: 'class B felony 2010 -> pardon path (apply-eligible since 2015).',
    record: { title: 'Class B Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { conviction_era_ct: true, excluded_ct: false, offense_class_ct: 'felony', felony_class_ct: 'high' },
    expect: { resultKey: 'pardon_path_ct', reading: 'Class B felony is above the automatic threshold -> CT pardon path, which is full erasure. Encoded as a path, not ineligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — CT persona 4',
    package: 'misdemeanor 2014 + NEW misdemeanor 2023 -> clock reset to 2030 (most-recent-conviction trigger!).',
    record: { title: 'Misdemeanor (older)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conviction_era_ct: true, excluded_ct: false, offense_class_ct: 'misdemeanor', auto_date_misd_ct: '2023-01-01' },
    expect: { resultKey: 'waiting_ct', reading: 'THE CLOCK QUIRK. The wait runs from the MOST RECENT conviction (2023), not the 2014 offence, so 2023 + 7 = 2030 -> waiting. The persona enters 2023 as the most-recent date; the tree gets it right. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — CT persona 5',
    package: 'family violence misdemeanor -> excluded from automatic -> pardon path.',
    record: { title: 'Family Violence Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conviction_era_ct: true, excluded_ct: true },
    expect: { resultKey: 'pardon_path_ct', reading: 'Family violence is on the exclusion list -> routed to the pardon path (full erasure), not to ineligible. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const DE: Persona[] = [
  {
    source: 'Wave 2 — DE persona 1',
    package: 'dismissed case 2024, has an old felony -> mandatory-immediate (favorable termination works despite other record).',
    record: { title: 'Dismissed Case', disposition: 'dismissed', disposition_date: '2024-01-01' },
    expect: { resultKey: 'eligible_favorable_de', reading: 'Favourable termination is mandatory-immediate REGARDLESS of other record - the strong DE rule. Routes straight from dismissed. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — DE persona 2',
    package: 'single misdemeanor 2019, nothing else ever -> mandatory (5 yr met) / may already be auto-expunged -> check.',
    record: { title: 'Single Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { excluded_de: false, marijuana_de: false, other_convictions_de: false, offense_level_de: 'misdemeanor', mandatory_misd_date_de: '2019-01-01' },
    expect: { resultKey: 'check_record_first_de', reading: 'No other convictions, misdemeanour, 5yr met (2019+5=2024<2026). Automatic since Aug 2024 -> check-record. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — DE persona 3',
    package: 'misdemeanor 2019 + violation 2022 (two cases) -> discretionary 5-yr multiple-case path -> waiting until 2027.',
    record: { title: 'Misdemeanor (one of two cases)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { excluded_de: false, marijuana_de: false, other_convictions_de: true, has_record_de: 'misd_multi', discretionary_multi_date_de: '2022-01-01' },
    expect: { resultKey: 'waiting_de', reading: 'Two cases -> discretionary 5yr from most recent (2022). 2022+5=2027>2026 -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — DE persona 4',
    package: 'DUI -> ineligible (Title 21) -> pardon path only.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_de: true, excluded_path_de: true },
    expect: { resultKey: 'ineligible_title21_de', reading: 'DUI is a Title 21 motor-vehicle offence -> mostly ineligible, pardon/narrow-exception noted. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — DE persona 5',
    package: 'listed felony 2013, clean since -> mandatory 10-yr path -> verify felony is on the § 4373 list.',
    record: { title: 'Listed Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01' },
    answers: { excluded_de: false, marijuana_de: false, other_convictions_de: false, offense_level_de: 'felony', mandatory_felony_date_de: '2013-01-01' },
    expect: { resultKey: 'eligible_felony_list_de', reading: 'Felony, no other convictions, 10yr met (2013+10=2023<2026). The result flags that § 4373 list membership needs confirming (the source cut off). Exact for the routing; the list is the open question.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const OK: Persona[] = [
  {
    source: 'Wave 2 — OK persona 1',
    package: 'misdemeanor deferred, dismissed 2023 -> eligible-now (1 yr) + 991(c).',
    record: { title: 'Deferred Misdemeanor', charge_type: 'misdemeanor', disposition: 'deferred', disposition_date: '2023-01-01' },
    expect: { resultKey: 'eligible_deferred_ok', reading: 'Deferred, dismissed 2023, 1yr met. Result pairs 991(c) disposition cleanup with 18 arrest sealing. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — OK persona 2',
    package: 'fine-only misdemeanor $400, paid -> eligible-immediate.',
    record: { title: 'Fine-Only Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { felony_or_misd_ok: 'misdemeanor', misd_sentence_ok: 'fine_only' },
    expect: { resultKey: 'eligible_fine_only_ok', reading: 'Fine-only under $501, paid -> immediate § 18. Current-law threshold (HB 3037 not assumed passed). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — OK persona 3',
    package: 'single nonviolent felony done 2019 -> eligible (5 yr).',
    record: { title: 'Nonviolent Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { felony_or_misd_ok: 'felony', felony_violent_ok: false, felony_count_ok: 'one', felony_one_date_ok: '2019-01-01' },
    expect: { resultKey: 'eligible_felony_ok', reading: 'One nonviolent felony, 5yr from completion (2019+5=2024<2026) -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — OK persona 4',
    package: 'two nonviolent felonies, last done 2020 -> waiting (10 yr -> 2030).',
    record: { title: 'Second Nonviolent Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { felony_or_misd_ok: 'felony', felony_violent_ok: false, felony_count_ok: 'two', felony_two_date_ok: '2020-01-01' },
    expect: { resultKey: 'waiting_ok', reading: 'Two nonviolent felonies, 10yr from most recent completion (2020+10=2030>2026) -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — OK persona 5',
    package: 'OK misdemeanor + old California arrest -> petition-eligible but NOT single-source -> automatic path blocked, petition path open.',
    record: { title: 'Dismissed Misdemeanor', disposition: 'dismissed' },
    answers: { single_source_ok: true },
    expect: { resultKey: 'eligible_dismissal_petition_ok', reading: 'THE SINGLE-SOURCE RULE. An out-of-state (CA) record blocks the AUTOMATIC path (SB 1770) but not the petition path. The result says exactly that. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const VA: Persona[] = [
  {
    source: 'Wave 2 — VA persona 1',
    package: 'petit larceny misdemeanor 2017, clean since -> automatic-eligible NOW (7 yr) -> check-record/status.',
    record: { title: 'Petit Larceny', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'auto_misd', auto_date_va: '2017-01-01' },
    expect: { resultKey: 'check_record_first_va', reading: 'Petit larceny is on the automatic list, 7yr met (2017+7=2024<2026). Result leads with checking VSP because the law is weeks old. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — VA persona 2',
    package: 'Class 6 felony 2014, released 2015, clean -> eligible to petition (10 yr clean met).',
    record: { title: 'Class 6 Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'low_felony', felony_history_va: 'clear', felony_date_va: '2015-01-01' },
    expect: { resultKey: 'eligible_petition_felony_va', reading: 'Class 6 felony, clean felony history, 10yr from release (2015+10=2025<2026) -> eligible to petition. The remedy did not exist before July 2026. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — VA persona 3',
    package: 'DUI misdemeanor -> ineligible for sealing.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { offense_1986_va: true, excluded_va: true },
    expect: { resultKey: 'ineligible_excluded_va', reading: 'DUI is on the exclusion list -> ineligible for sealing. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — VA persona 4',
    package: 'felony charge acquitted last month -> sealable at conclusion w/ CA concurrence, else old-regime expungement petition.',
    record: { title: 'Acquitted Felony Charge', charge_type: 'felony', disposition: 'acquitted' },
    expect: { resultKey: 'nonconviction_va', reading: 'Acquittal (non-conviction) -> the result explains felony non-conviction needs CA concurrence at conclusion, else the old expungement petition. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — VA persona 5',
    package: 'grand larceny 2010 + Class 4 felony 2012 -> the Class 4 within 20 yrs blocks -> not eligible until 2032.',
    record: { title: 'Grand Larceny', charge_type: 'felony', disposition: 'convicted' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'low_felony', felony_history_va: 'blocked' },
    expect: { resultKey: 'ineligible_felony_history_va', reading: 'Grand larceny is petition-eligible in principle, but the Class 4 felony (2012) within the 20-year window fails the felony-history gate. The persona answers "blocked". Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MN: Persona[] = [
  {
    source: 'Wave 2 — MN persona 1',
    package: 'misdemeanor theft, discharged 2021, clean -> likely already auto-expunged -> check-record.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-01-01' },
    answers: { registration_mn: false, excluded_mn: false, level_mn: 'misd', misd_date_mn: '2021-01-01' },
    expect: { resultKey: 'check_record_first_mn', reading: 'Misdemeanour, 2yr from discharge (2021+2=2023<2026). ~94% done by spring 2026 -> the strongest check-record copy. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — MN persona 2',
    package: 'gross misdemeanor discharged 2024 -> waiting (2027).',
    record: { title: 'Gross Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { registration_mn: false, excluded_mn: false, level_mn: 'gross', gross_date_mn: '2024-01-01' },
    expect: { resultKey: 'waiting_mn', reading: 'Gross misdemeanour, 3yr from discharge (2024+3=2027>2026) -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — MN persona 3',
    package: '5th-degree drug felony discharged 2023 -> waiting (2027, 4-yr).',
    record: { title: '5th-Degree Drug Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { registration_mn: false, excluded_mn: false, level_mn: 'drug5', drug5_date_mn: '2023-01-01' },
    expect: { resultKey: 'waiting_mn', reading: '5th-degree drug felony, 4yr from discharge (2023+4=2027>2026) -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 2 — MN persona 4',
    package: 'DWI misdemeanor -> excluded from automatic -> verify whether excluded from petition too -> likely "not eligible / legal aid".',
    record: { title: 'DWI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { registration_mn: false, excluded_mn: true },
    expect: {
      resultKey: 'complex_excluded_mn',
      reading:
        'DWI is out of the automatic path; whether the petition path reaches it is exactly what Wave 2 '
        + 'flags as unverified. The tree routes to a hedge that says automatic is out, petition being '
        + 'confirmed, consult legal aid - rather than guessing eligible or ineligible. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 2 — MN persona 5',
    package: 'eligible-list felony discharged 2020, new misdemeanor 2023 -> clock broken -> recompute from 2023 discharge.',
    record: { title: 'Eligible-List Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { registration_mn: false, excluded_mn: false, level_mn: 'felony', felony_eligible_mn: true, felony_date_mn: '2023-01-01' },
    expect: {
      resultKey: 'waiting_mn',
      reading:
        'THE CLOCK-BREAK QUIRK, and it resolves cleanly. A new non-petty offence resets the 5-year '
        + 'eligible-felony clock to the newer discharge (2023). 2023 + 5 = 2028, and it is 2026, so '
        + 'the honest answer is WAITING — which is exactly what the tree returns once the recomputed '
        + '2023 date is used. My first reading guessed check-record; the tree was right and I was '
        + 'wrong, which is the fixture working. Exact.',
    },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const FL: Persona[] = [
  {
    source: 'Wave 3 - FL persona 1',
    package: 'charge dropped 2020, no other record -> expunction path.',
    record: { title: 'Dropped Charge', disposition: 'dismissed', disposition_date: '2020-01-01', restitution_paid: true },
    answers: { prior_relief_fl: false, prior_adjudication_fl: false },
    expect: { resultKey: 'eligible_expunction_fl', reading: 'No prior FL relief, no adjudication anywhere, dismissed -> expunction path. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - FL persona 2',
    package: 'withheld adjudication, grand theft, sentence done, clean -> sealing path.',
    record: { title: 'Grand Theft (adjudication withheld)', disposition: 'convicted', restitution_paid: true },
    answers: { prior_relief_fl: false, prior_adjudication_fl: false, disqualified_offense_fl: 'none', sentence_complete_fl: true },
    expect: { resultKey: 'eligible_sealing_fl', reading: 'Withheld adjudication, not disqualified, sentence complete -> sealing. The prior_adjudication gate says no because THIS is a withhold, not a conviction. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - FL persona 3',
    package: 'adjudicated misdemeanor 2010 -> ineligible (conviction bar) - the honest-no persona.',
    record: { title: 'Adjudicated Misdemeanor', disposition: 'convicted' },
    answers: { prior_relief_fl: false, prior_adjudication_fl: true, selfdefense_conviction_fl: false },
    expect: { resultKey: 'ineligible_conviction_fl', reading: 'Any adjudication of guilt on the FL record bars the certificate. The conviction bar now routes through the § 943.0578 self-defense gate first (answered no) before landing on the honest-no. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - FL persona 4',
    package: 'sealed a case in 2015 -> ineligible (lifetime rule).',
    record: { title: 'Prior Case', disposition: 'dismissed' },
    answers: { prior_relief_fl: true, selfdefense_lifetime_fl: false },
    expect: { resultKey: 'ineligible_lifetime_fl', reading: 'Prior FL seal/expunge -> once-per-lifetime bar, asked first. The bar now routes through the § 943.0578 self-defense gate first (answered no). Notes the out-of-state exception (no more "since 2013"). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - FL persona 5',
    package: 'withheld adjudication, DV battery -> ineligible (disqualified offense despite withhold).',
    record: { title: 'DV Battery (adjudication withheld)', disposition: 'convicted' },
    answers: { prior_relief_fl: false, prior_adjudication_fl: false, disqualified_offense_fl: 'dv' },
    expect: { resultKey: 'ineligible_disqualified_fl', reading: 'DV battery is on the 943.0584 list - not sealable even with adjudication withheld. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const IL: Persona[] = [
  {
    source: 'Wave 3 - IL persona 1',
    package: 'misdemeanor theft, sentence done 2023 -> eligible NOW under the 2-yr change (was 3!) - the fresh-law persona.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { sealable_il: false, seal_level_il: 'misdemeanor' },
    expect: { resultKey: 'eligible_sealing_il', reading: 'Misdemeanour, 2yr wait (cut from 3 June 2026), 2023+2=2025<2026 -> eligible. Under the OLD 3yr rule it would not be until 2026. Exact - the fresh-law persona.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - IL persona 2',
    package: 'Class 4 felony possession, done 2021 -> eligible-sealing.',
    record: { title: 'Class 4 Felony Possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2021-01-01' },
    answers: { sealable_il: false, seal_level_il: 'felony', felony_prob_il: true },
    expect: { resultKey: 'eligible_sealing_il', reading: 'Class 4 possession completed on probation -> 2yr wait under the amended (c)(2)(D) ladder; 2021+2=2023<2026 -> eligible. (The prior-felony bar was repealed, so felony_prob now sets the wait.)' },
    now: NOW,
  },
  {
    source: 'Wave 3 - IL persona 3',
    package: 'DUI -> never sealable.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { sealable_il: true },
    expect: { resultKey: 'ineligible_excluded_il', reading: 'DUI is absolutely excluded from sealing in IL. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - IL persona 4',
    package: 'supervision completed 2023 -> expungement 2025+.',
    record: { title: 'Court Supervision', disposition: 'deferred', disposition_date: '2023-01-01' },
    answers: { supervision_type_il: false, supervision_5yr_list_il: false },
    expect: { resultKey: 'eligible_expungement_il', reading: 'Ordinary court supervision, not on the 5-year list, so the (b)(2)(B)(ii) 2yr wait; 2023+2=2025<2026 -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - IL persona 5 (referee item RESOLVED, Diana statute verification P.A. 104-459, 7/16)',
    package: 'old felony + new felony -> post-June-30 rules resolve during verification. [RESOLVED: (c)(4) is Blank — a prior felony no longer bars sealing a later one.]',
    record: { title: 'Felony (with a prior felony), incarceration', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-06-01' },
    answers: { sealable_il: false, seal_level_il: 'felony', felony_prob_il: false },
    expect: { resultKey: 'eligible_sealing_il', reading: 'The former referee fight, resolved: P.A. 104-459 blanked (c)(4), so a prior felony no longer bars sealing a later one. Felony-plus-felony now routes to the normal path — an incarceration felony at the 3yr wait (2019+3=2022<2026) -> eligible (the court may weigh history on objection under (d)(7)). Locks the resolution.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const OH: Persona[] = [
  {
    source: 'Wave 3 - OH persona 1',
    package: 'M1 theft, final discharge 2024 -> eligible-sealing 2025 -> likely eligible now.',
    record: { title: 'M1 Theft', disposition: 'convicted', disposition_date: '2024-01-01', restitution_paid: true },
    answers: { pardon_oh: false, marijuana_oh: false, excluded_oh: 'none', level_oh: 'misd' },
    expect: { resultKey: 'eligible_sealing_oh', reading: 'Misdemeanour, 1yr from final discharge, 2024+1=2025<2026 -> eligible to seal. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - OH persona 2',
    package: 'F5 drug possession, discharged 2023 -> sealing-eligible 2024; expungement ~2034.',
    record: { title: 'F5 Drug Possession', disposition: 'convicted', disposition_date: '2023-01-01', restitution_paid: true },
    answers: { pardon_oh: false, marijuana_oh: false, excluded_oh: 'none', level_oh: 'f45' },
    expect: { resultKey: 'eligible_sealing_oh', reading: 'F5, 1yr from final discharge, 2023+1=2024<2026 -> eligible to seal. Result notes expungement is the ~10yr-later upgrade. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - OH persona 3',
    package: 'F2 -> never; CQE path.',
    record: { title: 'F2', disposition: 'convicted' },
    answers: { pardon_oh: false, marijuana_oh: false, excluded_oh: 'none', level_oh: 'f12' },
    expect: { resultKey: 'ineligible_f12_oh', reading: 'F1/F2 never sealable -> CQE named as the door. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - OH persona 4',
    package: 'OVI -> never; honest-no.',
    record: { title: 'OVI', disposition: 'convicted' },
    answers: { pardon_oh: false, marijuana_oh: false, excluded_oh: 'traffic' },
    expect: { resultKey: 'ineligible_traffic_oh', reading: 'OVI/traffic never sealable in OH -> honest-no with CQE. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - OH persona 5',
    package: 'F3 + one other felony -> blocked (count rule) - verify against bench card.',
    record: { title: 'F3 (with one other felony)', disposition: 'convicted', restitution_paid: true },
    answers: { pardon_oh: false, marijuana_oh: false, excluded_oh: 'none', level_oh: 'f3', f3_count_oh: 'ok' },
    expect: { resultKey: 'eligible_sealing_oh', reading: 'RESOLVED (Diana, 7/16): R.C. 2953.32(A)(1)(h) blocks an F3 only where the person has MORE THAN ONE other felony; F3 + one other felony is the "ok" bucket -> eligible to seal (base 2019 + 3yr = 2022 < 2026). Was expectIsApproximate; now exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const GA: Persona[] = [
  {
    source: 'Wave 3 - GA persona 1',
    package: 'arrest 2019, charges dismissed -> should be auto-restricted -> check-GCIC path.',
    record: { title: 'Dismissed Arrest', disposition: 'dismissed' },
    answers: { arrest_era_ga: true },
    expect: { resultKey: 'eligible_auto_restrict_ga', reading: 'Post-2013 non-conviction -> should be auto-restricted; result says check the GCIC report because of reporting gaps. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - GA persona 2',
    package: 'two misdemeanor shoplifting convictions, done 2020, clean -> eligible to petition for both (lifetime max reached after).',
    record: { title: 'Misdemeanor Shoplifting', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { trafficking_check_ga: false, conviction_level_ga: 'misdemeanor', misd_excluded_ga: 'shoplifting_refund' },
    expect: { resultKey: 'eligible_misd_restrict_ga', reading: 'Theft (Title 16 Ch. 8) is on the (j)(4)(B) exclusion list, BUT misdemeanor shoplifting and refund fraud are carved back in -> the choice node\'s shoplifting_refund option routes to the eligible path; 4yr from completion (2020+4=2024<2026) -> eligible. Result notes the 2-per-lifetime cap. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - GA persona 3',
    package: 'DUI misdemeanor -> excluded.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { trafficking_check_ga: false, conviction_level_ga: 'misdemeanor', misd_excluded_ga: 'excluded' },
    expect: { resultKey: 'ineligible_excluded_ga', reading: 'DUI is excluded as a "serious traffic offense": the chain is § 35-3-37(j)(4)(B)(xviii) -> Title 40 Ch. 6 Art. 15 -> § 40-6-391 (NOT § 42-8-60(j)(10), which only bars DUI from First Offender sentencing). The choice node\'s "excluded" option routes here. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - GA persona 4',
    package: 'nonviolent felony 2012, clean since -> pardon path (Board of Pardons), then petition.',
    record: { title: 'Nonviolent Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-01-01' },
    answers: { trafficking_check_ga: false, conviction_level_ga: 'felony' },
    expect: { resultKey: 'pardon_path_ga', reading: 'Felony -> pardon path (encoded as a path, not ineligible). Also names retroactive First Offender. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - GA persona 5',
    package: 'arrest 2010, dismissed -> pre-2013 -> apply to arresting agency.',
    record: { title: 'Pre-2013 Dismissed Arrest', disposition: 'dismissed' },
    answers: { arrest_era_ga: false },
    expect: { resultKey: 'eligible_pre2013_ga', reading: 'Pre-July-2013 non-conviction -> not automatic; apply to the arresting agency. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - GA First Offender completed',
    package: 'First Offender sentence completed and discharged -> exonerated by law (§ 42-8-60(e)); NOT the same as restriction (State v. C.S.B.).',
    record: { title: 'First Offender — completed & discharged', disposition: 'deferred' },
    answers: { fo_outcome_ga: 'completed' },
    expect: { resultKey: 'fo_completed_ga', reading: 'Completed FO discharge -> fo_completed_ga (eligible): automatic exoneration under § 42-8-60(e), but the result carries the exoneration-is-not-restriction nuance (C.S.B.), the § 42-8-60(i) exceptions, and the § 42-8-62 30-day GCIC transmission check. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - GA First Offender revoked',
    package: 'First Offender revoked / adjudicated guilty on a felony -> ordinary conviction tree (§ 42-8-60(d)) -> pardon-first.',
    record: { title: 'First Offender revoked (felony)', charge_type: 'felony', disposition: 'deferred' },
    answers: { fo_outcome_ga: 'revoked', conviction_level_ga: 'felony' },
    expect: { resultKey: 'pardon_path_ga', reading: 'A revoked FO becomes an ordinary conviction (§ 42-8-60(d)); fo_outcome_ga routes "revoked" back into conviction_level_ga, and a felony lands on the pardon path. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - GA retroactive First Offender',
    package: 'Eligible for First Offender at sentencing but never told -> retroactive petition (§ 42-8-66), gated on prosecutor consent (Sumrall/Ballard).',
    record: { title: 'Old case, never offered First Offender', disposition: 'deferred' },
    answers: { fo_outcome_ga: 'retroactive' },
    expect: { resultKey: 'fo_retroactive_ga', reading: 'Never-told / 1968-1982 window -> fo_retroactive_ga (complex): § 42-8-66 petition, no fee, but prosecutor consent is a threshold (Sumrall 2024, Ballard 2025), then preponderance under (d). Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - GA trafficking survivor',
    package: 'Conviction for an offense committed while a victim of trafficking -> § 35-3-37(j)(6)-(7) survivor track (HB 1201).',
    record: { title: 'Offense committed while trafficked', disposition: 'convicted' },
    answers: { trafficking_check_ga: true },
    expect: { resultKey: 'trafficking_survivor_ga', reading: 'The trafficking gate on the conviction path routes yes -> trafficking_survivor_ga (complex): sealed petition to the sentencing court, AG form, no fee, 30-day prosecutor non-response = restriction without hearing. An answers-driven node — trafficking is never a disposition value. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const NC: Persona[] = [
  {
    source: 'Wave 3 - NC persona 1',
    package: 'one nonviolent misdemeanor, done 2022 -> eligible NOW under the 3-yr change (was ineligible until 2027 under old guides!) - the fresh-law persona.',
    record: { title: 'Nonviolent Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { nonviolent_nc: false, conviction_count_nc: 'one_misd', misd_date_nc: '2022-01-01' },
    expect: { resultKey: 'eligible_conviction_nc', reading: 'One nonviolent misdemeanour, 3yr wait (cut from 5 in July 2025), 2022+3=2025<2026 -> eligible. Old 5yr guides would say ineligible until 2027. Exact - the fresh-law persona.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - NC persona 2',
    package: 'dismissal in 2023 -> should be auto-expunged -> check-record.',
    record: { title: 'Dismissed Case', disposition: 'dismissed', disposition_date: '2023-01-01' },
    expect: { resultKey: 'nonconviction_nc', reading: 'Dismissal post-Dec-2021 -> auto-expunction ~180-210 days (resumed July 2024); result says check, and flags plea-agreement dismissals as non-automatic. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - NC persona 3',
    package: 'DWI -> never.',
    record: { title: 'DWI', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { nonviolent_nc: true },
    expect: { resultKey: 'ineligible_excluded_nc', reading: 'DWI is excluded from the "nonviolent" definition -> ineligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - NC persona 4',
    package: 'one Class H felony, done 2014 -> eligible (10 yr).',
    record: { title: 'Class H Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { nonviolent_nc: false, conviction_count_nc: 'one_felony', felony_be_nc: false, felony_one_date_nc: '2014-01-01' },
    expect: { resultKey: 'eligible_conviction_nc', reading: 'One nonviolent felony (Class H is not A-G? - NC nonviolent felony expunction reaches H/I; the persona treats it as eligible), 10yr, 2014+10=2024<2026 -> eligible. Not B&E so 10 not 15. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 3 - NC persona 5',
    package: 'two nonviolent felonies from 2004 and 2009 -> committed >24 months apart -> NOT eligible for multi-felony expunction - the trap persona.',
    record: { title: 'Two Nonviolent Felonies', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { nonviolent_nc: false, conviction_count_nc: 'multi_felony', felony_window_nc: false },
    expect: { resultKey: 'ineligible_felony_window_nc', reading: 'THE TRAP. 2004 and 2009 are >24 months apart, so the multiple-felony route is closed however long ago - it is about WHEN they were committed, not elapsed time. The window node answers no. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NC deferred prosecution',
    package: 'completed deferred prosecution -> dismissal petitionable under 146(d) (the $175 non-conviction petition), not a legal-aid hedge.',
    record: { title: 'Deferred Prosecution (dismissed)', disposition: 'deferred', disposition_date: '2023-01-01' },
    expect: { resultKey: 'eligible_deferred_nc', reading: '146(d) confirms deferred-prosecution / conditional-discharge dismissals are petitionable under § 15A-146 with a $175 fee (indigent exempt); no wait. Upgraded from the old unknown_deferred hedge to a real eligible path, with the honest caveat that whether (a4) automatic also reaches it is unstated. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - NC felony plea-agreement dismissal',
    package: 'charge dismissed Dec-2021+ as part of a FELONY plea agreement -> the (a4) automatic path is knocked out for the whole case; petition route remains.',
    record: { title: 'Dismissed via felony plea agreement', disposition: 'dismissed', disposition_date: '2022-06-01' },
    expect: { resultKey: 'nonconviction_nc', reading: 'Routes to the non-conviction result, whose copy now carries the § 15A-146(a4) felony-plea-agreement exception: a case with a felony charge dismissed per plea agreement is NOT auto-expunged (whole case), but the § 15A-146 petition remains. The tree does not branch on plea-agreement (a copy nuance), so it lands on nonconviction_nc. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const WA: Persona[] = [
  {
    source: 'Wave 4 - WA persona 1',
    package: 'misdemeanor theft, sentenced 2020, LFOs still owed -> eligible NOW under 2024 rule (old guides say no) - fresh-rule persona.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: false },
    answers: { excluded_wa: false, violent_wa: false, level_wa: 'misdemeanor', dv_wa: false, misd_date_wa: '2020-01-01' },
    expect: { resultKey: 'eligible_vacate_wa', reading: 'Misdemeanour, 3yr from sentencing (2020+3=2023<2026), no new convictions. Restitution unpaid but 2024 rule says LFOs do NOT delay the clock - date node is asked, not restitution-gated. Old guides would say wait. Exact - fresh-rule persona.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - WA persona 2',
    package: 'Class C felony possession, discharged 2019, clean -> eligible.',
    record: { title: 'Class C Felony Possession', charge_type: 'felony', disposition: 'convicted' },
    answers: { excluded_wa: false, violent_wa: false, level_wa: 'felony', felony_class_wa: 'c', felony_c_date_wa: '2019-01-01' },
    expect: { resultKey: 'eligible_vacate_felony_wa', reading: 'Class C, 5yr from Certificate of Discharge (2019+5=2024<2026) -> eligible to vacate. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - WA persona 3',
    package: 'Class B felony 2018 -> 2028.',
    record: { title: 'Class B Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { excluded_wa: false, violent_wa: false, level_wa: 'felony', felony_class_wa: 'b', felony_b_date_wa: '2018-01-01' },
    expect: { resultKey: 'waiting_wa', reading: 'Class B, 10yr from discharge (2018+10=2028>2026) -> waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - WA persona 4',
    package: 'DUI -> never; honest-no.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_wa: true },
    expect: { resultKey: 'ineligible_excluded_wa', reading: 'DUI never vacatable in WA -> honest-no. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - WA persona 5',
    package: 'Assault 2, no enhancement, discharged 2015 -> eligible under the 2019 carve-out - the surprise-yes persona.',
    record: { title: 'Assault 2 (no enhancement)', charge_type: 'felony', disposition: 'convicted' },
    answers: { excluded_wa: false, violent_wa: true, violent_carveout_wa: true, level_wa: 'felony', felony_class_wa: 'c', felony_c_date_wa: '2015-01-01' },
    expect: { resultKey: 'eligible_vacate_felony_wa', reading: 'Assault 2 is violent, but the 2019 carve-out (no firearm/weapon/sexual-motivation enhancement) makes it vacatable. Class C, 5yr from discharge (2015+5=2020<2026). The surprise-yes. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const TN: Persona[] = [
  {
    source: 'Wave 4 - TN persona 1 (updated)',
    package: 'single eligible misdemeanor, sentence done 2019, all paid, no priors -> eligible, TBI cert step.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false, sequencing_tn: false, other_eligible_tn: false },
    expect: { resultKey: 'eligible_conviction_tn', reading: 'Single eligible misdemeanour (not on the 107(a)(1)(D) exclusion list), all obligations paid, 5yr met (2019+5=2024<2026), no prior expunction, no ineligible prior, no second eligible conviction -> eligible. Copy leads with the TBI Certificate of Eligibility (102(c)) and the 108 procedure/presumption. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN domestic assault (regression-lock)',
    package: 'domestic assault misdemeanor, otherwise clean -> INELIGIBLE (would false-eligible under the draft).',
    record: { title: 'Domestic Assault (misdemeanor)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: true },
    expect: { resultKey: 'ineligible_excluded_tn', reading: 'TOP-PRIORITY FIX: domestic assault (39-13-111) is on the 107(a)(1)(D) misdemeanor exclusion list -> ineligible. The old four-category excluded_tn boolean would have passed this through as eligible. Regression-locked. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN Class D theft on the list',
    package: 'Class D theft (39-14-103), sentence done 2013, paid -> eligible on the enumerated (a)(1)(B) list, 10yr.',
    record: { title: 'Class D Theft (39-14-103)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'cd', felony_cd_list_tn: true, sequencing_tn: false, other_eligible_tn: false },
    expect: { resultKey: 'eligible_conviction_tn', reading: 'Felony eligibility is now an INCLUSION list: a Class D theft is ON the 107(a)(1)(B) list -> pass; 10yr met (2013+10=2023<2026), paid, clean sequence -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN Class C felony NOT on list',
    package: 'Class C felony not on the (a)(1)(A) inclusion list -> ineligible.',
    record: { title: 'Class C felony (not listed)', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'cd', felony_cd_list_tn: false },
    expect: { resultKey: 'ineligible_notlisted_tn', reading: 'Felony logic inverted: not being ON the enumerated (a)(1)(A) list means ineligible, even if it "feels" minor. Routes to ineligible_notlisted_tn. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN DUI',
    package: 'DUI -> never expungeable.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'dui' },
    expect: { resultKey: 'ineligible_dui_tn', reading: 'DUI is never expungeable (107(a)(1)(D)(xlv)); dedicated result notes the non-conviction and 107(e)-later-offense nuances without clearing the DUI itself. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN CDL + drug in motor vehicle',
    package: 'controlled-substance offense in a motor vehicle while holding a CDL -> ineligible (107(a)(2)).',
    record: { title: 'Drug offense (CDL, in a CMV)', charge_type: 'felony', disposition: 'convicted' },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: true },
    expect: { resultKey: 'ineligible_cdl_tn', reading: 'CDL/CMV controlled-substance bar (107(a)(2)) -> ineligible, mirroring the MI CDL implementation. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN prior expunction used',
    package: 'a prior conviction expunction was already granted -> ineligible on the single path (107(a)(3)(A)(ii)).',
    record: { title: 'Eligible misdemeanor (prior expunction used)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { prior_expunction_tn: true },
    expect: { resultKey: 'ineligible_prior_tn', reading: 'Once-per-lifetime applies to the single-conviction path too (107(a)(3)(A)(ii)) — the prior-expunction gate sits ahead of all conviction tracks. A non-conviction would still qualify. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN same-episode partial conviction',
    package: 'non-convicted charge, but convicted of another charge from the same incident -> destruction barred, database removal available (106(c)(2)).',
    record: { title: 'Dismissed charge (same episode as a conviction)', disposition: 'dismissed' },
    answers: { noncon_ngri_tn: false, noncon_episode_tn: true },
    expect: { resultKey: 'same_episode_tn', reading: 'Same-episode trap SOFTENED: 106(b)(4) bars destruction, but 106(c)(2) entitles the person to removal of the non-convicted charges from NCIC/state/court-clerk databases. Result carries the database-removal note (and the 106(c)(1) trafficking exception). Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN completed judicial diversion (non-sex)',
    package: 'completed judicial diversion, non-sexual offense -> eligible to petition (106(d)), fee + TBI cert.',
    record: { title: 'Completed judicial diversion', disposition: 'deferred' },
    answers: { diversion_sex_tn: false },
    expect: { resultKey: 'eligible_diversion_tn', reading: 'Diversion branch (resolves the old unknown_deferred hedge): successful pretrial (40-15-105) or judicial (40-35-313) completion -> petition under 106(d); clerk fee applies (106(d)(3)) and the TBI certificate IS required for diversion-based expunctions (102(c)(1)). Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN diverted sexual offense',
    package: 'diverted SEXUAL offense (40-39-202) -> ineligible for expunction (106(d)(2) / 40-35-313(b)).',
    record: { title: 'Diverted sexual offense', disposition: 'deferred' },
    answers: { diversion_sex_tn: true },
    expect: { resultKey: 'ineligible_diversion_sex_tn', reading: 'A diverted sexual/violent-sexual offense per 40-39-202 is barred from expunction for both pretrial (106(d)(2)) and judicial (40-35-313(b)) diversions. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN acquittal',
    package: 'acquitted -> free, immediate, judge-inquiry expunction (106(e)(2)).',
    record: { title: 'Acquitted Charge', disposition: 'acquitted' },
    answers: { noncon_ngri_tn: false, noncon_episode_tn: false },
    expect: { resultKey: 'eligible_nonconviction_tn', reading: 'Acquittal -> free non-conviction expunction; result copy now carries the 106(e)(2) fast path (the judge must ask at the not-guilty verdict and can order it on the spot with no petition), plus the mistaken-identity (106(a)(1)(H)), order-of-protection (106(a)(2)(A)), and arrest-no-court (109) notes. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN unpaid restitution',
    package: 'eligible misdemeanor but restitution unpaid -> waiting (clock not started, 107(a)(3)(C)).',
    record: { title: 'Eligible misdemeanor (restitution unpaid)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-01-01', restitution_paid: false },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false },
    expect: { resultKey: 'waiting_tn', reading: 'The clock does not start until the sentence is complete AND all obligations are paid (107(a)(3)(C)); the restitution gate reads restitution_paid=false -> waiting_tn even though 2016 is 10 years back. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - TN NGRI',
    package: 'not guilty by reason of insanity -> ineligible (106(b)(3)).',
    record: { title: 'NGRI verdict', disposition: 'acquitted' },
    answers: { noncon_ngri_tn: true },
    expect: { resultKey: 'ineligible_ngri_tn', reading: 'NGRI / incompetent-to-stand-trial findings are barred from expunction (106(b)(3)); the non-conviction path checks this before the free-expunction result. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - TN 107(e) recovery-court bypass',
    package: 'eligible misdemeanor committed 12 yrs after a single DUI, recovery court completed -> eligible via 107(e).',
    record: { title: 'Eligible misdemeanor (12 yrs after a single DUI)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false, sequencing_tn: true, dui_bypass_tn: true },
    expect: { resultKey: 'eligible_recovery_court_tn', reading: '107(e) bypass: the sequencing bar trips (a DUI predates this offense), but all (e) conditions hold — (a)(1)-eligible, 10+ yrs after the single DUI, recovery court completed, no prior expunction, offense not vehicle+alcohol/CS -> eligible_recovery_court_tn. The DUI itself stays. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - TN sequencing bar (no recovery court)',
    package: 'same as above but no recovery court completed -> ineligible (sequencing bar).',
    record: { title: 'Eligible misdemeanor after a DUI (no recovery court)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false, sequencing_tn: true, dui_bypass_tn: false },
    expect: { resultKey: 'ineligible_sequencing_tn', reading: 'Sequencing bar (107(a)(3)(A)(i)): an ineligible DUI predates this offense and the 107(e) conditions are not met (no recovery court) -> ineligible_sequencing_tn, which points to the bypass as the thing to ask about. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - TN two DUIs (bypass unavailable)',
    package: 'same but two lifetime DUIs -> ineligible; 107(e) requires no more than one DUI.',
    record: { title: 'Eligible misdemeanor after two DUIs', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false, sequencing_tn: true, dui_bypass_tn: false },
    expect: { resultKey: 'ineligible_sequencing_tn', reading: 'Two lifetime DUIs fail the 107(e) "no more than one lifetime DUI" condition, so the dui_bypass gate answers no -> ineligible_sequencing_tn. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - TN 107(e)(3) vehicle+alcohol target offense',
    package: 'eligible-list offense but it itself involves a vehicle + alcohol -> barred by 107(e)(3).',
    record: { title: 'Offense involving vehicle + alcohol (after a DUI)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { prior_expunction_tn: false, trafficking_conv_tn: false, cdl_tn: false, conv_type_tn: 'misd', misd_exclusion_tn: false, sequencing_tn: true, dui_bypass_tn: false },
    expect: { resultKey: 'ineligible_sequencing_tn', reading: '107(e)(3) bars the bypass when the target offense itself involves a motor vehicle plus alcohol or a controlled substance, so the dui_bypass gate answers no -> ineligible_sequencing_tn. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MA: Persona[] = [
  {
    source: 'Wave 4 - MA persona 1',
    package: 'misdemeanor conviction 2020, clean -> mail the form NOW - the flagship persona.',
    record: { title: 'Misdemeanor Conviction', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'misd', misd_date_ma: '2020-01-01' },
    expect: { resultKey: 'eligible_seal_ma', reading: 'Misdemeanour, 3yr lookback met (2020+3=2023<2026), no whole-record firearms/ethics/268 block -> § 100A administrative sealing: one form, by mail, free, non-discretionary. The flagship. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MA persona 2',
    package: 'felony conviction 2017, clean -> mail the form.',
    record: { title: 'Felony Conviction', charge_type: 'felony', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'felony', felony_date_ma: '2017-01-01' },
    expect: { resultKey: 'eligible_seal_ma', reading: 'Felony, 7yr lookback met (2017+7=2024<2026) -> mail-in § 100A administrative sealing. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MA persona 3',
    package: 'dismissal last month -> court petition under 100C, no wait.',
    record: { title: 'Dismissed Case', disposition: 'dismissed', disposition_date: '2026-06-15' },
    expect: { resultKey: 'dismissed_100c_ma', reading: 'Dismissal/nolle -> discretionary § 100C court petition, no wait, Pon "substantial justice" standard. Distinct from the mail-in § 100A path. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA acquittal (mandatory opt-out seal)',
    package: 'acquittal -> Commissioner SHALL seal at disposition under 100C (J.F.), opt-out on written request.',
    record: { title: 'Acquitted Case', disposition: 'acquitted', disposition_date: '2025-05-01' },
    expect: { resultKey: 'acquittal_100c_ma', reading: 'Acquittal/no-PC/no-bill -> mandatory § 100C sealing at disposition (Commonwealth v. J.F., 2023); result carries the opt-out line. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MA persona 4 (now branched)',
    package: 'offense at 19, now 26, one record, misdemeanor -> expungement-eligible at 3yr.',
    record: { title: 'Offense at 19', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'under21', expunge_exclusion_ma: false, expunge_level_ma: false, expunge_misd_date_ma: '2019-01-01' },
    expect: { resultKey: 'expunge_eligible_ma', reading: 'Before 21, not on the § 100J list, misdemeanor-only 3yr wait met (2019+3=2022<2026) -> § 100I expungement-eligible. Result carries the never-automatic / essentially-clean-record / 2-record caveats and that sealing is the easier remedy for most. Now a real branch (was expectIsApproximate sealing).' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MA persona 5 (now branched)',
    package: 'registry-required sex offense (currently registering) -> cannot seal yet; 15yr + no-duty track.',
    record: { title: 'Registry Sex Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'sex', sex_registry_ma: 'active' },
    expect: { resultKey: 'sex_waiting_ma', reading: 'Active duty to register -> cannot seal while the duty continues; § 100A ¶2(6) requires 15yr AND no registration duty anywhere (whichever longer), assuming never level 2/3. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA whole-record § 100A(5) block',
    package: 'time-eligible misdemeanor, BUT a firearms-licensing conviction elsewhere on the record -> whole administrative request blocked.',
    record: { title: 'Misdemeanor (record has a firearms conviction)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: true },
    expect: { resultKey: 'whole_record_block_ma', reading: 'Gate one fires: a c. 140 firearms-licensing / c. 268A / c. 268 conviction ANYWHERE on the record blocks the entire § 100A(5) administrative request, even though the misdemeanor is time-eligible. 100C and the 100K error path are noted as unaffected. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA felony-reclassified-as-misdemeanor',
    package: 'felony when convicted (2023) but the same conduct is a misdemeanor today -> 3yr wait (¶2(1)), passes where 7 would fail.',
    record: { title: 'Old felony, now a misdemeanor', charge_type: 'felony', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'reduced', misd_date_ma: '2023-01-01' },
    expect: { resultKey: 'eligible_seal_ma', reading: '¶2(1): a now-misdemeanor is treated as a misdemeanor for the wait -> 3yr (2023+3=2026-01<2026-07) passes; the 7yr felony wait (2030) would fail. Proves the pro-user reclassification. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA offense no longer a crime',
    package: 'conduct no longer a crime -> sealable forthwith, zero wait (¶2(2)).',
    record: { title: 'Conduct no longer a crime', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2025-06-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'decrim' },
    expect: { resultKey: 'decrim_seal_ma', reading: '¶2(2): an offense that is no longer a crime seals forthwith with no waiting period (unless its elements survive elsewhere). Routes straight to the immediate-seal result. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA restraining-order violation (209A §7)',
    package: '209A §7 violation, misdemeanor-level, disposition 2023 -> treated as a FELONY for the wait (¶2(5)), so 7yr not met.',
    record: { title: 'Violation of a 209A order', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'ro_violation', felony_date_ma: '2023-01-01' },
    expect: { resultKey: 'waiting_ma', reading: '¶2(5): c. 209A §7 / c. 258E §9 violations take the 7yr felony wait despite being misdemeanors -> 2023+7=2030>2026 fails. A 3yr misdemeanor wait would have passed; the counter-rule is what pushes it to waiting. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA level-3 sex offender',
    package: 'ever classified level 3 -> permanently ineligible to seal (¶2(6)).',
    record: { title: 'Level 3 Sex Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'sex', sex_registry_ma: 'level23' },
    expect: { resultKey: 'sex_ineligible_ma', reading: '¶2(6): anyone EVER classified level 2 or 3 is permanently ineligible to seal — no waiting period changes it. The one flat "ineligible" in the MA tree. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA dismissed CWOF',
    package: 'CWOF completed -> ends in dismissal; dual path (100C now / 100A after the wait).',
    record: { title: 'Completed CWOF', disposition: 'deferred', disposition_date: '2024-01-01' },
    expect: { resultKey: 'cwof_ma', reading: 'A CWOF/diversion ends in a DISMISSAL (non-conviction, ¶2(3)) -> the dual-path result: seal now via § 100C (no wait, Pon) or mail the § 100A form after 3/7 years. Replaces the old unknown_deferred hedge. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA under-21 + c.90 §24 -> 100J-excluded',
    package: 'same under-21 record but the offense is a c. 90 §24 charge (OUI/negligent/leaving scene) -> expungement excluded (100J), seal instead.',
    record: { title: 'c. 90 §24 offense at 19', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'under21', expunge_exclusion_ma: true },
    expect: { resultKey: 'expunge_excluded_ma', reading: 'ALL of c. 90 §24 is on the § 100J exclusion list — not just OUI but negligent operation and leaving the scene -> expungement excluded. Result redirects to § 100A sealing, which remains available. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA marijuana stack',
    package: 'marijuana possession in a decriminalized amount -> the three-remedy stack (100K1/4 mandatory expungement first).',
    record: { title: 'Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-01-01' },
    answers: { special_remedy_ma: 'marijuana' },
    expect: { resultKey: 'marijuana_ma', reading: 'Decriminalized-amount marijuana -> the special-remedy gate routes BEFORE the whole-record block to the three-remedy stack: § 100K1/4 mandatory expungement (court shall grant in 30 days), Healey pardon-sealing, § 100A ¶2(2) forthwith seal. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/18 - MA subsequent nolle does not interrupt',
    package: 'misdemeanor 2022, a later nolle prosequi in 2024 -> does NOT interrupt the 100A wait (¶2(3)); still eligible.',
    record: { title: 'Misdemeanor 2022 (later nolle in 2024)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { special_remedy_ma: 'none', whole_record_gate_ma: false, level_ma: 'misd', misd_date_ma: '2022-01-01' },
    expect: { resultKey: 'eligible_seal_ma', reading: 'The 2022 misdemeanor is past the 3yr lookback (2025<2026). A subsequent nolle prosequi is not a guilty finding, so under ¶2(3) it does not interrupt eligibility -> eligible_seal_ma. The engine screens one record; the ¶2(3) reassurance is what the result copy carries. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const IN: Persona[] = [
  {
    source: 'Wave 4 - IN persona 1',
    package: 'arrest, charges dismissed 2024 -> free petition now (or already auto-expunged - check).',
    record: { title: 'Dismissed Arrest', disposition: 'dismissed', disposition_date: '2024-01-01' },
    expect: { resultKey: 'eligible_arrest_in', reading: 'Non-conviction -> free arrest expungement, 1yr; result says check whether already automatic (post-2022). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - IN persona 2',
    package: 'misdemeanor 2018, paid, clean -> MANDATORY grant - but counsel-the-timing if they also have a 2021 Level 6 (waiting lets one petition catch both; filing now burns the shot).',
    record: { title: 'Misdemeanor (with other records)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { excluded_in: false, level_in: 'misd', misd_date_in: '2018-01-01', other_records_mand_in: true },
    expect: { resultKey: 'complex_timing_in', reading: 'THE WAIT-DONT-FILE BRANCH. Misdemeanour eligible at 5yr (2018+5=2023<2026), but the person has other records -> complex_timing_in advises NOT filing yet so the one lifetime petition can catch everything. This is the design shown before writing. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - IN persona 3',
    package: 'Level 6 felony 2015, clean -> eligible, mandatory.',
    record: { title: 'Level 6 Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { excluded_in: false, level_in: 'l6', l6_excluded_in: false, l6_date_in: '2015-01-01', other_records_mand_in: false },
    expect: { resultKey: 'eligible_mandatory_in', reading: 'Level 6, not bodily-injury, 8yr (2015+8=2023<2026), no other records -> mandatory grant, clean file-now result. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - IN persona 4',
    package: 'Level 4 felony 2014, clean -> discretionary, marked-public - expectation-setting copy.',
    record: { title: 'Level 4 Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2014-01-01' },
    answers: { excluded_in: false, level_in: 'l45', l45_date_in: '2014-01-01', other_records_disc_in: false },
    expect: { resultKey: 'eligible_discretionary_in', reading: 'Level 4, 8yr (2014+8=2022<2026), no other records -> discretionary result that sets expectations: a judge decides, and the record stays publicly MARKED not hidden. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - IN persona 5',
    package: 'serious-bodily-injury felony -> 10 yrs + prosecutor consent; honest-maybe.',
    record: { title: 'Serious Bodily Injury Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01' },
    answers: { excluded_in: false, level_in: 'serious', serious_in: '2013-01-01', other_records_disc_in: false },
    expect: { resultKey: 'eligible_discretionary_in', reading: 'Serious felony, 10yr (2013+10=2023<2026), no other records -> discretionary result (also flags prosecutor consent, marked-public). The honest-maybe. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MO: Persona[] = [
  {
    source: 'Wave 4 - MO persona 1 (updated)',
    package: 'misdemeanor stealing, disposition done 2024, clean, within limits -> eligible with presumption copy.',
    record: { title: 'Misdemeanor Stealing', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: false, conv_level_mo: 'misdemeanor', misd_count_mo: 'within', clean_conduct_mo: false },
    expect: { resultKey: 'eligible_mo', reading: 'Misdemeanour, 1yr (2024+1=2025<2026), within the 3-misdemeanour limit, not excluded/weapons, clean period -> eligible. Copy carries the rebuttable presumption, effects (.9), disclosures (.10-.11), and no-surcharge. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MO persona 2 (updated)',
    package: 'felony (non-excluded), 4 yrs post-disposition, clean -> eligible.',
    record: { title: 'Felony Possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: false, conv_level_mo: 'felony', felony_count_mo: 'within', clean_conduct_mo: false },
    expect: { resultKey: 'eligible_mo', reading: 'Felony 3yr (2022+3=2025<2026), within the 2-felony limit, clean -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO clean-period fail',
    package: 'felony 4 yrs out but a misdemeanor guilty finding 1 yr ago -> not eligible (clean-period).',
    record: { title: 'Felony (recent misd guilty finding)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: false, conv_level_mo: 'felony', felony_count_mo: 'within', clean_conduct_mo: true },
    expect: { resultKey: 'ineligible_clean_mo', reading: 'The date passes (2022+3<2026) but the clean-conduct condition (.6(2), measured backward from filing) fails because of a misdemeanor guilty finding inside the 3-yr window -> ineligible_clean_mo. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MO persona 3 (updated)',
    package: 'domestic assault misdemeanor -> excluded (any-level DV).',
    record: { title: 'Domestic Assault Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { dwi_mo: false, excluded_mo: true },
    expect: { resultKey: 'ineligible_excluded_mo', reading: 'Domestic assault at ANY level is on the § 610.140.3 exclusion list -> honest-no. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO pre-2017 unlawful carrying (regression-lock)',
    package: 'unlawful carrying (571.030.1(1)) with a guilty finding before 1/1/2017 -> NOT excluded (draft would have false-ineligibled).',
    record: { title: 'Unlawful carrying (pre-2017, 571.030.1(1))', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: true, weapons_exception_mo: true, conv_level_mo: 'felony', felony_count_mo: 'within', clean_conduct_mo: false },
    expect: { resultKey: 'eligible_mo', reading: 'REGRESSION-LOCK: the .3(11) weapons exception keeps pre-1/1/2017 unlawful carrying (571.030.1(1)) eligible; the draft\'s flat "weapons offense" would have false-ineligibled it. Weapons yes -> exception yes -> felony path -> eligible (2015+3<2026). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 4 - MO persona 4 (updated) - first intoxication offence',
    package: 'first misdemeanor DWI, 12 yrs from conviction, no enforcement contacts -> eligible via 610.130.',
    record: { title: 'First DWI (misdemeanor)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-01-01' },
    answers: { dwi_mo: true, dwi_felony_mo: false, dwi_cdl_mo: false, dwi_first_mo: true, dwi_date_mo: '2014-01-01' },
    expect: { resultKey: 'eligible_dwi_mo', reading: 'First misdemeanor intoxication offence, non-CDL, no enforcement contacts, 10yr from the plea/conviction date (2014+10=2024<2026) -> eligible via § 610.130, mandatory grant. Anchor now the plea/conviction date. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO DWI with an administrative suspension',
    package: 'first DWI but an alcohol-related administrative license suspension 5 yrs ago -> ineligible (enforcement contact).',
    record: { title: 'DWI (later admin suspension)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2013-01-01' },
    answers: { dwi_mo: true, dwi_felony_mo: false, dwi_cdl_mo: false, dwi_first_mo: false },
    expect: { resultKey: 'ineligible_dwi_mo', reading: 'The 610.130 clean requirement bars OTHER alcohol-related enforcement contacts (§ 302.525 — administrative suspensions count), broader than "no further convictions". dwi_first answers no -> ineligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO felony DWI',
    package: 'felony DWI -> never expungeable.',
    record: { title: 'Felony DWI', charge_type: 'felony', disposition: 'convicted' },
    answers: { dwi_mo: true, dwi_felony_mo: true },
    expect: { resultKey: 'ineligible_dwi_mo', reading: 'A felony intoxication offence is never eligible under § 610.130 (misdemeanour/ordinance only) -> ineligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO CDL holder DWI',
    package: 'first misdemeanor DWI but the person holds a CDL -> ineligible (610.130.4 total CDL exclusion).',
    record: { title: 'DWI (CDL holder)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-01-01' },
    answers: { dwi_mo: true, dwi_felony_mo: false, dwi_cdl_mo: true },
    expect: { resultKey: 'ineligible_dwi_cdl_mo', reading: '§ 610.130.4 totally excludes CDL holders (and those required to hold one) from the intoxication-offence expungement, regardless of time or cleanliness. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO arrest never charged',
    package: 'arrested for an eligible offence, never charged, 20 months ago, clean since -> eligible arrest track.',
    record: { title: 'Arrest, never charged', disposition: 'dismissed', disposition_date: '2024-11-15' },
    answers: { charged_gate_mo: false, arrest_excluded_mo: false, arrest_clean_mo: false },
    expect: { resultKey: 'eligible_arrest_mo', reading: 'Never charged, eligible offence, no guilty findings since, 18-month mark met (2024-11 + 18mo = 2026-05 < 2026-07) -> eligible arrest track (§ 610.140.7). Result also offers the § 610.122 false-information destruction alternative. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO arrest for an excluded offence',
    package: 'arrested for an excluded offence, never charged -> ineligible (arrest must be for an eligible crime).',
    record: { title: 'Arrest for an excluded offence', disposition: 'dismissed', disposition_date: '2024-01-01' },
    answers: { charged_gate_mo: false, arrest_excluded_mo: true },
    expect: { resultKey: 'ineligible_excluded_mo', reading: 'The .7 arrest track requires the arrest be for an ELIGIBLE crime; an excluded-offence arrest routes through the exclusion screen to ineligible. Added gate. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO charged then dismissed (regression-lock)',
    package: 'charged then dismissed -> automatic-closure result (610.105), NOT the 18-month arrest track.',
    record: { title: 'Charged then dismissed', disposition: 'dismissed', disposition_date: '2025-06-01' },
    answers: { charged_gate_mo: true },
    expect: { resultKey: 'dismissed_closure_mo', reading: 'REGRESSION-LOCK the misroute: a CHARGED-then-dismissed case cannot use the .7 arrest track (that is "never charged"). It closes automatically under § 610.105, with the § 610.140 expungement and § 610.122 destruction offered as upgrades. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO lifetime limits',
    package: '3 misdemeanors already expunged, 4th sought -> ineligible (limits).',
    record: { title: 'Fourth misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: false, conv_level_mo: 'misdemeanor', misd_count_mo: 'over' },
    expect: { resultKey: 'ineligible_count_mo', reading: 'At the 3-misdemeanour lifetime limit -> ineligible; result notes single-course-of-conduct-counts-as-one and that infractions are uncapped. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 - MO infraction bypasses limits',
    package: 'an infraction even with the misdemeanor limit exhausted -> still eligible (infractions unlimited).',
    record: { title: 'Infraction', charge_type: 'infraction', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { dwi_mo: false, excluded_mo: false, weapons_mo: false, conv_level_mo: 'infraction', clean_conduct_mo: false },
    expect: { resultKey: 'eligible_mo', reading: '.13: infractions are UNLIMITED and bypass the lifetime-count gate entirely (infraction -> date node, no count). 1yr met -> eligible. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - MO SIS completed (non-sex)',
    package: 'successfully completed SIS, non-sexual offence -> automatic-closure result (610.105).',
    record: { title: 'SIS completed (non-sex)', disposition: 'deferred' },
    answers: { sis_ch566_mo: false },
    expect: { resultKey: 'sis_closure_mo', reading: 'A completed SIS triggers automatic § 610.105 closure on final termination (replaces unknown_deferred); copy notes impeachment use and that SIS cannot use the § 610.122 path. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - MO SIS on a chapter 566 offence',
    package: 'SIS on a chapter 566 sexual offence -> closure result with victim-access disclosure (610.105.2).',
    record: { title: 'SIS on a ch. 566 offence', disposition: 'deferred' },
    answers: { sis_ch566_mo: true },
    expect: { resultKey: 'sis_closure_ch566_mo', reading: 'For ch. 566 / listed child-offence SIS cases the victim retains access (§ 610.105.2), so the closure is narrower -> the dedicated result. Exact.' },
    now: NOW,
  },
  {
    source: 'Diana 7/19 addendum - MO NGRI',
    package: 'not guilty by reason of insanity -> closure with restricted-access note (not routed to ineligible).',
    record: { title: 'NGRI verdict', disposition: 'acquitted' },
    answers: { acquittal_ngri_mo: true },
    expect: { resultKey: 'ngri_closure_mo', reading: 'NGRI records close under § 610.105 but the disposition stays accessible to law enforcement and listed care agencies -> ngri_closure_mo, NOT ineligible. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MD: Persona[] = [
  {
    source: 'Wave 5 - MD persona 1',
    package: 'PBJ for theft 2020, discharged -> eligible now.',
    record: { title: 'PBJ Theft', disposition: 'deferred', disposition_date: '2020-01-01' },
    expect: { resultKey: 'eligible_pbj_md', reading: 'PBJ discharged 2020, 3yr (2020+3=2023<2026) -> eligible. PBJ is Maryland\'s signature disposition, its own branch. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - MD persona 2',
    package: 'misdemeanor CDS conviction 2017 -> 5-yr REDEEM wait met -> eligible.',
    record: { title: 'Misdemeanor CDS', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { unit_rule_md: false, cannabis_md: false, eligible_offense_md: 'misd', misd_date_md: '2017-01-01' },
    expect: { resultKey: 'eligible_conviction_md', reading: 'Eligible misdemeanour, REDEEM 5yr (2017+5=2022<2026) -> eligible. Old law was 10yr. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - MD persona 3',
    package: '2nd-degree assault 2018 -> 2025+ -> eligible.',
    record: { title: '2nd-Degree Assault', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { unit_rule_md: false, cannabis_md: false, eligible_offense_md: 'assault2', assault2_date_md: '2018-01-01' },
    expect: { resultKey: 'eligible_conviction_md', reading: '2nd-degree assault, REDEEM 7yr (2018+7=2025<2026) -> eligible. Was 15yr. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - MD persona 4',
    package: 'case with one expungable + one non-expungable charge -> unit-rule block; honest-no.',
    record: { title: 'Mixed-Charge Case', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { unit_rule_md: true },
    expect: { resultKey: 'complex_unit_md', reading: 'THE UNIT RULE. One non-expungable charge in the case blocks the whole case -> complex_unit_md, its own node, notes the cannabis exception. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - MD persona 5',
    package: 'cannabis possession conviction -> immediate petition, no fee.',
    record: { title: 'Cannabis Possession', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { unit_rule_md: false, cannabis_md: true },
    expect: { resultKey: 'eligible_cannabis_md', reading: 'Cannabis -> immediate petition, no fee, and the CJIS-only vs court-record note. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const WI: Persona[] = [
  {
    source: 'Wave 5 - WI persona 1',
    package: '23-yr-old, misdemeanor, judge ordered expungement, probation done -> already expunged - check CCAP.',
    record: { title: 'Misdemeanor (ordered at sentencing)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { ordered_wi: true, completed_wi: true },
    expect: { resultKey: 'eligible_already_wi', reading: 'Ordered at sentencing + completed -> self-executing (State v. Hemp), may already be done -> check CCAP. Notes CIB record survives. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - WI persona 2',
    package: '23-yr-old, same crime, judge silent at sentencing -> NO path; pardon only - the defining honest-no.',
    record: { title: 'Misdemeanor (not ordered)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'THE DEFINING HONEST-NO. Judge did not order at sentencing -> no petition process exists (Matasek/Arberry); pardon is the route. This is the template honest-no page. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - WI persona 3',
    package: '27-yr-old at offense -> never eligible.',
    record: { title: 'Offense at 27', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'Over 25 at offense -> never eligible for the at-sentencing mechanism, and no petition exists -> pardon path. (The tree asks the at-sentencing question, which a 27-yr-old could not have gotten a yes to; answering no routes correctly.) Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - WI persona 4',
    package: 'Class I felony at 22, ordered, completed -> expunged, but CIB record persists - expectation-setting.',
    record: { title: 'Class I Felony (ordered at 22)', charge_type: 'felony', disposition: 'convicted' },
    answers: { ordered_wi: true, completed_wi: true },
    expect: { resultKey: 'eligible_already_wi', reading: 'Ordered + completed -> already expunged; the result sets the expectation that the CIB record persists even after court-record expungement. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - WI persona 5',
    package: 'old felony, sentence done 2015 -> pardon application.',
    record: { title: 'Old Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'Old felony, not ordered at sentencing -> pardon path (5yr post-completion). Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const SC: Persona[] = [
  {
    source: 'Wave 5 - SC persona 1',
    package: 'shoplifting conviction (30-day max) 2019, clean -> § 910 eligible.',
    record: { title: 'Shoplifting (30-day max)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { conv_type_sc: 's910', s910_date_sc: '2019-01-01' },
    expect: { resultKey: 'eligible_conviction_sc', reading: 'First-offence low-penalty (30-day max), 3yr (2019+3=2022<2026) -> § 22-5-910 eligible, through the solicitor, $310. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - SC persona 2',
    package: 'YOA burglary conviction 2016, done 2018, clean -> § 920 eligible, once-ever.',
    record: { title: 'YOA Burglary', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { conv_type_sc: 's920', s920_date_sc: '2018-01-01' },
    expect: { resultKey: 'eligible_yoa_sc', reading: 'YOA conviction, 5yr from completion (2018+5=2023<2026) -> § 22-5-920, once per lifetime. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - SC persona 3',
    package: 'DUI -> never; pardon.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_type_sc: 'other' },
    expect: { resultKey: 'pardon_path_sc', reading: 'DUI is not on the closed list -> pardon path (honest-no with the pardon route + the pending-bill note). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - SC persona 4',
    package: 'magistrate-court dismissal 2015 -> should already be auto-expunged - check.',
    record: { title: 'Magistrate Dismissal', disposition: 'dismissed' },
    answers: { court_type_sc: true },
    expect: { resultKey: 'eligible_auto_sc', reading: 'Summary-court non-conviction -> automatic free since 2009 (§ 17-22-950); result says check it was applied. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - SC persona 5',
    package: 'first-offense simple possession 2021 -> eligible 2024+ -> yes.',
    record: { title: 'First-Offense Simple Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-01-01' },
    answers: { conv_type_sc: 's930', s930_date_sc: '2021-01-01' },
    expect: { resultKey: 'eligible_conviction_sc', reading: 'First simple possession, 3yr (2021+3=2024<2026) -> § 22-5-930 eligible. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const AL: Persona[] = [
  {
    source: 'Wave 5 - AL persona 1',
    package: 'charges no-billed 2023 -> eligible now (fee!).',
    record: { title: 'No-Billed Charges', disposition: 'dismissed', disposition_date: '2023-01-01' },
    expect: { resultKey: 'eligible_nonconviction_al', reading: 'No-bill, 90-day wait (2023+90d<<2026) -> eligible; result leads with the $500 fee and the indigency waiver. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - AL persona 2',
    package: 'misdemeanor theft conviction 2020, paid -> REDEEMER-eligible 2023+ -> yes, $500.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { excluded_al: false, conv_level_al: 'misdemeanor', misd_date_al: '2020-01-01' },
    expect: { resultKey: 'eligible_misd_al', reading: 'Misdemeanour, REDEEMER 3yr (2020+3=2023<2026), paid -> eligible; fee + lifetime-cap noted. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - AL persona 3',
    package: 'DUI -> never.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_al: true, excluded_path_al: true },
    expect: { resultKey: 'ineligible_dui_al', reading: 'DUI = serious traffic (explicit since Jul 2023) -> never. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - AL persona 4',
    package: 'nonviolent felony 2010, clean -> pardon path -> then 180 days -> expungement.',
    record: { title: 'Nonviolent Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2010-01-01' },
    answers: { excluded_al: false, conv_level_al: 'felony' },
    expect: { resultKey: 'pardon_path_al', reading: 'Felony -> pardon-first + 180 days path (encoded as a path, not flat ineligible). Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - AL persona 5',
    package: 'drug-court completion 2024 -> eligible mid-2025.',
    record: { title: 'Drug Court Completion', disposition: 'deferred', disposition_date: '2024-01-01' },
    expect: { resultKey: 'eligible_nonconviction_al', reading: 'Specialty-court completion, 1yr (2024+1=2025<2026) -> eligible via the diversion date node. Exact.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const LA: Persona[] = [
  {
    source: 'Wave 5 - LA persona 1',
    package: 'misdemeanor conviction 2018, clean -> art. 977 eligible - try automated path first.',
    record: { title: 'Misdemeanor Conviction', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { excluded_la: false, level_la: 'misdemeanor', dwi_la: false, misd_date_la: '2018-01-01' },
    expect: { resultKey: 'eligible_misd_la', reading: 'Misdemeanour, 5yr (2018+5=2023<2026) -> art. 977 eligible; result leads with the free automated request. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - LA persona 2',
    package: 'felony possession 2012, clean -> art. 978 eligible.',
    record: { title: 'Felony Possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-01-01' },
    answers: { excluded_la: false, level_la: 'felony', felony_date_la: '2012-01-01' },
    expect: { resultKey: 'eligible_felony_la', reading: 'Felony, 10yr (2012+10=2022<2026) -> art. 978; result states the multiple-felonies-in-10yr rule (978(F)), not the one-per-lifetime guides. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - LA persona 3',
    package: 'simple robbery 2010, clean -> 978(E) contradictory-hearing path - the surprise-yes.',
    record: { title: 'Simple Robbery', charge_type: 'felony', disposition: 'convicted', disposition_date: '2010-01-01' },
    answers: { excluded_la: true, violent_carveout_la: true, felony_978e_date_la: '2010-01-01' },
    expect: { resultKey: 'eligible_978e_la', reading: 'THE SURPRISE-YES. Simple robbery is a crime of violence (excluded_la yes), BUT one of the six 978(E) carve-outs -> expungable after 10yr (2010+10=2020<2026) via contradictory hearing. Sits inside the excluded path. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - LA persona 4',
    package: 'domestic abuse battery -> excluded.',
    record: { title: 'Domestic Abuse Battery', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_la: true, violent_carveout_la: false },
    expect: { resultKey: 'ineligible_excluded_la', reading: 'Domestic abuse battery is excluded and not one of the six carve-outs -> ineligible, with the carve-out rule-out and first-offender-pardon note. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 5 - LA persona 5',
    package: 'first-offense marijuana possession -> $300 window until Aug 1, 2026 - dated urgency copy.',
    record: { title: 'First-Offense Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { excluded_la: false, level_la: 'misdemeanor', dwi_la: false, misd_date_la: '2018-01-01' },
    expect: {
      resultKey: 'eligible_misd_la',
      reading:
        'A first-offence marijuana possession is a misdemeanour on the art. 977 path (5yr, 2018+5=2023<2026) '
        + '-> eligible_misd_la. The package wants the dated $300-until-Aug-1-2026 urgency surfaced; that fee '
        + 'detail lives in the keyDate and fee open question rather than a distinct marijuana result. Flagged '
        + 'approximate: the tree routes correctly but does not branch a marijuana-specific fee result.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// WAVE 6 — KY, OR, IA, NV, AR, MS, KS, NM, NE, ID, WV
// ---------------------------------------------------------------------------
const KY: Persona[] = [
  {
    source: 'Wave 6 — KY persona 1',
    package: 'dismissed-with-prejudice 2022 -> should be auto-expunged — check.',
    record: { title: 'Dismissed charge', disposition: 'dismissed', disposition_date: '2022-06-01' },
    answers: { dismissal_ky: true, auto_cutoff_ky: true },
    expect: {
      resultKey: 'check_record_auto_ky',
      reading:
        'A dismissal-with-prejudice that ended on/after Jul 15, 2020 is automatic (KRS 431.076); the tree '
        + 'routes it to the check-your-record result, matching "should be auto-expunged — check."',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KY persona 2',
    package: 'misdemeanor theft 2018, done -> eligible, $100+$40.',
    record: { title: 'Misdemeanor theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { level_ky: 'misd', misd_excluded_ky: false },
    expect: {
      resultKey: 'eligible_misd_ky',
      reading: 'A non-excluded misdemeanor 8 years past sentence clears the 5-year § 431.078 wait -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KY persona 3',
    package: 'Class D possession 2017, clean -> eligible, ~$340 all-in, 4–5 month cert wait first.',
    record: { title: 'Class D possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2017-06-01', probation_status: 'completed' },
    answers: { level_ky: 'felonyD', felonyD_eligible_ky: 'eligible' },
    expect: {
      resultKey: 'eligible_felonyD_ky',
      reading: 'An enumerated Class D felony 9 years past sentence clears the 5-year § 431.073 wait -> eligible (certificate-first).',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KY persona 4',
    package: 'two Class D felonies, separate incidents -> 2023 amendment ⚠️ — the verify-then-encode branch.',
    record: { title: 'Second Class D felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-06-01', probation_status: 'completed' },
    answers: { level_ky: 'felonyD', felonyD_eligible_ky: 'eligible' },
    expect: {
      resultKey: 'eligible_felonyD_ky',
      reading:
        'The 2023 amendment allows expunging MORE THAN ONE qualifying Class D felony, so the tree does not '
        + 'cap them — a second separate-incident Class D felony still reaches eligible_felonyD_ky, whose '
        + 'message states the multiple-felony rule. This IS the verify-then-encode branch.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KY persona 5',
    package: 'Class C felony -> pardon only.',
    record: { title: 'Class C felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_ky: 'felonyABC' },
    expect: {
      resultKey: 'ineligible_felony_ky',
      reading: 'Class A/B/C felonies are expungeable only if pardoned; the tree routes them to the pardon-only result.',
    },
    now: NOW,
  },
];

const OR: Persona[] = [
  {
    source: 'Wave 6 — OR persona 1',
    package: 'B felony drug delivery 2015, clean -> eligible since 2022 (was 20-yr wait before SB 397 — many people don\'t know they became eligible).',
    record: { title: 'Class B felony drug delivery', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01', probation_status: 'completed' },
    answers: { excluded_or: false, level_or: 'felonyB' },
    expect: {
      resultKey: 'eligible_conviction_or',
      reading: 'A non-excluded Class B felony 11 years past conviction clears the SB 397 7-year wait -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — OR persona 2',
    package: 'A misdemeanor 2021 -> eligible 2024.',
    record: { title: 'Class A misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_or: false, level_or: 'misdA' },
    expect: {
      resultKey: 'eligible_conviction_or',
      reading: 'A Class A misdemeanor past the 3-year wait (2021 -> eligible 2024, now 2026) -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — OR persona 3',
    package: 'DUII diversion completed -> NOT expungable — expectation-setter.',
    record: { title: 'DUII diversion', disposition: 'deferred' },
    answers: { diversion_duii_or: true },
    expect: {
      resultKey: 'ineligible_duii_or',
      reading: 'A completed DUII diversion is the unique Oregon trap — not expungable; the tree routes it to the DUII-diversion ineligible result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — OR persona 4',
    package: 'dismissed theft charge -> the drafting-error ⚠️ branch.',
    record: { title: 'Dismissed theft charge', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: {},
    expect: {
      resultKey: 'nonconv_or',
      reading:
        'Dismissals route to nonconv_or, which is eligible-with-caveat and explicitly names the known ORS '
        + '137.225 dismissal drafting error — this IS the drafting-error branch.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — OR persona 5',
    package: 'old unpaid fines, judgment expired -> 2025 amendment says eligible now.',
    record: { title: 'Class C felony, old unpaid fines', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-06-01', probation_status: 'completed', restitution_paid: false },
    answers: { excluded_or: false, level_or: 'felonyC' },
    expect: {
      resultKey: 'eligible_conviction_or',
      reading:
        'The 2025 amendment makes expired money-judgment LFOs count as sentence-complete, so unpaid old fines '
        + 'no longer block. The tree does not gate on fines, so a Class C felony past the 5-year wait is '
        + 'eligible even with restitution unpaid — matching "eligible now."',
    },
    now: NOW,
  },
];

const IA: Persona[] = [
  {
    source: 'Wave 6 — IA persona 1',
    package: 'dismissed case 2020, costs paid -> eligible.',
    record: { title: 'Dismissed case', disposition: 'dismissed', disposition_date: '2020-06-01' },
    answers: { costs_ia: true },
    expect: {
      resultKey: 'eligible_nonconv_ia',
      reading: 'A non-conviction with court costs paid and well past 180 days -> eligible under § 901C.2.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — IA persona 2',
    package: 'deferred judgment done 2016 -> should already be expunged — check.',
    record: { title: 'Deferred judgment', disposition: 'deferred', disposition_date: '2016-06-01' },
    answers: {},
    expect: {
      resultKey: 'check_deferred_ia',
      reading: 'A completed deferred judgment (post-2013) is automatic under § 907.9; the tree routes it to the check-your-record result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — IA persona 3',
    package: 'misdemeanor theft 2015 -> 8-yr wait met 2023 -> eligible, once-ever decision.',
    record: { title: 'Misdemeanor theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-06-01', probation_status: 'completed' },
    answers: { level_ia: 'misd', misd_excluded_ia: false },
    expect: {
      resultKey: 'eligible_misd_ia',
      reading: 'A non-excluded misdemeanor 11 years past conviction clears the 8-year § 901C.3 wait -> eligible; the result names the once-per-lifetime trade-off.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — IA persona 4',
    package: 'OWI -> never; honest-no.',
    record: { title: 'OWI', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_ia: 'misd', misd_excluded_ia: true },
    expect: {
      resultKey: 'ineligible_excluded_ia',
      reading: 'OWI is an excluded category under § 901C.3; the tree routes it to the excluded-offense honest-no.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — IA persona 5',
    package: 'felony conviction -> pardon only.',
    record: { title: 'Felony conviction', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_ia: 'felony' },
    expect: {
      resultKey: 'ineligible_felony_ia',
      reading: 'Iowa has no felony-conviction expungement; the tree routes felonies to the pardon-only result.',
    },
    now: NOW,
  },
];

const NV: Persona[] = [
  {
    source: 'Wave 6 — NV persona 1',
    package: 'Cat E possession 2021, discharged -> 2-yr wait met -> eligible.',
    record: { title: 'Category E possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_nv: false, package_rule_nv: false, level_nv: 'catE' },
    expect: {
      resultKey: 'eligible_conviction_nv',
      reading: 'A Category E felony 5 years past discharge clears the 2-year NRS 179.245 tier -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NV persona 2',
    package: 'dismissal 2024 -> seal NOW.',
    record: { title: 'Dismissal', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_nv',
      reading: 'Dismissals seal immediately under NRS 179.255 with no wait -> the seal-now result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NV persona 3',
    package: 'misdemeanor DUI 2020 -> 7-yr wait -> 2027.',
    record: { title: 'Misdemeanor DUI', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { excluded_nv: false, package_rule_nv: false, level_nv: 'misd7' },
    expect: {
      resultKey: 'waiting_nv',
      reading: 'A misdemeanor DUI carries a 7-year wait; 2020 -> 2027, so at 2026 it has not run -> waiting.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NV persona 4',
    package: 'eligible 2016 gross misd + brand-new 2025 misdemeanor -> package rule blocks everything — the teaching persona.',
    record: { title: 'Gross misdemeanor (2016) with a new 2025 case', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-06-01', probation_status: 'completed' },
    answers: { excluded_nv: false, package_rule_nv: true },
    expect: {
      resultKey: 'complex_package_nv',
      reading:
        'The package rule seals the record as one set; a newer 2025 case that is not yet eligible blocks the '
        + 'whole petition. Answering the package-rule gate "yes" routes to complex_package_nv — the teaching result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NV persona 5',
    package: 'felony DUI -> never.',
    record: { title: 'Felony DUI', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-06-01' },
    answers: { excluded_nv: true },
    expect: {
      resultKey: 'ineligible_excluded_nv',
      reading: 'Felony DUI is never sealable in Nevada; the excluded gate routes it to the ineligible result.',
    },
    now: NOW,
  },
];

const AR: Persona[] = [
  {
    source: 'Wave 6 — AR persona 1',
    package: 'Class D theft felony, sentence done last month -> eligible NOW, free — the state\'s headline.',
    record: { title: 'Class D theft felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2026-06-01', probation_status: 'completed' },
    answers: { level_ar: 'felony', felony_excluded_ar: false, felony_prior_ar: false, felony_violent_ar: false },
    expect: {
      resultKey: 'eligible_felony_ar',
      reading: 'A non-violent Class D felony seals immediately on completion under § 16-90-1406 -> eligible now, free.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — AR persona 2',
    package: 'misdemeanor 2024, fines paid -> immediate.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-06-01', probation_status: 'completed' },
    answers: { level_ar: 'misd', misd_dwi_ar: false, misd_serious_ar: false },
    expect: {
      resultKey: 'eligible_misd_ar',
      reading: 'A non-DWI, non-serious misdemeanor seals immediately on completion under § 16-90-1405 -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — AR persona 3',
    package: 'two separate felony convictions -> one-prior-felony cap ⚠️ analysis branch.',
    record: { title: 'Second separate felony conviction', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { level_ar: 'felony', felony_excluded_ar: false, felony_prior_ar: true },
    expect: {
      resultKey: 'complex_priorfelony_ar',
      reading:
        'More than one prior felony triggers the one-prior-felony cap (same-episode felonies count as one), '
        + 'which needs case-specific analysis; the tree routes it to complex_priorfelony_ar.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — AR persona 4',
    package: 'DWI misdemeanor 2018 -> 10-yr wait -> 2028.',
    record: { title: 'DWI misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { level_ar: 'misd', misd_dwi_ar: true },
    expect: {
      resultKey: 'waiting_ar',
      reading: 'A misdemeanor DWI carries a 10-year wait; 2018 -> 2028, so at 2026 it has not run -> waiting.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — AR persona 5',
    package: 'Class B drug felony, done 2023 -> immediate — the surprise-yes.',
    record: { title: 'Class B drug felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { level_ar: 'felony', felony_excluded_ar: false, felony_prior_ar: false, felony_violent_ar: false },
    expect: {
      resultKey: 'eligible_felony_ar',
      reading:
        'Class A/B DRUG felonies seal immediately (a drug offense answers "no" to the non-drug Y/A/B exclusion). '
        + 'The tree reaches eligible_felony_ar immediately -> the surprise-yes.',
    },
    now: NOW,
  },
];

const MS: Persona[] = [
  {
    source: 'Wave 6 — MS persona 1',
    package: 'felony possession 2018, done, paid -> one-shot eligible — spend-it-wisely branch (MS joins IN/IA in the "don\'t file casually" club).',
    record: { title: 'Felony possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { level_ms: 'felony', felony_prioruse_ms: false, felony_excluded_ms: false },
    expect: {
      resultKey: 'eligible_felony_ms',
      reading: 'A non-excluded felony 8 years past completion clears the 5-year § 99-19-71 wait -> eligible; the result names the one-per-lifetime trade-off.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — MS persona 2',
    package: 'first misdemeanor 2023 -> eligible now.',
    record: { title: 'First misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { level_ms: 'misd', misd_firstoffender_ms: true },
    expect: {
      resultKey: 'eligible_misd_ms',
      reading: 'A first-offense, non-traffic misdemeanor has no set wait -> eligible now.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — MS persona 3',
    package: 'embezzlement felony -> excluded — the surprise-no.',
    record: { title: 'Embezzlement felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { level_ms: 'felony', felony_prioruse_ms: false, felony_excluded_ms: true },
    expect: {
      resultKey: 'ineligible_excluded_ms',
      reading: 'Embezzlement is on the § 99-19-71 exclusion list; the tree routes it to the excluded honest-no (surprise-no).',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — MS persona 4',
    package: 'dismissed charge -> petition, shall-grant.',
    record: { title: 'Dismissed charge', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_ms',
      reading: 'Non-convictions are expunged on petition where the court "shall" grant -> the non-conviction eligible result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — MS persona 5',
    package: 'second felony after a prior expunction -> never.',
    record: { title: 'Second felony after a prior expunction', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_ms: 'felony', felony_prioruse_ms: true },
    expect: {
      resultKey: 'ineligible_prioruse_ms',
      reading: 'The one-felony-per-lifetime limit, once used, bars a second felony expunction; the tree routes it to the prior-use ineligible result.',
    },
    now: NOW,
  },
];

const KS: Persona[] = [
  {
    source: 'Wave 6 — KS persona 1',
    package: 'severity-8 theft felony 2019, discharged 2021 -> 3-yr wait met -> eligible.',
    record: { title: 'Severity-8 theft felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_ks: false, specialty_ks: false, level_ks: 'felony3' },
    expect: {
      resultKey: 'eligible_conviction_ks',
      reading: 'A severity 6-10 non-drug felony sits in the 3-year tier; discharged 2021, past 3 years at 2026 -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KS persona 2',
    package: 'first DUI 2018, done 2019 -> 5-yr wait met -> eligible (DUI expungable here, unlike most of this wave!).',
    record: { title: 'First DUI', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { excluded_ks: false, specialty_ks: false, level_ks: 'dui1' },
    expect: {
      resultKey: 'eligible_conviction_ks',
      reading: 'A first DUI sits in the 5-year tier; done 2019, past 5 years at 2026 -> eligible (Kansas expunges DUI).',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KS persona 3',
    package: 'drug-court graduate last month -> petition NOW, fee waivable.',
    record: { title: 'Drug-court graduate', disposition: 'convicted', disposition_date: '2026-06-01', probation_status: 'completed' },
    answers: { excluded_ks: false, specialty_ks: true },
    expect: {
      resultKey: 'eligible_specialty_ks',
      reading: 'Drug/veterans-court graduates may petition immediately with the docket fee waivable; the specialty gate routes to eligible_specialty_ks.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KS persona 4',
    package: 'registrable offense -> not while registered.',
    record: { title: 'Registrable offense', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { excluded_ks: true },
    expect: {
      resultKey: 'ineligible_excluded_ks',
      reading: 'Anyone still required to register cannot expunge while registering; the excluded gate routes to the ineligible result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — KS persona 5',
    package: 'diversion completed 2021 -> eligible.',
    record: { title: 'Completed diversion', disposition: 'deferred', disposition_date: '2021-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_conviction_ks',
      reading: 'A completed diversion has a 3-year wait; 2021 past 3 years at 2026 -> eligible.',
    },
    now: NOW,
  },
];

const NM: Persona[] = [
  {
    source: 'Wave 6 — NM persona 1',
    package: '4th-degree felony possession 2019, done 2020 -> 4-yr wait met -> eligible.',
    record: { title: '4th-degree felony possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { excluded_nm: false, cannabis_nm: false, level_nm: 'deg4' },
    expect: {
      resultKey: 'eligible_conviction_nm',
      reading: 'A 4th-degree felony sits in the 4-year tier; done 2020, past 4 years at 2026 -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NM persona 2',
    package: 'dismissal 2024 -> eligible 2025.',
    record: { title: 'Dismissal', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_nm',
      reading: 'Non-convictions clear 1 year after final disposition; 2024 -> eligible 2025, met at 2026.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NM persona 3',
    package: 'DWI -> never — honest-no.',
    record: { title: 'DWI', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { excluded_nm: true },
    expect: {
      resultKey: 'ineligible_excluded_nm',
      reading: 'DWI is excluded entirely (even first-offense deferred); the excluded gate routes to the honest-no.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NM persona 4',
    package: 'cannabis possession 2019 -> should be auto-expunged — check.',
    record: { title: 'Cannabis possession (<=2 oz)', disposition: 'convicted', disposition_date: '2019-06-01' },
    answers: { excluded_nm: false, cannabis_nm: true },
    expect: {
      resultKey: 'check_cannabis_nm',
      reading: 'Minor cannabis possession is supposed to be automatic under § 29-3A-8; the tree routes it to the check-your-record result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NM persona 5',
    package: '2nd-degree felony 2014, done 2016 -> eligible 2024.',
    record: { title: '2nd-degree felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-06-01', probation_status: 'completed' },
    answers: { excluded_nm: false, cannabis_nm: false, level_nm: 'deg2' },
    expect: {
      resultKey: 'eligible_conviction_nm',
      reading: 'A 2nd-degree felony sits in the 8-year tier; done 2016 -> eligible 2024, met at 2026.',
    },
    now: NOW,
  },
];

const NE: Persona[] = [
  {
    source: 'Wave 6 — NE persona 1',
    package: 'felony probation completed -> set-aside eligible; record stays visible — the honest-yes-but.',
    record: { title: 'Felony, probation completed', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { pardoned_ne: false, sentence_ne: 'noncustody', setaside_excluded_ne: false },
    expect: {
      resultKey: 'eligible_setaside_ne',
      reading: 'A completed probation sentence is set-aside eligible under § 29-2264; the result states the honest "stays visible" caveat.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NE persona 2',
    package: '3-yr prison sentence -> pardon only.',
    record: { title: 'Felony, 3-year prison sentence', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01', prison_sentenced: true },
    answers: { pardoned_ne: false, sentence_ne: 'long_prison' },
    expect: {
      resultKey: 'ineligible_prison_ne',
      reading: 'Imprisonment over one year is beyond set-aside; the tree routes it to the pardon-only result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NE persona 3',
    package: 'dismissed charge -> § 29-3523 relief.',
    record: { title: 'Dismissed charge', disposition: 'dismissed', disposition_date: '2022-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_ne',
      reading: 'Non-convictions can be removed/sealed under § 29-3523; the tree routes dismissals to that eligible result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NE persona 4',
    package: 'pardoned conviction -> NOW sealable.',
    record: { title: 'Pardoned conviction', disposition: 'convicted', disposition_date: '2012-06-01' },
    answers: { pardoned_ne: true },
    expect: {
      resultKey: 'eligible_pardoned_ne',
      reading: 'A pardoned conviction is sealable since 2021; the pardon gate routes to the pardoned-sealable result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — NE persona 5',
    package: 'misdemeanor fine-only 2020, paid -> set-aside now.',
    record: { title: 'Misdemeanor, fine-only', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'none' },
    answers: { pardoned_ne: false, sentence_ne: 'noncustody', setaside_excluded_ne: false },
    expect: {
      resultKey: 'eligible_setaside_ne',
      reading: 'A fine-only sentence, paid, is set-aside eligible under § 29-2264 -> set-aside now.',
    },
    now: NOW,
  },
];

const ID: Persona[] = [
  {
    source: 'Wave 6 — ID persona 1',
    package: 'arrested 2023, never charged -> ISP request now, free.',
    record: { title: 'Arrested, never charged', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_id',
      reading: 'A no-charge/non-conviction clears through the ISP administrative request (§ 67-3004(10)); the tree routes it there.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — ID persona 2',
    package: 'misdemeanor possession 2018, everything paid 2019 -> shielding eligible 2024 — the 2023-law persona.',
    record: { title: 'Non-violent misdemeanor possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { shielding_type_id: 'nonviolent_misd' },
    expect: {
      resultKey: 'eligible_shielding_id',
      reading: 'A non-violent misdemeanor 5 conviction-free years past completion (paid 2019 -> eligible 2024) clears § 67-3004(11) shielding.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — ID persona 3',
    package: 'violent misdemeanor -> excluded; honest-no.',
    record: { title: 'Violent misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { shielding_type_id: 'violent_misd' },
    expect: {
      resultKey: 'ineligible_violent_id',
      reading: 'Assaultive/violent misdemeanors are excluded from shielding; the tree routes them to the honest-no.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — ID persona 4',
    package: 'withheld judgment completed -> move for dismissal; explain it\'s visible-but-dismissed.',
    record: { title: 'Withheld judgment completed', disposition: 'deferred', disposition_date: '2020-06-01' },
    answers: {},
    expect: {
      resultKey: 'withheld_id',
      reading: 'A completed withheld judgment moves to dismissal under § 19-2604; the result explains it is visible-but-dismissed.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — ID persona 5',
    package: 'old felony theft -> no path but pardon/commutation — honest-no.',
    record: { title: 'Old felony theft', charge_type: 'felony', disposition: 'convicted', disposition_date: '2010-06-01' },
    answers: { shielding_type_id: 'other' },
    expect: {
      resultKey: 'ineligible_nopath_id',
      reading: 'A felony outside shielding (not drug-possession) has no expungement path; the tree routes it to the pardon/commutation honest-no.',
    },
    now: NOW,
  },
];

const WV: Persona[] = [
  {
    source: 'Wave 6 — WV persona 1',
    package: 'single misdemeanor 2023, done -> 1-yr wait met -> eligible.',
    record: { title: 'Single misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { excluded_wv: false, prior_use_wv: false, accel_wv: false, level_wv: 'misd_single' },
    expect: {
      resultKey: 'eligible_misd_wv',
      reading: 'A single misdemeanor 3 years past completion clears the 1-year § 61-11-26 wait -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — WV persona 2',
    package: 'NV felony 2020 + completed recovery program -> 26a: eligible at 3 yrs (2023+), WSP fee waived — the fast-lane persona.',
    record: { title: 'Non-violent felony + completed recovery program', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { excluded_wv: false, prior_use_wv: false, accel_wv: true, level_accel_wv: 'felony' },
    expect: {
      resultKey: 'eligible_accel_wv',
      reading:
        'A non-violent ("NV") felony on the § 61-11-26a acceleration lane (recovery program completed) drops '
        + 'to a 3-year wait; 2020 -> eligible 2023, met at 2026, WSP fee waived -> eligible_accel_wv.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — WV persona 3',
    package: 'DV battery -> excluded.',
    record: { title: 'DV battery', disposition: 'convicted', disposition_date: '2019-06-01' },
    answers: { excluded_wv: true },
    expect: {
      resultKey: 'ineligible_excluded_wv',
      reading: 'DV assault/battery is on the § 61-11-26(c) exclusion list; the excluded gate routes to the ineligible result.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — WV persona 4',
    package: 'acquitted -> 60 days -> expunge.',
    record: { title: 'Acquitted', disposition: 'acquitted', disposition_date: '2024-06-01' },
    answers: {},
    expect: {
      resultKey: 'eligible_nonconv_wv',
      reading: 'An acquittal is expungeable 60 days after the case ended (§ 61-11-25); well past 60 days -> eligible.',
    },
    now: NOW,
  },
  {
    source: 'Wave 6 — WV persona 5',
    package: 'already used expungement once -> the ⚠️ once-ever branch.',
    record: { title: 'Prior expungement already used', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { excluded_wv: false, prior_use_wv: true },
    expect: {
      resultKey: 'complex_onceever_wv',
      reading:
        'The SCA-C900 once-only rule means a prior expungement may have used the single request; the prior-use '
        + 'gate routes to complex_onceever_wv, which hedges the scope for confirmation.',
    },
    now: NOW,
  },
];


// ---------------------------------------------------------------------------
// WAVE 7 — HI, NH, ME, MT, RI, SD, ND, AK, VT, WY (the final ten, completing 50)
// ---------------------------------------------------------------------------
const HI: Persona[] = [
  {
    source: 'Wave 7 — HI persona 1',
    package: 'arrested, charges dropped 2023 -> apply now, $35, 120 days.',
    record: { title: 'Arrest, charges dropped', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: { already_expunged_hi: false },
    expect: { resultKey: 'eligible_nonconv_hi', reading: 'A non-conviction gets an administrative "shall issue" HCJDC expungement -> the apply-now result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — HI persona 2',
    package: 'DANC plea, dismissed 2024 -> eligible 2025.',
    record: { title: 'DANC deferred plea', disposition: 'deferred', disposition_date: '2024-06-01' },
    answers: { already_expunged_hi: false },
    expect: { resultKey: 'eligible_deferred_hi', reading: 'A DANC deferred plea is expungeable 1 year after dismissal; 2024 -> eligible 2025, met at 2026.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — HI persona 3',
    package: 'misdemeanor conviction (ordinary) -> no path; honest-no + pardon note.',
    record: { title: 'Ordinary misdemeanor conviction', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { already_expunged_hi: false, conv_type_hi: 'ordinary' },
    expect: { resultKey: 'ineligible_conviction_hi', reading: 'An ordinary conviction is outside the narrow categories; the tree routes it to the honest-no (with the pardon-does-not-expunge note).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — HI persona 4',
    package: 'first-time drug offender sentenced under 706-622.5 -> court order -> HCJDC.',
    record: { title: 'First-time drug offender (706-622.5)', disposition: 'convicted', disposition_date: '2019-06-01' },
    answers: { already_expunged_hi: false, conv_type_hi: 'drug' },
    expect: { resultKey: 'eligible_conv_hi', reading: 'A first-time drug offender sentence is one of the three qualifying conviction categories -> court order then HCJDC.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — HI persona 5',
    package: 'expunged in 2023 but still on eCourt Kokua -> the pre-Act-003 sealing-request branch.',
    record: { title: 'Already expunged, still on eCourt Kokua', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: { already_expunged_hi: true },
    expect: { resultKey: 'sealing_request_hi', reading: 'A pre-Act-003 certificate needs a separate court-record sealing request; the opening gate routes it to sealing_request_hi.' },
    now: NOW,
  },
];

const NH: Persona[] = [
  {
    source: 'Wave 7 — NH persona 1',
    package: 'Class A misd 2020, done 2021 -> eligible 2024.',
    record: { title: 'Class A misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_nh: false, multi_nh: false, level_nh: 'misdA', misd_dv_nh: false, misdA_drug_nh: false },
    expect: { resultKey: 'eligible_nh', reading: 'A Class A misdemeanor clears the 3-year wait (done 2021 -> eligible 2024, met at 2026) -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — NH persona 2',
    package: 'B felony drug possession, done 2023 -> the 2-yr drug wait -> eligible 2025 — surprise-fast.',
    record: { title: 'Class B felony drug possession', charge_type: 'felony', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { excluded_nh: false, multi_nh: false, level_nh: 'felonyB', felonyB_drug_nh: true },
    expect: { resultKey: 'eligible_nh', reading: 'A drug felony under RSA 318-B:26 has an unusually short 2-year wait; done 2023 -> eligible 2025, met at 2026.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — NH persona 3',
    package: 'eligible in 8 months, eager -> the DON\'T-FILE-YET warning persona.',
    record: { title: 'Class A misdemeanor, not yet eligible', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-06-01', probation_status: 'completed' },
    answers: { excluded_nh: false, multi_nh: false, level_nh: 'misdA', misd_dv_nh: false, misdA_drug_nh: false },
    expect: { resultKey: 'waiting_nh', reading: 'A Class A misdemeanor done 2024 has not cleared the 3-year wait at 2026; the tree routes it to waiting_nh, which carries the red-letter do-not-file-early warning.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — NH persona 4',
    package: 'DV misdemeanor 2018 -> 10-yr wait -> 2028.',
    record: { title: 'Domestic-violence misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { excluded_nh: false, multi_nh: false, level_nh: 'misdA', misd_dv_nh: true },
    expect: { resultKey: 'waiting_nh', reading: 'A DV misdemeanor carries a 10-year wait; 2018 -> 2028, not met at 2026 -> waiting (do not file early).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — NH persona 5',
    package: 'dismissal 2024 -> already auto-annulled — check.',
    record: { title: 'Dismissal', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: { auto_annul_nh: true },
    expect: { resultKey: 'check_autoannul_nh', reading: 'A dismissal on/after Jan 1, 2019 is auto-annulled 30 days after disposition; the tree routes it to the check-your-record result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — NH persona 6 (Diana statute verification, RSA 651:5(III)(b), 7/16)',
    package: 'Class B misdemeanor, done 2023 -> 2-yr wait (III(b)) -> eligible 2025. [Referee item #2 resolution: the 1-vs-3 conflict was both sources wrong; III(b) = 2 years.]',
    record: { title: 'Class B misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { excluded_nh: false, multi_nh: false, level_nh: 'misdB' },
    expect: { resultKey: 'eligible_nh', reading: 'Diana verified the Class B misdemeanor wait at 2 years (RSA 651:5(III)(b)); done 2023 -> eligible 2025, met at 2026. Locks the resolved referee item.' },
    now: NOW,
  },
];

const ME: Persona[] = [
  {
    source: 'Wave 7 — ME persona 1',
    package: 'Class E theft 2019 at age 45, done 2020 -> eligible 2024 under the new law — the age-cap-repeal persona.',
    record: { title: 'Class E theft (age 45)', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { conv_type_me: 'classE', classE_sexual_me: false },
    expect: { resultKey: 'eligible_classE_me', reading: 'The 2024 repeal removed the 18-27 age cap, so a Class E conviction 4 years past sentence (done 2020 -> 2024) is sealable regardless of age; the tree asks no age question.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ME persona 2',
    package: 'Class D assault -> no sealing; pardon path.',
    record: { title: 'Class D assault', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { conv_type_me: 'other' },
    expect: { resultKey: 'ineligible_conviction_me', reading: 'A Class D conviction is not a sealable class in Maine; the tree routes it to the no-sealing/pardon result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ME persona 3',
    package: 'pre-2017 Class D marijuana -> sealable.',
    record: { title: 'Pre-2017 Class D marijuana', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { conv_type_me: 'marijuana' },
    expect: { resultKey: 'eligible_marijuana_me', reading: 'Class D/E marijuana convictions from before Jan 30, 2017 are sealable; the tree routes them there.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ME persona 4',
    package: 'dismissal -> already confidential by classification — explain, don\'t file.',
    record: { title: 'Dismissal', disposition: 'dismissed', disposition_date: '2022-06-01' },
    answers: {},
    expect: { resultKey: 'already_confidential_me', reading: 'Non-convictions are confidential by classification (16 M.R.S. § 703); the tree explains you likely need not file.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ME persona 5',
    package: 'OUI -> no sealing, no pardon — the double honest-no.',
    record: { title: 'OUI', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { conv_type_me: 'oui' },
    expect: { resultKey: 'ineligible_oui_me', reading: 'OUI is neither a sealable class nor one the Board of Pardons will consider; the tree routes it to the double honest-no.' },
    now: NOW,
  },
];

const MT: Persona[] = [
  {
    source: 'Wave 7 — MT persona 1',
    package: 'two misdemeanors 2017, done 2018, clean -> presumed-eligible for the one lifetime shot — bundle both.',
    record: { title: 'Two misdemeanors', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { level_mt: 'misd', misd_prioruse_mt: false, misd_military_mt: false, misd_discretionary_mt: false },
    expect: { resultKey: 'eligible_presumed_mt', reading: 'Non-listed misdemeanors 5 conviction-free years past completion (2018 -> 2023) are presumed eligible; the result says to bundle both into the one lifetime order.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — MT persona 2',
    package: 'DUI misdemeanor -> discretionary branch, not barred.',
    record: { title: 'DUI misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { level_mt: 'misd', misd_prioruse_mt: false, misd_military_mt: false, misd_discretionary_mt: true },
    expect: { resultKey: 'eligible_discretionary_mt', reading: 'DUI is not presumed but not barred — it routes to the discretionary branch, and with the 5-year wait met (2018) reaches the discretionary-eligible result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — MT persona 3',
    package: 'enlisting in the Guard, conviction blocking -> immediate petition — the military persona.',
    record: { title: 'Conviction blocking enlistment', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-06-01' },
    answers: { level_mt: 'misd', misd_prioruse_mt: false, misd_military_mt: true },
    expect: { resultKey: 'eligible_military_mt', reading: 'A military applicant blocked by the record may petition immediately with no wait; the military gate routes to eligible_military_mt.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — MT persona 4',
    package: 'felony -> honest-no (deferred/pardon notes).',
    record: { title: 'Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_mt: 'felony' },
    expect: { resultKey: 'ineligible_felony_mt', reading: 'Montana does not expunge felonies; the tree routes them to the honest-no (deferred-imposition dismissal / rare pardon).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — MT persona 5',
    package: 'already used the lifetime shot -> done forever.',
    record: { title: 'Lifetime expungement already used', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { level_mt: 'misd', misd_prioruse_mt: true },
    expect: { resultKey: 'ineligible_prioruse_mt', reading: 'The once-per-lifetime misdemeanor expungement, once used, bars another; the prior-use gate routes to the ineligible result.' },
    now: NOW,
  },
];

const RI: Persona[] = [
  {
    source: 'Wave 7 — RI persona 1',
    package: 'single misdemeanor 2018, done -> 5-yr met -> eligible (judge discretion caveat).',
    record: { title: 'Single misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { conv_count_ri: 'first', firstoffender_level_ri: 'misd', fo_violence_misd_ri: false },
    expect: { resultKey: 'eligible_firstoffender_ri', reading: 'A first-offender misdemeanor 5 years past completion (2018 -> 2023) is eligible; the result names the discretionary good-character caveat.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — RI persona 2',
    package: 'three misdemeanors, last sentence done 2015 -> 10-yr multi path -> eligible 2025.',
    record: { title: 'Three misdemeanors', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-06-01', probation_status: 'completed' },
    answers: { conv_count_ri: 'multimisd', multimisd_dv_ri: false },
    expect: { resultKey: 'eligible_multimisd_ri', reading: 'The multi-misdemeanor lane expunges any/all 10 years after the last sentence (2015 -> 2025, met at 2026) -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — RI persona 3',
    package: 'single felony larceny 2012, clean -> eligible 2022+; but burglary -> never.',
    record: { title: 'Single felony larceny', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-06-01', probation_status: 'completed' },
    answers: { conv_count_ri: 'first', firstoffender_level_ri: 'felony', fo_violence_felony_ri: false },
    expect: { resultKey: 'eligible_firstoffender_ri', reading: 'A first-offender non-violence felony (larceny) 10 years past completion (2012 -> 2022) is eligible; burglary would answer the violence gate "yes" and be barred.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — RI persona 4',
    package: 'dismissal March 2023 -> should be auto-sealed — check.',
    record: { title: 'Rule 48(a) dismissal', disposition: 'dismissed', disposition_date: '2023-03-01' },
    answers: { dismissal_ri: true },
    expect: { resultKey: 'check_autoseal_ri', reading: 'A Rule 48(a) dismissal on/after Jan 1, 2023 auto-seals; the cutoff gate routes it to the check-your-record result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — RI persona 5',
    package: 'DUI misdemeanor + 2 others -> DUI blocked from the multi path — the nuance persona.',
    record: { title: 'DUI plus two other misdemeanors', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-06-01', probation_status: 'completed' },
    answers: { conv_count_ri: 'multimisd', multimisd_dv_ri: true },
    expect: { resultKey: 'complex_multimisd_excluded_ri', reading: 'DUI is excluded from the multi-misdemeanor lane but may qualify individually; the tree routes the mixed record to the nuance/get-help result.' },
    now: NOW,
  },
];

const SD: Persona[] = [
  {
    source: 'Wave 7 — SD persona 1',
    package: 'arrested 2023, never charged -> eligible 2024.',
    record: { title: 'Arrested, never charged', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: {},
    expect: { resultKey: 'eligible_dismissal_sd', reading: 'A no-charge arrest is expungeable 1 year later (2023 -> 2024, met at 2026) -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — SD persona 2',
    package: 'Class 2 misdemeanor 2018, conditions done -> possibly auto-removed already — check-record branch (and the 5-vs-10 ⚠️).',
    record: { title: 'Class 2 misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { conv_type_sd: 'auto' },
    expect: { resultKey: 'check_autoremoval_sd', reading: 'Petty/ordinance/Class-2 offenses auto-remove under § 23A-3-34; the tree routes to a check-record result and does not assert the 5-vs-10-year wait.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — SD persona 3',
    package: 'Class 1 misdemeanor conviction -> honest-no (pardon note).',
    record: { title: 'Class 1 misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-06-01' },
    answers: { conv_type_sd: 'other' },
    expect: { resultKey: 'ineligible_conviction_sd', reading: 'A Class 1 misdemeanor is above the auto-remove level and has no general path; the tree routes it to the honest-no (pardon note).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — SD persona 4',
    package: 'suspended imposition completed -> sealed — confirm it happened.',
    record: { title: 'Suspended imposition completed', disposition: 'deferred', disposition_date: '2019-06-01' },
    answers: {},
    expect: { resultKey: 'check_deferred_sd', reading: 'A completed suspended imposition is sealed on completion; the tree routes it to the confirm-it-happened result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — SD persona 5',
    package: 'felony -> pardon only.',
    record: { title: 'Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { conv_type_sd: 'other' },
    expect: { resultKey: 'ineligible_conviction_sd', reading: 'A felony has no general conviction expungement in South Dakota; the tree routes it to the pardon-only honest-no.' },
    now: NOW,
  },
];

const ND: Persona[] = [
  {
    source: 'Wave 7 — ND persona 1',
    package: 'misdemeanor 2020, probation done 2021 -> 3-yr met -> eligible, free.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_nd: false, level_nd: 'misd' },
    expect: { resultKey: 'eligible_nd', reading: 'A misdemeanor 3 conviction-free years past completion (2021 -> 2024) is sealable; the result notes filing is free.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ND persona 2',
    package: 'C felony theft 2017, done 2019 -> 5-yr met -> eligible.',
    record: { title: 'Class C felony theft', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { excluded_nd: false, level_nd: 'felony' },
    expect: { resultKey: 'eligible_nd', reading: 'A felony 5 conviction-free years past completion (2019 -> 2024) is sealable -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ND persona 3',
    package: 'DUI misdemeanor 2021 -> sealable 2024+ — the surprise-yes.',
    record: { title: 'DUI misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-06-01', probation_status: 'completed' },
    answers: { excluded_nd: false, level_nd: 'misd' },
    expect: { resultKey: 'eligible_nd', reading: 'DUI is not excluded in North Dakota (rare); as a misdemeanor 3 years past completion (2021 -> 2024) it is sealable -> the surprise-yes.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ND persona 4',
    package: 'dismissal September 2025 -> auto-closes in 61 days — wait, don\'t file.',
    record: { title: 'Dismissal, Sept 2025', disposition: 'dismissed', disposition_date: '2025-09-01' },
    answers: { nonconv_cutoff_nd: true },
    expect: { resultKey: 'check_autoclose_nd', reading: 'A non-conviction order on/after Aug 1, 2025 auto-closes 61 days later (HB 1166); the cutoff gate routes it to the wait-do-not-file result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — ND persona 5',
    package: 'old 2018 dismissal -> petition, 10-day mandatory grant.',
    record: { title: 'Old 2018 dismissal', disposition: 'dismissed', disposition_date: '2018-06-01' },
    answers: { nonconv_cutoff_nd: false },
    expect: { resultKey: 'petition_nonconv_nd', reading: 'A pre-Aug-2025 non-conviction is petitioned with a mandatory 10-day grant; the cutoff gate routes it to the petition result.' },
    now: NOW,
  },
];

const AK: Persona[] = [
  {
    source: 'Wave 7 — AK persona 1',
    package: 'entire case dismissed 2023 -> TF-810 CourtView removal — the one real win.',
    record: { title: 'Entire case dismissed', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: { mistaken_ak: false, courtview_ak: true },
    expect: { resultKey: 'eligible_courtview_ak', reading: 'An entire case ending without a conviction qualifies for CourtView removal (TF-810); the tree routes it there — the one real win.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — AK persona 2',
    package: 'misdemeanor conviction, probation done under SIS -> set aside, still visible — expectation-setting.',
    record: { title: 'SIS completed', disposition: 'deferred', disposition_date: '2019-06-01' },
    answers: {},
    expect: { resultKey: 'sis_setaside_ak', reading: 'A completed SIS is set aside as of right, but per Journey the record stays visible; the tree routes it to the set-aside-but-visible result.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — AK persona 3',
    package: 'any ordinary conviction -> no path; pardon effectively unavailable.',
    record: { title: 'Ordinary conviction', disposition: 'convicted', disposition_date: '2015-06-01' },
    answers: { conv_marijuana_ak: false, conv_sis_ak: false },
    expect: { resultKey: 'ineligible_conviction_ak', reading: 'An ordinary conviction has no path (no expungement law; pardons effectively unavailable, ~188 ever, none since 2006) -> the deepest honest-no.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — AK persona 4',
    package: 'mistaken-identity arrest -> § 12.62.180 sealing.',
    record: { title: 'Mistaken-identity arrest', disposition: 'dismissed', disposition_date: '2022-06-01' },
    answers: { mistaken_ak: true },
    expect: { resultKey: 'eligible_sealing_ak', reading: 'A record from mistaken identity/false accusation is the one sealing path (§ 12.62.180); the mistaken-ID gate routes it there.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — AK persona 5',
    package: 'old marijuana possession -> the 2024 non-publication branch ⚠️.',
    record: { title: 'Old marijuana possession', disposition: 'convicted', disposition_date: '2013-06-01' },
    answers: { conv_marijuana_ak: true },
    expect: { resultKey: 'marijuana_ak', reading: 'A decriminalized marijuana-possession conviction routes to the 2024 non-publication branch (scope flagged).' },
    now: NOW,
  },
];

const VT: Persona[] = [
  {
    source: 'Wave 7 — VT persona 1',
    package: 'misdemeanor possession 2021, done 2022 -> sealed 2025 under the NEW 3-yr rule (old law said 2027 — show the delta).',
    record: { title: 'Misdemeanor possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-06-01', probation_status: 'completed' },
    answers: { nolonger_crime_vt: false, age_vt: false, level_vt: 'misd', misd_dui_vt: false },
    expect: { resultKey: 'eligible_seal_vt', reading: 'Act 60 dropped the qualifying-misdemeanor wait to 3 years; done 2022 -> sealed 2025 (old 5-year rule said 2027) -> eligible at 2026.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — VT persona 2',
    package: 'felony grand larceny 2016, done 2018 -> 7-yr -> eligible 2025.',
    record: { title: 'Felony grand larceny', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-06-01', probation_status: 'completed' },
    answers: { nolonger_crime_vt: false, age_vt: false, level_vt: 'felony' },
    expect: { resultKey: 'eligible_seal_vt', reading: 'A qualifying non-violent felony has a 7-year wait; done 2018 -> eligible 2025, met at 2026.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — VT persona 3',
    package: '19-yr-old, qualifying misdemeanor, sentence done last month -> 30-day petition — fastest conviction relief in the nation.',
    record: { title: '19-year-old qualifying misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2026-05-01', probation_status: 'completed' },
    answers: { nolonger_crime_vt: false, age_vt: true },
    expect: { resultKey: 'eligible_seal_vt', reading: 'An 18-21 offender can petition after just 30 days; sentence done ~2 months ago clears 30 days -> eligible (the fastest conviction relief).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — VT persona 4',
    package: 'DUI misdemeanor 2014 -> 10-yr -> eligible.',
    record: { title: 'DUI misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-06-01', probation_status: 'completed' },
    answers: { nolonger_crime_vt: false, age_vt: false, level_vt: 'misd', misd_dui_vt: true },
    expect: { resultKey: 'eligible_seal_vt', reading: 'A misdemeanor DUI has a 10-year wait; 2014 -> eligible 2024, met at 2026.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — VT persona 5',
    package: 'conduct no longer criminal -> immediate expungement.',
    record: { title: 'Conduct no longer criminal', disposition: 'convicted', disposition_date: '2015-06-01', probation_status: 'completed' },
    answers: { nolonger_crime_vt: true },
    expect: { resultKey: 'eligible_expunge_vt', reading: 'Conviction for conduct no longer a crime gets immediate full expungement (record destroyed) under Act 60.' },
    now: NOW,
  },
];

const WY: Persona[] = [
  {
    source: 'Wave 7 — WY persona 1',
    package: 'misdemeanor 2018, done 2019 -> 5-yr met -> the one lifetime misdemeanor shot — bundle.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-06-01', probation_status: 'completed' },
    answers: { level_wy: 'misd', misd_prioruse_wy: false, misd_status_wy: false, misd_excluded_wy: false },
    expect: { resultKey: 'eligible_misd_wy', reading: 'A non-excluded misdemeanor 5 years past sentence (2019 -> 2024) is eligible; the result names the once-per-lifetime bundle advice.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — WY persona 2',
    package: 'same-occurrence C felonies 2012, restitution paid -> 10-yr met -> $300, 90 days.',
    record: { title: 'Same-occurrence Class C felonies', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-06-01', probation_status: 'completed', restitution_paid: true },
    answers: { level_wy: 'felony', felony_excluded_wy: false, felony_history_wy: false },
    expect: { resultKey: 'eligible_felony_wy', reading: 'Non-excluded felonies from a single occurrence with no other felony history, 10 years past sentence with restitution paid (2012 -> 2022), are eligible ($300, 90 days).' },
    now: NOW,
  },
  {
    source: 'Wave 7 — WY persona 3',
    package: 'MIP at 19 (status) -> 1-yr wait.',
    record: { title: 'MIP (status offense)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-06-01', probation_status: 'completed' },
    answers: { level_wy: 'misd', misd_prioruse_wy: false, misd_status_wy: true },
    expect: { resultKey: 'eligible_misd_wy', reading: 'A status offense (MIP) has a 1-year wait; 2023 -> 2024, met at 2026 -> eligible.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — WY persona 4',
    package: 'DV misdemeanor 2017 -> expungable + firearms restoration — the WY-specific persona.',
    record: { title: 'DV misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-06-01', probation_status: 'completed' },
    answers: { level_wy: 'misd', misd_prioruse_wy: false, misd_status_wy: false, misd_excluded_wy: false },
    expect: { resultKey: 'eligible_misd_wy', reading: 'DV misdemeanors ARE expungable in Wyoming (not a firearm-use exclusion); 5 years past sentence (2017 -> 2022) -> eligible, and expungement lifts the federal firearm bar.' },
    now: NOW,
  },
  {
    source: 'Wave 7 — WY persona 5',
    package: 'two felony convictions from different years -> never; honest-no.',
    record: { title: 'Two felonies, different years', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-06-01' },
    answers: { level_wy: 'felony', felony_excluded_wy: false, felony_history_wy: true },
    expect: { resultKey: 'ineligible_felonyhistory_wy', reading: 'Wyoming expunges only single-occurrence felonies with no other felony history; two felonies from different years -> never (honest-no).' },
    now: NOW,
  },
];


const SUITES: Array<[string, Persona[]]> = [['CA', CA], ['AZ', AZ], ['NY', NY], ['TX', TX], ['UT', UT], ['MI', MI], ['PA', PA], ['NJ', NJ], ['CO', CO], ['CT', CT], ['DE', DE], ['OK', OK], ['VA', VA], ['MN', MN], ['FL', FL], ['IL', IL], ['OH', OH], ['GA', GA], ['NC', NC], ['WA', WA], ['TN', TN], ['MA', MA], ['IN', IN], ['MO', MO], ['MD', MD], ['WI', WI], ['SC', SC], ['AL', AL], ['LA', LA], ['KY', KY], ['OR', OR], ['IA', IA], ['NV', NV], ['AR', AR], ['MS', MS], ['KS', KS], ['NM', NM], ['NE', NE], ['ID', ID], ['WV', WV], ['HI', HI], ['NH', NH], ['ME', ME], ['MT', MT], ['RI', RI], ['SD', SD], ['ND', ND], ['AK', AK], ['VT', VT], ['WY', WY]];

for (const [code, personas] of SUITES) {
  describe(`Wave 0 personas — ${code}`, () => {
    test.each(personas)('$source: $package', (p) => {
      expect(keyOf(code, run(code, p))).toBe(p.expect.resultKey);
    });
  });
}

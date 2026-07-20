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
    source: 'UT 7/19 statute-verified — persona 1 (class B clean-slate automatic)',
    package: 'class B misd theft, 6 yrs clean, fines paid -> automatic clean-slate eligible; court/BCI-only scope note.',
    record: { title: 'Class B Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'b', cs_b_ut: false, cb_date_ut: '2020-01-01', cb_auto_date_ut: '2020-01-01' },
    expect: { resultKey: 'eligible_auto_ut', reading: 'Class B, not clean-slate-excluded, 6yr passes both the 4yr petition and 6yr automatic (§ 205) -> eligible_auto_ut. Copy carries the § 207(4) court/BCI-only scope limit + petition-for-full-agency-clearance.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 2 (class B, wants full agency clearance -> petition 303)',
    package: 'same class B but the person wants the arresting agency cleared too -> petition route via § 303 (4yr B wait met).',
    record: { title: 'Class B Misdemeanor (agency clearance wanted)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'b', cs_b_ut: false, cb_date_ut: '2020-01-01', cb_auto_date_ut: '2020-01-01' },
    expect: { resultKey: 'eligible_auto_ut', reading: 'Same routing as persona 1 -> eligible_auto_ut, whose copy explains that automatic clears courts/BCI only (§ 207) and a § 303 petition (4yr B, met) reaches ALL agencies via § 307 — the reason to petition.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 3 (class A 76-18-207 possession -> the only class A that is automatic)',
    package: 'class A misd drug possession (§ 76-18-207), 7 yrs -> automatic eligible (the ONLY class A on the clean-slate track).',
    record: { title: 'Class A Drug Possession (§ 76-18-207)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'a_drug', a_drug_date_ut: '2019-01-01', a_drug_auto_date_ut: '2019-01-01' },
    expect: { resultKey: 'eligible_auto_ut', reading: 'Class A 76-18-207 possession is the one class A on the automatic track: petition 5yr + automatic 7yr both met (2019) -> eligible_auto_ut.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 4 (class A assault -> automatic excluded, petition 5yr)',
    package: 'class A misd assault (Title 76 Ch. 5) -> not on the clean-slate track, petition § 303 at 5yr.',
    record: { title: 'Class A Assault', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'a_other', a_other_date_ut: '2020-01-01' },
    expect: { resultKey: 'eligible_petition_ut', reading: 'A class A non-drug (assault) is not clean-slate-eligible; petition-only at 5yr (2020+5=2025<2026) -> eligible_petition_ut (BCI cert then petition).' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 5 (DV misd + protective order -> disqualified)',
    package: 'DV misdemeanor with a protective order in effect -> automatic-excluded, and the § 303 protective-order disqualifier blocks the petition too.',
    record: { title: 'Domestic Violence Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: true },
    expect: { resultKey: 'ineligible_protective_ut', reading: 'A DV misd is clean-slate-excluded (§ 205(3)(f)(viii)); § 303 has no DV exclusion, but ANY protective order/stalking injunction in effect disqualifies -> ineligible_protective_ut (a timing bar).' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 6 (unpaid restitution -> blocked both tracks)',
    package: 'otherwise clean-slate-eligible class B but restitution unpaid -> automatic blocked (receivable) AND cert blocked (§ 303(1)(b)).',
    record: { title: 'Class B (restitution owed)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: false },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false },
    expect: { resultKey: 'ineligible_restitution_ut', reading: 'Unpaid restitution is a hard gate on both tracks (§ 303(1)(b); § 205 unsatisfied-receivable exclusion). restitution_ut reads restitution_paid=false -> ineligible_restitution_ut. Fully within the person\'s control to clear.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 7 (2 non-drug felonies -> count limit)',
    package: '2 non-drug felonies in separate episodes -> cert denied at the § 303(4) count-limit master gate.',
    record: { title: 'Second Non-Drug Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'over_limits' },
    expect: { resultKey: 'ineligible_counts_ut', reading: 'Two non-drug felonies is clause (a) of the § 303(4) cap -> ineligible_counts_ut. The gate fires before any per-conviction check.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 8 (2 felonies BUT 10 yrs clean -> decade bump, eligible)',
    package: 'same 2 non-drug felonies but 10+ years clean -> the § 303(7) decade bump raises the limit to 3, so within limits -> eligible felony petition.',
    record: { title: 'Non-Drug Felony (10 yrs clean)', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'felony', felony_date_ut: '2015-01-01' },
    expect: { resultKey: 'eligible_petition_ut', reading: 'DECADE BUMP: 10 yrs clean raises the 2-felony limit to 3, so the person answers within -> felony 7yr wait (2015+7=2022<2026) -> eligible_petition_ut.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 9 (3rd-degree felony 7yr -> cert eligible)',
    package: 'eligible 3rd-degree felony, 7 yrs from release -> § 303 cert eligible.',
    record: { title: 'Third-Degree Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'felony', felony_date_ut: '2019-01-01' },
    expect: { resultKey: 'eligible_petition_ut', reading: 'Eligible felony, 7yr from conviction/release (2019+7=2026-01<2026-07) -> eligible_petition_ut (BCI cert, then petition; reaches all agencies).' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 10 (first-degree felony -> never)',
    package: 'first-degree felony -> never-eligible (§ 303(2)(a)).',
    record: { title: 'First-Degree Felony', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: true },
    expect: { resultKey: 'ineligible_never_ut', reading: 'First-degree felony is on the § 303(2)(a) never-list -> ineligible_never_ut (notes the age-14-17 exception and pardon).' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 11 (registerable at application -> never)',
    package: 'offense requiring sex/kidnap/child-abuse registration at application time -> never-eligible.',
    record: { title: 'Registerable Offense', charge_type: 'felony', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: true },
    expect: { resultKey: 'ineligible_never_ut', reading: 'The registration bar (§ 303(2)(a)) applies whether registration was required at sentencing OR now -> ineligible_never_ut.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 12 (acquittal 61 days -> § 206 automatic)',
    package: 'acquittal on all charges, 61 days ago -> automatic expungement (§ 206, 60 days).',
    record: { title: 'Acquittal', disposition: 'acquitted', disposition_date: '2026-05-10' },
    answers: {},
    expect: { resultKey: 'eligible_acquittal_auto_ut', reading: 'Acquittal-all + 60 days (61 elapsed) -> § 77-40a-206 automatic expungement, no petition/cert/fee. NGRI excluded; courts/BCI only unless you petition.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 13 (dismissal without prejudice 180 days -> § 302 cert)',
    package: 'dismissed without prejudice, prosecutor silent, 180+ days -> § 302 non-conviction certificate path.',
    record: { title: 'Dismissed Without Prejudice', disposition: 'dismissed', disposition_date: '2025-11-01' },
    answers: { dismissal_prejudice_ut: 'without', dismiss_wop_date_ut: '2025-11-01' },
    expect: { resultKey: 'eligible_noncon_cert_ut', reading: 'Dismissal without prejudice + 180 days (or prosecutor consent) -> § 77-40a-302 non-conviction certificate (no issuance fee), then petition -> eligible_noncon_cert_ut.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 14 (DUI misd -> 10yr petition)',
    package: 'misdemeanor DUI, 11 yrs from release -> § 303 10-year wait met (excluded from both traffic deletion and clean-slate).',
    record: { title: 'Misdemeanor DUI', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: false, never_ut: false, count_limits_ut: 'within', supervision_ut: false, protective_ut: false, offense_level_ut: 'dui', dui_date_ut: '2015-01-01' },
    expect: { resultKey: 'eligible_petition_ut', reading: 'Misd DUI is petition-only at 10yr (2015+10=2025<2026) -> eligible_petition_ut. DUI is excluded from the § 101(24) traffic definition and from clean-slate, so neither free track reaches it.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 15 (pending felony -> blocks all but traffic)',
    package: 'non-traffic conviction with a pending felony charge -> blocked (pending gate); traffic deletion is the only exception.',
    record: { title: 'Class B (pending felony charge)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { traffic_conv_ut: false, pending_ut: true },
    expect: { resultKey: 'ineligible_pending_ut', reading: 'A pending case blocks expungement -> ineligible_pending_ut; the result notes that an eligible TRAFFIC offense is deleted regardless of pending charges (§ 202), the one exception.' },
    now: NOW,
  },
  {
    source: 'UT 7/19 statute-verified — persona 16 (traffic deletion)',
    package: 'class B traffic offense (not DUI), 7 yrs -> automatic DELETION under § 202.',
    record: { title: 'Class B Traffic Offense', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-06-01' },
    answers: { traffic_conv_ut: true, traffic_class_ut: 'b', traffic_b_date_ut: '2019-06-01' },
    expect: { resultKey: 'eligible_traffic_deletion_ut', reading: 'A non-DUI class B traffic offense is DELETED (not sealed) automatically at 6yr (§ 202) -> eligible_traffic_deletion_ut. Works even with pending charges; DUI is excluded from the traffic definition.' },
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
    source: 'CO 7/18 statute-verified — persona 1 (felony 10yr auto — reverse inversion)',
    package: 'class 5 felony theft, 11 yrs clean → past the 10-yr automatic mark → check-record (the felony-period conflict is now RESOLVED to the 3-yr tier).',
    record: { title: 'Theft (class 5 felony)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      excluded_co: false, intervening_co: false, restitution_co: false,
      level_co: 'felony_3', felony_3_date_co: '2015-07-15', felony_3_auto_co: '2015-07-15',
    },
    expect: {
      resultKey: 'check_record_first_co',
      reading:
        'FELONY PERIOD RESOLVED: class 5 felony = 3-yr petition tier, 10-yr automatic. 11 yrs is past '
        + 'BOTH, so it lands on check_record_first_co (may already be auto-sealed; confidential '
        + 'coloradojudicial.gov lookup). The old null-period complex_felony_period_co is deleted. '
        + 'This is the "10yr auto passing where the petition already passed" direction.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 2 (misd shall-seal, faster-to-file)',
    package: 'class 2 misdemeanor, 3 yrs clean → past 2-yr petition, short of 7-yr automatic → shall-seal petition beats waiting.',
    record: { title: 'Class 2 Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: {
      excluded_co: false, intervening_co: false, restitution_co: false,
      level_co: 'misd_23', date_2_co: '2023-07-15', date_2_auto_co: '2023-07-15',
    },
    expect: {
      resultKey: 'eligible_petition_shall_co',
      reading:
        'Class 2/3 misdemeanor: 2-yr petition (met at 3yr), 7-yr automatic (not met). Shall-seal absent '
        + 'DA objection (706(1)(f)(II)); filing beats waiting. Carries the $65-waivable fee and the '
        + 'mandatory-unseal caveat.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 3 (DUI excluded)',
    package: 'DUI → § 706(2) exclusion, and a DUI is not a misdemeanor/petty for the bypass → flat ineligible.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: true, excluded_level_co: false },
    expect: {
      resultKey: 'ineligible_serious_co',
      reading:
        'DUI/DWAI on the § 706(2) list; the exclusion split routes traffic/DUI categories to '
        + 'ineligible_serious_co (excluded_level_co = no). Result keeps the DUI-surprises-people line and '
        + 'the pre-2013-drug-reclassification note.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 4 (DV misdemeanor → bypass)',
    package: 'DV MISDEMEANOR → excluded on the ordinary track, but 706(2)(b) opens the second door → dv_bypass_co, NOT flat ineligible (regression-lock).',
    record: { title: 'Domestic Violence Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: true, excluded_level_co: true },
    expect: {
      resultKey: 'dv_bypass_co',
      reading:
        'EXCLUSION SPLIT: a DV misdemeanor is on the list, but as a misdemeanor it reaches the '
        + '706(2)(b) bypass (DA consent or clear-and-convincing showing; People v. C.H.). The old tree '
        + 'flat-ineligibled it — regression-locked.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 5 (non-conviction)',
    package: 'dismissed case 2023, not competency → simplified/auto non-conviction path.',
    record: { title: 'Dismissed Case', disposition: 'dismissed', disposition_date: '2023-06-01' },
    answers: { noncon_competency_co: false },
    expect: {
      resultKey: 'eligible_nonconviction_co',
      reading:
        'Non-competency dismissal → § 705 own-motion sealing / CBI auto-seal / free written-motion '
        + 'backstop. May already be done — check CBI. Now statute-cited to 705/704/13-3-117(5).',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 6 (felony 3-yr tier, faster-to-file)',
    package: 'class 4 felony, 4 yrs clean → past 3-yr petition, short of 10-yr automatic → discretionary petition beats waiting.',
    record: { title: 'Class 4 Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      excluded_co: false, intervening_co: false, restitution_co: false,
      level_co: 'felony_3', felony_3_date_co: '2022-07-15', felony_3_auto_co: '2022-07-15',
    },
    expect: {
      resultKey: 'eligible_petition_discretion_co',
      reading:
        'Class 4 felony = 3-yr petition tier (met at 4yr), 10-yr automatic (not met) → eligible_petition_'
        + 'discretion_co with (1)(g) balancing. The "petition passed, auto not — faster to file" direction.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 7 (L2 drug felony 5-yr tier — the split)',
    package: 'level 2 drug felony, 4 yrs clean → the (1)(b)(IV) catchall 5-yr tier is NOT met (a class 4 felony at the same 4 yrs WOULD pass the 3-yr tier) → waiting.',
    record: { title: 'Level 2 Drug Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      excluded_co: false, intervening_co: false, restitution_co: false,
      level_co: 'felony_5', felony_5_date_co: '2022-07-15',
    },
    expect: {
      resultKey: 'waiting_co',
      reading:
        'FELONY SPLIT: level 2 drug felony rides the 5-yr (1)(b)(IV) catchall, not the 3-yr tier. 4 yrs '
        + '< 5 → waiting. Same 4-yr date on a class 4 felony (persona 6) passes — that is the 3-vs-5 split.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 8 (restitution gate)',
    package: 'eligible class 2 misdemeanor, time met, BUT restitution still owed → blocked at the restitution gate.',
    record: { title: 'Class 2 Misdemeanor (restitution owed)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: false },
    answers: { excluded_co: false, intervening_co: false, restitution_co: true },
    expect: {
      resultKey: 'ineligible_restitution_co',
      reading:
        'RESTITUTION GATE: owed restitution blocks conviction sealing (706(1)(e)) unless the order is '
        + 'vacated — even when the waiting period is met. Result stresses that unpaid fines/costs/fees do '
        + 'NOT block (703(12)(b)).',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 9 (intervening → § 709 track)',
    package: 'record with an intervening conviction, highest offense a misdemeanor, latest conviction 6 yrs ago → the § 709 multi-conviction track, 5-yr tier met.',
    record: { title: 'Misdemeanor (with a later conviction)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: false, intervening_co: true, seven09_level_co: 'misd', date_709_5_co: '2020-07-15' },
    expect: {
      resultKey: 'eligible_709_co',
      reading:
        'INTERVENING → § 709, not a dead end. Highest offense misdemeanor → 5-yr tier from the latest-in-'
        + 'time conviction (2020+5=2025<2026) → eligible_709_co. Copy carries the prior-conviction caps '
        + '(709(3)) and restitution bar (709(4)(b)).',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 10 (marijuana shall-seal)',
    package: 'marijuana possession, 3 yrs → shall-seal petty tier regardless of classification (706(1)(f)(I)).',
    record: { title: 'Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: false, intervening_co: false, restitution_co: false, level_co: 'marijuana', date_mj_co: '2023-07-15' },
    expect: {
      resultKey: 'eligible_petition_shall_co',
      reading:
        'MARIJUANA: notwithstanding part 7, the court SHALL seal on a clean record (706(1)(f)(I)), petty '
        + 'tier (1yr) regardless of classification. 3yr > 1yr → eligible_petition_shall_co.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 11 (municipal second-chance)',
    package: 'municipal offense with a later non-felony non-DV conviction, subsequent case 11 yrs ago → § 708(2) second-chance track at 10 yrs → eligible.',
    record: { title: 'Municipal Ordinance Violation', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { excluded_co: false, intervening_co: false, restitution_co: false, level_co: 'municipal', muni_subsequent_co: true, muni_2ndchance_co: true, muni_2nd_date_co: '2015-07-15' },
    expect: {
      resultKey: 'eligible_municipal_2nd_co',
      reading:
        'MUNICIPAL SECOND-CHANCE (§ 708(2)): a later non-felony, non-DV/USB/child-abuse conviction, and '
        + 'this municipal offense not DV-based → sealable 10 yrs after the subsequent case (2015+10=2025<2026).',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 12 (pardon shall-seal presumption)',
    package: 'pardoned offense → § 710 motion any time, no fee, shall-seal presumption.',
    record: { title: 'Pardoned Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: { excluded_co: false, intervening_co: false, restitution_co: false, level_co: 'pardoned' },
    expect: {
      resultKey: 'eligible_pardon_co',
      reading:
        'PARDON cite fixed to § 24-72-710: after a full/unconditional pardon the presumption flips — court '
        + 'SHALL seal unless clear-and-convincing public interest outweighs privacy + adverse consequences + '
        + 'intent of the pardon (710(3)). No fee.',
    },
    now: NOW,
  },
  {
    source: 'CO 7/18 statute-verified — persona 13 (competency dismissal ineligible)',
    package: 'case dismissed on competency grounds → NOT sealable (705(1)(g), SB 26-149).',
    record: { title: 'Competency Dismissal', disposition: 'dismissed', disposition_date: '2024-01-01' },
    answers: { noncon_competency_co: true },
    expect: {
      resultKey: 'ineligible_competency_co',
      reading:
        'COMPETENCY carve-out: a dismissal on competency grounds (16-8.5-109(4)/-113/-116) is excluded from '
        + 'non-conviction sealing (705(1)(g)), reconfirmed by SB 26-149. Only competency dismissals hit this — '
        + 'ordinary dismissals still seal.',
    },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const CT: Persona[] = [
  {
    source: 'CT 7/19 statute-verified — persona 1 (dismissal, appeal period expired -> automatic)',
    package: 'charge dismissed, appeal period expired, single-count file -> § 54-142a(a)/(b) automatic erasure.',
    record: { title: 'Dismissed Charge', disposition: 'dismissed' },
    answers: { dismissed_type_ct: 'dismissal', nonconv_multicount_ct: false },
    expect: { resultKey: 'eligible_nonconviction_ct', reading: 'Dismissal -> non-conviction erasure automatic on expiry of the appeal period. Leads with the (g)(2) "deemed never arrested, may swear under oath" honest-no.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 2 (NGRI -> excluded)',
    package: 'not guilty by reason of insanity -> carved out of automatic non-conviction erasure.',
    record: { title: 'NGRI Finding', disposition: 'acquitted' },
    answers: { acquittal_ngri_ct: true },
    expect: { resultKey: 'ngri_excluded_ct', reading: 'NGRI / not-criminally-responsible is expressly excluded from (a)/(b) automatic erasure — distinct from an ordinary acquittal. Routed to counsel.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 3 (nolle 14 months ago -> erased)',
    package: 'nolle entered 14 months ago -> § 54-142a(c) 13-month period met -> erased.',
    record: { title: 'Nolled Charge', disposition: 'dismissed' },
    answers: { dismissed_type_ct: 'nolle', nolle_date_ct: '2025-05-01' },
    expect: { resultKey: 'eligible_nolle_ct', reading: 'Nolle 2025-05, +13 months = 2026-06 < 2026-07 -> erased. Automatic, nothing to file.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 4 (nolle 10 months ago -> wait to 13)',
    package: 'nolle entered 10 months ago -> 13-month period not met -> wait.',
    record: { title: 'Nolled Charge (recent)', disposition: 'dismissed' },
    answers: { dismissed_type_ct: 'nolle', nolle_date_ct: '2025-09-15' },
    expect: { resultKey: 'waiting_nolle_ct', reading: 'Nolle 2025-09, +13 months = 2026-10 > 2026-07 -> waiting. Result flags the continuance-vs-nolle trap (286 C. 666).' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 5 (misd 2016, clean since -> 7-yr operation of law)',
    package: 'post-2000 misdemeanor 2016, nothing since -> 7-yr tier, offense post-2000 -> automatic.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-06-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier7', conv_clock7_ct: '2016-06-01', conv_mechanism_ct: true },
    expect: { resultKey: 'eligible_cleanslate_auto_ct', reading: '7-yr tier, most-recent conviction 2016 (2016+7=2023<2026), offense post-2000 -> erasure by operation of law. Leads with the honest-no + § 54-142e background-check remedy.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 6 (misd 2016 + NEW misd 2023 -> clock reset)',
    package: 'same but a new misdemeanor conviction in 2023 -> most-recent-conviction clock resets to 2030.',
    record: { title: 'Misdemeanor (older, clock reset)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-06-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier7', conv_clock7_ct: '2023-01-01', conv_mechanism_ct: true },
    expect: { resultKey: 'waiting_cleanslate_ct', reading: 'THE CT TRAP: the clock runs from the MOST RECENT judgment of conviction (2023), so 2023+7=2030 > 2026 -> waiting. The 2023 conviction reset it for everything.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 7 (class E felony 2012, clean -> 10-yr eligible)',
    package: 'class E felony 2012, clean since -> 10-yr tier, offense post-2000 -> automatic.',
    record: { title: 'Class E Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier10', conv_clock10_ct: '2012-01-01', conv_mechanism_ct: true },
    expect: { resultKey: 'eligible_cleanslate_auto_ct', reading: 'Class E felony -> 10-yr tier, most-recent conviction 2012 (2012+10=2022<2026), offense post-2000 -> operation of law.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 8 (DUI 2014, no second -> 10-yr eligible per 23-169)',
    package: 'single DUI (14-227a) 2014, no second DUI -> included in the 10-yr tier (PA 23-169/23-204).',
    record: { title: 'DUI (single)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier10', conv_clock10_ct: '2014-01-01', conv_mechanism_ct: true },
    expect: { resultKey: 'eligible_cleanslate_auto_ct', reading: 'A lone DUI is NOT excluded — 14-227a was added to the 10-yr tier by PA 23-169/23-204. 2014+10=2024<2026 -> eligible. (A tree that excludes DUI outright would be stale.)' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 9 (DUI 2014 + second DUI 2019 -> (e)(2)(D) excluded)',
    package: 'DUI 2014 with a second DUI 2019 (within the following 10 years) -> (e)(2)(D) excluded.',
    record: { title: 'DUI (repeat within 10 yrs)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: true },
    expect: { resultKey: 'pardon_path_ct', reading: '(e)(2)(D): a 14-227a with ANOTHER 14-227a in the 10 years FOLLOWING it is excluded (forward-looking window) -> absolute-pardon fallback.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 10 (family violence misdemeanor 2018 -> excluded)',
    package: 'post-2000 family-violence misdemeanor -> (e)(2)(A) excluded -> pardon route.',
    record: { title: 'Family Violence Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: true },
    expect: { resultKey: 'pardon_path_ct', reading: 'Post-2000 family-violence crime (§ 46b-38a) -> (e)(2)(A) excluded from Clean Slate -> absolute-pardon fallback, not a dead end.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 11 (pre-2000 misdemeanor -> free petition)',
    package: 'misdemeanor with a pre-2000 offense date, clean -> 7-yr tier met, offense pre-2000 -> free petition.',
    record: { title: 'Pre-2000 Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '1998-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier7', conv_clock7_ct: '1998-01-01', conv_mechanism_ct: false },
    expect: { resultKey: 'eligible_cleanslate_petition_ct', reading: 'Meets the 7-yr tier, but offense pre-1/1/2000 -> not automatic; free OCCA-form petition (§ 54-142a(k) no fee).' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 12 (unpaid fine -> erasure proceeds, fine survives)',
    package: 'post-2000 misdemeanor 2015 with an unpaid fine -> fine does not block erasure; it survives.',
    record: { title: 'Misdemeanor (unpaid fine)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-01-01', restitution_paid: false },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'tier7', conv_clock7_ct: '2015-01-01', conv_mechanism_ct: true },
    expect: { resultKey: 'eligible_cleanslate_auto_ct', reading: 'An unpaid fine is NOT a precondition failure (preconditions are about supervision) -> erasure proceeds by operation of law; the fine survives erasure but does not block it (§ 54-142a(e)(7)).' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 13 (open probation on a 2021 case -> blocks everything)',
    package: 'open probation on a post-2000 conviction -> (e)(3)(B) precondition fails -> blocked.',
    record: { title: 'Conviction (open probation)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2021-01-01', probation_status: 'active' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: false },
    expect: { resultKey: 'conv_precond_block_ct', reading: '(e)(3)(B): unfinished probation on a post-2000 CT conviction blocks Clean Slate for every awaiting conviction until it is complete. Distinguished from a fine, which does not block.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 14 (class C felony -> outside Clean Slate -> pardon)',
    package: 'class C felony -> above the Clean Slate tiers -> absolute-pardon route (apply at 5 yr).',
    record: { title: 'Class C Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'above' },
    expect: { resultKey: 'pardon_path_ct', reading: 'A class C felony is above the class D/E ceiling -> outside Clean Slate -> absolute pardon (full erasure), apply 5 yr after a felony (§ 54-130a(c)).' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 15 (provisional pardon holder -> still needs absolute)',
    package: 'holds a provisional pardon on a serious felony -> provisional does NOT erase; needs an absolute pardon.',
    record: { title: 'Serious Felony (provisional pardon held)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01' },
    answers: { conv_type_ct: 'standard', conv_excluded_ct: false, conv_precond_ct: true, conv_tier_ct: 'above' },
    expect: { resultKey: 'pardon_path_ct', reading: 'Result copy makes the § 54-130a(f) distinction: a PROVISIONAL pardon (and a certificate of rehabilitation) help with jobs/licensing but do NOT erase and do not relieve disclosure — only an ABSOLUTE pardon erases.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 16 (YO adjudication, now 22, no felony -> automatic)',
    package: 'Youthful Offender, discharged, reached 21 with no pre-21 felony -> § 54-76o automatic erasure.',
    record: { title: 'Youthful Offender Adjudication', disposition: 'convicted' },
    answers: { conv_type_ct: 'yo', yo_screen_ct: true },
    expect: { resultKey: 'eligible_yo_ct', reading: 'YO is not a conviction; discharged + age 21 + no pre-21 felony -> automatic erasure under § 54-76o. Nothing to file.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 17 (AR completed -> dismissal -> erasure)',
    package: 'Accelerated Rehabilitation completed and charge dismissed -> § 54-142a erasure.',
    record: { title: 'Accelerated Rehabilitation (completed)', disposition: 'deferred' },
    answers: { diversion_type_ct: 'ar', ar_status_ct: true },
    expect: { resultKey: 'eligible_diversion_erasure_ct', reading: 'AR completion dismisses the charge; the dismissal erases automatically under § 54-142a. Same non-conviction honest-no.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 18 (mixed case: one erasable + one excluded count)',
    package: 'single file with an erasable charge + a non-erasable conviction -> (i) whole-record block + (i)(2) electronic partial.',
    record: { title: 'Mixed Case File', disposition: 'dismissed' },
    answers: { dismissed_type_ct: 'dismissal', nonconv_multicount_ct: true },
    expect: { resultKey: 'nonconv_mixed_ct', reading: 'THE WHOLE-RECORD TRAP (i): a non-erasable count in the same file blocks history-record erasure, but public electronic records of the erasable charge erase anyway ((i)(2)). Tested both ways vs persona 1.' },
    now: NOW,
  },
  {
    source: 'CT 7/19 statute-verified — persona 19 (decriminalized cannabis <0.5oz -> 142d immediate)',
    package: 'cannabis possession under half an ounce (decriminalized) -> § 54-142d, court SHALL immediately erase.',
    record: { title: 'Cannabis Possession (<0.5oz)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_type_ct: 'decriminalized' },
    expect: { resultKey: 'eligible_decrim_ct', reading: '§ 54-142d: decriminalized offense -> court must erase immediately, no wait, free. Cannabis <0.5oz qualifies (315 C. 861); note the probation-violation carve-out (332 C. 639).' },
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
    source: 'OK 7/19 statute-verified — persona 1 (acquittal ¶1 fully sealed)',
    package: 'acquittal -> § 18(A)¶1, fully-sealed tier + automatic category.',
    record: { title: 'Acquittal', disposition: 'acquitted' },
    answers: {},
    expect: { resultKey: 'eligible_p1_ok', reading: '¶1 acquittal -> fully-sealed (hidden from police too, § 18(B)/(E)) + an automatic Clean Slate category. Strong seal + honest-no.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 2 (DA-declined arrest, OK-only -> automatic)',
    package: 'arrested, no charges filed, DA declined, Oklahoma-only history -> ¶5 automatic.',
    record: { title: 'Arrest, No Charges (OK-only)', disposition: 'dismissed' },
    answers: { dismissed_type_ok: 'arrest', arrest_gate_ok: true, noncon_single_source_ok: false },
    expect: { resultKey: 'eligible_noncon_auto_ok', reading: '¶5 arrest-no-charges (SOL/DA-declined) + single-source -> automatic Clean Slate (§ 18(C)); full seal. Petition always available too.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 3 (same + Texas arrest -> single-source blocked)',
    package: 'same but a Texas arrest on the record -> automatic BLOCKED (single-source), petition ¶5/7 available.',
    record: { title: 'Arrest, No Charges (+TX arrest)', disposition: 'dismissed' },
    answers: { dismissed_type_ok: 'arrest', arrest_gate_ok: true, noncon_single_source_ok: true },
    expect: { resultKey: 'eligible_noncon_petition_ok', reading: 'SINGLE-SOURCE TRAP (§ 18(B)(2)): an out-of-state arrest kills the AUTOMATIC path but not the petition -> eligible_noncon_petition_ok (¶5/¶7).' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 4 (dismissed after deferred -> ¶7 excluded, route ¶8)',
    package: 'all charges dismissed after a completed misdemeanor deferred sentence, 13 months ago -> ¶7 EXCLUDES deferred dismissals, routes to ¶8.',
    record: { title: 'Misdemeanor Deferred (dismissed after)', charge_type: 'misdemeanor', disposition: 'dismissed', disposition_date: '2025-06-01' },
    answers: { dismissed_type_ok: 'after_deferred', deferred_class_ok: 'misd', deferred_misd_date_ok: '2025-06-01' },
    expect: { resultKey: 'eligible_deferred_misd_ok', reading: '¶7 EXPRESSLY excludes deferred-judgment dismissals -> routed to the deferred track -> ¶8 (misd, 1yr; 2025-06+1yr<2026-07) -> eligible_deferred_misd_ok. § 991c cleanup is a separate partial stage.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 5 (felony deferred nonviolent -> ¶9)',
    package: 'nonviolent (non-§571) felony deferred, dismissed 5.5 years ago -> ¶9.',
    record: { title: 'Nonviolent Felony Deferred', charge_type: 'felony', disposition: 'deferred', disposition_date: '2021-01-01' },
    answers: { deferred_class_ok: 'felony', deferred_felony_screen_ok: false, deferred_felony_date_ok: '2021-01-01' },
    expect: { resultKey: 'eligible_deferred_felony_ok', reading: '¶9 nonviolent-felony deferred dismissal, 5yr (2021+5=2026-01<2026-07) -> eligible_deferred_felony_ok. § 991c partial cleanup + § 18 full seal.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 6 (misd $300 fine -> ¶10 immediate)',
    package: 'misdemeanor conviction, $300 fine paid, no imprisonment/suspended sentence -> ¶10 immediate.',
    record: { title: 'Fine-Only Misdemeanor ($300)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'misd_fine' },
    expect: { resultKey: 'eligible_p10_ok', reading: '¶10: misd fine <$501, no jail/suspended, paid -> immediate expungement, no wait. Partial seal (police keep access).' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 7 (misd suspended, single-source -> ¶11 + automatic)',
    package: 'misdemeanor conviction, 6-month suspended sentence, 5+ yrs since end of last misd sentence, OK-only -> ¶11 + automatic.',
    record: { title: 'Misdemeanor (suspended sentence)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'misd_jail', p11_date_ok: '2020-01-01', p11_single_source_ok: false },
    expect: { resultKey: 'eligible_conv_auto_ok', reading: '¶11: 5yr from end of last misd sentence (2020+5=2025<2026), no felony/nothing pending; single-source -> automatic Clean Slate category (§ 18(C)) -> eligible_conv_auto_ok.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 8 (single felony 5yr, misd 6yr ago -> ¶12 blocked)',
    package: 'single nonviolent felony, 5 yrs post-sentence, but a separate misdemeanor conviction 6 years ago -> ¶12 BLOCKED (7-yr misd screen), re-test at yr 7.',
    record: { title: 'Single Nonviolent Felony (recent misd)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'felony_one', felony_one_screen_ok: false, felony_one_violent_ok: false, felony_one_misd_ok: true },
    expect: { resultKey: 'p12_blocked_misd_ok', reading: '¶12 requires no separate misd conviction in the last 7 years; a misd 6 years ago blocks it -> p12_blocked_misd_ok (re-test once the misd is 7+ years back, or ¶13 at 10yr).' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 9 (two nonviolent non-13.1 felonies 10yr -> ¶13)',
    package: 'two nonviolent felonies, neither §13.1 nor SORA, 10 yrs post-sentence -> ¶13.',
    record: { title: 'Two Felonies (10 yrs)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'felony_two', felony_two_screen_ok: false, felony_p13_date_ok: '2015-01-01' },
    expect: { resultKey: 'eligible_p13_ok', reading: '¶13: up to two felonies, none §13.1/SORA, 10yr (2015+10=2025<2026) -> eligible_p13_ok. Partial seal.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 10 (two-felony deferred dismissals 10yr -> v1-¶14)',
    package: 'two felony DEFERRED dismissals, 10 yrs -> v1-¶14, with the dueling-version caveat.',
    record: { title: 'Two Felony Deferred Dismissals', charge_type: 'felony', disposition: 'deferred', disposition_date: '2015-01-01' },
    answers: { deferred_class_ok: 'two_felony', deferred_two_screen_ok: false, deferred_two_date_ok: '2015-01-01' },
    expect: { resultKey: 'eligible_p14_ok', reading: 'v1-¶14 (two-felony deferred, 10yr) -> eligible_p14_ok. Result flags: this paragraph appears ONLY in the c. 452 version of §18; the c. 259 version omits it — dueling-amendment uncertainty.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 11 (three felonies -> no catalog path)',
    package: 'three felonies -> no § 18 catalog path.',
    record: { title: 'Three Felonies', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'felony_three' },
    expect: { resultKey: 'ineligible_count_ok', reading: 'Three or more felonies -> catalog closed (¶13 caps at two). Result notes the § 18(D) same-transaction rule may reduce the count, and a pardon is separate.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 12 (§571 single felony -> ¶9/12 blocked, ¶13 opens)',
    package: 'single §571-violent felony (not §13.1, not SORA), 11 yrs -> ¶9/12 blocked by violence, but ¶13 opens at 10yr.',
    record: { title: 'Single §571 Violent Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'felony_one', felony_one_screen_ok: false, felony_one_violent_ok: true, felony_p13_date_ok: '2015-01-01' },
    expect: { resultKey: 'eligible_p13_ok', reading: '§571-violent blocks the fast ¶12 path, but a violent felony NOT on §13.1 and not SORA can still use ¶13 at 10yr (2015+10=2025<2026) -> eligible_p13_ok.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 13 (trafficking prostitution -> §19c)',
    package: 'trafficking victim with a prostitution conviction -> § 22-19c dedicated path.',
    record: { title: 'Prostitution Conviction (trafficking victim)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_traffick_ok: true },
    expect: { resultKey: 'eligible_trafficking_ok', reading: '§ 22-19c: a prostitution charge/conviction from being trafficked is expunged for good cause, no wait -> eligible_trafficking_ok. Routed before the catalog.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 14 (DNA exoneree -> ¶3 + reimbursement)',
    package: 'DNA established innocence after conviction -> ¶3, fee reimbursement + 30-day expedited hearing.',
    record: { title: 'DNA-Exonerated Conviction', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'dna' },
    expect: { resultKey: 'eligible_dna_ok', reading: '¶3 DNA innocence -> fully-sealed tier; § 19(R) reimburses ALL fees/costs and § 19(S) gives a 30-day expedited hearing.' },
    now: NOW,
  },
  {
    source: 'OK 7/19 statute-verified — persona 15 (multi-record -> §19(T)/(F) sequential strategy)',
    package: 'misd conviction 2015 + single nonviolent felony completed 2019 (5 yrs) -> ¶12 eligible; result carries the §19(T)/(F) sequential-single-petition strategy.',
    record: { title: 'Single Nonviolent Felony (multi-record)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { conv_traffick_ok: false, conv_path_ok: 'felony_one', felony_one_screen_ok: false, felony_one_violent_ok: false, felony_one_misd_ok: false, felony_p12_date_ok: '2019-01-01' },
    expect: { resultKey: 'eligible_p12_ok', reading: 'The 2015 misd is 11 yrs back (outside the 7-yr screen), so ¶12 opens at 5yr (2019+5=2024<2026). Copy carries §19(T) (expunged offense not a prior for the others) + §19(F) (single petition per county) multi-record strategy.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const VA: Persona[] = [
  {
    source: 'VA 7/18 statute-verified — persona 1',
    package: 'petit larceny misdemeanor 2017, no same-day companion, clean since -> automatic-eligible NOW (7 yr, § 392.6) -> check-record/status.',
    record: { title: 'Petit Larceny', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'auto_misd', auto_companion_va: false, auto_date_va: '2017-01-01' },
    expect: { resultKey: 'check_record_first_va', reading: 'Petit larceny on the § 392.6(A) auto list, no same-day companion (392.6(C)), 7yr met (2017+7=2024<2026). Leads with checking VSP; discloses the free 12:1 backstop. Companion gate NO path.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 2',
    package: 'auto-list misdemeanor 2017 BUT a same-day companion conviction not on the list -> 392.6(C) kills automatic -> routed to the § 392.12 petition track -> eligible (7yr).',
    record: { title: 'Petit Larceny + Same-Day Companion', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'auto_misd', auto_companion_va: true, petition_misd_date_va: '2017-01-01' },
    expect: { resultKey: 'eligible_petition_va', reading: 'Same-day companion conviction (§ 392.6(C)) removes automatic sealing and (§ 392.12:1(D)) the 12:1 track -> ordinary § 392.12 petition, 7yr met (2017+7=2024<2026) -> eligible. Companion gate YES path.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 3',
    package: 'Class 6 felony 2014, released 2015, clean -> eligible to petition (10 yr clean met, § 392.12(F)(2)).',
    record: { title: 'Class 6 Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'low_felony', felony_history_va: 'clear', felony_date_va: '2015-01-01' },
    expect: { resultKey: 'eligible_petition_felony_va', reading: 'Class 6 felony, clean felony history, 10yr from the latest anchor (2015+10=2025<2026) -> eligible. Now statute-cited: no fee, restitution-paid precondition, two-grant lifetime cap.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 4',
    package: 'DUI misdemeanor -> § 392.12(L) exclusion -> ineligible for petition sealing.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { offense_1986_va: true, excluded_va: true },
    expect: { resultKey: 'ineligible_excluded_va', reading: 'DUI is on the § 392.12(L) exclusion list -> ineligible for petition sealing.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 5',
    package: 'grand larceny + Class 4 felony within 20 yrs -> felony-history gate fails -> ineligible.',
    record: { title: 'Grand Larceny', charge_type: 'felony', disposition: 'convicted' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'low_felony', felony_history_va: 'blocked' },
    expect: { resultKey: 'ineligible_felony_history_va', reading: 'Grand larceny is petition-eligible in principle, but a Class 4 felony within 20 yrs fails the whole-record felony-history gate. Persona answers "blocked".' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 6',
    package: '§ 392.12:1 track PASS: underage alcohol possession (§ 4.1-305) 2017, clean -> 7 conviction-free years met -> eligible on the lighter petition.',
    record: { title: 'Underage Alcohol Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2017-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'petition121', petition_121_date_va: '2017-01-01' },
    expect: { resultKey: 'eligible_petition_121_va', reading: '§ 4.1-305 -> lighter § 392.12:1 track, 7yr (2017+7=2024<2026) met -> eligible. Free, court SHALL seal, no manifest-injustice, no lifetime cap. 12:1 PASS.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 7',
    package: '§ 392.12:1 track FAIL: sale of drug paraphernalia (§ 18.2-265.3(A)) 2022 -> 7 conviction-free years NOT met -> waiting.',
    record: { title: 'Sale of Drug Paraphernalia', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'petition121', petition_121_date_va: '2022-01-01' },
    expect: { resultKey: 'waiting_petition_121_va', reading: '§ 18.2-265.3(A) -> § 392.12:1 track, 7yr not met (2022+7=2029>2026) -> waiting. 12:1 FAIL.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 8',
    package: 'DEFERRED and dismissed other-misdemeanor 2017 -> § 392.12(A) covers a "charge deferred and dismissed" -> rides the petition flow, clock from dismissal -> eligible (7yr).',
    record: { title: 'Deferred/Dismissed Misdemeanor', charge_type: 'misdemeanor', disposition: 'deferred', disposition_date: '2017-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'other_misd', petition_misd_date_va: '2017-01-01' },
    expect: { resultKey: 'eligible_petition_va', reading: 'Deferred now ROUTES like a conviction into the § 392.12 petition flow (was an unknown_deferred hedge). 7yr from dismissal (2017+7=2024<2026) -> eligible.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 9',
    package: 'simple marijuana possession (former § 18.2-250.1), post-1986 -> sealed by operation of law, nothing to file (§ 392.6:1).',
    record: { title: 'Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { offense_1986_va: true, excluded_va: false, offense_class_va: 'marijuana' },
    expect: { resultKey: 'sealed_by_law_mj_va', reading: 'Former § 18.2-250.1 -> sealed by operation of law (§ 392.6:1), no order, no petition. Marijuana operation-of-law result.' },
    now: NOW,
  },
  {
    source: 'VA 7/18 statute-verified — persona 10',
    package: 'PRE-1986 simple marijuana possession -> carved out of the 1986 hard line -> sealed by operation of law -> ELIGIBLE, not ineligible.',
    record: { title: 'Pre-1986 Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '1984-01-01' },
    answers: { offense_1986_va: false, mj_pre1986_va: true },
    expect: { resultKey: 'sealed_by_law_mj_va', reading: 'Pre-1986 marijuana: offense_1986 no -> mj_pre1986 yes -> sealed by operation of law (§ 392.6:1, "regardless of the date of the offense"). Resolves ELIGIBLE, not ineligible_pre1986_va.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const MN: Persona[] = [
  {
    source: 'MN 7/19 statute-verified — persona 1 (misd auto-eligible + DHS note)',
    package: 'misdemeanor theft, discharged 2.5 yrs ago, clean -> automatic-eligible; result carries the DHS/DCYF/Health scope-limit note.',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'misd', misd_auto_excl_mn: false, misd_date_mn: '2024-01-01' },
    expect: { resultKey: 'eligible_auto_mn', reading: 'Misdemeanour, not on the § 609A.015 subd 3 exclusion list, 2yr from discharge (2024+2=2026-01<2026-07) -> automatic. Copy carries the DHS/DCYF/Health scope limit + 30/60-day BCA timing + agencies-still-see-it note.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 2 (609.2242 misd auto-excluded -> petition)',
    package: 'misdemeanor assault (§ 609.2242) discharged 10 yrs ago -> automatic-INELIGIBLE, but petition 3(a)(3) at 2yr (extraordinary remedy).',
    record: { title: 'Misdemeanor Assault (§ 609.2242)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'misd', misd_auto_excl_mn: true, misd_petition_date_mn: '2016-01-01' },
    expect: { resultKey: 'eligible_petition_extraordinary_mn', reading: '§ 609.2242 is on the automatic misd-exclusion list -> auto out; but the petition track has NO offense exclusions, so § 609A.02 subd 3(a)(3) petition is available at 2yr. Extraordinary remedy, clear-and-convincing burden.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 3 (152.025 felony, both tracks)',
    package: '5th-degree drug felony (§ 152.025), discharged 4 yrs ago -> automatic 4yr AND petition 3(a)(6) -> automatic-eligible.',
    record: { title: '5th-Degree Drug Felony (§ 152.025)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'drug5', felony_152_date_mn: '2022-01-01' },
    expect: { resultKey: 'eligible_auto_mn', reading: '§ 152.025 is on BOTH tracks: automatic at 4yr (2022+4=2026-01<2026-07) -> eligible_auto_mn (petition 3(a)(6) is the same 4yr fallback).' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 4 (152.023s2 felony, auto-excluded -> petition 3(a)(8))',
    package: 'felony § 152.023 subd 2, discharged 5 yrs ago -> carved OUT of the automatic felony list, but on the 3(b) petition list -> petition 3(a)(8) at 4yr.',
    record: { title: 'Felony § 152.023 subd 2', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'felony', felony_auto_list_mn: false, felony_petition_list_mn: true, felony_petition_date_mn: '2019-01-01' },
    expect: { resultKey: 'eligible_petition_mn', reading: '§ 152.023 subd 2 is in the automatic-track MINUS set (auto out) but on the § 609A.02 subd 3(b) petition list -> petition 3(a)(8) at 4yr (2019+4=2023<2026) -> eligible_petition_mn.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 5 (609.13-reduced felony -> petition 3(a)(7))',
    package: 'felony reduced to a misdemeanor by a stay of imposition -> automatic-INELIGIBLE per subd 3(d), petition 3(a)(7).',
    record: { title: 'Felony reduced via stay of imposition', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: true },
    expect: { resultKey: 'eligible_petition_609_13_mn', reading: 'THE 609.13 TRAP: a felony reduced to GM/misd stays at felony level for the automatic track (subd 3(d)) -> auto out. Relief valve is petition § 609A.02 subd 3(a)(7) (4yr if on list, else 5). Not treated at the reduced level.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 6 (dismissed after filing -> automatic, no wait)',
    package: 'charges dismissed after filing, not incompetency -> automatic non-conviction, no wait, burden on the state for a petition.',
    record: { title: 'Dismissed After Filing', disposition: 'dismissed', disposition_date: '2025-03-01' },
    answers: { dismissed_incompetency_mn: false },
    expect: { resultKey: 'eligible_noncon_mn', reading: 'Dismissal after filing (not incompetency) -> § 609A.015 subd 1 automatic, no wait. Copy: NGRI is not favorable, incompetency excluded, and a resolved-in-favor petition flips the burden to the state + fee waived.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 7 (243.166 registration -> hard no)',
    package: 'predatory-offender-registration offense -> never expungeable, both tracks.',
    record: { title: 'Registration Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: { registration_mn: true },
    expect: { resultKey: 'ineligible_registration_mn', reading: '§ 243.166 registrable offense -> hard lifetime bar on both tracks (§ 609A.02 subd 4).' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 8 (first-time 152.025 possession -> mandatory deferral)',
    package: 'first-time 5th-degree drug possession (§ 152.025 subd 2), pre-sentence, no priors -> mandatory § 152.18 deferral -> discharge -> automatic expungement.',
    record: { title: 'First-Time § 152.025 subd 2 Possession', charge_type: 'felony', disposition: 'deferred' },
    answers: { deferral_type_mn: 'deferral152', deferral_152_mn: true },
    expect: { resultKey: 'eligible_deferral_152_mn', reading: 'First-time § 152.025 subd 2 possession with no priors -> § 152.18 MANDATORY deferral as of right -> discharge -> automatic expungement (§ 609A.015 subd 1) + status restoration (honest-no). Raise it at the plea stage.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 9 (169A.25 GM auto-excluded -> petition 3(a)(4))',
    package: '2nd-degree DWI gross misdemeanor (§ 169A.25), discharged 10 yrs ago -> automatic-INELIGIBLE, petition 3(a)(4) at 3yr open.',
    record: { title: '2nd-Degree DWI (§ 169A.25, gross misd)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2016-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'gross', gross_auto_excl_mn: true, gross_petition_date_mn: '2016-01-01' },
    expect: { resultKey: 'eligible_petition_extraordinary_mn', reading: '§ 169A.25 is on the automatic GM-exclusion list -> auto out; but a 2nd-deg DWI GM is petition-eligible (§ 609A.02 subd 3(a)(4)) at 3yr because the petition track has no offense exclusions. Extraordinary remedy.' },
    now: NOW,
  },
  {
    source: 'MN 7/19 statute-verified — persona 10 (robbery petition -> firearm-bar warning)',
    package: 'simple robbery (crime of violence) on the 3(b) petition list, discharged 7 yrs ago -> petition grant; result carries the firearm-bar warning.',
    record: { title: 'Simple Robbery', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { registration_mn: false, conv_609_13_mn: false, conv_level_mn: 'felony', felony_auto_list_mn: false, felony_petition_list_mn: true, felony_petition_date_mn: '2019-01-01' },
    expect: { resultKey: 'eligible_petition_mn', reading: 'Robbery (crime of violence) on the § 609A.02 subd 3(b) petition list -> petition 3(a)(8) at 4yr -> eligible_petition_mn, whose copy carries the § 609A.03 subd 5a firearm-bar warning (a crime-of-violence expungement order = lifetime firearm bar unless restored).' },
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
    source: 'WA 7/18 statute-verified — persona 1 (LFO gate)',
    package: 'misdemeanor theft, sentenced 2020 (time-eligible), but LFOs NOT paid -> lfo_gate_wa. The clock is met; payment is the remaining FILING precondition (9.96.060(2)(a)).',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: false },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'misdemeanor', lfo_check_wa: false },
    expect: { resultKey: 'lfo_gate_wa', reading: 'LFO CORRECTION: completion incl. financial obligations is a FILING PRECONDITION (2)(a), not the clock. Time-eligible but LFOs unpaid -> lfo_gate_wa (waiting), which explains the clock already runs and points to LFO-reduction motions.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 2 (misd eligible)',
    package: 'misdemeanor theft, sentenced 2020, all LFOs paid -> 3yr clock met -> eligible.',
    record: { title: 'Misdemeanor Theft (paid)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'misdemeanor', lfo_check_wa: true, dv_wa: false, misd_date_wa: '2020-01-01' },
    expect: { resultKey: 'eligible_vacate_wa', reading: 'Misdemeanour, LFOs paid, 3yr from later of release/confinement/sentencing (2020+3=2023<2026) -> eligible. Copy carries full (2) conditions, discretion, firearm-rights caveat.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 3 (felony re-anchor)',
    package: 'Class C felony, SENTENCED 2019 (later of release/confinement/sentencing), COD only issued recently -> passes on the sentencing anchor where the old COD-date anchor would have FAILED.',
    record: { title: 'Class C Felony Possession', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'felony', felony_class_wa: 'c', felony_c_date_wa: '2019-01-01' },
    expect: { resultKey: 'eligible_vacate_felony_wa', reading: 'FELONY RE-ANCHOR: clock runs from later of release/confinement/SENTENCING (9.94A.640(2)(f)), not the COD date. 2019+5=2024<2026 -> eligible. A recent COD would have failed under the old anchor; COD is a separate prerequisite.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 4 (Class B waiting)',
    package: 'Class B felony 2018 -> 10yr not met -> 2028.',
    record: { title: 'Class B Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'felony', felony_class_wa: 'b', felony_b_date_wa: '2018-01-01' },
    expect: { resultKey: 'waiting_wa', reading: 'Class B, 10yr from the later anchor (2018+10=2028>2026) -> waiting.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 5 (DUI excluded)',
    package: 'DUI -> categorical exclusion -> honest-no.',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'dui_pc' },
    expect: { resultKey: 'ineligible_excluded_wa', reading: 'DUI/physical-control/railroad-intoxicated categorical exclusion. Result notes the reduced-from-DUI and failure-to-register exceptions + HB 1110 status.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 6 (Assault 2 carve-out)',
    package: 'Assault 2, no enhancement, sentenced 2015 -> eligible under the 2019 c 331 carve-out — surprise-yes.',
    record: { title: 'Assault 2 (no enhancement)', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: true, violent_carveout_wa: true, level_wa: 'felony', felony_class_wa: 'c', felony_c_date_wa: '2015-01-01' },
    expect: { resultKey: 'eligible_vacate_felony_wa', reading: 'Assault 2 is violent, but the 2019 c 331 carve-out (no firearm/weapon/sexual-motivation enhancement) makes it vacatable. Class C, 2015+5=2020<2026 -> eligible. Surprise-yes.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 7 (reduced-from-DUI pass)',
    package: 'DUI reduced to negligent driving, ARRESTED 2014 -> 10+ years since arrest -> eligible (9.96.060(2)(d)).',
    record: { title: 'Negligent Driving (reduced from DUI)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'reduced_dui', reduced_dui_date_wa: '2014-01-01' },
    expect: { resultKey: 'eligible_reduced_dui_wa', reading: 'Reduced-from-DUI "prior offense" (46.61.5055) is vacatable at 10yr from ARREST (9.96.060(2)(d)). 2014+10=2024<2026 -> eligible. Unlike a straight DUI.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 8 (reduced-from-DUI fail)',
    package: 'DUI reduced to reckless driving, ARRESTED 2018 -> under 10 years -> waiting.',
    record: { title: 'Reckless Driving (reduced from DUI)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'reduced_dui', reduced_dui_date_wa: '2018-01-01' },
    expect: { resultKey: 'waiting_reduced_dui_wa', reading: 'Reduced-from-DUI, 10yr from arrest (2018+10=2028>2026) -> waiting. Anchored to arrest, not conviction.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 9 (cannabis 21+ mandatory)',
    package: 'misdemeanor cannabis possession, 21+ at offense -> court SHALL vacate, zero wait, no condition checks (9.96.060(5)).',
    record: { title: 'Cannabis Possession (21+)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { special_category_wa: 'cannabis21' },
    expect: { resultKey: 'eligible_cannabis_wa', reading: 'Mandatory 21+ cannabis vacate (9.96.060(5)) — SHALL vacate, no waiting period, no other-condition checks. Reaches predecessor statutes to 1971.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 10 (pre-Blake void)',
    package: 'simple drug possession committed before Feb 25 2021 -> constitutionally void under State v. Blake -> mandatory vacatur + LFO refund, no eligibility test.',
    record: { title: 'Drug Possession (pre-Blake)', charge_type: 'felony', disposition: 'convicted' },
    answers: { special_category_wa: 'drug_possession', blake_date_wa: true },
    expect: { resultKey: 'eligible_blake_void_wa', reading: 'Pre-2/25/2021 simple possession is VOID under State v. Blake -> mandatory vacatur + LFO refund via the statewide Blake process, no eligibility test.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 11 (infraction routing)',
    package: 'infraction -> not a criminal conviction, nothing to vacate (9.96.060 covers misd/gross-misd only).',
    record: { title: 'Traffic Infraction', charge_type: 'infraction', disposition: 'convicted' },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'infraction' },
    expect: { resultKey: 'infraction_wa', reading: 'INFRACTION ROUTE FIX: 9.96.060 covers misdemeanors/gross-misdemeanors only. Infraction routes to the new infraction_wa result, not the DV/misd track.' },
    now: NOW,
  },
  {
    source: 'WA 7/18 statute-verified — persona 12 (DV separate-incidents bar)',
    package: 'DV misdemeanor with two or more separate-incident DV convictions -> barred (9.96.060(2)(f)).',
    record: { title: 'DV Assault (misdemeanor)', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { special_category_wa: 'none', excluded_wa: 'none', violent_wa: false, level_wa: 'misdemeanor', lfo_check_wa: true, dv_wa: true, dv_incidents_wa: true },
    expect: { resultKey: 'ineligible_dv_incidents_wa', reading: 'DV separate-incidents bar (9.96.060(2)(f)): two or more DV convictions from separate incidents blocks vacation. Multiple from one incident would count as one.' },
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
    source: 'IN 7/19 statute-verified — persona 1 (misd mandatory)',
    package: 'misdemeanor, 6 yrs out, obligations paid, clean 5 yrs, no other records -> eligible mandatory.',
    record: { title: 'Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'misd', misd_date_in: '2020-01-01', other_records_mand_in: false },
    expect: { resultKey: 'eligible_mandatory_in', reading: 'Misdemeanour, § 2 5yr met (2020+5=2025<2026), no other records -> MANDATORY grant. Copy carries civil-rights restoration (§ 10), plea-waiver-void (§ 11), and the firearm/sex-reg non-restoration caveats.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 2 (registered offender misd -> ineligible; REGRESSION-LOCK)',
    package: 'misdemeanor but the person is a registered sex/violent offender -> ineligible (9-2(b)). Draft would have passed this.',
    record: { title: 'Misdemeanor (registered offender)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { conv_trafficking_in: false, excluded_in: true },
    expect: { resultKey: 'ineligible_excluded_in', reading: 'REGRESSION-LOCK: a registered sex/violent offender is barred from the § 2 misdemeanor path (9-2(b)(2)) and is on the § 5(b) never-list. The comprehensive excluded_in catches it before misd_date_in — the draft had no such screen and false-eligibled it.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 3 (L6 mandatory)',
    package: 'Level 6 felony, 9 yrs, not on the 9-3 exclusion list, clean -> eligible mandatory.',
    record: { title: 'Level 6 Felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2017-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'l6', l6_excluded_in: false, l6_date_in: '2017-01-01', other_records_mand_in: false },
    expect: { resultKey: 'eligible_mandatory_in', reading: 'Level 6, not a 9-3 exclusion, § 3 8yr met (2017+8=2025<2026), no other records -> mandatory grant.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 4 (L6 perjury routed out of 9-3)',
    package: 'Level 6 perjury -> excluded from the 9-3 mandatory path, falls to the 9-4 discretionary analysis (not a dead end).',
    record: { title: 'Level 6 Perjury', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'l6', l6_excluded_in: true, l45_excluded_in: false, l45_release_date_in: '2018-01-01', other_records_disc_in: false },
    expect: { resultKey: 'eligible_discretionary_in', reading: 'Perjury is a § 3 exclusion, so the L6 falls to the § 4 discretionary track (9-4(a) picks up felonies barred from 9-3): 8yr from conviction (2015) AND 3yr post-sentence (2018) both met -> discretionary. Not the old dead-end complex result.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 5 (9-5 dual-anchor waiting; REGRESSION-LOCK)',
    package: 'serious felony, 11 yrs from conviction BUT released only 3 yrs ago -> WAITING (the 5-yr post-sentence prong is not met). Draft anchored to conviction only and said eligible.',
    record: { title: 'Serious Felony (long sentence)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2015-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'serious', serious_release_date_in: '2023-01-01' },
    expect: { resultKey: 'waiting_in', reading: 'REGRESSION-LOCK: § 5 is the LATER of 10yr-from-conviction (2015+10=2025<2026, met) OR 5yr-post-sentence (released 2023, +5=2028>2026, NOT met). The dual anchor -> waiting. The draft anchored to conviction only and would have false-eligibled a long-sentence person.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 6 (felony resulting in death -> never)',
    package: 'a felony that caused someone\'s death -> never-expungeable (9-5(b)).',
    record: { title: 'Felony Resulting in Death', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_trafficking_in: false, excluded_in: true },
    expect: { resultKey: 'ineligible_excluded_in', reading: 'A felony resulting in death is on the § 5(b) never-list (added per the correction). excluded_in catches it -> ineligible.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 7 (official misconduct, non-official -> 9-5 track, not barred)',
    package: 'official misconduct by a NON-official -> not the categorical bar; routes to the 9-5 discretionary track.',
    record: { title: 'Official Misconduct (non-official)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'l45', l45_excluded_in: true, serious_release_date_in: '2015-01-01', other_records_disc_in: false },
    expect: { resultKey: 'eligible_discretionary_in', reading: 'Official misconduct is a categorical bar ONLY for elected/judicial officers (excluded_in narrowed accordingly). A non-official routes through the § 4 exclusion screen up to the § 5(a)(3) discretionary path: 10yr (2013) + 5yr post-sentence (2015) met -> discretionary, not ineligible.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 8 (multi-county -> complex timing)',
    package: 'eligible misdemeanor but other convictions in another county -> complex_timing (365-day window, one lifetime petition).',
    record: { title: 'Misdemeanor (other-county records)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'misd', misd_date_in: '2020-01-01', other_records_mand_in: true },
    expect: { resultKey: 'complex_timing_in', reading: 'Past the 5yr wait, but other convictions exist -> complex_timing: the one lifetime conviction petition + 365-day multi-county window (9(h)-(i)). Copy now adds the softenings (denial refile 9(j), safety valves 9(k)-(l)).' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 9 (dismissed 2023 -> automatic)',
    package: 'charges dismissed, filed 2023 (after 6/30/2022) -> automatic expungement, no petition.',
    record: { title: 'Dismissed (charges filed 2023)', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: { auto_in: true },
    expect: { resultKey: 'eligible_auto_in', reading: 'Non-conviction on charges filed after 6/30/2022 -> AUTOMATIC court-ordered expungement (§ 1(b)), no petition, no fee; 60-day floor + up-to-1yr prosecutor delay. Resolves the automatic-expungement open question.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 10 (completed diversion -> non-conviction track)',
    package: 'completed diversion -> ends without a conviction -> free § 1 non-conviction expungement.',
    record: { title: 'Completed Diversion', disposition: 'deferred', disposition_date: '2023-01-01' },
    answers: { diversion_in: false },
    expect: { resultKey: 'eligible_arrest_in', reading: 'A COMPLETED diversion is a non-conviction (§ 1 territory) -> free arrest/non-conviction expungement, which does not use the one lifetime conviction petition. Replaces the old unknown_deferred hedge.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 11 (currently in diversion -> complex)',
    package: 'currently participating in pretrial diversion -> complex, with the prosecutor-authorization note (1(a)(2)).',
    record: { title: 'In Diversion', disposition: 'deferred', disposition_date: '2026-01-01' },
    answers: { diversion_in: true },
    expect: { resultKey: 'complex_diversion_in', reading: 'CURRENT pretrial-diversion participation bars expungement (§ 1(a)(2)) unless the prosecutor authorizes -> complex with the finish-first / ask-the-prosecutor note.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 12 (trafficked-person coerced -> vacatur)',
    package: 'coerced trafficking-victim offense, no bodily injury -> IC 35-38-10-2 vacatur, then expungeable.',
    record: { title: 'Trafficking-coerced offense', charge_type: 'felony', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { conv_trafficking_in: true },
    expect: { resultKey: 'eligible_trafficking_in', reading: 'IC 35-38-10-2: a coerced trafficking-victim offense (no bodily injury) is vacated on a preponderance showing, then expunged as a vacated conviction under § 1(a)(1)(B) — which does not use the one lifetime petition.' },
    now: NOW,
  },
  {
    source: 'IN 7/19 statute-verified — persona 13 (DV misdemeanor -> firearm-rights disclosure)',
    package: 'domestic-violence misdemeanor, eligible -> mandatory grant, and the copy discloses that expungement does NOT restore firearm rights (9-6(f)).',
    record: { title: 'DV Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01', restitution_paid: true },
    answers: { conv_trafficking_in: false, excluded_in: false, level_in: 'misd', misd_date_in: '2020-01-01', other_records_mand_in: false },
    expect: { resultKey: 'eligible_mandatory_in', reading: 'A DV misdemeanor is expungeable (§ 2), mandatory at 5yr -> eligible_mandatory_in, whose copy carries the 9-6(f) disclosure: expungement does NOT restore DV-misdemeanor firearm rights (only IC 35-47-4-7 does).' },
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
    source: 'MD 7/19 statute-verified - persona 1',
    package: 'Eligible misdemeanor, sentence + probation completed 6 yrs ago -> REDEEM 5-yr wait met -> eligible.',
    record: { title: 'Eligible Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'misd' },
    expect: { resultKey: 'eligible_conviction_md', reading: 'Eligible misdemeanour, § 10-110(c) 5-yr REDEEM wait from sentence completion (2020+5=2025<2026) -> eligible.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 2',
    package: 'Second-degree assault, sentence done 8 yrs ago -> 7-yr wait met -> eligible.',
    record: { title: '2nd-Degree Assault', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'assault2' },
    expect: { resultKey: 'eligible_conviction_md', reading: '2nd-degree assault (3-203)/common-law battery, § 10-110(c) 7-yr wait (2018+7=2025<2026) -> eligible. Was 15yr pre-REDEEM.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 3',
    package: 'Domestically related misdemeanor, 8 yrs -> 15-yr tier NOT met -> waiting. REGRESSION-LOCK: the draft had no domestic tier and would have cleared this early.',
    record: { title: 'Domestically Related Assault', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'domestic' },
    expect: { resultKey: 'waiting_md', reading: 'Domestically related crime -> § 10-110(c)(3) 15-yr wait (2018+15=2033>2026) -> waiting. Regression-lock: without the 15-yr tier this would have passed at 5-7 yrs.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 4',
    package: 'Third-degree burglary (6-204), 8 yrs -> felony DEFAULT 7-yr tier met -> eligible (NOT the 10-yr burglary tier).',
    record: { title: 'Burglary 3rd Degree', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'felony' },
    expect: { resultKey: 'eligible_conviction_md', reading: 'Burglary 3rd (6-204) is an eligible felony at the 7-yr default (2018+7=2025<2026) -> eligible. The 10-yr tier covers only 6-202(a)/6-203/7-104.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 5',
    package: 'Second-degree burglary (6-203), 8 yrs -> 10-yr tier NOT met -> waiting.',
    record: { title: 'Burglary 2nd Degree', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'burglary' },
    expect: { resultKey: 'waiting_md', reading: 'Burglary 2nd (6-203) -> § 10-110(c) 10-yr tier (2018+10=2028>2026) -> waiting.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 6',
    package: 'PWID cannabis felony (5-602), 4 yrs -> 3-yr tier met -> eligible.',
    record: { title: 'PWID Cannabis', charge_type: 'felony', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'pwid_cannabis' },
    expect: { resultKey: 'eligible_conviction_md', reading: 'PWID cannabis (5-602) -> § 10-105(c)(5) 3-yr tier (2022+3=2025<2026) -> eligible. cannabis_md is false — PWID is not simple possession.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 7',
    package: 'PBJ granted 5 yrs ago, discharged 1 yr ago from 4-yr probation -> LATER-OF met -> eligible. REGRESSION-LOCK: draft measured 3 yrs from discharge and said waiting.',
    record: { title: 'PBJ (Theft)', disposition: 'deferred' },
    answers: { deferred_type_md: 'pbj', pbj_grant_date_md: '2021-01-01', pbj_discharged_md: true, pbj_disentitle_md: false },
    expect: { resultKey: 'eligible_pbj_md', reading: '§ 10-105(c)(2)(i) later-of: granted 2021 (5yr>=3 met) AND discharged -> eligible. Regression-lock: the two periods run together; discharge 1yr ago does NOT force 3 more years.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 8',
    package: 'DUI § 21-902(a) PBJ, discharged 5 yrs ago -> 15-yr wait NOT met -> waiting.',
    record: { title: 'DUI PBJ (21-902(a))', disposition: 'deferred' },
    answers: { deferred_type_md: 'dui_pbj', dui_pbj_sub_md: true, dui_pbj_date_md: '2021-01-01' },
    expect: { resultKey: 'waiting_dui_pbj_md', reading: 'DUI 21-902(a) PBJ -> § 10-105(c)(2)(ii) 15-yr wait from discharge (2021+15=2036>2026) -> waiting. Its own world, not the ordinary 3-yr PBJ clock.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 9',
    package: 'Acquitted 2023 (post-10/1/2021) -> automatic-at-3-years + immediate-with-waiver copy.',
    record: { title: 'Acquittal 2023', charge_type: 'misdemeanor', disposition: 'acquitted', disposition_date: '2023-06-01' },
    answers: { noncon_era_md: true },
    expect: { resultKey: 'eligible_nonconviction_auto_md', reading: 'Post-10/1/2021 non-conviction -> § 10-105.1 automatic 3 yrs after disposition, or petition now with waiver + tort release (§ 10-105(c)(1)). Free.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 10',
    package: 'Acquitted 2019 (pre-10/1/2021) -> petition path, not automatic.',
    record: { title: 'Acquittal 2019', charge_type: 'misdemeanor', disposition: 'acquitted', disposition_date: '2019-06-01' },
    answers: { noncon_era_md: false },
    expect: { resultKey: 'eligible_nonconviction_petition_md', reading: 'Pre-10/1/2021 non-conviction -> automatic law does not reach it; free petition under § 10-105.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 11',
    package: 'Cannabis possession conviction, sentence NOT complete -> waiting (c)(8) earliest filing is sentence completion.',
    record: { title: 'Cannabis Possession', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: true, cannabis_complete_md: false },
    expect: { resultKey: 'waiting_cannabis_md', reading: 'Cannabis possession -> § 10-105(c)(8) petition not before completion of sentence; sentence not done -> waiting. Fixes the draft "immediate" claim.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 12',
    package: 'Pardoned single non-violent conviction, pardon signed 11 yrs ago -> 10-yr deadline PASSED -> ineligible.',
    record: { title: 'Pardoned Conviction', disposition: 'convicted' },
    answers: { unit_rule_md: false, pardon_gate_md: true, pardon_deadline_md: '2015-01-01' },
    expect: { resultKey: 'ineligible_pardon_md', reading: '§ 10-105(c)(4): pardon petition no later than 10 yrs after signing. Signed 2015 (11yr>=10) -> deadline gone -> ineligible. The deadline is the surprise.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 13',
    package: 'Case with an ineligible co-charge -> unit-rule block.',
    record: { title: 'Mixed-Charge Case', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { unit_rule_md: true },
    expect: { resultKey: 'complex_unit_md', reading: 'THE UNIT RULE (§ 10-107, § 10-110(d)(3)): one ineligible charge blocks the whole case -> complex. Notes cannabis + minor-traffic carve-outs.' },
    now: NOW,
  },
  {
    source: 'MD 7/19 statute-verified - persona 14',
    package: 'Same case but the only co-charge is a minor traffic violation -> carved out of the unit -> NOT blocked, clears on the ordinary misdemeanor path.',
    record: { title: 'Misdemeanor + Minor Traffic', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { unit_rule_md: false, pardon_gate_md: false, cannabis_md: false, eligible_offense_md: 'misd' },
    expect: { resultKey: 'eligible_conviction_md', reading: 'Minor traffic violations are carved out of the unit (§ 10-107(a)), so unit_rule_md is answered no -> normal path -> eligible misdemeanor (2020+5=2025<2026). Not blocked.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const WI: Persona[] = [
  {
    source: 'WI 7/19 statute-verified — persona 1 (ordered + completed -> self-executing)',
    package: 'judge ordered expungement at sentencing, completed cleanly -> self-executing, check CCAP.',
    record: { title: 'Misdemeanor (ordered at sentencing)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { traffick_wi: false, ordered_wi: true, completed_wi: 'success' },
    expect: { resultKey: 'eligible_already_wi', reading: 'Ordered at sentencing + successful completion -> self-executing (Hemp, § 973.015(1m)(b)), may already be done -> check CCAP. Copy notes the CIB record AND the DOT § 343.23(2)(a) exception survive.' },
    now: NOW,
  },
  {
    source: 'WI 7/19 statute-verified — persona 2 (ordered but probation revoked -> lost)',
    package: 'judge ordered expungement at sentencing, but probation was revoked -> completion failed, expungement lost.',
    record: { title: 'Misdemeanor (ordered, then revoked)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { traffick_wi: false, ordered_wi: true, completed_wi: 'failed' },
    expect: { resultKey: 'failed_wi', reading: 'Ordered, but a probation revocation defeats the completion condition (Lickes — conditions incl. DOC-imposed, court cannot excuse). Expungement is lost and cannot be revived (Matasek/Arberry) -> failed_wi, pardon is the remaining route.' },
    now: NOW,
  },
  {
    source: 'WI 7/19 statute-verified — persona 3 (no order -> the defining honest-no)',
    package: 'judge silent at sentencing -> no petition process exists; pardon only.',
    record: { title: 'Misdemeanor (not ordered)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { traffick_wi: false, ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'THE DEFINING HONEST-NO. Not ordered at sentencing -> no post-sentencing petition (Matasek/Arberry); pardon path. The template honest-no page.' },
    now: NOW,
  },
  {
    source: 'WI 7/19 statute-verified — persona 4 (942.08(3) at 17, no order -> mandatory-error note)',
    package: 'a § 942.08(3) offense committed at 17 with no expungement order visible -> pardon path, but the result carries the mandatory-order sentencing-error note.',
    record: { title: '§ 942.08(3) offense at 17 (no order)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { traffick_wi: false, ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'No order -> pardon_path_wi, whose copy now carries the (1m)(a)2 note: for a § 942.08(2)(b)/(c)/(d) or (3) offence under 18 the court SHALL order expungement, so a missing order may be a sentencing error worth raising with counsel.' },
    now: NOW,
  },
  {
    source: 'WI 7/19 statute-verified — persona 5 (944.30 trafficking victim -> (2m) motion)',
    package: 'a § 944.30 prostitution conviction resulting from being a trafficking victim -> (2m) motion, filable any time.',
    record: { title: '§ 944.30 conviction (trafficking victim)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { traffick_wi: true },
    expect: { resultKey: 'eligible_traffick_wi', reading: '§ 973.015(2m): a § 944.30 prostitution conviction resulting from trafficking can be vacated OR expunged by motion AT ANY TIME — the one route not locked to sentencing. Checked before the at-sentencing gate.' },
    now: NOW,
  },
  {
    source: 'WI 7/19 statute-verified — persona 6 (Class H felony with a prior felony -> (1m)(a)3 bar)',
    package: 'Class H felony with a lifetime prior felony, no order -> honest-no; copy reflects the (1m)(a)3 bar.',
    record: { title: 'Class H Felony (prior felony)', charge_type: 'felony', disposition: 'convicted' },
    answers: { traffick_wi: false, ordered_wi: false },
    expect: { resultKey: 'pardon_path_wi', reading: 'A Class H/I felony cannot be expunged with any prior felony (§ 973.015(1m)(a)3), which is why no order could have issued -> pardon_path_wi. The result copy explains the bar as the law working as written, not a mistake.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const SC: Persona[] = [
  {
    source: 'SC 7/19 statute-verified — persona 1 (summary dismissal -> 950 automatic free)',
    package: 'summary-court dismissal, fingerprinted -> § 950 automatic, free, 30-day internet scrub.',
    record: { title: 'Magistrate Dismissal', disposition: 'dismissed' },
    answers: { court_type_sc: true, summary_exception_sc: false },
    expect: { resultKey: 'eligible_950_sc', reading: 'Summary-court non-conviction, no exception -> court SHALL expunge, no application/cost (§ 17-22-950) + 30-day internet scrub.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 2 (preliminary-hearing dismissal -> 950 blocked -> 17-1-40)',
    package: 'dismissed at a preliminary hearing -> § 950 exception, route to the § 17-1-40 application.',
    record: { title: 'Preliminary-Hearing Dismissal', disposition: 'dismissed' },
    answers: { court_type_sc: true, summary_exception_sc: true },
    expect: { resultKey: 'eligible_17140_sc', reading: 'A preliminary-hearing dismissal is a § 950 exception -> not automatic; routes to the § 17-1-40 application (fees waived).' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 3 (GS nolle pros standalone -> 17-1-40, fees waived)',
    package: 'general-sessions nolle pros, not part of a plea deal -> § 17-1-40, all three fees waived.',
    record: { title: 'General-Sessions Nolle Pros', disposition: 'dismissed' },
    answers: { court_type_sc: false, gs_pleadeal_sc: false },
    expect: { resultKey: 'eligible_17140_sc', reading: 'GS non-conviction, not a plea deal -> § 17-1-40 destruction; $250/$25/$35 all waived (§ 17-22-940).' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 4 (nolle pros plea-deal -> $250 trap)',
    package: 'nolle pros as part of a plea deal (pled to other charges) -> § 17-1-40 eligible but the $250 solicitor fee applies.',
    record: { title: 'Nolle Pros (plea deal)', disposition: 'dismissed' },
    answers: { court_type_sc: false, gs_pleadeal_sc: true },
    expect: { resultKey: 'eligible_17140_pleadeal_sc', reading: 'PLEA-DEAL TRAP: the $250 waiver does NOT apply when the dismissal was part of a plea deal (§ 17-22-940) -> $250 due (SLED/clerk still waived).' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 5 (shoplifting <=30 days, 3yr -> 910)',
    package: 'shoplifting conviction (30-day max), 3 yrs clean from conviction date -> § 22-5-910 eligible.',
    record: { title: 'Shoplifting (30-day max)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's910', s910_mv_sc: false, s910_clean_sc: false, s910_dv_sc: false, s910_date_sc: '2022-01-01' },
    expect: { resultKey: 'eligible_910_sc', reading: 'First-offense minor conviction, 3yr from CONVICTION date (2022+3=2025<2026) -> § 22-5-910. Solicitor-administered, $250 nonrefundable warning.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 6 (same but out-of-state conviction at year 2 -> blocked)',
    package: 'same shoplifting but one out-of-state conviction during the 3-year window -> blocked (cleanliness).',
    record: { title: 'Shoplifting (later out-of-state conviction)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's910', s910_mv_sc: false, s910_clean_sc: true },
    expect: { resultKey: 'ineligible_910_clean_sc', reading: '§ 22-5-910 requires NO other conviction (incl. out-of-state) in the window -> a later out-of-state conviction blocks it -> ineligible_910_clean_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 7 (first-offense firearm possession -> 910 per 2024 Act 111)',
    package: 'first-offense unlawful firearm possession (<=1yr / <=$1,000), 3 yrs clean -> § 22-5-910(A) eligible per 2024 Act 111.',
    record: { title: 'First-Offense Firearm Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's910', s910_mv_sc: false, s910_clean_sc: false, s910_dv_sc: false, s910_date_sc: '2022-01-01' },
    expect: { resultKey: 'eligible_910_sc', reading: '2024 Act 111 added first-offense firearm/weapon possession (<=1yr/<=$1,000) to § 22-5-910(A); 3yr met -> eligible_910_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 8 (DV-3rd -> 5-year variant)',
    package: 'third-degree domestic violence, 6 yrs clean -> § 22-5-910 5-year variant met.',
    record: { title: 'DV 3rd Degree', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's910', s910_mv_sc: false, s910_clean_sc: false, s910_dv_sc: true, s910_dv_date_sc: '2020-01-01' },
    expect: { resultKey: 'eligible_910_sc', reading: 'DV-3rd takes the 5-year § 22-5-910 variant (not 3); 2020+5=2025<2026 -> eligible_910_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 9 (DUI -> motor-vehicle excluded)',
    package: 'DUI -> excluded from § 22-5-910 (motor-vehicle-operation offense).',
    record: { title: 'DUI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's910', s910_mv_sc: true },
    expect: { resultKey: 'ineligible_mv_sc', reading: '§ 22-5-910 excludes motor-vehicle-operation offenses -> DUI ineligible_mv_sc; pardon is the route.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 10 (YOA burglary 3rd, sentenced under YOA -> 920)',
    package: 'YOA-sentenced burglary 3rd, clean through sentence + 5 yrs -> § 22-5-920.',
    record: { title: 'YOA Burglary 3rd', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's920', s920_sentenced_sc: true, s920_excluded_sc: false, s920_date_sc: '2018-01-01' },
    expect: { resultKey: 'eligible_920_sc', reading: 'Sentenced under YOA, not excluded, 5yr from completion (2018+5=2023<2026) -> § 22-5-920, once per lifetime.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 11 (YOA-eligible but adult-sentenced -> trap)',
    package: 'YOA-eligible but sentenced as an adult -> ineligible for the § 920 path (the (B)(3) trap).',
    record: { title: 'YOA-Eligible, Adult-Sentenced', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's920', s920_sentenced_sc: false },
    expect: { resultKey: 'ineligible_yoa_trap_sc', reading: 'THE TRAP: YOA-eligible but not SENTENCED under YOA -> ineligible (§ 22-5-920(B)(3)). Sentencing paperwork decides it.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 12 (simple possession, 3yr from completion -> 930A)',
    package: 'first-offense simple possession, 3 yrs from sentence completion, no prior CD -> § 22-5-930(A).',
    record: { title: 'First-Offense Simple Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's930a', s930_lookback_sc: false, s930a_clean_sc: false, s930a_date_sc: '2022-01-01' },
    expect: { resultKey: 'eligible_930_sc', reading: '§ 22-5-930(A): 3yr from SENTENCE COMPLETION (not conviction). 2022+3=2025<2026 -> eligible_930_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 13 (PWID 20yr, non-drug misd at yr10 -> still eligible)',
    package: 'first-offense PWID, 20 yrs from completion, one NON-DRUG misdemeanor at year 10 -> still eligible (cleanliness = drug/felony only).',
    record: { title: 'PWID (non-drug misd at yr 10)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2005-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's930b', s930b_lookback_sc: false, s930b_clean_sc: false, s930b_date_sc: '2005-01-01' },
    expect: { resultKey: 'eligible_930_sc', reading: '§ 22-5-930(B): 20yr from completion; only a later DRUG or FELONY interrupts, so a non-drug misdemeanor does NOT count -> clean=no -> 2005+20=2025<2026 -> eligible.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 14 (PWID + felony at yr15 -> blocked)',
    package: 'first-offense PWID with a felony conviction at year 15 -> blocked (cleanliness fails).',
    record: { title: 'PWID (later felony)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2005-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's930b', s930b_lookback_sc: false, s930b_clean_sc: true },
    expect: { resultKey: 'ineligible_930_clean_sc', reading: 'A later FELONY interrupts the 20-year clean period -> ineligible_930_clean_sc (a non-drug misd would not have).' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 15 (CD lookback bar)',
    package: 'new marijuana possession conviction, but a drug conditional discharge 3 yrs before the arrest -> § 930(D) lookback bar.',
    record: { title: 'Marijuana Possession (prior CD)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2023-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 's930a', s930_lookback_sc: true },
    expect: { resultKey: 'ineligible_930_lookback_sc', reading: '§ 22-5-930(D): a drug conditional discharge within 5yr before a marijuana-possession arrest bars the path -> ineligible_930_lookback_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 16 (fraudulent check $400 -> MANDATORY)',
    package: 'first-offense fraudulent check ($400, misdemeanor-level), 1 yr clean -> court SHALL expunge (mandatory).',
    record: { title: 'Fraudulent Check ($400)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { juvenile_sc: false, conv_pending_sc: false, conv_path_sc: 'fraud', fraud_level_sc: false, fraud_clean_sc: false, fraud_date_sc: '2024-01-01' },
    expect: { resultKey: 'eligible_fraud_sc', reading: '§ 34-11-90(e): first-offense misdemeanor-level fraudulent check (<=$5,000), 1yr conviction-free (2024+1=2025<2026) -> court SHALL expunge (the only mandatory conviction path).' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 17 (juvenile status offense -> SHALL)',
    package: 'juvenile status offense -> court SHALL expunge (§ 63-19-2050).',
    record: { title: 'Juvenile Status Offense (truancy)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { juvenile_sc: true, juvenile_type_sc: 'status' },
    expect: { resultKey: 'eligible_juvenile_status_sc', reading: 'A juvenile status offense -> family court SHALL expunge (§ 63-19-2050); destruction + honest-no + restoration.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 18 (juvenile violent adjudication -> never)',
    package: 'juvenile violent-crime adjudication -> never expungeable (§ 63-19-2050).',
    record: { title: 'Juvenile Violent Adjudication', charge_type: 'felony', disposition: 'convicted' },
    answers: { juvenile_sc: true, juvenile_type_sc: 'violent' },
    expect: { resultKey: 'ineligible_juvenile_violent_sc', reading: 'A juvenile violent crime (§ 16-1-60) is a categorical bar under § 63-19-2050 -> ineligible_juvenile_violent_sc.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 19 (PTI -> honest-no)',
    package: 'completed pretrial intervention -> non-criminal disposition, destruction + full right to deny (§ 17-22-150).',
    record: { title: 'Completed PTI', disposition: 'deferred' },
    answers: { deferred_type_sc: 'pti' },
    expect: { resultKey: 'eligible_pti_sc', reading: 'PTI completion (§ 17-22-150) -> non-criminal disposition, § 17-1-40 destruction, restoration, and an explicit right to deny; SLED fee waived.' },
    now: NOW,
  },
  {
    source: 'SC 7/19 statute-verified — persona 20 (conditional discharge -> honest-no)',
    package: 'completed drug conditional discharge -> discharge/dismissal (no conviction), then expunge with full right to deny (§ 44-53-450).',
    record: { title: 'Completed Conditional Discharge', disposition: 'deferred' },
    answers: { deferred_type_sc: 'cd' },
    expect: { resultKey: 'eligible_cd_sc', reading: 'Conditional discharge (§ 44-53-450) -> not a conviction; $350/$150 discharge fee, then expunge -> restoration + full right to deny; once per person.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const AL: Persona[] = [
  {
    source: 'AL 7/19 statute-verified — persona 1 (misd dismissed with prejudice 91d)',
    package: 'dismissed with prejudice ~91 days ago -> § 15-27-1(a) 90-day non-conviction path, eligible.',
    record: { title: 'Dismissed With Prejudice', disposition: 'dismissed', disposition_date: '2026-04-10' },
    answers: { noncon_subtype_al: 'clean90', noncon_90_al: '2026-04-10' },
    expect: { resultKey: 'eligible_noncon_al', reading: 'Dismissal with prejudice + 90 days met -> eligible_noncon_al. Copy leads with the Affidavit of Substantial Hardship for the $500 fee + the ACJIC exhibit + DA-keeps-records.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 2 (conditional nolle -> not the 90-day ground)',
    package: 'nolle prossed WITH conditions -> not the (a)(4) 90-day ground; check the program path.',
    record: { title: 'Conditional Nolle Prosequi', disposition: 'dismissed' },
    answers: { noncon_subtype_al: 'nolle_cond' },
    expect: { resultKey: 'complex_nolle_al', reading: 'The quick 90-day path is unconditional nolle only (§ 15-27-1(a)(4)); a conditional nolle -> complex_nolle_al (likely the 1-yr program path).' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 3 (diversion 11 months -> wait)',
    package: 'court program completed 11 months ago -> wait until 1 year.',
    record: { title: 'Diversion (11 months)', disposition: 'deferred', disposition_date: '2025-08-20' },
    answers: { program_date_al: '2025-08-20' },
    expect: { resultKey: 'waiting_program_al', reading: 'Program completion needs 1 year (§ 15-27-1(a)(6)); 11 months (2025-08+1yr=2026-08>2026-07) -> waiting_program_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 4 (misd dismissed without prejudice, refiled -> blocked)',
    package: 'dismissed without prejudice 13 months ago, refiled -> blocked (not-refiled requirement).',
    record: { title: 'Dismissed Without Prejudice (refiled)', disposition: 'dismissed', disposition_date: '2025-06-01' },
    answers: { noncon_subtype_al: 'without', wop_class_al: 'misd', wop_misd_refiled_al: true },
    expect: { resultKey: 'ineligible_refiled_al', reading: 'Dismissal without prejudice requires NOT refiled -> refiled blocks it (§ 15-27-1(a)) -> ineligible_refiled_al (timing bar).' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 5 (misd wo-prejudice + traffic conviction -> cleanliness fail)',
    package: 'dismissed without prejudice 13 months, not refiled, BUT a non-minor traffic conviction 18 months ago -> blocked (2-yr cleanliness).',
    record: { title: 'Dismissed Without Prejudice (recent traffic conv)', disposition: 'dismissed', disposition_date: '2025-06-01' },
    answers: { noncon_subtype_al: 'without', wop_class_al: 'misd', wop_misd_refiled_al: false, wop_misd_clean_al: true },
    expect: { resultKey: 'ineligible_wop_clean_al', reading: 'The misd without-prejudice path needs no conviction in the prior 2 years; a non-minor traffic conviction counts -> ineligible_wop_clean_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 6 (misd theft conviction, restitution unpaid -> blocked)',
    package: 'misdemeanor theft conviction, 3yr clean, restitution UNPAID -> blocked at (b)(1).',
    record: { title: 'Misdemeanor Theft (restitution owed)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', restitution_paid: false },
    answers: { conv_class_al: 'misd', misd_excluded_al: false, misd_cdl_al: false },
    expect: { resultKey: 'ineligible_restitution_al', reading: '§ 15-27-1(b)(1): all money paid is required; restitution_paid=false -> ineligible_restitution_al before the 3-yr clock even matters.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 7 (same, restitution paid -> eligible)',
    package: 'same misdemeanor theft but restitution PAID, 3yr clean -> REDEEMER eligible, first-petition grant presumption.',
    record: { title: 'Misdemeanor Theft (paid)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', restitution_paid: true },
    answers: { conv_class_al: 'misd', misd_excluded_al: false, misd_cdl_al: false, misd_conv_date_al: '2022-01-01' },
    expect: { resultKey: 'eligible_misd_al', reading: 'REDEEMER (§ 15-27-1(b)): 3yr from conviction (2022+3=2025<2026), all paid -> eligible_misd_al. Copy carries the first-petition grant presumption (§ 15-27-5) + affirmative disclosure duty (§ 15-27-6).' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 8 (DV misd -> violent exclusion, cross-ref pending)',
    package: 'DV misdemeanor -> excluded as violent per § 12-25-32 (list cross-ref pending).',
    record: { title: 'DV Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { conv_class_al: 'misd', misd_excluded_al: true, misd_reclassified_al: false },
    expect: { resultKey: 'ineligible_excluded_al', reading: 'A DV misd checked against the § 12-25-32 violent list (unpulled) -> excluded (not an Act 2015-185 reclassification) -> ineligible_excluded_al; the result flags the cross-reference is worth confirming.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 9 (CDL 383.51 offense -> excluded)',
    package: 'CDL holder, speeding-related 49 CFR 383.51 offense committed in a commercial vehicle -> blocked.',
    record: { title: 'CDL Commercial-Driving Offense', charge_type: 'misdemeanor', disposition: 'convicted', restitution_paid: true },
    answers: { conv_class_al: 'misd', misd_excluded_al: false, misd_cdl_al: true },
    expect: { resultKey: 'ineligible_cdl_al', reading: '49 CFR 383.51 CDL offense committed while operating a CMV / holding a CDL -> ineligible_cdl_al (§ 15-27-1(b)).' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 10 (trafficking victim non-conviction -> eligible)',
    package: 'charge that occurred during trafficking, trafficker convicted -> (a)(8) eligible any posture.',
    record: { title: 'Trafficking-Victim Charge', disposition: 'dismissed' },
    answers: { noncon_subtype_al: 'trafficking' },
    expect: { resultKey: 'eligible_trafficking_al', reading: '§ 15-27-1(a) trafficking-victim ground: preponderance showing (trafficker conviction is evidence, not required) -> eligible_trafficking_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 11 (felony no-billed 91d -> eligible)',
    package: 'felony no-billed ~91 days ago -> § 15-27-2(a) 90-day non-conviction path, eligible.',
    record: { title: 'Felony No-Bill', charge_type: 'felony', disposition: 'dismissed', disposition_date: '2026-04-10' },
    answers: { noncon_subtype_al: 'clean90', noncon_90_al: '2026-04-10' },
    expect: { resultKey: 'eligible_noncon_al', reading: 'Felony no-bill + 90 days (§ 15-27-2(a)) -> eligible_noncon_al. The 90-day clean-ground is the same for misd and felony.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 12 (felony wo-prejudice 3yr -> 5-yr wait)',
    package: 'felony dismissed without prejudice 3.5 years ago -> BLOCKED (felony needs 5 years, § 15-27-2(a)(7)).',
    record: { title: 'Felony Dismissed Without Prejudice', charge_type: 'felony', disposition: 'dismissed', disposition_date: '2023-01-01' },
    answers: { noncon_subtype_al: 'without', wop_class_al: 'felony', wop_felony_refiled_al: false, wop_felony_clean_al: false, wop_felony_date_al: '2023-01-01' },
    expect: { resultKey: 'waiting_noncon_al', reading: 'FELONY without-prejudice is 5 years (§ 15-27-2(a)(7)), not the 1-yr misd number. 2023+5=2028>2026 -> waiting_noncon_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 13 (felony wo-prejudice 5.5yr + traffic yr4 -> blocked)',
    package: 'felony without prejudice 5.5 years, not refiled, but a non-minor traffic conviction at year 4 -> blocked (5-yr cleanliness).',
    record: { title: 'Felony Without Prejudice (recent traffic)', charge_type: 'felony', disposition: 'dismissed', disposition_date: '2021-01-01' },
    answers: { noncon_subtype_al: 'without', wop_class_al: 'felony', wop_felony_refiled_al: false, wop_felony_clean_al: true },
    expect: { resultKey: 'ineligible_wop_clean_al', reading: 'Felony without-prejudice needs no conviction in the prior 5 years; a non-minor traffic conviction at year 4 blocks it -> ineligible_wop_clean_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 14 (felony diversion 13 months -> eligible)',
    package: 'felony court program completed 13 months ago -> eligible (1-yr program path).',
    record: { title: 'Felony Diversion (13 months)', charge_type: 'felony', disposition: 'deferred', disposition_date: '2025-06-01' },
    answers: { program_date_al: '2025-06-01' },
    expect: { resultKey: 'eligible_program_al', reading: 'Program completion + 1 year (§ 15-27-2(a)) -> eligible_program_al; expungement may also have been ordered as a program condition.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 15 (unpardoned felony 25yr -> NO PATH, pardon-first)',
    package: 'unpardoned Class C theft felony, 25 years clean -> NO time-based route; pardon-first output.',
    record: { title: 'Class C Theft Felony (unpardoned)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2001-01-01' },
    answers: { conv_class_al: 'felony', felony_trafficking_al: false, felony_pardon_al: false },
    expect: { resultKey: 'pardon_first_al', reading: 'THE AL HEADLINE: a felony CONVICTION has no time-based route (§ 15-27-2(c)) — 25 years clean does nothing. Route is pardon-first, then 180 days -> pardon_first_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 16 (pardoned felony + 181d nonviolent -> eligible)',
    package: 'pardoned nonviolent felony, rights restored, 181 days since the certificate -> eligible.',
    record: { title: 'Pardoned Nonviolent Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_class_al: 'felony', felony_trafficking_al: false, felony_pardon_al: true, felony_excluded_al: false, felony_cdl_al: false, felony_pardon_date_al: '2026-01-10' },
    expect: { resultKey: 'eligible_felony_al', reading: 'Pardon + rights restored + not excluded + 180 days met (2026-01-10 is ~186 days before now) -> eligible_felony_al (§ 15-27-2(c)).' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 17 (pardoned felony 90 days -> wait)',
    package: 'pardoned felony, but only 90 days since the certificate -> wait for 180.',
    record: { title: 'Pardoned Felony (90 days)', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_class_al: 'felony', felony_trafficking_al: false, felony_pardon_al: true, felony_excluded_al: false, felony_cdl_al: false, felony_pardon_date_al: '2026-04-15' },
    expect: { resultKey: 'waiting_pardon_al', reading: '§ 15-27-2(c) needs 180 days after the pardon certificate; ~91 days (2026-04-15) -> waiting_pardon_al.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 18 (pardoned robbery, violent -> blocked)',
    package: 'pardoned robbery (violent), no trafficking nexus -> blocked (violent exclusion survives the pardon).',
    record: { title: 'Pardoned Robbery', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_class_al: 'felony', felony_trafficking_al: false, felony_pardon_al: true, felony_excluded_al: true, felony_reclassified_al: false },
    expect: { resultKey: 'ineligible_felony_excluded_al', reading: 'Even with a pardon, a violent offense (§ 12-25-32) is excluded (§ 15-27-2(c)) -> ineligible_felony_excluded_al; result flags the trafficking carve-out.' },
    now: NOW,
  },
  {
    source: 'AL 7/19 statute-verified — persona 19 (trafficking promoting-prostitution felony -> (b) carve-out)',
    package: 'trafficking victim convicted of promoting prostitution 1st (violent) -> (b) eligible despite the violent classification.',
    record: { title: 'Promoting Prostitution 1st (trafficking victim)', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_class_al: 'felony', felony_trafficking_al: true },
    expect: { resultKey: 'eligible_trafficking_felony_al', reading: '§ 15-27-2(b): promoting prostitution 1st (13A-12-111), committed during and because of trafficking, overrides the (c)(4) violent bar and needs no pardon -> eligible_trafficking_felony_al.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
const LA: Persona[] = [
  {
    source: 'LA 7/19 statute-verified — persona 1 (acquittal, fee-free)',
    package: 'acquittal after trial, no diversion -> 976 eligible + 983(F)(1) fee-free.',
    record: { title: 'Acquittal', disposition: 'acquitted', disposition_date: '2025-05-01' },
    answers: { noncon_age_la: 'adult', noncon_dwi_la: false, noncon_diversion_la: false },
    expect: { resultKey: 'eligible_noncon_la', reading: 'Acquittal after trial (no diversion) -> art. 976 eligible; result leads with the § 983(F) fee-free certification (no felony history + nothing pending). Fee-free path.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 2 (DWI-diversion 5yr-from-arrest trap)',
    package: 'DWI arrest resolved by pretrial diversion, arrested 3 years ago -> blocked until 5 years from ARREST (976(B)).',
    record: { title: 'DWI (diversion)', disposition: 'dismissed', disposition_date: '2023-08-01' },
    answers: { noncon_age_la: 'adult', noncon_dwi_la: true, dwi_diversion_date_la: '2023-07-15' },
    expect: { resultKey: 'waiting_dwi_diversion_la', reading: 'DWI-arrest-diversion trap (art. 976(B), R.S. 15:578.1): 5 years from the ARREST, not the disposition. Arrested 2023 (3yr<5) -> waiting.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 3 (misd 5.5yr, later misd does not interrupt)',
    package: 'misdemeanor theft, 5.5 years post-sentence, one new MISDEMEANOR at year 3, no felonies -> 977(A)(2) ELIGIBLE (felony-free is the test).',
    record: { title: 'Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'misdemeanor', misd_excluded_la: false, misd_dwi_la: false, misd_date_la: '2021-01-01' },
    expect: { resultKey: 'eligible_misd_la', reading: 'CLEANLINESS ASYMMETRY: 977(A)(2) is FELONY-free, so a later misdemeanor does not interrupt. 5.5yr>5 (2021+5=2026-01<2026-07) -> eligible.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 4 (same facts on a felony -> not eligible)',
    package: 'same 5.5-years fact pattern but a FELONY -> 978(A)(2) not eligible (any-offense cleanliness; and the 10-yr period is not even met).',
    record: { title: 'Felony (5.5 yrs)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2021-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'other', felony_date_la: '2021-01-01' },
    expect: { resultKey: 'waiting_felony_la', reading: 'The felony test (978(A)(2)) is ANY-offense cleanliness over 10 yrs — stricter than the misdemeanor felony-free test. At 5.5yr the 10-yr period is not met -> waiting_felony_la (the copy states the any-offense standard).' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 5 (domestic abuse battery -> never)',
    package: 'domestic abuse battery misdemeanor -> excluded (977(C)(2)).',
    record: { title: 'Domestic Abuse Battery', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'misdemeanor', misd_excluded_la: true },
    expect: { resultKey: 'ineligible_misd_excluded_la', reading: 'Domestic abuse battery is a 977(C) misdemeanor exclusion -> ineligible. Result notes the Art. 985.1 interim path only for the sex-offense-arrest situation.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 6 (marijuana, $300 window)',
    package: 'first-offense marijuana possession, convicted 91 days ago, filed 7/25/26 -> eligible, $300 cap.',
    record: { title: 'First-Offense Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2026-04-25' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: true, marijuana_date_la: '2026-04-25' },
    expect: { resultKey: 'eligible_marijuana_la', reading: '977(D) 90-day fast path: convicted 91 days before now (2026-07-25) -> eligible. Before Aug 1, 2026 -> the $300 cap applies (983(M)); the result surfaces the deadline.' },
    now: '2026-07-25',
  },
  {
    source: 'LA 7/19 statute-verified — persona 7 (marijuana, $550 after sunset)',
    package: 'same first-offense marijuana, convicted 91 days ago, filed 8/2/26 -> eligible, $550 cap (sunset passed).',
    record: { title: 'First-Offense Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2026-05-03' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: true, marijuana_date_la: '2026-05-03' },
    expect: { resultKey: 'eligible_marijuana_la', reading: 'Same 90-day path -> eligible; filed on/after Aug 1, 2026 the $300 cap has sunset to $550 (983(M)). Same result key, fee tier is date-driven copy.' },
    now: '2026-08-02',
  },
  {
    source: 'LA 7/19 statute-verified — persona 8 (893(E) felony set-aside -> immediate)',
    package: 'felony simple possession with a 893(E) set-aside -> immediate 978(A)(1) + CDS set-aside exception.',
    record: { title: 'Felony Simple Possession (893(E) set-aside)', charge_type: 'felony', disposition: 'deferred', disposition_date: '2024-01-01' },
    expect: { resultKey: 'eligible_setaside_la', reading: 'A 893(E) felony set-aside/dismissal feeds straight into 978(A)(1) — immediate expungement, no wait. The CDS 978(B)(3)(d) 893(E) hook is exactly this. Replaces the old draft path.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 9 (PWID 10yr -> eligible)',
    package: 'possession-with-intent conviction, 10 years clean -> eligible via 978(B)(3)(b) CDS exception.',
    record: { title: 'PWID (felony)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'cds', felony_cds_la: true, felony_date_la: '2012-01-01' },
    expect: { resultKey: 'eligible_felony_la', reading: 'PWID is a light-CDS exception (expungeable, 978(B)(3)); 10yr met (2012+10=2022<2026) -> eligible_felony_la.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 10 (heroin distribution >5yr -> barred)',
    package: 'heroin distribution punishable by more than 5 years, no pardon -> barred (978(B)(3)).',
    record: { title: 'Heroin Distribution', charge_type: 'felony', disposition: 'convicted', disposition_date: '2010-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'cds', felony_cds_la: false },
    expect: { resultKey: 'ineligible_felony_cds_la', reading: 'Heavy CDS (manufacture/distribution >5yr) without a pardon/893(E) hook stays barred (978(B)). Result flags the 893(E) and first-offender-pardon reopeners.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 11 (simple robbery -> 978(E))',
    package: 'simple robbery, 10 years clean, nothing pending -> 978(E) contradictory-hearing carve-out.',
    record: { title: 'Simple Robbery', charge_type: 'felony', disposition: 'convicted', disposition_date: '2010-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'cov', felony_cov_la: true, felony_978e_date_la: '2010-01-01' },
    expect: { resultKey: 'eligible_978e_la', reading: 'Simple robbery is one of the six 978(E) crime-of-violence carve-outs -> expungeable after 10yr (2010+10=2020<2026) via a contradictory hearing (Art. 980).' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 12 (two eligible felonies same decade)',
    package: 'a second eligible felony in the same decade -> both expungeable (978(F), 2024 No. 580).',
    record: { title: 'Second eligible felony', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'other', felony_date_la: '2013-01-01' },
    expect: { resultKey: 'eligible_felony_la', reading: '978(F): more than one felony may be expunged in a 10-year period if each independently qualifies (old one-shot limit repealed). 10yr met -> eligible; the result states the multi-felony rule.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 13 (trafficking victim -> waits + fees waived)',
    package: 'human-trafficking victim with prosecutor certification -> all time delays AND fees waived (983(H)).',
    record: { title: 'Trafficking-related conviction', charge_type: 'felony', disposition: 'convicted', disposition_date: '2024-01-01' },
    answers: { conv_trafficking_la: true },
    expect: { resultKey: 'eligible_trafficking_la', reading: '983(H): a prosecutor certification (preponderance) waives ALL 977/978 time delays AND all fees. Checked before any waiting period -> eligible_trafficking_la.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 14 (crime of violence, not on the six-list -> never)',
    package: 'crime-of-violence felony not on the 978(E) list -> never (978(B)(1)).',
    record: { title: 'Crime of Violence (not carved out)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2012-01-01' },
    answers: { conv_trafficking_la: false, conv_marijuana_la: false, conv_level_la: 'felony', felony_type_la: 'cov', felony_cov_la: false },
    expect: { resultKey: 'ineligible_felony_cov_la', reading: 'A crime of violence (14:2(B)) not among the six carve-outs -> ineligible (978(B)(1)); result tells them to rule out the six-offense carve-out first.' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 15 (17-at-arrest -> free Art. 999 expedited)',
    package: '17 at arrest, Title 14 offense, DA declined after diversion, no conviction from the incident -> 999 entitled, $0, no motion.',
    record: { title: 'Declined charge (age 17 at arrest)', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: { noncon_age_la: 'minor', noncon_999_la: true },
    expect: { resultKey: 'eligible_999_la', reading: 'Art. 999: 17 at arrest + Title 14/40 + no conviction from the incident -> FREE expedited expungement, no motion (983(G)(2)). Diversion does NOT kill the waiver for a 17-year-old (unlike an adult).' },
    now: NOW,
  },
  {
    source: 'LA 7/19 statute-verified — persona 16 (same but 18 at arrest -> 976, diversion kills the waiver)',
    package: 'same declined-after-diversion case but 18 at arrest -> standard 976 motion, and completing diversion kills the fee waiver (the 983(F) trap).',
    record: { title: 'Declined charge (age 18 at arrest)', disposition: 'dismissed', disposition_date: '2024-06-01' },
    answers: { noncon_age_la: 'adult', noncon_dwi_la: false, noncon_diversion_la: true },
    expect: { resultKey: 'eligible_noncon_diversion_la', reading: 'AGE CONTRAST to persona 15: an adult diversion completer gets art. 976 but NOT the 983(F) fee-free waiver (diversion kills it) -> pays up to $550; IFP (CCP 5181) suggested. The 999 free path is minors-only.' },
    now: NOW,
  },
];

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// WAVE 6 — KY, OR, IA, NV, AR, MS, KS, NM, NE, ID, WV
// ---------------------------------------------------------------------------
const KY: Persona[] = [
  {
    source: 'KY 7/19 statute-verified — persona 1 (acquittal 8/2020 -> automatic opt-out)',
    package: 'acquittal 8/2020 -> § 431.076(1)(a) automatic expungement at 30 days unless the person objects.',
    record: { title: 'Acquittal (Aug 2020)', disposition: 'acquitted' },
    answers: { nonconv_type_ky: 'acquittal_dismissal', nonconv_auto_cutoff_ky: true },
    expect: { resultKey: 'eligible_nonconv_auto_ky', reading: 'Acquittal on/after 7/15/2020 -> automatic opt-out tier (§ 431.076(1)(a)); no action, court acts at 30 days. Note DCBS-records carve-out.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 2 (acquittal 2018 -> petition tier, mandatory grant)',
    package: 'acquittal 2018 (pre-7/15/2020) -> petition tier; court SHALL grant.',
    record: { title: 'Acquittal (2018)', disposition: 'acquitted' },
    answers: { nonconv_type_ky: 'acquittal_dismissal', nonconv_auto_cutoff_ky: false },
    expect: { resultKey: 'eligible_nonconv_petition_ky', reading: 'Pre-7/15/2020 acquittal -> not automatic (not retroactive); petition tier, mandatory grant (§ 431.076(3)(a)), no statutory fee, no certificate.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 3 (with-prejudice dismissal as part of plea -> ineligible)',
    package: 'dismissal with prejudice in exchange for a guilty plea to another charge -> (1)(a)/(1)(b) ineligible.',
    record: { title: 'Plea-Deal Dismissal', disposition: 'dismissed' },
    answers: { nonconv_type_ky: 'plea_dismissal' },
    expect: { resultKey: 'nonconv_plea_ineligible_ky', reading: 'A dismissal in exchange for a guilty plea to another charge is excluded from both § 431.076 tiers -> screen the charge actually pleaded to instead.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 4 (felony dismissed w/o prejudice 2 yrs ago -> wait to 3)',
    package: 'felony dismissed without prejudice 2 years ago -> § 431.076(1)(b) 3-yr wait not met.',
    record: { title: 'Felony Dismissed W/O Prejudice', disposition: 'dismissed' },
    answers: { nonconv_type_ky: 'without_prejudice', nonconv_wop_level_ky: 'felony', nonconv_wop_felony_date_ky: '2024-06-01' },
    expect: { resultKey: 'waiting_nonconv_ky', reading: 'Without-prejudice felony dismissal 2024-06 (+3 yr = 2027-06 > 2026-07) -> waiting. (Misdemeanor would be 1 yr.)' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 5 (listed exclusion 508.032 -> (1)(d) blocked)',
    package: 'Class D felony that is a 508.032 assault (DV-adjacent) -> § 431.073(1)(d) exclusion.',
    record: { title: 'Class D Assault (508.032)', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: true },
    expect: { resultKey: 'felony_excluded_ky', reading: '508.032 is on the (1)(d) exclusion list (with 189A.010, 519.055, abuse of office, sex/child offenses, SBI/death) -> broad route closed; a full pardon opens (1)(c).' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 6 (Class D theft 514.030, 5 yr, clean -> (1)(a) list path + voting)',
    package: 'Class D theft (514.030), 5 yr past probation, clean -> § 431.073(1)(a) enumerated list path; vacatur restores voting.',
    record: { title: 'Class D Theft (514.030)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'listed', felony_date_ky: '2019-01-01', felony_findings_ky: true },
    expect: { resultKey: 'eligible_felony_list_ky', reading: '514.030 theft is on the (1)(a) list; 2019+5=2024<2026, findings met -> eligible. Result LEADS with voting-rights restoration (§ 431.073(7),(8)) — the item-14 voting test.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 7 (Class D non-list, clean, prosecutor silent 120 days -> vacate without hearing)',
    package: 'non-list Class D felony, clean, no prosecutor objection -> § 431.073(1)(d)/(6) vacate without a hearing.',
    record: { title: 'Class D Felony (non-list)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'not_listed', felony_1d_date_ky: '2019-01-01', felony_1d_findings_ky: true, felony_1d_objection_ky: false, felony_paid_ky: true },
    expect: { resultKey: 'eligible_felony_1d_noobjection_ky', reading: 'Broad (1)(d) route; no objection / 120-day silence -> court MAY vacate WITHOUT a hearing (§ 431.073(6)). $250 paid -> expungement complete, voting restored.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 8 (same, prosecutor OBJECTS -> clear-and-convincing hearing)',
    package: 'same non-list Class D but the prosecutor objects -> § 431.073(4) clear-and-convincing hearing, applicant\'s burden.',
    record: { title: 'Class D Felony (non-list, contested)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'not_listed', felony_1d_date_ky: '2019-01-01', felony_1d_findings_ky: true, felony_1d_objection_ky: true },
    expect: { resultKey: 'eligible_felony_1d_hearing_ky', reading: 'Objection -> hearing within 120 days where the APPLICANT proves by clear and convincing evidence; balancing test, victim heard (§ 431.073(4)).' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 9 (vacated but $250 unpaid at month 12 -> pending payment)',
    package: 'broad (1)(d) vacatur granted, but the $250 expungement fee is unpaid at month 12 -> "vacated, expungement pending payment".',
    record: { title: 'Class D Felony (vacated, $250 unpaid)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2019-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'not_listed', felony_1d_date_ky: '2019-01-01', felony_1d_findings_ky: true, felony_1d_objection_ky: false, felony_paid_ky: false },
    expect: { resultKey: 'felony_pending_payment_ky', reading: 'THE TWO-STAGE FEE TRAP: vacated, but the $250 expungement fee is unpaid -> expungement NOT complete (§ 431.073(11)). Installments allowed, show-cause not jail.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 10 (two Class D felonies, both (1)(d)-eligible -> multiple OK)',
    package: 'two separate-incident Class D felonies, both non-list, non-excluded, clean -> multiple-felony (1)(d) application allowed.',
    record: { title: 'Two Class D Felonies', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'not_listed', felony_1d_date_ky: '2018-01-01', felony_1d_findings_ky: true, felony_1d_objection_ky: false, felony_paid_ky: true },
    expect: { resultKey: 'eligible_felony_1d_noobjection_ky', reading: 'The 2019 (1)(d) expansion allows MULTIPLE eligible Class D felonies in one application (no once-per-lifetime cap) -> the tree does not block a second. Result copy states the multiple-felony rule.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 11 (misd 5.5 yr, enhanceable with live window -> 078(4)(d) blocked)',
    package: 'misdemeanor 5.5 yr past sentence, but enhanceable offense with an open enhancement window -> § 431.078(4)(d) blocked.',
    record: { title: 'Enhanceable Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2020-06-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'misd', misd_excluded_ky: false, misd_series_ky: 'single', misd_enhance_ky: true },
    expect: { resultKey: 'misd_enhance_block_ky', reading: 'THE ENHANCEMENT TRAP: even though 5+ years have passed, an enhanceable offense cannot be expunged until its enhancement window expires (§ 431.078(4)(d)) — a separate gate before the date check.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 12 (first-offense possession, treatment done -> 218A.275 voiding)',
    package: 'first-offense drug possession, completed treatment -> § 218A.275 set-aside/void, no wait, once only.',
    record: { title: 'First-Offense Possession', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_type_ky: 'drug_first', drug275_ky: true },
    expect: { resultKey: 'eligible_drug275_ky', reading: '§ 218A.275: completed treatment -> court may set aside and void, no waiting period; ONCE per lifetime, barred by a prior 218A.14151 dismissal. Feeds the § 431.078 no-wait exception.' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 13 (marijuana possession, second time -> 218A.276 still available)',
    package: 'marijuana possession, has used a drug-voiding route before -> § 218A.276 still available (no once-only limit).',
    record: { title: 'Marijuana Possession (2nd voiding)', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_type_ky: 'drug_mj', drug276_ky: true },
    expect: { resultKey: 'eligible_drug276_ky', reading: 'THE ASYMMETRY: § 218A.276 (marijuana/synthetic/salvia) has NO first-offense requirement and NO once-only limit -> available even after a prior drug voiding. Contrast § 218A.275 (once, first offense only).' },
    now: NOW,
  },
  {
    source: 'KY 7/19 statute-verified — persona 14 (felony vacated -> voting-rights restoration in output)',
    package: 'enumerated Class D felony vacated -> output leads with voting-rights restoration (§ 431.073(7)/(8)).',
    record: { title: 'Class D Felony (voting focus)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2018-01-01', probation_status: 'completed' },
    answers: { conv_type_ky: 'felony', felony_class_ky: 'classD', felony_exclusion_ky: false, felony_list_ky: 'listed', felony_date_ky: '2018-01-01', felony_findings_ky: true },
    expect: { resultKey: 'eligible_felony_list_ky', reading: 'Item-14 voting test: eligible_felony_list_ky copy leads with VOTING RIGHTS RESTORED on completion (§ 431.073(7),(8)), alongside no-background-check-appearance and no disclosure duty.' },
    now: NOW,
  },
];

const OR: Persona[] = [
  {
    source: 'OR 7/19 statute-verified — persona 1 (Class A misd theft, 3 yr, clean, done -> eligible, no fee)',
    package: 'Class A misdemeanor theft, 3 yr post-conviction, clean, sentence done -> eligible, free filing.',
    record: { title: 'Class A Misdemeanor Theft', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'misdA', misdA_wait_or: '2022-01-01', misdA_lookback_or: 'none', conv_objection_or: false },
    expect: { resultKey: 'eligible_conviction_or', reading: 'Class A misd, 3-yr wait met (2022+3=2025<2026), clean lookback, no objection -> shall-grant. Filing free (ORS 21.135 waived).' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 2 (same but still on probation -> blocked)',
    package: 'same theft but still on probation -> supervision incomplete -> blocked (1)(a).',
    record: { title: 'Class A Misd Theft (on probation)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', probation_status: 'active' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: false },
    expect: { resultKey: 'ineligible_supervision_or', reading: 'Still under supervision -> sentence not fully performed -> ineligible until complete (ORS 137.225(1)(a)).' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 3 (Class C felony, 5 yr, one MV violation in window -> eligible)',
    package: 'Class C felony, 5 yr, one motor-vehicle violation in the window -> MV violations excluded from lookback -> eligible.',
    record: { title: 'Class C Felony (+MV violation)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyC', felonyC_wait_or: '2020-01-01', felonyC_lookback_or: 'none', conv_objection_or: false },
    expect: { resultKey: 'eligible_conviction_or', reading: 'A motor-vehicle violation is EXCLUDED from the cleanliness lookback (ORS 137.225(7)(a)(B)) -> counts as clean -> eligible.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 4 (Class C felony, 5 yr, one non-MV violation -> forgiven)',
    package: 'Class C felony, 5 yr, one non-MV violation in the window -> (7)(b) single-violation forgiveness -> eligible.',
    record: { title: 'Class C Felony (+1 violation)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyC', felonyC_wait_or: '2020-01-01', felonyC_lookback_or: 'one_violation', conv_objection_or: false },
    expect: { resultKey: 'eligible_conviction_or', reading: '(7)(b): a SINGLE non-traffic violation in the window is forgiven -> still eligible.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 5 (two violations in window -> blocked)',
    package: 'Class C felony, 5 yr, two violations in the window -> beyond the single-violation forgiveness -> blocked.',
    record: { title: 'Class C Felony (+2 violations)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyC', felonyC_wait_or: '2020-01-01', felonyC_lookback_or: 'other' },
    expect: { resultKey: 'ineligible_lookback_or', reading: 'More than a single violation in the lookback -> blocked until the window clears (ORS 137.225(7)).' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 6 (prior SET-ASIDE conviction inside lookback -> blocked)',
    package: 'Class C felony, 5 yr, but a prior already-SET-ASIDE conviction inside the window -> the (7)(b) trap -> blocked.',
    record: { title: 'Class C Felony (prior set-aside in window)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyC', felonyC_wait_or: '2020-01-01', felonyC_lookback_or: 'other' },
    expect: { resultKey: 'ineligible_lookback_or', reading: "OREGON'S SIGNATURE TRAP: an already-SET-ASIDE conviction STILL COUNTS toward the lookback (ORS 137.225(7)(b)) -> blocked." },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 7 (Class B person felony per OCJC -> never)',
    package: 'Class B felony that is a person felony per OCJC rules -> (6) exclusion -> never.',
    record: { title: 'Class B Person Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: { conv_type_or: 'standard', conv_excluded_or: true },
    expect: { resultKey: 'ineligible_excluded_or', reading: 'A person felony (as the Criminal Justice Commission classifies it) is excluded from set-aside (ORS 137.225(6)) -> never.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 8 (Class B non-person, 7 yr, clean -> eligible)',
    package: 'Class B non-person felony, 7 yr, clean -> eligible.',
    record: { title: 'Class B Felony (non-person)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2016-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyB', felonyB_wait_or: '2016-01-01', felonyB_lookback_or: 'none', conv_objection_or: false },
    expect: { resultKey: 'eligible_conviction_or', reading: 'Non-person Class B felony, 7-yr wait met (2016+7=2023<2026), clean -> eligible (SB 397 dropped the old 20-yr wait to 7).' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 9 (DUII conviction -> never)',
    package: 'DUII conviction -> traffic exclusion -> permanently barred.',
    record: { title: 'DUII Conviction', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { conv_type_or: 'traffic' },
    expect: { resultKey: 'ineligible_traffic_or', reading: 'Traffic offenses (incl. DUII) can NEVER be set aside (ORS 137.225(7)(a)(A)) — the permanent DUII bar, stated explicitly.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 10 (DUII diversion dismissal -> never)',
    package: 'DUII diversion completed and dismissed -> (8)(a) the second DUII bar -> never.',
    record: { title: 'DUII Diversion (dismissed)', disposition: 'deferred' },
    answers: { deferred_type_or: 'duii' },
    expect: { resultKey: 'ineligible_duii_diversion_or', reading: 'A completed DUII-diversion dismissal is excluded (ORS 137.225(8)) — diversion "success" is a permanent record in Oregon.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 11 (non-DUII dismissal -> any time, shall-grant)',
    package: 'non-DUII charge dismissed -> set aside any time, shall-grant.',
    record: { title: 'Dismissed Theft Charge', disposition: 'dismissed' },
    answers: { nonconv_type_or: 'acquittal_dismissal', nonconv_traffic_or: false, nonconv_pending_or: false },
    expect: { resultKey: 'eligible_nonconv_or', reading: 'Non-conviction (dismissal), not traffic, nothing pending -> set aside any time, court SHALL grant (ORS 137.225(1)(d)).' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 12 (declination set-aside -> eligible at 60 days + unseal caveat)',
    package: 'arrested, no charge filed, prosecutor declined ~105 days ago -> eligible at 60 days; unseal-risk caveat.',
    record: { title: 'Arrest, Prosecutor Declined', disposition: 'dismissed' },
    answers: { nonconv_type_or: 'declination', nonconv_declination_date_or: '2026-04-01' },
    expect: { resultKey: 'eligible_declination_or', reading: 'Declination + 60 days (2026-04 -> ~105 days) -> eligible (ORS 137.225(1)(c)). Result carries the (11)(b) unseal caveat.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 13 (probation revoked 2 yr ago on 1-yr-tier misd -> blocked to 3 yr)',
    package: '1-yr-tier misdemeanor, probation revoked 2 yr ago -> later of 3 yr from revocation or (1)(b) -> blocked.',
    record: { title: 'Misdemeanor (probation revoked)', charge_type: 'misdemeanor', disposition: 'convicted', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: true, conv_revoked_date_or: '2024-06-01' },
    expect: { resultKey: 'waiting_revocation_or', reading: 'Probation-revocation penalty (ORS 137.225(1)(e)): revoked 2024-06 (+3 yr = 2027-06 > 2026-07) -> blocked until 3 yr from revocation, even though the 1-yr tier is otherwise met.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 14 (marijuana possession at 19, 13 months ago, clean -> 137.226(1))',
    package: 'under-21 marijuana possession, 13 months since judgment, clean -> 1-yr fast path.',
    record: { title: 'Marijuana Possession (age 19)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2025-05-01' },
    answers: { conv_type_or: 'marijuana', mj_conviction_or: 'under21', mj_under21_or: true, mj_under21_date_or: '2025-05-01' },
    expect: { resultKey: 'eligible_mj_under21_or', reading: '137.226(1): under-21 marijuana, 1 yr from judgment (2025-05 -> ~14 mo > 12), sentence performed, no other convictions -> eligible.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 15 (2013 marijuana delivery -> 137.226(2) reclassification first)',
    package: '2013 marijuana delivery conviction -> pre-2017 reclassification-under-current-law route.',
    record: { title: 'Marijuana Delivery (2013)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2013-06-01' },
    answers: { conv_type_or: 'marijuana', mj_conviction_or: 'pre2017', mj_pre2017_or: false },
    expect: { resultKey: 'eligible_mj_pre2017_reclass_or', reading: '137.226(2): pre-4/21/2017 marijuana conduct is reclassified under CURRENT law first (usually a much shorter wait) -> reclassify, then set aside.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 16 (pre-2015 sub-ounce marijuana, unpaid fine -> 2025 c.395 override)',
    package: 'pre-7/1/2015 sub-ounce marijuana conviction with an unpaid fine -> 2025 c.395 fine-expiry override -> eligible.',
    record: { title: 'Marijuana Possession <1oz (2014, unpaid fine)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2014-06-01', restitution_paid: false },
    answers: { conv_type_or: 'marijuana', mj_conviction_or: 'pre2017', mj_pre2017_or: true },
    expect: { resultKey: 'eligible_mj_pre2015_fine_or', reading: '2025 c.395: pre-7/1/2015 sub-ounce marijuana fines expired 9/26/2025 and are deemed satisfied -> the unpaid fine no longer blocks the sentence-completion gate -> eligible.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 17 (objection on unpaid debts only -> grant)',
    package: 'otherwise-eligible misdemeanor; prosecutor objection resting only on unpaid debts -> excluded consideration -> grant.',
    record: { title: 'Class A Misdemeanor (debt objection)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2022-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'misdA', misdA_wait_or: '2022-01-01', misdA_lookback_or: 'none', conv_objection_or: true, conv_objection_grounds_or: 'debts_only' },
    expect: { resultKey: 'eligible_conviction_objection_debts_or', reading: '(3)(a): the court may consider ONLY criminal behavior/character-regulatory violations — NOT unpaid debts, civil liability, or MV violations. A debt-only objection cannot defeat the grant.' },
    now: NOW,
  },
  {
    source: 'OR 7/19 statute-verified — persona 18 (objection on public-safety grounds -> clear-and-convincing hearing)',
    package: 'otherwise-eligible; prosecutor objection on public-safety grounds -> state carries clear-and-convincing burden.',
    record: { title: 'Class C Felony (safety objection)', charge_type: 'felony', disposition: 'convicted', disposition_date: '2020-01-01', probation_status: 'completed' },
    answers: { conv_type_or: 'standard', conv_excluded_or: false, conv_sex_or: false, conv_supervision_or: true, conv_revoked_or: false, conv_level_or: 'felonyC', felonyC_wait_or: '2020-01-01', felonyC_lookback_or: 'none', conv_objection_or: true, conv_objection_grounds_or: 'safety' },
    expect: { resultKey: 'eligible_conviction_hearing_or', reading: '(3)(a): objection on public-safety grounds -> hearing where the STATE must prove a public-safety risk by clear and convincing evidence; grant presumption otherwise.' },
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

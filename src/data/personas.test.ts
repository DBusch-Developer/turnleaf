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
    expect: { resultKey: 'eligible_expungement', reading: 'Probation completed, no prison, not a registrant → PC 1203.4 as of right. Exact.' },
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
];

// ---------------------------------------------------------------------------
const AZ: Persona[] = [
  {
    source: 'Wave 0 — AZ persona 1',
    package: 'class 6 felony possession, done 2018 → set aside now + sealing eligible 2023+ → both.',
    record: { title: 'Possession', charge_type: 'felony', disposition_date: '2018-04-01', restitution_paid: true },
    // 'done 2018' = discharged 2018. The § 13-911 clock runs from absolute
    // discharge, so the persona states THAT date, not a sentencing date.
    answers: { excluded_offense: false, marijuana_offense: false, dui_offense: false, sentence_completed: true, offense_level: 'felony_low', discharge_date_f456: '2018-04-01' },
    expect: { resultKey: 'eligible_both_az', reading: 'Class 6 = class 4/5/6 ladder, 5 years from discharge. 2018 + 5 = 2023, and it is 2026. Exact.' },
    now: NOW,
  },
  {
    source: 'Wave 0 — AZ persona 2',
    package: 'marijuana possession 2015 → § 36-2862 free expungement.',
    record: { title: 'Marijuana Possession', charge_type: 'felony', disposition_date: '2015-01-01' },
    answers: { excluded_offense: false, marijuana_offense: true },
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
    answers: { excluded_offense: false, marijuana_offense: false, dui_offense: true },
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
    answers: { excluded_offense: true },
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
    answers: { excluded_offense_ny: false, supervision_status: false, clean_slate_date_misd: '2019-06-01' },
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
    answers: { excluded_offense_ny: false, supervision_status: false, clean_slate_date_felony: '2015-01-01' },
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
    answers: { excluded_offense_ny: false, supervision_status: false, clean_slate_date_felony: '2015-01-01' },
    expect: {
      resultKey: 'eligible_clean_slate',
      reading:
        'Package persona contradicted rules section; resolved to rules section, phone-confirm '
        + 'pending. The persona says a violent felony is excluded from BOTH paths. Wave 0\'s rules '
        + 'section says Clean Slate excludes sex offences and non-drug Class A felonies — § 70.02 '
        + 'violent felonies appear there only as a CPL 160.59 PETITION exclusion, which is a '
        + 'different remedy with a different list. Refereed to the rules section: the persona '
        + 'overgeneralised one list onto the other. Held open as an NY question for a '
        + 'practitioner, not a clerk.',
    },
    expectIsApproximate: true,
    now: NOW,
  },
  {
    source: 'Wave 0 — NY persona 4',
    package: 'two misdemeanors 2010 → 160.59 petition now OR wait for auto — cost/speed tradeoff copy.',
    record: { title: 'Misdemeanor (one of two)', charge_type: 'misdemeanor', disposition_date: '2010-01-01' },
    answers: { excluded_offense_ny: false, supervision_status: false, clean_slate_date_misd: '2010-01-01' },
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
];

// ---------------------------------------------------------------------------
const TX: Persona[] = [
  {
    source: 'Wave 0 — TX persona 1',
    package: 'arrest, no charges, felony-level, 2022 → 3-yr wait → eligible 2025 (or SOL).',
    // TX expunction runs from the ARREST date, which precedes disposition.
    answers: { arrest_date_tx_felony: '2022-01-01' },
    record: { title: 'Arrest, no charges', charge_type: 'felony', disposition: 'dismissed', disposition_date: '2022-06-01' },
    expect: { resultKey: 'eligible_expunction', reading: 'Felony-level arrest, 3 years from arrest, 2022 + 3 = 2025 < 2026 → eligible. Exact, and the date claim is why now is pinned.' },
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
    expect: {
      resultKey: 'check_record_first_tx',
      reading:
        'The package wants CONFIRM-FIRST: 55A may have had the trial court order the expunction on '
        + 'the spot, so telling this person to petition could be wrong advice. Acquittals now route '
        + 'to their own result that leads with "ask the clerk whether it was already ordered" and '
        + 'puts the petition after. Exact.',
    },
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
      pending_charges_mi: false,
      marijuana_mi: false,
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
        + 'the MSP record check rather than an application. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 2',
    package: 'one felony (non-excluded), 6 yrs post-discharge → eligible-petition.',
    record: { title: 'Felony', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      pending_charges_mi: false,
      marijuana_mi: false,
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
        'The two tracks diverge here, which is the point of this persona: 6 years is past the '
        + '5-year PETITION period for one felony but short of the 10-year AUTOMATIC one. So waiting '
        + 'would cost four more years — petition now. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 3',
    package: '3 felonies, latest discharge 6 yrs ago → waiting (7y multiple-felony period).',
    record: { title: 'Felony (third)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      pending_charges_mi: false,
      marijuana_mi: false,
      petition_excluded_mi: false,
      owi_mi: false,
      auto_excluded_mi: false,
      auto_date_felony_mi: '2020-07-15',
      petition_counts_mi: 'multiple_felonies',
      petition_date_7_mi: '2020-07-15',    // 6 yrs of the 7 needed
    },
    expect: {
      resultKey: 'waiting_mi',
      reading:
        'Three felonies is at Michigan\'s lifetime cap, not over it, so the count gate passes and the '
        + 'multiple-felony 7-year period applies. Six years since the latest discharge → waiting. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 4',
    package: 'marijuana misdemeanor 2019 → eligible-now via 621e.',
    record: { title: 'Marijuana Misdemeanor', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2019-01-01' },
    answers: { pending_charges_mi: false, marijuana_mi: true },
    expect: {
      resultKey: 'eligible_marijuana_mi',
      reading:
        'MCL 780.621e: no waiting period and a rebuttable presumption of eligibility. Asked before '
        + 'either other track because it beats both — the person can file today and the burden sits '
        + 'with the prosecutor. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — MI persona 5',
    package: 'OWI first offense, 5 yrs → complex (discretionary petition path; not automatic).',
    record: { title: 'OWI (first offense)', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2021-07-15' },
    answers: { pending_charges_mi: false, marijuana_mi: false, petition_excluded_mi: false, owi_mi: true },
    expect: {
      resultKey: 'complex_owi_mi',
      reading:
        'OWI is the case that proves the two exclusion lists differ: petitionable since Feb 2022 but '
        + 'at the court\'s DISCRETION, and excluded from automatic entirely — so waiting never clears '
        + 'it. Routed to legal aid rather than screened to an answer. Exact.',
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
    source: 'Wave 1 — NJ persona 1',
    package: 'one indictable (burglary 3rd), 6 yrs post-everything, fines paid → eligible-standard.',
    record: { title: 'Burglary (3rd degree indictable)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      title39_nj: false,
      marijuana_nj: false,
      excluded_nj: false,
      count_profile_nj: 'standard',
      date_5_nj: '2020-07-15',   // 6 yrs past the latest of the four events
    },
    expect: {
      resultKey: 'eligible_standard_nj',
      reading:
        'One indictable, no exclusions, 6 years past the latest of conviction / payment / '
        + 'completion / release → the standard 5-year path. Third-degree burglary is not on the '
        + '2C:52-2(b) list. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 2',
    package: 'one indictable + 2 DP, 4 yrs, pending job offer → complex/possible early pathway.',
    record: { title: 'Indictable Offense', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      title39_nj: false,
      marijuana_nj: false,
      excluded_nj: false,
      count_profile_nj: 'standard',   // one indictable + 2 DP is inside 1 + 3
      date_5_nj: '2022-07-15',        // 4 yrs — short of 5
      date_4_nj: '2022-07-15',        // but past 4
    },
    expect: {
      resultKey: 'complex_early_nj',
      reading:
        'Four years in: short of the standard 5 but past the 4-year "compelling circumstances" '
        + 'threshold. That is a discretionary judgment about the person\'s situation — a pending job '
        + 'offer is exactly the kind of thing courts weigh — so the tree routes to legal aid rather '
        + 'than deciding. Exact: the package asks for complex/possible-early and that is what it gets.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 3',
    package: '2 indictables, latest closed 11 yrs ago, none excluded → eligible-clean-slate.',
    record: { title: 'Indictable Offense (second)', charge_type: 'felony', disposition: 'convicted' },
    answers: {
      title39_nj: false,
      marijuana_nj: false,
      excluded_nj: false,
      count_profile_nj: 'clean_slate',   // 2 indictables is outside 1 + 3
      date_10_nj: '2015-07-15',          // 11 yrs from the most recent
    },
    expect: {
      resultKey: 'eligible_clean_slate_nj',
      reading:
        'Two indictables puts the record outside the standard limits, which is precisely who Clean '
        + 'Slate (2C:52-5.3) exists for: the ENTIRE record, 10 years from the most recent conviction, '
        + 'regardless of count. 11 years clears it. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 4',
    package: 'DWI → not expungable (Title 39).',
    record: { title: 'DWI', charge_type: 'misdemeanor', disposition: 'convicted' },
    answers: { title39_nj: true },
    expect: {
      resultKey: 'ineligible_title39_nj',
      reading:
        'Asked first and answered in one question. Title 39 motor vehicle offences sit outside the '
        + 'expungement statute entirely — no waiting period, no Clean Slate, nothing. Wave 1 calls '
        + 'this a common user confusion; a hard no delivered immediately beats five questions and '
        + 'then a no. Exact.',
    },
    now: NOW,
  },
  {
    source: 'Wave 1 — NJ persona 5',
    package: 'marijuana possession 2015 → eligible-immediate.',
    record: { title: 'Marijuana Possession', charge_type: 'misdemeanor', disposition: 'convicted', disposition_date: '2015-01-01' },
    answers: { title39_nj: false, marijuana_nj: true },
    expect: {
      resultKey: 'eligible_marijuana_nj',
      reading:
        'Since 2021 legalisation most marijuana offences are treated as DP-level and expungable '
        + 'immediately — no waiting period, no date node. Asked before the exclusion list and the '
        + 'count profile because it short-circuits both. Exact.',
    },
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
const SUITES: Array<[string, Persona[]]> = [['CA', CA], ['AZ', AZ], ['NY', NY], ['TX', TX], ['UT', UT], ['MI', MI], ['PA', PA], ['NJ', NJ], ['CO', CO]];

for (const [code, personas] of SUITES) {
  describe(`Wave 0 personas — ${code}`, () => {
    test.each(personas)('$source: $package', (p) => {
      expect(keyOf(code, run(code, p))).toBe(p.expect.resultKey);
    });
  });
}

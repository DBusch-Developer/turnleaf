import { describe, test, expect } from 'vitest';
import { evaluate, type Answers } from './rulesEngine';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';

// ============================================================================
// MONEY REGRESSION — proof that the live bug is fixed.
//
// The bug: `restitution_paid` used to mean "all money owed is paid"
// (restitution AND fines bundled into one field/question). A person who had
// paid restitution but still owed fines was read as owing restitution too,
// and any state whose tree gated on that field blocked them outright.
//
// Task 1 split the field: `restitution_paid` now means restitution ONLY, and
// `fines_paid` is its own field. This file proves, against the REAL trees in
// fallbackRules.ts via the REAL `evaluate`, that:
//
//   - a RESTITUTION-ONLY state (its money node's `field` is `restitution_paid`
//     and nothing downstream reads `fines_paid`) no longer blocks someone who
//     has paid restitution but still owes fines — NC is the case tested here.
//   - an ALL-MONEY state (a two-gate ladder: restitution THEN fines) still
//     requires BOTH — the fines gate bites on its own — so the fix does not
//     under-block. AZ and FL are the contrast cases. (FL was originally
//     bucketed restitution-only, matching where the live bug manifested, but
//     M3 review moved it to all-money: its own node text — "completed all
//     terms of your sentence" — is broad enough to imply fines too, so the
//     conservative, text-faithful reading requires both. See the spec's open
//     verification item for Diana on whether § 943.059 actually exempts fines.)
//
// Every expected key below was reached by tracing fallbackRules.ts node-by-
// node from each state's startNode, not by running the code first and
// copying its answer. See the trace comments on each case.
// ============================================================================

const NOW = new Date('2026-07-15');

const keyOf = (code: string, result: unknown): string =>
  Object.entries(fallbackRules[code].rules.results).find(([, r]) => r === result)?.[0]
  ?? '(hardcoded fallback — the tree could not classify this)';

describe('money regression — restitution-only vs all-money (live PA/NC/FL bug fixed)', () => {
  // --------------------------------------------------------------------
  // NC — restitution-only. Node `restitution_nc` reads ONLY
  // `restitution_paid`; `fines_paid` appears nowhere in the NC tree.
  //
  // Traced path from startNode 'disposition':
  //   disposition (field:disposition='convicted') -> nonviolent_nc
  //   nonviolent_nc (asked, answer=false: not an excluded offense) -> restitution_nc
  //   restitution_nc (field:restitution_paid=true) -> conviction_count_nc
  //   conviction_count_nc (asked choice, answer='one_misd') -> misd_date_nc
  //   misd_date_nc (date, no field -> answers['misd_date_nc']; 3-yr period)
  //     '2015-01-01' vs NOW 2026-07-15 passes -> eligible_conviction_nc
  //
  // fines_paid: false is set and never read on this path. The point: fines
  // owed does NOT block NC once restitution is paid.
  // --------------------------------------------------------------------
  test('NC: restitution paid, fines owed -> proceeds past restitution_nc to eligible_conviction_nc', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'NC', title: 'Misdemeanor', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2015-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: false,
    };
    const answers: Answers = {
      nonviolent_nc: false,
      conviction_count_nc: 'one_misd',
      misd_date_nc: '2015-01-01',
    };
    const result = evaluate(fallbackRules['NC'], answers, record, NOW);
    expect(keyOf('NC', result)).toBe('eligible_conviction_nc');
  });

  test('NC control: restitution UNPAID still blocks at ineligible_restitution_nc', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'NC', title: 'Misdemeanor', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2015-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: false, fines_paid: false,
    };
    const answers: Answers = { nonviolent_nc: false };
    const result = evaluate(fallbackRules['NC'], answers, record, NOW);
    expect(keyOf('NC', result)).toBe('ineligible_restitution_nc');
  });

  // --------------------------------------------------------------------
  // FL — ALL-MONEY (M3 fix). `sentence_complete_fl` (field:restitution_paid)
  // now feeds a second gate, `fines_fl` (field:fines_paid), before
  // eligible_sealing_fl: a two-gate ladder like AZ/UT/TN/AL, not a
  // restitution-only bucket. FL was moved here because its own node text
  // ("completed all terms of your sentence") is broad enough to imply fines,
  // and the conservative reading is the one that never over-clears.
  //
  // Traced path from startNode 'prior_relief_fl':
  //   prior_relief_fl (asked, answer=false: no prior FL relief) -> prior_adjudication_fl
  //   prior_adjudication_fl (asked, answer=false: no other adjudication) -> disposition
  //   disposition (field:disposition='convicted' = "adjudication withheld" option) -> disqualified_offense_fl
  //   disqualified_offense_fl (asked choice, answer='none') -> sentence_complete_fl
  //   sentence_complete_fl (field:restitution_paid=true) -> fines_fl
  //   fines_fl (field:fines_paid) ->
  //     false -> ineligible_incomplete_fl (the fines gate BITES)
  //     true  -> eligible_sealing_fl
  //
  // The point: fines owed now DOES block FL, same as AZ/UT/TN/AL — the fix
  // no longer under-blocks FL relative to its own broad "all terms" text.
  // --------------------------------------------------------------------
  test('FL: restitution paid, fines owed -> fines gate bites at ineligible_incomplete_fl', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'FL', title: 'Withheld Adjudication', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: false,
    };
    const answers: Answers = {
      prior_relief_fl: false,
      prior_adjudication_fl: false,
      disqualified_offense_fl: 'none',
    };
    const result = evaluate(fallbackRules['FL'], answers, record, NOW);
    expect(keyOf('FL', result)).toBe('ineligible_incomplete_fl');
  });

  test('FL: restitution paid AND fines paid -> eligible_sealing_fl', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'FL', title: 'Withheld Adjudication', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: true,
    };
    const answers: Answers = {
      prior_relief_fl: false,
      prior_adjudication_fl: false,
      disqualified_offense_fl: 'none',
    };
    const result = evaluate(fallbackRules['FL'], answers, record, NOW);
    expect(keyOf('FL', result)).toBe('eligible_sealing_fl');
  });

  test('FL control: restitution/sentence NOT complete still blocks at ineligible_incomplete_fl', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'FL', title: 'Withheld Adjudication', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: false, fines_paid: false,
    };
    const answers: Answers = {
      prior_relief_fl: false,
      prior_adjudication_fl: false,
      disqualified_offense_fl: 'none',
    };
    const result = evaluate(fallbackRules['FL'], answers, record, NOW);
    expect(keyOf('FL', result)).toBe('ineligible_incomplete_fl');
  });

  // --------------------------------------------------------------------
  // AZ — all-money contrast. Two gates in series:
  //   monetary_check_az (field:restitution_paid) -> monetary_fines_az
  //   monetary_fines_az (field:fines_paid) -> eligible_both_az | eligible_pay_then_file_az
  //
  // Traced path from startNode 'disposition' (misdemeanor class 1, clean
  // discharge 2019-06-01, no exclusions, no prior felony):
  //   disposition (field:disposition='convicted') -> excluded_setaside_az
  //   excluded_setaside_az (asked, false) -> marijuana_offense
  //   marijuana_offense (asked, false) -> dui_offense
  //   dui_offense (asked, false) -> sentence_completed
  //   sentence_completed (asked, true) -> excluded_sealing_az
  //   excluded_sealing_az (asked, false) -> prior_felony_az
  //   prior_felony_az (asked, false) -> offense_level
  //   offense_level (asked choice, 'misd_1') -> discharge_date_m1
  //   discharge_date_m1 (date, no field -> answers['discharge_date_m1'];
  //     3-yr period) '2019-06-01' vs NOW 2026-07-15 passes -> monetary_check_az
  //   monetary_check_az (field:restitution_paid=true) -> monetary_fines_az
  //   monetary_fines_az (field:fines_paid) ->
  //     false -> eligible_pay_then_file_az (the fines gate BITES)
  //     true  -> eligible_both_az
  //
  // This is the contrast to NC/FL: AZ bundles restitution AND fines into a
  // hard two-gate ladder, so the split field did NOT loosen AZ's requirement.
  // --------------------------------------------------------------------
  const azAnswers: Answers = {
    excluded_setaside_az: false,
    marijuana_offense: false,
    dui_offense: false,
    sentence_completed: true,
    excluded_sealing_az: false,
    prior_felony_az: false,
    offense_level: 'misd_1',
    discharge_date_m1: '2019-06-01',
  };

  test('AZ: restitution paid, fines owed -> fines gate bites at eligible_pay_then_file_az', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'AZ', title: 'Class 1 Misdemeanor', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-06-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: false,
    };
    const result = evaluate(fallbackRules['AZ'], azAnswers, record, NOW);
    expect(keyOf('AZ', result)).toBe('eligible_pay_then_file_az');
  });

  test('AZ: restitution paid AND fines paid -> eligible_both_az', () => {
    const record: ConvictionRecord = {
      id: 'p', state: 'AZ', title: 'Class 1 Misdemeanor', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-06-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: true,
    };
    const result = evaluate(fallbackRules['AZ'], azAnswers, record, NOW);
    expect(keyOf('AZ', result)).toBe('eligible_both_az');
  });
});

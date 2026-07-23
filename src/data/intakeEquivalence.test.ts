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
  restitution_paid: true, fines_paid: true, ...over,
});
const keyOf = (code: string, result: unknown) =>
  Object.entries(fallbackRules[code].rules.results).find(([, r]) => r === result)?.[0] ?? '(none)';

// Each case: a profile + the tail answers the person would still give, and the
// result key the current tree already produces for the same facts.
//
// Result ids confirmed by tracing src/data/fallbackRules.ts (AZ, `rules.nodes`
// starting at `disposition`):
//   - DUI:      dui_offense(yes) -> complex_dui_az                         [as briefed]
//   - non-DUI:  excluded_setaside_az(no) -> marijuana_offense(no) ->
//               dui_offense(no) -> sentence_completed(yes) ->
//               excluded_sealing_az(no) -> prior_felony_az(no) ->
//               offense_level(misd_1) -> discharge_date_m1(pass, 3yr) ->
//               monetary_check_az(restitution_paid=true) -> monetary_fines_az
//               (fines_paid=true) -> eligible_both_az
//   - excluded: excluded_setaside_az(yes) -> ineligible_serious
//   - fines owed: same non-DUI path, but monetary_fines_az(fines_paid=false)
//               -> eligible_pay_then_file_az (the fines gate bites even
//               though restitution is paid)
const cases: Array<{ name: string; profile: IntakeProfile; level: string; tail: Answers; expect: string }> = [
  {
    name: 'clean Class 1 misdemeanor DUI, discharged 2019 -> the DUI hedge',
    profile: { offenseCategory: 'dui', disposition: 'convicted', chargeType: 'misdemeanor',
      sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false, restitutionPaid: true, finesPaid: null },
    level: 'misd_1',
    tail: { excluded_setaside_az: false }, // reaches dui_offense=true -> complex_dui_az before exclusions matter
    expect: 'complex_dui_az',
  },
  {
    name: 'non-DUI Class 1 misdemeanor, discharged 2019, restitution paid -> set-aside AND sealing',
    profile: { offenseCategory: 'property', disposition: 'convicted', chargeType: 'misdemeanor',
      sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false, restitutionPaid: true, finesPaid: null },
    level: 'misd_1',
    // Neither exclusion gate is on the AZ intake map (state-specific lists stay
    // asked); both must be answered "no" to fall through to the offense-level /
    // discharge-date ladder that IS prefilled.
    tail: { excluded_setaside_az: false, excluded_sealing_az: false },
    expect: 'eligible_both_az',
  },
  {
    name: 'convicted, dangerous/registrable offense -> excluded from both remedies',
    profile: { offenseCategory: 'violent', disposition: 'convicted', chargeType: 'felony',
      sentenceCompleted: true, dischargeDate: '2015-01-01', priorFelony: false, restitutionPaid: true, finesPaid: null },
    level: 'felony_high',
    // A "yes" on the § 13-905(P) exclusion gate ends the walk immediately, before
    // marijuana/DUI/sentence questions are ever reached.
    tail: { excluded_setaside_az: true },
    expect: 'ineligible_serious',
  },
];

describe('AZ intake equivalence', () => {
  test.each(cases)('$name', (c) => {
    const answers: Answers = { ...answersForState('AZ', c.profile, { azLevel: c.level }), ...c.tail };
    const record = rec({ disposition: c.profile.disposition, disposition_date: c.profile.dischargeDate ?? '2019-06-01' });
    const result = evaluate(fallbackRules['AZ'], answers, record, NOW);
    expect(keyOf('AZ', result)).toBe(c.expect);
  });

  // Proves the fines gate BITES on its own: same non-DUI walk as the
  // "restitution paid -> set-aside AND sealing" case above (same profile,
  // same discharge date, otherwise eligible), but with restitution paid and
  // FINES still owed. monetary_check_az(restitution_paid=true) passes to
  // monetary_fines_az, which reads fines_paid=false -> eligible_pay_then_file_az,
  // not eligible_both_az. Net requirement (restitution AND fines) is unchanged
  // from the old bundled question; this shows the split still enforces it.
  test('non-DUI Class 1 misdemeanor, restitution paid but fines owed -> pay-then-file', () => {
    const profile: IntakeProfile = {
      offenseCategory: 'property', disposition: 'convicted', chargeType: 'misdemeanor',
      sentenceCompleted: true, dischargeDate: '2019-06-01', priorFelony: false,
      restitutionPaid: true, finesPaid: false,
    };
    const answers: Answers = {
      ...answersForState('AZ', profile, { azLevel: 'misd_1' }),
      excluded_setaside_az: false, excluded_sealing_az: false,
    };
    const record = rec({ disposition: 'convicted', disposition_date: '2019-06-01', restitution_paid: true, fines_paid: false });
    const result = evaluate(fallbackRules['AZ'], answers, record, NOW);
    expect(keyOf('AZ', result)).toBe('eligible_pay_then_file_az');
  });
});

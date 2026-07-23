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

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

import { describe, test, expect } from 'vitest';
import { evaluate, currentNode, isAsked, elapsedSince, HEDGE, type Answers } from './rulesEngine';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';

// These run the REAL engine. It used to live inside EligibilityWizard, so the
// only way to exercise it was to copy it into a scratch file — and a copy is
// not the thing under test. That is why the dead dispatcher survived so long.

const rec = (o: Partial<ConvictionRecord> = {}): ConvictionRecord => ({
  id: 'r1',
  title: 'Petty Theft',
  charge_type: 'misdemeanor',
  disposition: 'convicted',
  disposition_date: '2015-01-01',
  probation_status: 'completed',
  prison_sentenced: false,
  restitution_paid: true,
  ...o,
});

/** Walk a state's tree, answering asked questions from `script` by node id. */
function walk(code: string, record: ConvictionRecord, script: Answers = {}, now?: Date) {
  return evaluate(fallbackRules[code], script, record, now);
}

describe('dispatch is by node shape, not node id', () => {
  // The regression that mattered: the old engine matched a hardcoded allowlist
  // of node ids, so CA/AZ/NY conviction paths dead-ended to "Complex Analysis
  // Required" no matter what a person entered.
  test('AZ conviction path reaches a real result — it never used to', () => {
    const result = walk('AZ', rec({ charge_type: 'felony' }), {
      excluded_offense: false,
      marijuana_offense: false,
      dui_offense: false,
      sentence_completed: true,
      offense_level: 'felony_low', // class 4/5/6 — ASKED, since the form has no classes
    });

    expect(result.title).not.toBe('Complex Analysis Required');
    expect(result.status).toBe('eligible');
    expect(result.citation).toContain('13-905');
  });

  test('CA conviction path reaches a real result', () => {
    const result = walk('CA', rec(), { sex_registration: false });

    expect(result.title).not.toBe('Complex Analysis Required');
    expect(result.remedy).toContain('1203.4');
  });

  test('NY conviction path reaches a real result', () => {
    const result = walk('NY', rec({ disposition_date: '2010-01-01' }), {
      excluded_offense_ny: false,
      supervision_status: false,
    });

    expect(result.title).not.toBe('Complex Analysis Required');
    expect(result.citation).toContain('160.5');
  });
});

describe('waiting periods come from the data, with the data\'s own units', () => {
  test('AZ class 2/3 felony needs 10 years from discharge, not 2', () => {
    // The deleted ResultsDisplay table said AZ felonies waited 2 years. The
    // rules say 10 for class 2/3. A 5-years-ago discharge is still waiting.
    const answers = { excluded_offense: false, marijuana_offense: false, dui_offense: false, sentence_completed: true, offense_level: 'felony_high' };
    const waiting = walk('AZ', rec({ disposition_date: '2021-01-01' }), answers, new Date('2026-07-15'));
    expect(waiting.status).toBe('waiting');

    const eligible = walk('AZ', rec({ disposition_date: '2010-01-01' }), answers, new Date('2026-07-15'));
    expect(eligible.status).toBe('eligible');
  });

  test('NY misdemeanours seal at 3 years, felonies at 8 — not a flat 10', () => {
    const answers = { excluded_offense_ny: false, supervision_status: false };
    const now = new Date('2026-07-15');

    const misd = walk('NY', rec({ charge_type: 'misdemeanor', disposition_date: '2022-01-01' }), answers, now);
    expect(misd.status).toBe('eligible'); // 4 years > 3

    const felony = walk('NY', rec({ charge_type: 'felony', disposition_date: '2022-01-01' }), answers, now);
    expect(felony.status).toBe('waiting'); // 4 years < 8
  });

  test('elapsedSince counts calendar steps, not 365.25-day approximations', () => {
    // One day short of three years is not three years, however you round it.
    expect(elapsedSince('2023-07-16', 'years', new Date('2026-07-15'))).toBe(2);
    expect(elapsedSince('2023-07-15', 'years', new Date('2026-07-15'))).toBe(3);
    expect(elapsedSince('2026-01-01', 'days', new Date('2026-07-15'))).toBe(195);
    expect(elapsedSince('not a date', 'years')).toBeNull();
  });
});

describe('an answer we do not have is never invented', () => {
  test('an unanswered question stops the walk rather than guessing', () => {
    // No answer for sex_registration: the walk parks on the question.
    const step = currentNode(fallbackRules.CA, {}, rec());
    expect(step?.id).toBe('sex_registration');
    expect(isAsked(step!.node)).toBe(true);
  });

  test('evaluating an unanswered tree hedges — it does not fall through', () => {
    const result = walk('CA', rec(), {});
    expect(result).toEqual(fallbackRules.CA.rules.results[HEDGE]);
    expect(result.status).toBe('complex');
  });

  test('"I don\'t know" reaches the hedge in every state, never an eligibility claim', () => {
    for (const code of ['CA', 'AZ', 'NY', 'TX']) {
      const result = walk(code, rec({ disposition: 'unknown' }));
      expect(result.status).toBe('complex');
      expect(result.title).toBe('We Need the Case Outcome First');
    }
  });

  test('a dismissed Texas case is never called an ineligible conviction', () => {
    // The harm bug: 'dismissed' vs the encoded 'dropped' fell through to
    // ineligible_conviction, telling people with no conviction they had one.
    const result = walk('TX', rec({ disposition: 'dismissed', charge_type: 'felony', disposition_date: '2015-01-01' }));
    expect(result.title).not.toBe('Conviction Generally Ineligible');
    expect(result.status).toBe('eligible');
  });
});

describe('record-backed vs asked nodes', () => {
  test('a node with a field reads the record and is not asked', () => {
    const step = currentNode(fallbackRules.CA, {}, rec({ disposition: 'dismissed' }));
    // disposition is record-backed, so the walk goes straight past it to a result.
    expect(step).toBeNull();
  });

  test('a node without a field is asked, even when the record looks similar', () => {
    // AZ offense_level asks for a CLASS. charge_type says 'felony', which is
    // not a class — so the tree asks rather than assuming.
    const step = currentNode(
      fallbackRules.AZ,
      { excluded_offense: false, marijuana_offense: false, dui_offense: false, sentence_completed: true },
      rec({ charge_type: 'felony' })
    );
    expect(step?.id).toBe('offense_level');
    expect(step?.node.options?.map(o => o.value)).toContain('felony_high');
  });
});

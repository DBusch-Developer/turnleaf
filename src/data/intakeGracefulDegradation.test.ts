import { describe, test, expect } from 'vitest';
import { evaluate, type Answers } from './rulesEngine';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';

// Graceful degradation for the 49 UNMAPPED states hinges on the intake form
// still being able to PRODUCE every field-backed record value the trees read.
// The new profile form once narrowed charge_type to {misdemeanor, felony} and
// disposition to the four convicted/dismissed/deferred/acquitted — which would
// force a person with a traffic infraction, or who genuinely doesn't know their
// outcome, to assert a wrong value. These tests document, at the engine level,
// the two record values the form MUST be able to emit, and where they land.
const NOW = new Date('2026-07-15');
const rec = (over: Partial<ConvictionRecord>): ConvictionRecord => ({
  id: 'p', state: 'NY', title: 'x', charge_type: 'misdemeanor', disposition: 'convicted',
  disposition_date: '2019-06-01', probation_status: 'completed', prison_sentenced: false,
  restitution_paid: true, ...over,
});
const keyOf = (code: string, result: unknown) =>
  Object.entries(fallbackRules[code].rules.results).find(([, r]) => r === result)?.[0] ?? '(none)';

describe('intake graceful degradation — field-backed values the form must produce', () => {
  // NY: disposition(convicted) -> cannabis_ny(no) -> excluded_offense_ny(no) ->
  // supervision_status(no) -> offense_level_ny reads charge_type='infraction' ->
  // violation_dwai_ny(no) -> eligible_violation_seal_ny (CPL 160.55).
  test("a NY charge_type:'infraction' reaches NY's violation-seal branch", () => {
    const answers: Answers = {
      cannabis_ny: false,
      excluded_offense_ny: false,
      supervision_status: false,
      violation_dwai_ny: false,
    };
    const record = rec({ charge_type: 'infraction', disposition: 'convicted' });
    const result = evaluate(fallbackRules['NY'], answers, record, NOW);
    expect(keyOf('NY', result)).toBe('eligible_violation_seal_ny');
  });

  // NY: the disposition node reads disposition='unknown' -> unknown_disposition,
  // the honest hedge — no other question is asked, nothing is guessed.
  test("a NY disposition:'unknown' reaches the unknown_disposition hedge", () => {
    const record = rec({ disposition: 'unknown' });
    const result = evaluate(fallbackRules['NY'], {}, record, NOW);
    expect(keyOf('NY', result)).toBe('unknown_disposition');
  });
});

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

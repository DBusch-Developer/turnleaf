// ============================================================================
// INTAKE PREFILL — collect a fact once, pre-answer the trees that ask for it.
//
// A per-state IntakeMap says how that state's front-loadable asked-nodes are
// answered from the shared IntakeProfile. The rules engine reads answers to
// asked nodes by node id, so a prefilled answer's card never shows. Whatever
// is not mapped stays asked — the guided tail. No tree is edited by this file.
// ============================================================================
import type { Answer, Answers } from './rulesEngine';

export type OffenseCategory =
  | 'dui' | 'marijuana' | 'drug' | 'sex_offense' | 'violent' | 'property' | 'other';
export type Disposition = 'convicted' | 'dismissed' | 'deferred' | 'acquitted';

/** The facts about ONE charge, stated once so its state's tree stops re-asking. */
export interface IntakeProfile {
  offenseCategory: OffenseCategory;
  disposition: Disposition;
  chargeType: 'misdemeanor' | 'felony';
  sentenceCompleted: boolean;
  dischargeDate: string | null;
  priorFelony: boolean;
  restitutionPaid: boolean;
}

/** A per-state form field built from a tree node's own options (e.g. offense class). */
export interface StateFieldSpec {
  key: string;         // form field key
  label: string;       // shown label
  optionsFrom: string; // node id whose `options` populate the dropdown
  fills: string[];     // node ids to prefill with the chosen value
}

/** How one state consumes the profile. Additive data — never edits the tree. */
export interface IntakeMap {
  derived: Record<string, (p: IntakeProfile) => Answer | null>;
  stateFields?: StateFieldSpec[];
}

/**
 * Produce the `answers` object to seed a tree walk. A derived value of null is
 * omitted (the node stays asked — unknown is never guessed). Unfilled
 * stateFields add nothing.
 */
export function buildAnswers(
  profile: IntakeProfile,
  map: IntakeMap,
  stateFieldValues: Record<string, string>,
): Answers {
  const answers: Answers = {};
  for (const [nodeId, fn] of Object.entries(map.derived)) {
    const v = fn(profile);
    if (v !== null && v !== undefined) answers[nodeId] = v;
  }
  for (const sf of map.stateFields ?? []) {
    const val = stateFieldValues[sf.key];
    if (val) for (const nodeId of sf.fills) answers[nodeId] = val;
  }
  return answers;
}

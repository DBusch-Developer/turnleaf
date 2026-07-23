import type { StateFieldSpec, IntakeProfile } from './intake';
import { intakeMaps } from './intakeMaps';
import { fallbackRules } from './fallbackRules';

export type SharedFieldKey = keyof IntakeProfile;
const ALL_SHARED: SharedFieldKey[] = [
  'offenseCategory', 'disposition', 'chargeType', 'sentenceCompleted',
  'dischargeDate', 'priorFelony', 'restitutionPaid',
];

/**
 * Which shared fields to render. For a mapped state, show the fields its map
 * actually consumes (inferred by running each map fn against two probe profiles
 * and seeing which read the field). Simpler + robust: a mapped state shows the
 * full set too — every shared fact is cheap to ask once and always relevant to
 * SOME branch. So: union is the full set whenever any selected state is mapped
 * OR unmapped. (Kept as a function so a future narrower rule can slot in.)
 */
// The param is the seam a later per-state narrowing slots into; kept unused
// for now so callers never change when that narrowing lands.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function sharedFieldsFor(_stateCodes: string[]): SharedFieldKey[] {
  return ALL_SHARED;
}

/** Per-state dropdowns (e.g. offense class), options read from the tree node. */
export function stateFieldsFor(stateCodes: string[]): Array<{
  code: string; spec: StateFieldSpec; options: { label: string; value: string }[];
}> {
  const out: Array<{ code: string; spec: StateFieldSpec; options: { label: string; value: string }[] }> = [];
  for (const code of stateCodes) {
    const map = intakeMaps[code];
    const config = fallbackRules[code];
    if (!map?.stateFields || !config) continue;
    for (const spec of map.stateFields) {
      const node = config.rules.nodes[spec.optionsFrom];
      const options = (node?.options ?? []).map(o => ({ label: o.label, value: o.value }));
      out.push({ code, spec, options });
    }
  }
  return out;
}

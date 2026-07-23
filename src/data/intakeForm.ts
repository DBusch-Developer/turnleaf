import type { StateFieldSpec, IntakeProfile } from './intake';
import { intakeMaps } from './intakeMaps';
import { fallbackRules } from './fallbackRules';

export type SharedFieldKey = keyof IntakeProfile;
// Money facts (restitutionPaid / finesPaid) are deliberately NOT here: they are
// rendered by a dedicated, state-aware money block (moneyFieldsFor) that forces
// an answer per state, not by the generic shared-field loop.
const ALL_SHARED: SharedFieldKey[] = [
  'offenseCategory', 'disposition', 'chargeType', 'sentenceCompleted',
  'dischargeDate', 'priorFelony',
];

// The charge_type and disposition controls are field-backed: the value chosen
// here is written onto the record and read by the trees verbatim. Their option
// value lists MUST cover the full record domains (FIELD_DOMAINS in ./screening)
// or an unmapped state silently mis-screens a value it can no longer receive —
// e.g. NY's `infraction` branch, or the `unknown` disposition hedge. The order
// matches FIELD_DOMAINS so a regression test can assert exact parity.
export const CHARGE_TYPE_OPTIONS: { label: string; value: IntakeProfile['chargeType'] }[] = [
  { label: 'Misdemeanor', value: 'misdemeanor' },
  { label: 'Felony', value: 'felony' },
  { label: 'Infraction', value: 'infraction' },
  { label: "I Don't Know / Not Sure", value: 'unknown' },
];
export const DISPOSITION_OPTIONS: { label: string; value: IntakeProfile['disposition'] }[] = [
  { label: 'Convicted (Guilty / No Contest)', value: 'convicted' },
  { label: 'Dismissed / Charges Dropped', value: 'dismissed' },
  { label: 'Deferred Adjudication / Diversion', value: 'deferred' },
  { label: 'Acquitted (Not Guilty)', value: 'acquitted' },
  { label: "I Don't Know / Not Sure", value: 'unknown' },
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

/**
 * Which money facts a state's tree actually reads. Restitution and fines/fees
 * are separate facts (some states gate on restitution only, some on both) —
 * this tells a caller which of the two to ask for, per state, without the
 * caller knowing anything about that state's tree shape.
 */
export function moneyFieldsFor(stateCode: string): { restitution: boolean; fines: boolean } {
  const nodes = fallbackRules[stateCode]?.rules.nodes ?? {};
  const reads = (f: string) => Object.values(nodes).some(n => n.field === f);
  return { restitution: reads('restitution_paid'), fines: reads('fines_paid') };
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

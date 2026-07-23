import { describe, test, expect } from 'vitest';
import { stateFieldsFor, sharedFieldsFor, CHARGE_TYPE_OPTIONS, DISPOSITION_OPTIONS, moneyFieldsFor } from './intakeForm';
import { FIELD_DOMAINS } from './screening';

describe('intake form derivation', () => {
  test('AZ surfaces its class dropdown with the tree node\'s own options', () => {
    const sf = stateFieldsFor(['AZ']);
    expect(sf).toHaveLength(1);
    expect(sf[0].code).toBe('AZ');
    expect(sf[0].spec.key).toBe('azLevel');
    // options come verbatim from the offense_level node:
    expect(sf[0].options.map(o => o.value)).toEqual(['felony_high', 'felony_low', 'misd_1', 'misd_23']);
  });

  test('a mapped state shows the shared fields it consumes', () => {
    const keys = sharedFieldsFor(['AZ']);
    expect(keys).toContain('offenseCategory');
    expect(keys).toContain('priorFelony');
    expect(keys).toContain('dischargeDate');
  });

  test('an unmapped state falls back to the full shared field set', () => {
    const keys = sharedFieldsFor(['ZZ']);
    expect(keys).toContain('offenseCategory');
    expect(keys).toContain('sentenceCompleted');
  });

  // charge_type and disposition are FIELD-BACKED: the value chosen flows onto
  // the record and the trees read it verbatim. If the form ever stops offering
  // a value the record domain allows, an unmapped state silently mis-screens it
  // (a NY infraction, or the honest "unknown" outcome). These guard exact parity
  // with FIELD_DOMAINS so no future narrowing slips through.
  test('charge_type options cover the full record domain — no narrowing', () => {
    expect(CHARGE_TYPE_OPTIONS.map(o => o.value)).toEqual([...FIELD_DOMAINS.charge_type]);
  });

  test('disposition options cover the full record domain — no narrowing', () => {
    expect(DISPOSITION_OPTIONS.map(o => o.value)).toEqual([...FIELD_DOMAINS.disposition]);
  });
});

describe('moneyFieldsFor', () => {
  // Task 3 split AZ's single monetary_check_az into a restitution gate
  // (monetary_check_az) and a fines gate (monetary_fines_az), both field-backed.
  test('AZ reads both restitution and fines (after Task 3 split)', () => {
    expect(moneyFieldsFor('AZ')).toEqual({ restitution: true, fines: true });
  });

  // The brief's example was PA, but PA's restitution question (`restitution_pa`)
  // is currently an ASKED node, not field-backed (verified by reading
  // fallbackRules.ts — it has no `field: 'restitution_paid'`), so moneyFieldsFor
  // correctly reports it as not-field-backed. NC's `restitution_nc` node IS
  // field-backed (`field: 'restitution_paid'`), so it exercises the same
  // restitution-only shape the brief intended.
  test('NC reads restitution only', () => {
    expect(moneyFieldsFor('NC')).toEqual({ restitution: true, fines: false });
  });

  test('a state whose tree reads no money field needs neither', () => {
    // NV has no restitution_paid (or fines_paid) field-backed node — verified
    // by grepping fallbackRules.ts for `field: 'restitution_paid'`.
    expect(moneyFieldsFor('NV')).toEqual({ restitution: false, fines: false });
  });
});

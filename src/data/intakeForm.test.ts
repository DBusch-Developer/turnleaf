import { describe, test, expect } from 'vitest';
import { stateFieldsFor, sharedFieldsFor, CHARGE_TYPE_OPTIONS, DISPOSITION_OPTIONS } from './intakeForm';
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

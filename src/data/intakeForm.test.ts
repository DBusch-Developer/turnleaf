import { describe, test, expect } from 'vitest';
import { stateFieldsFor, sharedFieldsFor } from './intakeForm';

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
});

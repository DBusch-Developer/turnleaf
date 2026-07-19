import { describe, it, expect } from 'vitest';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';
import { screenRecord, groupByState } from './multiState';

// fallbackRules is keyed by state code (Record<string, StateRuleConfig>), not
// an array — index directly rather than `.find(s => s.code === ...)`.
const CA = fallbackRules['CA']!;
const TX = fallbackRules['TX']!;

const rec = (o: Partial<ConvictionRecord>): ConvictionRecord => ({
  id: 'r', state: 'CA', title: 'Charge', charge_type: 'misdemeanor',
  disposition: 'convicted', disposition_date: '2015-01-01',
  probation_status: 'completed', prison_sentenced: false, restitution_paid: true,
  ...o,
});

describe('screenRecord', () => {
  it('screens a record against the config it is given, tagging the state', () => {
    const item = screenRecord(CA, {}, rec({ id: 'a', state: 'CA' }));
    expect(item.state).toBe('CA');
    expect(item.recordId).toBe('a');
    expect(['eligible', 'waiting', 'ineligible', 'complex']).toContain(item.resultStatus);
  });

  it('the Thomas split: CA dismissed possession is not ineligible; TX convicted theft is not eligible', () => {
    const caItem = screenRecord(CA, {}, rec({ id: 'ca', state: 'CA', disposition: 'dismissed' }));
    const txItem = screenRecord(TX, {}, rec({ id: 'tx', state: 'TX', disposition: 'convicted', charge_type: 'misdemeanor' }));
    expect(caItem.resultStatus).not.toBe('ineligible');
    expect(txItem.resultStatus).not.toBe('eligible');
  });
});

describe('groupByState', () => {
  it('buckets by state in first-seen order', () => {
    const items = [{ s: 'CA' }, { s: 'TX' }, { s: 'CA' }];
    const groups = groupByState(items, i => i.s);
    expect(groups.map(g => g.state)).toEqual(['CA', 'TX']);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });
});

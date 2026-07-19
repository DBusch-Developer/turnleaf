import { describe, it, expect } from 'vitest';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';
import { screenRecord, screenAll, groupByState } from './multiState';

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

  it('the Thomas split: each record resolves under its OWN state and is tagged with it', () => {
    const caItem = screenRecord(CA, {}, rec({ id: 'ca', state: 'CA', disposition: 'dismissed' }));
    const txItem = screenRecord(TX, {}, rec({ id: 'tx', state: 'TX', disposition: 'convicted', charge_type: 'misdemeanor' }));
    // Exact per-state outcomes — the whole point of routing each record to its
    // own law: CA-dismissed clears, TX-convicted-misdemeanor does not. If these
    // ever flip, the configs got crossed (the original headline bug).
    expect(caItem.resultStatus).toBe('eligible');
    expect(txItem.resultStatus).toBe('ineligible');
    // And each result carries the state of the record it came from.
    expect(caItem.state).toBe('CA');
    expect(txItem.state).toBe('TX');
  });
});

describe('screenAll — the per-record routing boundary', () => {
  it('routes EACH record to its own state config (the headline-bug guard)', () => {
    // A CA record and a TX record screened together: routing must send each to
    // configs[record.state], not to a shared/first config. If the mapping were
    // crossed (both under CA, the original bug), the TX theft would come back
    // eligible. This exercises configs[r.state] itself, not just screenRecord.
    const configs = { CA, TX };
    const records = [
      rec({ id: 'ca', state: 'CA', disposition: 'dismissed' }),
      rec({ id: 'tx', state: 'TX', disposition: 'convicted', charge_type: 'misdemeanor' }),
    ];
    const results = screenAll(configs, {}, records);
    expect(results.map(r => r.state)).toEqual(['CA', 'TX']);
    expect(results.find(r => r.state === 'CA')!.resultStatus).toBe('eligible');
    expect(results.find(r => r.state === 'TX')!.resultStatus).toBe('ineligible');
  });

  it('skips a record whose state has no config (in-research, not screened here)', () => {
    const configs = { CA };
    const results = screenAll(configs, {}, [
      rec({ id: 'ca', state: 'CA', disposition: 'dismissed' }),
      rec({ id: 'zz', state: 'ZZ' }),
    ]);
    expect(results.map(r => r.state)).toEqual(['CA']);
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

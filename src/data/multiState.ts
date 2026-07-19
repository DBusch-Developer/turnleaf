// Per-state screening: evaluate each record against ITS OWN state's config, and
// group results/records by state for stacked, per-state display. The engine
// itself (rulesEngine.ts) is single-config by design; this is the layer that
// runs it once per record against the right state.
import type { StateRuleConfig } from './fallbackRules';
import { evaluate, type Answers } from './rulesEngine';
import type { ConvictionRecord } from './screening';

export interface ScreeningResultItem {
  recordId: string;
  state: string;
  title: string;
  charge_type: string;
  disposition: string;
  resultStatus: 'eligible' | 'waiting' | 'ineligible' | 'complex';
  resultTitle: string;
  resultMessage: string;
  remedy: string;
  citation: string;
}

/** Evaluate one record against one state's config. The config MUST be the one
 *  for `record.state`; passing another state's config is the original bug. */
export function screenRecord(
  config: StateRuleConfig,
  answers: Answers,
  record: ConvictionRecord,
  now?: Date
): ScreeningResultItem {
  const evaluation = evaluate(config, answers ?? {}, record, now);
  return {
    recordId: record.id,
    state: record.state,
    title: record.title || 'Unnamed Offense',
    charge_type: record.charge_type,
    disposition: record.disposition,
    resultStatus: evaluation.status,
    resultTitle: evaluation.title,
    resultMessage: evaluation.message,
    remedy: evaluation.remedy,
    citation: evaluation.citation,
  };
}

/** Bucket items by state, in the order each state first appears. */
export function groupByState<T>(
  items: T[],
  stateOf: (t: T) => string
): Array<{ state: string; items: T[] }> {
  const order: string[] = [];
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const s = stateOf(item);
    if (!buckets.has(s)) { buckets.set(s, []); order.push(s); }
    buckets.get(s)!.push(item);
  }
  return order.map(state => ({ state, items: buckets.get(state)! }));
}

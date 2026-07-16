// ============================================================================
// THE RULES ENGINE
//
// Extracted from EligibilityWizard so it can be tested. It used to live inside
// the component, which meant the only way to exercise it was to copy it — and a
// copy is not the thing. Every persona in rulesEngine.test.ts now runs the real
// engine.
//
// It walks a state's tree. It dispatches on node.type — NEVER on node id. The
// previous version matched a hardcoded allowlist of ids ('offense_level',
// 'disposition_type', ...), so every node whose id was not on the list fell
// through to a "Complex Analysis Required" fallback. That silently killed every
// conviction path in California, Arizona and New York: a person answered every
// question honestly and got told their case was too complex to screen.
//
// Two rules hold:
//   1. Dispatch by shape, not by name. A tree that is well-formed is walkable.
//   2. An answer we do not have is never invented. Missing period, missing
//      answer, unmatched value — all route to a hedge, never to a default.
// ============================================================================

import type { RuleNode, RuleResult, StateRuleConfig } from './fallbackRules';
import { readField, type ConvictionRecord } from './screening';

/** Result key every tree exposes for "we cannot screen this yet". */
export const HEDGE = 'unknown_disposition';

/** The answer to one node: an option value, a yes/no, or a date string. */
export type Answer = string | boolean;

/** What the walk needs: answers given so far, keyed by node id. */
export type Answers = Record<string, Answer>;

/** Traversal cap. A cycle cannot get past the validator, but a live tree from
 *  the database has not been through it — so the engine still refuses to spin. */
const MAX_STEPS = 30;

/**
 * The last-resort result. It fires when the tree cannot classify the record at
 * all, so it cannot name the law that applies — and must not pretend to. It
 * once cited 'General State Sealing Statutes', which is not a statute anywhere.
 */
export const UNCLASSIFIED: RuleResult = {
  status: 'complex',
  title: 'Complex Analysis Required',
  message:
    'This screening could not classify your record from what was entered, so it has no answer for you — and would rather say so than guess. A legal aid attorney can review the case directly.',
  remedy: 'Legal Aid Intake Evaluation',
  citation: 'No citation — this result means the screener could not classify your situation.',
};

/**
 * How much time has passed since `from`, in `unit`. null if the date is unusable.
 *
 * Months and years are counted as calendar steps, not as 30- or 365.25-day
 * approximations: someone sitting a day either side of their eligibility date
 * deserves the answer a clerk would give them.
 */
export function elapsedSince(
  from: string,
  unit: 'days' | 'months' | 'years',
  now: Date = new Date()
): number | null {
  const start = new Date(from);
  if (isNaN(start.getTime())) return null;

  if (unit === 'days') {
    return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  }

  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--; // not a full month until the day lands

  return unit === 'months' ? months : Math.floor(months / 12);
}

/**
 * Can this node be answered from the record, or must a person answer it?
 * A node with no `field` is asked; the tree supplies its own answers.
 */
export function isAsked(node: RuleNode): boolean {
  return node.field === undefined && node.type !== 'date' && node.type !== 'checkpoint';
}

/** The answer for `nodeId`, from the record if the node is record-backed. */
function answerFor(
  node: RuleNode,
  nodeId: string,
  answers: Answers,
  record: ConvictionRecord
): Answer | null {
  if (node.field) {
    const value = readField(record, node.field);
    if (value === null || value === 'unknown') return null;
    return node.type === 'boolean' ? value === 'true' : value;
  }
  return answers[nodeId] ?? null;
}

/**
 * Where a node sends us given its answer. null means "no route" — an unmatched
 * option, an unanswered question, an unusable date. Callers hedge; they do not
 * guess.
 */
export function nextFrom(
  node: RuleNode,
  nodeId: string,
  answers: Answers,
  record: ConvictionRecord,
  now?: Date
): string | null {
  switch (node.type) {
    case 'choice': {
      const answer = answerFor(node, nodeId, answers, record);
      if (answer === null) return null;
      return node.options?.find(o => o.value === String(answer))?.next ?? null;
    }

    case 'boolean': {
      const answer = answerFor(node, nodeId, answers, record);
      if (answer === null) return null;
      return (answer === true || answer === 'true' ? node.yes : node.no) ?? null;
    }

    case 'date': {
      const v = node.validation;
      if (!v) return null; // a date node with no rule is a data bug, not a 1-year default

      // A period we do not know cannot be computed against. The type makes this
      // the only thing a null period can do.
      if ('nextUnknown' in v) return v.nextUnknown;

      const elapsed = elapsedSince(record.disposition_date, v.period.unit, now);
      if (elapsed === null) return v.nextFail;
      return elapsed >= v.period.amount ? v.nextPass : v.nextFail;
    }

    case 'checkpoint':
      // A gate, not a question: acknowledged in the UI, then straight through.
      return node.yes ?? node.options?.[0]?.next ?? null;
  }
}

/** The node the walk is currently sitting on, or null once it reaches a result. */
export function currentNode(
  config: StateRuleConfig,
  answers: Answers,
  record: ConvictionRecord,
  now?: Date
): { id: string; node: RuleNode } | null {
  let id = config.rules.startNode;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (config.rules.results[id]) return null; // landed on a result
    const node = config.rules.nodes[id];
    if (!node) return null;

    const next = nextFrom(node, id, answers, record, now);
    if (next === null) return { id, node }; // needs an answer — stop here
    id = next;
  }
  return null;
}

/**
 * Walk the tree to a result. Returns UNCLASSIFIED when the walk cannot finish:
 * an unanswered question, a broken reference, or a tree that refuses to
 * terminate. Every one of those is honest — none of them is a guess.
 */
export function evaluate(
  config: StateRuleConfig,
  answers: Answers,
  record: ConvictionRecord,
  now?: Date
): RuleResult {
  let id = config.rules.startNode;

  for (let step = 0; step < MAX_STEPS; step++) {
    const result = config.rules.results[id];
    if (result) return result;

    const node = config.rules.nodes[id];
    if (!node) break;

    const next = nextFrom(node, id, answers, record, now);
    if (next === null) {
      // No route. Prefer the state's own hedge, which speaks its language.
      return config.rules.results[HEDGE] ?? UNCLASSIFIED;
    }
    id = next;
  }

  return config.rules.results[HEDGE] ?? UNCLASSIFIED;
}

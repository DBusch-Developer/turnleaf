// ============================================================================
// STRUCTURAL VALIDATION (FR-21, ADR-0002, ADR-0005)
//
// Checks that a state's decision tree is well-formed: references resolve,
// every node is reachable, no cycles, required fields present.
//
// This validates STRUCTURE ONLY. It cannot tell you the law is right, that a
// citation is real, or that a waiting period is accurate — no automated check
// can. See RULES.md.
//
// Why it matters: the rules engine caps traversal at 30 steps and then returns
// a hardcoded 'Complex Analysis Required' result. A malformed tree therefore
// never crashes — it silently produces a plausible-looking answer for a real
// person. Structure is checked here, before anything reaches the database.
// ============================================================================

import type { StateRuleConfig, RuleNode } from './fallbackRules';

export type ValidationRule =
  | 'missing-field'
  | 'unresolved-ref'
  | 'unreachable'
  | 'cycle'
  | 'bad-shape'
  /** A field is null (unknown) with no open question accounting for it, or an
   *  open question claims to block a field that still holds a value. */
  | 'unblocked-null';

export interface ValidationError {
  /** Two-letter state code, so a seed failure names the state. */
  state: string;
  rule: ValidationRule;
  /** Dotted path to the offending key, e.g. nodes.disposition.options[0].next */
  path: string;
  message: string;
}

/** Every outgoing edge of a node, with the path to the key that declares it. */
function edgesOf(node: RuleNode, nodeId: string): Array<{ path: string; target: string }> {
  const edges: Array<{ path: string; target: string }> = [];

  node.options?.forEach((opt, i) => {
    edges.push({ path: `nodes.${nodeId}.options[${i}].next`, target: opt.next });
  });
  if (node.yes !== undefined) edges.push({ path: `nodes.${nodeId}.yes`, target: node.yes });
  if (node.no !== undefined) edges.push({ path: `nodes.${nodeId}.no`, target: node.no });
  if (node.validation) {
    const v = node.validation;
    if ('nextUnknown' in v) {
      // A null period has no pass/fail to compute — only the hedged route.
      edges.push({ path: `nodes.${nodeId}.validation.nextUnknown`, target: v.nextUnknown });
    } else {
      edges.push({ path: `nodes.${nodeId}.validation.nextPass`, target: v.nextPass });
      edges.push({ path: `nodes.${nodeId}.validation.nextFail`, target: v.nextFail });
    }
  }

  return edges;
}

/** 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' — the precision the package gave, no more. */
const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** Remedy fields that may be null, and only with an open question behind them. */
const NULLABLE_REMEDY_FIELDS = ['formName', 'formUrl', 'fees', 'feeWaiver', 'courtContact'] as const;

/** Read a dotted path (the shape blocksField uses). undefined = no such field. */
function readPath(config: StateRuleConfig, path: string): unknown {
  let cursor: unknown = config;
  for (const key of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    if (!(key in (cursor as Record<string, unknown>))) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

/**
 * Is `path` accounted for by an open question? Either the question names it
 * exactly, or it names an ancestor of it ('...remedies.sealing' covers
 * '...remedies.sealing.fees').
 */
function isBlocked(config: StateRuleConfig, path: string): boolean {
  return config.openQuestions.some(q =>
    q.blocksFields.some(f => f === path || path.startsWith(`${f}.`))
  );
}

function checkShape(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  for (const [id, node] of Object.entries(config.rules.nodes)) {
    if (node.type === 'choice' && !node.options?.length) {
      err('bad-shape', `nodes.${id}.options`, `choice node '${id}' has no options`);
    }
    if (node.type === 'boolean') {
      if (!node.yes) err('bad-shape', `nodes.${id}.yes`, `boolean node '${id}' has no 'yes' branch`);
      if (!node.no) err('bad-shape', `nodes.${id}.no`, `boolean node '${id}' has no 'no' branch`);
    }
    if (node.type === 'date' && !node.validation) {
      err('bad-shape', `nodes.${id}.validation`, `date node '${id}' has no validation block`);
    }
  }
}

function checkRequiredFields(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  if (!config.rules.startNode) {
    err('missing-field', 'rules.startNode', 'startNode is not set');
  }

  // Provenance. Rules data comes from a research package or it does not ship:
  // a state whose rules came from somewhere else cannot be audited against
  // anything, and "somewhere else" in practice means a model's recollection
  // of state law.
  if (!config.sourcePackage?.trim()) {
    err('missing-field', 'sourcePackage', 'no research package recorded — where did these rules come from?');
  } else if (!config.sourcePackage.startsWith('research/waves/')) {
    err('bad-shape', 'sourcePackage',
      `'${config.sourcePackage}' is not under research/waves/ — rules data may only come from a research package`);
  }

  if (!config.terminology?.trim()) {
    err('missing-field', 'terminology', 'no terminology recorded — what does this state call its remedies, and what does it NOT have?');
  }

  if (!config.sources?.length) {
    err('missing-field', 'sources', 'no statute sources recorded');
  }
  config.sources?.forEach((s, i) => {
    if (!s.id?.trim()) err('missing-field', `sources[${i}].id`, 'source has no statute identifier');
  });

  // Dates carry the precision the package gave and no more. '2021' is a fact;
  // '2021-01-01' invented from '2021' is a fabrication wearing a date's clothes.
  config.keyDates?.forEach((kd, i) => {
    if (!PARTIAL_DATE.test(kd.date)) {
      err('bad-shape', `keyDates[${i}].date`,
        `'${kd.date}' is not 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' — record the precision the package gave, never pad it`);
    }
    if (!kd.label?.trim()) err('missing-field', `keyDates[${i}].label`, 'key date has no label');
  });

  // RULES.md: every result must trace to a real, cited statute. We can only
  // check that a citation is present — never that it is real.
  for (const [id, result] of Object.entries(config.rules.results)) {
    if (!result.citation?.trim()) {
      err('missing-field', `results.${id}.citation`, `result '${id}' has no citation`);
    }
  }

  // The inverted rule. A field may be null — null means UNKNOWN, which is
  // often the only honest value — but only when an open question accounts for
  // it. Unaccounted nulls are how "we never checked" quietly becomes "$0".
  for (const [id, remedy] of Object.entries(config.resources.remedies)) {
    if (!remedy.name?.trim()) {
      err('missing-field', `resources.remedies.${id}.name`, `remedy '${id}' has no name`);
    }

    for (const field of NULLABLE_REMEDY_FIELDS) {
      const path = `resources.remedies.${id}.${field}`;
      const value = remedy[field];

      if (value === null) {
        if (!isBlocked(config, path)) {
          err('unblocked-null', path,
            `${field} is null (unknown) but no open question blocks it — either record the question that makes it unknown, or fill it in`);
        }
      } else if (!value.trim()) {
        err('missing-field', path,
          `${field} is empty. Unknown is spelled null, and needs an open question; an empty string says nothing`);
      }
    }

    if (!remedy.steps?.length) {
      err('missing-field', `resources.remedies.${id}.steps`, `remedy '${id}' has no steps`);
    }
  }

  // ...and the same rule read backwards: a question that claims to block a
  // field must actually be blocking one. Otherwise a stale question makes a
  // live value look checked.
  config.openQuestions?.forEach((q, i) => {
    if (!q.question?.trim()) {
      err('missing-field', `openQuestions[${i}].question`, 'open question has no text');
    }
    q.blocksFields.forEach((field, j) => {
      const value = readPath(config, field);
      if (value === undefined) {
        err('unresolved-ref', `openQuestions[${i}].blocksFields[${j}]`,
          `'${field}' names no field on this state`);
      } else if (value !== null) {
        err('unblocked-null', `openQuestions[${i}].blocksFields[${j}]`,
          `'${field}' has an open question against it but still holds a value (${JSON.stringify(value)}) — a field we are still asking about must be null`);
      }
    });
  });
}

function checkReferences(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  const { startNode, nodes, results } = config.rules;
  const exists = (key: string) => key in nodes || key in results;

  if (startNode && !exists(startNode)) {
    err('unresolved-ref', 'rules.startNode', `startNode '${startNode}' names no node or result`);
  }

  for (const [id, node] of Object.entries(nodes)) {
    for (const { path, target } of edgesOf(node, id)) {
      if (!exists(target)) {
        err('unresolved-ref', path, `'${target}' names no node or result`);
      }
    }
  }
}

function checkReachability(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  const { startNode, nodes } = config.rules;

  // Walk from startNode, following only edges that land on other nodes.
  const reached = new Set<string>();
  const queue = [startNode];
  while (queue.length) {
    const id = queue.shift()!;
    if (reached.has(id) || !(id in nodes)) continue;
    reached.add(id);
    for (const { target } of edgesOf(nodes[id], id)) {
      if (target in nodes) queue.push(target);
    }
  }

  for (const id of Object.keys(nodes)) {
    if (!reached.has(id)) {
      err('unreachable', `nodes.${id}`, `node '${id}' is unreachable from startNode '${startNode}'`);
    }
  }
}

function checkAcyclic(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  const { nodes } = config.rules;
  const visiting = new Set<string>();
  const done = new Set<string>();
  const reported = new Set<string>();

  const walk = (id: string, trail: string[]) => {
    if (done.has(id) || !(id in nodes)) return;

    if (visiting.has(id)) {
      const loop = [...trail.slice(trail.indexOf(id)), id].join(' → ');
      if (!reported.has(id)) {
        reported.add(id);
        err('cycle', `nodes.${id}`, `cycle: ${loop} — a path through it never reaches a result`);
      }
      return;
    }

    visiting.add(id);
    for (const { target } of edgesOf(nodes[id], id)) {
      walk(target, [...trail, id]);
    }
    visiting.delete(id);
    done.add(id);
  };

  walk(config.rules.startNode, []);
}

/**
 * Validate one state's structure. Returns every error found (empty = valid).
 *
 * Reachability and cycle checks are skipped when a reference is unresolved:
 * a broken edge orphans whatever it used to point at, and reporting those
 * cascades would bury the one typo that actually needs fixing.
 */
export function validateState(config: StateRuleConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (rule: ValidationRule, path: string, message: string) =>
    errors.push({ state: config.code, rule, path, message });

  checkRequiredFields(config, err);
  checkShape(config, err);
  checkReferences(config, err);

  if (!errors.some(e => e.rule === 'unresolved-ref')) {
    checkReachability(config, err);
    checkAcyclic(config, err);
  }

  return errors;
}

/** Validate every state, tagging each error with its state code. */
export function validateAll(rules: Record<string, StateRuleConfig>): ValidationError[] {
  return Object.values(rules).flatMap(validateState);
}

/** Render errors for a terminal, grouped by state. */
export function formatErrors(errors: ValidationError[]): string {
  const byState = new Map<string, ValidationError[]>();
  for (const e of errors) {
    byState.set(e.state, [...(byState.get(e.state) ?? []), e]);
  }

  return [...byState.entries()]
    .map(([state, list]) =>
      [`  ${state} — ${list.length} problem${list.length === 1 ? '' : 's'}:`,
       ...list.map(e => `    [${e.rule}] ${e.path}\n      ${e.message}`)].join('\n')
    )
    .join('\n\n');
}

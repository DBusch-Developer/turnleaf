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
  | 'bad-shape';

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
    edges.push({ path: `nodes.${nodeId}.validation.nextPass`, target: node.validation.nextPass });
    edges.push({ path: `nodes.${nodeId}.validation.nextFail`, target: node.validation.nextFail });
  }

  return edges;
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

  // RULES.md: every result must trace to a real, cited statute. We can only
  // check that a citation is present — never that it is real.
  for (const [id, result] of Object.entries(config.rules.results)) {
    if (!result.citation?.trim()) {
      err('missing-field', `results.${id}.citation`, `result '${id}' has no citation`);
    }
  }

  for (const [id, remedy] of Object.entries(config.resources.remedies)) {
    for (const field of ['formName', 'formUrl', 'fees', 'courtContact'] as const) {
      if (!remedy[field]?.trim()) {
        err('missing-field', `resources.remedies.${id}.${field}`, `remedy '${id}' has no ${field}`);
      }
    }
    if (!remedy.steps?.length) {
      err('missing-field', `resources.remedies.${id}.steps`, `remedy '${id}' has no steps`);
    }
  }
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

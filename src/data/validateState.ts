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
// BACKLOG — a question should ASK for everything it BLOCKS.
// Four questions once blocked `feeWaiver` while asking only about the fee. The
// call sheet generates from the question TEXT, so the waiver would have gone
// unasked on the call and stayed null forever, with a question standing against
// it that nobody could close. Caught by diffing the generated sheet against the
// hand-written one, which asked the waiver explicitly.
// Only a weak proxy is automatable (does the text mention the concept the field
// names?) and it false-positives easily. Until then it is a reviewer's check:
// for every blocksFields entry, does the question actually ask for it?
//
// Why it matters: the rules engine caps traversal at 30 steps and then returns
// a hardcoded 'Complex Analysis Required' result. A malformed tree therefore
// never crashes — it silently produces a plausible-looking answer for a real
// person. Structure is checked here, before anything reaches the database.
// ============================================================================

import type { StateRuleConfig, RuleNode } from './fallbackRules';
import { FIELD_DOMAINS, BOOLEAN_FIELDS, DATE_FIELDS } from './screening';

export type ValidationRule =
  | 'missing-field'
  | 'unresolved-ref'
  | 'unreachable'
  | 'cycle'
  | 'bad-shape'
  /** A field is null (unknown) with no open question accounting for it, or an
   *  open question claims to block a field that still holds a value. */
  | 'unblocked-null'
  /** A record-backed node offers an option value that field can never hold, so
   *  the branch is unreachable no matter what the person answers. */
  | 'unproducible-value'
  /** A statute link that does not represent a real human verification: a url
   *  with no retrievedOn (a link nobody recorded reading), or a url on a state
   *  still marked 'draft' (a link on rules no human has checked). The link IS
   *  the verification claim, so it may only exist where the claim is true. */
  | 'source-url-integrity'
  /** verifiedDate (when the badge was earned) must be present exactly when the
   *  badge is: set on a non-draft state, absent on a draft one, and a real date
   *  when present. A badge with no date, or a date on unverified rules, is a
   *  verification claim that does not line up with itself. */
  | 'verified-date-integrity';

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

/**
 * A node that reads its answer from the record may only offer values that field
 * can hold. Anything else is a branch nobody can ever reach: Arizona offered
 * 'felony_high' against charge_type, which only ever holds 'felony', so its
 * whole sealing ladder was dead no matter what a person entered.
 *
 * Nodes with no `field` are ASKED — the tree names its own answers, so there is
 * no domain to check and nothing to constrain them.
 */
function checkProducibility(config: StateRuleConfig, err: (r: ValidationRule, p: string, m: string) => void) {
  for (const [id, node] of Object.entries(config.rules.nodes)) {
    if (!node.field) continue;

    const domain = FIELD_DOMAINS[node.field];
    if (!domain) {
      err('bad-shape', `nodes.${id}.field`, `'${node.field}' is not a record field`);
      continue;
    }

    if (node.type === 'boolean' && !BOOLEAN_FIELDS.includes(node.field)) {
      err('bad-shape', `nodes.${id}.field`,
        `boolean node '${id}' reads '${node.field}', which is not a yes/no field`);
    }

    // A date node may only read a DATE field, and the form holds exactly one:
    // the disposition date. So a date node may read the record ONLY when its
    // clock genuinely runs from that date — otherwise it must ask.
    //
    // This is the anchor-vs-field contract. Every date node declares what its
    // clock runs from; the engine used to ignore that and read disposition_date
    // regardless, so Arizona (absolute discharge, often years after sentencing)
    // and New York (sentencing-or-release, whichever LATER) told people they
    // were eligible years early. Wave 1's own cross-state flag 3 warned about
    // this before the code review found it.
    if (node.type === 'date' && !DATE_FIELDS.includes(node.field)) {
      err('bad-shape', `nodes.${id}.field`,
        `date node '${id}' reads '${node.field}', which is not a date field — a date node reads ` +
        `${DATE_FIELDS.join(' | ')} or nothing at all, in which case it asks for its own date`);
    }
    if (node.type !== 'date' && DATE_FIELDS.includes(node.field)) {
      err('bad-shape', `nodes.${id}.field`,
        `${node.type} node '${id}' reads the date field '${node.field}'`);
    }

    node.options?.forEach((opt, i) => {
      if (!domain.includes(opt.value)) {
        err('unproducible-value', `nodes.${id}.options[${i}].value`,
          `'${opt.value}' is not a value '${node.field}' can hold (${domain.join(' | ')}) — ` +
          `this branch is unreachable. Either use a value the form produces, or drop the ` +
          `'field' so the tree asks the question itself.`);
      }
    });
  }
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

  // verifiedDate lines up with the badge or it is wrong. A non-draft state has
  // earned its badge and must date it; a draft state has not and must not.
  const isDraftState = config.verificationStatus === 'draft';
  const verifiedDate = config.verifiedDate ?? null;
  if (isDraftState && verifiedDate !== null) {
    err('verified-date-integrity', 'verifiedDate',
      `verifiedDate is set (${JSON.stringify(verifiedDate)}) but the state is still 'draft' — a badge date may only exist once the badge is earned`);
  }
  if (!isDraftState && verifiedDate === null) {
    err('verified-date-integrity', 'verifiedDate',
      `state is '${config.verificationStatus}' but has no verifiedDate — record the date the badge was earned`);
  }
  if (verifiedDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(verifiedDate)) {
    err('verified-date-integrity', 'verifiedDate',
      `'${verifiedDate}' is not a full YYYY-MM-DD date — a verification happened on a specific day`);
  }

  if (!config.sources?.length) {
    err('missing-field', 'sources', 'no statute sources recorded');
  }
  config.sources?.forEach((s, i) => {
    if (!s.id?.trim()) err('missing-field', `sources[${i}].id`, 'source has no statute identifier');
    // A url is a claim that a human opened the official text. It may only exist
    // where that is true: it needs a retrievedOn (the date it was read), and it
    // may not sit on a state still marked 'draft' (rules no human has checked).
    // Never auto-fill a url from a domain or a guess — a link nobody read is
    // exactly the false verification this rule exists to catch.
    if (s.url) {
      if (!s.retrievedOn) {
        err('source-url-integrity', `sources[${i}].retrievedOn`,
          `source has a url but no retrievedOn — a statute link must record the date a human read it`);
      }
      if (config.verificationStatus === 'draft') {
        err('source-url-integrity', `sources[${i}].url`,
          `source has a url but the state is still 'draft' — a link may only sit on rules a human has verified (flip the state's verificationStatus first)`);
      }
    }
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
  checkProducibility(config, err);
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

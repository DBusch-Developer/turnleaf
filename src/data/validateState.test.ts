import { describe, test, expect } from 'vitest';
import { validateState, validateAll } from './validateState';
import { fallbackRules, type StateRuleConfig } from './fallbackRules';

// A minimal, structurally valid config. Each test clones this and breaks
// exactly one thing, so a failure names the rule that caught it.
function validConfig(): StateRuleConfig {
  return {
    code: 'ZZ',
    name: 'Teststate',
    lastReviewed: '2026-07-15',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology: 'Teststate seals; it does not expunge.',
    keyDates: [{ label: 'Sealing act effective', date: '2023-01-01', kind: 'effective', note: null }],
    openQuestions: [],
    sources: [{ id: 'Test Code § 1', url: null, retrievedOn: null }],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          text: 'What was the outcome?',
          options: [
            { label: 'Convicted', value: 'convicted', next: 'wait_check' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_dismissed' },
          ],
        },
        wait_check: {
          type: 'date',
          text: 'When were you sentenced?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'sentencing' },
            nextPass: 'eligible_expungement',
            nextFail: 'waiting',
          },
        },
      },
      results: {
        eligible_dismissed: {
          status: 'eligible',
          title: 'Potentially eligible',
          message: 'You appear potentially eligible.',
          remedy: 'Sealing',
          citation: 'Test Code § 1',
        },
        eligible_expungement: {
          status: 'eligible',
          title: 'Potentially eligible',
          message: 'You appear potentially eligible.',
          remedy: 'Sealing',
          citation: 'Test Code § 2',
        },
        waiting: {
          status: 'waiting',
          title: 'Waiting period',
          message: 'You may need to wait.',
          remedy: 'Sealing',
          citation: 'Test Code § 3',
        },
      },
    },
    resources: {
      remedies: {
        Sealing: {
          name: 'Sealing',
          formName: 'Form ZZ-1',
          formUrl: 'https://courts.zz.gov/form-zz-1',
          steps: ['File the form.'],
          fees: '$0',
          feeWaiver: 'Available',
          courtContact: 'Clerk of Court',
        },
      },
      legalAid: [{ name: 'ZZ Legal Aid', url: 'https://legalaid.zz.org' }],
    },
  };
}

describe('validateState — valid configs', () => {
  test('returns no errors for a structurally valid config', () => {
    expect(validateState(validConfig())).toEqual([]);
  });
});

describe('validateState — reference resolution', () => {
  test('flags a choice option pointing at a nonexistent key', () => {
    const c = validConfig();
    c.rules.nodes.disposition.options![0].next = 'wait_chek'; // typo
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('wait_chek');
    expect(errors[0].path).toBe('nodes.disposition.options[0].next');
  });

  test('flags a boolean yes/no pointing at a nonexistent key', () => {
    const c = validConfig();
    c.rules.nodes.gate = { type: 'boolean', text: 'Registered?', yes: 'nowhere', no: 'waiting' };
    c.rules.nodes.disposition.options![0].next = 'gate';
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('nodes.gate.yes');
    expect(errors[0].message).toContain('nowhere');
  });

  test('flags a date validation nextPass/nextFail pointing at a nonexistent key', () => {
    const c = validConfig();
    c.rules.nodes.wait_check.validation = {
      period: { amount: 2, unit: 'years', anchor: 'sentencing' },
      nextPass: 'eligible_expungement',
      nextFail: 'waitng', // typo
    };
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('nodes.wait_check.validation.nextFail');
  });

  test('flags a null-period nextUnknown pointing at a nonexistent key', () => {
    const c = validConfig();
    // A period we do not know: the only route is the hedged one.
    c.rules.nodes.wait_check.validation = {
      period: { amount: null, unit: 'years', anchor: 'sentencing' },
      nextUnknown: 'ghost',
    };
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('nodes.wait_check.validation.nextUnknown');
  });

  test('flags a startNode that names nothing', () => {
    const c = validConfig();
    c.rules.startNode = 'ghost';
    const errors = validateState(c);

    expect(errors.some(e => e.path === 'rules.startNode')).toBe(true);
  });
});

describe('validateState — reachability', () => {
  test('flags an orphan node unreachable from startNode', () => {
    const c = validConfig();
    c.rules.nodes.stranded = { type: 'boolean', text: 'Unreachable?', yes: 'waiting', no: 'waiting' };
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('unreachable');
    expect(errors[0].path).toBe('nodes.stranded');
  });

  // A questionnaire must be acyclic: a cycle means some sequence of answers
  // loops forever. The engine caps traversal at 30 steps and then emits a
  // hardcoded result with a fabricated citation, so a loop never surfaces as
  // a crash — it surfaces as a wrong answer. Catch it here instead.
  test('flags a cycle, because a path through it can never terminate', () => {
    const c = validConfig();
    c.rules.nodes.loop_a = { type: 'boolean', text: 'A?', yes: 'loop_b', no: 'waiting' };
    c.rules.nodes.loop_b = { type: 'boolean', text: 'B?', yes: 'loop_a', no: 'waiting' };
    c.rules.nodes.disposition.options![0].next = 'loop_a';
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'cycle')).toBe(true);
  });

  test('accepts converging branches, which are not a cycle', () => {
    const c = validConfig();
    c.rules.nodes.gate = { type: 'boolean', text: 'Gate?', yes: 'wait_check', no: 'waiting' };
    c.rules.nodes.disposition.options![0].next = 'gate';

    // 'waiting' is now reached from both gate.no and wait_check.nextFail.
    expect(validateState(c)).toEqual([]);
  });
});

describe('validateState — required fields', () => {
  test('flags a result with a missing citation', () => {
    const c = validConfig();
    c.rules.results.waiting.citation = '';
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('missing-field');
    expect(errors[0].path).toBe('results.waiting.citation');
  });

  test('flags a remedy missing required fields', () => {
    const c = validConfig();
    c.resources.remedies.Sealing.formUrl = '';
    c.resources.remedies.Sealing.courtContact = '';
    const errors = validateState(c);

    expect(errors).toHaveLength(2);
    expect(errors.map(e => e.path).sort()).toEqual([
      'resources.remedies.Sealing.courtContact',
      'resources.remedies.Sealing.formUrl',
    ]);
  });

  test('flags a remedy with no steps', () => {
    const c = validConfig();
    c.resources.remedies.Sealing.steps = [];
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('resources.remedies.Sealing.steps');
  });

  // NOTE: result.remedy is deliberately NOT checked against the keys of
  // resources.remedies. It is a display label (e.g. 'Petition for Dismissal
  // (PC 1203.4)'), not a foreign key — ResultsDisplay renders every remedy in
  // resources rather than looking one up by this string.
});

// The rules these tests pin are the reason the schema exists. A null that
// nobody is asking about is how "we never checked" becomes "$0" — which is how
// someone gets told a filing is free, shows up at a counter without the money,
// and goes home.
describe('validateState — unknown values must be accounted for', () => {
  test('flags a null field with no open question behind it', () => {
    const c = validConfig();
    c.resources.remedies.Sealing.fees = null;
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('unblocked-null');
    expect(errors[0].path).toBe('resources.remedies.Sealing.fees');
  });

  test('accepts a null field when an open question blocks it', () => {
    const c = validConfig();
    c.resources.remedies.Sealing.fees = null;
    c.openQuestions = [
      { question: 'Is there a filing fee? Ask the clerk.', blocksFields: ['resources.remedies.Sealing.fees'] },
    ];

    expect(validateState(c)).toEqual([]);
  });

  test('accepts one question blocking several fields — dependent claims null together', () => {
    const c = validConfig();
    // "Waiver not required" only follows from "the fee is $0". One call answers
    // both, so one question blocks both.
    c.resources.remedies.Sealing.fees = null;
    c.resources.remedies.Sealing.feeWaiver = null;
    c.openQuestions = [
      {
        question: 'Is there a filing fee, and can it be waived? Ask the clerk.',
        blocksFields: [
          'resources.remedies.Sealing.fees',
          'resources.remedies.Sealing.feeWaiver',
        ],
      },
    ];

    expect(validateState(c)).toEqual([]);
  });

  test('flags a question standing against a field that still holds a value', () => {
    const c = validConfig();
    // fees is '$0' — a stale question here makes an unverified value look checked.
    c.openQuestions = [
      { question: 'Is there a filing fee?', blocksFields: ['resources.remedies.Sealing.fees'] },
    ];
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('unblocked-null');
    expect(errors[0].path).toBe('openQuestions[0].blocksFields[0]');
  });

  test('flags a question naming a field that does not exist', () => {
    const c = validConfig();
    c.openQuestions = [
      { question: 'What about this?', blocksFields: ['resources.remedies.Sealing.filingCost'] },
    ];
    const errors = validateState(c);

    expect(errors.some(e =>
      e.rule === 'unresolved-ref' && e.path === 'openQuestions[0].blocksFields[0]')).toBe(true);
  });

  test('flags an empty string standing in for unknown', () => {
    const c = validConfig();
    c.resources.remedies.Sealing.fees = '';
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('missing-field');
    expect(errors[0].message).toContain('null');
  });
});

describe('validateState — producibility', () => {
  test('flags an option value the record field can never hold', () => {
    // The real defect: AZ bound its class ladder to charge_type, which only
    // ever holds 'felony'. 'felony_high' could never match, so the whole
    // sealing ladder was unreachable no matter what a person entered.
    const c = validConfig();
    c.rules.nodes.disposition.field = 'charge_type';
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'unproducible-value')).toBe(true);
    expect(errors[0].message).toContain('unreachable');
  });

  test('a node with no field is asked, so its options are unconstrained', () => {
    // The tree names its own answers — that is how a state asks about class
    // 2/3 felonies without the form growing a field per state.
    const c = validConfig();
    c.rules.nodes.disposition.field = undefined;
    c.rules.nodes.disposition.options = [
      { label: 'Class 2 or 3 Felony', value: 'felony_high', next: 'wait_check' },
      { label: 'Anything else', value: 'other', next: 'eligible_dismissed' },
    ];

    expect(validateState(c).some(e => e.rule === 'unproducible-value')).toBe(false);
  });

  test('flags a boolean node reading a non-boolean field', () => {
    const c = validConfig();
    c.rules.nodes.gate = { type: 'boolean', text: 'Gate?', field: 'charge_type', yes: 'wait_check', no: 'waiting' };
    c.rules.nodes.disposition.options![0].next = 'gate';

    expect(validateState(c).some(e => e.path === 'nodes.gate.field')).toBe(true);
  });

  test('flags a field that is not a record field at all', () => {
    const c = validConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c.rules.nodes.disposition as any).field = 'astrological_sign';

    expect(validateState(c).some(e => e.path === 'nodes.disposition.field')).toBe(true);
  });
});

describe('validateState — provenance', () => {
  test('flags rules sourced from outside research/waves/', () => {
    const c = validConfig();
    c.sourcePackage = 'general knowledge of state law';
    const errors = validateState(c);

    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('bad-shape');
    expect(errors[0].path).toBe('sourcePackage');
  });

  test('flags a state with no recorded research package', () => {
    const c = validConfig();
    c.sourcePackage = '';

    expect(validateState(c).some(e => e.path === 'sourcePackage')).toBe(true);
  });

  test('flags a state with no statute sources', () => {
    const c = validConfig();
    c.sources = [];

    expect(validateState(c).some(e => e.path === 'sources')).toBe(true);
  });

  test('flags missing terminology', () => {
    const c = validConfig();
    c.terminology = '';

    expect(validateState(c).some(e => e.path === 'terminology')).toBe(true);
  });
});

describe('validateState — key dates', () => {
  test.each(['2021', '2021-06', '2021-06-15'])('accepts the precision the package gave: %s', (date) => {
    const c = validConfig();
    c.keyDates = [{ label: 'Act effective', date, kind: 'effective', note: null }];

    expect(validateState(c)).toEqual([]);
  });

  test.each(['2021-6-1', 'June 2021', '21-06-15', ''])('rejects malformed date: %s', (date) => {
    const c = validConfig();
    c.keyDates = [{ label: 'Act effective', date, kind: 'effective', note: null }];

    expect(validateState(c).some(e => e.path === 'keyDates[0].date')).toBe(true);
  });

  // Deliberately NOT tested, because it cannot be: '2021-01-01' padded from a
  // package that said only "2021" is a well-formed date and passes every check
  // here. The validator has never read the package. Precision against the
  // source is a reviewer's job — see AGENTS.md, "What the machine holds".
});

describe('validateState — node shape', () => {
  test('flags a choice node with no options', () => {
    const c = validConfig();
    c.rules.nodes.disposition.options = [];
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'bad-shape' && e.path === 'nodes.disposition.options')).toBe(true);
  });

  test('flags a boolean node missing a branch', () => {
    const c = validConfig();
    c.rules.nodes.gate = { type: 'boolean', text: 'Registered?', yes: 'waiting' };
    c.rules.nodes.disposition.options![0].next = 'gate';
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'bad-shape' && e.path === 'nodes.gate.no')).toBe(true);
  });

  test('flags a date node missing validation', () => {
    const c = validConfig();
    delete c.rules.nodes.wait_check.validation;
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'bad-shape' && e.path === 'nodes.wait_check.validation')).toBe(true);
  });
});

describe('validateState — statute-link integrity', () => {
  test('flags a source url that has no retrievedOn (a link nobody recorded reading)', () => {
    const c = validConfig();
    c.verificationStatus = 'statute_cited';
    c.sources[0] = { id: 'Test Code § 1', url: 'https://leg.zz.gov/1', retrievedOn: null };
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'source-url-integrity' && e.path === 'sources[0].retrievedOn')).toBe(true);
  });

  test('flags a source url on a state still marked draft (unverified rules)', () => {
    const c = validConfig(); // draft
    c.sources[0] = { id: 'Test Code § 1', url: 'https://leg.zz.gov/1', retrievedOn: '2026-07-16' };
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'source-url-integrity' && e.path === 'sources[0].url')).toBe(true);
  });

  test('accepts a url with a retrievedOn on a human-verified state', () => {
    const c = validConfig();
    c.verificationStatus = 'statute_cited';
    c.sources[0] = { id: 'Test Code § 1', url: 'https://leg.zz.gov/1', retrievedOn: '2026-07-16' };

    expect(validateState(c).filter(e => e.rule === 'source-url-integrity')).toEqual([]);
  });

  test('accepts a read-but-unlinked source (retrievedOn set, url still null)', () => {
    const c = validConfig();
    c.verificationStatus = 'statute_cited';
    c.sources[0] = { id: 'Test Code § 1', url: null, retrievedOn: '2026-07-16' };

    expect(validateState(c).filter(e => e.rule === 'source-url-integrity')).toEqual([]);
  });
});

describe('validateState — verified-date integrity', () => {
  test('flags a non-draft state with no verifiedDate (a badge with no date)', () => {
    const c = validConfig();
    c.verificationStatus = 'statute_cited';
    c.verifiedDate = null;
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'verified-date-integrity' && e.path === 'verifiedDate')).toBe(true);
  });

  test('flags a draft state that carries a verifiedDate (a date on unverified rules)', () => {
    const c = validConfig(); // draft
    c.verifiedDate = '2026-07-16';
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'verified-date-integrity' && e.path === 'verifiedDate')).toBe(true);
  });

  test('flags a verifiedDate that is not a full YYYY-MM-DD date', () => {
    const c = validConfig();
    c.verificationStatus = 'statute_cited';
    c.verifiedDate = '2026-07';
    const errors = validateState(c);

    expect(errors.some(e => e.rule === 'verified-date-integrity')).toBe(true);
  });

  test('accepts a draft state with no verifiedDate, and a verified state with one', () => {
    const draft = validConfig();
    expect(validateState(draft).filter(e => e.rule === 'verified-date-integrity')).toEqual([]);

    const verified = validConfig();
    verified.verificationStatus = 'statute_cited';
    verified.verifiedDate = '2026-07-16';
    expect(validateState(verified).filter(e => e.rule === 'verified-date-integrity')).toEqual([]);
  });
});

describe('validateState — error reporting', () => {
  test('reports every error, not just the first', () => {
    const c = validConfig();
    c.rules.nodes.disposition.options![0].next = 'gone';
    c.rules.results.waiting.citation = '';
    const errors = validateState(c);

    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  test('every error names the state code so a seed failure is actionable', () => {
    const c = validConfig();
    c.rules.nodes.disposition.options![0].next = 'gone';

    for (const e of validateState(c)) {
      expect(e.state).toBe('ZZ');
    }
  });
});

describe('validateAll', () => {
  test('every researched state in fallbackRules is structurally valid', () => {
    expect(validateAll(fallbackRules)).toEqual([]);
  });

  test('aggregates errors across states, tagging each with its code', () => {
    const broken = validConfig();
    broken.rules.startNode = 'ghost';
    const errors = validateAll({ ZZ: broken });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].state).toBe('ZZ');
  });
});

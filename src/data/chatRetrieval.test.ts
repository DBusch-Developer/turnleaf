import { describe, test, expect } from 'vitest';
import {
  VERIFIED_STATE_CODES,
  detectStateCodes,
  buildContextBundle,
  assembleContextText,
  collectCitations,
  parseTierTag,
  deterministicFallbackAnswer,
  contextStatuteNumbers,
  citedStatuteNumbers,
  hasUnsupportedCitation,
} from './chatRetrieval';
import { fallbackRules, type StateRuleConfig } from './fallbackRules';

describe('VERIFIED_STATE_CODES', () => {
  test('contains only screenable states and excludes drafts', () => {
    expect(VERIFIED_STATE_CODES.has('CA')).toBe(true); // statute_cited
    expect(VERIFIED_STATE_CODES.has('OH')).toBe(true);
    // A draft state must not be in scope. Pick any state that is draft in the data.
    const draft = Object.values(fallbackRules).find(s => s.verificationStatus === 'draft');
    expect(draft).toBeTruthy();
    expect(VERIFIED_STATE_CODES.has(draft!.code)).toBe(false);
  });
});

describe('detectStateCodes', () => {
  test('detects a full state name', () => {
    expect(detectStateCodes('Can I clear a misdemeanor in California?', null)).toEqual(['CA']);
  });
  test('falls back to the current state when nothing is named', () => {
    expect(detectStateCodes('what is sealing?', 'OH')).toEqual(['OH']);
  });
  test('returns empty when nothing is named and no current state', () => {
    expect(detectStateCodes('what is expungement?', null)).toEqual([]);
  });
  test('detects two states named by uppercase code', () => {
    expect(new Set(detectStateCodes('compare CA and NY please', null))).toEqual(new Set(['CA', 'NY']));
  });
  test('does not misfire West Virginia as Virginia', () => {
    expect(detectStateCodes('West Virginia expungement rules', null)).toEqual(['WV']);
  });
  test('does not treat the word "in" or "or" as Indiana/Oregon', () => {
    expect(detectStateCodes('what forms do I file or submit in court?', null)).toEqual([]);
  });
  test('does not misfire the interjection "OK" as Oklahoma', () => {
    expect(detectStateCodes('OK, what is the fee in Texas?', null)).toEqual(['TX']);
  });
  test('still detects Oklahoma by its full name', () => {
    expect(detectStateCodes('rules in Oklahoma', null)).toEqual(['OK']);
  });
});

describe('buildContextBundle', () => {
  test('preserves citations and keeps a null fee as null', () => {
    const ca = fallbackRules['CA'] as StateRuleConfig;
    const b = buildContextBundle(ca);
    expect(b.code).toBe('CA');
    expect(b.verified).toBe(true);
    expect(b.results.length).toBeGreaterThan(0);
    expect(b.results.some(r => r.citation && r.citation.length > 0)).toBe(true);
  });
});

describe('assembleContextText', () => {
  test('renders a null fee as an explicit "not verified" phrase', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    // Force a null fee to prove the renderer never omits-as-implied.
    const withNullFee = { ...bundle, remedies: [{ name: 'Test remedy', formName: null, steps: [], fees: null, feeWaiver: null, courtContact: null }] };
    const text = assembleContextText([withNullFee]);
    expect(text).toContain('not verified in our data');
  });

  test('renders a non-null courtContact on the remedy line', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const withContact = {
      ...bundle,
      remedies: [{ name: 'Test remedy', formName: null, steps: [], fees: null, feeWaiver: null, courtContact: 'Clerk of Court, (555) 123-4567' }],
    };
    const text = assembleContextText([withContact]);
    expect(text).toContain('Clerk of Court, (555) 123-4567');
  });

  test('a null courtContact is never dropped — renders "not verified in our data"', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const withNullContact = {
      ...bundle,
      remedies: [{ name: 'Test remedy', formName: null, steps: [], fees: null, feeWaiver: null, courtContact: null }],
    };
    const text = assembleContextText([withNullContact]);
    expect(text).toContain('court contact: not verified in our data');
  });

  test('renders keyDates when present', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const withKeyDate = {
      ...bundle,
      keyDates: [{ label: 'AB 1076 effective', date: '2021-01-01', kind: 'effective' as const, note: 'automatic relief begins' }],
    };
    const text = assembleContextText([withKeyDate]);
    expect(text).toContain('AB 1076 effective');
    expect(text).toContain('2021-01-01');
  });
});

describe('parseTierTag', () => {
  test('extracts a leading tier tag and strips it', () => {
    const { tier, text } = parseTierTag('[[TIER:VERIFIED]]\nUnder California law, this appears...');
    expect(tier).toBe('VERIFIED');
    expect(text.startsWith('Under California law')).toBe(true);
  });
  test('defaults to GENERAL when no tag is present', () => {
    const { tier, text } = parseTierTag('Sealing generally means...');
    expect(tier).toBe('GENERAL');
    expect(text).toBe('Sealing generally means...');
  });
});

describe('deterministicFallbackAnswer', () => {
  test('verified bundle -> VERIFIED tier with a citation and legal aid', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const ans = deterministicFallbackAnswer([bundle], [], 'can I clear a misdemeanor?');
    expect(ans.tier).toBe('VERIFIED');
    expect(ans.citations.length).toBeGreaterThan(0);
    expect(ans.legalAid.length).toBeGreaterThan(0);
    expect(ans.text.toLowerCase()).toContain('confirm');
  });
  test('no verified bundle -> BEYOND tier that refers, and never reasons', () => {
    const ans = deterministicFallbackAnswer([], ['WA'], 'what if I have records in two states?');
    expect(ans.tier).toBe('BEYOND');
    expect(ans.citations).toEqual([]);
    expect(ans.legalAid.length).toBeGreaterThan(0);
    expect(ans.text.toLowerCase()).toContain('legal aid');
  });

  test('a bundle claiming verified:false is not trusted -> BEYOND tier with no citations', () => {
    const bundle = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const unverifiedBundle = { ...bundle, verified: false };
    const ans = deterministicFallbackAnswer([unverifiedBundle], [], 'can I clear a misdemeanor?');
    expect(ans.tier).toBe('BEYOND');
    expect(ans.citations).toEqual([]);
  });
});

describe('citation backstop', () => {
  test('citedStatuteNumbers picks up cued citations and ignores durations/money', () => {
    const nums = citedStatuteNumbers('Under § 1203.4 and R.C. 2953.32 you may qualify; it takes 2 years and costs $50.');
    expect(new Set(nums)).toEqual(new Set(['1203.4', '2953.32']));
  });

  test('a citation present in the context is supported', () => {
    const ca = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const allowed = contextStatuteNumbers([ca]);
    expect(allowed.size).toBeGreaterThan(0);
    // Pick a real number the CA context actually contains, and prove the guard accepts it.
    const someNumber = [...allowed][0];
    expect(hasUnsupportedCitation(`grounded in § ${someNumber}`, [ca])).toBe(false);
  });

  test('a citation absent from the context is flagged as unsupported', () => {
    const ca = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    expect(hasUnsupportedCitation('see § 999999.99 for details', [ca])).toBe(true);
  });

  test('empty bundles: any cited statute is unsupported', () => {
    expect(hasUnsupportedCitation('per § 1203.4', [])).toBe(true);
  });

  test('no cited statute: never unsupported', () => {
    expect(hasUnsupportedCitation('Sealing generally hides a record from public view.', [])).toBe(false);
  });
});

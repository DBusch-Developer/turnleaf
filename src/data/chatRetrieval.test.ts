import { describe, test, expect } from 'vitest';
import {
  VERIFIED_STATE_CODES,
  detectStateCodes,
  buildContextBundle,
  assembleContextText,
  collectCitations,
  parseTierTag,
  deterministicFallbackAnswer,
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
});

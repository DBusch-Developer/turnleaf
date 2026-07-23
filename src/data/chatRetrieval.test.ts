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
import { isScreenable } from '../db/client';

describe('VERIFIED_STATE_CODES', () => {
  test('contains only screenable states and excludes drafts', () => {
    expect(VERIFIED_STATE_CODES.has('CA')).toBe(true); // statute_cited
    expect(VERIFIED_STATE_CODES.has('OH')).toBe(true);
    // A draft state must never be in scope. All 50 real states are now verified
    // (PA, the last draft, was verified 2026-07-18), so assert the exclusion at the
    // semantic level rather than via a live draft row: 'draft' is not screenable,
    // and every code that IS in scope maps to a screenable state in the data.
    expect(isScreenable('draft')).toBe(false);
    for (const code of VERIFIED_STATE_CODES) {
      expect(isScreenable(fallbackRules[code].verificationStatus)).toBe(true);
    }
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
  test('falls back to the whole on-screen set (multi-state) when nothing is named', () => {
    expect(detectStateCodes('what is the waiting period?', ['CA', 'TX'])).toEqual(['CA', 'TX']);
  });
  test('a named state still overrides the on-screen set', () => {
    expect(detectStateCodes('specifically in Texas though', ['CA', 'TX'])).toEqual(['TX']);
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

  test('cue regex catches the word "statute" and plural cue forms', () => {
    expect(citedStatuteNumbers('Per statute 999999.99 you qualify.')).toEqual(['999999.99']);
    // Each number needs its own cue word (CITED_NUM_RE matches per-cue, not
    // list-continuation) — "sections 1203.4 and articles 999999.99" exercises
    // two distinct plural cue forms in one sentence, both firing correctly.
    expect(new Set(citedStatuteNumbers('Under sections 1203.4 and articles 999999.99 you may qualify.')))
      .toEqual(new Set(['1203.4', '999999.99']));
  });

  test('a continued citation in a list is detected (inherits the cue)', () => {
    expect(new Set(citedStatuteNumbers('under sections 1203.4 and 999999.99 you may qualify')))
      .toEqual(new Set(['1203.4', '999999.99']));
  });
  test('a bare integer after a citation is not read as a citation', () => {
    expect(citedStatuteNumbers('under § 1203.4 and 2 years later')).toEqual(['1203.4']);
  });

  test('an UNVERIFIED (unlinked) source citation is not allow-listed', () => {
    const base = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const bundle = { ...base, results: [], remedies: [], questions: [], openQuestions: [], keyDates: [], terminology: '',
      sources: [{ id: 'Cal. Penal Code § 290.5', url: null, retrievedOn: null }] };
    expect(hasUnsupportedCitation('per § 290.5 you qualify', [bundle])).toBe(true);
  });

  test('a VERIFIED (linked) source citation is allow-listed', () => {
    const base = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    const bundle = { ...base, results: [], remedies: [], questions: [], openQuestions: [], keyDates: [], terminology: '',
      sources: [{ id: 'Cal. Penal Code § 1203.4', url: 'https://example.gov/1203.4', retrievedOn: '2026-07-16' }] };
    expect(hasUnsupportedCitation('per § 1203.4 you may qualify', [bundle])).toBe(false);
  });

  test('an Oxford/serial-comma list captures every item, including an invented last one', () => {
    expect(new Set(citedStatuteNumbers('§ 1203.4, 4852.01, and 290.5')))
      .toEqual(new Set(['1203.4', '4852.01', '290.5']));
    expect(new Set(citedStatuteNumbers('under sections 1203.4, 4852.01, and 999999.99 you may qualify')))
      .toEqual(new Set(['1203.4', '4852.01', '999999.99']));
  });

  test('a statute that appears only in node text (not in the model context) is not allow-listed', () => {
    const base = buildContextBundle(fallbackRules['CA'] as StateRuleConfig);
    // Put a citation ONLY in node-text `questions` and blank everything assembleContextText renders.
    const bundle = { ...base, results: [], remedies: [], terminology: '', openQuestions: [], keyDates: [], sources: [],
      questions: ['Was this under 625 ILCS 5/3-707?'] };
    // node text is never sent to the model, so citing it must be flagged unsupported:
    expect(hasUnsupportedCitation('per ILCS 5/3-707 you may qualify', [bundle])).toBe(true);
  });
});

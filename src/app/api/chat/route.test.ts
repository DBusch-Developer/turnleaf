import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './route';
import { buildContextBundle, contextStatuteNumbers } from '../../../data/chatRetrieval';
import { fallbackRules, type StateRuleConfig } from '../../../data/fallbackRules';

const call = (body: unknown) =>
  POST(new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

describe('/api/chat (deterministic path, no GROQ key)', () => {
  const savedKey = process.env.GROQ_API_KEY;
  const savedDb = process.env.DATABASE_URL;
  beforeEach(() => { delete process.env.GROQ_API_KEY; delete process.env.DATABASE_URL; });
  afterEach(() => {
    if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey;
    if (savedDb === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = savedDb;
  });

  test('rejects an empty message with 400', async () => {
    const res = await call({ message: '   ' });
    expect(res.status).toBe(400);
  });

  test('verified state -> VERIFIED tier, degraded, with citations', async () => {
    const res = await call({ message: 'Can I clear a misdemeanor?', stateCode: 'CA' });
    const data = await res.json();
    expect(data.degraded).toBe(true);
    expect(data.tier).toBe('VERIFIED');
    expect(data.citations.length).toBeGreaterThan(0);
    expect(data.answer.toLowerCase()).toContain('confirm');
  });

  test('unverified/draft state -> BEYOND tier with legal aid, no citations', async () => {
    const res = await call({ message: 'What about my record?', stateCode: 'WA' });
    const data = await res.json();
    expect(data.tier).toBe('BEYOND');
    expect(data.legalAid.length).toBeGreaterThan(0);
    expect(data.citations).toEqual([]);
  });
});

const groqReply = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => '',
});

describe('/api/chat (Groq path + citation backstop)', () => {
  const savedKey = process.env.GROQ_API_KEY;
  const savedDb = process.env.DATABASE_URL;
  beforeEach(() => { process.env.GROQ_API_KEY = 'test-key'; delete process.env.DATABASE_URL; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey;
    if (savedDb === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = savedDb;
  });

  test('a VERIFIED answer citing an out-of-context statute is discarded for the grounded fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => groqReply('[[TIER:VERIFIED]] Under § 999999.99 you qualify.')));
    const res = await call({ message: 'Can I clear a misdemeanor?', stateCode: 'CA' });
    const data = await res.json();
    expect(data.degraded).toBe(true);          // fell through to deterministic
    expect(data.answer).not.toContain('999999.99');
  });

  test('a clean GENERAL answer passes through untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => groqReply('[[TIER:GENERAL]] Sealing generally hides a record from public view.')));
    const res = await call({ message: 'what is sealing?', stateCode: 'CA' });
    const data = await res.json();
    expect(data.degraded).toBe(false);
    expect(data.tier).toBe('GENERAL');
    expect(data.answer).toContain('Sealing');
    expect(data.citations).toEqual([]);
  });

  test('a VERIFIED answer citing a real in-context statute passes through, not degraded', async () => {
    const ca = fallbackRules['CA'] as StateRuleConfig;
    const allowed = contextStatuteNumbers([buildContextBundle(ca)]);
    const someNumber = [...allowed][0];
    vi.stubGlobal('fetch', vi.fn(async () => groqReply(`[[TIER:VERIFIED]] Under § ${someNumber} you may qualify.`)));
    const res = await call({ message: 'Can I clear a misdemeanor?', stateCode: 'CA' });
    const data = await res.json();
    expect(data.degraded).toBe(false);
    expect(data.tier).toBe('VERIFIED');
    expect(data.citations.length).toBeGreaterThan(0);
  });
});

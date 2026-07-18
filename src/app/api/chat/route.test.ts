import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

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

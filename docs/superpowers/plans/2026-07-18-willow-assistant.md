# Willow Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Willow", a bottom-right hover chat assistant that answers follow-up questions conversationally from Turnleaf's verified data, with every answer labeled by tier (verified law / general info / beyond-what's-verified).

**Architecture:** A pure retrieval module assembles a context bundle from the existing `StateRuleConfig` data for the state(s) a question is about. A new `/api/chat` route feeds that context to Groq (mirroring `/api/summarize`) under a strict system prompt, with a deterministic fallback when Groq is unavailable. A global client widget (mounted via a minimal context provider in the root layout) renders the conversation, reading the current screen/state so answers default to what the user is viewing.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Groq (raw `fetch`, model `qwen-2.5-32b`), Vitest. No new dependencies.

## Global Constraints

- **Never invent law.** Every legal claim must trace to the verified CONTEXT; if it is not in the data, the assistant does not know it. (RULES.md golden rule.)
- **Always hedge, never advise.** No "you are eligible / you qualify / you should file." Copy the register from `src/app/api/summarize/route.ts` ("appears potentially eligible… a legal aid attorney or court clerk should confirm before you file").
- **Verified scope only.** "Verified law" answers cover the states where `isScreenable(verificationStatus)` is true (`'statute_cited' | 'phone_verified'`). Derive this at runtime — never hardcode the state list.
- **Tier 3 refers, never reasons.** Cross-state, hypothetical, or out-of-scope questions get an honest referral to legal aid, never a synthesized answer.
- **Anonymity.** No conversation logging or persistence server-side; log errors only, never message/history contents. No PII fields. No location collection, no external lookups, no constructed URLs/addresses.
- **Graceful degradation.** Groq down / no `GROQ_API_KEY` → deterministic templated answer built from verified data. DB down → `getState` silently serves `fallbackRules`.
- **Groq call shape (verbatim):** `POST https://api.groq.com/openai/v1/chat/completions`, header `Authorization: Bearer ${process.env.GROQ_API_KEY}`, body `model: 'qwen-2.5-32b'`, non-streaming.
- **Stack lock:** add no dependencies (needs an ADR). Tests are Vitest under the Node environment (no jsdom/testing-library present) — so pure logic is unit-tested; React components are verified by `npm run build` + manual exercise.
- **Lint changed files directly:** `npx eslint <file>` (repo `src/` has pre-existing lint noise that `npm run lint` masks).

---

## File Structure

- `src/data/chatRetrieval.ts` **(new)** — pure retrieval + prompt-assembly + deterministic fallback. No React, no `fetch`. The doctrine-critical core; fully unit-tested.
- `src/data/chatRetrieval.test.ts` **(new)** — Vitest tests for the above.
- `src/app/api/chat/route.ts` **(new)** — `POST` handler; wires retrieval → Groq → fallback.
- `src/app/api/chat/route.test.ts` **(new)** — Vitest tests for the no-key (deterministic) path and input validation.
- `src/components/AssistantContext.tsx` **(new)** — minimal React context publishing `{ selectedStateCode, stateName, screen }`; mounts the widget.
- `src/components/AssistantWidget.tsx` **(new)** — the bottom-right launcher + chat panel.
- `public/willow/*.png` **(new)** — Willow expression portraits.
- `src/app/layout.tsx` **(modify)** — wrap `{children}` in `AssistantProvider`.
- `src/app/page.tsx` **(modify)** — publish screen context; move the Demo Panel button so it doesn't collide with the launcher.

---

### Task 1: Retrieval, prompt assembly, and deterministic fallback

**Files:**
- Create: `src/data/chatRetrieval.ts`
- Test: `src/data/chatRetrieval.test.ts`

**Interfaces:**
- Consumes: `fallbackRules`, `stateDirectory`, `nationalReferrals`, and types `StateRuleConfig`, `RuleResult`, `StatuteSource`, `KeyDate` from `./fallbackRules`; `isScreenable` from `../db/client`.
- Produces:
  - `VERIFIED_STATE_CODES: Set<string>`
  - `detectStateCodes(message: string, currentStateCode: string | null): string[]`
  - `interface BundleRemedy { name: string; formName: string | null; steps: string[]; fees: string | null; feeWaiver: string | null; courtContact: string | null }`
  - `interface ContextBundle { code: string; name: string; verified: boolean; terminology: string; results: RuleResult[]; questions: string[]; remedies: BundleRemedy[]; openQuestions: string[]; sources: StatuteSource[]; keyDates: KeyDate[]; legalAid: Array<{ name: string; url: string }> }`
  - `buildContextBundle(config: StateRuleConfig): ContextBundle`
  - `assembleContextText(bundles: ContextBundle[]): string`
  - `interface Citation { label: string; url: string | null }`
  - `collectCitations(bundles: ContextBundle[]): Citation[]`
  - `collectLegalAid(bundles: ContextBundle[]): Array<{ name: string; url: string }>`
  - `type Tier = 'VERIFIED' | 'GENERAL' | 'BEYOND'`
  - `parseTierTag(raw: string): { tier: Tier; text: string }`
  - `interface AssistantAnswer { tier: Tier; text: string; citations: Citation[]; legalAid: Array<{ name: string; url: string }> }`
  - `deterministicFallbackAnswer(bundles: ContextBundle[], outOfScopeCodes: string[], message: string): AssistantAnswer`

- [ ] **Step 1: Write the failing tests**

```ts
// src/data/chatRetrieval.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/data/chatRetrieval.test.ts`
Expected: FAIL — cannot find module `./chatRetrieval`.

- [ ] **Step 3: Write the implementation**

```ts
// src/data/chatRetrieval.ts
import {
  fallbackRules,
  stateDirectory,
  nationalReferrals,
  type StateRuleConfig,
  type RuleResult,
  type StatuteSource,
  type KeyDate,
} from './fallbackRules';
import { isScreenable } from '../db/client';

export type Tier = 'VERIFIED' | 'GENERAL' | 'BEYOND';

/** States whose research is verified enough to speak to as law. Derived from the
 *  data so a newly verified state is automatically in scope — never hardcoded. */
export const VERIFIED_STATE_CODES: Set<string> = new Set(
  Object.values(fallbackRules)
    .filter(s => isScreenable(s.verificationStatus))
    .map(s => s.code),
);

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Which state(s) a question is about. Full state names are matched
 * case-insensitively (longest first, so "West Virginia" is consumed before
 * "Virginia" can match its tail); two-letter codes are matched ONLY as
 * standalone uppercase tokens in the original text, so the words "in"/"or"/"me"
 * are never mistaken for Indiana/Oregon/Maine. Falls back to the state the user
 * is currently viewing when nothing is named.
 */
export function detectStateCodes(message: string, currentStateCode: string | null): string[] {
  const found: string[] = [];
  let scan = ` ${message.toLowerCase()} `;
  const byLength = [...stateDirectory].sort((a, b) => b.name.length - a.name.length);
  for (const { code, name } of byLength) {
    const nameRe = new RegExp(`\\b${escapeRegex(name.toLowerCase())}\\b`);
    if (nameRe.test(scan)) {
      found.push(code);
      scan = scan.replace(nameRe, ' '.repeat(name.length));
    }
  }
  for (const { code } of stateDirectory) {
    if (found.includes(code)) continue;
    if (new RegExp(`\\b${code}\\b`).test(message)) found.push(code);
  }
  if (found.length === 0 && currentStateCode) return [currentStateCode.toUpperCase()];
  return found;
}

export interface BundleRemedy {
  name: string;
  formName: string | null;
  steps: string[];
  fees: string | null;
  feeWaiver: string | null;
  courtContact: string | null;
}

export interface ContextBundle {
  code: string;
  name: string;
  verified: boolean;
  terminology: string;
  results: RuleResult[];
  questions: string[];
  remedies: BundleRemedy[];
  openQuestions: string[];
  sources: StatuteSource[];
  keyDates: KeyDate[];
  legalAid: Array<{ name: string; url: string }>;
}

/** Flatten one state's verified config into the fields the assistant may use.
 *  Never contains model-derived law — only the curated, cited copy. */
export function buildContextBundle(config: StateRuleConfig): ContextBundle {
  return {
    code: config.code,
    name: config.name,
    verified: isScreenable(config.verificationStatus),
    terminology: config.terminology,
    results: Object.values(config.rules.results),
    questions: Object.values(config.rules.nodes).map(n => n.text),
    remedies: Object.values(config.resources.remedies).map(r => ({
      name: r.name,
      formName: r.formName,
      steps: r.steps,
      fees: r.fees,
      feeWaiver: r.feeWaiver,
      courtContact: r.courtContact,
    })),
    openQuestions: config.openQuestions.map(q => q.question),
    sources: config.sources,
    keyDates: config.keyDates,
    legalAid: config.resources.legalAid,
  };
}

const orUnknown = (v: string | null): string => (v && v.trim() ? v : 'not verified in our data');

/** Render bundles into a compact, delimited plain-text block for the LLM.
 *  Null fields are spelled out ("not verified in our data") — never omitted. */
export function assembleContextText(bundles: ContextBundle[]): string {
  if (bundles.length === 0) return 'No verified state data is in scope for this question.';
  return bundles
    .map(b => {
      const lines: string[] = [];
      lines.push(`=== ${b.name.toUpperCase()} (${b.verified ? 'verified' : 'not verified'}) ===`);
      lines.push(`What ${b.name} calls its remedies: ${orUnknown(b.terminology)}`);
      lines.push('Screening outcomes:');
      for (const r of b.results) {
        lines.push(`- [${r.status}] ${r.title}: ${r.message} (Citation: ${orUnknown(r.citation)})`);
      }
      if (b.remedies.length) {
        lines.push('Remedies:');
        for (const r of b.remedies) {
          lines.push(
            `- ${r.name} — form: ${orUnknown(r.formName)}; fees: ${orUnknown(r.fees)}; fee waiver: ${orUnknown(r.feeWaiver)}`,
          );
        }
      }
      if (b.openQuestions.length) {
        lines.push(`Open questions in our data (do not resolve these): ${b.openQuestions.join(' | ')}`);
      }
      if (b.sources.length) {
        lines.push(
          `Sources: ${b.sources.map(s => `${s.id}${s.url ? ` (${s.url})` : ''}`).join('; ')}`,
        );
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export interface Citation {
  label: string;
  url: string | null;
}

const dedupeBy = <T>(items: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
};

export function collectCitations(bundles: ContextBundle[]): Citation[] {
  const out: Citation[] = [];
  for (const b of bundles) {
    for (const r of b.results) if (r.citation) out.push({ label: r.citation, url: null });
    for (const s of b.sources) if (s.url) out.push({ label: s.id, url: s.url });
  }
  return dedupeBy(out, c => c.label);
}

export function collectLegalAid(bundles: ContextBundle[]): Array<{ name: string; url: string }> {
  const out = [...bundles.flatMap(b => b.legalAid), ...nationalReferrals];
  return dedupeBy(out, x => x.url);
}

export function parseTierTag(raw: string): { tier: Tier; text: string } {
  const tagRe = /^\s*\[\[TIER:(VERIFIED|GENERAL|BEYOND)\]\]\s*/i;
  const m = raw.match(tagRe);
  if (m) {
    return { tier: m[1].toUpperCase() as Tier, text: raw.replace(tagRe, '').trim() };
  }
  return { tier: 'GENERAL', text: raw.trim() };
}

export interface AssistantAnswer {
  tier: Tier;
  text: string;
  citations: Citation[];
  legalAid: Array<{ name: string; url: string }>;
}

/**
 * The safe floor when Groq is unavailable. With verified data in scope, returns
 * a templated, hedged VERIFIED answer built straight from the verified copy.
 * With nothing verified in scope, returns a BEYOND referral — it refers, it
 * never reasons. Zero invented law in either branch.
 */
export function deterministicFallbackAnswer(
  bundles: ContextBundle[],
  outOfScopeCodes: string[],
  _message: string,
): AssistantAnswer {
  const legalAid = collectLegalAid(bundles);
  if (bundles.length > 0) {
    const parts: string[] = [];
    for (const b of bundles) {
      const top = b.results.slice(0, 2);
      const body = top
        .map(r => `${r.title}: ${r.message}${r.citation ? ` (${r.citation})` : ''}`)
        .join(' ');
      parts.push(`Under ${b.name} law, here is what our verified rules say. ${body}`);
    }
    parts.push(
      'This is general screening information, not legal advice — a legal aid attorney or court clerk should confirm before you file.',
    );
    return { tier: 'VERIFIED', text: parts.join(' '), citations: collectCitations(bundles), legalAid };
  }
  const scope = outOfScopeCodes.length
    ? `We have not verified the law for ${outOfScopeCodes.join(', ')} yet, and questions that combine states are beyond what we can confirm. `
    : 'That is beyond what Turnleaf has verified. ';
  return {
    tier: 'BEYOND',
    text: `${scope}The safest next step is to talk to a legal aid attorney, who can look at your specific situation. Here are places to start.`,
    citations: [],
    legalAid,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/data/chatRetrieval.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Lint the new files**

Run: `npx eslint src/data/chatRetrieval.ts src/data/chatRetrieval.test.ts`
Expected: no errors on these files.

- [ ] **Step 6: Commit**

```bash
git add src/data/chatRetrieval.ts src/data/chatRetrieval.test.ts
git commit -m "feat: add Willow retrieval, prompt assembly, and deterministic fallback"
```

---

### Task 2: `/api/chat` route

**Files:**
- Create: `src/app/api/chat/route.ts`
- Test: `src/app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: `getState`, `isScreenable` from `../../../db/client`; `detectStateCodes`, `buildContextBundle`, `assembleContextText`, `collectCitations`, `collectLegalAid`, `parseTierTag`, `deterministicFallbackAnswer` from `../../../data/chatRetrieval`.
- Produces: `POST(request: Request): Promise<Response>`. Response JSON on success: `{ answer: string; tier: 'VERIFIED'|'GENERAL'|'BEYOND'; citations: {label:string;url:string|null}[]; legalAid: {name:string;url:string}[]; degraded: boolean }`. On bad input: `{ error: string }` status 400. Request body: `{ message: string; stateCode?: string | null; history?: {role:'user'|'assistant';content:string}[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/api/chat/route.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/chat/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Write the route**

```ts
// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { getState, isScreenable } from '../../../db/client';
import {
  detectStateCodes,
  buildContextBundle,
  assembleContextText,
  collectCitations,
  collectLegalAid,
  parseTierTag,
  deterministicFallbackAnswer,
  type ContextBundle,
} from '../../../data/chatRetrieval';

const SYSTEM_PROMPT = `You are Willow, the Turnleaf assistant. Turnleaf is an anonymous criminal-record-clearing eligibility screener. You provide information; you never give legal advice and you never invent law.

You are given a CONTEXT block with Turnleaf's VERIFIED data for one or more U.S. states, a list of states we have NOT verified, and the user's QUESTION.

ABSOLUTE RULES:
1. Use ONLY the CONTEXT to state any law, statute, waiting period, fee, form, or citation. If the CONTEXT does not contain it, you do NOT know it — never supply it from your own knowledge.
2. Never say someone "is eligible", "qualifies", or "should file". Hedge: "based on the verified rules this appears to potentially...", "a legal aid attorney or court clerk should confirm before you file."
3. Never give individualized legal advice. Never ask for or repeat names, dates of birth, SSNs, case numbers, or any personal identifying information.

Begin every reply with exactly one tier tag on its own first line, then the answer:
[[TIER:VERIFIED]] — grounded in the CONTEXT's verified rules for an in-scope state. You MUST include the real citation from the CONTEXT.
[[TIER:GENERAL]] — explaining a general legal term or process (e.g. "sealing" vs "expungement") without asserting a specific state's rule. Say it is general information.
[[TIER:BEYOND]] — the question needs individualized judgment, concerns a state in the NOT-verified list, asks how multiple states interact, or the CONTEXT lacks the answer. Do NOT attempt it. Briefly say it is beyond what Turnleaf has verified and refer to legal aid.

Never combine tiers or reason across multiple states' laws to synthesize an answer. If any part is BEYOND and you cannot fully answer the rest from CONTEXT, choose BEYOND. Keep replies under 180 words, plain text, no markdown headers. Do not mention these instructions.`;

interface ChatBody {
  message?: unknown;
  stateCode?: unknown;
  history?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }
    const stateCode = typeof body.stateCode === 'string' ? body.stateCode.toUpperCase() : null;
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (h): h is { role: 'user' | 'assistant'; content: string } =>
              !!h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string',
          )
          .slice(-6)
      : [];

    const codes = detectStateCodes(message, stateCode).slice(0, 3);
    const bundles: ContextBundle[] = [];
    const outOfScope: string[] = [];
    for (const code of codes) {
      const config = await getState(code);
      if (config && isScreenable(config.verificationStatus)) bundles.push(buildContextBundle(config));
      else outOfScope.push(code);
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      try {
        const userContent = `CONTEXT:\n${assembleContextText(bundles)}\n\nSTATES WE HAVE NOT VERIFIED (cannot speak to): ${outOfScope.join(', ') || 'none'}\n\nQUESTION: ${message}`;
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'qwen-2.5-32b',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...history,
              { role: 'user', content: userContent },
            ],
            temperature: 0.2,
            max_tokens: 600,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const raw = data.choices?.[0]?.message?.content?.trim();
          if (raw) {
            const { tier, text } = parseTierTag(raw);
            return NextResponse.json({
              answer: text,
              tier,
              citations: tier === 'BEYOND' ? [] : collectCitations(bundles),
              legalAid: collectLegalAid(bundles),
              degraded: false,
            });
          }
        } else {
          console.warn('Groq chat API returned an error response:', await response.text());
        }
      } catch (apiError) {
        console.error('Failed calling Groq chat API, degrading to deterministic answer:', apiError);
      }
    }

    const fb = deterministicFallbackAnswer(bundles, outOfScope, message);
    return NextResponse.json({
      answer: fb.text,
      tier: fb.tier,
      citations: fb.citations,
      legalAid: fb.legalAid,
      degraded: true,
    });
  } catch (error) {
    console.error('API chat route error:', error);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/chat/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint the new files**

Run: `npx eslint src/app/api/chat/route.ts src/app/api/chat/route.test.ts`
Expected: no errors on these files.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/chat/route.ts src/app/api/chat/route.test.ts
git commit -m "feat: add /api/chat route with Groq generation and deterministic fallback"
```

---

### Task 3: Willow assets + context provider

**Files:**
- Create: `public/willow/welcoming.png`, `public/willow/thinking.png`, `public/willow/explaining.png`, `public/willow/empathetic.png` (copied from `C:\Users\Diana\Desktop\Willow`)
- Create: `src/components/AssistantContext.tsx`

**Interfaces:**
- Produces:
  - `type WillowScreen = 'landing' | 'selector' | 'loading' | 'coming-soon' | 'wizard' | 'results'`
  - `interface ScreenContextValue { selectedStateCode: string | null; stateName: string | null; screen: WillowScreen }`
  - `AssistantProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `useAssistantScreen(): ScreenContextValue`
  - `usePublishScreen(): (next: ScreenContextValue) => void`
- Consumes (later, at runtime): `AssistantWidget` from `./AssistantWidget` (created in Task 4). To keep Task 3 independently buildable, this task creates a **temporary stub** widget; Task 4 replaces it.

- [ ] **Step 1: Copy the four expression portraits into `public/willow/` (lowercased names)**

Run (Git Bash):
```bash
mkdir -p public/willow
cp "/c/Users/Diana/Desktop/Willow/Welcoming.png"  public/willow/welcoming.png
cp "/c/Users/Diana/Desktop/Willow/Thinking.png"   public/willow/thinking.png
cp "/c/Users/Diana/Desktop/Willow/Explaining.png" public/willow/explaining.png
cp "/c/Users/Diana/Desktop/Willow/Empathetic.png" public/willow/empathetic.png
ls public/willow
```
Expected: the four `.png` files listed.

- [ ] **Step 2: Create a temporary widget stub so the provider compiles**

```tsx
// src/components/AssistantWidget.tsx  (STUB — replaced in Task 4)
"use client";
export default function AssistantWidget() {
  return null;
}
```

- [ ] **Step 3: Write the context provider**

```tsx
// src/components/AssistantContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import AssistantWidget from './AssistantWidget';

export type WillowScreen = 'landing' | 'selector' | 'loading' | 'coming-soon' | 'wizard' | 'results';

export interface ScreenContextValue {
  selectedStateCode: string | null;
  stateName: string | null;
  screen: WillowScreen;
}

const DEFAULT_SCREEN: ScreenContextValue = {
  selectedStateCode: null,
  stateName: null,
  screen: 'landing',
};

interface AssistantContextShape {
  screen: ScreenContextValue;
  publish: (next: ScreenContextValue) => void;
}

const AssistantScreenContext = createContext<AssistantContextShape | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenContextValue>(DEFAULT_SCREEN);
  const publish = useCallback((next: ScreenContextValue) => setScreen(next), []);
  return (
    <AssistantScreenContext.Provider value={{ screen, publish }}>
      {children}
      <AssistantWidget />
    </AssistantScreenContext.Provider>
  );
}

export function useAssistantScreen(): ScreenContextValue {
  return useContext(AssistantScreenContext)?.screen ?? DEFAULT_SCREEN;
}

export function usePublishScreen(): (next: ScreenContextValue) => void {
  const ctx = useContext(AssistantScreenContext);
  return ctx?.publish ?? (() => {});
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (the stub widget renders nothing; provider is unused until Task 5, so nothing changes visually yet).

- [ ] **Step 5: Lint the new file**

Run: `npx eslint src/components/AssistantContext.tsx src/components/AssistantWidget.tsx`
Expected: no errors on these files.

- [ ] **Step 6: Commit**

```bash
git add public/willow src/components/AssistantContext.tsx src/components/AssistantWidget.tsx
git commit -m "feat: add Willow assets and assistant context provider (widget stub)"
```

---

### Task 4: Willow chat widget

**Files:**
- Modify (replace stub): `src/components/AssistantWidget.tsx`

**Interfaces:**
- Consumes: `useAssistantScreen` from `./AssistantContext`; posts to `/api/chat`; expects the response shape from Task 2 (`{ answer, tier, citations, legalAid, degraded }`).
- Produces: default-exported client component `AssistantWidget`.

- [ ] **Step 1: Write the widget**

```tsx
// src/components/AssistantWidget.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ShieldCheck, Info, Scale, ExternalLink } from 'lucide-react';
import { useAssistantScreen } from './AssistantContext';

type Tier = 'VERIFIED' | 'GENERAL' | 'BEYOND';
interface Citation { label: string; url: string | null }
interface LegalAid { name: string; url: string }

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  tier?: Tier;
  citations?: Citation[];
  legalAid?: LegalAid[];
}

type WidgetState = 'welcoming' | 'thinking' | 'explaining' | 'empathetic';

const FACE: Record<WidgetState, string> = {
  welcoming: '/willow/welcoming.png',
  thinking: '/willow/thinking.png',
  explaining: '/willow/explaining.png',
  empathetic: '/willow/empathetic.png',
};

const TIER_BADGE: Record<Tier, { label: string; sub: string; Icon: typeof ShieldCheck; color: string; bg: string }> = {
  VERIFIED: { label: 'Verified law', sub: 'Grounded in verified statute data', Icon: ShieldCheck, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  GENERAL: { label: 'General info', sub: 'General process or terminology', Icon: Info, color: '#2563EB', bg: '#EAF1FE' },
  BEYOND: { label: "Beyond what's verified", sub: 'Needs legal help or outside our scope', Icon: Scale, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
};

const GREETING: AssistantMessage = {
  role: 'assistant',
  tier: 'GENERAL',
  content:
    "Hi, I'm Willow. I can explain Turnleaf's verified rules for the states we've checked, in plain language. I share information, not legal advice — and I'll point you to a real person for anything I can't confirm.",
};

export default function AssistantWidget() {
  const { selectedStateCode, stateName } = useAssistantScreen();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const face: WidgetState = loading
    ? 'thinking'
    : lastAssistant?.tier === 'BEYOND'
      ? 'empathetic'
      : lastAssistant && messages.length > 1
        ? 'explaining'
        : 'welcoming';

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, stateCode: selectedStateCode, history }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? "Sorry — something went wrong. Please try again, or reach out to legal aid.",
          tier: (data.tier as Tier) ?? 'GENERAL',
          citations: data.citations ?? [],
          legalAid: data.legalAid ?? [],
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          tier: 'BEYOND',
          content: "I couldn't reach the server just now. For anything time-sensitive, please contact a legal aid office directly.",
          legalAid: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        aria-label="Open Willow, the Turnleaf assistant"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
          borderRadius: '50px', padding: '0.6rem 1.1rem 0.6rem 0.6rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 32px rgba(77, 124, 89, 0.35)',
        }}
      >
        <img src="/willow/welcoming.png" alt="" width={36} height={36}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-primary-light)' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MessageCircle size={16} /> Ask Willow
        </span>
      </button>
    );
  }

  return (
    <div
      className="glass-card animate-slide-up"
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
        width: 'min(370px, calc(100vw - 2rem))', maxHeight: '70vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-card-border)' }}>
        <img src={FACE[face]} alt="Willow" width={40} height={40}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-primary-light)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 600, color: 'var(--color-text)' }}>Willow</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>Turnleaf Assistant</div>
        </div>
        <button aria-label="Close assistant" onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      {/* Persistent, non-dismissible disclaimer */}
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-card-border)' }}>
        General information, not legal advice. Confirm with a legal aid attorney or court clerk before filing.
      </div>

      {/* Context chip */}
      {stateName && (
        <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'var(--color-primary-dark)' }}>
          Answering for <strong>{stateName}</strong>
        </div>
      )}

      {/* Message list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-primary)', color: '#FAF9F5', borderRadius: '14px 14px 2px 14px', padding: '0.55rem 0.8rem', fontSize: '0.9rem' }}>
              {m.content}
            </div>
          ) : (
            <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {m.tier && (() => {
                const b = TIER_BADGE[m.tier];
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'flex-start', background: b.bg, color: b.color, borderRadius: '9999px', padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700 }}>
                    <b.Icon size={13} /> {b.label}
                  </span>
                );
              })()}
              <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: '2px 14px 14px 14px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                {m.content}
                {m.citations && m.citations.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {m.citations.map((c, j) => c.url ? (
                      <a key={j} href={c.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        {c.label} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span key={j} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{c.label}</span>
                    ))}
                  </div>
                )}
                {m.legalAid && m.legalAid.length > 0 && m.tier === 'BEYOND' && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {m.legalAid.map((la, j) => (
                      <a key={j} href={la.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <ExternalLink size={12} /> {la.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Willow is thinking…</div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-card-border)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask about the verified rules…"
          className="input-field"
          style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem 0.7rem', borderRadius: '10px', border: '1px solid var(--color-card-border)', background: 'var(--color-card-bg)', color: 'var(--color-text)' }}
        />
        <button aria-label="Send" onClick={send} disabled={loading || !input.trim()} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', borderRadius: '10px' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. (If any imported `lucide-react` icon name is not exported by the installed version, the build error names it — swap for an available equivalent, e.g. `Scale` → `Gavel`, and note the swap.)

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/components/AssistantWidget.tsx`
Expected: no errors on this file.

- [ ] **Step 4: Commit**

```bash
git add src/components/AssistantWidget.tsx
git commit -m "feat: build the Willow chat widget UI"
```

---

### Task 5: Mount the provider and publish screen context

**Files:**
- Modify: `src/app/layout.tsx` (wrap `{children}`)
- Modify: `src/app/page.tsx` (publish context; move the Demo Panel button)

**Interfaces:**
- Consumes: `AssistantProvider`, `usePublishScreen`, `ScreenContextValue`, `WillowScreen` from `../components/AssistantContext`.

- [ ] **Step 1: Wrap children in the provider in `layout.tsx`**

Add the import at the top (after `import './globals.css';`):
```tsx
import { AssistantProvider } from '../components/AssistantContext';
```
Change the `<main>` block from:
```tsx
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
```
to:
```tsx
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AssistantProvider>{children}</AssistantProvider>
        </main>
```

- [ ] **Step 2: In `page.tsx`, import the publisher and move the Demo button**

Add to the existing `../components/...` imports:
```tsx
import { usePublishScreen, type WillowScreen } from '../components/AssistantContext';
```
Change the Demo Panel button's inline style `bottom: '2rem'` to `bottom: '6.5rem'` so it stacks above Willow's launcher (which owns `bottom: 2rem`). Add a short comment:
```tsx
          // Stacked above the Willow launcher, which owns the bottom-right corner.
          bottom: '6.5rem',
          right: '2rem',
```

- [ ] **Step 3: Publish the current screen + state to the assistant context**

Inside `Home`, after `const isOpeningState = ...` and the `onLanding` declaration are both available, add:
```tsx
  const publishScreen = usePublishScreen();
  useEffect(() => {
    const screen: WillowScreen = onLanding
      ? 'landing'
      : isOpeningState
        ? 'loading'
        : comingSoon
          ? 'coming-soon'
          : stateConfig
            ? (results ? 'results' : 'wizard')
            : 'selector';
    const stateName =
      stateConfig?.name ?? states.find(s => s.code === selectedStateCode)?.name ?? null;
    publishScreen({ selectedStateCode, stateName, screen });
  }, [onLanding, isOpeningState, comingSoon, stateConfig, results, selectedStateCode, states, publishScreen]);
```
(Place it after line ~161 where `onLanding` is defined, alongside the existing `has-photo-bg` effect.)

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Lint the changed files**

Run: `npx eslint src/app/layout.tsx src/app/page.tsx`
Expected: no NEW errors introduced by these edits (pre-existing repo noise may remain; nothing new from the added lines).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — existing suites plus the two new ones from Tasks 1–2.

- [ ] **Step 7: Manual end-to-end verification**

With `GROQ_API_KEY` set, run `npm run dev` and check:
1. Willow launcher sits bottom-right; the Demo Panel button sits just above it — no overlap. Panel opens above the header.
2. On a verified state (e.g. California), ask "Can I clear a misdemeanor?" → **Verified law** badge, a real citation, hedged wording; the "Answering for California" chip shows.
3. Ask "What if I have convictions in two states?" → **Beyond what's verified** badge, referral to legal aid, no synthesized answer.
4. Ask "What's the difference between sealing and expungement?" → **General info** badge.
5. Ask "Should I file?" → hedged / general, never "yes, you should."
6. Toggle OS dark mode → panel, badges, and disclaimer remain legible.

Then stop the server, unset `GROQ_API_KEY`, `npm run dev` again, and repeat 2–3 → answers still come back with correct tiers and citations (deterministic fallback); no crash.

- [ ] **Step 8: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: mount Willow globally and publish screen context"
```

---

## Verification (whole feature)

- `npm test` green (retrieval + route unit tests, plus the existing suite).
- `npm run build` green.
- `npx eslint` clean on every new/changed file.
- Manual flow (Task 5, Step 7) passes with and without `GROQ_API_KEY`, in light and dark mode.
- Anonymity audit: grep `src/app/api/chat/route.ts` — confirm no `console.log`/persistence of `message` or `history`; no DB writes; conversation state exists only in `AssistantWidget`.
- Doctrine spot-check: on a verified state, every "Verified law" answer shows a citation; every out-of-scope/cross-state question lands on "Beyond what's verified" and refers out — never an invented rule.

## Notes / risks

- **Model grounding is the top doctrine risk.** Mitigated by the context-only system prompt, low temperature, the tier tag, and the deterministic fallback floor. Optional future hardening (not in this plan): a server-side guard that downgrades the tier if the model emits a statute-looking token absent from the assembled context.
- **`lucide-react` icon names:** if the installed version lacks `Scale`, the Task 4 build step will name it; swap for an available icon (e.g. `Gavel`) and keep the amber styling.
- **Court-finder referral URLs** are a separate follow-on (Diana verifies each official URL; never constructed). Willow works today on `legalAid` + `nationalReferrals`.
- **Portrait backgrounds:** the provided portraits have white backgrounds; transparent versions would sit more cleanly on the frosted panel but are not required to ship.

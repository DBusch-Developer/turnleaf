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
  hasUnsupportedCitation,
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
            // Backstop: a VERIFIED answer that cites a statute we never put in the
            // context is an invented citation — discard it and use the grounded
            // deterministic answer instead. (Doctrine: never present invented law
            // as verified.)
            if (tier === 'VERIFIED' && hasUnsupportedCitation(text, bundles)) {
              console.warn('Willow: discarded a VERIFIED answer citing statutes outside the provided context.');
              const fb = deterministicFallbackAnswer(bundles, outOfScope, message);
              return NextResponse.json({ answer: fb.text, tier: fb.tier, citations: fb.citations, legalAid: fb.legalAid, degraded: true });
            }
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

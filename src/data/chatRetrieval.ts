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

/** Two-letter state codes that double as common English words/interjections
 *  (e.g. "OK", "HI"). Excluded from the standalone-code match only — the full
 *  state name still matches normally, so "Oklahoma" is unaffected. */
const CODE_MATCH_EXCLUSIONS: Set<string> = new Set([
  'OK', 'HI', 'IN', 'OR', 'ME', 'LA', 'OH', 'CO', 'ID', 'AL', 'PA',
]);

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
    if (CODE_MATCH_EXCLUSIONS.has(code)) continue;
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
            `- ${r.name} — form: ${orUnknown(r.formName)}; fees: ${orUnknown(r.fees)}; fee waiver: ${orUnknown(r.feeWaiver)}; court contact: ${orUnknown(r.courtContact)}`,
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
      if (b.keyDates.length) {
        lines.push(
          `Key dates: ${b.keyDates
            .map(d => `${d.label}: ${d.date} (${d.kind})${d.note ? ` — ${d.note}` : ''}`)
            .join('; ')}`,
        );
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

// A statute-number token: digits with optional . : / - separators, optional trailing letter.
// Matches 1203.4, 2953.32, 160.59, 651:5, 2630/5.2, 13-911 as single tokens. The
// trailing [a-z]? binds to the FIRST digit group it can reach, so a token like
// "23A-27-13" does NOT match as one token — it fragments into "23a" and "27-13"
// (the "-" before "27" cannot chain onto "23a" since a letter already closed
// that match). Parenthesized subsections (e.g. "1192.7(c)") normalize down to
// their base number ("1192.7"), since "(c)" isn't part of the digit run — a
// known coarseness of this backstop, acceptable for a defense-in-depth guard.
const STATUTE_NUM_RE = /\d+(?:[.:/-]\d+)*[a-z]?/gi;

const normalizeNum = (s: string): string => s.toLowerCase().replace(/[.:/-]+$/, '');

/** Every statute-number token that appears in a bundle's VERIFIED grounding —
 *  result copy/citations, remedies, terminology, node text, key dates, open
 *  questions, and ONLY human-linked (verified) sources. Unlinked sources
 *  (url === null) are unverified citations and are deliberately excluded, so a
 *  VERIFIED answer resting on one is caught as unsupported. */
export function contextStatuteNumbers(bundles: ContextBundle[]): Set<string> {
  const set = new Set<string>();
  const add = (s: string | null | undefined): void => {
    if (!s) return;
    for (const m of s.matchAll(STATUTE_NUM_RE)) set.add(normalizeNum(m[0]));
  };
  for (const b of bundles) {
    add(b.terminology);
    for (const r of b.results) { add(r.title); add(r.message); add(r.remedy); add(r.citation); }
    for (const r of b.remedies) { add(r.name); add(r.formName); add(r.fees); add(r.feeWaiver); add(r.courtContact); }
    for (const q of b.openQuestions) add(q);
    for (const k of b.keyDates) { add(k.label); add(k.date); add(k.note); }
    for (const q of b.questions) add(q);
    for (const s of b.sources) if (s.url) add(s.id); // linked = human-verified only
  }
  return set;
}

// A statute number is only treated as a CITATION when it follows a citation cue
// (a section symbol, or a word/abbreviation like section(s) / code(s) / R.C. /
// C.P.L. / P.C. / RSA / ILCS / chapter(s) / article(s) / statute(s)). This is
// what keeps "2 years" and "$50" from being read as citations.
const CITED_NUM_RE =
  /(?:§\s*|\b(?:sections?|secs?|codes?|chapters?|chs?|articles?|arts?|statutes?|stats?|r\.?c|c\.?p\.?l|p\.?c|rsa|ilcs)\.?\s+(?:§\s*)?)(\d+(?:[.:/-]\d+)*[a-z]?)/gi;

/** The statute numbers the answer actually cites (number following a citation cue). */
export function citedStatuteNumbers(answer: string): string[] {
  const out: string[] = [];
  for (const m of answer.matchAll(CITED_NUM_RE)) out.push(normalizeNum(m[1]));
  return out;
}

/** True when the answer cites a statute number that is absent from the context
 *  we gave the model — i.e. the model invented a citation. Empty bundles → treat
 *  any cited statute as unsupported (a VERIFIED claim with no context to stand on). */
export function hasUnsupportedCitation(answer: string, bundles: ContextBundle[]): boolean {
  const cited = citedStatuteNumbers(answer);
  if (cited.length === 0) return false;
  const allowed = contextStatuteNumbers(bundles);
  return cited.some(n => n.length > 0 && !allowed.has(n));
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
  const verified = bundles.filter(b => b.verified);
  if (verified.length > 0) {
    const parts: string[] = [];
    for (const b of verified) {
      const top = b.results.slice(0, 2);
      const body = top
        .map(r => `${r.title}: ${r.message}${r.citation ? ` (${r.citation})` : ''}`)
        .join(' ');
      parts.push(`Under ${b.name} law, here is what our verified rules say. ${body}`);
    }
    parts.push(
      'This is general screening information, not legal advice — a legal aid attorney or court clerk should confirm before you file.',
    );
    return {
      tier: 'VERIFIED',
      text: parts.join(' '),
      citations: collectCitations(verified),
      legalAid: collectLegalAid(verified),
    };
  }
  const legalAid = collectLegalAid(bundles);
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

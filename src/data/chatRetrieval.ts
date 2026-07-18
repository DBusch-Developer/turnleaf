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

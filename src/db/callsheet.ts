// ============================================================================
// CALL SHEET GENERATOR — `npm run callsheet -- <session|state>`
//
//   npm run callsheet -- 0        one sheet for call session 0 (= Wave 0)
//   npm run callsheet -- AZ       one sheet for whatever session AZ is in
//
// Writes research/callsheets/generated/session<N>.md — ONE complete sheet per
// session. NEVER edit that file by hand; it is overwritten on every run. Change
// the inputs and regenerate; after answers are logged and questions closed,
// regenerating shows what is still open.
//
// Two inputs are merged into each sheet:
//   - the LIVE rules data (status, key dates, open questions + what they block),
//     which auto-updates as states get verified; and
//   - src/db/callContacts.ts — the human half: real phone numbers, timezone call
//     windows, confirm-don't-ask scripts, and session targets. Edit contacts and
//     scripts THERE, not in the generated file. Re-verified a number? Update it
//     in callContacts.ts and regenerate.
//
// This replaced the old split between a generated questions-sheet and the
// hand-written Turnleaf_Call_Sheet_Session<N>.md sheets (retired 2026-07-22,
// their content migrated verbatim into callContacts.ts) — so you dial from one
// sheet, not two.
//
// Session N = Wave N. The session is derived from each state's sourcePackage;
// it is not stored per question (see OpenQuestion.session).
//
// Source of truth is the database when DATABASE_URL is set, and fallbackRules
// otherwise — the same degradation path the app uses. Both should agree; if
// they don't, the seed is stale.
// ============================================================================

import { getState } from './client';
import {
  fallbackRules,
  sessionOf,
  sessionOfQuestion,
  type StateRuleConfig,
} from '../data/fallbackRules';
import { callPlans, type StateCallPlan } from './callContacts';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OUT_DIR = path.resolve(process.cwd(), 'research/callsheets/generated');

/** Human-researched contacts: real numbers, emails, sites (from callContacts.ts). */
function planContactLines(plan: StateCallPlan): string[] {
  return plan.contacts.map(c => {
    const bits = [c.phone, c.email, c.note].filter(Boolean).join(' · ');
    return `- **${c.label}**${bits ? ` — ${bits}` : ''}`;
  });
}

/** Where-to-file roles and legal aid, from the rules data. */
function dataContactLines(config: StateRuleConfig): string[] {
  const lines: string[] = [];
  for (const remedy of Object.values(config.resources.remedies)) {
    lines.push(remedy.courtContact
      ? `- **${remedy.name}** — ${remedy.courtContact}`
      : `- **${remedy.name}** — where to file is NOT YET VERIFIED`);
  }
  for (const aid of config.resources.legalAid) {
    lines.push(`- ${aid.name} — ${aid.url}`);
  }
  return lines;
}

function renderState(
  config: StateRuleConfig,
  index: number,
  questions: StateRuleConfig['openQuestions'],
  plan?: StateCallPlan,
): string {
  const out: string[] = [];
  const window = plan?.window ? ` — ${plan.window}` : '';
  out.push(`## ${index}. ${config.name.toUpperCase()} (${config.code})${window}`);
  out.push('');
  if (plan?.headline) {
    out.push(`*${plan.headline}*`);
    out.push('');
  }
  out.push(`**Status:** \`${config.verificationStatus}\` · reviewed ${config.lastReviewed} · from \`${config.sourcePackage}\``);
  out.push('');

  out.push('**Call:**');
  if (plan?.contacts.length) out.push(...planContactLines(plan));
  out.push(...dataContactLines(config));
  out.push('');

  if (config.keyDates.length) {
    out.push('**Dates that govern:**');
    for (const kd of config.keyDates) {
      out.push(`- ${kd.date} — ${kd.label} (${kd.kind})${kd.note ? ` · ${kd.note}` : ''}`);
    }
    out.push('');
  }

  if (questions.length) {
    out.push(`**Verify — ${questions.length} open question${questions.length === 1 ? '' : 's'}. Each answer closes a numbered question in the database:**`);
    out.push('');
    questions.forEach((q, i) => {
      out.push(`${i + 1}. ${q.question}`);
      if (q.blocksFields.length) {
        out.push(`   - *Blocks (null until answered):* ${q.blocksFields.map(f => `\`${f}\``).join(', ')}`);
      } else {
        out.push('   - *Blocks no single field — affects a branch or wording.*');
      }
    });
    out.push('');
  } else {
    out.push('**Verify:** nothing open in the data. Every tracked question on this state is closed.');
    out.push('');
  }

  if (plan?.ask?.length) {
    out.push('**On the call (your research — confirm-don\'t-ask phrasing, watch-fors):**');
    for (const a of plan.ask) out.push(`- ${a}`);
    out.push('');
  }

  return out.join('\n');
}

function renderSession(session: number, states: StateRuleConfig[]): string {
  const codes = states.map(s => s.code).join(' · ');
  const totalOpen = states.reduce((n, s) => n + s.openQuestions.length, 0);
  const plan = callPlans[session];
  const byCode = plan?.states ?? {};

  const out: string[] = [];
  out.push(`# Turnleaf — Call Session ${session} (Wave ${session}: ${codes})`);
  out.push('');
  if (plan?.subtitle) {
    out.push(`_${plan.subtitle}_`);
    out.push('');
  }
  out.push('> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- ' + session + '`.');
  out.push('> Contacts & scripts live in `src/db/callContacts.ts`; status & open questions come from the rules data.');
  out.push('');
  out.push(`**${totalOpen} open question${totalOpen === 1 ? '' : 's'} across ${states.length} state${states.length === 1 ? '' : 's'}.**`);
  out.push('');
  if (plan?.intro?.length) {
    out.push(...plan.intro);
    out.push('');
  }
  out.push('---');
  out.push('');

  states.forEach((s, i) => {
    out.push(renderState(s, i + 1, s.openQuestions, byCode[s.code]));
    out.push('---');
    out.push('');
  });

  if (plan?.targets?.length) {
    out.push('## Session targets');
    out.push('');
    for (const t of plan.targets) out.push(`- ${t}`);
    out.push('');
  }

  out.push('## After the calls');
  out.push('');
  out.push('For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open. Re-verified a phone number? Update it in `src/db/callContacts.ts`.');
  out.push('');
  out.push('A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.');
  out.push('');
  if (plan?.standing) {
    out.push(`_${plan.standing}_`);
    out.push('');
  }
  return out.join('\n');
}

/** Load a state from the DB if configured, else from fallbackRules. */
async function load(code: string): Promise<StateRuleConfig | null> {
  return (await getState(code)) ?? fallbackRules[code] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target) {
    console.error('Usage: npm run callsheet -- <session|state>');
    console.error('  npm run callsheet -- 0');
    console.error('  npm run callsheet -- AZ');
    process.exit(1);
  }

  // Resolve the target to a session number. A state argument resolves to
  // whichever session its wave puts it in.
  let session: number | null;
  if (/^\d+$/.test(target)) {
    session = Number(target);
  } else {
    const config = await load(target.toUpperCase());
    if (!config) {
      console.error(`No researched rules for '${target}'. Nothing to call about yet.`);
      process.exit(1);
    }
    session = sessionOf(config);
    if (session === null) {
      console.error(`${config.code}'s sourcePackage ('${config.sourcePackage}') names no wave, so it maps to no session.`);
      process.exit(1);
    }
  }

  // Every state whose wave is this session.
  const states: StateRuleConfig[] = [];
  for (const code of Object.keys(fallbackRules)) {
    const config = await load(code);
    if (config && sessionOf(config) === session) states.push(config);
  }
  states.sort((a, b) => a.code.localeCompare(b.code));

  if (!states.length) {
    console.error(`No states are in session ${session} (i.e. sourced from Wave ${session}).`);
    process.exit(1);
  }

  // Questions explicitly moved INTO this session from a state whose own wave is
  // a different session.
  //
  // Compare by CODE, not object identity: load() returns a fresh object from the
  // database on every call, so an identity check silently matches nothing and
  // re-adds every state that is already here — duplicating each state and
  // double-counting every open question. That is exactly what it did once the
  // database was migrated and load() stopped returning the fallbackRules
  // singleton.
  const already = new Set(states.map(s => s.code));
  for (const code of Object.keys(fallbackRules)) {
    if (already.has(code.toUpperCase())) continue;
    const config = await load(code);
    if (!config) continue;
    const moved = config.openQuestions.filter(q => sessionOfQuestion(config, q) === session);
    if (moved.length) states.push({ ...config, openQuestions: moved });
  }

  const markdown = renderSession(session, states);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `session${session}.md`);
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`Wrote ${outPath} — ${states.length} state(s), ${states.reduce((n, s) => n + s.openQuestions.length, 0)} open question(s).`);
}

main().catch(err => {
  console.error('Call sheet generation failed:', err);
  process.exit(1);
});

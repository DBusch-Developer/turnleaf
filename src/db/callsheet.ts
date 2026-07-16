// ============================================================================
// CALL SHEET GENERATOR — `npm run callsheet -- <session|state>`
//
//   npm run callsheet -- 0        one sheet for call session 0 (= Wave 0)
//   npm run callsheet -- AZ       one sheet for whatever session AZ is in
//   npm run callsheet -- 0 --diff print a diff against the hand-written sheet
//                                 instead of writing anything
//
// Writes research/callsheets/generated/session<N>.md. NEVER edit that file by
// hand — it is overwritten on every run. Change the data and regenerate; after
// call answers are logged and questions closed, regenerating shows what is
// still open.
//
// The hand-written research/callsheets/Turnleaf_Call_Sheet_Session<N>.md sheets
// are frozen reference. They hold things this generator cannot know — phone
// numbers, timezone plans, confirm-don't-ask phrasing, session targets — see
// "What this cannot generate" below.
//
// BACKLOG — contacts belong in the schema, but only after Session 0 runs.
// The hand sheets carry real phone numbers with verified-on dates ("(602)
// 372-5375 · verified 7/15 on lacourt.org"). Nothing in StateRuleConfig can
// hold that: courtContact is a role, legalAid is name+url, and only
// StatuteSource has a retrievedOn. Session 0 is what produces confirmed numbers
// and dates, so the schema should be born holding that call's output rather
// than guessing at its shape first.
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
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OUT_DIR = path.resolve(process.cwd(), 'research/callsheets/generated');
const HAND_DIR = path.resolve(process.cwd(), 'research/callsheets');

/** Contacts we hold for a state. See the caveat in the generated header. */
function contactsOf(config: StateRuleConfig): string[] {
  const lines: string[] = [];

  for (const [key, remedy] of Object.entries(config.resources.remedies)) {
    if (remedy.courtContact) {
      lines.push(`- **${remedy.name}** — ${remedy.courtContact}`);
    } else {
      lines.push(`- **${remedy.name}** — where to file is NOT YET VERIFIED`);
    }
  }
  for (const aid of config.resources.legalAid) {
    lines.push(`- ${aid.name} — ${aid.url}`);
  }
  return lines;
}

function renderState(config: StateRuleConfig, index: number, questions: StateRuleConfig['openQuestions']): string {
  const out: string[] = [];
  out.push(`## ${index}. ${config.name.toUpperCase()} (${config.code})`);
  out.push('');
  out.push(`**Status:** \`${config.verificationStatus}\` · reviewed ${config.lastReviewed} · from \`${config.sourcePackage}\``);
  out.push('');

  out.push('**Contacts (from the data — no phone numbers are stored; see header):**');
  out.push(...contactsOf(config));
  out.push('');

  if (config.keyDates.length) {
    out.push('**Dates that govern:**');
    for (const kd of config.keyDates) {
      out.push(`- ${kd.date} — ${kd.label} (${kd.kind})${kd.note ? ` · ${kd.note}` : ''}`);
    }
    out.push('');
  }

  if (!questions.length) {
    out.push('**Verify:** nothing open. Every question on this state is closed.');
    out.push('');
    return out.join('\n');
  }

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
  return out.join('\n');
}

function renderSession(session: number, states: StateRuleConfig[]): string {
  const codes = states.map(s => s.code).join(' · ');
  const totalOpen = states.reduce((n, s) => n + s.openQuestions.length, 0);

  const out: string[] = [];
  out.push(`# Turnleaf — Call Session ${session} (Wave ${session}: ${codes})`);
  out.push('');
  out.push('> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- ' + session + '`.');
  out.push('> Source: the states database (or fallbackRules when no DATABASE_URL).');
  out.push('');
  out.push(`**${totalOpen} open question${totalOpen === 1 ? '' : 's'} across ${states.length} state${states.length === 1 ? '' : 's'}.**`);
  out.push('');
  out.push('**What this cannot generate** — the hand-written sheet is still the one you call from:');
  out.push('- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.');
  out.push('- **Timezone plans, call order, session targets, and confirm-don\'t-ask phrasing.** None of it is in the data model.');
  out.push('- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.');
  out.push('');
  out.push('This sheet is authoritative for one thing only: **what is still open, and what it blocks.**');
  out.push('');
  out.push('---');
  out.push('');

  states.forEach((s, i) => {
    out.push(renderState(s, i + 1, s.openQuestions));
    out.push('---');
    out.push('');
  });

  out.push('## After the calls');
  out.push('');
  out.push('For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.');
  out.push('');
  out.push('A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.');
  out.push('');
  return out.join('\n');
}

/** Load a state from the DB if configured, else from fallbackRules. */
async function load(code: string): Promise<StateRuleConfig | null> {
  return (await getState(code)) ?? fallbackRules[code] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const diffMode = args.includes('--diff');
  const target = args.find(a => a !== '--diff');

  if (!target) {
    console.error('Usage: npm run callsheet -- <session|state> [--diff]');
    console.error('  npm run callsheet -- 0');
    console.error('  npm run callsheet -- AZ');
    console.error('  npm run callsheet -- 0 --diff');
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

  if (diffMode) {
    const handPath = path.join(HAND_DIR, `Turnleaf_Call_Sheet_Session${session}.md`);
    if (!fs.existsSync(handPath)) {
      console.error(`No hand-written sheet at ${handPath} to diff against.`);
      process.exit(1);
    }
    const tmp = path.join(OUT_DIR, `.diff-session${session}.md`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(tmp, markdown, 'utf-8');
    console.log(`Generated sheet written to ${tmp} for comparison.`);
    console.log(`Hand-written sheet: ${handPath}`);
    console.log('\nNothing was overwritten. Diff the two files to compare.');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `session${session}.md`);
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`Wrote ${outPath} — ${states.length} state(s), ${states.reduce((n, s) => n + s.openQuestions.length, 0)} open question(s).`);
}

main().catch(err => {
  console.error('Call sheet generation failed:', err);
  process.exit(1);
});

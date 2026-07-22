// ============================================================================
// SEED — mirrors src/data/fallbackRules.ts (source of truth) into Neon.
//
// THIS SCRIPT ALTERS A LIVE SCHEMA. It swaps the verification_status CHECK
// constraint and adds five columns. Run it in this order, every time:
//
//   1. SNAPSHOT FIRST. Take a Neon branch/backup of the current database
//      before anything else. The constraint swap is not reversible by re-running
//      this script, and step 1 of the migration rewrites rows (any retired
//      status becomes 'draft' — the old value is gone).
//   2. RUN AGAINST A DEV BRANCH. Point DATABASE_URL at a Neon dev branch and
//      seed there first.
//   3. VERIFY THE DEV BRANCH. Check that every state landed, that
//      verification_status is 'draft' across the board, and that the new
//      columns (source_package, terminology, key_dates, open_questions,
//      sources) are populated — not defaulted to '[]'.
//   4. ONLY THEN MAIN. Repoint DATABASE_URL and run again.
//
// This has never been run against a live database. The migration is reviewed
// but unexecuted; treat the first run as the test it is.
//
// Seeding writes whatever the source of truth says, and the source of truth
// only ever says 'draft' until a human changes it by hand after a verification
// call. Nothing here promotes a state.
// ============================================================================

import { neon } from '@neondatabase/serverless';
import { fallbackRules } from '../data/fallbackRules';
import { validateAll, formatErrors } from '../data/validateState';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars. .env.local takes precedence (Next.js convention), then .env.
// dotenv does not override already-set vars, so load .env.local first.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  // Validate every state BEFORE touching the database (FR-21). A malformed
  // tree must never reach the DB: the rules engine does not crash on one, it
  // silently returns a hardcoded result, so a real person gets a wrong answer.
  // Structure only — this says nothing about whether the law is right.
  console.log('Validating state rule structure...');
  const errors = validateAll(fallbackRules);
  if (errors.length > 0) {
    console.error(`\nStructural validation FAILED — ${errors.length} problem(s). Nothing was written.\n`);
    console.error(formatErrors(errors));
    console.error('\nFix the keys named above and reseed.\n');
    process.exit(1);
  }
  console.log(`Structure OK — ${Object.keys(fallbackRules).length} state(s).`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local or .env. Seeding aborted.');
    process.exit(1);
  }

  console.log('Connecting to Neon database...');
  const sql = neon(connectionString);

  console.log('Ensuring table exists...');
  await sql`
    CREATE TABLE IF NOT EXISTS states (
      code VARCHAR(2) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      rules JSONB NOT NULL,
      resources JSONB NOT NULL,
      last_reviewed DATE NOT NULL DEFAULT CURRENT_DATE,
      verified_date DATE,
      verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('draft', 'statute_cited', 'phone_verified'))
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);`;

  // Migration for databases created before the draft/provenance columns.
  //
  // CREATE TABLE IF NOT EXISTS does nothing to an existing table, so a live
  // database keeps its old CHECK constraint and would reject every 'draft'
  // row this seeder now writes. Each step is idempotent, so fresh and existing
  // databases converge here.
  console.log('Applying schema migrations...');

  // Order matters: no row may hold a value the new constraint rejects, or the
  // ADD CONSTRAINT below fails on the way in. 'pending' is the one being retired.
  await sql`
    UPDATE states SET verification_status = 'draft'
    WHERE verification_status NOT IN ('draft', 'statute_cited', 'phone_verified');
  `;
  await sql`ALTER TABLE states DROP CONSTRAINT IF EXISTS states_verification_status_check;`;
  await sql`
    ALTER TABLE states ADD CONSTRAINT states_verification_status_check
    CHECK (verification_status IN ('draft', 'statute_cited', 'phone_verified'));
  `;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS source_package TEXT;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS session_note TEXT;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS terminology TEXT;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS key_dates JSONB NOT NULL DEFAULT '[]'::jsonb;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS open_questions JSONB NOT NULL DEFAULT '[]'::jsonb;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;`;
  await sql`ALTER TABLE states ADD COLUMN IF NOT EXISTS verified_date DATE;`;

  console.log('Seeding states database...');
  for (const [code, config] of Object.entries(fallbackRules)) {
    // Rule 4: seeding only ever writes what the source of truth says, and the
    // source of truth only ever says 'draft' until a human changes it by hand
    // after a verification call. Nothing here promotes a state.
    console.log(`Upserting ${config.name} (${code}) [${config.verificationStatus}]...`);
    await sql`
      INSERT INTO states (
        code, name, rules, resources, last_reviewed, verified_date, verification_status,
        source_package, session_note, terminology, key_dates, open_questions, sources
      )
      VALUES (
        ${code},
        ${config.name},
        ${config.rules},
        ${config.resources},
        ${config.lastReviewed},
        ${config.verifiedDate ?? null},
        ${config.verificationStatus},
        ${config.sourcePackage},
        ${config.sessionNote ?? null},
        ${config.terminology},
        ${JSON.stringify(config.keyDates)},
        ${JSON.stringify(config.openQuestions)},
        ${JSON.stringify(config.sources)}
      )
      ON CONFLICT (code) DO UPDATE
      SET
        name = EXCLUDED.name,
        rules = EXCLUDED.rules,
        resources = EXCLUDED.resources,
        last_reviewed = EXCLUDED.last_reviewed,
        verified_date = EXCLUDED.verified_date,
        verification_status = EXCLUDED.verification_status,
        source_package = EXCLUDED.source_package,
        session_note = EXCLUDED.session_note,
        terminology = EXCLUDED.terminology,
        key_dates = EXCLUDED.key_dates,
        open_questions = EXCLUDED.open_questions,
        sources = EXCLUDED.sources;
    `;
  }

  console.log('Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});

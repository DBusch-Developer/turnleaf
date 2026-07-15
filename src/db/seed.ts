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
      verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('statute_cited', 'phone_verified', 'pending'))
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);`;

  console.log('Seeding states database...');
  for (const [code, config] of Object.entries(fallbackRules)) {
    console.log(`Upserting ${config.name} (${code})...`);
    await sql`
      INSERT INTO states (code, name, rules, resources, last_reviewed, verification_status)
      VALUES (
        ${code}, 
        ${config.name}, 
        ${config.rules}, 
        ${config.resources}, 
        ${config.lastReviewed}, 
        ${config.verificationStatus}
      )
      ON CONFLICT (code) DO UPDATE
      SET 
        name = EXCLUDED.name,
        rules = EXCLUDED.rules,
        resources = EXCLUDED.resources,
        last_reviewed = EXCLUDED.last_reviewed,
        verification_status = EXCLUDED.verification_status;
    `;
  }

  console.log('Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});

-- DDL Schema for Turnleaf States JSONB Database
--
-- This mirrors src/data/fallbackRules.ts, which is the source of truth
-- (ADR-0003). `npm run db:seed` validates, applies the migrations below, and
-- upserts every state.
--
-- verification_status is never promoted by automation. Seeding writes 'draft';
-- 'statute_cited' and 'phone_verified' are set by a person, by hand, after a
-- verification call. Only the latter two are screenable — a draft state routes
-- to the in-research panel.

CREATE TABLE IF NOT EXISTS states (
  code                VARCHAR(2)  PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  rules               JSONB       NOT NULL,   -- the decision tree
  resources           JSONB       NOT NULL,   -- remedies + legal aid
  last_reviewed       DATE        NOT NULL DEFAULT CURRENT_DATE,
  verification_status VARCHAR(20) NOT NULL
    CHECK (verification_status IN ('draft', 'statute_cited', 'phone_verified')),
  source_package      TEXT,                   -- research/waves/... — rule 1 provenance
  terminology         TEXT,                   -- what this state calls its remedies
  key_dates           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  open_questions      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  sources             JSONB       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);

-- ---------------------------------------------------------------------------
-- Migration for databases created before the draft/provenance columns.
--
-- CREATE TABLE IF NOT EXISTS leaves an existing table untouched, so a live
-- database keeps the old CHECK ('statute_cited','phone_verified','pending')
-- and rejects every 'draft' row. db/seed.ts runs these on every seed; they are
-- idempotent and safe to re-run.
--
-- Step 1 MUST precede step 2: ADD CONSTRAINT is validated against existing
-- rows, so any surviving 'pending' row would fail the new constraint.
-- ---------------------------------------------------------------------------

-- 1. Retire values the new constraint would reject.
UPDATE states SET verification_status = 'draft'
  WHERE verification_status NOT IN ('draft', 'statute_cited', 'phone_verified');

-- 2. Swap the constraint: 'pending' out, 'draft' in.
ALTER TABLE states DROP CONSTRAINT IF EXISTS states_verification_status_check;
ALTER TABLE states ADD  CONSTRAINT states_verification_status_check
  CHECK (verification_status IN ('draft', 'statute_cited', 'phone_verified'));

-- 3. Add the new columns. Arrays default to '[]' so existing rows stay valid.
ALTER TABLE states ADD COLUMN IF NOT EXISTS source_package TEXT;
ALTER TABLE states ADD COLUMN IF NOT EXISTS terminology    TEXT;
ALTER TABLE states ADD COLUMN IF NOT EXISTS key_dates      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE states ADD COLUMN IF NOT EXISTS open_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE states ADD COLUMN IF NOT EXISTS sources        JSONB NOT NULL DEFAULT '[]'::jsonb;

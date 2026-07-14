-- DDL Schema for Turnleaf States JSONB Database

CREATE TABLE IF NOT EXISTS states (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rules JSONB NOT NULL,
  resources JSONB NOT NULL,
  last_reviewed DATE NOT NULL DEFAULT CURRENT_DATE,
  verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('statute_cited', 'phone_verified', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);

# Data Model — Turnleaf

## 1. The `states` table

Researched rules are stored one row per state, with the rule logic and resources as JSONB.

```sql
CREATE TABLE IF NOT EXISTS states (
  code                VARCHAR(2)  PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  rules               JSONB       NOT NULL,   -- the decision tree
  resources           JSONB       NOT NULL,   -- remedies + legal aid
  last_reviewed       DATE        NOT NULL DEFAULT CURRENT_DATE,
  verification_status VARCHAR(20) NOT NULL
    CHECK (verification_status IN ('statute_cited','phone_verified','pending'))
);
CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);
```

The table is a **mirror** of `src/data/fallbackRules.ts`, populated by `npm run db:seed`. The code file is the source of truth (see [`02-architecture.md`](./02-architecture.md) §5).

## 2. `StateRuleConfig` (the TypeScript shape)

Each state is a `StateRuleConfig` (`src/data/fallbackRules.ts`):

```
StateRuleConfig
├── code, name
├── lastReviewed, verificationStatus
├── rules
│   ├── startNode: string                 # entry node id
│   ├── nodes:   Record<string, RuleNode> # the questions
│   └── results: Record<string, RuleResult># the outcomes
└── resources
    ├── remedies: Record<string, Remedy>  # forms/fees/steps
    └── legalAid: Array<{ name, url }>
```

## 3. The decision tree

A state's `rules` is a directed graph. Evaluation starts at `startNode` and follows edges until it lands on a key that exists in `results`.

**`RuleNode` types:**
- `choice` — branches via `options: [{ label, value, next }]`.
- `boolean` — branches via `yes` / `no`.
- `date` — branches via `validation: { yearsRequired, nextPass, nextFail }` (waiting-period check).
- `checkpoint` — a confirmation gate.

**`RuleResult`:**
```
{ status: 'eligible'|'waiting'|'ineligible'|'complex',
  title, message, remedy, citation }
```

Every terminal result must carry a real `citation`.

### Example (abridged, California)

```
startNode: 'offense_level'
nodes.offense_level (choice) ── felony ──► 'prison_sentence'
                             └─ misdemeanor ─► 'disposition'
nodes.disposition (choice) ── convicted ──► 'probation_status'
                           └─ dismissed ──► results.eligible_dismissed
...
results.eligible_expungement { status:'eligible', citation:'California Penal Code § 1203.4', ... }
```

## 4. Structural integrity rules

A state config is only valid if:
1. **References resolve** — every `next` / `yes` / `no` / `nextPass` / `nextFail` names an existing node or result.
2. **No dead-ends** — every path from `startNode` terminates at a result; no unreachable orphan nodes.
3. **Required fields present** — `startNode` set; every result has a `citation`; every remedy has `formName`, `formUrl`, `fees`, `steps`, `courtContact`.

The seed validates these before writing (FR-21). This checks *structure*, not legal correctness — see [`../RULES.md`](../RULES.md).

## 5. Runtime record shape

User entries are `ConvictionRecord` objects held only in browser state (never persisted):

```
ConvictionRecord {
  id, title,
  charge_type: 'misdemeanor'|'felony'|'infraction'|'unknown',
  disposition: 'convicted'|'dismissed'|'deferred'|'acquitted'|'unknown',
  disposition_date,
  probation_status: 'completed'|'failed'|'active'|'none',
  prison_sentenced: boolean,
  restitution_paid: boolean
}
```

## 6. Mock Checkr shape (demo only)

`/api/mock-checkr` serves `CheckrReport` personas (candidate + `CheckrRecord[]`) used to prepopulate the wizard for demos. This data is fictional and must never be treated as real records.

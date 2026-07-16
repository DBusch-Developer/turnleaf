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
    CHECK (verification_status IN ('draft','statute_cited','phone_verified')),
  source_package      TEXT,                   -- research/waves/... (rule 1 provenance)
  terminology         TEXT,                   -- what this state calls its remedies
  key_dates           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  open_questions      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  sources             JSONB       NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);
```

The table is a **mirror** of `src/data/fallbackRules.ts`, populated by `npm run db:seed`. The code file is the source of truth (see [`02-architecture.md`](./02-architecture.md) §5).

`CREATE TABLE IF NOT EXISTS` does nothing to an existing table, so `db/seed.ts` also runs idempotent `ALTER`s (mirrored in `src/db/schema.sql`) to bring older databases forward. Order matters: rows holding a retired status (`'pending'`) are migrated to `'draft'` **before** the new CHECK constraint is added, or the constraint fails validation on the way in.

### `verification_status`

| value | meaning | screenable? |
|---|---|---|
| `draft` | Rules were read out of a research package and cited. **Nobody has confirmed them with a court.** | No |
| `statute_cited` | A person read the statute text and confirmed the rules against it. | Yes |
| `phone_verified` | A person confirmed the fees, forms and periods by phone with the court. | Yes |

**Seeding only ever writes `draft`.** Nothing promotes a state — not a script, not a migration, not a model. The other two are set by hand after a verification call. A draft state routes to the in-research panel exactly like an unresearched one, so a state is dark until someone has actually checked it.

## 2. `StateRuleConfig` (the TypeScript shape)

Each state is a `StateRuleConfig` (`src/data/fallbackRules.ts`):

```
StateRuleConfig
├── code, name
├── lastReviewed, verificationStatus
├── sourcePackage: string                 # research/waves/... — rules data comes
│                                         #   from a package or it does not ship
├── terminology: string                   # what this state calls its remedies,
│                                         #   and what it does NOT have
├── keyDates:       KeyDate[]             # effective / operative / deadline
├── openQuestions:  OpenQuestion[]        # every ⚠️ in the package lands here
├── sources:        StatuteSource[]       # the statutes the rules rest on
├── rules
│   ├── startNode: string                 # entry node id
│   ├── nodes:   Record<string, RuleNode> # the questions
│   └── results: Record<string, RuleResult># the outcomes
└── resources
    ├── remedies: Record<string, Remedy>  # forms/fees/steps — nullable fields
    └── legalAid: Array<{ name, url }>
```

### Unknown is a value, and it is spelled `null`

On a remedy, `formName`, `formUrl`, `fees`, `feeWaiver` and `courtContact` are `string | null`. **`null` means nobody has verified it** — not that it is zero, not that it is free. There are no defaults, no "typical" values, and no inference: if the research package doesn't say, the field is `null` and the UI says "Not yet verified — ask the court clerk".

Every `null` must be accounted for by an `OpenQuestion`, and every `OpenQuestion` must point at fields that really are `null`. The validator enforces both directions.

```
OpenQuestion { question: string, blocksFields: string[] }
```

`blocksFields` is a **list** because dependent claims null together, and one unknown can strand several fields. "Fee waiver not required" only follows from "the fee is $0" — so one unanswered question about a fee makes both the fee and the waiver unknown, and one phone call closes both. Dependence is about *derivation*, not field names: "waiver form FW-001 exists" stands on its own and survives the fee being unknown. An empty array means the question blocks no single field (it blocks a branch, or a sentence in a message).

```
StatuteSource { id: string, url: string | null, retrievedOn: string | null }
KeyDate       { label, date, kind: 'effective'|'operative'|'deadline', note }
```

`KeyDate.date` carries **exactly the precision the package gave**: `'YYYY'`, `'YYYY-MM'` or `'YYYY-MM-DD'`. A package that says a provision was "added 2021" supports `'2021'` and nothing finer — padding it to `'2021-01-01'` invents a day no source claimed. Consumers render what is stored and never expand it. (Lexicographic sort still orders these correctly.)

## 3. The decision tree

A state's `rules` is a directed graph. Evaluation starts at `startNode` and follows edges until it lands on a key that exists in `results`.

**`RuleNode` types:**
- `choice` — branches via `options: [{ label, value, next }]`.
- `boolean` — branches via `yes` / `no`.
- `date` — branches via `validation` (waiting-period check), below.
- `checkpoint` — a confirmation gate.

**Waiting periods.** A `date` node's `validation` carries a `WaitingPeriod`:

```
WaitingPeriod { amount: number | null, unit: 'days'|'months'|'years', anchor: string }
```

`anchor` records **what the clock runs from**, which is not recoverable from the number: two states can both say "2 years" and mean different dates. Arizona's runs from *absolute discharge — which does not arrive until restitution is paid in full*; New York's from *sentencing or release, whichever is later*; Texas expunction from *the date of arrest*.

`validation` is a discriminated union, so a period we don't know **cannot** carry a pass/fail branch:

```
| { period: { amount: number, ... }, nextPass, nextFail }   # computable
| { period: { amount: null,   ... }, nextUnknown }          # not computable
```

`amount: null` means the package gave no period, or gave conflicting ones (Texas § 411.0735: sources split between 2 and 5 years). There is no answer to compute, so the only route is to a result that says so. The type makes the alternative unwritable — which matters, because the previous engine read `node.validation?.yearsRequired || 1` and turned a missing period into a confident one-year answer.

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
1. **References resolve** — every `next` / `yes` / `no` / `nextPass` / `nextFail` / `nextUnknown` names an existing node or result.
2. **No dead-ends** — every path from `startNode` terminates at a result; no unreachable orphan nodes; the graph is acyclic (a cycle means some sequence of answers never terminates).
3. **Required fields present** — `startNode` set; every result has a `citation`; every remedy has a `name` and `steps`.
4. **Node shape matches type** — `choice` has `options`; `boolean` has `yes` and `no`; `date` has `validation`.
5. **Provenance recorded** — `sourcePackage` points under `research/waves/`; `terminology` is set; `sources` is non-empty.
6. **Unknowns are accounted for** — a `null` remedy field is only valid when an `OpenQuestion` lists its path, and an `OpenQuestion` may only list paths that really are `null`. An empty string is never a stand-in for unknown.
7. **Dates carry only the precision given** — `keyDates[].date` matches `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.

`validateState` (`src/data/validateState.ts`) implements these. `npm run db:seed` runs it across all states and aborts without writing if any fail; `npm run validate` runs it standalone for CI. See [ADR-0005](./decisions/ADR-0005-vitest-for-structural-validation.md).

### What the validator cannot do

It checks that `2021-01-01` is a **well-formed** date. It cannot know the package said only "2021" — it has never read the package. Padding a year into a day passes every check here. Precision against the source is a reviewer's job on every data diff; see [`../AGENTS.md`](../AGENTS.md) → "What the machine holds, and what it doesn't".

`result.remedy` is **not** checked against the keys of `resources.remedies`. It is a display label (e.g. `'Petition for Dismissal (PC 1203.4)'`), not a foreign key — `ResultsDisplay` renders every remedy in `resources` rather than looking one up by that string.

This checks *structure*, not legal correctness — see [`../RULES.md`](../RULES.md). A well-formed tree can still be entirely wrong about the law.

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

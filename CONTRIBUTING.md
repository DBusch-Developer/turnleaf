# Contributing to Turnleaf

Thanks for helping. Turnleaf tells justice-impacted people where their record may stand under their state's law. Behind every screening is a real person making a real decision, so this project trades speed for correctness — a wrong waiting period here is not a cosmetic bug.

> **The golden rule:** Turnleaf informs; it never advises, and it never invents law. Every user-facing legal statement is hedged, and every rule traces to a real, cited statute. When you don't know the law, you ship the in-research panel — you do not guess.

[`RULES.md`](./RULES.md) is the binding version of that rule and everything under it. This file is the how-to.

## Before you start

Read, in order:

1. [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — mission, users, design principles
2. [`RULES.md`](./RULES.md) — the non-negotiables
3. [`TERMINOLOGY.md`](./TERMINOLOGY.md) — canonical vocabulary (use *sealing* / *expungement* / *set-aside* precisely; they are not synonyms)
4. [`docs/02-architecture.md`](./docs/02-architecture.md) and [`docs/03-data-model.md`](./docs/03-data-model.md) — layers, boundaries, the rule format

If you are an AI coding agent, [`AGENTS.md`](./AGENTS.md) is your handbook and takes precedence over this file's conveniences.

## Ways to contribute

| Contribution | Where it lands | Bar |
|---|---|---|
| **Research a state** | `src/data/fallbackRules.ts` | Cited statutes, verified forms/fees, real legal-aid links |
| **Correct a rule** | `src/data/fallbackRules.ts` | A citation showing the current rule is wrong |
| **Code** | `src/` | Preserves anonymity, hedging, and the fallback paths |
| **Docs** | `docs/`, root `*.md` | Matches actual behavior, not intended behavior |

Expanding state coverage is the core ongoing work. Four states are researched (CA, AZ, NY, TX); the other 46 show the in-research panel.

## Development setup

**Prerequisites:** Node.js 20+, a Neon database (optional), a Groq API key (optional).

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL and GROQ_API_KEY
npm run dev
```

Both env vars are optional. Without `DATABASE_URL` the app falls back to the rules in `src/data/fallbackRules.ts`; without `GROQ_API_KEY` summaries fall back to the deterministic path. Both fallbacks are load-bearing features, not conveniences — if you are touching either path, exercise it with the variable unset.

Never commit `.env`, a connection string, or an API key.

## Adding a researched state

This is the workflow that matters most. It is deliberately slow.

### 1. Research the law

Work from **primary sources**: the state's statutes, plus the state court system's self-help pages for forms and fees. Not blog posts, not law-firm marketing pages, not an LLM's recollection.

Collect, for each remedy the state offers:

- The **statute** — code section, current text, and any recent act that changed it (e.g., NY's Clean Slate Act, CA's SB 731 automatic relief). Repealed statutes are a live hazard: an earlier version of this repo shipped a citation to Texas Chapter 55, which no longer exists.
- **Eligibility conditions** — offense level, disposition, sentence type, registration status, waiting periods and what each clock runs *from*.
- **The petition form** — official name and a URL on a `.gov` or state court domain.
- **Fees** and the fee-waiver path.
- **Court contact** and real **legal-aid** organizations with working links.

Where the law is genuinely unclear or contradictory, **stop and ask a specific question** in an issue. Do not fill the gap with a plausible guess, and do not average two sources. A state with no researched rules is honest; a state with invented ones is not.

### 2. Encode it as a decision tree

All researched rules currently live in one file, `src/data/fallbackRules.ts`, typed as `StateRuleConfig`. Copy an existing state as your model — `CA` is the most complete — and read [`docs/03-data-model.md`](./docs/03-data-model.md) §2–§3 for the shape.

A state config needs:

```
code, name, lastReviewed, verificationStatus
rules
├── startNode              # entry node id
├── nodes                  # choice | boolean | date | checkpoint
└── results                # eligible | waiting | ineligible | complex
resources
├── remedies               # name, formName, formUrl, steps, fees, feeWaiver, courtContact
└── legalAid               # [{ name, url }]
```

Rules for the content itself:

- **Every terminal result carries a real `citation`.** No exceptions.
- **Hedge every message.** "You appear potentially eligible…", never "you are eligible" or "you should file." Every result should route to confirming with a legal-aid attorney or court clerk.
- **Set `verificationStatus` honestly.** `statute_cited` means you read the statute. `phone_verified` means a human confirmed the detail with the court — do not claim it because a fee looked right on a web page. Mark unconfirmed details with a `TODO(phone-verify)` comment, as the existing states do for fee amounts.
- **Set `lastReviewed` to the date you actually read the source.**
- **Comment the landscape.** Each existing state carries a header comment explaining what the current law looks like and what changed recently. Future you will need it.

### 3. Check the structure by hand

**There is no automated validator yet.** [`docs/03-data-model.md`](./docs/03-data-model.md) §4 says the seed validates structure before writing, and [`docs/01-prd.md`](./docs/01-prd.md) FR-21 calls the seed "validated" — as of now, neither is true. `src/db/seed.ts` creates the table and upserts; it does not check your tree. [ADR-0002](./docs/decisions/ADR-0002-per-state-research-files.md) proposes a `validateState` check plus per-state files under `src/data/states/`, but it is still **Proposed** and unbuilt.

So until it exists, walk the tree yourself:

1. **References resolve** — every `next`, `yes`, `no`, `nextPass`, and `nextFail` names a node or result that exists. A typo (`next: 'sentance_date'`) fails silently and strands a real user mid-questionnaire.
2. **No dead ends** — every path from `startNode` terminates at a result, and no node is orphaned.
3. **Required fields present** — `startNode` set; every result has a `citation`; every remedy has `formName`, `formUrl`, `fees`, `steps`, and `courtContact`.

This checks *structure*, never legal correctness. Nothing automated can tell you the law is right.

### 4. Seed

```bash
npm run db:seed
```

Idempotent (upsert by state code), and it requires `DATABASE_URL`. `fallbackRules.ts` is the source of truth; the database mirrors it. Never edit rules directly in the database — the next seed overwrites you.

### 5. Exercise the flow

Run `npm run dev`, select your state, and walk every branch you authored — including the ineligible and waiting-period paths, which are easy to leave broken. Confirm the form links actually open the form.

Be aware of a known limitation: the rules engine still branches on specific node names (e.g. `if (currentNodeId === 'prison_sentence')`), so a state whose tree doesn't follow the existing shape **can require engine edits**. See [`docs/02-architecture.md`](./docs/02-architecture.md) §8. If you hit this, say so in your PR rather than bending the state's law to fit the engine.

## Working on code

- **Legal rules live in data, not code branches.** A state is a `StateRuleConfig`, never an `if` in a component.
- **Route Handlers own server work and secrets.** The Groq key stays server-side in `/api/summarize`.
- **Preserve graceful degradation.** DB → `fallbackRules`, Groq → deterministic summary. Removing a fallback needs an ADR.
- **Anonymity is architectural.** No names, SSNs, DOBs, or charge files collected, stored, or logged. `/api/summarize` receives charge text to rephrase and must not log it.
- **This is not the Next.js you know.** Next 16 has breaking changes; read the relevant guide in `node_modules/next/dist/docs/` before using an API.

## Before you open a PR

Run these and read the output:

```bash
npm run lint
npm run build
```

Your change is ready when the behavior meets its acceptance criteria and you've demonstrated it; user-facing legal output is hedged and cites real statutes; anonymity holds; the fallback paths still work; changed state rules pass the structural checklist and seed cleanly; affected docs are updated in the same change set; and no secrets are committed.

**Evidence before assertions.** Don't report a build green or a screening working without having run it. If something failed or you skipped it, say so plainly, with the output. An honest "I didn't test the waiting-period branch" is worth more than a confident guess.

## Commits and PRs

- Branch off `main` for non-trivial work; keep commits small and logical.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- PR descriptions state honestly what was and wasn't tested.
- For a state contribution, list your sources — statute sections and the URLs you read — so a reviewer can check them without redoing the research.

## Documentation synchronization

When behavior changes, its documentation changes **in the same commit** — product docs, architecture, data model, terminology, affected ADRs. A task is not complete while its docs are stale. (The validator gap described above is exactly what this rule exists to prevent.)

## Change control

Changes to the stack, the data model, the privacy posture, the language-safety policy, or the "no fallback templates" policy require an ADR in [`docs/decisions/`](./docs/decisions/). Copy [`ADR-template.md`](./docs/decisions/ADR-template.md). Don't rewrite an existing ADR to reflect a new decision — add one that supersedes it.

## What won't be merged

- An invented, approximated, or extrapolated rule, citation, waiting period, fee, or form.
- Generic or template rules for a state ("no fallback templates, no shallow data" — [ADR-0001](./docs/decisions/ADR-0001-no-fallback-templates.md)).
- Un-hedged eligibility claims, or anything that reads as legal advice.
- Anything that collects, stores, or logs personal information.
- Committed secrets.
- Mock Checkr personas presented as real records outside the demo context.

## Questions

Open an issue. For an unclear legal rule, one precise question beats three assumptions — and asking it is always the right call here.

# TERMINOLOGY.md — Canonical Vocabulary

Use these terms consistently across code, UI copy, and docs. Where states use different words for similar relief, prefer the state's own statutory term in that state's rules, and use the neutral umbrella term ("record clearing") when speaking generally.

## Umbrella & product terms

- **Record clearing** — the neutral umbrella term for any remedy that hides, seals, sets aside, or erases a criminal record. Preferred in general UI copy.
- **Justice-impacted individual** — a person with a criminal record. Preferred over "offender," "ex-con," or "criminal."
- **Screening** — Turnleaf's eligibility check. Always a *screening*, never a *determination* or *legal opinion*.
- **In-research / Coming-soon panel** — the honest UI shown for a state whose rules have not yet been researched and cited; links to national referrals.

## Types of relief (state-specific)

- **Expungement** — destroying or erasing a record so it is treated as if it never happened (terminology and effect vary by state).
- **Sealing** — hiding a record from public view without destroying it (e.g., NY CPL 160.59; CA arrest sealing PC 851.87).
- **Set-aside** — vacating the judgment of guilt while the record remains; common in Arizona (ARS 13-905), often paired with a **Certificate of Second Chance**.
- **Nondisclosure** — a Texas order (Gov. Code 411.072/411.0725) barring public disclosure of a criminal record.
- **Dismissal** — in California, a PC 1203.4 "expungement" is technically a dismissal of the conviction after probation.
- **Realignment / Certificate of Rehabilitation** — alternate California remedies for state-prison cases (PC 1203.41, 4852.01).

## Case & record terms

- **Charge / record** — a single offense entry being screened. In code, a `ConvictionRecord`.
- **Disposition** — the outcome of a case: `convicted`, `dismissed`, `deferred`, or `acquitted`.
- **Deferred adjudication** — a probation outcome (notably Texas) where guilt is not formally entered on successful completion.
- **Offense level** — `infraction`, `misdemeanor`, or `felony`.
- **Probation status** — `completed`, `failed`, `active`, or `none`.
- **Restitution** — court-ordered victim repayment; often a precondition for relief.
- **Absolute discharge** — formal completion of all sentence terms (Arizona term); starts some waiting-period clocks.
- **Waiting period** — the time that must elapse (from conviction, sentence completion, or discharge) before a remedy is available.
- **RAP sheet** — a person's official criminal-history record.

## Screening outcomes (result statuses)

- **eligible** — appears potentially eligible now (still hedged; confirm before filing).
- **waiting** — likely eligible after a waiting period; Turnleaf estimates the date.
- **ineligible** — statutorily excluded from the standard remedy.
- **complex** — special path required (e.g., prison-sentence cases); refer to legal aid.

## Data & system terms

- **Decision tree** — a state's rules encoded as branching nodes ending in results.
  - **Node** — one question (`choice`, `boolean`, `date`, or `checkpoint`) in the tree.
  - **Result** — a terminal outcome node (one of the four statuses above).
  - **startNode** — the entry node of a state's tree.
- **Verification status** — how a state's rules were confirmed: `statute_cited`, `phone_verified`, or `pending`.
- **`fallbackRules`** — the researched state rules in code (`src/data/fallbackRules.ts`); the source of truth, mirrored into the database.
- **`stateDirectory`** — the list of all 50 states shown in the selector.
- **Checkr** — a real background-check provider; Turnleaf includes **mock** Checkr personas for demo/testing only (never real data).
- **Remedy** — a specific filing path (form, steps, fees, court contact) attached to a result.

## Words to avoid

- "You are eligible" / "You qualify" / "You should file" — use hedged phrasing instead.
- "Legal advice," "we recommend filing," "guaranteed" — Turnleaf does not advise.
- "Offender," "criminal," "ex-con" — use "justice-impacted individual."

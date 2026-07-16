# Turnleaf — Call Session 3 (Wave 3: FL · GA · IL · NC · OH)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 3`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**25 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. FLORIDA (FL)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Seal or Expunge (FDLE Certificate, then court petition)** — FDLE for the certificate; county clerk (county of arrest) for the petition
- Florida Justice Center — https://www.floridajusticecenter.org
- Florida Courts self-help (find your county legal aid) — https://www.flcourts.gov/Resources-Services/Court-Improvement/Self-Help-Center

**Dates that govern:**
- 2019 — Administrative/automatic sealing of qualifying non-conviction arrests (§ 943.0595) (effective) · Wave 3 gives the year only. FDLE auto-seals qualifying non-judicial arrest records that ended in non-conviction — scope and current status flagged for verification.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. What is the current scope and status of § 943.0595 administrative/automatic sealing? Wave 3 says FDLE auto-seals qualifying non-conviction arrest records but flags the scope and rollout. Verify on FDLE's Seal & Expunge page before any UI copy claims a record may already be sealed automatically.
   - *Blocks no single field — affects a branch or wording.*
2. What is the county clerk filing fee for a seal or expunge petition? Wave 3 gives "~$42-$60 range commonly cited" and flags it as a phone target — a range across counties is not any one county's fee. The FDLE application fee is separately confirmed at $75 (see below). Ask one county clerk.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`, `resources.remedies.petition.feeWaiver`
3. How long is an FDLE Certificate of Eligibility valid? Wave 3 gives "12 months" but flags it. Confirm on FDLE's instructions — it matters for timing the court petition after the certificate issues.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the § 943.0584 list of offences that cannot be sealed even with adjudication withheld: DV battery, sex offences, lewd offences, trafficking, and others. The tree asks a person whether their offence is on this list.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed diversions treated — including juvenile diversion and the niche self-defense (§ 943.0578) and human-trafficking tracks? Wave 3 mentions these as niche tracks but does not detail eligibility. Standing call-sheet question for every state.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. GEORGIA (GA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record Restriction and Sealing (O.C.G.A. § 35-3-37)** — The court of conviction (or the arresting agency for pre-2013 arrests)
- Georgia Justice Project (wrote the law; statewide clinics) — https://www.gjp.org
- Atlanta Legal Aid — https://atlantalegalaid.org

**Dates that govern:**
- 2021-01-01 — SB 288 "Second Chance Act" — misdemeanour conviction restriction (effective) · Allows petitioning to restrict and seal up to 2 misdemeanour convictions in a lifetime.
- 2013-07-01 — Automatic restriction of non-conviction arrests began (effective) · Arrests on/after this date that end without conviction are restricted automatically by GCIC — with documented reporting gaps, so verification of the GCIC report is advised. Pre-2013 arrests require applying to the arresting agency.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. How complete is the automatic restriction of post-2013 non-conviction arrests in practice? Wave 3 flags documented reporting gaps — the UI says "should be automatic; verify your GCIC report". Confirm with GBI/GCIC how a person checks and corrects a missed restriction.
   - *Blocks no single field — affects a branch or wording.*
2. What does it cost to restrict a pre-2013 arrest through the arresting agency, and what are the county court costs for a conviction restriction petition? Wave 3 flags both as varying by agency/county with no statewide fee. Phone targets.
   - *Blocks (null until answered):* `resources.remedies.restriction.fees`, `resources.remedies.restriction.feeWaiver`
3. Confirm the § 35-3-37(j)(4)(A) exclusion list for misdemeanour conviction restriction: DUI, family-violence battery (unless under 21 at arrest), sex offences, crimes against minors, and serious traffic offences. The tree asks a person whether their offence is on this list.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the First Offender Act and retroactive First Offender mechanics: deferred adjudication once, judge-approved, and the ability to apply retroactively for old cases. Wave 3 names these as additional felony-adjacent routes but the tree does not yet branch on them — disclosed in the felony result.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed diversions treated, and how does the Survivors First Act track (trafficking survivors — vacate or restrict+seal) work? Standing call-sheet question plus a named niche track.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. ILLINOIS (IL)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement or Sealing Petition (20 ILCS 2630/5.2)** — Circuit court of the county of the case
- Illinois Legal Aid Online (Easy Form) — https://www.illinoislegalaid.org
- Cabrini Green Legal Aid — https://www.cgla.net
- New Leaf Illinois (cannabis records, free representation) — https://www.newleafillinois.org

**Dates that govern:**
- 2026-06-30 — Clean Slate Act began phasing in (misdemeanour wait 3->2 yrs; prior-felony bar removed) (effective) · Signed Jan 16, 2026. Two weeks old as of the Wave 3 draft. The automatic-sealing system starts later — verify that date before any "automatic" UI copy.
- 2026-01-16 — Clean Slate Act signed (effective)

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. When does the Clean Slate AUTOMATIC sealing system actually start? The Act phased in June 30, 2026 but the automatic system comes later. Verify the automatic-start date on ILAO's Clean Slate FAQ before any UI copy claims records seal automatically — until then Illinois is petition-only and the tree treats it that way.
   - *Blocks no single field — affects a branch or wording.*
2. GENUINE FIGHT (research/REFEREE_QUEUE.md): under the post-June-30 text, how does a prior felony interact with a later felony sealing petition? Clean Slate removed the automatic bar, but the current rule for the felony-plus-felony fact pattern (Wave 3 persona 5) is unresolved. The tree hedges this to complex_new_law_il. Confirm against 20 ILCS 2630/5.2 current text (the July 1, 2025 version split matters).
   - *Blocks no single field — affects a branch or wording.*
3. Which completed-supervision offences carry the longer 5-year expungement wait rather than 2? Wave 3 flags the list. The tree uses the general 2-year supervision period and notes the exception.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the education-waiver provision: does earning a diploma or degree during the sealing wait accelerate eligibility? Wave 3 says it is real and great UX but flags it for verification. Disclosed in prose on the sealing results, not encoded as a branch (it is a discretionary accelerator).
   - *Blocks no single field — affects a branch or wording.*
5. What is the county filing fee, and specifically the Cook County rule that one fee covers all petitions filed the same day? Wave 3 flags it. A fee waiver is available.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`
6. Confirm the current subsequent-felony unsealing risk text under Clean Slate. Wave 3 notes it is changing. Not encoded; flagged.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. NORTH CAROLINA (NC)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expunction of a Nonviolent Conviction (§ 15A-145.5)** — Clerk of Superior Court, county of conviction
- **Expunction of a Non-Conviction (§ 15A-146)** — Clerk of Superior Court, county of the case
- NC Second Chance Alliance (statewide clinics) — https://www.ncsecondchance.org
- NC Justice Center (Summary of NC Expunctions) — https://www.ncjustice.org

**Dates that govern:**
- 2025-07-09 — S.L. 2025-71 — one-nonviolent-misdemeanour wait cut 5 yrs to 3 (effective) · Applies to petitions filed on/after this date. Most secondary guides still cite the old 5-year figure.
- 2024-07-08 — Automatic expunction of non-convictions (§ 15A-146) resumed under SB 565 (operative) · Dismissals/not-guilty on/after Dec 1, 2021 expunge automatically 180-210 days after disposition. Paused Aug 2022, resumed July 8, 2024 — verify it is still running. Plea-agreement dismissals are NOT automatic.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Is the § 15A-146 automatic expunction of non-convictions still running? Wave 3 says it paused Aug 2022 and resumed July 8, 2024 under SB 565, and flags it for verification. Confirm on the current status before UI copy promises automatic expunction — the tree tells people to check rather than assume.
   - *Blocks no single field — affects a branch or wording.*
2. What is the current conviction-expunction filing fee? Wave 3 gives "$175, waived for indigent petitioners" and flags it. Non-conviction petitions are generally free. Confirm with a clerk of superior court.
   - *Blocks (null until answered):* `resources.remedies.conviction.fees`
3. Confirm the prior-§15A-145.5-expunction limits in subsections (c4)/(c5): Wave 3 says a misdemeanour expunction generally bars a later one and flags the legacy clauses. The tree discloses this in prose but cannot count a person's prior expunctions.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the full "nonviolent" exclusion list against § 15A-145.5(a): Class A-G felonies, Class A1 misdemeanours, any assault-element offence, registry offences, listed sex/stalking offences, meth/heroin/PWISD-cocaine felonies, CMV felonies, DWI, and attempts at any. The tree asks a person to self-assess this.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed diversions and deferred-prosecution dismissals treated? Wave 3 says deferred-prosecution dismissals are not free like other non-conviction petitions but does not detail eligibility. Standing call-sheet question for every state.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. OHIO (OH)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Application to Seal a Conviction (R.C. 2953.32)** — The sentencing court (common pleas for felonies, municipal for misdemeanours)
- Ohio Justice & Policy Center (plain-language guide) — https://www.ohiojpc.org
- Ohio Legal Help — https://www.ohiolegalhelp.org

**Dates that govern:**
- 2023-04-04 — SB 288 — sealing and expungement became distinct remedies (effective) · Also removed the old "eligible offender" numerical cap in favour of per-conviction analysis.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the F3 count-limit rules against the Ohio Supreme Court June 2026 Adult Rights Restoration bench card and R.C. 2953.32: an F3 is blocked where the person has more than one other felony (and the related 2-F3-plus-2-misdemeanour pattern). Wave 3 flags a secondary source claiming an HB 1 "5 felonies / 3 F4+" cap and instructs encoding from the bench card instead — which the tree does. Confirm the bench-card rules directly.
   - *Blocks no single field — affects a branch or wording.*
2. What is the court filing fee? Wave 3 gives "commonly $50" but flags it as set by individual court schedules. Confirm with a clerk of courts (Hamilton or Franklin). One application can cover multiple cases in the same court.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
3. Confirm the full exclusion list from the bench card: F1/F2, OVI and all traffic, offences of violence, registry sex offences, offences with a victim under 13, DV convictions (with the narrow M4 DV sealing allowance), and protection-order violations.
   - *Blocks no single field — affects a branch or wording.*
4. How are completed diversions and intervention-in-lieu treated? Standing call-sheet question. Wave 3 mentions prosecutor-initiated sealing for low-level drug offences (2953.39) and human-trafficking expungement anytime, but not general diversion timing.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

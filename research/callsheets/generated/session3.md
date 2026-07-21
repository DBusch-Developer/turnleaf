# Turnleaf — Call Session 3 (Wave 3: FL · GA · IL · NC · OH)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 3`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**11 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. FLORIDA (FL)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Seal or Expunge (FDLE Certificate, then court petition)** — FDLE for the certificate; county clerk (county of arrest) for the petition
- Florida Justice Center — https://www.floridajusticecenter.org
- Florida Courts self-help (find your county legal aid) — https://www.flcourts.gov/Resources-Services/Court-Improvement/Self-Help-Center

**Dates that govern:**
- 2019 — Administrative/automatic sealing of qualifying non-conviction arrests (§ 943.0595) (effective) · FDLE MANDATORILY auto-seals qualifying non-conviction arrest records (§ 943.0595), with no lifetime limit ((2)(b)) — but NOT forcible felonies (§ 776.08) or specified sex-registry offenses ((2)(a)), and FDLE sealing its own copy does not force other agencies to seal theirs ((3)(c)). (Diana, statute pass 2026-07-16.)

**Verify — 1 open question. Each answer closes a numbered question in the database:**

1. What is the county clerk filing fee for a seal or expunge petition? Wave 3 gives "~$42-$60 range commonly cited" and flags it as a phone target — a range across counties is not any one county's fee. The FDLE application fee is separately confirmed at $75 (see below). Ask one county clerk.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`, `resources.remedies.petition.feeWaiver`

---

## 2. GEORGIA (GA)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record Restriction and Sealing — court petition (O.C.G.A. § 35-3-37)** — The court of conviction
- **Arrest Record Restriction — agency route (O.C.G.A. § 35-3-37)** — The arresting agency (GBI/GCIC for the record itself)
- Georgia Justice Project (wrote the law; statewide clinics) — https://www.gjp.org
- Atlanta Legal Aid — https://atlantalegalaid.org

**Dates that govern:**
- 2021-01-01 — SB 288 "Second Chance Act" — misdemeanour conviction restriction (effective) · Allows petitioning to restrict and seal up to 2 misdemeanour convictions in a lifetime.
- 2013-07-01 — Automatic restriction of non-conviction arrests began (effective) · Arrests on/after this date that end without conviction are restricted automatically by GCIC — with documented reporting gaps, so verification of the GCIC report is advised. Pre-2013 arrests require applying to the arresting agency.
- 2024-04-24 — HB 1201 — trafficking-survivor restriction track (effective) · Added O.C.G.A. § 35-3-37(j)(6)-(7): a survivor of human trafficking may petition the sentencing court to restrict a conviction, First Offender (§ 42-8-60), or conditional-discharge (§ 16-13-2) sentence for an offense committed while a victim (§ 16-5-46) — filed under seal, no fee.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. What does it cost to restrict a pre-2013 arrest through the arresting agency, and what are the county court costs for a conviction restriction petition? Statute-verified 7/18 confirms there is no statewide fee; both vary by agency/county. Phone targets.
   - *Blocks (null until answered):* `resources.remedies.agency_restriction.fees`, `resources.remedies.agency_restriction.feeWaiver`, `resources.remedies.court_petition.fees`, `resources.remedies.court_petition.feeWaiver`
2. How complete is the automatic restriction of post-2013 non-conviction arrests in practice? Documented reporting gaps remain — the UI says "should be automatic; verify your GCIC report". Confirm with GBI/GCIC how a person checks and corrects a missed restriction.
   - *Blocks no single field — affects a branch or wording.*
3. Can a COMPLETED § 42-8-60 First Offender record be further restricted/sealed? § 42-8-60 exonerates but does not restrict, and a plain FO completion is not on § 35-3-37(h)(2)'s automatic-restriction list (only § 16-13-2 drug and § 3-3-23.1 alcohol first-offender completions are). Whether a separate restriction route exists is unsettled — GJP call target.
   - *Blocks no single field — affects a branch or wording.*
4. How does the § 42-8-66 retroactive-First-Offender prosecutor-consent requirement play out in practice? Sumrall (2024) and Ballard (2025) make consent a threshold; confirm with GJP how often prosecutors consent and any local practice for seeking it.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. ILLINOIS (IL)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement or Sealing Petition (20 ILCS 2630/5.2)** — Circuit court of the county of the case
- Illinois Legal Aid Online (Easy Form) — https://www.illinoislegalaid.org
- Cabrini Green Legal Aid — https://www.cgla.net
- New Leaf Illinois (cannabis records, free representation) — https://www.newleafillinois.org

**Dates that govern:**
- 2026-06-30 — Clean Slate Act began phasing in (misdemeanour wait 3->2 yrs; prior-felony bar removed) (effective) · Signed Jan 16, 2026. Two weeks old as of the Wave 3 draft. The automatic-sealing system starts later — verify that date before any "automatic" UI copy.
- 2026-01-16 — Clean Slate Act signed (effective)
- 2026-06-01 — Governing amendment P.A. 104-459 effective (20 ILCS 2630/5.2) (effective) · The version Diana verified against ilga.gov (7/16): repeals the (c)(4) prior-felony bar, sets the (c)(3)(B) 2-yr / (c)(2)(F) 3-yr ladder, blanks the (d)(3) drug test, and adds the (k)/(l) automatic-sealing provisions.
- 2029-01-01 — Automatic sealing begins (20 ILCS 2630/5.2(k)) — ISP quarterly (operative) · ISP seals eligible conviction records quarterly, with its own exclusion list (Class X, Articles 9/11, crimes of violence, robbery, hijacking, residential/Class 1-2 burglary, trafficking, organized retail; felonies wait until ALL eligible felonies meet timing). Petitioning now beats waiting for this.
- 2034 — Automatic-sealing backlog phase-in deadline (subsection (k)) (deadline) · Wave 7 / Diana statute pass: the automatic-sealing backlog is phased in through 2034 — another reason to petition now rather than wait.
- 2028-01-01 — Clerk auto-sealing of municipal-ordinance & Class C misdemeanor records begins (subsection (l)) (operative) · Circuit clerks auto-seal municipal-ordinance-violation and Class C misdemeanor records one year after the case closes.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the education-waiver provision: does earning a diploma or degree during the sealing wait accelerate eligibility? Wave 3 says it is real and great UX but flags it for verification. Disclosed in prose on the sealing results, not encoded as a branch (it is a discretionary accelerator).
   - *Blocks no single field — affects a branch or wording.*
2. What is the county filing fee, and specifically the Cook County rule that one fee covers all petitions filed the same day? Wave 3 flags it. A fee waiver is available.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`

---

## 4. NORTH CAROLINA (NC)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expunction of a Nonviolent Conviction (§ 15A-145.5)** — Clerk of Superior Court, county of conviction
- **Expunction of a Non-Conviction (§ 15A-146)** — Clerk of Superior Court, county of the case
- NC Second Chance Alliance (statewide clinics) — https://www.ncsecondchance.org
- NC Justice Center (Summary of NC Expunctions) — https://www.ncjustice.org

**Dates that govern:**
- 2025-07-09 — S.L. 2025-71 — one-nonviolent-misdemeanour wait cut 5 yrs to 3 (effective) · Applies to petitions filed on/after this date. Most secondary guides still cite the old 5-year figure.
- 2024-07-08 — Automatic expunction of non-convictions (§ 15A-146) resumed under SB 565 (operative) · A case with all charges disposed on/after Dec 1, 2021 and all dismissed/not-guilty/not-responsible expunges automatically 180-210 days after disposition (§ 15A-146(a4)). A case with a felony charge dismissed per plea agreement is excepted (whole case; petition route remains). Framework statute-confirmed; the 2022 pause / July 8, 2024 resumption is operational — verify it is still running.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Is the § 15A-146(a4) automatic expunction currently being PROCESSED by the AOC? The statutory framework is now confirmed (180-210 days, Dec 1 2021 trigger, felony-plea-agreement case exception). The only open part is operational: Wave 3 says the process paused Aug 2022 and resumed July 8, 2024 under SB 565 — a secondary-source claim. The tree tells people to check their record rather than assume.
   - *Blocks no single field — affects a branch or wording.*
2. Does a deferred-prosecution or conditional-discharge dismissal ALSO qualify for the § 15A-146(a4) automatic path, or is it petition-only? § 146(d) implies a petition (it carries the $175 fee); the statute text does not say whether the automatic path also reaches these dismissals.
   - *Blocks no single field — affects a branch or wording.*
3. ADD SECTION: § 15A-145.8A (offense committed while under 18 but tried/convicted as an adult) was NOT read on 7/18 — the 15A-145.8 PDF covers remand-to-juvenile only. A "convicted as an adult for an under-18 offense" path stays unrouted until GS_15A-145.8A.pdf is read. One-download fix.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. OHIO (OH)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave3_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Application to Seal a Conviction (R.C. 2953.32)** — The sentencing court (common pleas for felonies, municipal for misdemeanours)
- Ohio Justice & Policy Center (plain-language guide) — https://www.ohiojpc.org
- Ohio Legal Help — https://www.ohiolegalhelp.org

**Dates that govern:**
- 2023-04-04 — SB 288 — sealing and expungement became distinct remedies (effective) · Also removed the old "eligible offender" numerical cap in favour of per-conviction analysis.
- 2025-09-30 — HB 96 — current R.C. 2953.32 sealing text (effective) · R.C. 2953.32 verified current through HB 96 (Diana, statute pass 2026-07-16).
- 2026-03-20 — SB 56 — R.C. 2953.321 marijuana/hashish expungement track (effective) · Enacted SB 56. Marijuana or hashish possession (R.C. 2925.11) convictions or dismissals for conduct BEFORE this date are expungeable any time under R.C. 2953.321.

**Verify — 1 open question. Each answer closes a numbered question in the database:**

1. Diversion / intervention-in-lieu that did NOT end in a dismissal: the tree routes a completed diversion whose charges were dismissed into the R.C. 2953.33 non-conviction path (a dismissed complaint is textually within 2953.33(A)(1)); a diversion that did not end in dismissal keeps the punt node. Confirm local practice for the non-dismissal case. (R.C. 2953.39 prosecutor-initiated sealing for low-level drug offences remains a referral mention.)
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

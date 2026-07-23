# Turnleaf — Call Session 1 (Wave 1: CO · MI · NJ · PA · UT)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 1`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**23 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. COLORADO (CO)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Seal Conviction Records (C.R.S. 24-72-704 to -710)** — The court that handled your criminal case
- Expunge Colorado (free pro bono sealing clinics) — https://expungecolorado.org
- Colorado Legal Services — https://www.coloradolegalservices.org

**Dates that govern:**
- 2019-08-02 — HB 19-1275 — sealing statutes partly recodified (effective) · Part of the modern sealing framework was recodified here.
- 2022-08-10 — SB 22-099 — in-case sealing, fines/fees barrier removed, automatic framework (effective) · Moved petition sealing into the existing criminal case (no separate civil action), barred unpaid fines/costs/fees from being considered, and built the automatic Clean Slate framework (C.R.S. 13-3-117).
- 2024-07-01 — Automatic Clean Slate sealing begins (misdemeanor/petty/drug, initial batch) (effective) · Over 100,000 records went in the first batch. Quarterly lists since. Name-based matching means eligible people genuinely fall through.
- 2024-08-07 — HB 24-1432 — CBI legacy sealing costs waived; completion deadline June 30, 2026 (effective) · Waived CBI fees for legacy sealing and required CBI to complete those seals by June 30, 2026 (C.R.S. 24-72-706(4)). That deadline has now passed, so any "CBI wants money to seal" advice is dead.
- 2025-07-01 — HB 24-1133 wave — automatic non-drug felonies, non-conviction backfill, § 711, remote hearings (effective) · Added non-drug felonies to the automatic list, swept pre-August-2022 deferred judgments/acquittals/diversions onto sealing lists (13-3-117(5)), added § 711, allowed remote hearings, and added DA-notice own-motion arrest sealing (704(1.5)).
- 2026-05-21 — SB 26-149 — competency-dismissal exclusion (effective) · Reconfirmed that dismissals on competency grounds (16-8.5-109(4)/-113/-116) are NOT sealable (C.R.S. 24-72-705(1)(g)).

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. How often does the DA object to automatic sealing, and to petition sealing, in practice? The statute now sets the grounds precisely (13-3-117(3): technical objections for all offenses; a public-interest objection only for non-drug felonies, triggering notice and a § 706 hearing right), but the real-world frequency is a phone target.
   - *Blocks no single field — affects a branch or wording.*
2. What is the municipal filing fee under C.R.S. 24-72-708(4)? The statute says a "filing fee required by law" applies to the municipal sealing petition — a different animal from the $65 state processing fee (which is statute-cited and waivable). Ask a municipal court clerk.
   - *Blocks no single field — affects a branch or wording.*
3. Does a completed DUI/DWAI DEFERRED JUDGMENT seal under current § 705? The statutory carve-outs no longer list it, but In re Harte excluded alcohol-driving deferrals under prior law. Ask legal aid before encoding — the tree routes DUI deferred judgments to the general non-conviction result but flags this.
   - *Blocks no single field — affects a branch or wording.*
4. Do C.R.S. 24-72-702 and -707 exist in the current table of contents, and if § 707 is a trafficking-survivor sealing section, its requirements should be pulled and cited (cite-don't-encode, like WA's survivor tracks) before any tree branch relies on them.
   - *Blocks no single field — affects a branch or wording.*
5. The LexisNexis prints used for the 2026 chapters are pre-OLLS-certification text. Re-confirm the 2026 amendments (esp. SB 26-149 ch. 142 § 48 integration in § 705) against the certified C.R.S. once published.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. MICHIGAN (MI)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Application to Set Aside Conviction (MCL 780.621)** — The court that convicted you
- **Automatic Set-Aside (MCL 780.621g) — no application** — Michigan State Police (criminal history record check)
- Michigan Legal Help (free guided set-aside interview) — https://michiganlegalhelp.org
- Safe & Just Michigan — https://safeandjustmi.org

**Dates that govern:**
- 2023-04-11 — Automatic set-aside (MCL 780.621g) live (operative) · Records set aside automatically since this date, with no petition and no notice to the person. Statutorily derived: effective 2021-04-11 plus the 2-year trigger in 621g.
- 2022-02-19 — First-offence OWI became petitionable (court discretion) (effective) · 2021 PA 79 (per the 621c history line). OWI remains excluded from the automatic track; a first-violation OWI is petitionable once per lifetime at the court's discretion.
- 2024-02-13 — MCL 780.621 amended by 2023 PA 205 (effective) · The encoded 621 text is the current post-amendment text. The specific content of the 2023 PA 205 change was not separately verified.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. GAP: MCL 780.621d does not clearly assign a waiting period to an assaultive-crime MISDEMEANOR. Subsection (3) excludes assaultive-crime misdemeanours from the 3-year bucket, and (2) does not name them. The tree routes them conservatively to the 5-year node — confirm the correct period with a bench card or the clerk.
   - *Blocks no single field — affects a branch or wording.*
2. For a completed deferred-and-dismissed disposition (7411, 769.4a, HYTA-type, liquor-code), the COUNTING treatment is answered — 621(2) counts it as a misdemeanour conviction for set-aside eligibility, and 621d(7)(d) requires listing it. The remaining question: can the deferral record ITSELF be set aside? The read text does not answer it.
   - *Blocks no single field — affects a branch or wording.*
3. Non-convictions (dismissals/acquittals) are confirmed to be OUTSIDE this set-aside act. The likely home for arrest-record relief is MCL 28.243, which has NOT been read yet — read it next.
   - *Blocks no single field — affects a branch or wording.*
4. Fees below the statutory $50: the RI-008 fingerprint-card fee is set locally by the law-enforcement agency (not in the statute), and the 621e marijuana application fee is not stated in that section (likely none) — confirm both on the MC 227 / MC 227a instructions.
   - *Blocks no single field — affects a branch or wording.*
5. ADD SECTION: MCL 780.621h (grounds for REINSTATEMENT of an automatic set-aside) was NOT read on 7/18. Reinstatement handling is unencoded until GS/MCL 780.621h is read.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. NEW JERSEY (NJ)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **eCourts Expungement (N.J.S.A. 2C:52-1 et seq.)** — Superior Court — county of residence or of any conviction
- LSNJ Law — Clearing Your Record (hotline 888-576-5529) — https://www.lsnjlaw.org
- NJ Courts Expungement Self-Help — https://www.njcourts.gov/self-help/expunge-record

**Dates that govern:**
- 2019 — Clean Slate expungement (2C:52-5.3), P.L.2019 c.269 (effective) · The same law ordered an AUTOMATED clean-slate system (2C:52-5.4) whose operational rollout has been slow — the mandate is statutory; the operational status is not. See open questions.
- 2023 — Venue — file in the county of residence or of conviction (P.L.2023 c.260) (effective) · The residence-or-disposition-county venue is in the current 2C:52-7 text via P.L.2023 c.260, s.8. (Earlier drafts attributed this to a 2025 law.)
- 2021 — Marijuana cases expunged by operation of law (2C:52-6.1) (effective) · By statutory formula, marijuana-only cases were expunged BY OPERATION OF LAW on the first day of the fifth month after P.L.2021 c.19's effective date, with remaining sentences, supervision, and unpaid assessments vacated. The exact calendar date needs P.L.2021 c.19's effective date (not read) — see open questions.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. What is the OPERATIONAL status of the automated clean-slate system (2C:52-5.4), and the name/URL of the State Police backlog / A3881 portal? The mandate, the mooting of pending 5.3 petitions at establishment (5.4(a)(3)), and the restoration of records on a later non-expungeable conviction (5.4(a)(2)) are now statute-cited. What stays open is whether the automated system is actually running and where to check processing.
   - *Blocks no single field — affects a branch or wording.*
2. What is the EXACT operation-of-law date under 2C:52-6.1? The statutory formula is "the first day of the fifth month after P.L.2021 c.19's effective date," but c.19 was not read, so the precise calendar date is not pinned here.
   - *Blocks no single field — affects a branch or wording.*
3. Do PENDING charges affect an expungement petition? No pending-charges ground appears in the 2C:52-14 denial text that was read; any disclosure duty would live in 2C:52-8, which was not read.
   - *Blocks no single field — affects a branch or wording.*
4. Read 2C:52-4 (ordinance violations). It is referenced by the 2C:52-14(e)(1) previous-expungement exception but was not pulled, so ordinance-violation eligibility is disclosed in prose only.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. PENNSYLVANIA (PA)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition for Limited Access — sealing (§ 9122.1, Pa.R.Crim.P. 791)** — Court of Common Pleas, county of conviction
- **Petition for Expungement (§ 9122) — destroys the record** — Court of Common Pleas (or Magisterial District Court for summary offenses), county of the case
- MyCleanSlatePA (Community Legal Services — free eligibility check) — https://mycleanslatepa.com
- PALawHelp — https://www.palawhelp.org

**Dates that govern:**
- 2023-12-14 — Clean Slate 3.0 (Act 36 of 2023) signed (effective) · Act 36 reshaped Chapter 91. Its provisions phased in: the 60-day items on 2024-02-12, the 180-day items on 2024-06-11.
- 2024-02-12 — Act 36 60-day provisions effective (incl. conditional-pardon limited access § 9122.2(a)(4)) (operative) · 60 days after the December 14, 2023 signing.
- 2024-06-11 — Act 36 180-day provisions effective (7-yr automatic misdemeanor period, 5-yr summary period, § 9122(a.1) pardon auto-expungement pipeline, automatic summary sealing) (operative) · 180 days after the December 14, 2023 signing. Replaces the earlier "June 2024 / month-and-year-only" entries with the exact date.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. What does it cost to file for expungement or limited access, and can it be waived? Wave 1 found fees vary BY COUNTY: Montgomery County $176.50 plus $13.50 per extra agency; other counties cited between $132 and $215. Verify Philadelphia, Allegheny and Montgomery, then decide whether to display per-county or as a verified range. (Statute-tier work is done — this is the phone-tier fee showcase.)
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`, `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
2. What does a PSP criminal history record (epatch) cost? Wave 1 gives "~$22, VERIFY". It is needed for a petition, so it is part of the real cost of filing.
   - *Blocks no single field — affects a branch or wording.*
3. The newly-surfaced Clean Slate FEE-ON-RESTITUTION mechanic: § 9122.2 says that upon paying restitution the person "shall also pay the fee previously authorized to carry out the limited access and clean slate limited access provisions" — a fee now attaches even to the AUTOMATIC track. What is that fee, and how is it billed/collected in practice? Phone-tier.
   - *Blocks no single field — affects a branch or wording.*
4. How are completed deferrals/diversions OTHER than ARD treated (e.g., § 17/§ 18 probation without verdict, veterans/mental-health diversion)? Standing call-sheet question. ARD is a statute-cited expungement path (§ 9122); nothing else is yet.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. UTAH (UT)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Expunge Records (Utah R. Crim. P. Rule 42)** — The court that handled the case
- **BCI Certificate of Eligibility (required before any petition)** — Utah Bureau of Criminal Identification (BCI)
- Clean Slate Utah (fee assistance available) — https://cleanslateutah.org
- Utah Legal Services — https://utahlegalservices.org

**Dates that govern:**
- 2024-10-01 — Automatic Clean Slate expungement began (form era) (effective) · From 10/1/2024 through 12/31/2025 a person had to submit a request form to the court for automatic expungement (§ 77-40a-204). Historical note only — see the 1/1/2026 change.
- 2026-01-01 — Automatic expungement fully automatic — form requirement ended (effective) · On/after 1/1/2026 the court auto-expunges on identification, no form needed (§ 77-40a-204). Timing goals (204(4)): acquittal 60 days, dismissal-with-prejudice 180 days, clean-slate case 30 days after the eligibility determination, pre-5/1/2020 cases within 1 year of identification. The system is best-effort — no cause of action if it misses a case (§ 201(4)); the petition route remains open (§ 201(1)).

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. What are the FEE dollar amounts — the BCI application fee, the certificate issuance fee, the court filing fee, and the pre-2013-pardon processing fee? All are set administratively (§§ 63J-1-504, 78A-2-302), not in the statute. Phone-tier; BCI is the call target. Waivers exist (issuance fee waived for most § 302 non-conviction certificates; filing fee indigency waiver under § 78A-2-302).
   - *Blocks no single field — affects a branch or wording.*
2. Pull § 77-27-5.1 (pardon expungement) — referenced by § 77-40a-303(9)/401(2) for pre-5/14/2013 pardons but NOT in Chapter 40A. Cite-only until read.
   - *Blocks no single field — affects a branch or wording.*
3. Pull § 77-2a-3 (plea-in-abeyance expungement path) — referenced in the § 401(1)(c) priority list but not pulled. A plea-in-abeyance completion may have its own route in addition to the § 205 clean-slate treatment; the tree hedges PIA cases.
   - *Blocks no single field — affects a branch or wording.*
4. Pull Utah R. Crim. P. Rule 42 — the procedural rule the § 305 petition is filed under. Cite-only; the tree describes the § 305/306 process from the statute.
   - *Blocks no single field — affects a branch or wording.*
5. Pull the § 76-3-203.5(1)(c)(i) violent-felony list to enumerate it — the never-eligible screen (§ 303(2)(a)) currently keys on the cross-reference and asks the person, rather than listing the offenses.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

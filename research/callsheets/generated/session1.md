# Turnleaf — Call Session 1 (Wave 1: CO · MI · NJ · PA · UT)

_Every number pulled July 15 from official court/agency pages — confirm office scope with your first question._

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 1`.
> Contacts & scripts live in `src/db/callContacts.ts`; status & open questions come from the rules data.

**23 open questions across 5 states.**

Timezone plan (you're in Prescott, AZ — no DST, so Pacific time this summer):
- 8:00–10:00 AM your time → Mountain states (UT, CO are 1 hr ahead): their 9–11 AM. Start here.
- 10:00 AM–1:00 PM your time → Eastern states (MI, PA, NJ are 3 hrs ahead): their 1–4 PM. Avoid 12–1 PM their time.
- AZ offices anytime 9 AM–4 PM — you're local.
Universal opener: "Hi — I'm building a free tool that helps people find the correct forms and fees for record-clearing petitions in [state]. I have two or three quick logistics questions about filing — no legal questions. Do you have two minutes, or is there a better number for filing questions?"
Log every call in the Call Log — including no-answers. When they correct a website: Discrepancy column. That's the gold.

---

## 1. COLORADO (CO) — call 8–10 AM your time

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Call:**
- **Denver District Court Clerk's Offices** — (303) 606-2300 · M–F 8–4
- **Denver District Pro Se / Self-Help Center** — assists with Petitions to Seal — get their direct line from the main number
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

**On the call (your research — confirm-don't-ask phrasing, watch-fors):**
- The fee split is the whole call: "For a Motion to Seal Conviction Records (JDF 612) filed into the existing criminal case — what's the filing fee? Packets show $65 in one place and $224 in another."
- Read: JDF 612 motions INTO the case ≈ $65; petitions opening a NEW civil case (JDF 641) = $224; non-conviction JDF 477 = free. Get the clerk to confirm the split.
- CBI criminal history report cost (~$12.50?) and where users get it.
- Whether remote hearings for sealing are the norm now (2024 law allows them).

---

## 2. MICHIGAN (MI) — call 10 AM–1 PM your time

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Call:**
- **Michigan State Police — set-aside questions line** — (517) 241-0606 · MSP CJIC processes the $50 + fingerprints · PO Box 30266, Lansing 48909
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

**On the call (your research — confirm-don't-ask phrasing, watch-fors):**
- "$50 processing fee to MSP with the MC 227 packet — current?"
- Current MSP processing time (site says 8 weeks; a district court says 4–6 — documented discrepancy).
- The court's own motion filing fee when filing MC 227 (~$20, varies) — confirm with one district court (36th District, Detroit).
- ICHAT self-check $10 / fingerprint personal records check $30 — confirm (feeds the "check if you were auto-set-aside" copy).

---

## 3. NEW JERSEY (NJ) — call 10 AM–1 PM your time

*statewide directory exists!*

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Call:**
- **Essex (Newark)** — (973) 776-9300 · ext. 56587 or 57328
- **Hudson (Jersey City)** — (201) 748-4400 · ext. 60152
- **Mercer (Trenton)** — (609) 571-4200 · ext. 74048
- **Middlesex (New Brunswick)** — (732) 645-4300 · ext. 88155
- **Gloucester (Woodbury)** — (856) 878-5050 · ext. 15392
- **Atlantic (Mays Landing)** — (609) 402-0100
- **LSNJ statewide legal hotline (backup/legal-aid confirm)** — 1-888-576-5529
- **NJ Courts county-by-county Expungement Clerk directory** — njcourts.gov, form #13267 PDF — download and attach to your call log as a source artifact
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

**On the call (your research — confirm-don't-ask phrasing, watch-fors):**
- Pick 2 counties. "Filing through the eCourts Expungement System is free — correct? No filing fee at all?" (njcourts.gov says free; older sites say $75 — best single Discrepancy entry).
- Whether paper filing is still accepted for people without internet, and if THAT has a fee.
- Typical time from filing to signed order right now; ask if the 2025 status-portal is live and what it's called.

---

## 4. PENNSYLVANIA (PA) — call 10 AM–1 PM your time

*the fee-variance showcase*

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Call:**
- **Montgomery County Expungement Clerk (direct!)** — (610) 278-5956 · Clerk of Courts main: (610) 278-3295
- **Philadelphia Clerk of Courts / Office of Judicial Records, Criminal** — courts.phila.gov (1301 Filbert St) — get the criminal filing counter number from the main line
- **Chester County Clerk of Courts** — via chesco.org
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

**On the call (your research — confirm-don't-ask phrasing, watch-fors):**
- Documented spread: Philadelphia lists "Expungement $15.00"; Chester County $168; Montgomery $176.50 + $13.50/agency.
- Montgomery: "Your packet lists $176.50 including one agency served, $13.50 each additional — current?"
- Philadelphia: "Your fee guide lists expungement at $15 — is that the Municipal/Common Pleas filing fee for a Rule 790 petition, or does a Common Pleas petition cost more?"
- Ask one: fee for a Rule 791 Limited Access (sealing) petition vs a Rule 490/790 expungement — same or different?
- PSP criminal history via ePATCH required within 60 days of filing — confirm current ePATCH cost (~$22?).

---

## 5. UTAH (UT) — call 8–10 AM your time

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Call:**
- **BCI Expungement Section (the big one)** — (801) 281-5198 · bciexpungements@utah.gov
- **BCI main (Taylorsville)** — (801) 965-4445
- **Salt Lake City Justice Court (fee cross-check)** — via slc.gov/courts
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

**On the call (your research — confirm-don't-ask phrasing, watch-fors):**
- "Your site lists the Certificate of Eligibility application fee as $65, plus $65 per conviction case at issuance — is that current?"
- Court filing fee: Holladay Justice Court posts $135 — ask BCI whether that's standard statewide; confirm $135 with one district court.
- Prosecutor response time: SLC says 35 days, Holladay says 60 — which is right? (documented discrepancy).
- The automatic-expungement form requirement ended Jan 1, 2026 — confirm how someone checks whether their case was auto-expunged ($15 record request?).

---

## Session targets

- Minimum win: 6 calls logged, 3 fields flipped to phone_verified (AZ set-aside fee, UT $65/$65+$135, NJ free-filing).
- Great session: all six touched, CO fee-split resolved, PA county spread confirmed in 2–3 counties, 1+ Discrepancy entries.
- After each call: update verification_status/fees in fallbackRules, note call_log_ref, set Verified Date in the tracker.

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open. Re-verified a phone number? Update it in `src/db/callContacts.ts`.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

_Numbers came from official pages today, but numbers rot — the office name + site in each entry re-finds it in 30 seconds. If a clerk says "that's a legal question," the phrasing drifted — go back to confirm-don't-ask._

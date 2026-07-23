# Turnleaf — Call Session 7 (Wave 7: AK · HI · ME · MT · ND · NH · RI · SD · VT · WY)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 7`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**37 open questions across 10 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ALASKA (AK)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record relief in Alaska (§ 12.62.180 mistaken-identity sealing; § 22.35.030 CourtView non-publication)** — The Department of Public Safety and the Alaska Court System (each agency seals only its own records)
- Alaska Legal Services Corporation — https://www.alsc-law.org
- Alaska Court System — Self-Help / Records Removal — https://courts.alaska.gov/shc/

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. TOP PRIORITY: pull AS 12.55.078 (suspended entry of judgment) — the eligibility criteria and exclusions. It is Alaska's only route to avoid a conviction record (completion → dismissal → CourtView removal under 22.35.030(4)), but its criteria were not read; the SEJ node states no eligibility rules pending this pull.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm whether Chapter 22.35 contains any section after AS 22.35.030 (a table-of-contents check). The CourtView non-publication rule is 22.35.030; confirm nothing later in the chapter modifies it.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the DPS Criminal Justice Information Systems Program request procedure for an AS 12.62.180 sealing request, and any processing fee. No fee is stated for the administrative request letter; the mechanics and any fee are phone-tier (Alaska DPS). The fees and feeWaiver fields are null pending this.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
4. Clemency-process context (AS 33.20) — cite-only. Gubernatorial clemency is technically the only route for a conviction; the process details were not pulled and are provided as context only.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm whether the AS 22.35.030 CourtView non-publication is reliably applied in practice within 60 days. If a qualifying case still appears after 60 days, the remedy is contacting the court system, not a petition — but how often compliance lags is a phone-tier question (Alaska Court System).
   - *Blocks no single field — affects a branch or wording.*

---

## 2. HAWAII (HI)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Administrative Expungement (Haw. Rev. Stat. § 831-3.2; conviction doors §§ 706-622.5, 706-622.9)** — HCJDC Expungement Section, (808) 587-3348, Honolulu (and the sentencing court for a § 706-622.5 / § 706-622.9 conviction door)
- HCJDC Expungement Section — (808) 587-3348 — https://ag.hawaii.gov/hcjdc/expungement/
- Legal Aid Society of Hawaii — https://www.legalaidhawaii.org

**Dates that govern:**
- 2025 — Judiciary court-database scrubbing on AG expungement (HRS § 831-3.2(f)) (effective) · Amended 2023 and 2025. An AG expungement order bearing a court case number transmits to the Judiciary, which must remove the case from publicly accessible electronic databases — except where the case had multiple offenses (one outside the order) or multiple defendants (a co-defendant lacking their own order).
- 2024 — Retroactive class-C-property expungement added (HRS § 706-622.9(4), Act 168) (effective) · Act 168 (2024) lets a person sentenced BEFORE June 22, 2006 for a class C property felony who would have qualified apply now — requires compliance with the sentence, a would-have-qualified finding (or, failing that, completion of a substance-abuse treatment program), no felony conviction before or after, and a current-nonviolence finding. Once per lifetime.
- 2026-06-30 — HRS § 853-4(2) and (13) reenactment effective (L 2020, c 19, § 15) (effective) · Paragraphs (2) and (13) of the DAG/DANC exclusion list revert to a reenacted text on June 30, 2026. The encoding is the pre-reversion version; those two paragraphs are pending the reenacted text and are not treated as verified.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. TOP PRIORITY: pull the reenacted text of HRS § 853-4(2) and (13) (L 2020, c 19, § 15, or the section as republished after June 30, 2026). These two DAG/DANC exclusion paragraphs revert to a reenacted version, so the encoded (2)/(13) lists are the pre-reversion text and are NOT verified. Everything else in § 853-4 is current (2022 c 111 items are exempt from the reversion).
   - *Blocks no single field — affects a branch or wording.*
2. Run a 2025-2026 session sweep for amendments to §§ 831-3.2, 853-4, 706-622.5, 706-622.9 — including any cannabis-legalization or Clean-Slate act that would touch these sections. The read text is through L 2025 c 3 (831-3.2), L 2022 c 111 (853-4), and L 2024 c 168 (706-622.5/.9).
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the HCJDC application fee amount and processing time. HRS § 831-3.2 states no fee for the application itself, and the court-door expungements (§§ 706-622.5/.9) state none either; fee practice is phone-tier (HCJDC Expungement Section, (808) 587-3348). The fees and feeWaiver fields are null pending this — state no numbers.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
4. Pull chapter 853 DAG/DANC mechanics (§ 853-1 in particular) if time allows — the eligibility and deferral-period rules that feed the § 831-3.2(a)(5) 1-year post-dismissal expungement. Cited but not read.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm whether an AG expungement reaches the court MINUTES (not just the electronic docket) in the two § 831-3.2(f) carve-out scenarios (multiple offenses, or multiple defendants). Attorney-tier; the encoding tells people court-website traces can remain in those situations.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MAINE (ME)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Seal (15 M.R.S. ch. 310-A, §§ 2261-2269)** — The court of conviction (the underlying criminal case)
- Pine Tree Legal Assistance — https://www.ptla.org
- Maine Judicial Branch — Fees & Forms — https://www.courts.maine.gov/fees-forms/forms.html

**Dates that govern:**
- 2023 — Eligible-conviction definition replaced — Class E + legacy marijuana (§ 2261(6), 2023 c 639) (effective) · 2023 c 639 replaced § 2261(6): eligible convictions are any current/former Class E crime except Title 17-A chapter 11 offenses, plus the pre-1/30/2017 marijuana list. No Class D outside that list, no felonies.
- 2023 — Age-at-offense requirement repealed (§ 2262(6), 2023 c 666) (effective) · 2023 c 666 repealed the former § 2262(6) age requirement, so Class E sealing no longer turns on the person's age at the offense. Many guides still state the old age cap.
- 2017-01-30 — Marijuana-sealing cutoff (convictions before January 30, 2017) (effective) · The legacy marijuana list reaches Class D cultivation (former § 1105), the three aggravated-cultivating variants (§ 1105-D), and Class D possession (former § 1107) for convictions before January 30, 2017.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. TOP PRIORITY: pull the Title 16 CHRI Act (16 M.R.S. chapter 3, §§ 703-705) for the NON-conviction confidentiality rules. Chapter 310-A governs only convictions; non-conviction records (dismissals, acquittals) are handled by Title 16, which was not read. Until it is pulled, this state states NO non-conviction rules — the non-conviction node routes to a pending-pull result.
   - *Blocks no single field — affects a branch or wording.*
2. Run a 2024-2026 session sweep for amendments to chapter 310-A (Maine LD tracker by statute). Maine amends this chapter nearly every session; the read text is through 2023 c 639/666/409. In particular, confirm whether any post-2023 act EXPANDED eligibility beyond Class E — do NOT assume it did; verify.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the sealing-motion filing-fee practice. No fee is stated in the chapter for the motion; the amount and any indigency waiver are phone-tier (courts.maine.gov / the clerk of the court of conviction). The fees and feeWaiver fields are null pending this — state no numbers.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
4. Pull the Title 17-A chapter 11 offense list (the Class E crimes excluded from sealing under § 2261(6)(A)). Cited but not read; the tree screens it as a category without the specific enumeration.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. MONTANA (MT)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Misdemeanor Expungement (Mont. Code Ann. §§ 46-18-1102 to -1111); felony deferred-imposition dismissal (§ 46-18-204)** — A district court of conviction (any judicial district where a bundled offense was convicted)
- Montana Legal Services Association — https://www.mtlsa.org
- Montana Judicial Branch — Self-Help — https://courts.mt.gov/selfhelp/

**Dates that govern:**
- 2019 — Misdemeanor Expungement Clarification Act enacted (Part 11, §§ 46-18-1102 to -1111) (effective) · 2019 ch. 384 enacted the whole of Part 11 and repealed the former § 46-18-1101 (many sources still cite the dead section). No amendments through MCA 2025.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Pull the Department of Justice rules adopted under § 46-18-1111 (if findable). The statute delegates the DOJ identifying form and the expungement-processing mechanics to rule; the specific administrative rules were not read.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the district-court filing-fee practice. No fee is stated in Part 11 or § 46-18-204; the amount and any waiver are phone-tier (a Yellowstone or Missoula district clerk; courts.mt.gov publishes the self-help forms packet). The fees and feeWaiver fields are null pending this — state no numbers.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
3. Pull Mont. Code Ann. § 44-5-103 (the definition of confidential criminal justice information). § 46-18-204 makes deferred-imposition-dismissal records confidential under § 44-5-103, but the definition itself was not read — cite-only for now.
   - *Blocks no single field — affects a branch or wording.*
4. PULL-NEEDED: whether Montana provides a separate removal route for NON-conviction arrest records under Title 44, chapter 5. This was not read; the non-conviction node states no rules and routes to a pending-pull result. Do not state non-conviction rules from memory.
   - *Blocks no single field — affects a branch or wording.*
5. Pull Mont. Code Ann. § 46-18-208 (early termination of a deferred imposition), which feeds the § 46-18-204 dismissal. Cited but not read — cite-only.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. NORTH DAKOTA (ND)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Sealing / Closing (N.D. Cent. Code ch. 12-60.1; deferred imposition § 12.1-32-07.1)** — The court where the case was handled (the existing criminal case)
- North Dakota Legal Self Help Center — https://www.ndcourts.gov/legal-self-help
- Legal Services of North Dakota — https://www.legalassist.org

**Dates that govern:**
- 2019 — Conviction-sealing chapter (N.D. Cent. Code ch. 12-60.1) (effective) · Misdemeanor 3-year / felony 5-year conviction-free lookback before filing, clear-and-convincing burden; sealing reaches court and prosecution records only, not the BCI rap sheet.
- 2025-08-01 — Nonconviction court-record closing (§ 12-60.1-05) (operative) · A dismissal or acquittal of all charges entered on/after August 1, 2025 has its court record closed automatically 61 days after the order (no filing); cases disposed before this date are closed within 10 days on a free petition.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. Pull N.D.C.C. § 62.1-02-01(1)(a) — the firearm-ineligibility period that sets the length of the § 12-60.1-02(2)(a) exclusion for a violent/intimidation felony. Cited but not read; the encoding treats it as a wait-extension without stating the period.
   - *Blocks no single field — affects a branch or wording.*
2. Pull N.D.C.C. § 12.1-33-02.1 — the provision the grant order expressly preserves ("rehabilitated but subject to § 12.1-33-02.1"). What that caveat carves out was not read.
   - *Blocks no single field — affects a branch or wording.*
3. PULL-NEEDED: N.D.C.C. § 12-60-16.6 and the BCI non-conviction criminal-history-record-information rules — whether the BCI rap-sheet side has its own removal route separate from court-record sealing/closing. Not read; the encoding states only that sealing/closing does not reach the BCI record, and does not state any BCI removal rules from memory.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the conviction-sealing petition filing-fee practice. No fee is stated in ch. 12-60.1 for a conviction petition (nonconviction closing and a municipal-denial appeal are statutorily free). The fees field is null pending this phone-tier check; state no numbers.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
5. Confirm N.D. Sup. Ct. Admin. R. 41 and N.D. Rules of Court 3.4 (the court-rule mechanics for sealing/closing). Cited but not read — cite-only.
   - *Blocks no single field — affects a branch or wording.*
6. Run a quick 2025-session sweep for acts touching N.D.C.C. § 12.1-32-07.1 (deferred-imposition set-aside/restricted-access mechanics). The relevant text was read, but a targeted confirmation is worthwhile.
   - *Blocks no single field — affects a branch or wording.*

---

## 6. NEW HAMPSHIRE (NH)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Annulment (N.H. Rev. Stat. Ann. § 651:5)** — The court that handled the case
- New Hampshire Legal Assistance — https://www.nhla.org
- New Hampshire Judicial Branch — Annulments Self-Help — https://www.courts.nh.gov/self-help/annulments

**Dates that govern:**
- 2019-01-01 — Automatic annulment of dismissals/acquittals begins (RSA 651:5) (operative) · Dismissals and acquittals on or after this date are annulled automatically 30 days after disposition — no petition. A streamlined post-2019 process also applies to violations and Class B misdemeanors (20-day prosecutor objection, no DOC investigation).

**Verify — 1 open question. Each answer closes a numbered question in the database:**

1. Confirm the court filing fee amount. Diana verified RSA 651:5 against gc.nh.gov (7/16): the three statutory fees are now known — $100 DOC investigation (IX), $100 DPS record-correction, and up to $100 State Police removal (X(d)), each waived if indigent, acquitted, or dismissed. The COURT filing fee is not set by statute and remains a phone-tier item (a waiver form exists); confirm the amount with courts.nh.gov.
   - *Blocks no single field — affects a branch or wording.*

---

## 7. RHODE ISLAND (RI)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement / Sealing (R.I. Gen. Laws §§ 12-1.3-2, 12-1-12, 12-1-12.1)** — The court of conviction (Attorney General BCI in Cranston for records)
- Rhode Island Public Defender — Expungement Resource Guide — https://ripd.org
- Rhode Island Judiciary — Expungement Information — https://www.courts.ri.gov

**Dates that govern:**
- 2023-01-01 — Rule 48(a) dismissals seal by operation of law (§ 12-1-12.1(a)) (operative) · A district-court Rule 48(a) dismissal on or after January 1, 2023 is sealed by operation of law 10-20 days after dismissal, with no motion. Pre-2023 Rule 48(a) dismissals are sealed administratively by the clerk at the defendant's request.
- 2024-07-01 — Marijuana automatic-expungement sweep deadline (§ 12-1.3-5) (deadline) · The statutory sweep that automatically expunged decriminalized marijuana-possession records was required to be completed before July 1, 2024; an expedited written-request procedure covers any record not yet cleared.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the expungement filing-fee amount and where it is set. NO fee appears in the pulled §§ 12-1.3 or 12-1-12 text; the draft's $100 figure is UNCONFIRMED and may live in the judiciary fee schedule. The fees field is null pending this phone-tier / fee-schedule check. (The decriminalized and marijuana paths are statutorily free, and marijuana-incarceration cases get costs waived.)
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
2. Run a 2025-2026 session sweep for Rhode Island Clean Slate bills touching §§ 12-1.3 or 12-1-12/-12.1. Verify outcomes — do not assume any automatic-sealing expansion passed.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm what P.L. 2024 ch. 386/387 changed in § 12-1.3-1 (diff against the prior text if easily found). The current text governs either way and is what is encoded; the diff is for completeness.
   - *Blocks no single field — affects a branch or wording.*
4. Pull R.I. Gen. Laws § 12-19-19(c) (deferred-sentence mechanics) — the feeder for the § 12-1.3-2(e) no-wait deferred-sentence expungement. Cited but not read; cite-only.
   - *Blocks no single field — affects a branch or wording.*

---

## 8. SOUTH DAKOTA (SD)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (S.D. Codified Laws §§ 23A-3-26 to -37)** — The circuit court where the case was handled (DCI in Pierre for records, (605) 773-3331)
- South Dakota Unified Judicial System — Expungement Self-Help — https://ujs.sd.gov
- East River Legal Services — https://www.erlservices.org

**Dates that govern:**
- 2018 — Diversion completions auto-expunged (§§ 23A-3-35 to -37) (effective) · Wave 7 gives the year. Completed diversions are expunged automatically — no motion needed.
- 2022 — Early dismissal expungement on "compelling necessity" (effective) · Wave 7 gives the year. A dismissed case can be expunged sooner than the usual 1 year on a showing of compelling necessity.
- 2016 — Automatic-removal amended (§ 23A-3-34, SL 2016 ch 134) (effective) · Amendment history for the § 23A-3-34 automatic-removal section (Diana, statute pass 2026-07-16).
- 2021 — Automatic-removal amended (§ 23A-3-34, SL 2021 ch 106) (effective) · Amendment history for the § 23A-3-34 automatic-removal section (Diana, statute pass 2026-07-16).

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. check_deferred_sd status. The SIS cluster is verified (§§ 23A-27-13/-13.1/-13.3/-14, linked 7/16): a completed SIS is discharged and dismissed without adjudication and is NOT a conviction (§ 14). Still HELD: whether the record is SEALED traces to § 23A-27-17, not yet read — the copy says "not a conviction" (cited) + "sealing status: confirm" until Diana reads 17. Also unread: §§ 23A-27-14.1/14.2 (licensing, cited in copy) and the diversion sections §§ 23A-3-35 to -37. check_deferred_sd is a check-your-record hedge, not a computed-eligibility claim.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the circuit court filing fee, and whether any fee waiver applies. Wave 7 gives the DCI record check as $24 (Pierre, (605) 773-3331) but flags the circuit court filing fee as a per-clerk phone target and gives no waiver information. The fees and feeWaiver fields are null pending both.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`

---

## 9. VERMONT (VT)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement / Sealing (13 V.S.A. ch. 230; Act 60 of 2025)** — The court where the case was decided
- Vermont Legal Aid — Expungement Clinics (1-800-917-7787) — https://vtlawhelp.org/expungement
- Vermont Judiciary — Expungement — https://www.vermontjudiciary.org/criminal/expungement

**Dates that govern:**
- 2025-07-01 — Act 60 restructures record-clearing (13 V.S.A. ch. 230) (effective) · Total rewrite. Sealing is now primary: misdemeanors 3 yrs (down from 5), non-violent felonies 7 yrs, misdemeanor DUI 10 yrs; the burden to oppose sits on the state; the old no-new-convictions-during-the-wait rule was removed; ages 18-21 petition after 30 days. Any pre-July-2025 source is wrong.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the post-Act-60 statute against the current text. Wave 7 stresses that Act 60 (eff. July 1, 2025) rewrote everything and nearly every online guide predates it. Confirm the 3/7/10-year waits, the burden-flip (state must show sealing is contrary to the interests of justice), the removal of the no-new-convictions-during-the-wait rule, and the 18-21 30-day petition, against legislature.vermont.gov and vtcourts.gov/criminal/expungement.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the qualifying-crimes list in 13 V.S.A. § 7601(4). Wave 7 says qualifying felonies include non-violent offenses such as burglary of unoccupied dwellings, listed property crimes, drug offenses (including trafficking), and pardoned convictions, while listed violent crimes and sexual misconduct are excluded. The tree asks these; confirm the exact list.
   - *Blocks no single field — affects a branch or wording.*

---

## 10. WYOMING (WY)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Wyo. Stat. §§ 7-13-1401, 7-13-1501, 7-13-1502)** — The court that handled the case
- Wyoming Judicial Branch — Expungement Self-Help — https://www.courts.state.wy.us/expungement/
- Legal Aid of Wyoming — https://www.lawyoming.org

**Dates that govern:**
- 2020 — Under-21 nicotine offenses auto-expunged (effective) · Wave 7 gives the year. Under-21 nicotine offenses are auto-expunged 6 months after the fine is paid.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the full felony exclusion list under § 7-13-1502. Wave 7 gives violent felonies (§ 6-1-104(a)(xii)), firearm felonies (except wildlife-code), sex crimes, child endangerment, felony DUI, and drug-distribution, and flags the full list for the statute. The tree asks these as exclusions; confirm the complete set.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the non-conviction expungement fee (§ 7-13-1401). Wave 7 gives the 180-day non-conviction path but flags the fee for confirmation. The tree routes non-convictions to a 180-day result; confirm the fee with a circuit clerk (Laramie or Natrona).
   - *Blocks no single field — affects a branch or wording.*
3. Confirm whether an indigency fee waiver applies to the $100 (misdemeanor) / $300 (felony) filing fees. Wave 7 gives the fee amounts but no waiver information; the feeWaiver field is null pending confirmation with a circuit clerk.
   - *Blocks (null until answered):* `resources.remedies.expungement.feeWaiver`

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

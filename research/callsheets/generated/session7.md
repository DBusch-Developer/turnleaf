# Turnleaf — Call Session 7 (Wave 7: AK · HI · ME · MT · ND · NH · RI · SD · VT · WY)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 7`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**26 open questions across 10 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ALASKA (AK)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record relief in Alaska (CourtView removal; SIS set-aside; § 12.62.180 sealing)** — The Alaska Court System (CourtView removal) and Department of Public Safety (sealing)
- Alaska Legal Services Corporation — https://www.alsc-law.org
- Alaska Court System — Self-Help / Records Removal — https://courts.alaska.gov/shc/

**Dates that govern:**
- 2024 — Marijuana decriminalized-possession non-publication (2024) (effective) · Wave 7 gives the year. Decriminalized marijuana-possession convictions are barred from release/publication; scope and mechanics flagged for verification.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the 2024 marijuana provision's scope and mechanics. Wave 7 says decriminalized marijuana-possession convictions are barred from release/publication but flags scope/mechanics for verification. The tree routes an old marijuana-possession conviction to a "non-publication may apply" result; confirm what it covers and how it works.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm any fees for the CourtView removal (Form TF-810 / Admin Rule 40) and the § 12.62.180 sealing request, and whether waivers apply. Wave 7 gives the forms/processes but no fee information; the fees and feeWaiver fields are null pending confirmation with courts.alaska.gov and the DPS record-sealing process.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`

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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Misdemeanor Expungement (Mont. Code Ann. §§ 46-18-1102 to -1111; recodified 2019)** — The district court where the case was handled
- Montana Legal Services Association — https://www.mtlsa.org
- Montana Judicial Branch — Self-Help — https://courts.mt.gov/selfhelp/

**Dates that govern:**
- 2019 — Misdemeanor Expungement Clarification Act renumbers the statute (HB 543) (effective) · Wave 7 gives the year. HB 543 repealed § 46-18-1101 and recodified the misdemeanor-expungement law into §§ 46-18-1102 through -1111. The DOJ page and most attorneys still cite 1101 — cite the live sections.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the live statutory sections. Wave 7 flags that the 2019 Misdemeanor Expungement Clarification Act (HB 543) repealed § 46-18-1101 and recodified into §§ 46-18-1102 to -1111, but sources (including the DOJ's own page and most attorneys) still cite the dead 1101 section. The tree cites the live sections with a "recodified 2019" note; confirm against current MCA text.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the multiple-misdemeanor bundling practice. Wave 7 says a single lifetime order may cover multiple misdemeanors (the court may grant all, some, or none per § 46-18-1110), but flags practitioner-reported inconsistency between jurisdictions on whether bundling is allowed — a call question. The tree tells people to bundle everything into the one petition; confirm the practice with a district clerk.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the district court filing fee. Wave 7 flags it as a phone target (a Yellowstone or Missoula clerk). The fees and feeWaiver fields are null pending this; courts.mt.gov publishes the self-help forms packet.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`

---

## 5. NORTH DAKOTA (ND)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Sealing (N.D. Cent. Code ch. 12-60.1)** — The court where the case was handled
- North Dakota Legal Self Help Center — https://www.ndcourts.gov/legal-self-help
- Legal Services of North Dakota — https://www.legalassist.org

**Dates that govern:**
- 2019 — Sealing law enacted (N.D. Cent. Code ch. 12-60.1) (effective) · Wave 7 gives the year. Misdemeanors 3 years / felonies 5 years, conviction-free from completion; no filing fee (the statute forbids charging one).
- 2025-08-01 — Non-conviction court records auto-close (HB 1166) (operative) · Non-conviction court records auto-close 61 days after a non-conviction order entered on or after this date; older non-convictions are petitioned with a mandatory 10-day grant if requirements are met (§ 12-60.1-05).

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm HB 1166 (2025) operative details. Wave 7 says non-conviction court records auto-close 61 days after a non-conviction order entered on or after August 1, 2025, and that older non-convictions are petitioned with a mandatory 10-day grant. The tree routes post-Aug-2025 non-convictions to an auto-close "wait, do not file" result and older ones to a petition result; confirm the mechanics against ndcourts.gov.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the no-fee statutory line (ch. 12-60.1 forbids charging a filing fee) and the 61-day auto-seal of completed deferred impositions (§ 12.1-32-07.1). Wave 7 says the ndlegis.gov PDF confirms the no-fee line; confirm both against current text.
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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement / Sealing (R.I. Gen. Laws §§ 12-1.3-2, 12-1-12)** — The court of conviction (AG BCI at 4 Howard Ave, Cranston for records)
- Rhode Island Public Defender — Expungement Resource Guide — https://ripd.org
- Rhode Island Judiciary — Expungement Information — https://www.courts.ri.gov

**Dates that govern:**
- 2017 — Multi-misdemeanor expungement lane created (2017 reform, § 12-1.3-2) (effective) · Wave 7 gives the year. Allows expunging more than one but fewer than six misdemeanors (no felony) at 10 years from the last sentence; excludes DV, DUI, and chemical-test refusal.
- 2023-01-01 — Rule 48(a) dismissals auto-seal (§ 12-1-12.1(a)(1)) (operative) · Rule 48(a) dismissals on or after this date are sealed automatically; older dismissals are sealed on petition.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the multi-misdemeanor exclusion nuance. Wave 7 says the multi-misdemeanor lane excludes DV (ch. 12-29), DUI, and chemical-test refusal, but that per practitioners those offenses remain INDIVIDUALLY expungable on the single-misdemeanor path if the person otherwise qualifies. The tree routes a multi-misdemeanor record containing one of those to a "get help — this is nuanced" result; confirm the individual-path availability.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the status of marijuana auto-expungement (§ 12-1.3-5). Wave 7 flags its operational status. The tree does not assert automatic marijuana clearing; confirm whether the automation is running and how someone checks.
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

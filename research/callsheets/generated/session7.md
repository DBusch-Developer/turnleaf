# Turnleaf — Call Session 7 (Wave 7: AK · HI · ME · MT · ND · NH · RI · SD · VT · WY)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 7`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**25 open questions across 10 states.**

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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Administrative Expungement (Haw. Rev. Stat. § 831-3.2)** — HCJDC Expungement Section, (808) 587-3348, 465 S. King St. Rm 102, Honolulu (and the sentencing court for a conviction order)
- HCJDC Expungement Section — (808) 587-3348 — https://ag.hawaii.gov/hcjdc/expungement/
- Legal Aid Society of Hawaii — https://www.legalaidhawaii.org

**Dates that govern:**
- 2025-07-01 — Act 003 auto-transmit for court-record sealing begins (HRS ch. 831) (operative) · HCJDC now auto-transmits expungement orders to the Judiciary to seal the court record on eCourt Kokua. Certificates issued before July 2025 still require a separate request to the court; sealing can be denied if co-defendants or non-expunged charges share the case.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Resolve the prostitution-deferral waiting period. Wave 7 flags a one-digit conflict: the HCJDC application PDF says 3 years, while HCJDC's current web page says 4 years, for expunging a prostitution (HRS 712-1200) deferred plea. The tree uses the general 1-year deferred-plea wait and notes prostitution deferrals are a special longer case; resolve the 3-vs-4 by phone.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm Act 003 auto-transmit is working in practice. Wave 7 says that since July 1, 2025 HCJDC auto-transmits expungement orders to the Judiciary for court-record sealing, but flags whether this is actually operational. The tree tells post-July-2025 applicants the court step is automatic and pre-July-2025 certificate-holders to make a separate court request; confirm the handoff works.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm whether HCJDC offers any fee reduction or waiver for the $35 (first-time) / $50 (repeat) administrative fee. Wave 7 gives the fee amounts but says nothing about a waiver; the feeWaiver field is null pending confirmation with the Expungement Section ((808) 587-3348).
   - *Blocks (null until answered):* `resources.remedies.expungement.feeWaiver`

---

## 3. MAINE (ME)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Seal (15 M.R.S. ch. 310-A, §§ 2261-2265)** — The court of conviction
- Pine Tree Legal Assistance — https://www.ptla.org
- Maine Judicial Branch — Fees & Forms — https://www.courts.maine.gov/fees-forms/forms.html

**Dates that govern:**
- 2024 — Age cap (18-27) for Class E sealing removed (HP1435) (effective) · Wave 7 gives the year only. The old 18-to-27 age limitation was removed in 2024; ALL Class E convictions except sexual assault are now sealable regardless of age. Most online guides still state the age cap — encode from the current statute.
- 2026-01-11 — Sealing for sex-trafficking/exploitation-related convictions (LD 1871) (effective) · Enacted Jan 11, 2026. Any conviction substantially resulting from sex trafficking or sexual exploitation is sealable anytime, no waiting period; documentation creates a presumption. Two weeks old in legislative terms — confirm operative status.
- 2017-01-30 — Marijuana-sealing cutoff (Class D/E convictions before this date) (effective) · Class D and E marijuana convictions from BEFORE January 30, 2017 are sealable.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the 2024 removal of the age cap for Class E sealing (HP1435) against the current 15 M.R.S. § 2261 text. Wave 7 calls this "discrepancy gold" — most online guides and both major court-records sites still state the old 18-to-27 age limitation. The tree encodes the repeal (no age question); confirm it against the statute.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the ~$5 filing fee is current. Wave 7 gives it as the cheapest in the nation (Motion CR-218) but flags it for confirmation. The fees field encodes ~$5 and flags this; courts.maine.gov is the check.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm LD 1871 (sex-trafficking/exploitation sealing, enacted Jan 11, 2026) is operative, and confirm whether any indigency fee waiver applies to the sealing motion. Wave 7 gives LD 1871 as two weeks old and gives no waiver information; the feeWaiver field is null pending confirmation.
   - *Blocks (null until answered):* `resources.remedies.expungement.feeWaiver`

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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Annulment (N.H. Rev. Stat. Ann. § 651:5)** — The court that handled the case
- New Hampshire Legal Assistance — https://www.nhla.org
- New Hampshire Judicial Branch — Annulments Self-Help — https://www.courts.nh.gov/self-help/annulments

**Dates that govern:**
- 2019-01-01 — Automatic annulment of dismissals/acquittals begins (RSA 651:5) (operative) · Dismissals and acquittals on or after this date are annulled automatically 30 days after disposition — no petition. A streamlined post-2019 process also applies to violations and Class B misdemeanors (20-day prosecutor objection, no DOC investigation).

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the Class B misdemeanor waiting period against current RSA 651:5(III). Wave 7 flags a conflict: the statute historically said 3 years, but some current summaries say 1 year. Because the value conflicts, the tree routes Class B misdemeanors to an "exact wait needs confirming" result rather than guess — do not resolve from a model reading. Confirm the current statutory text.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the court filing fee. Wave 7 gives $125 per court location from the official Judicial Branch checklist, but notes some guides say $100. The fees field encodes $125 (the official checklist) and flags the conflict; confirm with courts.nh.gov. Also confirm the DOC investigation fee amount and the ~$25 record-copy fee.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the multi-conviction sequencing rule. Wave 7 says annulment is barred until the time requirement is met for ALL offenses of record, and barred entirely if any conviction is in a never-eligible class — but State v. Williams (2020) lets a person petition the latest-occurring offense first and work backwards. The tree routes people with more than one conviction to a "get sequencing help" result; confirm the Williams approach and how courts apply it.
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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave7_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (S.D. Codified Laws §§ 23A-3-26 to -37)** — The circuit court where the case was handled (DCI in Pierre for records, (605) 773-3331)
- South Dakota Unified Judicial System — Expungement Self-Help — https://ujs.sd.gov
- East River Legal Services — https://www.erlservices.org

**Dates that govern:**
- 2018 — Diversion completions auto-expunged (§§ 23A-3-35 to -37) (effective) · Wave 7 gives the year. Completed diversions are expunged automatically — no motion needed.
- 2022 — Early dismissal expungement on "compelling necessity" (effective) · Wave 7 gives the year. A dismissed case can be expunged sooner than the usual 1 year on a showing of compelling necessity.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Resolve the automatic-removal waiting period. Wave 7 flags that sources split 5 vs 10 years for § 23A-3-34 automatic removal of petty offenses, municipal violations, and Class 2 misdemeanors — encode from current statute text only. The tree routes those to a "check whether it is already off your record" result without asserting a specific year; confirm the exact period against the current statute.
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

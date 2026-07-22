# Turnleaf — Call Session 6 (Wave 6: AR · IA · ID · KS · KY · MS · NE · NM · NV · OR · WV)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 6`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**52 open questions across 11 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ARKANSAS (AR)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record Sealing (Comprehensive Criminal Record Sealing Act, A.C.A. § 16-90-1401 et seq.)** — The circuit or district court where the case was decided (county of conviction; county of arrest for an uncharged arrest)
- Legal Aid of Arkansas — https://arlegalaid.org
- Center for Arkansas Legal Services — https://arlegalservices.org

**Dates that govern:**
- 2013 — Comprehensive Criminal Record Sealing Act of 2013 (§ 16-90-1401 et seq.) (effective) · Year precision only — the Act's name carries 2013 and § 16-90-1405(c) extends misdemeanor sealing to offenses committed before 2014, but the pulled text does not give a day. Do not pad it.
- 2026 — Sealing statutes current through the First Extraordinary Session of 2026 (effective) · The verified text of §§ 16-90-1404–1417, § 5-65-111, and §§ 16-93-301–303 is current through the 1st Ex. Sess. 2026 per the Lexis public-access banner. Whether the 2025 regular session or the 1st Ex. Sess. 2026 amended any pulled section is an open question.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. What is the filing fee to seal a record in Arkansas, and is a fee waiver available? The pulled sealing statutes (§§ 16-90-1404–1417) do not state a fee. The draft's "no fee since Act 680 (2019)" claim is NOT confirmed in the statute text read here, so it stays phone-tier — confirm the current amount and any indigency waiver with a circuit clerk before flipping this.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
2. What are the exact ACIC uniform petition and order forms and where does a person get them? § 16-90-1414 governs the statewide uniform petition/order but was cite-only (not pulled), so the specific form identifiers and any ACIC filing requirements are unverified. Do not construct a form URL — confirm the official one.
   - *Blocks (null until answered):* `resources.remedies.sealing.formUrl`
3. TOC check: §§ 16-90-1401, -1402, -1403 (short title/legislative intent/definitions preamble), -1412, -1418, -1419 were not pulled. Confirm none of them carries an operative rule that changes the encoded paths.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the DWI/BWI sealing wait CALCULATION with a court clerk. § 5-65-111 anchors its enhancement/lookback windows to the FIRST offense date and does not spell out a per-conviction sealing anchor; the messaging treats the 10-year window as running from the first offense but flags this as an interpretation to confirm.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm no 2025 regular-session or 1st Ex. Sess. 2026 amendment altered §§ 16-90-1404–1417, § 5-65-111, or §§ 16-93-301–303 beyond the version read here (the Lexis banner says the text is current, but a targeted session sweep is the confirm-kill).
   - *Blocks no single field — affects a branch or wording.*

---

## 2. IOWA (IA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Iowa Code ch. 901C; deferred judgments § 907.9)** — The court where the criminal case was filed
- Iowa Legal Aid — https://www.iowalegalaid.org
- Iowa Judicial Branch — Court Forms — https://www.iowacourts.gov/for-the-public/court-forms/

**Dates that govern:**
- 2019 — Misdemeanor-conviction expungement enacted (Iowa Code § 901C.3) (effective) · Wave 6 gives the year only. Since 2019, a single misdemeanor conviction can be expunged 8 years after conviction — once per lifetime.
- 2013-07 — Automatic expungement of completed deferred judgments (Iowa Code § 907.9) (operative) · Wave 6 gives month and year. Deferred judgments completed after July 2013 are expunged automatically; earlier ones (and some rural unsupervised-probation cases) may need a motion.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the filing fee for Chapter 901C petitions. Wave 6 found no statutory filing fee for 901C petitions and flags it for a clerk (Polk County) — the petition is filed in the criminal case. The fees and feeWaiver fields are null pending this.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
2. Confirm the full list of ~25 excluded misdemeanor categories under Iowa Code § 901C.3. Wave 6 gives OWI (§ 321J.2), assault variants, harassment, stalking, weapons (ch. 724), and sex offenses among them, and flags the complete list as needing the statute. The tree asks these as exclusions; confirm the full set.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. IDAHO (ID)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Idaho record relief (ISP expungement § 67-3004(10); shielding § 67-3004(11); withheld-judgment dismissal § 19-2604)** — Idaho State Police (BCI) for non-convictions; the district court for shielding and withheld-judgment motions
- Idaho Legal Aid Services — https://www.idaholegalaid.org
- Idaho Courts — Self-Help — https://www.courtselfhelp.idaho.gov

**Dates that govern:**
- 2023 — Conviction shielding created (§ 67-3004(11), HB 149) (effective) · Wave 6 gives the year only. HB 149 created a new shielding remedy for one non-violent-misdemeanor or felony-drug-possession conviction after 5 conviction-free years. Fresh law that most older guides do not reflect — they still say Idaho has no conviction relief.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the § 67-3004(11) shielding rule (HB 149, 2023): ONE conviction, either a non-violent misdemeanor or a felony drug-possession, petitioned after 5 conviction-free years from full sentence completion (probation, parole, fines, restitution), under a "held accountable" standard; the record is hidden from public view and deniable, but law enforcement retains access; assaultive/violent misdemeanors are excluded. Wave 6 flags this as fresh-law discrepancy material. The tree encodes it; confirm against the statute and district practice (Ada County).
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the fees. Wave 6 says the § 67-3004(10) ISP administrative non-conviction request appears to be free (documentation only), and flags the § 67-3004(11) shielding petition as a court filing whose fee is a phone target. The fees and feeWaiver fields are null pending both.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`

---

## 4. KANSAS (KS)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Kan. Stat. Ann. § 21-6614; arrests § 22-2410; municipal § 12-4516)** — The convicting court (municipal court for a city ordinance; district court for an arrest record)
- Kansas Legal Services (free expungement clinics; kls_expunge@klsinc.org) — https://www.kansaslegalservices.org
- Kansas Judicial Council — Expungement Forms — https://www.kansasjudicialcouncil.org

**Dates that govern:**
- 2021 — Expungement restores firearm rights (K.S.A. 21-6614(k)(2)) (effective) · Year precision. A Kansas expungement of a disqualifying record fully restores firearm rights (use, transport, receive, purchase, transfer, possess), applies retroactively to pre-2021 orders, and the KBI must have the record withdrawn from NICS.
- 2026 — Docket-fee surcharge authority extended through 6/30/2030 (2026 HB 2393) (effective) · 2026 HB 2393 (signed 4/3/2026) extended the supreme-court non-judicial-personnel surcharge (up to $19) through June 30, 2030, amending 21-6614 and 22-2410; the up-to-$195 total is current law. The displayed statute text still shows the pre-extension 6/30/2025 sunset — enrolled-text integration pending.
- 2026 — Insurance-fraud expunged-record disclosure added (2026 HB 2323) (effective) · 2026 HB 2323 (signed 4/6/2026, effective on statute-book publication) requires disclosure of an expunged insurance-fraud arrest/conviction/diversion in applications for licensure as an insurance producer or public adjuster; added to the 21-6614(i)(2) disclosure list. Exact subsection wording pending the enrolled-text pull.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. Check the status and effect of 2026 SB 430 (reconciliation) — specifically whether it restructured the text of K.S.A. 21-6614 or 12-4516. Encoded from the through-2023 statute text plus the confirmed 2026 amendments; a reconciliation bill could renumber or move provisions.
   - *Blocks no single field — affects a branch or wording.*
2. Check the statuses of 2026 SB 245 and SB 240 (Senate companions of HB 2272 aggravated murder and HB 2323 insurance-fraud disclosure). HB 2272 died and HB 2323 was enacted per the House bill pages; confirm the Senate companions did not enact anything divergent.
   - *Blocks no single field — affects a branch or wording.*
3. Pull the enrolled subsection wording of 2026 HB 2323. The effect (insurance-producer/public-adjuster disclosure of an expunged fraudulent-insurance-act record) is encoded in the 21-6614(i)(2) disclosure messaging; the exact statutory subsection language is pending.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm whether the Kansas Supreme Court currently imposes the up-to-$19 non-judicial-personnel surcharge (making the total $195 vs the $176 base). HB 2393 preserved the authority through 2030; whether it is presently levied is a phone-tier question (district clerk).
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the KBI post-grant processing timeline. The draft estimates 8-12 weeks after the order; verify with the KBI (phone-tier).
   - *Blocks no single field — affects a branch or wording.*
6. Confirm municipal expungement fee amounts. Under 12-4516(g)(2) each city court MAY prescribe its own fee, so this is per-city and phone-tier — no single statutory number.
   - *Blocks no single field — affects a branch or wording.*
7. Read K.S.A. 22-4908 (relief from the Kansas Offender Registration Act registration requirement). Cited as the route out of the 21-6614(f) registration bar but not pulled; its mechanics are cite-only for now.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. KENTUCKY (KY)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Certificate of Eligibility (Ky. Rev. Stat. § 431.079 — required for conviction expungements)** — Kentucky State Police / Administrative Office of the Courts
- **Drug-Possession Voiding and Sealing (Ky. Rev. Stat. §§ 218A.275, 218A.276)** — The court where the conviction was entered
- **Misdemeanor Expungement (Ky. Rev. Stat. § 431.078; certificate § 431.079)** — The court of conviction (or the county-of-residence District Court for pre-1992 convictions)
- **Felony Vacate-and-Expunge (Ky. Rev. Stat. § 431.073; certificate § 431.079)** — The court where the conviction was entered (motion in the original case)
- **Non-Conviction Expungement (Ky. Rev. Stat. § 431.076)** — The court where the case was heard
- Kentucky Department of Public Advocacy — Expungement Guide — https://dpa.ky.gov
- expungeky.com (eligibility FAQ) — https://expungeky.com

**Dates that govern:**
- 2020-07-15 — Automatic non-conviction expungement begins (KRS § 431.076(1)(a)) (operative) · For dispositions on or after this date, an acquittal or a dismissal-with-prejudice of ALL charges (not in exchange for a guilty plea to another charge) is expunged automatically 30 days after the case ends, unless the person objects. NOT retroactive — earlier dispositions use the petition tier.
- 2027-04-30 — KRS § 431.073 current text effective until this date (operative) · The 2023 ch. 87 text of the felony vacate-and-expunge statute is effective until April 30, 2027; a successor version takes over after that and has not been pulled (open question a). Encode the current text; re-verify the felony path before 4/30/2027.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. SUCCESSOR VERSION of KRS § 431.073: the encoded text is the 2023 ch. 87 version, effective only until April 30, 2027. Pull the successor version and diff the felony vacate-and-expunge rules (list, exclusions, fees, burden modes) before that date — the current print expires.
   - *Blocks no single field — affects a branch or wording.*
2. 2024–2026 session sweep for the non-felony sections: § 431.076 is encoded through 2020 ch. 45, § 431.078 through 2016 ch. 94, and § 431.079 through 2019 ch. 188. Confirm no later (2024–2026) public act amended them before any UI copy claims completeness.
   - *Blocks no single field — affects a branch or wording.*
3. KSP § 431.079 Certificate of Eligibility fee: the statute sets the certification requirement but the fee AMOUNT is fixed by KSP regulation, not the statute text. Confirm the current amount (phone tier).
   - *Blocks (null until answered):* `resources.remedies.certificate.fees`
4. KRS § 27A.099 (the sealing-exception cited in the drug-voiding sealing provisions of §§ 218A.275/218A.276) was not pulled — confirm what access it preserves to sealed drug records.
   - *Blocks no single field — affects a branch or wording.*
5. KRS § 218A.14151 (deferred-prosecution) was not pulled — it is the disqualifier for a § 218A.275 first-offense set-aside (a prior 14151 dismissal bars it). Cite-only feeder; confirm its mechanics.
   - *Blocks no single field — affects a branch or wording.*
6. Whether a § 431.076 non-conviction expungement carries any court filing fee in practice: no fee appears in the statute text and the § 431.079 certification does not apply, so it is encoded as free — confirm at the clerk (phone tier).
   - *Blocks (null until answered):* `resources.remedies.nonConviction.fees`

---

## 6. MISSISSIPPI (MS)

**Status:** `statute_cited` · reviewed 2026-07-22 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expunction (Miss. Code Ann. § 99-19-71)** — The justice, county, circuit, or municipal court that handled the case
- Mississippi Center for Justice — https://www.mscenterforjustice.org
- Mission First Legal Aid Office — https://missionfirst.org

**Dates that govern:**
- 2026-07-01 — 2026 HB 1546 (Ch. 430) effective — felony wait cut 5→3 years, exclusions expanded to 12, trafficking-survivor path added (effective) · Approved 3/30/2026, effective July 1, 2026. Amended § 99-19-71(2) (five-year wait reduced to three; added procuring/promoting prostitution to the exclusion list) and §§ 97-3-54.1, 97-3-54.6 (survivor expungement/vacatur). Encoded from the enrolled Ch. 430 text.
- 2026-02-03 — Automatic-expungement bill HB 1344 died in committee (deadline) · The third failed automatic-expungement bill in three sessions (after 2024 HB 801 and 2025 HB 1117). Recorded to support the "no automation — you must petition" encoding; per billstatus.ls.state.ms.us.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. Do clerks in practice charge the $150 § 99-19-72 fee on NON-conviction petitions? By the statute's terms the non-conviction path is subsection (4) OF § 99-19-71, so the fee attaches; whether clerks actually collect it on dismissal/acquittal petitions is a practice question (phone-tier, Hinds circuit clerk).
   - *Blocks no single field — affects a branch or wording.*
2. Pull the § 97-3-2 crime-of-violence list. It defines the felony exclusion (§ 99-19-71(2)(i)), the trafficking-survivor crime-of-violence carve-out (§ 97-3-54.6(6)), and the § 99-15-26 non-adjudication exclusion; encoded as a cite-only reference until read.
   - *Blocks no single field — affects a branch or wording.*
3. Read § 97-11-31, referenced as a § 99-15-26 non-adjudication exclusion. Cited but not pulled — confirm its scope.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the petition-to-order timeline (how long after filing a court rules) — not stated in the pulled sections; phone-tier (clerk/practice).
   - *Blocks no single field — affects a branch or wording.*
5. Resolve the § 41-29-150(d)(2) interpretive question: the disjunctive "or had satisfactorily served his sentence" arguably extends expunction to a SERVED first-time possession conviction, not just a completed conditional discharge. Attorney-tier; encoded as a messaging flag only, no routing claim.
   - *Blocks no single field — affects a branch or wording.*
6. Has the public code container integrated 2026 Ch. 430 yet? At retrieval (7/22/2026) legislature.ms.gov still served the pre-7/1/2026 version of § 99-19-71, so it was encoded from the enrolled act. Recheck the container text at the next sweep and drop the § 99-19-71 sourceNote once it matches.
   - *Blocks no single field — affects a branch or wording.*
7. Does a pauper's/indigency waiver apply to the $150 § 99-19-72 fee? The fee amount is statutory; the pulled text says nothing about a waiver, so feeWaiver is null pending confirmation with a circuit clerk (Hinds).
   - *Blocks (null until answered):* `resources.remedies.expunction.feeWaiver`

---

## 7. NEBRASKA (NE)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Set-Aside of a Conviction (Neb. Rev. Stat. § 29-2264)** — The court that entered the conviction
- Legal Aid of Nebraska — Clean Slate Program (AccessLine) — https://www.legalaidofnebraska.org
- Nebraska Judicial Branch — Self-Help — https://supremecourt.nebraska.gov/self-help

**Dates that govern:**
- 2020 — Set-aside extended to imprisonment of 1 year or less (LB 881) (effective) · Wave 6 gives the year only. Before LB 881, set-aside was limited to probation/fine/community-service sentences; it now also reaches completed imprisonment of one year or less.
- 2021 — Pardoned convictions become sealable (effective) · Wave 6 gives the year only. A pardoned conviction can now be sealed — one of the few things in Nebraska that actually comes off the public record.
- 2024 — Voting restored automatically on sentence completion (LB20) (effective) · Wave 6 gives the year only. LB20 ended the former 2-year waiting period; voting rights are restored automatically once the sentence is complete. An adjacent-rights fact, not part of set-aside.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the § 29-2264 set-aside conditions: eligible for probation/fine/community-service sentences, or (since LB 881, 2020) completed imprisonment of one year or less; not still pending; not registrable; not vehicular homicide; and no set-aside denial in the past 2 years. It is discretionary (Brunsen factors). The tree routes on sentence type and these exclusions; confirm against the statute.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm whether a set-aside restores firearm rights, and the county-practice split on domestic-violence misdemeanors. Wave 6 says firearms are NOT restored by a set-aside (that needs the pardon board) and flags live litigation with counties split on DV misdemeanors. The tree tells people firearms are not restored; confirm the current state of that litigation.
   - *Blocks no single field — affects a branch or wording.*

---

## 8. NEW MEXICO (NM)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Criminal Record Expungement Act, N.M. Stat. § 29-3A)** — The district court where the case was decided
- New Mexico Legal Aid — https://www.newmexicolegalaid.org
- New Mexico Courts — Self-Help / Expungement — https://www.nmcourts.gov

**Dates that govern:**
- 2020-01-01 — Criminal Record Expungement Act takes effect (§ 29-3A) (effective) · One of the nation's broader expungement laws when passed. 2021 amendments added motor-vehicle penalty assessments and allowed one petition to cover multiple records in a district.
- 2021 — Automatic cannabis expungement (§ 29-3A-8; HB 314) (operative) · Wave 6 gives the year (with a 2023 HB 314 update). Possession of 2 oz or less is to be expunged automatically 2 years after conviction/arrest — operational status flagged for verification.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Verify the operational status of automatic cannabis expungement (§ 29-3A-8, 2021 + 2023 HB 314). Wave 6 says possession of 2 oz or less should be expunged automatically 2 years after conviction/arrest — New Mexico's only automation — but flags that the automation actually running needs confirmation (call DPS or the Second Judicial District). The tree routes cannabis to a "check whether it is already off" result; confirm the program is live.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the filing fee. Wave 6 notes CREA sets no statutory fee, so a district court civil filing fee applies (~$132 historically) — a phone target. The fees and feeWaiver fields are null pending this; nmcourts.gov and a district clerk are the checks.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
3. Confirm the full conviction waiting-period ladder from § 29-3A-5, against the flattened version many blogs give. Wave 6 gives: municipal/most misdemeanors 2 yrs; misdemeanor aggravated battery and 4th-degree felonies 4 yrs; 3rd-degree 6 yrs; 2nd-degree 8 yrs; 1st-degree and Crimes Against Household Members Act (DV) offenses 10 yrs. The tree encodes this full ladder; confirm against the statute.
   - *Blocks no single field — affects a branch or wording.*

---

## 9. NEVADA (NV)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Reentry-Program Sealing (Nev. Rev. Stat. § 179.259)** — The court where the conviction was entered
- **Record Sealing (Nev. Rev. Stat. §§ 179.245, 179.255)** — The court where the case was decided
- **Decriminalized-Offense Sealing Request (Nev. Rev. Stat. § 179.271)** — The court that entered the conviction
- Nevada Legal Services — Record Sealing Manual — https://nevadalegalservices.org
- Legal Aid Center of Southern Nevada — https://www.lacsn.org

**Dates that govern:**
- 2025 — NRS 179.245 conviction-sealing text current through 2025 Stats. 773 (effective) · Diana read § 179.245 through 2025 Stats. 773. The delta of that chapter is integrated into this print; note only (open question f).
- 2017 — Marijuana decriminalization opens the free § 179.271 sealing request (effective) · Records of now-decriminalized minor cannabis possession are sealed by a free written REQUEST to the convicting court under § 179.271, not the general § 179.245 petition.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. REQUIRED PULLS: NRS 179.2445 (the rebuttable-presumption text, and any crime-of-violence definition it carries) and NRS 179.301 (the exceptions to the effect of sealing — likely where gaming/licensing carve-outs live). The presumption mechanics here are encoded from § 179.245(4)/§ 179.255(6), and the effect copy is kept qualified until § 179.301 is read.
   - *Blocks no single field — affects a branch or wording.*
2. Unpulled cross-referenced routes (cite-only until read): NRS 179.247, 179.2595, 453.3365 (drug set-aside sealing), 176.211 / 176A.245 / 176A.265 / 176A.295 (deferred/probation feeders), 201.354, 34.970, 174.034.
   - *Blocks no single field — affects a branch or wording.*
3. Whether NRS chapter 179 contains a refile-after-denial waiting rule (check the table of contents around § 179.265). Do not assert one until confirmed.
   - *Blocks no single field — affects a branch or wording.*
4. County filing-fee amounts for a § 179.245/§ 179.255 sealing petition are not stated in the text — they vary by county (phone tier). Note: a sex-trafficking victim (§ 179.245(9)) pays NO fee of any kind.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`
5. NRS 179D.0357 (the crime-against-a-child list that the § 179.245(6) never-list references) was not pulled — cite-only; the tree asks the person to self-assess "crime against a child."
   - *Blocks no single field — affects a branch or wording.*
6. Delta of 2025 Stats. 773 versus the prior § 179.245 text is integrated into this print; note only — confirm no substantive change to the encoded tiers/exclusions was missed.
   - *Blocks no single field — affects a branch or wording.*
7. Is there a petition FORM for a § 179.259 reentry-program sealing, or is the petition drafted from the statute? No reentry-specific form was found statewide (selfhelp.nvcourts.gov lists no criminal record-sealing forms at all), in Clark County, or in the NV Legal Services manual. Ask a district court clerk which document they expect. The answer may legitimately be "no form exists" — in which case formUrl stays null permanently and the steps should say so.
   - *Blocks (null until answered):* `resources.remedies.reentry.formUrl`

---

## 10. OREGON (OR)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Set Aside a Conviction (ORS 137.225)** — The court of conviction (arrest/declination motions: the county of arrest); Oregon State Police for the record check
- **Marijuana Set-Aside Fast Paths (ORS 137.226)** — The court of conviction; Oregon State Police for the record check
- Legal Aid Services of Oregon (1-800-351-7248) — https://lasoregon.org
- Oregon Judicial Department — Self-Help / Forms — https://www.courts.oregon.gov/self-help

**Dates that govern:**
- 2022-01-01 — SB 397 set-aside overhaul effective (ORS 137.225) (effective) · Shortened the waits (Class B felony to 7 years, etc.), eliminated the court filing fee, and made grant presumptive. Many older convictions became newly eligible — a key "you may already qualify" fact.
- 2025-09-26 — Pre-7/1/2015 sub-ounce marijuana fine obligations expire (2025 c.395) (operative) · The 2025 c.395 session note: monetary obligations on pre-7/1/2015 sub-ounce marijuana municipal/justice-court judgments expired on this date and are deemed satisfied for set-aside purposes — those unpaid fines no longer block the sentence-completion gate.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. Oregon Criminal Justice Commission person-felony / person-misdemeanor definitions (OAR crime-category rules) are cross-referenced by ORS 137.225(5)/(6) but not pulled — the tree asks the person to self-assess "person felony." Pull the OAR crime-category list before any UI claims a definitive person-felony determination.
   - *Blocks no single field — affects a branch or wording.*
2. Oregon State Police criminal-record-check fee amount for conviction set-aside motions: ORS 137.225(2)(d) sets it at OSP actual cost (capped), one fee total across counties, but the dollar amount is in OSP practice, not the statute. Confirm the current amount (phone tier).
   - *Blocks no single field — affects a branch or wording.*
3. ORS 166.429 (the Class B felony carve-out that stays excluded) and ORS 475.896 (the drug-enforcement-misdemeanor possession excluded from the cleanliness lookback) were not pulled — cite-only until confirmed.
   - *Blocks no single field — affects a branch or wording.*
4. ORS 475C.397 (a separate marijuana conviction set-aside route referenced by the 2025 c.395 material) was not pulled — flag as a possible parallel path to 137.226 and confirm whether it offers broader or different relief.
   - *Blocks no single field — affects a branch or wording.*
5. ORS 163A.140 / 163A.145 / 163A.150 (the sex-offender reporting-relief mechanics that open the (6)(A) sex-crime exception) were not pulled — cite-only; the tree asks whether reporting relief was granted rather than screening its criteria.
   - *Blocks no single field — affects a branch or wording.*
6. The exact delta of 2025 c.349 versus the prior ORS 137.225 text is integrated into this 2025-edition print; note only — confirm no substantive change to the encoded waits/exclusions was missed.
   - *Blocks no single field — affects a branch or wording.*
7. Juvenile set-aside (ORS 419A series) was not pulled — out of scope for this pass; route juvenile matters to counsel.
   - *Blocks no single field — affects a branch or wording.*

---

## 11. WEST VIRGINIA (WV)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (W. Va. Code §§ 61-11-25, 61-11-26, 61-11-26a)** — The circuit court where the case was decided (Kanawha County is a reference for fee confirmation)
- Legal Aid of West Virginia — https://www.lawv.net
- Jobs & Hope WV (acceleration-lane program hub) — https://jobsandhope.wv.gov

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the SCA-C900 "only once" language and its SCOPE. Wave 6 flags this: the Supreme Court's official petition instructions say a person may request expungement under §§ 61-11-26/26a only once, but it is unclear whether that means once per person for life or once per statute/petition. It changes strategy the way Indiana's one-petition rule does. The tree routes people who have already expunged once to a "confirm this before you spend your one request" result; confirm the scope with a circuit clerk (Kanawha).
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the full § 61-11-26(c) exclusion list. Wave 6 gives violent felonies, felonies with minor victims, sexual offenses, deadly-weapon offenses, DV assault/battery, DUI, driving-suspended, and CDL offenses, and flags the (c) list as needing the full statutory text. Also confirm the note that an old DUI (5+ years) does not itself block expunging a separate, eligible felony. The tree asks these as exclusions; confirm the list against current § 61-11-26(c).
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the circuit court filing fee amount (it varies by county). Wave 6 gives the $100 State Police records-division fee (§ 61-11-26(n), waived on the 26a acceleration lane) but flags the separate circuit court filing fee as a per-county phone target. The fees field is null pending this; a Kanawha circuit clerk is the check.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
4. Confirm West Virginia has NOT enacted automatic expungement. Wave 6 says to check whether any 2024-26 automation bill (HB 4344-era proposals) moved, and to encode "petition-only" unless a call says otherwise. The tree is petition-only throughout; confirm no automation program is live.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

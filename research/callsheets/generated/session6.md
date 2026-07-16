# Turnleaf — Call Session 6 (Wave 6: AR · IA · ID · KS · KY · MS · NE · NM · NV · OR · WV)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 6`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**32 open questions across 11 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ARKANSAS (AR)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record Sealing (Comprehensive Criminal Record Sealing Act, Ark. Code § 16-90-1401 et seq.)** — The court where the case was decided
- Legal Aid of Arkansas — https://arlegalaid.org
- Center for Arkansas Legal Services — https://arlegalservices.org

**Dates that govern:**
- 2019-07 — Filing fee eliminated statewide (Act 680) (effective) · Wave 6 gives month and year. Since July 2019 there has been no filing fee to seal a record in Arkansas (confirmed by Legal Aid of Arkansas).

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the short list of more serious misdemeanors that carry a 5-year wait (rather than immediate sealing). Wave 6 gives negligent-homicide A-misdemeanor, third-degree battery, indecent exposure, and DV-adjacent offenses among them, and flags the full list for the statute (§ 16-90-1405). The tree asks a "serious misdemeanor" question routing to a 5-year wait; confirm the list.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the misdemeanor-DWI 10-year wait. Wave 6 gives it per Legal Aid of Arkansas and flags it as a surprisingly long outlier needing confirmation. The tree routes a misdemeanor DWI to a 10-year wait; confirm against the statute.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm that non-convictions (arrests, nolle prosequi, dismissals, acquittals) are sealable with NO waiting period under §§ 16-90-1409/1410. Wave 6 gives this but flags it for confirmation. The tree routes non-convictions to an immediate result; confirm.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the one-prior-felony cap and how same-episode felonies count. Wave 6 says sealing allows at most one prior felony conviction, with same-episode felonies counting as one, and flags persona 3 (two separate felony convictions) as an analysis branch. The tree routes people with more than one prior felony to a "get an analysis" result; confirm the rule (§ 16-90-1406).
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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Kan. Stat. Ann. § 21-6614)** — The court that handled the case
- Kansas Legal Services (free expungement clinics; kls_expunge@klsinc.org) — https://www.kansaslegalservices.org
- Kansas Judicial Council — Expungement Forms — https://www.kansasjudicialcouncil.org

**Dates that govern:**
- 2021 — Expungement restores firearm rights (K.S.A. 21-6614(k)(2)) (effective) · Wave 6 gives the year only. A Kansas expungement restores firearm rights — rare among states, and worth knowing.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the docket fee. Wave 6 flags a conflict: the statute text says $176, while current guides and Judicial Council materials say $195 (set by a Supreme Court order that updates over time). The fees field is null pending this; a district clerk is the check. (The fee is waived for non-convictions, and a poverty affidavit is available.)
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
2. Confirm the exact waiting period for a second-or-later DUI. Wave 6 gives it as a 7-to-10-year range, which is not a single number; the tree routes a 2nd+ DUI to an "exact period needs confirming" result rather than guess. Confirm the precise period against K.S.A. 21-6614.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. KENTUCKY (KY)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement (Ky. Rev. Stat. §§ 431.073, 431.076, 431.078; certificate § 431.079)** — The court of conviction; KSP/AOC for the Certificate of Eligibility
- Kentucky Department of Public Advocacy — Expungement Guide — https://dpa.ky.gov
- expungeky.com (eligibility FAQ) — https://expungeky.com

**Dates that govern:**
- 2020-07-15 — Automatic non-conviction expungement begins (KRS § 431.076) (operative) · Acquittals and dismissals-with-prejudice on or after this date are expunged automatically, 30 days after the case ends — no petition, no certificate. Does NOT cover plea-deal dismissals. Older cases use the petition route.
- 2023-06-29 — Amendment allowing MULTIPLE Class D felony expungements (KRS § 431.073) (effective) · The 2023 amendment repealed the once-per-lifetime limit; a person may now expunge more than one qualifying Class D felony. Older guides still say once-only — encode from the amended statute. Flagged for confirmation against current text.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the full KRS § 431.078 misdemeanor exclusion list. Wave 6 gives 5-year eligibility for most misdemeanors/violations but excludes sex offenses and offenses against children, and flags the full exclusion list as needing the statute text. The tree asks a sex-offense/child-offense exclusion; confirm the complete list.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the 2023 amendment (eff. Jun 29, 2023) to KRS § 431.073 allows expunging MULTIPLE qualifying Class D felonies, not one per lifetime. Wave 6 persona 4 (two Class D felonies, separate incidents) is the verify-then-encode branch and says to encode from the amended statute. The tree does not cap Class D felonies at one; confirm against the current text.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the State Police certificate backlog (KSP's own page says 4-5 months to process the § 431.079 Certificate of Eligibility) and confirm no automation exists: Wave 6 says SB 290 (automatic expungement) failed in the 2026 session. The tree tells conviction-eligible people to start the certificate first and plan around the wait, and is petition-only for convictions; confirm both facts.
   - *Blocks no single field — affects a branch or wording.*

---

## 6. MISSISSIPPI (MS)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expunction (Miss. Code § 99-19-71)** — The court that handled the case
- Mississippi Center for Justice — https://www.mscenterforjustice.org
- Mission First Legal Aid Office — https://missionfirst.org

**Dates that govern:**
- 2019 — General one-felony-per-lifetime expunction rule in effect (§ 99-19-71) (effective) · Wave 6 gives the year only ("post-Jul 2019 general rule"). A person may expunge one felony in their lifetime, 5 years after completing all sentence terms.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the full felony exclusion list under § 99-19-71. Wave 6 gives crimes of violence (§ 97-3-2), first-degree arson, drug trafficking, third-or-later DUI, felon-in-possession, failure to register as a sex offender, and EMBEZZLEMENT (the surprising one), and flags the list as needing the full statute text. The tree asks these as exclusions; confirm the complete set.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm that a first-offense, non-traffic misdemeanor has NO statutory waiting period for expunction. Wave 6 gives this but flags it for confirmation. The tree routes a first-offense misdemeanor to an immediate petition result; confirm.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the $150 expunction fee is current and whether it applies to non-conviction petitions. Wave 6 gives § 99-19-72: $100 judicial fund + $40 DA fund + $10 clerk = $150, and flags both currency and non-conviction scope. Also confirm the 2026 automatic-expungement bill (HB 1344) died before encoding "no automation" (bills were introduced 2024 HB 801, 2025 HB 1117, 2026 HB 1344).
   - *Blocks no single field — affects a branch or wording.*
4. Confirm whether a pauper's/indigency waiver applies to the $150 expunction fee. Wave 6 gives the fee amount but says nothing about a waiver; the feeWaiver field is null pending confirmation with a circuit clerk (Hinds).
   - *Blocks (null until answered):* `resources.remedies.expungement.feeWaiver`

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

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Record Sealing (Nev. Rev. Stat. §§ 179.245, 179.255)** — The court where the case was decided (Las Vegas Justice Court / Eighth Judicial District)
- Nevada Legal Services — Record Sealing Manual — https://nlslaw.net
- Legal Aid Center of Southern Nevada — https://www.lacsn.org

**Dates that govern:**
- 2019 — Marijuana (<=2.5 oz) decriminalized-offense sealing, immediate (AB 192) (effective) · Wave 6 gives the year only. Records of now-decriminalized minor marijuana possession can be sealed immediately.
- 2021 — Pardoned convictions become sealable on receipt of the pardon (effective) · Wave 6 gives the year only. A pardoned conviction can be sealed once the pardon is received.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm when the sealing waiting clock starts — specifically whether "release or discharge" requires fines/fees paid. Wave 6 notes practitioner sources say completion includes fines but flags the clock start for verification. The tree runs each ladder period from release/discharge; confirm whether unpaid financial obligations delay the clock.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the 1-year general (catch-all) misdemeanor tier from the statute. Wave 6 lists it but flags it for confirmation against NRS 179.245. The tree routes "other misdemeanors" to a 1-year wait; confirm.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the sealing cost reality. Wave 6 says there is no single statutory fee — the cost is SCOPE reports from each arresting agency, a criminal-history record, and certified copies, roughly $150 all-in self-filed in Las Vegas Justice Court (practitioner figure), plus a months-long Carson City Repository backlog to actually seal after the order. The fees and feeWaiver fields are null pending this; the Nevada Legal Services Record Sealing Manual and the Eighth Judicial District are the checks.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`

---

## 10. OREGON (OR)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave6_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Set Aside a Conviction (ORS 137.225)** — The sentencing court; Oregon State Police for the record check
- Legal Aid Services of Oregon (1-800-351-7248) — https://lasoregon.org
- Oregon Judicial Department — Self-Help / Forms — https://www.courts.oregon.gov/self-help

**Dates that govern:**
- 2022-01-01 — SB 397 set-aside overhaul takes effect (ORS 137.225) (effective) · Shortened waits (Class B felony 20 yrs -> 7 yrs, etc.) and eliminated the court filing fee. Made many older convictions newly eligible — a key "you may already qualify" fact.
- 2025 — Amendment: expired money-judgment obligations count as sentence-complete (effective) · Chapter 395 of 2025. Wave 6 gives the year only. Unpaid old LFOs whose money judgments have expired no longer block a set-aside.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm the Oregon State Police record-check / fingerprint fee amount. Wave 6 flags a conflict: $33 (Powell Law) vs $80 (fingerprint-card provisions/others). One OSP fee covers filings across multiple counties. The court filing fee itself was eliminated by SB 397. The fees and feeWaiver fields are null pending this amount; an OSP or circuit-court call is the check.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
2. Confirm the ORS 137.225 dismissal subsection against the current text. Wave 6 flags a known drafting error (an old subsection (9) cross-reference) that made SOME dismissed charges wait conviction-length periods rather than being expungeable anytime; a practitioner article flagged it unfixed as of 2024. The tree treats dismissals/acquittals as expungeable with essentially no wait but names this caveat; confirm the current statute and county practice (Multnomah).
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the 2025 chapter 395 amendment (expired money-judgment obligations count as sentence-complete) and the county backlog reality (~2 years, practitioner-documented). The tree tells people old expired-judgment LFOs no longer block them and sets an honest timeline expectation; confirm both against current practice.
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

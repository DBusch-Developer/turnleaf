# Turnleaf — Call Session 4 (Wave 4: IN · MA · MO · TN · WA)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 4`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**23 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. INDIANA (IN)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement of a Conviction (Ind. Code § 35-38-9)** — The convicting court
- **Expungement of an Arrest / Non-Conviction (§ 35-38-9-1)** — The court where the case was handled
- Indiana Legal Services (expungement) — https://www.indianalegalservices.org/expungement
- indy.gov Second Chance (Marion County) — https://www.indy.gov

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Confirm the scope of the post-2022 automatic expungement of dismissed-case arrests (§ 9-1), and the 2022 additions for infraction-adjudication arrests and diversion-participant eligibility (with prosecutor authorization). Wave 4 flags the scope. The tree tells non-conviction petitioners to check whether it was already done.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the § 9-3 exclusion list for Level 6 / Class D felonies (bodily-injury offenses, sex/violent offenders, etc.). The tree asks a person whether their offense is excluded from the § 9-3 mandatory path.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 9-5(b) never-expungeable list (murder/homicide-level, sex/violent-offender registry, sex crimes, official misconduct). The tree asks a person whether their offense is on it.
   - *Blocks no single field — affects a branch or wording.*
4. What is the conviction-petition filing fee? Wave 4 says § 9-1 arrest petitions are free by statute, and conviction petitions pay the civil filing fee (~$100 vicinity, county-set). Phone target.
   - *Blocks (null until answered):* `resources.remedies.conviction.fees`, `resources.remedies.conviction.feeWaiver`
5. Confirm the "earlier with prosecutor's written consent" mechanics for the § 9-2 misdemeanour path and the § 9-5 serious-felony prosecutor-consent requirement. The tree uses the standard waits and notes the consent shortcuts in prose.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. MASSACHUSETTS (MA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Administrative Sealing of a Conviction (M.G.L. c. 276 § 100A)** — Commissioner of Probation (by mail), One Ashburton Place, Room 405, Boston, MA 02108
- Mass.gov — Seal your criminal record — https://www.mass.gov/how-to/seal-your-criminal-record
- Greater Boston Legal Services (CORI self-help) — https://www.gbls.org

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the current Petition to Seal form name/number. Wave 4 gives "TC-005" but flags it. Verify on the mass.gov "Seal your criminal record" page along with the current Commissioner of Probation mailing address.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm which offense categories are ineligible for administrative sealing under § 100A. Wave 4 flags the list (firearms-licensing statutes, some state-ethics offenses). The tree asks a person whether their offense is in one of these categories.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 100J expungement exclusion list (~20 categories: ABDW, firearms, OUI, restraining-order violations, sex offenses) and the § 100E-100U mechanics: offense before the 21st birthday, 3-yr misd / 7-yr felony waits, max 2 lifetime, no subsequent cases. The expungement path is disclosed but not fully branched.
   - *Blocks no single field — affects a branch or wording.*
4. How are completed diversions and continuances-without-a-finding (CWOF) treated for sealing? Standing call-sheet question. Wave 4 does not detail these.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MISSOURI (MO)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Expunge (Mo. Rev. Stat. § 610.140)** — The court of the case
- Clear My Record MO (law-change page + forms help) — https://www.clearmyrecordmo.org
- Missouri Courts — Expungement self-help — https://www.courts.mo.gov/page.jsp?id=98230

**Dates that govern:**
- 2025-01-01 — SB 754 — lifetime limits raised to 2 felonies + 3 misdemeanours (effective) · Was 1 felony + 2 misdemeanours. Many attorney sites still show the old numbers. Also: separate crimes in one case are no longer automatically counted as one; arrest expungements available at 18 months (was 3 years).

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Confirm the SB 754 counting change against the current § 610.140 text: separate crimes in one case are no longer automatically counted as one toward the limits, with a nuanced same-course-of-conduct exception. Wave 4 flags the exact text. The tree asks the person to self-assess their count for the 2-felony / 3-misdemeanour limits.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the first-time-DWI expungement track: Wave 4 says a first DWI can be expunged after 10 years with no further alcohol offenses, and flags the cite (likely § 610.130/.140 interplay). The tree routes a first DWI to its own 10-year result.
   - *Blocks no single field — affects a branch or wording.*
3. FEE CONFLICT: Wave 4 gives "$250 statutory surcharge per one source vs standard circuit filing fee per another" and flags it as a phone target. Fee waiver by in-forma-pauperis motion. Confirm the actual fee with a circuit clerk.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
4. What is the status of the 2022 Amendment XIV automatic marijuana expungement rollout? Wave 4 says courts are still processing and flags a status check. And confirm no Clean Slate automation bill passed this session (Wave 4 says pending, not law).
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the § 610.140.3 exclusion list: Class A felonies, dangerous felonies (§ 556.061), death-element felonies, felony assault, ANY domestic assault, felony kidnapping, sex-registry offenses, most weapons offenses, intoxication-related traffic (except the first-DWI 10-year track), CDL offenses. The tree asks a person whether their offence is on it.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. TENNESSEE (TN)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Conviction Expunction (T.C.A. § 40-32-101(g))** — The court of conviction; TBI for the certificate
- **Non-Conviction Expunction (T.C.A. § 40-32-101)** — The court that handled the case
- Tennessee Courts — Expunctions — https://www.tncourts.gov/programs/expunctions
- Legal Aid Society of Middle Tennessee and the Cumberlands — https://www.las.org

**Dates that govern:**
- 2024-01-01 — TBI Certificate of Eligibility required for conviction expunctions (effective) · No conviction-expunction order may be entered without a TBI certificate confirming the offence qualifies. Adds a step and processing time to every conviction track.
- 2025 — Statutory reorganization of § 40-32-101 into §§ 40-32-106/107 (effective) · Wave 4 gives the year only, and flags that content is mid-renumbering — cite both old and new until settled; the AOC site says "updated information coming soon".

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Confirm the current statute numbering: Wave 4 flags a 2025 reorganization renumbering § 40-32-101 content into §§ 40-32-106/107, still settling. Cite both until confirmed. The AOC site itself says updated information is coming.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the newer 10-year felony tier: Wave 4 says certain Class C and D felonies were added at 10 years, and flags the exact (g)(1)(D)-(F) list — most older guides only mention Class E. The tree encodes a 10-year Class C/D track but the specific eligible-offence list needs confirming.
   - *Blocks no single field — affects a branch or wording.*
3. What is the TBI certificate-of-eligibility request process and turnaround? Wave 4 flags this as a new step (since Jan 2024) that adds processing time to every conviction track. Verify on TBI's site.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the clerk fee practice: Wave 4 says no state fee but the clerk may charge up to $100 (§ 8-21-401(b)(1)(D)(x)) for conviction/diversion expunctions, waived by indigency affidavit; dismissals are free. Confirm the current practice with a clerk (Davidson County).
   - *Blocks (null until answered):* `resources.remedies.conviction.fees`
5. How are pretrial and judicial diversion completions treated, and confirm the same-episode trap (§ (a)(1)(E)): conviction of any count from an episode generally bars expunging the rest. The tree hedges diversions and discloses the same-episode rule in prose.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. WASHINGTON (WA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Vacate a Conviction (RCW 9.96.060 / 9.94A.640)** — The sentencing court
- WashingtonLawHelp.org (vacate guides, 2024-updated) — https://www.washingtonlawhelp.org
- Washington Courts self-help forms — https://www.courts.wa.gov/forms/

**Dates that govern:**
- 2024 — New Hope Act — waiting clock no longer waits for LFO payoff (effective) · Wave 4 gives the year only. The clock runs from release/sentencing; courts can waive or reduce outstanding legal financial obligations on motion. Older guides still say "pay all fines first". Verify the session-law cite.
- 2019 — New Hope Act — Assault 2/3 and Robbery 2 carve-out from the violent-offence bar (effective) · Wave 4 gives the year only. Vacatable if no firearm/deadly-weapon/sexual-motivation enhancement.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the 2024 New Hope Act session-law cite for the rule that the waiting clock no longer waits for LFO (legal financial obligation) payoff. Wave 4 says the clock runs from release/sentencing and courts can waive LFOs on motion — but flags the exact cite. The tree encodes this rule; confirm it against the current RCW 9.96.060 / 9.94A.640 text.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the DV-related misdemeanour subsection: Wave 4 gives a 5-year track with extra conditions (no restraining-order violations in the prior 5 years; fewer than two separate-incident DV convictions) but flags the exact DV subsection. The tree asks whether the offence was DV-related and applies the 5-year track.
   - *Blocks no single field — affects a branch or wording.*
3. What is the filing fee for a vacation motion? Wave 4 says one guide reports generally none but counties may differ — phone target. A WSP WATCH self-check is $11 online, free in person.
   - *Blocks (null until answered):* `resources.remedies.vacation.fees`, `resources.remedies.vacation.feeWaiver`
4. How are completed diversions treated? Wave 4 details special tracks (trafficking/DV-victim convictions under 9.96.080 / 9.94A.648, marijuana misdemeanours, pre-1975 treaty-fishing) but not general diversion. Standing call-sheet question.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

# Turnleaf — Call Session 2 (Wave 2: CT · DE · MN · OK · VA)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 2`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**22 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. CONNECTICUT (CT)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Absolute Pardon (Board of Pardons and Paroles) — full erasure** — Connecticut Board of Pardons and Paroles
- **Petition for Erasure (pre-2000 convictions, decriminalized offenses, cannabis)** — The court where you were sentenced
- **Diversion Feeders (Accelerated Rehabilitation, Supervised Diversionary Program)** — The sentencing court / Court Support Services Division
- **Clean Slate Erasure (convictions — automatic for post-2000 offenses)** — Connecticut Judicial Branch (record check) / portal.ct.gov/cleanslate
- Clean Slate CT (eligibility-date calculator) — https://www.cleanslatect.org
- Connecticut Legal Services — https://www.ctlegal.org

**Dates that govern:**
- 2023-01-01 — Clean Slate erasure operative (PA 21-32 as amended) (effective) · PA 21-32 as amended by 22-26, 23-134, 23-169, 23-204. The statute is unconditional — no funding contingency in the text — but the automated-erasure IT rollout was delayed in practice; "eligible" does not yet guarantee "erased".
- 2000-01-01 — Clean Slate mechanism split by offense date (operative) · An offense committed on/after this date erases by operation of law; an earlier offense erases by a free OCCA-form petition. Classification and max sentence are judged by the law in effect at offense time (§ 54-142a(e)(1)(B)).
- 2022-04-01 — Alcohol Education Program closed to new applications (operative) · § 54-56g(j) — this DUI-era diversion no longer accepts applicants; cases completed before closure still dismiss and erase.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. 2024–2026 session sweep: § 54-142a is encoded through PA 23-204 and § 54-142e through PA 23-134. Confirm no later (2024–2026) public act amended the erasure statutes before any UI copy claims completeness.
   - *Blocks no single field — affects a branch or wording.*
2. Operational status of the automated erasure rollout: the statute is unconditional, but implementation was delayed in practice and individuals are not notified. Confirm the current status page (portal.ct.gov/cleanslate) and the record-check process — "eligible" is not yet "erased" (news/phone tier).
   - *Blocks no single field — affects a branch or wording.*
3. Definitions cited but not pulled: § 46b-38a (family violence crime — the (e)(2)(A) exclusion) and § 54-250 (nonviolent/sexually violent offense — the (e)(2)(B) exclusion). The tree asks the person to self-assess membership; the exact definitional lists are cite-only here.
   - *Blocks no single field — affects a branch or wording.*
4. Feeder programs referenced but not pulled: § 54-56i / § 54-56q (drug education) and § 46b-38c (family violence education) — their mechanics and how completion feeds § 54-142a erasure are cite-only.
   - *Blocks no single field — affects a branch or wording.*
5. Adjacent erasure routes not pulled: § 46b-146 (juvenile delinquency erasure) and § 29-15 (return of fingerprints). Out of scope for this pass; route juvenile matters to counsel.
   - *Blocks no single field — affects a branch or wording.*
6. Absolute-pardon application mechanics and fees are set by the Board of Pardons and Paroles outside the statute (§ 54-130a fixes the 3-year misdemeanor / 5-year felony application windows, not the process or cost). Confirm the current BOPP process and any fee (phone tier).
   - *Blocks (null until answered):* `resources.remedies.pardon.fees`

---

## 2. DELAWARE (DE)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Post-Pardon Expungement (11 Del. C. § 4375)** — Delaware Board of Pardons, then Superior/Family Court
- **Automatic Clean Slate Expungement (11 Del. C. § 4373A)** — Delaware State Bureau of Identification (SBI)
- **Mandatory Expungement (State Bureau of Identification, 11 Del. C. § 4373)** — Delaware State Bureau of Identification (SBI)
- **Discretionary Expungement (Superior or Family Court, 11 Del. C. § 4374)** — Superior Court (or Family Court), county of the most recent case
- ACLU of Delaware (free expungement workshops) — https://www.aclu-de.org
- Delaware Center for Justice — https://www.dcjustice.org

**Dates that govern:**
- 2024-08-01 — Automatic Clean Slate expungement sweep began (§ 4373A) (operative) · Since this date SBI sweeps the mandatory-eligible (§ 4373) universe monthly, with no application and no objection mechanism. A missed case keeps the SBI-application backstop; there is no damages claim if the sweep misses it. Operational completeness is an open question.
- 2021 — Clean Slate Act (SB 111 / SB 112) enacted (effective) · Wave 2 gives the year only. The (f)(4)(b) 10-year prior-expungement bar counts grants after 12/27/2019.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Fee amounts: the SBI mandatory-expungement application fee is set by regulation, and the Superior/Family Court discretionary-petition fee is a court schedule — neither dollar amount is in the statute. Confirm both (phone tier).
   - *Blocks (null until answered):* `resources.remedies.mandatory.fees`, `resources.remedies.discretionary.fees`
2. Cite-only cross-references not pulled: the 11 § 4201(c) violent-felony list (the § 4374(b) discretionary exclusion), the subchapter VI, chapter 5 subparts A/B/C/F misdemeanors (a § 4373(b) exclusion), 16 § 1136, 31 § 3913, 31 § 309 (Beau Biden Act), and the 10 § 901 family-relationship definition for the DV two-part test. The tree asks the person to self-assess membership; the exact lists need confirming.
   - *Blocks no single field — affects a branch or wording.*
3. Operational status of the § 4373A monthly automatic sweep: the statute is unconditional, but "eligible" is not yet "expunged" if the sweep has not reached a case. Confirm current completeness before UI copy claims records are already done (news/phone tier).
   - *Blocks no single field — affects a branch or wording.*
4. The delta of 85 Del. Laws c. 142 §10 is integrated into this 2025 print of § 4374; note only — confirm no substantive change to the encoded discretionary waits/exclusions was missed.
   - *Blocks no single field — affects a branch or wording.*
5. Juvenile expungement (Title 10) was not pulled — it is a separate track from the adult subchapter VII rules encoded here; route juvenile matters to counsel (cite-only).
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MINNESOTA (MN)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition Expungement (Minn. Stat. §§ 609A.02 / 609A.03)** — District court of the case
- Volunteer Lawyers Network (expungement clinics) — https://www.vlnmn.org
- Until We Are All Free (Clean Slate implementation tracking) — https://www.uwaaf.org

**Dates that govern:**
- 2025-01-01 — Automatic Clean Slate expungement (§ 609A.015) effective — retroactive (effective) · The BCA seals qualifying records on its own, no petition and no fee. It is RETROACTIVE to offenses that met the criteria before 1/1/25 and were in the BCA system as of 1/1/25. The BCA determines eligibility within 30 days of a wait ending, re-reviews annually, and seals 60 days after judicial notice (subd 5).

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Is there a 2026 Regular Session amendment to § 609A.015? The revisor page banners one, but it is not in the 2025 print pulled. The rules here reflect the 2025 text plus 1Sp2025 c3 art16 s18; re-confirm against the certified 2026 text once published.
   - *Blocks no single field — affects a branch or wording.*
2. Pull the CANNABIS expungement paths — §§ 609A.017, 609A.055 (automatic petty-cannabis), and 609A.06 (Cannabis Expungement Board, felony cannabis) — referenced in § 609A.01 but NOT pulled. Minnesota cannabis routing stays draft until those sections are read.
   - *Blocks no single field — affects a branch or wording.*
3. What is the petition filing fee amount? A fee applies per § 357.021 subd 2 clause (1), but the dollar amount is not in the pulled text — confirm with a district court. It is waivable for indigency, and MUST be waived for a resolved-in-favor petition (§ 609A.03).
   - *Blocks no single field — affects a branch or wording.*
4. Pull the § 299C.11 / § 13.82 arrest-record-return path (return/destruction of arrest records where no charge or a favorable outcome) — not in this pull; it is a separate mechanism from § 609A sealing.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. OKLAHOMA (OK)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Section 18 Expungement (seals arrest + court record)** — District court where the arrest information is located; OSBI for the arrest record
- **Section 991c Expungement (deferred-sentence disposition cleanup)** — The court that handled the case
- Legal Aid Services of Oklahoma — https://oklaw.org
- OSBI Expungements (answers by email and phone) — https://oklahoma.gov/osbi/services/criminal-history/expungements.html

**Dates that govern:**
- 2025-11-01 — Automatic Clean Slate processing live (operative) · The § 18(C) automatic trigger is "three years after November 1, 2022" = November 1, 2025 (now past). It is subject to "availability of funds," and OSBI is mid-implementation — operational status is an open question. OSBI: expungements@osbi.ok.gov, (405) 879-2641.
- 2024 — Dueling 2024 §18 amendments (Laws 2024 c. 452 §12 and c. 259 §1) (effective) · Two conflicting amendments to § 22-18 both remain in the code (v1 = c. 452, 16 paragraphs; v2 = c. 259, 15 paragraphs). ¶1-13 are identical. The v1-only ¶14 (two-felony-deferred) and the renumbered identity-theft/reclassified paragraphs are encoded with version notes; 2025 c. 292's § 19 amendments adopt v2 terminology for the automatic track.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. The dueling § 22-18 amendments (Laws 2024 c. 452 §12 "v1" 16 paragraphs vs c. 259 §1 "v2" 15 paragraphs) both remain in the code. Confirm whether courts/OSBI treat v1's two-felony-DEFERRED ¶14 as operative, and whether any 2026 act harmonized the two versions. The tree encodes the union with version notes.
   - *Blocks no single field — affects a branch or wording.*
2. OPERATIONAL status of the November 1, 2025 automatic Clean Slate sweep — the § 18(C) trigger is past, but the path is subject to "availability of funds" and OSBI is mid-implementation. Verify with OSBI (phone/news tier) before any copy claims records are actively being processed.
   - *Blocks no single field — affects a branch or wording.*
3. Pull the cross-referenced offense lists: 57 O.S. § 571 (violent felonies — separates ¶9/¶12-eligible nonviolent felonies) and 21 O.S. § 13.1 (the felonies barred from ¶13 and v1-¶14). The exclusion screens key on those cross-references and ask the person until the lists are enumerated. Also the SORA (57 O.S. § 582/registerable) scope.
   - *Blocks no single field — affects a branch or wording.*
4. District-court filing fee and the OSBI order-processing fee amounts are set OUTSIDE the pulled sections — phone tier for both. Exceptions confirmed from text: ¶3 (DNA-innocence) petitions get all filing fees and court costs reimbursed (§ 19(R)); the automatic path involves no filing at all. Also confirm the § 19b Identity Theft Passport fee (OSBI rule).
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the exact scope of 2025 c. 292's § 19 changes and 2025 c. 305's § 991c changes — the pulled text shows the history lines; verify no further-reaching substantive change before the next review.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. VIRGINIA (VA)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Seal (Va. Code § 19.2-392.12; lighter track § 19.2-392.12:1)** — Circuit Court where the charge originated
- **Expungement (non-convictions, Va. Code § 19.2-392.2)** — Circuit Court where the charge was heard
- Legal Aid Justice Center — https://www.justice4all.org
- Justice Forward Virginia (sealing explainer) — https://justiceforwardva.com

**Dates that govern:**
- 2026-07-01 — Comprehensive sealing regime took effect (SB 1466 / HB 2723) (effective) · The biggest recent second-chance-law change in the country. Automatic processes are spinning up — verify rollout status before any UI copy claims sealing is happening automatically now.
- 1986-01-01 — Earliest sealable offense date (effective) · Most records need an offense date on or after this date to be sealed. Exception: simple marijuana possession (former § 18.2-250.1) is sealed by operation of law regardless of date (§ 19.2-392.6:1).
- 2026-12-01 — Expungement statute rewrite takes effect (2026 c. 1127) (effective) · The December version of § 19.2-392.2 broadens expungement to any disposition where the person was "not ultimately convicted" (unless a facts-sufficient stipulation/finding was made), allows one petition to cover multiple charges from separate occurrences, softens the standard to "potential manifest injustice," adds that a prior conviction alone cannot defeat the petition, and lets appellants proceed under a pseudonym.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. What is the current automatic-sealing rollout status? The regime took effect July 1, 2026 and automatic processes are only spinning up. Verify on vsp.virginia.gov (the State Police record-sealing page) and vscc.virginia.gov before any UI copy claims records are being sealed automatically now. Trust only VSP, the Crime Commission, and the statute — secondary sources carry stale 2025 dates.
   - *Blocks no single field — affects a branch or wording.*
2. Are Circuit Court clerks circulating a § 19.2-392.12:1 petition form yet, or are petitioners drafting their own? The 12:1 track is new and lighter (free, 7 years, no manifest-injustice element); the statute is clear but the local filing mechanics may not have caught up. Phone-verify with a Circuit Court clerk.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

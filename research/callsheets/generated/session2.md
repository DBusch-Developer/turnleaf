# Turnleaf — Call Session 2 (Wave 2: CT · DE · MN · OK · VA)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 2`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**33 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. CONNECTICUT (CT)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition for Erasure (pre-2000 convictions and cannabis)** — The court where you were sentenced
- **Absolute Pardon (Board of Pardons and Paroles) — full erasure** — Connecticut Board of Pardons and Paroles
- Clean Slate CT (eligibility-date calculator) — https://www.cleanslatect.org
- Connecticut Legal Services — https://www.ctlegal.org

**Dates that govern:**
- 2025-10 — Clean Slate automatic erasures resumed after delays (operative) · Wave 2 gives month and year only. Delayed for years by data-system problems; ~50,000 convictions erased so far, 100,000+ expected. "Eligible" does not yet mean "erased".
- 2021 — Clean Slate Act (Public Act 21-42) — automatic erasure of post-2000 convictions (effective) · Wave 2 gives the year only.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. What is the current Clean Slate rollout status, and how does a person check whether their own record has been erased yet? Wave 2 says erasures resumed October 2025 with ~50k of 100k+ done, and that individuals are not notified. Confirm the status page (portal.ct.gov/cleanslate) and the record-check process before any UI copy claims completeness.
   - *Blocks no single field — affects a branch or wording.*
2. DUI CONFLICT: is a DUI (Conn. Gen. Stat. § 14-227a) eligible for automatic erasure? One attorney source says DUIs are eligible; the state's own petition-form guidance blocks § 14-227a where there is a repeat within 10 years — which reads as first-offence eligible, repeat blocked. Read § 54-142a(e)(2)(C) and encode exactly what it says. The tree currently routes DUI to the exclusion gate as a question rather than assuming.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 54-142a(e)(2)(C) exclusion list in full: family violence crimes (§ 46b-38a), sex offences requiring registration, and crimes with a maximum sentence over 5 years even where the actual sentence was less. The tree asks a person to self-assess this; the exact list needs confirming against the statute.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the automatic erasure waiting periods against § 54-142a(e): misdemeanours 7 years, and class D/E and unclassified felonies with maximum terms of 5 years or less at 10 years — both measured from the person's MOST RECENT conviction of any crime.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed deferrals/diversions (including accelerated rehabilitation) treated for erasure? Not covered in Wave 2 — standing call-sheet question for every state.
   - *Blocks no single field — affects a branch or wording.*
6. Is petition erasure (form JD-CR-202) and cannabis erasure genuinely free, and pardon applications too? Wave 2 says all three are free; confirm at the counter and on the Board of Pardons page.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`, `resources.remedies.petition.feeWaiver`
7. What is the exact effective date of the resumed automatic erasures and of Public Act 21-42? Wave 2 gives month/year and year only.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. DELAWARE (DE)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Mandatory Expungement (State Bureau of Identification, 11 Del. C. § 4373)** — Delaware State Bureau of Identification (SBI)
- **Discretionary Expungement (Superior Court, 11 Del. C. § 4374)** — Superior Court (or Family Court), county of the most recent case
- ACLU of Delaware (free expungement workshops) — https://www.aclu-de.org
- Delaware Center for Justice — https://www.dcjustice.org

**Dates that govern:**
- 2024-08 — Automatic Clean Slate expungement processing began (operative) · Wave 2 gives month and year only. Covers the mandatory-eligible universe; rollout completeness is an open question.
- 2021 — Clean Slate Act (SB 111 / SB 112) enacted (effective) · Wave 2 gives the year only.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. WHICH felonies are on the § 4373 mandatory felony list (the 10-year path)? Wave 2 flags that the source text cut off here — the felony list itself was not captured. The tree routes an eligible-list felony to a result that says its dates but flags that the list membership needs confirming against § 4373.
   - *Blocks no single field — affects a branch or wording.*
2. What is the current fingerprinting fee for mandatory expungement through SBI? Wave 2 gives "$52 (ACLU-DE figure)" and marks it for verification. And is there any waiver? Ask SBI/DSP directly.
   - *Blocks (null until answered):* `resources.remedies.mandatory.fees`, `resources.remedies.mandatory.feeWaiver`
3. What is the court fee for a discretionary expungement petition? § 4374(j) authorises a "reasonable fee" but does not state an amount. And can it be waived? Get the number from a Superior Court clerk.
   - *Blocks (null until answered):* `resources.remedies.discretionary.fees`, `resources.remedies.discretionary.feeWaiver`
4. What is the current status and completeness of the automatic Clean Slate rollout? Wave 2 says processing began August 2024 and to verify completeness on delaware.gov before any UI copy claims records are already done.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the § 4372(f) exclusion list: Title 21 motor-vehicle offences including DUI (with narrow § 4374(i)(2) exceptions), violent felonies (§ 4201(c) list), and DV / child-victim / vulnerable-adult crimes (barred from mandatory, 7-year discretionary or pardon instead). Also confirm the prior-expungement-within-10-years and felony-after-felony-expungement bars.
   - *Blocks no single field — affects a branch or wording.*
6. How are completed deferrals/diversions (including Probation Before Judgment) treated for expungement? Standing call-sheet question for every state — Wave 2 does not cover it.
   - *Blocks no single field — affects a branch or wording.*
7. What are the exact effective dates for the August 2024 automatic-processing start and the 2021 Clean Slate Act? Wave 2 gives month/year and year only.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MINNESOTA (MN)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition Expungement (Minn. Stat. §§ 609A.02 / 609A.03)** — District court of the case
- Volunteer Lawyers Network (expungement clinics) — https://www.vlnmn.org
- Until We Are All Free (Clean Slate implementation tracking) — https://www.uwaaf.org

**Dates that govern:**
- 2025-01-01 — Automatic Clean Slate expungement (§ 609A.015) live (effective) · The BCA began sending records April 2025 and sealing from June 2025; ~94% of ~2 million eligible records expunged by spring 2026, remainder in judicial review. The strongest automatic-track status of any state in Waves 1-2.
- 2024-05 — Automatic petty-cannabis expungement (§ 609A.055) completed (operative) · Wave 2 gives month and year only.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. Confirm the exact § 609A.015 subd. 3(b) exclusion lists and the § 609A.02 subd. 3 lists — secondary sources paraphrase them loosely. Wave 2 flags DWI, domestic assault, harassment/stalking, and 4th-degree assault as carve-outs; the precise lists need pulling from the statute.
   - *Blocks no single field — affects a branch or wording.*
2. Is DWI excluded from the PETITION track as well as the automatic one? Wave 2 flags this specifically — read § 609A.02 subd. 3 against § 609A.015 subd. 3(b). The tree currently routes DWI to a hedge that says the automatic path is out and the petition path is unconfirmed.
   - *Blocks no single field — affects a branch or wording.*
3. What is the current petition filing fee? Wave 2 gives "~$300-ish, in-forma-pauperis waiver available" and flags it. Confirm the current amount with a district court.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`
4. Confirm the § 609.13 quirk: a felony deemed a misdemeanor via stay of imposition does NOT become automatic-eligible through the demotion — separate petition rules with 4/5-year splits apply. The tree does not currently special-case this; it is disclosed as an open question.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the § 609A.015 rollout is as complete as reported (~94% by spring 2026) and the BCA record-check path. This is the strongest automatic-track claim in the app, so it is worth confirming before the copy leans on it.
   - *Blocks no single field — affects a branch or wording.*
6. How are completed diversions and stays of adjudication treated beyond the 1-year automatic period Wave 2 gives? The tree encodes the 1-year automatic diversion period; confirm the boundaries.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. OKLAHOMA (OK)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Section 18 Expungement (seals arrest + court record)** — District court of the county of arrest; OSBI for the arrest record
- **Section 991(c) Expungement (deferred-sentence disposition cleanup)** — The court that handled the case
- Legal Aid Services of Oklahoma — https://oklaw.org
- OSBI Expungements (answers by email and phone) — https://oklahoma.gov/osbi/services/criminal-history/expungements.html

**Dates that govern:**
- 2025-11-01 — Automatic Clean Slate processing legally began (operative) · Effective Nov 1, 2022; automatic processing began Nov 1, 2025. OSBI is mid-implementation with a phased bridge plan — rollout status is an open question.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. What is the current OSBI Clean Slate rollout status? Automatic processing legally began Nov 1, 2025 but OSBI is mid-implementation with a phased bridge. Verify on oklahoma.gov/osbi before any UI copy claims records are being processed now. OSBI answers email at expungements@osbi.ok.gov and phone (405) 879-2641.
   - *Blocks no single field — affects a branch or wording.*
2. Did HB 3037 pass? Wave 2 flags a proposed change raising the fine-only misdemeanor threshold to $1,000 and cutting waits. Encode CURRENT law only — the tree uses the existing under-$501 fine-only threshold. Check the legislature site for HB 3037's fate before updating.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the current § 18(A)(12)-(13) text on single-nonviolent-felony expungement, specifically any pardon prerequisites. Wave 2 flags this. The tree encodes the 5-year (one felony) and 10-year (two felonies) periods but the pardon-prerequisite detail is unverified.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the OSBI arrest-record processing fee. Wave 2 gives "$150 (their own page)"; the court-record expungement is free. Confirm the $150 and whether any waiver exists.
   - *Blocks (null until answered):* `resources.remedies.section18.fees`, `resources.remedies.section18.feeWaiver`, `resources.remedies.section991c.fees`, `resources.remedies.section991c.feeWaiver`
5. Confirm the SB 1770 single-source rule: any out-of-state or federal arrest disqualifies the AUTOMATIC path for dismissals and misdemeanours (not the petition path). The tree gates on this; confirm it applies only to the automatic path and only to those categories.
   - *Blocks no single field — affects a branch or wording.*
6. Confirm the 57 O.S. § 571 violent-offense list that separates a "nonviolent felony" (expungeable) from a violent one (not). The tree asks a person whether their felony was violent; the list itself needs confirming.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. VIRGINIA (VA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave2_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Seal (new regime, Va. Code § 19.2-392.12)** — Circuit Court where the charge originated
- **Expungement (old regime, non-convictions, Va. Code § 19.2-392.2)** — Circuit Court where the charge was heard
- Legal Aid Justice Center — https://www.justice4all.org
- Justice Forward Virginia (sealing explainer) — https://justiceforwardva.com

**Dates that govern:**
- 2026-07-01 — Comprehensive sealing regime took effect (SB 1466 / HB 2723) (effective) · Two weeks old as of the Wave 2 draft. The biggest recent second-chance-law change in the country. Automatic processes are spinning up — verify rollout status before any UI copy claims sealing is happening automatically now.
- 1986-01-01 — Earliest sealable offense date (effective) · Only records with offense dates on or after this date can be sealed.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. What is the current automatic-sealing rollout status? The regime took effect July 1, 2026 and automatic processes are only spinning up. Verify on vsp.virginia.gov (the State Police petition-based-record-sealing page) and vscc.virginia.gov before any UI copy claims records are being sealed automatically now. Trust only VSP, the Crime Commission, and the statute — secondary sources carry stale 2025 dates.
   - *Blocks no single field — affects a branch or wording.*
2. Are petition sealing filings genuinely free with no fingerprint card, per the 2025 amendments? Wave 2 says yes and calls it a UI headline if confirmed — verify on the Circuit Court's own instructions and by phone. This is one of the most user-relevant facts in the state.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`, `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
3. Confirm the exact lifetime-limit mechanics in § 19.2-392.12: Wave 2 says 2 lifetime sealing petitions but flags the precise mechanics. The tree discloses the limit in prose but cannot count a person's prior petitions.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the automatic misdemeanor list in § 19.2-392.7: petit larceny, shoplifting, trespass variants, disorderly conduct, misdemeanor marijuana distribution — sealed 7 years after conviction if no other CCRE-reportable conviction in that window (traffic infractions do not count against). The tree asks a person whether their offense is on this list.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the full § 19.2-392.12 petition exclusion list and the felony gating: no Class 1-2 felony ever, no Class 3-4 felony in 20 years, no felony of any kind in 10 years, 10 years clean, drug/alcohol convictions require a rehabilitation showing. The tree asks a person to self-assess the felony-history gate; the exact provisions need confirming.
   - *Blocks no single field — affects a branch or wording.*
6. How are DEFERRED dispositions treated under the new sealing regime? Not covered in Wave 2 — standing call-sheet question. The tree hedges deferrals.
   - *Blocks no single field — affects a branch or wording.*
7. Confirm the felony non-conviction path: Wave 2 says a felony charge that ended without conviction is sealable at conclusion WITH the defendant's request and the Commonwealth's Attorney's concurrence, or via old-regime expungement otherwise. The tree routes felony non-convictions to a result that explains both; confirm the concurrence requirement.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

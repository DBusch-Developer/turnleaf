# Turnleaf — Call Session 1 (Wave 1: MI · NJ · PA · UT)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 1`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**29 open questions across 4 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. MICHIGAN (MI)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Application to Set Aside Conviction (MCL 780.621)** — The court that convicted you
- **Automatic Set-Aside (MCL 780.621g) — no application** — Michigan State Police (criminal history record check)
- Michigan Legal Help (free guided set-aside interview) — https://michiganlegalhelp.org
- Safe & Just Michigan — https://safeandjustmi.org

**Dates that govern:**
- 2023-04-11 — Automatic set-aside (MCL 780.621g) live (operative) · Records have been setting aside automatically since this date, with no petition and no notice to the person.
- 2022-02 — First-offence OWI became petitionable (court discretion) (effective) · Wave 1 gives month and year only ("since Feb 2022"). OWI remains excluded from the automatic track.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. What is the fee to file a set-aside application, and if there is one, can it be waived? Wave 1 gives "$50 fee to Michigan State Police" and marks it "widely cited but VERIFY BY PHONE — it is on the MC 227 instructions". Widely cited is not a source. Ask about the RI-008 fingerprint card fee at the same time — Wave 1 calls it "small" without giving a number, so it is not stated anywhere in the app.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`, `resources.remedies.petition.feeWaiver`
2. Confirm the automatic set-aside exclusion list against MCL 780.621g, and confirm it really is broader than the petition exclusion list in MCL 780.621c. The tree asks a person to self-assess both lists; if either is wrong or if they are not actually different, the track fork is wrong.
   - *Blocks no single field — affects a branch or wording.*
3. The "One Bad Night" rule (MCL 780.621b) — multiple offences within 24 hours arising from the same transaction count as ONE conviction, except for assaultive, weapon, or 10+ year offences — has no representation in the tree. It changes the count that decides the waiting period, and the record model cannot express relationships between charges.
   - *Blocks no single field — affects a branch or wording.*
4. How are non-convictions treated? Wave 1 documents only convictions for Michigan — dismissals and acquittals are not covered at all, so the tree hedges them. What relief exists for a dismissed charge or an acquittal?
   - *Blocks no single field — affects a branch or wording.*
5. How are completed deferrals/diversions (including HYTA and 7411 dispositions) treated for set-aside? Not covered in Wave 1 — standing call-sheet question for every state.
   - *Blocks no single field — affects a branch or wording.*
6. Confirm the automatic-track count limits: max 2 felonies and 4 misdemeanours of 93 days or more set aside automatically, with unlimited 92-day-or-less misdemeanours. The tree does not gate on these — it cannot count — so a person past the limits may be told to check a record that will never clear on its own.
   - *Blocks no single field — affects a branch or wording.*
7. What is the exact effective date of the first-offence OWI petition path? Wave 1 gives month and year only ("since Feb 2022").
   - *Blocks no single field — affects a branch or wording.*

---

## 2. NEW JERSEY (NJ)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **eCourts Expungement (N.J.S.A. 2C:52-1 et seq.)** — Superior Court — county of residence or of any conviction
- LSNJ Law — Clearing Your Record (hotline 888-576-5529) — https://www.lsnjlaw.org
- NJ Courts Expungement Self-Help — https://www.njcourts.gov/self-help/expunge-record

**Dates that govern:**
- 2019 — Clean Slate expungement (2C:52-5.3) enacted (effective) · Wave 1 gives the year only. The same 2019 law ordered an AUTOMATED clean-slate system whose rollout has been slow — see open questions.
- 2025 — Venue expanded to the county of residence (effective) · Wave 1 gives the year only. You may now file in the Superior Court for the county where you live, not only where you were convicted.

**Verify — 8 open questions. Each answer closes a numbered question in the database:**

1. Is expungement filing genuinely free, and is there any fee at any stage? Wave 1 says the NJ Courts' own page states it is free and that the $75 fee was eliminated in the 2019 reforms — but flags that older sources still cite $75 and says to VERIFY on njcourts.gov and by phone. Sources conflict, so no fee is stated in the app; the results attribute the free claim to njcourts.gov rather than asserting it. Wave 1 wants to "wear it proudly" once confirmed, and it is worth confirming: free-and-online is New Jersey's headline.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
2. What is the current status of the AUTOMATED clean-slate system ordered by the 2019 law? Wave 1 says the rollout has been slow and backlogged, and says to verify before claiming any automation in the UI. Nothing in the tree claims it — no automatic path is encoded for New Jersey — but if it is running, people need to be told to check their records first, as in every other automated state.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the early-pathway waiting periods: 4 years via "compelling circumstances" instead of the standard 5, and Wave 1 flags a possible 3-year early path for DP-only records. The tree offers the 4-year compelling-circumstances route as a "talk to someone" result and does not encode the 3-year DP path at all, because it is flagged unverified.
   - *Blocks no single field — affects a branch or wording.*
4. What is the name and URL of the State Police backlog status portal created by the 2025 law (A3881)? Wave 1 flags both as unverified. State Police processing backlogs are documented, so a person needs to know where to check whether their granted expungement has actually been processed.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm how unpaid financial assessments are treated on the Clean Slate path: Wave 1 says a non-willful unpaid assessment does NOT block, and the court enters a civil judgment instead. This is disclosed in the results because it is user-relevant, but it is not verified.
   - *Blocks no single field — affects a branch or wording.*
6. Confirm the once-per-lifetime limit on the indictable expungement grant, and the crime-spree / interdependent-offences exception to it.
   - *Blocks no single field — affects a branch or wording.*
7. How are completed deferrals/diversions (including PTI and conditional discharge) treated? Standing call-sheet question for every state. Not covered in Wave 1.
   - *Blocks no single field — affects a branch or wording.*
8. What are the exact effective dates for the 2019 Clean Slate law and the 2025 venue expansion? Wave 1 gives years only.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. PENNSYLVANIA (PA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition for Limited Access — sealing (§ 9122.1, Pa.R.Crim.P. 791)** — Court of Common Pleas, county of conviction
- **Petition for Expungement (§ 9122) — destroys the record** — Court of Common Pleas (or Magisterial District Court for summary offenses), county of the case
- MyCleanSlatePA (Community Legal Services — free eligibility check) — https://mycleanslatepa.com
- PALawHelp — https://www.palawhelp.org

**Dates that govern:**
- 2024-06 — Automatic sealing of summary convictions began (operative) · Wave 1 gives month and year only ("started June 2024").
- 2024-06 — Pardoned offences automatically expunged (operative) · Wave 1 gives month and year only ("auto-expunged since June 2024").

**Verify — 8 open questions. Each answer closes a numbered question in the database:**

1. THE #1 PA VERIFY ITEM. What is the AUTOMATIC sealing period for 2nd/3rd-degree misdemeanours and misdemeanours punishable by 2 years or less under 18 Pa.C.S. § 9122.2 — 7 years or 10? Clean Slate 3.0 changed it and Wave 1's sources SPLIT: some say 7 applies to the petition only, others say 7 applies to both. Because the sources conflict, no automatic period is encoded — the tree routes to a result that says we do not know. Read § 9122.2's text directly rather than any summary.
   - *Blocks no single field — affects a branch or wording.*
2. What does it cost to file for expungement or limited access, and can it be waived? Wave 1 found fees vary BY COUNTY: Montgomery County $176.50 plus $13.50 per extra agency; other counties cited between $132 and $215. Wave 1 calls this Turnleaf's phone-verification showcase — verify Philadelphia, Allegheny and Montgomery, then decide whether to display per-county or as a verified range.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`, `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
3. Do unpaid fines and costs block AUTOMATIC sealing, and does unpaid restitution block it separately? Wave 1 found a conflict: Clean Slate 2.0 (Act 83 of 2020) removed unpaid fines/costs as a barrier, but at least one current source says unpaid restitution still blocks. Wave 1 says to encode restitution as blocking and fines/costs as not ONLY if § 9122.2's condition text confirms that split. It is not confirmed, so NOTHING in the tree gates on it — the results disclose the uncertainty instead.
   - *Blocks no single field — affects a branch or wording.*
4. What does a PSP criminal history record (epatch) cost? Wave 1 gives "~$22, VERIFY". It is needed for a petition, so it is part of the real cost of filing.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the sealing exclusion for anyone with 4 or more misdemeanours of the 2nd degree or higher. The tree asks a person to self-assess this; the record model cannot count it.
   - *Blocks no single field — affects a branch or wording.*
6. Confirm the "certain drug felonies after 10 years" automatic path added by Clean Slate 3.0, and which drug and property felonies qualify for the 10-year PETITION sealing path (total sentence under 7 years of confinement).
   - *Blocks no single field — affects a branch or wording.*
7. How are completed deferrals/diversions other than ARD treated? Standing call-sheet question for every state. ARD completion is covered by Wave 1 as an expungement path; nothing else is.
   - *Blocks no single field — affects a branch or wording.*
8. What are the exact effective dates for the June 2024 starts (automatic summary sealing; automatic expungement of pardoned offences)? Wave 1 gives month and year only.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. UTAH (UT)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave1_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **BCI Certificate of Eligibility (required before any petition)** — Utah Bureau of Criminal Identification (BCI)
- **Petition to Expunge Records** — The court that handled the case
- Clean Slate Utah (fee assistance available) — https://cleanslateutah.org
- Utah Legal Services — https://utahlegalservices.org

**Dates that govern:**
- 2026-01-01 — Automatic expungement process changed — form requirement ended, courts self-identify (effective) · Confirm the current process description before writing UI copy.

**Verify — 6 open questions. Each answer closes a numbered question in the database:**

1. What is the court filing fee for a Petition to Expunge Records, and if there is one, can it be waived? Wave 1 gives "~$135 per one source" and marks it VERIFY BY PHONE — one source and an approximation is not a fee. Ask both halves: the waiver answer is only knowable once the fee is.
   - *Blocks (null until answered):* `resources.remedies.petition.fees`, `resources.remedies.petition.feeWaiver`
2. The automatic-expungement process changed on Jan 1, 2026 — the form requirement ended and courts self-identify cases again. Confirm the current process on the utcourts self-help page, and confirm how a person checks whether their case was already auto-expunged.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the petition-vs-automatic period split against §§ 77-40a-303 and -205 directly. The same offence has a SHORTER petition period than automatic period (class C: 3 years petition vs 5 years automatic), which is counter-intuitive enough to be a transcription error somewhere. Both tracks are encoded separately and the tree tells people plainly that petitioning is faster — if the inversion is wrong, that advice is wrong.
   - *Blocks no single field — affects a branch or wording.*
4. BCI posts which date it is currently processing, and the backlog is real. What is the actual wait now? No duration is asserted anywhere in the app until this is answered.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed deferrals/diversions (including pleas in abeyance) treated for expungement? Not covered in Wave 1 — standing call-sheet question for every state. The tree hedges these rather than guess.
   - *Blocks no single field — affects a branch or wording.*
6. Confirm the § 77-40a-303(4)/(5) count limits and the § 303(8) "+1 if 10 years clean" allowance. The tree asks a person to self-assess this four-clause test because the record model cannot compute it; if the clauses are wrong, the master gate is wrong.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

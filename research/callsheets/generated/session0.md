# Turnleaf — Call Session 0 (Wave 0: AZ · CA · NY · TX)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 0`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**32 open questions across 4 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ARIZONA (AZ)

**Status:** `statute_cited` · reviewed 2026-07-15 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Seal Case Records (ARS § 13-911)** — Clerk of the court that handled the original case
- **Application to Set Aside Conviction (ARS § 13-905)** — Clerk of the Superior Court / Municipal or Justice Court Clerk (wherever you were sentenced)
- AZLawHelp (Arizona Legal Services) — https://www.azlawhelp.org
- Community Legal Services (Phoenix) — https://www.clsaz.org

**Dates that govern:**
- 2023-01-01 — ARS § 13-911 record sealing available (effective) · The sealing remedy did not exist before this date.
- 2021 — Certificate of Second Chance added to § 13-905 (effective) · Wave 0 gives the year only. The exact effective date is an open question.

**Verify — 8 open questions. Each answer closes a numbered question in the database:**

1. Two amounts for the § 13-911 sealing petition. (a) What does the DPS investigation fee cost? § 13-911(H) confirms it exists but leaves the amount to the DPS director, so it is not in the statute — only DPS or a clerk can say. (b) Is there a court filing fee on top, and how much? § 13-911 does not mention one, which is not the same as there being none. The waiver rule is already answered by § 13-911(H).
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`
2. Is a DUI misdemeanor eligible for a set-aside, and is it excluded from § 13-911 sealing? DUI does not appear among the § 13-911(O) items recorded on 7/15 — but that list was given as "including", not as exhaustive, so its absence is not an answer. The tree still hedges DUI rather than infer from a partial list.
   - *Blocks no single field — affects a branch or wording.*
3. For a specific case, which exclusion list does the offense actually fall on? § 13-905(P) (set-aside) covers dangerous, registrable, sexual-motivation and victim-under-15 offenses. § 13-911(O) (sealing) adds serious/violent/aggravated offenses under § 13-706, dangerous crimes against children, sex trafficking, deadly-weapon or serious-injury elements, and the chapter 14/35.1 felony classes. The tree asks a person to self-assess both. Whether an offense was found "dangerous", or carried a sexual-motivation finding, is a legal finding in the case file — worth asking a clerk how someone reads that off their own paperwork.
   - *Blocks no single field — affects a branch or wording.*
4. Statute confirmed: § 13-911(A)(2)-(3) sets NO waiting period for dismissed, acquitted or never-charged cases, and the tree now tells people they can file now. What remains is clerk practice — will a counter accept a petition on a case dismissed last week, and does the § 13-911(H) fee waiver get applied without a fight?
   - *Blocks no single field — affects a branch or wording.*
5. How are completed deferrals/diversions treated for sealing? Not covered in Wave 0 — add to call sheet. The tree hedges these rather than guess (see unknown_deferred).
   - *Blocks no single field — affects a branch or wording.*
6. Marijuana expungement (ARS § 36-2862) is encoded as its own branch and asked before the set-aside/sealing ladder. Statute checked 7/15. What is left is practice, not law: which form does the court want, how long does a § 36-2862 petition take, and does the "no fee" hold at the counter?
   - *Blocks no single field — affects a branch or wording.*
7. What is the exact effective date of the Certificate of Second Chance addition to ARS § 13-905? Wave 0 gives only the year (2021), so it is recorded in no keyDate rather than guessed at.
   - *Blocks no single field — affects a branch or wording.*
8. Confirm plainly: there is no automatic record-clearing in Arizona — every remedy is petition-based, correct? Wave 0 says so and the app states it as fact in its terminology and its user-facing copy, so it needs the same confirmation any other asserted claim gets. Users arrive expecting "clean slate" automation because other states have it.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. CALIFORNIA (CA)

**Status:** `draft` · reviewed 2026-07-15 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Arrest Record Sealing (PC 851.91 / 851.87)** — County Superior Court Clerk
- **Petition for Dismissal (PC 1203.4 / 1203.4a / 1203.41)** — County Superior Court Clerk
- LawHelpCA — https://www.lawhelpca.org
- Root & Rebound — https://www.rootandrebound.org

**Dates that govern:**
- 2024-10-01 — Automatic record relief fully operative (PC § 1203.425) (operative) · AB 1076 (2019) as expanded by SB 731, after two delays: AB 134 pushed it to Jul 2024, AB 168 to Oct 2024. This final date is the one that governs.
- 2022-08 — Courts barred from disclosing set-asides (effective) · Wave 0 gives month and year only ("since Aug 2022"). Applies to all set-asides, past and future — this is what makes them function as sealing.

**Verify — 7 open questions. Each answer closes a numbered question in the database:**

1. Is there any filing fee for the PC § 1203.4 dismissal petition (Form CR-180)? Recent sources say none statewide following the AB 1076-era fee elimination, but older county fee schedules show roughly $120-150. Wave 0 calls this "a perfect confirm-kill call" — ask an LA Superior Court clerk.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
2. Is arrest sealing under PC § 851.91 / § 851.87 genuinely free, and if there is a fee, is a waiver available? The encoded rules asserted "$0, no filing fee under state law", but Wave 0 does not address arrest sealing fees at all and no source is recorded for the claim.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
3. What are the exact felony tiers for automatic relief under the current PC § 1203.425(b)? Wave 0 gives "generally 4 yrs post-sentence for non-serious/non-violent" but flags the tiers as unverified. The 4-year figure has been removed from user-facing messages until this is confirmed.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the PC § 1203.41 waiting period for felony/realignment cases. Wave 0 gives "2 yrs post-completion" but flags it. The figure has been removed from the complex_prison message until confirmed.
   - *Blocks no single field — affects a branch or wording.*
5. What are the sub-criteria for automatic misdemeanour relief at 1 year after judgment under PC § 1203.425? Wave 0 gives the 1-year period but flags the sub-criteria as unverified.
   - *Blocks no single field — affects a branch or wording.*
6. Verify adjacent-remedy statute references: PC § 4852.01 (Certificate of Rehabilitation), PC § 17(b) (felony reduction), PC § 1203.3 (early termination of probation), and PC § 290.5 (ending registration). These are cited in user-facing messages but appear nowhere in Wave 0 — they entered the rules from outside the research package.
   - *Blocks no single field — affects a branch or wording.*
7. The automatic relief layer (PC §§ 851.93, 1203.425) is not encoded as a branch — it exists only as prose inside petition results. The "check your record first" posture Wave 0 calls for has no structural representation.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. NEW YORK (NY)

**Status:** `draft` · reviewed 2026-07-15 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **CPL 160.59 Sealing Motion (petition path)** — Sentencing Court Clerk (Supreme / County / City / Town Court)
- **Clean Slate Automatic Sealing (CPL 160.57)** — NYS Unified Court System / Division of Criminal Justice Services
- LawHelpNY — https://www.lawhelpny.org
- Legal Aid Society of NYC — https://www.legalaidnyc.org
- Clean Slate NY (info & webinars) — https://www.cleanslateny.org

**Dates that govern:**
- 2024-11-16 — Clean Slate Act (CPL § 160.57) effective (effective)
- 2027-11-16 — OCA deadline to seal the pre-existing backlog (deadline) · Until this date the rollout is incomplete: many eligible old records are NOT yet sealed. "Eligible" and "sealed" are different states and the copy must not blur them.
- 2017 — Petition sealing (CPL § 160.59) enacted (effective) · Wave 0 gives the year only.

**Verify — 8 open questions. Each answer closes a numbered question in the database:**

1. Is there a filing fee for the CPL § 160.59 sealing motion, and if there is, is a waiver available? Wave 0 says "No filing fee" but flags it for verification.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
2. Confirm the supervision condition for Clean Slate sealing: must the person be off probation/parole entirely? Wave 0 flags this. The whole supervision_status branch and the ineligible_supervision result rest on it.
   - *Blocks no single field — affects a branch or wording.*
3. Are Penal Law § 70.02 violent felonies eligible for Clean Slate automatic sealing after the 8-year wait? (Package sources conflicted.) Wave 0's rules section lists Clean Slate exclusions as sex offences (Arts. 130/263) and non-drug Class A felonies only — § 70.02 appears solely as a CPL 160.59 petition exclusion — but Wave 0's own persona 3 says a violent felony is excluded from BOTH paths. Resolved to the rules section pending confirmation. This is a practitioner question (Legal Aid Society / LawNY), not a clerk question.
   - *Blocks no single field — affects a branch or wording.*
4. The Clean Slate clock resets on a new conviction. This has no representation in the tree — the date nodes only ask for one date and cannot model a reset.
   - *Blocks no single field — affects a branch or wording.*
5. How are completed deferrals/diversions treated for sealing? Not covered in Wave 0 — add to call sheet. The tree hedges these rather than guess (see unknown_deferred).
   - *Blocks no single field — affects a branch or wording.*
6. What is the current Clean Slate rollout status? Wave 0 names this as the call question for nycourts.gov — how far through the backlog is OCA, and can a person find out whether their own record has been reached?
   - *Blocks no single field — affects a branch or wording.*
7. MRTA cannabis expungement (2021) is a real New York remedy that Wave 0 documents, but it is not encoded as a branch and is not surfaced anywhere in the tree.
   - *Blocks no single field — affects a branch or wording.*
8. The Certificate of Disposition cost ($5 outside NYC, $10 within) is stated in the filing steps but appears nowhere in Wave 0 — it entered the rules from outside the research package. Confirm with a court clerk.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. TEXAS (TX)

**Status:** `draft` · reviewed 2026-07-15 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition for Expunction (CCP Ch. 55A)** — County District Court Clerk
- **Order of Nondisclosure** — Sentencing Court Clerk
- TexasLawHelp — https://texaslawhelp.org
- Lone Star Legal Aid — https://www.lonestarlegal.org

**Dates that govern:**
- 2025-01-01 — Expunction recodified from CCP Ch. 55 to Ch. 55A (effective) · HB 4504. Substance largely carried over. Most of the internet — including older forms and guides — still cites Ch. 55; every citation here reads 55A deliberately.

**Verify — 9 open questions. Each answer closes a numbered question in the database:**

1. What does an expunction actually cost? Wave 0 gives "civil filing fee, county-set, ~$280-$400 range commonly cited, plus per-agency service costs" — "commonly cited" is not a source. The encoded rules said $300-$450, which does not even match. Ask a Harris County district clerk for both fee stacks.
   - *Blocks (null until answered):* `resources.remedies.expunction.fees`
2. What does an Order of Nondisclosure cost? Wave 0 gives "civil filing fee + $28 statutory fee"; the encoded rules said "approximately $280 to $350" and never mentioned the $28 statutory fee at all. Ask a Harris County district clerk.
   - *Blocks (null until answered):* `resources.remedies.nondisclosure.fees`
3. CONFLICT: what is the waiting period under Gov't Code § 411.0735 for certain misdemeanour convictions? Wave 0 records that sources split between 2 and 5 years and says to encode from the statute. Because the sources disagree, no period is encoded — this path stays prose-only until the statute settles it, then it gets a real branch.
   - *Blocks no single field — affects a branch or wording.*
4. Does CCP Ch. 55A create AUTOMATIC expunction at acquittal — the trial court ordering it then and there? Wave 0 flags this as new and unverified. It matters directly: if true, an acquitted person may already have relief and should confirm it happened rather than petition. The eligible_expunction message now says both.
   - *Blocks no single field — affects a branch or wording.*
5. Which dismissals qualify for expunction without community supervision, and what are the "certain automatic-dismissal pathways" Wave 0 flags?
   - *Blocks no single field — affects a branch or wording.*
6. Map the correct DWI nondisclosure section numbers (§§ 411.0726 / .0731 / .0736). Wave 0 gives the rule — first-offence DWI, BAC under 0.15, no accident involving another person, no CDL: 2 years with full-term ignition interlock, 5 years without — but flags the section mapping. Neither the rule nor the interlock condition is encoded as a branch.
   - *Blocks no single field — affects a branch or wording.*
7. The 180-day Class C expunction wait cannot be encoded yet: the screening form offers only misdemeanour/felony/infraction and has no way to say "Class C". A Class C arrestee currently gets the Class A/B 1-year rule and may be told to wait when they are already eligible. Needs a form value before it can be a branch.
   - *Blocks no single field — affects a branch or wording.*
8. Confirm the TexasLawHelp expunction kit URL and whether the county requires its own form. The current formUrl points at the site root because the deep link was never verified.
   - *Blocks no single field — affects a branch or wording.*
9. Confirm the first-DWI nondisclosure timing and which section governs: 2 years after sentence completion with a full-term ignition interlock, 5 years without? Wave 0 gives the rule but flags the mapping across §§ 411.0726 / .0731 / .0736. The DWI path is disclosed in prose on the conviction result but is NOT a branch — the tree has no interlock question — so a first-DWI person is currently told less than the research knows.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

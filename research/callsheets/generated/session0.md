# Turnleaf — Call Session 0 (Wave 0: AZ · CA · NY · TX)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 0`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**25 open questions across 4 states.**

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

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Arrest Record Sealing (PC 851.91 / 851.87)** — County Superior Court Clerk
- **Petition for Dismissal (PC 1203.4 / 1203.4a / 1203.41)** — County Superior Court Clerk
- LawHelpCA — https://www.lawhelpca.org
- Root & Rebound — https://www.rootandrebound.org

**Dates that govern:**
- 2024-10-01 — Automatic record relief fully operative (PC § 1203.425) (operative) · AB 1076 (2019) as expanded by SB 731, after two delays: AB 134 pushed it to Jul 2024, AB 168 to Oct 2024. This final date is the one that governs.
- 2022-08 — Courts barred from disclosing set-asides (effective) · Wave 0 gives month and year only ("since Aug 2022"). Applies to all set-asides, past and future — this is what makes them function as sealing.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Is there any filing fee for the PC § 1203.4 dismissal petition (Form CR-180)? Recent sources say none statewide following the AB 1076-era fee elimination, but older county fee schedules show roughly $120-150. Wave 0 calls this "a perfect confirm-kill call" — ask an LA Superior Court clerk. (Practice tier; the statute Diana verified is silent on it.)
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
2. Is arrest sealing under PC § 851.91 / § 851.87 genuinely free, and if there is a fee, is a waiver available? Diana verified § 851.91's eligibility (7/16) but the statute does not settle the filing fee — practice tier.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
3. Adjacent-remedy statutes cited only in result PROSE, not yet human-read: PC § 4852.01 (Certificate of Rehabilitation), § 17(b) (felony reduction), § 1203.3 (early termination of probation), § 290.5 (ending registration). No routing claim traces to them (badge call, 7/16 — CA flipped to statute_cited on the six verified sections + 1203.4 with these retained as unread citations). Read them when convenient to link.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. NEW YORK (NY)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **CPL 160.59 Sealing Motion (petition path)** — Sentencing Court Clerk (Supreme / County / City / Town Court)
- **Clean Slate Automatic Sealing (CPL 160.57)** — NYS Unified Court System / Division of Criminal Justice Services
- LawHelpNY — https://www.lawhelpny.org
- Legal Aid Society of NYC — https://www.legalaidnyc.org
- Clean Slate NY (info & webinars) — https://www.cleanslateny.org

**Dates that govern:**
- 2024-11-16 — Clean Slate Act (CPL § 160.57) effective (effective)
- 2027-11-16 — OCA deadline to seal the pre-existing backlog (deadline) · CPL 160.57 subd. 6: OCA must complete sealing of pre-effective-date convictions no later than 3 years after the effective date. Until then many eligible old records are NOT yet sealed — "eligible" and "sealed" are different states and the copy must not blur them.
- 2017 — Petition sealing (CPL § 160.59) enacted (effective) · Wave 0 gives the year only.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Is there a filing fee for the CPL § 160.59 sealing motion, and if there is, is a waiver available? The statute is SILENT on a filing fee (Diana, 7/16), so this is an OCA/practice question, not statute-resolved — the fee and waiver fields stay null pending it.
   - *Blocks (null until answered):* `resources.remedies.sealing.fees`, `resources.remedies.sealing.feeWaiver`
2. Clock-reset modeling limitation (not a legal unknown). Diana confirmed the mechanic (7/16): under CPL 160.57 a new conviction before sealing restarts the prior conviction's clock on the SAME date as the new conviction's clock; under 160.59 subd. 5, time incarcerated after the latest conviction tolls the 10-year period. The single-date tree cannot model a multi-conviction reset — the copy states it in prose instead.
   - *Blocks no single field — affects a branch or wording.*
3. What is the current Clean Slate rollout status? Wave 0 names this as the call question for nycourts.gov — how far through the backlog is OCA (subd. 6 deadline Nov 16, 2027), and can a person find out whether their own record has been reached?
   - *Blocks no single field — affects a branch or wording.*
4. The Certificate of Disposition cost ($5 outside NYC, $10 within) is stated in the § 160.59 filing steps but is a court-clerk practice figure, not in the verified statute. Confirm the current cost with a court clerk.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. TEXAS (TX)

**Status:** `statute_cited` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave0_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition for Expunction (CCP Ch. 55A)** — County District Court Clerk
- **Order of Nondisclosure** — Sentencing Court Clerk
- TexasLawHelp — https://texaslawhelp.org
- Lone Star Legal Aid — https://www.lonestarlegal.org

**Dates that govern:**
- 2025-01-01 — Expunction recodified from CCP Ch. 55 to Ch. 55A (effective) · HB 4504. Substance largely carried over. Most of the internet — including older forms and guides — still cites Ch. 55; every citation here reads 55A deliberately.

**Verify — 10 open questions. Each answer closes a numbered question in the database:**

1. Before any TX DWI nondisclosure branch is built on § 411.0731, do a FULL read of the section. Only subsection (f) — the waiting ladder (2 years with an ignition interlock, 5 without) — has been human-verified against the official text (it surfaced via a page-break spillover in the retrieved PDF); the section's applicability and conditions are unread. The link on the 411.0731 source is kept because the sole currently-encoded claim traces to that verified (f) text, but no further 411.0731 rule may be encoded until the whole section is read.
   - *Blocks no single field — affects a branch or wording.*
2. What is the base civil filing fee for an expunction petition in a given county? The statute answers the rest: electronic service on the listed entities is free, $25 per entity that cannot receive electronic transmission (Art. 55A.254(e)-(f), 2025 amendment), and a specialty-court expunction may carry no fee at all (Art. 55A.203(c)). Ask a Harris County district clerk for the base filing fee, and confirm they are applying the 2025 electronic-service rule rather than the old per-agency charges.
   - *Blocks (null until answered):* `resources.remedies.expunction.fees`
3. What does an Order of Nondisclosure cost? Wave 0 gives "civil filing fee + $28 statutory fee"; the encoded rules said "approximately $280 to $350" and never mentioned the $28 statutory fee at all. Ask a Harris County district clerk.
   - *Blocks (null until answered):* `resources.remedies.nondisclosure.fees`
4. CONFLICT: what is the waiting period under Gov't Code § 411.0735 for certain misdemeanour convictions? Wave 0 records that sources split between 2 and 5 years and says to encode from the statute. Because the sources disagree, no period is encoded — this path stays prose-only until the statute settles it, then it gets a real branch.
   - *Blocks no single field — affects a branch or wording.*
5. Two Ch. 55A bars are disclosed in the results but NOT gated by the tree, because each turns on a fact we do not ask about. Art. 55A.153: an arrest for violating community supervision is never expungable. Art. 55A.154: absconding bars expunction. Ask legal aid how often each actually bites in practice, and whether a person can tell from their own paperwork that one applies — if they can, both should become questions rather than paragraphs.
   - *Blocks no single field — affects a branch or wording.*
6. Can a person actually tell which Art. 55A.053 dismissal reason applies to them from their own paperwork? The tree asks them to pick one — veterans court, mental health court, pretrial intervention, no probable cause / mistake / false information, or void indictment — and routes "I don't know" to a hedge that says to get the dismissal order. Ask a district clerk what the order typically says, and whether the recorded reason is legible to a non-lawyer.
   - *Blocks no single field — affects a branch or wording.*
7. Map the correct DWI nondisclosure section numbers (§§ 411.0726 / .0731 / .0736). Wave 0 gives the rule — first-offence DWI, BAC under 0.15, no accident involving another person, no CDL: 2 years with full-term ignition interlock, 5 years without — but flags the section mapping. Neither the rule nor the interlock condition is encoded as a branch.
   - *Blocks no single field — affects a branch or wording.*
8. The 180-day Class C expunction wait cannot be encoded yet: the screening form offers only misdemeanour/felony/infraction and has no way to say "Class C". A Class C arrestee currently gets the Class A/B 1-year rule and may be told to wait when they are already eligible. Needs a form value before it can be a branch.
   - *Blocks no single field — affects a branch or wording.*
9. Confirm the TexasLawHelp expunction kit URL and whether the county requires its own form. The current formUrl points at the site root because the deep link was never verified.
   - *Blocks no single field — affects a branch or wording.*
10. Confirm the first-DWI nondisclosure timing and which section governs: 2 years after sentence completion with a full-term ignition interlock, 5 years without? Wave 0 gives the rule but flags the mapping across §§ 411.0726 / .0731 / .0736. The DWI path is disclosed in prose on the conviction result but is NOT a branch — the tree has no interlock question — so a first-DWI person is currently told less than the research knows.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

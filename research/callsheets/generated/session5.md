# Turnleaf — Call Session 5 (Wave 5: AL · LA · MD · SC · WI)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 5`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**21 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ALABAMA (AL)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement Petition (Ala. Code § 15-27)** — Circuit court of the county where the charges were filed
- Montgomery Volunteer Lawyers Program (CLE handout) — https://www.montgomeryvlp.org
- Alabama Board of Pardons and Paroles — https://paroles.alabama.gov

**Dates that govern:**
- 2024-10-01 — $500 administrative filing fee (raised from $300, Act 2024-407) (effective) · Per case/arrest event. One fee covers multiple charges from the same arrest. Confirm the current amount.
- 2021-07-01 — REDEEMER Act — misdemeanour conviction expungement (effective) · 3 years from conviction. DUI was explicitly made a "serious traffic" offence (never expungeable) as of July 1, 2023.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Confirm the current administrative filing fee: Wave 5 gives $500 per case/arrest event (raised from $300 by Act 2024-407, effective Oct 1, 2024) and flags it. This is the main Alabama call. Confirm the amount and, critically, the § 15-27-4 indigency-relief mechanics with a circuit clerk.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
2. Confirm the § 15-27-2.1 lifetime cap: Wave 5 says secondary sources report 2 misdemeanour-conviction expungements lifetime, and flags verifying the section text. The tree does not gate on this (it cannot count priors); it is disclosed in prose.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the felony pardon-then-expunge mechanics: a full pardon with restoration of civil and political rights from the Board of Pardons and Paroles, plus 180 days from the certificate, not violent/sex/moral-turpitude/serious-traffic, 1 pardoned-felony expungement lifetime. Also the Act 2015-185 reclassified-felony exception (15-yr clean record).
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the moral-turpitude offence list that bars misdemeanour-conviction expungement alongside violent, sex, and serious-traffic offences. The tree asks a person whether their offence is excluded; the moral-turpitude list is specific and needs confirming.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. LOUISIANA (LA)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Expunge (La. C.Cr.P. arts. 971-995)** — The parish of arrest or conviction; LSP BCII for the automated request
- Justice & Accountability Center of Louisiana (CLEAN JACKET app; (504) 273-1091) — https://www.jaclouisiana.org
- Louisiana Law Help — https://www.louisianalawhelp.org

**Dates that govern:**
- 2025-01-01 — SB 111 automated/free expungement request system (LSP BCII) live (operative) · Covers art. 976/977/978-eligible records back to Jan 1, 2006. Submit basic info, Bureau expunges eligible records within 30 days, free. No damages remedy if records are missed. Verify the portal is operational.
- 2026-08-01 — First-offence marijuana possession fee reduced to $300 (sunsets) (deadline) · The reduced $300 fee for first-offence marijuana possession sunsets on this date, after which it reverts. Dated urgency for that specific case.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Is the SB 111 automated expungement portal actually live and working? Wave 5 calls this the state's biggest story and says to verify operational reality — is the online portal live, what is it called, is it processing requests? The tree leads eligible results with "try the free automated request first"; confirm it exists before the copy leans on it. LSP BCII expungement page is the check.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the art. 978(F) felony-count rule against the current article text: a person may expunge MORE THAN ONE felony in a 10-year period if each is eligible (the old 15-year/one-shot limit was repealed 2020). Wave 5 says encode from the article, not the guides that still say one-per-lifetime. The tree does not cap felonies; confirm.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the fee structure: Wave 5 caps it at $550 ($250 LSP BCII + $50 sheriff + $50 DA + up to $200 clerk), nonrefundable, one fee per arrest event. First-offence marijuana possession is $300 until Aug 1, 2026. DA-certified fee waiver only for non-conviction outcomes with zero felony history; expedited (17-yr-old arrestee, 2025) and trafficking-victim paths fee-exempt. Confirm the clerk portion with a parish clerk.
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`
4. Confirm the art. 978(E) six-offence violent carve-out list (aggravated battery, second-degree battery, aggravated criminal damage, simple robbery, purse snatching, illegal use of weapons — expungable after 10 yrs via contradictory hearing) and the general exclusion list (crimes of violence R.S. 14:2(B), sex-registry, crimes against minors, domestic abuse battery, certain CDS). The tree asks these; confirm the lists.
   - *Blocks no single field — affects a branch or wording.*
5. Confirm the art. 893/894 set-aside-and-dismiss immediate expungement path, and the non-conviction charging-time-limit waits (felony-hard-labour 6 yrs / other felony 4 / misdemeanour 2 / fine-only 6 mo where there was no prosecution). The tree routes deferred to an immediate set-aside result and non-convictions to a general result.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MARYLAND (MD)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement of a Conviction (Md. Crim. Proc. § 10-110)** — The court of the case
- Maryland Court Help Centers (free brief advice) — https://www.mdcourts.gov/legalhelp
- Maryland Volunteer Lawyers Service (MVLS) — https://www.mvlslaw.org

**Dates that govern:**
- 2023-10-01 — REDEEM Act — conviction waiting periods cut (effective) · Eligible misdemeanours 5 yrs (was 10), second-degree assault 7 (was 15), eligible felonies 7, burglary 1/2 + felony theft 10 (was 15). Several sites still quote the un-passed 3/5-year version.
- 2021-10 — Automatic expungement of acquittals and full dismissals began (operative) · Wave 5 gives month and year only. NOT retroactive — older cases petition. Verify the mechanics.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. What actually passed in Maryland's 2025 legislative session? Wave 5 flags a "2025 Expungement Reform Act" headline and says to verify what passed before encoding. The tree encodes the enacted REDEEM Act (2023) waits; confirm whether 2025 changed anything against the MVLS 2025 presentation.
   - *Blocks no single field — affects a branch or wording.*
2. Does "sentence completed" for the conviction waiting clock include full expiration of parole and probation? Wave 5 flags this as contested (2024 HB 73 stalled). The tree anchors on completion of sentence including probation/parole; confirm current practice.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 10-110 eligible-offence list itself: Wave 5 notes REDEEM cut the WAITS but did NOT expand the eligible-offence list (mostly nonviolent misdemeanours plus a short felony list). The tree asks a person whether their offence is eligible; the list needs confirming.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the non-conviction mechanics: automatic expungement of acquittals/full dismissals since Oct 2021 (not retroactive), nolle prosequi (3-yr wait or immediate with general waiver), and stet (3 yrs). Wave 5 flags the nolle and automatic mechanics.
   - *Blocks no single field — affects a branch or wording.*
5. What is the conviction petition fee? Wave 5 gives "$30 per petition, waivable" and flags it; non-conviction expungements are free. Confirm with a clerk.
   - *Blocks (null until answered):* `resources.remedies.conviction.fees`

---

## 4. SOUTH CAROLINA (SC)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement through the Circuit Solicitor (S.C. Code § 17-22-910 et seq.)** — The circuit solicitor's office (16 judicial circuits)
- South Carolina Courts — Expungement self-help — https://www.sccourts.org/selfHelp/
- SC Appleseed Legal Justice Center — https://www.scjustice.org

**Dates that govern:**
- 2009-06 — Automatic free expungement of summary-court non-convictions (operative) · Wave 5 gives month and year only. Magistrate/municipal dismissals and not-guilty verdicts (§ 17-22-950).

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. Did the general first-offense nonviolent expungement bill (§ 17-22-915, H.4602 / H.3730) become law? Wave 5 says it has been filed repeatedly and was NOT law as of the research date — verify the session status. If it passed, South Carolina changes fundamentally (a broad 3-year path). The tree encodes current law (the closed statute list); confirm nothing passed.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the $310 fee breakdown and refund mechanics: Wave 5 gives $250 solicitor admin + $25 SLED verification + $35 clerk, separate money orders, nonrefundable if denied at the SLED stage but the $35 returns if the solicitor rejects. Confirm current amounts and the refund rule (per the 14th circuit's description).
   - *Blocks (null until answered):* `resources.remedies.expungement.fees`, `resources.remedies.expungement.feeWaiver`
3. Confirm the plea-deal dismissal fee rule: Wave 5 says General Sessions dismissals/nolle pros are free through the solicitor if NOT part of a plea deal, but plea-deal dismissals pay full fees. Verify.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the § 22-5-930 first-offense drug-possession conditional-discharge 10-year lookback quirk, and the § 22-5-920 Youthful Offender Act retroactive path for pre-2010 convictions. The tree uses the standard 3-yr and 5-yr periods; these nuances are flagged.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. WISCONSIN (WI)

**Status:** `draft` · reviewed 2026-07-16 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Governor's Pardon (the route for most Wisconsin convictions)** — Governor's Pardon Advisory Board
- Wisconsin Governor — Pardon Information — https://evers.wi.gov/Pages/Pardon-Information.aspx
- Wisconsin Court System — Expungement information — https://www.wicourts.gov

**Dates that govern:**
- 2019 — Governor's pardon process revived (operative) · Wave 5 gives the year only. Felony convictions, generally 5 years post-sentence-completion, via the Pardon Advisory Board.

**Verify — 3 open questions. Each answer closes a numbered question in the database:**

1. Confirm no expungement-petition process passed in the 2025-26 Wisconsin session. Wave 5 says reform failed again — Evers put a petition process in the budget (LRB-1770), the Legislature stripped it; Assembly bills passed in 2021 and 2024 but the Senate never voted. As of the research date the answer is no. Verify nothing passed in the weeks since before softening the honest-no.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the current Governor's pardon criteria and wait: Wave 5 gives felony convictions, ~5 years post-sentence-completion, via the Pardon Advisory Board, with some expedited review since 2021. The tree routes most people here; confirm the criteria.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 973.015(1m)(a)3 exclusion list (listed violent Class H felonies and others) and the special tracks: juvenile § 938.355(4m) petition at 17, and trafficking-survivor § 973.015(2m) motion for prostitution convictions anytime. The tree asks the at-sentencing question; these are disclosed.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

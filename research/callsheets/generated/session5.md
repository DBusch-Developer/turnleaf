# Turnleaf — Call Session 5 (Wave 5: AL · LA · MD · SC · WI)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 5`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**19 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. ALABAMA (AL)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement Petition (Ala. Code § 15-27)** — Circuit court (criminal division) of the county where the charges were filed
- Montgomery Volunteer Lawyers Program (CLE handout) — https://www.montgomeryvlp.org
- Alabama Board of Pardons and Paroles — https://paroles.alabama.gov

**Dates that govern:**
- 2024-10-01 — $500 administrative filing fee (raised from $300, Act 2024-407) (effective) · Per ARREST — one fee covers multiple charges from a single arrest; multiple arrests pay one each (§ 15-27-4). A condition precedent to any ruling. Waived on an indigency finding; a no-probable-cause finding waives court costs but NOT the $500.
- 2021-07-01 — REDEEMER Act — misdemeanor conviction expungement (effective) · 3 years from conviction, all money paid; excludes violent, sex, moral-turpitude, and serious-traffic (DUI) offenses, and CDL offenses committed in a commercial vehicle (§ 15-27-1(b)).
- 2025 — Act 2025-427 — discretion shape codified (§ 15-27-5) (effective) · No RIGHT to expungement; denial is within the court's sole discretion — BUT the court SHALL grant when reasonably satisfied the requirements are met. The court has explicit discretion over the NUMBER of cases expunged after the first (a first qualifying petition carries a strong grant presumption). Whether a dismissal was part of a negotiated plea is a hearing factor.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Pull §§ 15-27-7 (criminal-justice/DA inspection), 15-27-9 (order mechanics), 15-27-10 (exception to order scope), 15-27-16 (disclosure limits) — all referenced by the pulled text but not yet read; the effect/disclosure copy relies on their cross-references.
   - *Blocks no single field — affects a branch or wording.*
2. Pull the cross-referenced offense lists — § 12-25-32 (violent offenses), § 15-20A-5 (sex offenses), § 17-3-30.1 (moral-turpitude offenses) — and Title 32 Ch. 5A Art. 9 (serious traffic). The exclusion screens key on those cross-references and ask the person until the lists are enumerated.
   - *Blocks no single field — affects a branch or wording.*
3. Board of Pardons and Paroles application mechanics — the felony-conviction path requires a full pardon with rights restored FIRST, but the pardon process itself is outside Chapter 15-27. Confirm the current pardon-application timeline and criteria (phone/pull tier) for the "pardon first" guidance.
   - *Blocks no single field — affects a branch or wording.*
4. Session sweep: verify whether any 2025-26 act other than Act 2025-427 amended §§ 15-27-1 through -16, and confirm the youthful-offender interaction (Chapter 15-19) referenced by § 15-27-1(b).
   - *Blocks no single field — affects a branch or wording.*
5. The § 15-27-3(c) victim-notice cross-reference points to "(4)a. of Section 15-27-2," which reflects pre-amendment numbering (the current § 15-27-2 renumbered). The tree applies victim notice to violent-offense-related petitions and flags the drafting artifact; confirm the intended target on the next pull.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. LOUISIANA (LA)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Expunge (La. C.Cr.P. arts. 971-999)** — The parish of arrest or conviction (clerk of court)
- Justice & Accountability Center of Louisiana (CLEAN JACKET app; (504) 273-1091) — https://www.jaclouisiana.org
- Louisiana Law Help — https://www.louisianalawhelp.org

**Dates that govern:**
- 2026-08-01 — First-offense marijuana-possession expungement fee $300 (sunsets to $550) (deadline) · La. C.Cr.P. art. 983(M): a first-offense marijuana-possession expungement is capped at $300 ($50 LBCII + $50 sheriff + $50 DA + $150 clerk) until Aug 1, 2026; on or after that date it reverts to the $550 schedule. Dated urgency for that specific case through 7/31/26.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Is there any BROADER automatic/automated expungement beyond Art. 999's free expedited path for a 17-year-old arrestee's non-conviction? The pulled Title XXXIV text is motion-based; the SB-111-style "automated Bureau request covering records back to 2006" is NOT in the pulled articles. Treat LA's general automatic track as UNVERIFIED and confirm whether any 2025-26 act funded or codified one outside Title XXXIV.
   - *Blocks no single field — affects a branch or wording.*
2. Art. 973(E) has TWO texts: the baseline (encoded live) and an EXPANDED version (adds judges/magistrates/commissioners, bail-setting, and sentencing use of expunged records) that takes effect only upon legislative appropriation per Acts 2023 No. 454. Confirm the appropriation status before treating the expanded version as live — session-law / phone tier.
   - *Blocks no single field — affects a branch or wording.*
3. Cite-only mechanics NOT pulled — pull before relying on their details: Art. 979 (service of the motion), Art. 980 (contradictory-hearing procedure for the 978(E) violent carve-out), Art. 982 (service of the 999 expedited order), Art. 985.1 (interim expungement of a felony arrest), R.S. 15:578.1 (the DWI-diversion 5-year-from-arrest text), R.S. 14:2(B)/890.3 (crime-of-violence designation), R.S. 15:587.1 (licensing-board background-check scope).
   - *Blocks no single field — affects a branch or wording.*
4. The clerk portion of the § 983 fee (up to $200) varies by parish. The statutory cap is encoded; confirm the actual clerk charge with the parish clerk of court where the motion is filed.
   - *Blocks no single field — affects a branch or wording.*
5. Session-law sweep: the history lines in this pull end at the 2024 acts. Verify whether any 2025-26 act amended arts. 971-999 (especially the fee schedule, the 978 exclusion/CDS lists, or the marijuana-fee sunset) before the next review.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MARYLAND (MD)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement of a Conviction (Md. Crim. Proc. § 10-110)** — The court of the case
- Maryland Court Help Centers (free brief advice) — https://www.mdcourts.gov/legalhelp
- Maryland Volunteer Lawyers Service (MVLS) — https://www.mvlslaw.org

**Dates that govern:**
- 2023-10-01 — REDEEM Act — conviction waiting periods cut (effective) · Eligible misdemeanours 5 yrs (was 10), second-degree assault + common-law battery 7 (was 15), eligible felonies 7, burglary 1st/2nd + felony theft 10 (was 15). Several sites still quote the un-passed 3/5-year version.
- 2021-10-01 — § 10-105.1 automatic expungement of qualifying non-convictions (effective) · Qualifying non-convictions disposed on/after 10/1/2021 (acquittal, dismissal, not guilty, nolle except nolle-with-treatment; all charges) are expunged AUTOMATICALLY, effective 3 years after disposition (§ 10-105.1). Not retroactive — older cases petition. An immediate petition is available with a written general waiver and release of tort claims (§ 10-105(c)(1)).

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. What actually passed in Maryland's 2025 legislative session? A "2025 Expungement Reform Act" headline was flagged; confirm whether anything changed against the enacted REDEEM Act (2023) waits encoded here.
   - *Blocks no single field — affects a branch or wording.*
2. What is the conviction petition FEE amount and current clerk practice? The § 10-103 arrest path is free by statute; the "$30 per conviction petition" figure is not in the sections pulled — confirm the amount with a clerk. It is waivable.
   - *Blocks (null until answered):* `resources.remedies.conviction.fees`

---

## 4. SOUTH CAROLINA (SC)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement through the Circuit Solicitor (S.C. Code § 17-22-910 et seq.)** — The circuit solicitor's office (16 judicial circuits)
- South Carolina Courts — Expungement self-help — https://www.sccourts.org/selfHelp/
- SC Appleseed Legal Justice Center — https://www.scjustice.org

**Dates that govern:**
- 2009-06 — Automatic free expungement of summary-court non-convictions (operative) · Magistrate/municipal dismissals, nolle pros, and not-guilty verdicts — the court issues the order immediately at no cost, and the charge comes off internet-based public records within 30 days of disposition (§ 17-22-950).
- 2024 — 2024 Act 111 — first-offense firearm/weapon possession added to § 22-5-910 (effective) · A first-offense unlawful possession of a firearm or weapon carrying ≤1 year / ≤$1,000 is now expungeable under § 22-5-910(A) at 3 years, alongside the older ≤30-day/≤$1,000 first-offense path.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Pull the cite-only alternative paths not in this read: § 17-22-530(A) (alcohol-education), § 17-22-330(A) (traffic-education), § 17-22-1010 (Youth Challenge Academy), § 56-5-750(F) (failure-to-stop for blue light) — each has its own expungement route and fee treatment.
   - *Blocks no single field — affects a branch or wording.*
2. Pull the § 16-1-60 (violent crimes) and § 16-1-70 (nonviolent crimes) lists — the § 22-5-920 (YOA) and § 63-19-2050 (juvenile) exclusion/eligibility screens key on those cross-references, and the tree currently asks the person rather than enumerating.
   - *Blocks no single field — affects a branch or wording.*
3. Confirm the § 16-25-30 domestic-violence exception scope referenced by the § 22-5-920 YOA exclusions (Ch. 25, Title 16 offenses are excluded "except per § 16-25-30").
   - *Blocks no single field — affects a branch or wording.*
4. What are the PTI program fees (the § 17-22-90 area) and the conditional-discharge indigency-waiver mechanics in practice? The § 44-53-450(C) discharge fee ($350 general sessions / $150 summary court) is statutory and waivable only on an indigency finding; the PTI program-fee amounts were not in this pull.
   - *Blocks no single field — affects a branch or wording.*
5. Session sweep: § 22-5-910's history ends at 2018 (plus 2024 Act 111) and South Carolina runs perennial expungement-expansion bills. Verify nothing in the 2025-26 session amended the § 17-22-910 catalog or added a general first-offense path before the next review.
   - *Blocks no single field — affects a branch or wording.*

---

## 5. WISCONSIN (WI)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave5_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Governor's Pardon (the route for most Wisconsin convictions)** — Governor's Pardon Advisory Board
- Wisconsin Governor — Pardon Information — https://evers.wi.gov/Pages/Pardon-Information.aspx
- Wisconsin Court System — Expungement information — https://www.wicourts.gov

**Dates that govern:**
- 2026-07-01 — § 973.015 confirmed against the certified statute (no reform passed) (operative) · The 2023-24 Statutes were certified and published 7/1/2026 (updated through 2025 Wis. Act 247). The § 973.015 history ends at 2015 a. 80, 366 — no 2021-2025 act amended it, so the at-sentencing-only rule stands. (Reform bills passed the Assembly in 2021 and 2024 but the Senate never voted; Evers's budget petition process (LRB-1770) was stripped.)
- 2019 — Governor's pardon process revived (operative) · Wave 5 gives the year only. Felony convictions, generally 5 years post-sentence-completion, via the Pardon Advisory Board. Executive process, not in § 973.015 — see open questions.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. Confirm the current Governor's pardon criteria and wait: Wave 5 gives felony convictions, ~5 years post-sentence-completion, via the Pardon Advisory Board, with some expedited review since 2021. This is an executive process, NOT part of § 973.015, so it is not settled by the statute pull. The tree routes most people here; confirm the criteria.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the juvenile § 938.355(4m) expungement-petition track (a petition available at 17). It is a separate statute, not part of § 973.015, and was not pulled — the tree discloses it in prose only. Pull § 938.355(4m) before encoding its requirements.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

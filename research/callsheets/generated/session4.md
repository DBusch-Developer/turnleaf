# Turnleaf — Call Session 4 (Wave 4: IN · MA · MO · TN · WA)

> GENERATED FILE — do not edit. Regenerate with `npm run callsheet -- 4`.
> Source: the states database (or fallbackRules when no DATABASE_URL).

**14 open questions across 5 states.**

**What this cannot generate** — the hand-written sheet is still the one you call from:
- **Phone numbers.** None are stored. `courtContact` holds a role ("Clerk of the Superior Court"), not a number, and legalAid holds URLs. Every number on the hand sheet was researched and lives only there.
- **Timezone plans, call order, session targets, and confirm-don't-ask phrasing.** None of it is in the data model.
- **Verified-on dates for contacts.** `StatuteSource.retrievedOn` exists for statutes; nothing equivalent exists for a phone number.

This sheet is authoritative for one thing only: **what is still open, and what it blocks.**

---

## 1. INDIANA (IN)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Expungement of an Arrest / Non-Conviction (§ 35-38-9-1)** — The court where the case was handled
- **Expungement of a Conviction (Ind. Code § 35-38-9)** — The convicting court
- Indiana Legal Services (expungement) — https://www.indianalegalservices.org/expungement
- indy.gov Second Chance (Marion County) — https://www.indy.gov

**Dates that govern:**
- 2022-06-30 — Automatic non-conviction expungement threshold (P.L.14-2022) (effective) · For charges FILED after June 30, 2022, a dismissal of all charges, an acquittal, or a vacated conviction triggers a court-ordered expungement with NO petition — effective no earlier than 60 days out, and the prosecutor may seek up to a 1-year delay (§ 35-38-9-1(b)). Events before this use the § 1(d) petition path.
- 2025-01-01 — P.L.77-2025 — CDL carve-out and current-code amendments (effective) · Added § 35-38-9-0.6(d): the BMV cannot be ordered to expunge a 49 CFR 383.5 conviction for a person who held a CDL/CLP at the time of a 49 CFR 384.226 violation. The rules encoded here are the P.L.77-2025 current-code text.

**Verify — 1 open question. Each answer closes a numbered question in the database:**

1. What is the conviction-petition filing FEE amount? The statute now settles the mechanics — conviction petitions pay the standard civil filing fee, the court may reduce or waive it for indigency (§ 35-38-9-8(d)), and arrest/non-conviction petitions and collateral-action requests are free (§§ 35-38-9-1(e), 9.5(e)). The exact dollar amount is county-set — confirm with the clerk of the convicting court.
   - *Blocks no single field — affects a branch or wording.*

---

## 2. MASSACHUSETTS (MA)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Administrative Sealing of a Conviction (M.G.L. c. 276 § 100A)** — Commissioner of Probation (by mail), One Ashburton Place, Room 405, Boston, MA 02108
- Mass.gov — Seal your criminal record — https://www.mass.gov/how-to/seal-your-criminal-record
- Greater Boston Legal Services (CORI self-help) — https://www.gbls.org

**Dates that govern:**
- 2018-10-13 — St. 2018, c. 69 — sealing waits cut + expungement created (effective Oct 13, 2018) (effective) · St. 2018, c. 69 (An Act Relative to Criminal Justice Reform), signed April 13, 2018 as an emergency law. Act SECTIONS 186-187 cut the § 100A sealing waits from 5/10 to 3/7 years, SECTION 188 added the "except for convictions for resisting arrest" carve-out, and SECTION 195 created the expungement remedy (§§ 100E-100U). Per act SECTION 239 these took effect 6 months after signing — October 13, 2018 — despite the emergency clause. Effective date pre-computed by the Trial Court Law Libraries at mass.gov/lists/mass-general-laws-c276 ("Amended by St.2018, c. 69, §§ 186 to 192, effective October 13, 2018"). Proof at research/statutes/MA/St2018-c69-2026-07-18.pdf and ma-c276-effective-dates-2026-07-18.png.
- 2020 — Current § 100I expungement structure (2-record limit) (effective) · St. 2020, c. 253, § 120 set the current § 100I text, including the max-2-records structure. The session law was approved Dec 31, 2020; the exact § 120 effective day is unconfirmed — see open questions.
- 2022-11-09 — § 100K1/4 mandatory marijuana expungement (effective) · St. 2022, c. 180, § 23: the court SHALL order expungement of decriminalized-amount marijuana offenses within 30 days of the petition, notwithstanding §§ 100I and 100J.
- 2024-03-13 — Governor Healey blanket marijuana-possession pardon (operative) · Blanket pardon of prior misdemeanor marijuana-possession convictions for people 21+ on that date; pardoned convictions are sealed under c. 127, § 152.

**Verify — 5 open questions. Each answer closes a numbered question in the database:**

1. Confirm the current Petition to Seal form name/number (Wave 4 gives "TC-005") and the Commissioner of Probation mailing address on the mass.gov "Seal your criminal record" page. Phone/site check.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the iCORI self-request fee (Wave 4: $25, waivable if unaffordable). Phone/site check.
   - *Blocks no single field — affects a branch or wording.*
3. Does a SUBSEQUENT continuance-without-a-finding (CWOF) during someone else's § 100A waiting period interrupt it? A CWOF ends in a dismissal and is not a "guilty finding" under condition (3), but confirm with GBLS before asserting it never interrupts.
   - *Blocks no single field — affects a branch or wording.*
4. Confirm the exact effective date of St. 2020, c. 253, § 120 (the current § 100I 2-record structure) from the session law before encoding a precise day in keyDates.
   - *Blocks no single field — affects a branch or wording.*
5. Recheck the 194th-session expungement-expansion bills (successors to H.4325) after the session ends — the bill has been filed and died three sessions running, so watch rather than assume any change.
   - *Blocks no single field — affects a branch or wording.*

---

## 3. MISSOURI (MO)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Petition to Expunge (Mo. Rev. Stat. § 610.140)** — The court of the case
- Clear My Record MO (law-change page + forms help) — https://www.clearmyrecordmo.org
- Missouri Courts — Expungement self-help — https://www.courts.mo.gov/page.jsp?id=98230

**Dates that govern:**
- 2025-01-01 — SB 754 — lifetime limits raised; $250 surcharge removed (§ 610.140, A.L. 2024) (effective) · Limits set at 2 felonies + 3 misdemeanours/ordinance violations (infractions unlimited). The old $250 statutory surcharge was REMOVED. Arrest expungements at 18 months (was 3 years) — but only where the petitioner was NEVER CHARGED. Many attorney sites still show the old numbers.
- 2017-01-01 — § 610.130 first-DWI expungement moved from § 577.054 (effective) · The first-intoxication-offence expungement is now § 610.130 (transferred from the former § 577.054, effective 1/1/2017). Older guides still cite the dead number.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. What is the standard civil FILING FEE amount for an expungement petition, and the current clerk practice? The 1/1/2025 § 610.140 text contains NO fee or surcharge provision — the old $250 statutory surcharge is gone (SB 754) — so only the ordinary civil filing fee (amount not in the statutes pulled) remains, waivable by in-forma-pauperis motion. Confirm the amount with a circuit clerk.
   - *Blocks no single field — affects a branch or wording.*
2. What is the status of the 2022 Amendment XIV automatic marijuana expungement rollout? That is a constitutional provision, not in this statutory pull; Wave 4 says courts are still processing. Confirm the current status.
   - *Blocks no single field — affects a branch or wording.*

---

## 4. TENNESSEE (TN)

**Status:** `statute_cited` · reviewed 2026-07-19 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Conviction Expunction (T.C.A. § 40-32-107)** — The court of conviction; TBI for the certificate
- **Non-Conviction Expunction (T.C.A. § 40-32-106(a))** — The court that handled the case
- Tennessee Courts — Expunctions — https://www.tncourts.gov/programs/expunctions
- Legal Aid Society of Middle Tennessee and the Cumberlands — https://www.las.org

**Dates that govern:**
- 2025 — Acts 2025, ch. 268 — expunction statute reorganized (effective) · Settled. § 40-32-101 is now definitions only; non-conviction rules moved to § 40-32-106, conviction rules to § 40-32-107, procedure to § 40-32-108, effects to § 40-32-110. Cite the new sections only.
- 2026-07-01 — § 40-32-107 current version effective July 1, 2026 (effective) · The verified print is the effective-on-7/1/2026 version of § 40-32-107 (history includes 2026 ch. 719, ch. 930 §§ 2-3, and ch. 1061 § 2). Encoded lists/waits are this current text.
- 2026 — 2026 ch. 719 — pardon-based conviction expunction (§ 40-32-107(d)) (effective) · Added a path for a positive parole-board vote plus a governor's pardon, with violent- and sexual-offense exclusions. Disclosed in prose.

**Verify — 2 open questions. Each answer closes a numbered question in the database:**

1. What is the TBI Certificate-of-Eligibility request process and turnaround? § 40-32-102(c) gives the mechanics (the certificate must be attached before a conviction-expunction order), but not the timing. Verify on TBI's site.
   - *Blocks no single field — affects a branch or wording.*
2. Confirm the clerk-fee AMOUNT and current practice. The statute is clear that a clerk fee applies to conviction (§ 40-32-108(a)) and diversion (§ 40-32-106(d)(3)) expunctions via § 8-21-401, and that non-conviction is free (§ 40-32-106(a)(1)). The "up to $100" figure and the indigency-waiver practice come from § 8-21-401, which was not pulled — confirm with a clerk (Davidson County).
   - *Blocks no single field — affects a branch or wording.*

---

## 5. WASHINGTON (WA)

**Status:** `statute_cited` · reviewed 2026-07-18 · from `research/waves/Turnleaf_Wave4_Draft_Package.md`

**Contacts (from the data — no phone numbers are stored; see header):**
- **Motion to Vacate a Conviction (RCW 9.96.060 / 9.94A.640)** — The sentencing court
- WashingtonLawHelp.org (vacate guides, 2024-updated) — https://www.washingtonlawhelp.org
- Washington Courts self-help forms — https://www.courts.wa.gov/forms/

**Dates that govern:**
- 2019 — 2019 c 331 (New Hope Act) — felony carve-outs and clock re-anchor (effective) · Broadened the offences that can be vacated (the Assault 2/3 and Robbery 2 carve-out, vacatable if no firearm/deadly-weapon/sexual-motivation enhancement) and re-anchored the felony waiting clock.
- 2023 — 2023 sp.s. c 1 — mandatory drug-possession vacate path (effective) · RCW 9.96.060(6): completing a substance use disorder program, or an assessment via a recovery navigator / arrest-and-jail-alternative / LEAD program plus 6 months of substantial compliance, means the court MUST vacate a simple-possession conviction. Stacks on top of the Blake void-vacatur remedy for pre-2/25/2021 offences.
- 2024 — 2024 c 296 — misdemeanor clock re-anchor + DV-clock LFO exclusion (effective) · The misdemeanor waiting clock (9.96.060(2)(g)) runs 3 years from the later of release from supervision, release from confinement, or sentencing — LFO payment timing no longer extends it (though payment stays a filing precondition). The DV 5-year clock (2)(f) runs from completion of sentence conditions including court-ordered treatment but EXCLUDING payment of financial obligations.
- 2025-04-25 — 2025 c 169 — juvenile prison-riot conviction vacate (effective) · RCW 9.94A.640(5): a prison-riot conviction (9.94.010) committed while incarcerated in a DCYF or county juvenile facility — the court SHALL vacate on application.

**Verify — 4 open questions. Each answer closes a numbered question in the database:**

1. What is the filing fee for a vacation motion? The statute is silent, counties vary, and one guide reports generally none — phone target. A WSP WATCH self-check is $11 online, free in person.
   - *Blocks (null until answered):* `resources.remedies.vacation.fees`, `resources.remedies.vacation.feeWaiver`
2. Pull RCW 9.96.080 and 9.94A.648 — the two survivor/victim vacation PROCESS sections. RCW 9.96.060(3) and 9.94A.640(3) route trafficking, prostitution, commercial-sexual-abuse-of-a-minor, sexual-assault, and DV victims (and 9.96.060(7), a homicide victim's family) to those sections, but their requirements cannot be encoded until 9.96.080 / 9.94A.648 themselves are read. The tree names the track and routes to legal aid.
   - *Blocks no single field — affects a branch or wording.*
3. Recheck DUI vacation next session. HB 1110 (2025-26) would have opened DUI vacation effective July 1, 2026, but died in House Community Safety; it was reintroduced 2026-01-12 with no further action and the session ended. The DUI/physical-control exclusion (9.96.060(2), 9.94A.640(2)(g)) still stands — confirm nothing passed before softening it.
   - *Blocks no single field — affects a branch or wording.*
4. How are completed diversions and deferred prosecutions treated beyond the RCW 10.97.060 nonconviction-deletion path the tree now routes them to? A deferred prosecution ends in dismissal (nothing to vacate) but is the first thing an agency may refuse to delete (10.97.060(1)), and a DUI deferred prosecution still counts as a "prior offense" under 46.61.5055. Confirm the remaining boundaries with the call sheet.
   - *Blocks no single field — affects a branch or wording.*

---

## After the calls

For each answer: fill the field(s) in `src/data/fallbackRules.ts`, delete the question that blocked them, and flip `verificationStatus` by hand if the state is fully confirmed. Then `npm run validate`, `npm run db:seed`, and regenerate this sheet — what is left is what is still open.

A field may not be filled while a question still blocks it, and a question may not stand against a filled field. The validator enforces both.

# Turnleaf — Wave 1 Draft Research Package
## UT · MI · PA · NJ · CO — drafted July 15, for Diana's verification

**How to use this:** Nothing in here is done until YOU verify it. For each state: (1) open every URL in the Verify list, (2) confirm each number against the source, (3) check the ⚠️ flags — those are places my sources conflicted or looked stale, (4) run the draft personas mentally against the tree, (5) then encode and mark `statute_cited` in the tracker. Anything you can't confirm gets softened to a "complex — confirm with legal aid" branch, never guessed.

Every state below follows the same shape: terminology → rules → tree → filing → personas → verify list.

---

# 1. UTAH

**Terminology:** "Expungement" (covers what other states split into sealing/expungement). Two tracks: **petition-based expungement** (needs a BCI Certificate of Eligibility first) and **automatic "Clean Slate" expungement** (misdemeanor-level only, no petition, no fee).

**Statutes:** Utah Code Title 77, Chapter 40a. Petition: §§ 77-40a-301, -303, -304. Automatic: §§ 77-40a-202 through -206.

**Key structural fact most tools miss:** Utah requires the BCI Certificate of Eligibility BEFORE the court petition — the court won't take a petition without it. BCI reviews the FULL history including out-of-state records. So the Utah tree's petition path ends at "apply to BCI," not "file with court."

**Petition waiting periods (§ 77-40a-303, from case closure = sentence complete + fines/restitution paid):**
- 10 yrs — misdemeanor DUI/impaired driving
- 7 yrs — eligible felonies; class A misd drug possession
- 5 yrs — class A misdemeanor (non-drug-possession)
- 4 yrs — class B misdemeanor
- 3 yrs — class C misdemeanor / infraction
- 30–180 days — dismissals (30 with prejudice; 180 without)
- Acquittals — automatic, ~60 days

**Automatic (Clean Slate) periods differ (§ 77-40a-205):** class C/infraction 5 yrs, class B 6 yrs, class A drug possession 7 yrs. ⚠️ Note the SAME offense has a shorter petition period than automatic period (class C: 3 vs 5) — encode both tracks separately; the automatic track covers only misdemeanor-level, and felonies are petition-only.

**Conviction-count limits (§ 77-40a-303(4)/(5)):** ineligible if history includes 2+ non-drug felonies; 3+ convictions of which 2+ are class A; 4+ of which 3+ are class B; or 5+ total convictions of any degree (separate episodes; +1 to limits if 10 yrs clean since last, § 303(8)). This is a hard gate BEFORE any per-conviction check — put it early in the tree.

**Hard disqualifiers:** capital felony, first-degree felony, violent felony, felony DUI, registerable sex/child offenses (§ 303(2)); pending criminal proceedings; unpaid restitution; currently incarcerated/on probation/parole.

**Draft tree:** pending charges? → limit-count gate → offense level → (felony → petition track only) → disqualifier list → disposition → sentence + restitution complete? → waiting period by class → result: eligible-to-apply-to-BCI / waiting (date) / ineligible / complex.

**Filing layer:** BCI Expungement Application — $65 application fee + $65 per conviction case for certificate issuance (no issuance fee for dismissals/acquittals; indigency waiver exists). Certificate valid 180 days. Then Petition to Expunge Records filed in the court that handled the case; court filing fee ⚠️ ~$135 per one source — VERIFY BY PHONE. Forms: utcourts.gov expungement self-help page. BCI processing backlog is real (they publicly post which date's applications they're processing — reference this in UI as "several months").

**Legal aid:** Clean Slate Utah (cleanslateutah.org, fee assistance available), Utah Legal Services (utahlegalservices.org, 800-662-4245).

**Personas:** (1) class B misd, closed 5 yrs ago, clean history → eligible (automatic track + petition option). (2) eligible felony, closed 4 yrs ago → waiting, date = closure+7y. (3) 2 non-drug felonies → ineligible (count limit). (4) dismissal with prejudice 60 days ago → eligible-automatic. (5) class A misd, on parole → ineligible-for-now.

**Verify list:** bci.utah.gov/expungements/ (fees, periods, disqualifier list) · bci.utah.gov/clean-slate-expungement/ · utcourts.gov/en/self-help/case-categories/criminal-justice/expunge.html (forms, process steps) · le.utah.gov Title 77 Ch. 40a §§ 303, 205 (read the waiting-period subsections yourself). ⚠️ The automatic-expungement process changed Jan 1, 2026 (form requirement ended; courts self-identify again) — confirm current process description on the utcourts page before writing UI copy.

---

# 2. MICHIGAN

**Terminology:** "Set aside" (statutory term; everyone says "expungement"). Three tracks: **petition set-aside** (MCL 780.621, form MC 227), **automatic set-aside** (MCL 780.621g, live since Apr 11, 2023), **marijuana misdemeanor set-aside** (MCL 780.621e, form MC 227a, special fast track).

**Petition track — counts:** up to **3 felonies** and **unlimited misdemeanors** lifetime; max 2 assaultive crimes lifetime; only 1 felony set aside for the same offense if punishable by >10 yrs. "One Bad Night" rule (MCL 780.621b): multiple offenses within 24 hours from the same transaction count as one conviction (not for assaultive/weapon/10+yr offenses).

**Petition waiting periods (MCL 780.621d, from sentencing OR release from imprisonment OR discharge from probation/parole, whichever is LATEST; no new convictions during the wait):**
- 3 yrs — misdemeanors (non-serious)
- 5 yrs — one felony, or serious misdemeanors
- 7 yrs — multiple felonies

**Automatic track (MCL 780.621g):** misdemeanors 7 yrs after sentencing; felonies 10 yrs after sentencing or release from MDOC, whichever later. Limits: max 2 felonies + 4 (93-day+) misdemeanors automatically; unlimited 92-day-or-less misdemeanors. No pending charges. Excluded from automatic: assaultive crimes, serious misdemeanors, crimes of dishonesty, 10+yr offenses, offenses involving minors/vulnerable adults/injury/death, human trafficking, OWI, traffic causing injury/death, CDL-holder commercial traffic offenses.

**Petition-track exclusions (MCL 780.621c):** felonies punishable by life, most criminal sexual conduct, traffic offenses causing injury/death, human trafficking-related, terrorism-related. First-offense OWI is petitionable (court discretion, since Feb 2022) but NOT automatic. Traffic set-asides don't clear the Secretary of State driving record — note in UI.

**Marijuana misdemeanors (MCL 780.621e):** no waiting period; rebuttable presumption of eligibility; form MC 227a.

**Draft tree:** pending charges? → track fork (check automatic first — "your record may already be sealed": misdemeanor 7y+/felony 10y+ and not excluded → point user to MSP record check) → marijuana misdemeanor? → 621e fast path → petition path: offense excluded? → count limits → waiting period by count/class → new convictions during wait? → result.

**Filing layer:** Application to Set Aside Conviction, form **MC 227** (MC 227a for marijuana), filed in the convicting court. Requires certified copy of conviction + fingerprint card (RI-008, local law enforcement, small fee) + **$50 fee to Michigan State Police** ⚠️ (fee amount widely cited but VERIFY BY PHONE — it's on the MC 227 instructions). Serve copies on the Attorney General and prosecuting agency. Hearing usually required. Free help: michiganlegalhelp.org online form interview; MSP set-aside info pages.

**Legal aid:** Michigan Legal Help (michiganlegalhelp.org), Safe & Just Michigan, Attorney General expungement clinics.

**Personas:** (1) one misdemeanor, 8 yrs post-sentence, clean, non-excluded → likely already automatically set aside → check-record path. (2) one felony (non-excluded), 6 yrs post-discharge → eligible-petition. (3) 3 felonies, latest discharge 6 yrs ago → waiting (7y multiple-felony period). (4) marijuana misdemeanor 2019 → eligible-now via 621e. (5) OWI first offense, 5 yrs → complex (discretionary petition path; not automatic).

**Verify list:** michigan.gov/msp → Clean Slate pages (automatic rules, exclusions, FAQ) · legislature.mi.gov MCL 780.621, 621c, 621d, 621e, 621g · courts.michigan.gov form MC 227 + instructions (fee amount, service requirements) · michiganlegalhelp.org set-aside toolkit.

---

# 3. PENNSYLVANIA

**Terminology — three DIFFERENT remedies, don't blur them:**
1. **Expungement** (18 Pa.C.S. § 9122) — record destruction. NARROW: non-convictions, summary offenses (5 yrs arrest-free), age 70+ (10 yrs arrest-free post-supervision), pardoned offenses (auto-expunged since June 2024), ARD completion, underage drinking at 21+.
2. **Petition-based sealing / "Order for Limited Access"** (§ 9122.1, Pa.R.Crim.P. 791) — misdemeanors after **7 yrs** conviction-free (Clean Slate 3.0 cut it from 10); certain low-level felonies (drug/property, total sentence < 7 yrs confinement) after **10 yrs**.
3. **Automatic Clean Slate sealing** (§ 9122.2) — no petition, no fee. Summary convictions after 5 yrs (started June 2024); 2nd/3rd-degree misdemeanors + misdemeanors punishable ≤2 yrs after ⚠️ 7 or 10 yrs (Clean Slate 3.0 changed the misdemeanor period — sources split between "7 for petition only" and "7 for both"; READ § 9122.2 YOURSELF — this is the #1 verify item for PA); certain drug felonies after 10 yrs (3.0 addition); non-convictions sealed ~monthly with no waiting.

**Exclusions (sealing):** first-degree felonies & offenses punishable 20+ yrs, felonies involving danger to persons / crimes against family, firearms offenses, sex offenses requiring registration, and anyone with 4+ misdemeanors of 2nd degree or higher.

**⚠️ Fines/costs conflict found:** Clean Slate 2.0 (Act 83 of 2020) removed unpaid fines/costs as a barrier to automatic sealing, but at least one current source says unpaid restitution still blocks. Read § 9122.2's condition text; encode restitution as blocking, fines/costs as not, ONLY if the statute confirms that split.

**Draft tree:** disposition (non-conviction → auto-sealed ~30 days, expungement also available) → summary offense? (5 yr path, now automatic) → misdemeanor: degree + exclusion check → 7 yr clock, conviction-free → likely already auto-sealed (check record) or petition Rule 791 → felony: qualifying drug/property + <7 yr sentence? → 10 yr clock → automatic (drug) or petition (property) → else: pardon path (Board of Pardons) or age-70 expungement → complex.

**Filing layer:** ⚠️ **Fees vary BY COUNTY** — Montgomery County: $176.50 + $13.50/extra agency; other counties cited $132–$215. This is Turnleaf's phone-verification showcase state: verify the fee in 3–4 big counties (Philadelphia, Allegheny, Montgomery) and display per-county or as a verified range. Forms: Petition for Expungement (Rule 490 summary / Rule 790 court of common pleas), Petition for Limited Access (Rule 791) — pacourts.us forms center. Requires recent PSP criminal history (epatch, ~$22, VERIFY). File in the Court of Common Pleas of the county of conviction; serve the DA (30 days to respond).

**Legal aid:** MyCleanSlatePA.com (Community Legal Services — free eligibility help), PALawHelp.org, Legal Aid of Southeastern PA (877-429-5994).

**Personas:** (1) M2 conviction, 8 yrs conviction-free, fines paid → likely auto-sealed → check-record path. (2) M1, 5 yrs → waiting (7y). (3) F1 → ineligible for sealing → pardon path. (4) drug felony, 3-yr sentence, 11 yrs clean → eligible (3.0 automatic — verify) . (5) dismissed charges last year → auto-sealed, expungement available.

**Verify list:** pacourts.us Clean Slate / expungement / limited access self-help page (the UJS page) · 18 Pa.C.S. §§ 9122, 9122.1, 9122.2 on the PA General Assembly site (the misdemeanor automatic period is the key read) · MyCleanSlatePA.com eligibility guide · one county Clerk of Courts page (Montgomery's is good) for the fee model.

---

# 4. NEW JERSEY

**Terminology:** "Expungement" (extraction/isolation of records — strong remedy). NJ-specific vocabulary the UI MUST use: felonies = **"indictable offenses"**, misdemeanors = **"disorderly persons (DP) offenses"**. Motor-vehicle offenses under Title 39 (incl. DWI) are NOT expungable — common user confusion, put it in the tree.

**Statutes:** N.J.S.A. 2C:52-1 et seq. Standard: 2C:52-2 (indictable), -3 (DP), -4 (ordinance). Clean slate petition: 2C:52-5.3. Marijuana: 2C:52-5.1, -6.1. Dismissals: 2C:52-6.

**Standard expungement (petition):** ONE indictable + up to 3 DP/petty DP (or up to 5 DP if no indictable). Waiting: **5 yrs** from latest of conviction / fine payment / probation-parole completion / release (**4 yrs** via "compelling circumstances" early pathway; DP-only can be 3 yrs early path ⚠️ verify). Once-per-lifetime for the indictable grant (crime-spree/interdependent exception).

**Clean Slate petition (2C:52-5.3):** for people who don't fit standard — expunges the ENTIRE record after **10 yrs** from the most recent conviction/payment/completion/release, regardless of conviction count, even with prior expungements. Unpaid financial assessment doesn't block if non-willful (court enters civil judgment instead) — encode this, it's user-relevant. (The 2019 law also ordered an AUTOMATED clean-slate system; rollout has been slow/backlogged ⚠️ — verify current status before claiming automation in UI.)

**Ineligible convictions (2C:52-2(b)):** homicide (except vehicular), kidnapping, sexual assault, robbery, arson, endangering welfare of a child, terrorism, most 1st-degree drug distribution, public-office crimes touching the office, etc. Marijuana: most offenses now treated as DP-level and expungable immediately (2021 decriminalization).

**Dismissals/acquittals (2C:52-6):** immediate, no waiting, generally no fee.

**Draft tree:** Title 39 motor vehicle? → not expungable → indictable disqualifier list → marijuana? → immediate path → disposition (dismissed → immediate) → count profile (fits standard 1-indictable+3DP? → 5 yr clock w/ 4 yr compelling option; DP-only ≤5? → 5 yr; else → Clean Slate 10 yr from most recent) → financial assessments (non-willful unpaid → still eligible w/ civil judgment note) → result.

**Filing layer — NJ's headline: FREE and ONLINE.** File through the **eCourts Expungement System** (njcourts.gov) — the NJ Courts' own page says it's free. ⚠️ Older sources still cite a $75 filing fee — NJ eliminated it (2019 reforms); VERIFY on njcourts.gov and by phone, then wear it proudly in the UI ("filing is free in NJ"). System auto-generates the petition; judge's order is transmitted to agencies electronically. State Police processing backlogs are documented — 2025 law (A3881) created a status portal ⚠️ verify name/URL. Venue: Superior Court, county of residence OR of any conviction (2025 expansion).

**Legal aid:** LSNJ Law (lsnjlaw.org — "Clearing Your Record" guide + hotline 888-576-5529), NJ Courts expungement ombudsman (email per county).

**Personas:** (1) one indictable (burglary 3rd), 6 yrs post-everything, fines paid → eligible-standard. (2) one indictable + 2 DP, 4 yrs, pending job offer → complex/possible early pathway. (3) 2 indictables, latest closed 11 yrs ago, none excluded → eligible-clean-slate. (4) DWI → not expungable (Title 39). (5) marijuana possession 2015 → eligible-immediate.

**Verify list:** njcourts.gov/self-help/expunge-record (waiting periods, eCourts, free filing) · N.J.S.A. 2C:52-2, -5.3 (Justia/FindLaw fine, legislature site better) · lsnjlaw.org Clearing Your Record guide (process steps) · CCRC NJ profile (recent developments — the 2025 backlog-portal law).

---

# 5. COLORADO

**Terminology:** "Sealing" for adult criminal records (C.R.S. 24-72-701 et seq.); "expungement" in CO mostly means juvenile/underage records — use "sealing" in the UI. Two tracks: **petition sealing** (24-72-704 through -710) and **automatic Clean Slate sealing** (SB22-099, effective July 1, 2024; C.R.S. 13-3-117).

**Petition waiting periods (24-72-706, from final disposition or release, conviction-free since):**
- 1 yr — civil infraction, petty offense, drug petty offense
- 2 yrs — class 2/3 misdemeanors, drug misdemeanors ⚠️ verify exact class split in § 706(1)(b)
- 3 yrs — class 1 misdemeanors; eligible felonies (class 4–6, drug levels 2–4) ⚠️ one source says 3 yrs most felonies/5 yrs others — read § 706 yourself and encode the statute's own table
- Pardoned → immediate petition

**Automatic (Clean Slate) periods:** civil infractions 4 yrs; misdemeanors 7 yrs; eligible felonies 10 yrs — same eligibility universe as petition, DA can object on public-safety grounds. Over 100k records sealed in the first batch (Aug 2024). Non-convictions: arrests w/o charges auto-seal (1 yr for post-2022 offenses); acquittals/dismissals/completed deferred judgments seal via simplified in-case process (2024 HB24-1133 expanded automation, implemented 2025).

**Exclusions (24-72-706(2)):** class 1–3 felonies, level 1 drug felonies, DUI/DWAI, domestic violence, crimes of violence / extraordinary-risk crimes, sex offenses, VRA-victim crimes, child abuse, traffic offenses. General rule of thumb that helps the tree: eligible offenses are largely those WITHOUT a named victim.

**Other gates:** no intervening convictions; court weighs privacy vs public interest for some categories (class 1 misd and felonies involve a hearing standard — route these to "eligible to petition; court discretion applies").

**Filing layer:** Motion to Seal Conviction Records — **JDF 612** (instructions JDF 611), filed IN the criminal case (2022 simplification — no separate civil case). Fee: ⚠️ **$65** per statute-based sources vs **$224** in an older judicial-district packet (that's the pre-2022 separate-civil-action fee) — VERIFY BY PHONE with a district court clerk; fee waiver JDF 205; sealing of records that should have auto-sealed is free. Attach current CBI criminal history (~$12.50 ⚠️ verify). Serve the DA. Remote hearings allowed (2024 law).

**Legal aid:** Expunge Colorado (expungecolorado.org — pro bono sealing clinics), Colorado Legal Services.

**Personas:** (1) class 5 felony theft (no named victim? theft has a victim — good edge case: theft IS listed as commonly eligible ⚠️ verify against § 706's actual list), 11 yrs clean → likely auto-sealed → check-record. (2) class 2 misdemeanor, 3 yrs clean → eligible-petition. (3) DUI → ineligible. (4) DV misdemeanor → ineligible. (5) dismissed case 2023 → simplified/auto path.

**Verify list:** coloradojudicial.gov self-help sealing page + JDF 611/612 (current fee!) · C.R.S. 24-72-706 (the waiting-period and exclusion subsections — encode from the statute, not summaries) · C.R.S. 13-3-117 (automatic) · expungecolorado.org (Clean Slate implementation status).

---

## Cross-state flags for your tracker notes

1. ⚠️ **Five fee conflicts found** — UT court filing fee, MI MSP fee, PA county variance, NJ free-vs-$75, CO $65-vs-$224. All five are phone-verification targets: this is your call-log Discrepancy column filling itself.
2. **Every Wave 1 state has an automatic track** — the tree for each should open with "your record may already be sealed/set aside/expunged — here's how to check," which is a genuinely differentiating UX no competitor leads with.
3. **Waiting-period trigger differs by state** (UT: case closure; MI: sentencing/release/discharge whichever latest; NJ: latest of four events; CO: final disposition/release) — the date question in each tree must use that state's trigger language, not a generic "when did you finish your sentence."
4. All statutes cited here came from search results dated 2024–2026, but laws move — the CCRC profile "Recent developments" section per state is your final freshness check before marking `statute_cited`.

## Sources consulted per state (for your citations columns)
- UT: bci.utah.gov (BCI expungement + clean slate pages), utcourts.gov self-help, Utah Code 77-40a-205 (Justia, 2025 ed.), CCRC-adjacent summaries
- MI: michigan.gov/msp Clean Slate pages, MCL 780.621 (legislature.mi.gov), SADO Clean Slate analysis, form MC 227 packet
- PA: PA UJS Clean Slate page, Legal Aid of SE PA (Clean Slate 3.0), Montgomery County Clerk of Courts, Jenkins Law Library guide
- NJ: njcourts.gov/self-help/expunge-record, N.J.S.A. 2C:52-5.3 (Justia/FindLaw), CCRC New Jersey profile, LSNJ Clearing Your Record
- CO: Colorado Lawyer (CBA) automatic-sealing analysis, coloradojudicial.gov sealing packet, C.R.S. 24-72-703/706, Expunge Colorado, Colorado Sun reporting

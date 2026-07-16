# Turnleaf — Wave 2 Draft Research Package
## CT · DE · OK · VA · MN — drafted July 15, for Diana's verification

Same rules as Wave 1: nothing here is done until you verify it. Open every URL in the Verify list, confirm every number against the source, resolve every ⚠️, run the personas, then encode and mark `statute_cited`. Unresolvable ambiguity → "complex — confirm with legal aid" branch, never a guess.

**Wave 2 headline:** three of these five states' regimes are BRAND NEW or actively rolling out (VA effective two weeks ago; OK automatic bridging since Nov 2025; CT erasures resumed Oct 2025 after delays). That makes this wave both Turnleaf's biggest differentiation opportunity — almost no tool has these encoded correctly — and its highest staleness risk. Verify dates harder than numbers here.

---

# 1. CONNECTICUT

**Terminology:** "Erasure" — CT's word for both expungement and sealing; erased = you may legally swear it never happened. Three tracks: **automatic Clean Slate erasure** (post-2000 convictions), **petition erasure** (pre-2000 convictions + cannabis), and **absolute pardon** via the Board of Pardons and Paroles (the catch-all for everything else — CT's pardon IS its expungement mechanism, structurally unique).

**Statutes:** Conn. Gen. Stat. § 54-142a (erasure), Public Act 21-42 (Clean Slate). Pardons: § 54-130a.

**Automatic Clean Slate (§ 54-142a(e)):** convictions entered ON/AFTER Jan 1, 2000: misdemeanors erased **7 yrs** after the person's MOST RECENT conviction of any crime; class D/E felonies and unclassified felonies with max terms ≤5 yrs erased **10 yrs** after most recent conviction. Note the trigger: the clock runs from the person's most recent conviction date, not the offense's own date — a new conviction resets everyone's clock. Court debt does NOT block automatic erasure (though the debt survives). Pre-age-18 offenses also automatic.

**⚠️ Implementation status is the key CT fact:** delayed for years by data-system problems; erasures RESUMED October 2025, ~50,000 convictions erased so far, 100k+ expected. UI copy must say "if eligible, your record may have been or will be erased automatically — here's how to check," and link the state's status page (portal.ct.gov/cleanslate) — never promise it's already done.

**Exclusions from automatic:** family violence crimes (§ 46b-38a), sex offenses requiring registration, crimes with max sentence >5 yrs even if actual sentence was less, listed crimes in § 54-142a(e)(2)(C). ⚠️ **DUI conflict found:** one attorney source claims DUIs eligible; the state's own petition form guidance blocks § 14-227a (DUI) if a repeat within 10 yrs — likely first-offense eligible / repeat blocked. Read § 54-142a(e)(2)(C) and encode exactly what it says.

**Petition erasure (pre-2000 + cannabis):** form **JD-CR-202**, filed in the sentencing court, one form per docket number, **no fee**. Cannabis possession (≤4 oz, Oct 2015–Jan 2021 or pre-2000): separate petition path, no fee, no waiting period.

**Pardon path (everything else):** Board of Pardons and Paroles — eligible to APPLY 3 yrs after conviction (misdemeanor) / 5 yrs (felony); free; absolute pardon = full erasure of the ENTIRE record; no pending charges, no nolle within 13 months, not on probation/parole. This is CT's relief for class A/B/C felonies — encode as "pardon path," not "ineligible."

**Non-convictions:** dismissals, acquittals, nolles (13 months) → automatic erasure already, long-standing law.

**Draft tree:** disposition (non-conviction → already erased) → conviction date pre/post-2000 fork → offense class (misd → 7 yr auto clock; D/E/≤5yr felony → 10 yr auto clock; A/B/C felony → pardon path) → family violence/sex offense exclusion → most-recent-conviction clock → result: likely-already-erased-check / waiting (date) / pardon path / petition (pre-2000).

**Filing layer:** automatic = nothing to file (check status via CT judicial conviction search / State Police record request). Petition JD-CR-202, free, sentencing court. Pardon application via Board of Pardons and Paroles (ct.gov/bopp), free, virtual hearings.

**Legal aid:** Clean Slate CT (cleanslatect.org — eligibility dates calculator), CT Legal Services, Board of Pardons pre-screen resources.

**Personas:** (1) misdemeanor 2016, no convictions since → likely erased (7 yr, post-Oct-2025 rollout) → check-record. (2) class D felony 2018 → waiting (10 yr → 2028). (3) class B felony 2010 → pardon path (apply-eligible since 2015). (4) misdemeanor 2014 + NEW misdemeanor 2023 → clock reset to 2030 (most-recent-conviction trigger!). (5) family violence misdemeanor → excluded from automatic → pardon path.

**Verify list:** portal.ct.gov/cleanslate (status, petition page, JD-CR-202) · cga.ct.gov § 54-142a text (subsection (e), exclusion list (e)(2)(C), the DUI question) · cleanslatect.org (dates math) · ct.gov Board of Pardons (pardon eligibility rules) · CCRC CT profile "Recent developments" (implementation status).

---

# 2. DELAWARE

**Terminology:** "Expungement" — two petition tracks with statutory names the UI should keep: **mandatory expungement** (through SBI — State Bureau of Identification — if you fit the category, they MUST expunge) and **discretionary expungement** (through Superior/Family Court — judge weighs "manifest injustice"). Plus **automatic Clean Slate** expungement (SB 111/112 of 2021; automatic processing began Aug 2024) covering the mandatory-eligible universe without an application.

**Statutes:** 11 Del. C. §§ 4372 (definitions/exclusions), 4373 (mandatory), 4374 (discretionary), 4375 (post-pardon).

**Mandatory (SBI, § 4373):**
- Case terminated in favor of the accused → immediate, even with other ineligible convictions on record
- Violations → 3 yrs from conviction
- Marijuana/paraphernalia possession, underage alcohol → immediate
- Misdemeanors (non-excluded, same case) → **5 yrs**, no other convictions at all
- Listed felonies → **10 yrs** from conviction or release (whichever later), no prior/subsequent convictions ⚠️ verify WHICH felonies are in § 4373's felony list — the source text cut off
- Old undisposed charges (7+ yrs, no disposition) count as dismissed

**Discretionary (court, § 4374):** misdemeanors 3 yrs (or 7 yrs for the § 4373(b)-excluded misdemeanor list); felony 7 yrs; multiple cases of violations/misdemeanors 5 yrs from most recent. Standard: petitioner must prove continued existence of the record is "manifest injustice." AG gets **120 days** to object; victim consulted. Criminal history attachment REQUIRED or petition summarily rejected.

**Exclusions (§ 4372(f)):** Title 21 motor-vehicle offenses (incl. DUI) mostly ineligible (narrow § 4374(i)(2) exceptions); violent felonies (§ 4201(c) list); DV / child victim / vulnerable adult crimes barred from mandatory (7-yr discretionary or pardon path); prior expungement within 10 yrs blocks a new one; felony-after-felony-expungement blocks.

**Pardon path (§ 4375):** unconditionally pardoned → discretionary expungement for almost anything except a short list (e.g., 1st-degree child sexual abuse by person in trust).

**Automatic Clean Slate:** covers the mandatory-eligible universe automatically since Aug 2024; ⚠️ verify rollout completeness on delaware.gov before UI copy — and note the statute preserves the right to APPLY for mandatory expungement if the automatic one hasn't happened yet — encode that as the user's action path.

**Filing layer:** Mandatory: fingerprinting + Certified DE Criminal History via SBI — **$52 fingerprinting fee** (ACLU-DE figure ⚠️ verify current) + SBI application. Discretionary: petition to Superior Court (or Family Court if all charges were Family Court), county of most recent case; Family Court accepts email filing (FC_Expungement@delaware.gov); ⚠️ court fee schedule "reasonable fee" per § 4374(j) — get the number by phone. Courts.delaware.gov expungement packet is the master how-to.

**Legal aid:** ACLU of Delaware expungement workshops (fee assistance available), Delaware Center for Justice, Office of Defense Services expungement help.

**Personas:** (1) dismissed case 2024, has an old felony → mandatory-immediate (favorable termination works despite other record). (2) single misdemeanor 2019, nothing else ever → mandatory (5 yr met) / may already be auto-expunged → check. (3) misdemeanor 2019 + violation 2022 (two cases) → discretionary 5-yr multiple-case path → waiting until 2027. (4) DUI → ineligible (Title 21) → pardon path only. (5) listed felony 2013, clean since → mandatory 10-yr path → verify felony is on the § 4373 list.

**Verify list:** courts.delaware.gov adult expungement packet (the full how-to + forms) · delcode.delaware.gov Title 11 §§ 4372–4375 (the felony list, exclusions, timing) · SBI/DSP expungement page (fees, fingerprinting process, automatic status) · aclu-de.org eligibility guide.

---

# 3. OKLAHOMA

**Terminology:** "Expungement" = sealing (records survive but hidden). Two DIFFERENT things called expungement — keep them straight in UI: **Section 18 expungement** (seals the arrest + court record — the real one) and **Section 991(c) expungement** (deferred-sentence cleanup: updates disposition to "pled not guilty, case dismissed" but does NOT seal the arrest record). Plus **automatic Clean Slate** (HB 3316) now rolling out.

**Statutes:** 22 O.S. § 18 (categories), § 19 (procedure), § 991(c) (deferred). OSBI administers.

**Section 18(A) petition categories (the ones your tree needs):**
- Acquittal, appellate reversal, DNA innocence, pardon received → eligible
- Arrested, never charged / SOL expired → eligible, no wait
- All charges dismissed, no prior felony → eligible
- Misdemeanor deferred sentence → 1 yr after dismissal
- Misdemeanor, fine-only under $501, paid → immediate ⚠️ (HB 3037 proposed raising to $1,000 / cutting waits — verify whether it PASSED; encode current law only)
- Misdemeanor with jail/suspended sentence → 5 yrs after completion, no felony convictions, no pending charges
- Single nonviolent felony (not on 57 O.S. § 571 violent list) → **5 yrs** after completion, no other convictions ⚠️ verify current § 18(A)(12)-(13) text on pardon prerequisites
- Two nonviolent felonies → **10 yrs**
- 3+ felonies → ineligible
- Reclassified felony-to-misdemeanor (SQ 780 drug/property) → 30 days after completion, restitution paid
- Same-transaction offenses count as ONE conviction (§ 18(D))

**Automatic Clean Slate (§ 18(B)-(C)):** effective Nov 1, 2022; automatic processing legally began **Nov 1, 2025**, and OSBI is mid-implementation with a phased bridge plan ⚠️ — verify current status on oklahoma.gov/osbi before writing UI copy. Covers 11 of the § 18(A) categories, BUT 2024's SB 1770 limited automatic dismissals/misdemeanors to **"single-source records"** (Oklahoma-only criminal history — any out-of-state/federal arrest disqualifies the AUTOMATIC path, not the petition path). 45-day agency objection window (wrong category / unpaid restitution / believed ongoing criminal activity). Fully-sealed vs partially-sealed distinction: convictions expunge to "partially sealed" (law enforcement can still see/use them) — worth a UI honesty note.

**Filing layer:** Petition in the district court of the county of arrest (one petition per county; multiple arrests same county can combine); **court record expungement free; OSBI arrest-record processing fee $150** (their own page); notice to DA, arresting agency, OSBI; hearing typical. OSBI contact: expungements@osbi.ok.gov, (405) 879-2641 — a state agency that answers email about expungement is a gift; use it for your verification log. § 991(c) route for deferred sentences is separate and simpler.

**Legal aid:** Legal Aid Services of Oklahoma, OU/TU law school expungement clinics, Oklahoma County DA expungement expos.

**Personas:** (1) misdemeanor deferred, dismissed 2023 → eligible-now (1 yr) + 991(c). (2) fine-only misdemeanor $400, paid → eligible-immediate. (3) single nonviolent felony done 2019 → eligible (5 yr). (4) two nonviolent felonies, last done 2020 → waiting (10 yr → 2030). (5) OK misdemeanor + old California arrest → petition-eligible but NOT single-source → automatic path blocked, petition path open (great tree branch).

**Verify list:** oscn.net 22 O.S. § 18 current text (category numbers, the fine threshold, felony waiting periods) · oklahoma.gov/osbi expungement + Clean Slate pages (fee, process, rollout status) · CCRC Oklahoma profile (the SB 1770 single-source analysis) · check HB 3037's fate on the legislature site.

---

# 4. VIRGINIA — ⚠️ HANDLE WITH CARE: LAW IS 2 WEEKS OLD

**The headline:** Virginia's comprehensive sealing regime took effect **July 1, 2026** (SB 1466 / HB 2723; Va. Code § 19.2-392.5 et seq.). Before it, Virginia had essentially NO conviction relief — expungement was non-convictions only. This is the biggest recent second-chance-law change in the country, it is TWO WEEKS OLD as of this draft, and almost no tool has it. Encode it correctly and Turnleaf owns Virginia. But: automatic processes are just spinning up, so every "automatic" claim needs a rollout-status caveat, and secondary sources are full of stale 2025 effective dates — trust only the VSP, the Crime Commission, and the statute.

**Terminology:** "Sealing" (new regime, convictions) vs "expungement" (old regime, § 19.2-392.2, non-convictions — still exists). Records must have offense dates **on/after Jan 1, 1986** to be sealable.

**Automatic sealing:** (a) specific misdemeanor conviction list — petit larceny, shoplifting, trespass variants, disorderly conduct, misdemeanor marijuana distribution — sealed **7 yrs** after conviction if NO other CCRE-reportable conviction in that window (traffic infractions don't count against); (b) marijuana possession offenses (repealed § 18.2-250.1) — sealed without order; (c) misdemeanor non-convictions — at case conclusion (new cases) or via annual State Police sweep for older ones (3 yrs clean); (d) felony non-convictions — at conclusion WITH the defendant's request + Commonwealth's Attorney concurrence; (e) non-criminal traffic records after 11 yrs.

**Petition sealing (§ 19.2-392.12):** most misdemeanors, **Class 5/6 felonies, and grand larceny / felonies punished as larceny**. Requirements: 7 yrs clean (misdemeanor) / **10 yrs clean (felony)** from latest of conviction/release/violation events; no Class 1–2 felony ever; no Class 3–4 felony in 20 yrs; no felony of any kind in 10 yrs; drug/alcohol-related convictions require a rehabilitation showing; **2 lifetime sealing petitions** ⚠️ verify exact lifetime-limit mechanics in § 19.2-392.12; court weighs statutory criteria. Long exclusion list: Class 1–4 felonies, sex offenses, violent felonies, firearm felonies, DUI, assault & battery of family member, protective-order violations, hate crimes + ~19 exclusion provisions.

**Filing layer:** petition in the Circuit Court where the charge originated; per the 2025 amendments **no filing fees and no fingerprint card required** ⚠️ verify both on the court's own instructions — recent changes, and gold for your UI if confirmed. Old-regime expungement (non-convictions) continues under § 19.2-392.2 with its own process.

**Legal aid:** Legal Aid Justice Center, Justice Forward Virginia (their sealing explainer is excellent), Clean Slate Virginia.

**Personas:** (1) petit larceny misdemeanor 2017, clean since → automatic-eligible NOW (7 yr) → check-record/status. (2) Class 6 felony 2014, released 2015, clean → eligible to petition (10 yr clean met). (3) DUI misdemeanor → ineligible for sealing. (4) felony charge acquitted last month → sealable at conclusion w/ CA concurrence, else old-regime expungement petition. (5) grand larceny 2010 + Class 4 felony 2012 → the Class 4 within 20 yrs blocks → not eligible until 2032.

**Verify list:** law.lis.virginia.gov Title 19.2 Chapter 23.2 (the whole chapter — §§ 392.6:1, 392.7, 392.11, 392.12) · vsp.virginia.gov petition-based-record-sealing page (FAQ, rollout status) · vscc.virginia.gov/sealing.asp (Crime Commission summary — most authoritative overview) · justiceforwardvafoundation.org sealing page (plain-language cross-check).

---

# 5. MINNESOTA

**Terminology:** "Expungement" = court-ordered SEALING (statute explicitly prohibits destruction). Multiple tracks: **automatic Clean Slate expungement** (§ 609A.015, live Jan 1, 2025, and — rare good news — nearly done: BCA reported ~94% of ~2 million eligible records expunged by spring 2026), **petition expungement** (§§ 609A.02/609A.03), **prosecutor-agreed sealing** (§ 609A.025, no petition needed if the prosecutor agrees), and **cannabis tracks** (§ 609A.055 automatic petty-cannabis, done May 2024; § 609A.06 Cannabis Expungement Board for felony cannabis).

**Automatic (§ 609A.015) waiting periods, from discharge of sentence, no new non-petty offense during the wait, none pending at review:**
- Dismissals / resolved-in-favor → no wait
- Diversion / stay of adjudication (non-felony) → 1 yr
- Petty misdemeanors & misdemeanors → **2 yrs**
- Gross misdemeanors → **3 yrs**
- 5th-degree drug felony (§ 152.025) → **4 yrs**
- Listed eligible felonies (§ 609A.02 subd. 3(b) list, ~50 offenses: drug possession, theft, forgery, financial crimes...) → **5 yrs**

**Exclusions:** offenses requiring predatory-offender registration (§ 243.166) never expungable; the § 609A.015 subd. 3(b) exclusion lists carve out DWI, domestic assault, harassment/stalking, 4th-degree assault, etc. ⚠️ pull the exact exclusion lists from the statute — secondary sources paraphrase them loosely. Quirk worth encoding: felonies deemed misdemeanors via stay of imposition (§ 609.13) do NOT become automatic-eligible through the demotion — separate petition rules with 4/5-yr splits apply.

**Petition track (§ 609A.02/.03):** same waiting periods, broader reach (covers records the automatic process misses — and importantly, records held by DHS/health/PELSB that automatic expungement does NOT touch); district court filing, service on agencies, hearing; ⚠️ filing fee (~$300-ish with in-forma-pauperis waiver available — verify current amount with a district court). Prosecutor-agreed § 609A.025 skips the petition entirely — worth a tree note ("ask the prosecutor's office about agreed sealing").

**Rollout status for UI copy:** BCA began sending records April 2025, sealing since June 2025, ~94% complete by spring 2026, remainder in judicial review — Minnesota copy can say "most eligible records have already been expunged — check yours," the strongest automatic-track message of any state in Waves 1–2. Individuals are NOT notified when expunged — checking is on them (BCA record check).

**Filing layer:** check your record: BCA criminal history search. Petition: MN Judicial Branch expungement forms packet (mncourts.gov self-help), file in district court of the case. Cannabis felonies: Cannabis Expungement Board (separate; board reviews without application).

**Legal aid:** Volunteer Lawyers Network expungement clinics, Legal Aid organizations statewide, Until We Are All Free (Clean Slate implementation tracking).

**Personas:** (1) misdemeanor theft, discharged 2021, clean → likely already auto-expunged → check-record. (2) gross misdemeanor discharged 2024 → waiting (2027). (3) 5th-degree drug felony discharged 2023 → waiting (2027, 4-yr). (4) DWI misdemeanor → excluded from automatic → ⚠️ verify whether excluded from petition too (read § 609A.02 subd. 3 vs § 609A.015 subd. 3(b)) → likely "not eligible / legal aid." (5) eligible-list felony discharged 2020, new misdemeanor 2023 → clock broken → recompute from 2023 discharge.

**Verify list:** revisor.mn.gov § 609A.015 and § 609A.02 (waiting periods, BOTH exclusion lists, the § 609.13 quirk) · bca.mn.gov Clean Slate progress page (rollout numbers, record-check path) · mncourts.gov expungement self-help (petition forms, fee) · uwaaf.org/csi (implementation tracking).

---

## Cross-wave flags for the tracker

1. **Three live-rollout states (CT, OK, VA)** — every automatic-track claim needs status-checked dates and soft language ("records began sealing in...", "check whether yours has been processed"). MN is the counterexample: nearly complete, strongest copy.
2. **Virginia is the demo-day star.** A two-week-old, generational law change, correctly encoded with citations, that competitor sites list wrong effective dates for — that's your sunset answer, live on stage. Verify it hardest.
3. **CT's clock quirk** (waiting period runs from the person's MOST RECENT conviction, any crime) and **OK's single-source rule** (any out-of-state arrest kills the automatic path only) are exactly the rules that make generic tools wrong — each is one tree node for you.
4. **Fee verification targets this wave:** DE court fee (by phone), DE fingerprinting ($52?), OK OSBI $150 (confirm), MN petition fee (~$300?), VA no-fee claim (confirm — headline if true), CT free (confirm — also headline).
5. Wave 1 + Wave 2 = the full clean-slate cohort + your existing four = **14 states**. Pace check: verify+encode these ten over the next 4–5 days at ~2/day, and Tier A for the remaining 36 population-order states runs July 20–23, with the tiered fallback intact.

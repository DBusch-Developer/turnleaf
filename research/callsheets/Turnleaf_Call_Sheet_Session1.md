# Turnleaf — Call Session 1 Sheet (Wave 1: UT · MI · PA · NJ · CO)
## Tuesday morning · every number below pulled July 15 from official court/agency pages — confirm office scope with your first question

**Timezone plan (you're in Prescott, AZ — no DST, so you're on Pacific time this summer):**
- **8:00–10:00 AM your time** → Mountain states (UT, CO are 1 hr ahead): their 9–11 AM window. Start here.
- **10:00 AM–1:00 PM your time** → Eastern states (MI, PA, NJ are 3 hrs ahead): their 1–4 PM, post-lunch. Fine for clerks; avoid 12–1 PM their time.
- **AZ offices anytime 9 AM–4 PM** — you're local.

**Universal opener (from the Call Protocol sheet):** "Hi — I'm building a free tool that helps people find the correct forms and fees for record-clearing petitions in [state]. I have two or three quick logistics questions about filing — no legal questions. Do you have two minutes, or is there a better number for filing questions?"

**Log every call in the Call Log sheet — including no-answers.** When they correct a website: Discrepancy column. That's the gold.

---

## 1. UTAH (call 8–10 AM your time)

**BCI Expungement Section (the big one):** (801) 281-5198 · bciexpungements@utah.gov
**BCI main (Taylorsville):** (801) 965-4445
**Salt Lake City Justice Court** (fee cross-check): via slc.gov/courts

Verify:
- "Your site lists the Certificate of Eligibility application fee as $65, plus $65 per conviction case at issuance — is that current?" (Their FAQ confirms both; you're confirming currency.)
- Current processing backlog — their site posts which date's applications they're on; ask what the real wait is now.
- Court filing fee: Holladay Justice Court posts **$135** for the expungement petition — ask BCI whether that's standard statewide or varies by court; then confirm $135 with one district court.
- Prosecutor response time: SLC says 35 days, Holladay says 60 — ask which is right / whether it varies (documented discrepancy already!).
- NEW: the automatic-expungement form requirement ended Jan 1, 2026 — confirm how someone checks whether their case was auto-expunged ($15 record request?).

---

## 2. COLORADO (call 8–10 AM your time)

**Denver District Court Clerk's Offices:** (303) 606-2300 · M–F 8–4
**Denver District Pro Se / Self-Help Center** — explicitly assists with Petitions to Seal (rare and valuable; get their direct line from the main number)

Verify — the fee split is the whole call:
- "For a Motion to Seal Conviction Records (JDF 612) filed into the existing criminal case — what's the filing fee? Your judicial-branch packets show $65 in one place and $224 in another."
  (My read of the packets: JDF 612 motions INTO the case ≈ $65; petitions opening a NEW civil case (older arrest-record paths, multi-jurisdiction JDF 641) = $224; non-conviction JDF 477 = free. Get the clerk to confirm the split — this is a textbook Discrepancy-column entry.)
- CBI criminal history report cost (~$12.50?) and where users get it.
- Whether remote hearings for sealing are the norm now (2024 law allows them).

---

## 3. MICHIGAN (call 10 AM–1 PM your time)

**Michigan State Police — set-aside questions line:** (517) 241-0606
**(MSP CJIC Criminal History processes the $50 + fingerprints; mailing address confirmed: PO Box 30266, Lansing 48909)**

Verify:
- "$50 processing fee to MSP with the MC 227 packet — current?" (MSP's own page confirms; confirm currency.)
- Current MSP processing time (site says allow 8 weeks; a district court says 4–6 — documented discrepancy, ask).
- The court's own motion filing fee when filing MC 227 (one source says ~$20, varies by court) — then confirm with one district court (pick 36th District, Detroit, or any).
- ICHAT self-check $10 / fingerprint personal records check $30 — confirm (this feeds your "check if you were auto-set-aside" UI copy).

---

## 4. PENNSYLVANIA (call 10 AM–1 PM your time) — the fee-variance showcase

**Montgomery County Expungement Clerk (direct!):** (610) 278-5956 · Clerk of Courts main: (610) 278-3295
**Philadelphia Clerk of Courts / Office of Judicial Records, Criminal:** via courts.phila.gov (1301 Filbert St) — get the criminal filing counter number from the main line
**Chester County Clerk of Courts:** via chesco.org

Verify — documented spread so far: **Philadelphia fee schedule lists "Expungement $15.00"; Chester County $168; Montgomery $176.50 + $13.50/agency.**
- Montgomery: "Your packet lists $176.50 including one agency served, $13.50 each additional — current?"
- Philadelphia: "Your fee guide lists expungement at $15 — is that the Municipal/Common Pleas filing fee for a Rule 790 petition, or does a Common Pleas petition cost more?" (The $15 may be Municipal Court only — this is exactly the ambiguity a call resolves.)
- Ask ONE of them: fee for a Rule 791 Limited Access (sealing) petition vs a Rule 490/790 expungement — same or different?
- PSP criminal history via ePATCH required within 60 days of filing — confirm current ePATCH cost (~$22?).

---

## 5. NEW JERSEY (call 10 AM–1 PM your time) — statewide directory exists!

NJ Courts publishes a county-by-county **Expungement Clerk directory** (njcourts.gov, form #13267 PDF — download it and attach to your call log as a source artifact). Direct lines pulled from it:

- **Essex (Newark):** (973) 776-9300 ext. 56587 or 57328
- **Hudson (Jersey City):** (201) 748-4400 ext. 60152
- **Mercer (Trenton):** (609) 571-4200 ext. 74048
- **Middlesex (New Brunswick):** (732) 645-4300 ext. 88155
- **Gloucester (Woodbury):** (856) 878-5050 ext. 15392
- **Atlantic (Mays Landing):** (609) 402-0100
- **LSNJ statewide legal hotline (backup/legal-aid confirm):** 1-888-576-5529

Verify (pick 2 counties):
- "Filing through the eCourts Expungement System is free — correct? No filing fee at all?" (njcourts.gov says free; older sites still say $75 — this confirm-kill is your best single Discrepancy entry of the day.)
- Whether paper filing is still accepted for people without internet access, and if THAT has a fee.
- Typical time from filing to signed order right now (State Police processing backlogs are documented; the 2025 status-portal law — ask if the portal is live and what it's called).

---

## Session targets
- **Minimum win:** 6 calls logged, 3 fields flipped to phone_verified (AZ set-aside fee, UT $65/$65+$135, NJ free-filing).
- **Great session:** all six states touched, the CO fee-split resolved, the PA county spread confirmed in 2–3 counties, 1+ Discrepancy entries.
- After each call: update the state's `verification_status`/fees in fallbackRules, note `call_log_ref`, set Verified Date in the tracker.

One honest caveat: these numbers came from official pages today, but numbers rot — if one's dead, the office name + site in each entry is how you re-find it in 30 seconds. And if a clerk says "that's a legal question," it means the phrasing drifted — go back to confirm-don't-ask.

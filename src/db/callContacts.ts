// ============================================================================
// CALL CONTACTS & PLAN — the human half of a call sheet, as structured data.
//
// This is everything the rules data cannot hold: real phone numbers (with the
// office + site that re-finds them when a number rots), timezone call windows,
// confirm-don't-ask scripts, per-session targets, and standing rules. It was
// migrated verbatim from the hand-written Turnleaf_Call_Sheet_Session<N>.md
// sheets on 2026-07-22 so the generator can emit ONE complete sheet per session
// instead of a numbers-sheet and a questions-sheet you cross-reference by hand.
//
// callsheet.ts merges this with each state's live openQuestions:
//   - contacts / window / headline / ask  ->  from here (human research)
//   - status / dates / open questions      ->  from the data (auto-current)
//
// Numbers rot. Each contact keeps its office name + site so a dead number is
// re-findable in 30 seconds. When a number is re-verified, update it here.
// Keys are 2-letter state codes; a session with no entry for a state still
// renders (contacts simply come from the data's courtContact/legalAid).
// ============================================================================

export interface CallContact {
  /** Office/org name, as you'd say it — "Montgomery County Expungement Clerk". */
  label: string;
  /** Phone, exactly as dialed. Omit when only a site/email is known. */
  phone?: string;
  /** Email, when the office answers written questions (a citable artifact). */
  email?: string;
  /** Site to re-find the number, hours, address, or a verified-on note. */
  note?: string;
}

export interface StateCallPlan {
  /** When to call, in your timezone — "call 10 AM–1 PM your time". */
  window?: string;
  /** A one-liner on why this call matters — "the fee-variance showcase". */
  headline?: string;
  contacts: CallContact[];
  /** Verbatim confirm-don't-ask scripts / watch-fors from the research. */
  ask?: string[];
}

export interface SessionCallPlan {
  /** The line under the title on the old hand sheet. */
  subtitle?: string;
  /** Timezone plan, openers, split suggestions — the top matter, one line each. */
  intro?: string[];
  states: Record<string, StateCallPlan>;
  /** Session targets — minimum win / great session. */
  targets?: string[];
  /** The standing-rules footer. */
  standing?: string;
}

export const callPlans: Record<number, SessionCallPlan> = {
  0: {
    subtitle: 'Slot this before or after Session 1 — CA/AZ are your timezone-friendly states.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- AZ is local — anytime; start here. CA is YOUR timezone — 9–11 AM straight up.',
      '- 7:00–9:00 AM your time → TX (Central, +2): their 9–11 AM.',
      '- 10:00 AM–1:00 PM your time → NY (Eastern, +3): their 1–4 PM.',
      'These four deserve the most verification because they are LIVE — a wrong fee on a coming-soon state embarrasses you; a wrong fee on a live state harms a user.',
    ],
    states: {
      AZ: {
        window: 'local — call anytime; YOUR first call',
        contacts: [
          { label: 'Clerk of Superior Court, Maricopa County', phone: '(602) 372-5375', note: 'also billed as (602) 37-CLERK · M–F 8–5' },
          { label: 'Criminal Administration (set-aside order status)', phone: '(602) 506-8575' },
        ],
        ask: [
          'This list matches the app\'s openQuestions for AZ; each answer closes a numbered question in the database.',
          'The 13-911 waiting ladder (confirm-don\'t-ask): "Class 2–3 felonies 10 years, class 4–6 felonies 5, class 1 misdemeanors 3, lower misdemeanors 2 — from completion of the entire sentence including restitution — is that how you apply it?"',
          'Dismissed/never-charged: "Can a dismissal be sealed under 13-911 immediately, or is there a wait?" (un-hedges the most common happy path).',
          'Certificate of Second Chance — confirm it issues with qualifying set-asides, no separate fee.',
          'Confirm plainly: "There\'s no automatic record-clearing in Arizona, correct — everything is petition-based?"',
        ],
      },
      CA: {
        window: '9–11 AM your time',
        contacts: [
          { label: 'LA Superior Court Self-Help Center', phone: '(213) 830-0845', note: 'M–F 8:30–4:30 · verified 7/15 on lacourt.org — phone appointments, English/Spanish' },
          { label: 'CA Courts Self-Help (Clean Your Record)', note: 'selfhelp.courts.ca.gov' },
          { label: 'CA DOJ — record review unit (fingerprint-based, $25)', note: 'via oag.ca.gov' },
        ],
        ask: [
          'The no-fee question: "Is there a filing fee for a PC 1203.4 dismissal petition today?" (confirm-kill; old county schedules said ~$120–150).',
          'Automation reality: "For a conviction eligible under PC 1203.425, is DOJ\'s monthly automatic relief actually landing? If not, wait or petition?"',
          'SB 731 felony tiers: confirm the 4-yr post-sentence rule for non-serious/non-violent felonies.',
        ],
      },
      TX: {
        window: '7–9 AM your time',
        contacts: [
          { label: 'Texas State Law Library — Ask a Librarian', phone: '(844) 829-2843', note: 'toll-free; also (512) 463-1722 · M–F · verified 7/15 on sll.texas.gov — they answer these questions' },
          { label: 'Harris County District Clerk (Houston)', note: 'civil filing (expunctions file as civil) · hcdistrictclerk.com' },
        ],
        ask: [
          'Both fee stacks: "Total to file an expunction in Harris County — filing fee plus agency service costs? And for an order of nondisclosure — civil fee plus the $28?"',
          'The renumbering: "Petitions citing Code of Criminal Procedure Chapter 55A (not 55) since January 2025 — are the clerk\'s forms updated?"',
          'Automatic expunction at acquittal: "If someone was acquitted this year, does the trial court order expunction automatically, or must they still petition?"',
          'Nondisclosure § 411.0735 misdemeanor-conviction wait: 2 or 5 years — ask the Law Library to read the current section with you.',
        ],
      },
      NY: {
        window: '10 AM–1 PM your time',
        contacts: [
          { label: 'NYS DCJS Record Review Unit', phone: '(518) 457-9847', email: 'RecordReview@dcjs.ny.gov', note: 'also (518) 485-7675 · M–F 8–4 · verified 7/15 on criminaljustice.ny.gov — how people check if they\'re sealed' },
          { label: 'Legal Action Center', phone: '(212) 243-1313' },
          { label: 'Community Service Society Record Repair Hotline', phone: '(212) 614-5441', note: 'NYC implementation-truth orgs' },
          { label: 'NY Unified Court System / OCA', note: 'Clean Slate rollout updates · nycourts.gov (screenshot before calling)' },
          { label: 'Legal Aid Society / LawNY Clean Slate units', note: 'legalaidnyc.org / lawny.org' },
        ],
        ask: [
          'THE question: "Clean Slate sealing of the pre-Nov-2024 backlog — how far along is OCA? Are 2019-era misdemeanors sealed yet, or still queued toward the Nov 2027 deadline?"',
          'How someone checks whether THEIR record is sealed (DCJS record review — process, cost, turnaround).',
          'CPL 160.59 petition: confirm no filing fee, typical time-to-decision, and whether judges defer petitions because "Clean Slate will get it."',
          'Confirm the drug-Class-A-felony inclusion in Clean Slate before you encode it.',
          'How are deferred dispositions (ACDs, completed deferrals) treated — seal like non-convictions under 160.50/.55, or Clean Slate timing?',
        ],
      },
    },
    targets: [
      'Minimum win: AZ openQuestions 1–5 answered (fees + the dismissal wait); all four touched; CA no-fee + TX fee stacks + NY backlog status documented.',
      'Great session: the TX 411.0735 conflict resolved live with the Law Library; a dated NY rollout answer; CA automation reality from the self-help center.',
      'These answers update LIVE pages — flip fields to phone_verified same-day, commit, reseed.',
    ],
    standing: 'Confirm-don\'t-ask · log everything · numbers rot · night-before emails where possible.',
  },

  1: {
    subtitle: 'Every number pulled July 15 from official court/agency pages — confirm office scope with your first question.',
    intro: [
      'Timezone plan (you\'re in Prescott, AZ — no DST, so Pacific time this summer):',
      '- 8:00–10:00 AM your time → Mountain states (UT, CO are 1 hr ahead): their 9–11 AM. Start here.',
      '- 10:00 AM–1:00 PM your time → Eastern states (MI, PA, NJ are 3 hrs ahead): their 1–4 PM. Avoid 12–1 PM their time.',
      '- AZ offices anytime 9 AM–4 PM — you\'re local.',
      'Universal opener: "Hi — I\'m building a free tool that helps people find the correct forms and fees for record-clearing petitions in [state]. I have two or three quick logistics questions about filing — no legal questions. Do you have two minutes, or is there a better number for filing questions?"',
      'Log every call in the Call Log — including no-answers. When they correct a website: Discrepancy column. That\'s the gold.',
    ],
    states: {
      UT: {
        window: 'call 8–10 AM your time',
        contacts: [
          { label: 'BCI Expungement Section (the big one)', phone: '(801) 281-5198', email: 'bciexpungements@utah.gov' },
          { label: 'BCI main (Taylorsville)', phone: '(801) 965-4445' },
          { label: 'Salt Lake City Justice Court (fee cross-check)', note: 'via slc.gov/courts' },
        ],
        ask: [
          '"Your site lists the Certificate of Eligibility application fee as $65, plus $65 per conviction case at issuance — is that current?"',
          'Court filing fee: Holladay Justice Court posts $135 — ask BCI whether that\'s standard statewide; confirm $135 with one district court.',
          'Prosecutor response time: SLC says 35 days, Holladay says 60 — which is right? (documented discrepancy).',
          'The automatic-expungement form requirement ended Jan 1, 2026 — confirm how someone checks whether their case was auto-expunged ($15 record request?).',
        ],
      },
      CO: {
        window: 'call 8–10 AM your time',
        contacts: [
          { label: 'Denver District Court Clerk\'s Offices', phone: '(303) 606-2300', note: 'M–F 8–4' },
          { label: 'Denver District Pro Se / Self-Help Center', note: 'assists with Petitions to Seal — get their direct line from the main number' },
        ],
        ask: [
          'The fee split is the whole call: "For a Motion to Seal Conviction Records (JDF 612) filed into the existing criminal case — what\'s the filing fee? Packets show $65 in one place and $224 in another."',
          'Read: JDF 612 motions INTO the case ≈ $65; petitions opening a NEW civil case (JDF 641) = $224; non-conviction JDF 477 = free. Get the clerk to confirm the split.',
          'CBI criminal history report cost (~$12.50?) and where users get it.',
          'Whether remote hearings for sealing are the norm now (2024 law allows them).',
        ],
      },
      MI: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Michigan State Police — set-aside questions line', phone: '(517) 241-0606', note: 'MSP CJIC processes the $50 + fingerprints · PO Box 30266, Lansing 48909' },
        ],
        ask: [
          '"$50 processing fee to MSP with the MC 227 packet — current?"',
          'Current MSP processing time (site says 8 weeks; a district court says 4–6 — documented discrepancy).',
          'The court\'s own motion filing fee when filing MC 227 (~$20, varies) — confirm with one district court (36th District, Detroit).',
          'ICHAT self-check $10 / fingerprint personal records check $30 — confirm (feeds the "check if you were auto-set-aside" copy).',
        ],
      },
      PA: {
        window: 'call 10 AM–1 PM your time',
        headline: 'the fee-variance showcase',
        contacts: [
          { label: 'Montgomery County Expungement Clerk (direct!)', phone: '(610) 278-5956', note: 'Clerk of Courts main: (610) 278-3295' },
          { label: 'Philadelphia Clerk of Courts / Office of Judicial Records, Criminal', note: 'courts.phila.gov (1301 Filbert St) — get the criminal filing counter number from the main line' },
          { label: 'Chester County Clerk of Courts', note: 'via chesco.org' },
        ],
        ask: [
          'Documented spread: Philadelphia lists "Expungement $15.00"; Chester County $168; Montgomery $176.50 + $13.50/agency.',
          'Montgomery: "Your packet lists $176.50 including one agency served, $13.50 each additional — current?"',
          'Philadelphia: "Your fee guide lists expungement at $15 — is that the Municipal/Common Pleas filing fee for a Rule 790 petition, or does a Common Pleas petition cost more?"',
          'Ask one: fee for a Rule 791 Limited Access (sealing) petition vs a Rule 490/790 expungement — same or different?',
          'PSP criminal history via ePATCH required within 60 days of filing — confirm current ePATCH cost (~$22?).',
        ],
      },
      NJ: {
        window: 'call 10 AM–1 PM your time',
        headline: 'statewide directory exists!',
        contacts: [
          { label: 'Essex (Newark)', phone: '(973) 776-9300', note: 'ext. 56587 or 57328' },
          { label: 'Hudson (Jersey City)', phone: '(201) 748-4400', note: 'ext. 60152' },
          { label: 'Mercer (Trenton)', phone: '(609) 571-4200', note: 'ext. 74048' },
          { label: 'Middlesex (New Brunswick)', phone: '(732) 645-4300', note: 'ext. 88155' },
          { label: 'Gloucester (Woodbury)', phone: '(856) 878-5050', note: 'ext. 15392' },
          { label: 'Atlantic (Mays Landing)', phone: '(609) 402-0100' },
          { label: 'LSNJ statewide legal hotline (backup/legal-aid confirm)', phone: '1-888-576-5529' },
          { label: 'NJ Courts county-by-county Expungement Clerk directory', note: 'njcourts.gov, form #13267 PDF — download and attach to your call log as a source artifact' },
        ],
        ask: [
          'Pick 2 counties. "Filing through the eCourts Expungement System is free — correct? No filing fee at all?" (njcourts.gov says free; older sites say $75 — best single Discrepancy entry).',
          'Whether paper filing is still accepted for people without internet, and if THAT has a fee.',
          'Typical time from filing to signed order right now; ask if the 2025 status-portal is live and what it\'s called.',
        ],
      },
    },
    targets: [
      'Minimum win: 6 calls logged, 3 fields flipped to phone_verified (AZ set-aside fee, UT $65/$65+$135, NJ free-filing).',
      'Great session: all six touched, CO fee-split resolved, PA county spread confirmed in 2–3 counties, 1+ Discrepancy entries.',
      'After each call: update verification_status/fees in fallbackRules, note call_log_ref, set Verified Date in the tracker.',
    ],
    standing: 'Numbers came from official pages today, but numbers rot — the office name + site in each entry re-finds it in 30 seconds. If a clerk says "that\'s a legal question," the phrasing drifted — go back to confirm-don\'t-ask.',
  },

  2: {
    subtitle: 'Every number pulled July 15 from official agency/court pages — confirm office scope with your first question.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- 7:00–9:00 AM your time → Central (OK, MN are 2 hrs ahead): their 9–11 AM. Start here.',
      '- 10:00 AM–1:00 PM your time → Eastern (CT, DE, VA are 3 hrs ahead): their 1–4 PM.',
      'Wave 2 reality check: three of these five are mid-rollout regimes. Your questions are less "what\'s the fee" and more "what\'s actually happening right now" — which makes these calls MORE valuable, because the answers aren\'t on any website yet.',
    ],
    states: {
      OK: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'OSBI Expungement/Disposition Services', phone: '(405) 879-2641', email: 'expungements@osbi.ok.gov', note: 'if the line\'s busy, email the same questions and paste the reply into your log as a written source' },
        ],
        ask: [
          '"$150 processing fee for the arrest-record (Section 18) expungement, court record free — current?"',
          'Clean Slate rollout: "Automatic processing was slated to begin November 1, 2025 — has the monthly OSBI run started? Any automatic expungements actually completed?"',
          'Single-source rule: "If someone has an out-of-state arrest, they\'re excluded from the automatic path but can still petition — correct?"',
        ],
      },
      MN: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'MN State Law Library (expungement guidance)', phone: '(651) 297-7651', note: 'M–F 8:00–4:30' },
          { label: 'Volunteer Lawyers Network expungement intake', phone: '(612) 752-6677', note: 'M–Th 10 AM–1 PM Central' },
          { label: 'BCA record checks', note: 'chs.state.mn.us (online) · BCA CHA Unit, 1430 Maryland Ave E, St. Paul (lobby M–F 8:15–4:00)' },
          { label: 'County clinics', phone: '(651) 266-8391', note: 'Ramsey; Anoka (763) 324-5560' },
        ],
        ask: [
          'The fee conflict (#1 MN question): "For a petition-based expungement under 609A.02, what\'s the district court filing fee?" One guide says FREE; older sources say ~$300. Ask the Law Library, confirm with Hennepin.',
          'Clean Slate completion: "BCA reported ~94% of eligible records expunged by spring — is the remainder still in the 60-day judicial review loop?"',
          'How a person checks whether THEIR record was auto-expunged (chs.state.mn.us cost — $15–20?).',
          'Whether prosecutor-agreed sealing (609A.025) is actually being used — VLN will know.',
        ],
      },
      CT: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Board of Pardons and Paroles — Pardons Division', phone: '(203) 805-6643', email: 'ct.bpp@ct.gov', note: 'M–F 8:30–4:30 ET · 55 West Main St, Suite 520, Waterbury · parole line is 203-805-6605, don\'t get routed there' },
          { label: 'Clean Slate erasure status', note: 'portal.ct.gov/cleanslate — screenshot it the morning of your call' },
        ],
        ask: [
          'Pardon application: "Free to apply, eligible 3 years after most recent misdemeanor / 5 after felony, absolute pardon erases the entire record — all current?"',
          'Clean Slate rollout: "Erasures resumed October 2025 — is the automatic process now running continuously? Roughly how current?" (~50k done as of Oct).',
          'Petition erasure JD-CR-202 (pre-2000 convictions): confirm no fee, filed in the sentencing court.',
          'DUI: "Is a first § 14-227a conviction eligible for automatic erasure, or excluded?" (if they punt, the statute settles it — log the attempt).',
        ],
      },
      DE: {
        window: 'call 10 AM–1 PM your time',
        headline: 'fee discrepancy pre-loaded',
        contacts: [
          { label: 'SBI fingerprint appointments / info', phone: '(302) 739-2528' },
          { label: 'SBI Kent County office (criminal history)', phone: '(302) 739-5871', note: 'M–F 8:30–5:15 ET · 600/655 S. Bay Rd, Dover' },
          { label: 'Family Court expungement email (written answers!)', email: 'FC_Expungement@delaware.gov' },
        ],
        ask: [
          'The fee stack is the whole call. DSP\'s page says: initial application fee $72, then if you qualify for mandatory, $75 money order to DSP (service code 27S23V). The ACLU guide said $52 fingerprinting.',
          '"To apply for a mandatory expungement: is it $72 to apply, then $75 on approval — $147 total? Does the $72 include fingerprinting, or is that separate?"',
          'Discretionary path: the court fee schedule under § 4374(j) — get the number from Superior Court Prothonotary (New Castle) or the Family Court email.',
          'Automatic Clean Slate: "Automatic expungements began August 2024 — if a case qualifies but hasn\'t been processed, do they still apply through SBI?"',
        ],
      },
      VA: {
        window: 'call 10 AM–1 PM your time',
        headline: 'the two-week-old law',
        contacts: [
          { label: 'VSP Central Criminal Records Exchange (CCRE)', phone: '(804) 674-6723', note: 'VSP can\'t give legal advice — keep it to pure logistics' },
          { label: 'One circuit court clerk', note: 'Fairfax Circuit Court is the marquee call (only circuit running its own case-management system) · fairfaxcounty.gov; Richmond City a good second' },
        ],
        ask: [
          'The headline date: "Petition sealing under the new law is live as of July 1 — but automatic sealing lists from VSP to the courts start October 1, 2026 — right?"',
          '"Is the OES sealing petition form now available on the Virginia Judicial System website?" (get its name/number).',
          'The no-fee claim: "What does it cost, all-in, to file a sealing petition today?" (a ~$12 Commonwealth\'s-Attorney service fee may apply).',
          '"Is the CCRE online portal for sending criminal history to circuit courts live yet, or still paper/electronic request?"',
        ],
      },
    },
    targets: [
      'Minimum win: 5 calls logged, the DE fee stack resolved, the VA Oct-1 date confirmed, the MN fee conflict killed.',
      'Great session: all five touched + written email answers from OSBI and DE Family Court in the log.',
      'Rollout answers (CT, OK, VA portal status) go into UI copy with a "verified by phone [date]" note — sentences no competitor scraping the web can publish.',
    ],
    standing: 'Numbers were pulled from official pages today but rot; office name + site re-finds them. Confirm-don\'t-ask. Log the no-answers.',
  },

  3: {
    subtitle: 'Numbers pulled July 15 from official pages — confirm office scope with your first question.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- 7:00–9:00 AM your time → Illinois (Central, +2): their 9–11 AM.',
      '- 10:00 AM–1:00 PM your time → FL, OH, GA, NC (Eastern, +3): their 1–4 PM.',
      'Wave 3 twist: these calls verify FEES, but the two fresh-law states (IL, NC) also get a "is the new rule live in your office yet?" question — clerks sometimes lag statute changes by months, and that\'s publishable intel.',
    ],
    states: {
      IL: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'Cook County Circuit Clerk — expungement info line (suburban districts)', phone: '(847) 818-2436' },
          { label: 'New Leaf Illinois hotline (cannabis + general record relief)', phone: '(855) 963-9532' },
          { label: 'Legal Aid Chicago', phone: '(312) 229-6071' },
          { label: 'Adult Expungement Advice Desk (free legal help)', note: 'Daley Center, 50 W Washington, 10th Fl Rm 1006 — Mon & Wed 9 AM–12 PM walk-in' },
        ],
        ask: [
          'The fresh-law question: "As of June 30, the misdemeanor sealing wait dropped from 3 years to 2 under the Clean Slate Act — is the clerk\'s office processing under the new period?" (if they haven\'t heard of it, that\'s a dated Discrepancy entry).',
          'Cook County filing fee for expungement/sealing; confirm the one-fee-per-day rule for multiple petitions.',
          'When does AUTOMATIC sealing under the Clean Slate Act begin? (ask New Leaf or the Advice Desk, not the clerk).',
          'Whether e-filing is required or in-person is fine for pro se petitioners.',
        ],
      },
      FL: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'FDLE Seal & Expunge Section', phone: '(850) 410-7870', email: 'SEinfo@fdle.state.fl.us', note: 'status requests need a photo-ID copy attached' },
          { label: 'One county clerk for the petition fee', note: 'Duval, Miami-Dade (Gerstein bldg), or Pinellas — pull the number from that clerk\'s seal/expunge page' },
        ],
        ask: [
          '"$75 application fee, ~12-week processing — both current?" (confirm currency and the real backlog).',
          'Certificate validity window (12 months?) — how long after issuance can the petition be filed?',
          'The § 943.0595 question: "Is FDLE\'s administrative/automatic sealing of non-conviction records running? If charges were dropped, is the arrest record auto-sealed, or should they still apply?"',
          'County clerk: petition filing fee for seal/expunge (~$42–60), certified disposition cost.',
          'Email SEinfo the night before — a written FDLE reply is a citable artifact.',
        ],
      },
      OH: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Hamilton County Clerk of Courts', note: 'courtclerk.org — dedicated record-sealing page; pull the criminal division number from the site' },
          { label: 'Franklin County Municipal Court Self-Help Resource Center', note: 'misdemeanor side; number on fcmcclerk.com' },
        ],
        ask: [
          'Filing fee for a sealing application (statute-era $50; court schedules set it — get today\'s number, felony vs misdemeanor court).',
          '"One application covering multiple cases in this court — allowed, one fee?"',
          'Real-world timing: statute says hearing 45–90 days — what\'s actual now?',
          'Count-rule check: "Is there any overall cap on the number of felonies that can be sealed, or is it per-offense with the F3-specific limits?" (if the clerk won\'t touch it, the Supreme Court bench card settles it — log the attempt).',
        ],
      },
      GA: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Georgia Justice Project', note: 'gjp.org — statewide record-restriction experts; the implementation-truth org' },
          { label: 'GBI/GCIC (restriction mechanics)', note: 'pull the GCIC record-restriction unit number from gbi.georgia.gov' },
          { label: 'One court-of-conviction clerk', note: 'Fulton or Gwinnett State Court, for petition costs' },
        ],
        ask: [
          '"Post-July-2013 non-conviction arrests restrict automatically — working reliably, or should people pull their GCIC report to confirm?"',
          'Pre-2013 arrests: application to the arresting agency — typical fee range?',
          'SB 288 misdemeanor petition: county court costs to file (no statewide fee) — get one county\'s number.',
          'Pardon-then-restrict felony path: current Board of Pardons processing time (GJP tracks this).',
        ],
      },
      NC: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Clerk of Superior Court, county of conviction', note: 'Mecklenburg or Wake — numbers on nccourts.gov county pages' },
          { label: 'NC Second Chance Alliance', note: 'ncsecondchance.org — the implementation-truth org for automatic expunction' },
        ],
        ask: [
          'The fresh-law question: "For petitions filed after July 9, 2025, the single nonviolent misdemeanor wait is 3 years — is the AOC form updated?" (form AOC-CR-298 has had statute-inconsistent findings before — if form and statute disagree TODAY, that\'s gold).',
          '$175 filing fee for conviction expunctions — current? Non-conviction petitions free? Indigent waiver process?',
          'Automatic expunction: "Dismissals since Dec 2021 auto-expunge 180–210 days after disposition — running normally since the July 2024 restart?"',
          'Whether AOC forms are accepted statewide uniformly or the county wants local variants.',
        ],
      },
    },
    targets: [
      'Minimum win: 5 calls logged; FL FDLE processing time + fee confirmed; IL and NC fresh-law questions asked and answered ("clerk unaware of new law" is publishable intel with a date).',
      'Great session: all five + written replies from SEinfo@fdle and GJP in the log; OH fee in two courts; the NC form-vs-statute check done.',
    ],
    standing: 'Confirm-don\'t-ask; log no-answers; numbers rot — office name + site re-finds them; email the emailable agencies the night before.',
  },

  4: {
    subtitle: 'Contacts pulled July 15 from official pages where marked; others pull-from-site — confirm office scope first.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- WA is YOUR timezone — call 9–11 AM straight up. The one state where scheduling is easy.',
      '- 7:00–9:00 AM your time → TN (Central, +2; east TN is Eastern) and MO (Central, +2): their 9–11 AM.',
      '- 10:00 AM–1:00 PM your time → MA and IN (Eastern, +3): their 1–4 PM.',
    ],
    states: {
      WA: {
        window: 'call 9–11 AM your time — local hours',
        contacts: [
          { label: 'King County Superior Court Clerk and/or Pierce County Clerk', note: 'Pierce publishes the most complete vacate packets · piercecountywa.gov / kingcounty.gov' },
          { label: 'Washington State Law Library (answers reference questions)', note: 'courts.wa.gov/library' },
          { label: 'WSP WATCH (record self-check, $11 online)', note: 'watch.wsp.wa.gov' },
        ],
        ask: [
          'Filing fee for a motion to vacate — confirm per county (a motion into an existing criminal case should be free or minimal).',
          'The 2024 change: "The waiting period no longer requires LFOs paid first — is the clerk processing under that rule? Is there a form for waiving remaining LFOs?"',
          'Confirm the statewide vacate forms on courts.wa.gov are what the county wants.',
          'Certificate of Discharge (felonies): how a person gets one if the court never issued it.',
        ],
      },
      TN: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'Davidson County Criminal Court Clerk', note: 'Justice A.A. Birch Building, Nashville — expungement counter, 2nd floor · number via ccc.nashville.gov' },
          { label: 'TBI — certificate-of-eligibility issuer', note: 'process page via tbi.tn.gov; tncourts.gov/expungements links it' },
        ],
        ask: [
          'The 2024 gate: "Since Jan 1, 2024 a TBI certificate of eligibility must accompany conviction expunction orders — how does a pro se petitioner request it, turnaround, any fee?"',
          'Clerk fee for conviction/diversion expunctions — statute caps at $100; what does Davidson charge? Dismissals confirmed free?',
          'The reorganization: "§ 40-32-101 is being renumbered (106/107) — forms updated, which citation should petitions use today?"',
          'The newer C/D felony 10-year tier — confirm the clerk is seeing/processing these.',
        ],
      },
      MA: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Massachusetts Probation Service — sealing/expungement unit', note: 'Commissioner of Probation, One Ashburton Place Rm 405, Boston 02108 · phone via mass.gov "Seal your criminal record"' },
          { label: 'Greater Boston Legal Services CORI unit', note: 'gbls.org — the practitioner authority' },
        ],
        ask: [
          '"Petition to Seal by mail — current form name/number (TC-005?), current mailing address, still no-fee?"',
          'Typical processing time for administrative sealing right now.',
          'Confirm non-discretionary: "If the waiting period and criteria are met, sealing is granted as of right — correct?"',
          'Which conviction categories are excluded from ADMINISTRATIVE sealing (vs needing court).',
          'iCORI self-check: $25, waiver process.',
        ],
      },
      IN: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Marion County Clerk (Indianapolis) — criminal division', note: 'via indy.gov; their Second Chance page is the state\'s best official explainer' },
          { label: 'Indiana Legal Services', note: 'indianalegalservices.org — statewide expungement help' },
        ],
        ask: [
          'Conviction-petition filing fee (civil, county-set — get Marion\'s number). Arrest-record petitions (§ 9-1) confirmed free?',
          'The one-shot mechanics: "Multi-county records — separate petitions per county within 365 days, counted as one lifetime petition — is that how the clerk processes them?"',
          'Post-2022 automatic expungement of dismissed-case arrests: actually happening, or petition-in-practice?',
          'Prosecutor consent for § 9-5 petitions: process for obtaining written consent.',
        ],
      },
      MO: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'Jackson County Circuit Clerk (Kansas City) or St. Louis City/County', note: 'numbers via courts.mo.gov circuit pages' },
          { label: 'Clear My Record Missouri', note: 'clearmyrecordmo.org — the implementation-truth org; their law-change page is current' },
        ],
        ask: [
          'The fee conflict (main event): "Filing fee for a § 610.140 expungement petition: a $250 surcharge, standard civil filing fee, or both?" Fee-waiver (in forma pauperis) process.',
          'The 2025 limits: "2 felonies + 3 misdemeanors lifetime as of Jan 1 — is the clerk applying the new limits? Form updates?" (many sites still publish 1F+2M).',
          'Marijuana automatic expungement (Amendment 3): current court backlog — Clear My Record MO will know.',
          'Clean Slate automation: did anything pass this session, or still petition-only?',
        ],
      },
    },
    targets: [
      'Minimum win: 5 calls logged; MA no-fee + form confirmed; MO fee conflict resolved; TN TBI-gate process documented.',
      'Great session: all five + WA LFO-rule and IN one-shot mechanics confirmed at the counter; written replies from GBLS or Clear My Record MO filed.',
    ],
    standing: 'Confirm-don\'t-ask · log everything including no-answers · numbers rot, office+site re-finds them · night-before emails to the emailable orgs.',
  },

  5: {
    subtitle: 'Contacts pulled July 15 from official pages where marked — confirm office scope first.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- 7:00–9:00 AM your time → WI, AL, LA (Central, +2): their 9–11 AM.',
      '- 10:00 AM–1:00 PM your time → MD, SC (Eastern, +3): their 1–4 PM.',
    ],
    states: {
      LA: {
        window: 'call 7–9 AM your time',
        headline: 'the automated-system call',
        contacts: [
          { label: 'Justice & Accountability Center of Louisiana', phone: '(504) 273-1091', note: 'verified — workshops, CLEAN JACKET app; the implementation-truth org' },
          { label: 'LSP BCII Expungement Unit', note: 'number via lsp.org/about → BCII → Expungements' },
          { label: 'One parish clerk (Orleans or East Baton Rouge)', note: 'for the clerk-fee portion' },
        ],
        ask: [
          'THE question: "The automated expungement system under 2023\'s SB 111 went live January 1 — is the BCII request process actually operational? Where does someone submit, real turnaround?" (JAC honest / LSP official — get both).',
          '$550 fee breakdown current ($250 LSP + $50 sheriff + $50 DA + clerk ≤$200)? One fee per arrest event confirmed?',
          'Marijuana first-possession $300 reduced fee — confirm it sunsets Aug 1, 2026.',
          'Felony count rule: "Can a person expunge more than one eligible felony in a 10-year period under current art. 978(F)?"',
        ],
      },
      AL: {
        window: 'call 7–9 AM your time',
        contacts: [
          { label: 'Circuit Clerk, Jefferson County (Birmingham) or Montgomery County', note: 'numbers via alacourt.gov / county sites' },
          { label: 'AL Board of Pardons and Paroles (felony-pardon gateway)', note: 'via paroles.alabama.gov' },
          { label: 'Montgomery Volunteer Lawyer Program', note: 'montgomeryvlp.org — their CLE expungement handout is the best practitioner doc' },
        ],
        ask: [
          '"$500 administrative filing fee per case — current after Act 2024-407? What does the indigency process under § 15-27-4 look like — who qualifies, what form?"',
          'Lifetime caps under § 15-27-2.1 — confirm the misdemeanor-conviction count (2?) and one-pardoned-felony rule.',
          'Pardon path timing: current Board processing time from application to certificate.',
          'Confirm DUI = serious traffic offense = never expungable since Jul 1, 2023.',
        ],
      },
      WI: {
        window: 'call 7–9 AM your time',
        headline: 'the short call',
        contacts: [
          { label: 'Clerk of Circuit Court, Milwaukee County (or Ozaukee)', note: 'Ozaukee\'s expungement page is unusually clear · numbers via wicourts.gov county directory' },
          { label: 'Governor\'s Office pardon information', note: 'evers.wi.gov (Pardon Advisory Board application)' },
        ],
        ask: [
          'Confirm the negative on the record: "For an adult whose judge did not order expungement at sentencing, is there any petition process today?" (expected: no — a dated clerk quote is your honest-no citation).',
          'Confirm the 2025 budget expungement provisions were stripped — any clerk guidance since?',
          'If expungement WAS ordered and sentence completed: does the clerk confirm the self-executing discharge-certificate flow (State v. Hemp), or do people need to nudge?',
          'Pardon: current eligibility (5 yrs post-sentence?), application backlog.',
        ],
      },
      MD: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Maryland Court Help Center (free brief legal advice, statewide)', note: 'number via mdcourts.gov/helpcenter' },
          { label: 'MVLS — Maryland Volunteer Lawyers Service', note: 'mvlslaw.org — their 2025 expungement presentation is your what-passed-in-2025 check' },
          { label: 'One District Court clerk', note: 'for the fee' },
        ],
        ask: [
          'Conviction-petition filing fee ($30?) — current, per petition or per case? Non-conviction petitions confirmed free?',
          'The 2025 question: "Did the 2025 session change expungement law?" (a \'2025 Expungement Reform Act\' headline exists).',
          'Waiting-clock practice: does the wait run from probation/parole EXPIRATION or sentence completion? (the HB 73 dispute).',
          'Cannabis: confirm auto-expungement hit CJIS only and the court-record petition is still needed — and fee-waived.',
        ],
      },
      SC: {
        window: 'call 10 AM–1 PM your time',
        contacts: [
          { label: 'Your test circuit\'s Solicitor\'s Office expungement desk', note: '5th Circuit (Richland/Columbia) or 9th (Charleston) — applications + numbers on each circuit solicitor\'s site' },
          { label: 'SLED (records verification layer)', note: 'sled.sc.gov' },
        ],
        ask: [
          '"$310 total — $250 solicitor + $25 SLED + $35 clerk, separate money orders — current? Which fees come back if SLED finds the offense ineligible?"',
          'Plea-deal dismissals: confirm they pay full fees while no-plea dismissals are free.',
          'The legislative watch: "Has the general first-offense expungement bill (§ 17-22-915 / H.3730) passed?"',
          'Typical processing time application-to-order (6-month norm?).',
          'Summary-court auto-expungement of dismissals since 2009: reliable, or verify with the summary court?',
        ],
      },
    },
    targets: [
      'Minimum win: 5 logged; LA automated-system status documented; AL indigency process captured; MD 2025-session question answered.',
      'Great session: all five + WI honest-no confirmed on the record + SC bill status + written JAC/MVLS replies filed.',
    ],
    standing: 'Confirm-don\'t-ask · log everything · numbers rot, office+site re-finds them · night-before emails where possible.',
  },

  6: {
    subtitle: 'Eleven states — split across two mornings if needed. Contacts are office+site unless marked verified.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- 7:00–9:00 AM your time → WV (Eastern +3), KY-Louisville/Lexington (Eastern +3): their 10 AM–noon.',
      '- 8:00–11:00 AM your time → IA, AR, MS, KS, NE (Central +2): their 10 AM–1 PM.',
      '- 9:00 AM–noon your time → NM, ID (Mountain +1): their 10 AM–1 PM.',
      '- Anytime → OR, NV (your timezone).',
      'Suggested split: Day 1 = KY, WV, MS, AR, IA, NE (eastern-leaning). Day 2 = KS, NM, ID, NV, OR.',
    ],
    states: {
      KY: {
        contacts: [
          { label: 'AOC/KSP certification unit', note: 'via kycourts.gov → Expungement Certification Process; KSP records via kentuckystatepolice.ky.gov/expungements' },
        ],
        ask: [
          'Current certificate backlog ("your page says 4–5 months — still accurate?"); cert $40 + 30-day validity; felony $50 + $250-on-grant + 18-month plan mechanics.',
          'The 2023 multiple-felony amendment: "can a person expunge Class D felonies from separate incidents in one or several applications?"',
          'Auto-expungement of post-2020 acquittals actually firing?',
        ],
      },
      WV: {
        contacts: [
          { label: 'Kanawha County Circuit Clerk (Charleston)', note: 'via courtswv.gov' },
          { label: 'Legal Aid of WV / Jobs & Hope WV' },
        ],
        ask: [
          'Circuit filing fee + the $100 WSP fee mechanics.',
          'The once-ever rule: "SCA-C900 says a person may only request expungement once; once per lifetime total?"',
          '26a fast-lane: which programs count, how graduates document it; any automation bill passed?',
        ],
      },
      MS: {
        contacts: [
          { label: 'Hinds County Circuit Clerk (Jackson)' },
          { label: 'Mississippi Center for Justice' },
        ],
        ask: [
          '$150 fee current + does it apply to non-conviction petitions? First-offender misdemeanor: any wait?',
          '"Did HB 1344 (automatic expungement, 2026 session) pass?"',
          'Typical time petition → hearing → order.',
        ],
      },
      AR: {
        contacts: [
          { label: 'Pulaski County Circuit Clerk (Little Rock)' },
          { label: 'ACIC (forms authority)' },
          { label: 'Legal Aid of Arkansas' },
        ],
        ask: [
          'Zero filing fee confirmed statewide; immediate eligibility for non-violent C/D felonies on completion — clerk-counter confirmation.',
          'Misdemeanor DWI 10-yr wait (⚠️); one-prior-felony cap mechanics; felony 90-day wait before grant.',
        ],
      },
      IA: {
        contacts: [
          { label: 'Polk County Clerk of Court (Des Moines)', note: 'via iowacourts.gov' },
          { label: 'Iowa Legal Aid' },
        ],
        ask: [
          'Any filing fee for 901C applications? Once-per-lifetime misdemeanor rule + same-transaction bundling.',
          'Non-conviction LFO gate ("court costs must be paid even for dismissals — clerks enforcing that?").',
          'Deferred-judgment auto-expungement reliability in rural counties.',
        ],
      },
      NE: {
        contacts: [
          { label: 'Douglas County District Court (Omaha)', note: 'via nebraskajudicial.gov' },
          { label: 'Legal Aid of Nebraska Clean Slate AccessLine' },
        ],
        ask: [
          'Set-aside filing mechanics + any fee.',
          'Confirm on the record: "no sealing of conviction records exists absent pardon" (your honest-no citation).',
          '§ 29-3523 non-conviction removal process; pardon-then-seal pathway basics.',
        ],
      },
      KS: {
        contacts: [
          { label: 'KLS expungement clinics', email: 'kls_expunge@klsinc.org', note: 'email tonight; written reply = citable' },
          { label: 'A district clerk (Sedgwick or Johnson County)' },
          { label: 'KBI fact-sheet line' },
        ],
        ask: [
          'Docket fee — $176 (statute) or $195 (current Supreme Court order)?',
          'Specialty-court immediate petition + fee waiver practice; KBI post-grant timeline (8–12 wks?).',
          'Firearm-restoration language on the order.',
        ],
      },
      NM: {
        contacts: [
          { label: 'Second Judicial District Court self-help (Albuquerque)', note: 'via nmcourts.gov' },
          { label: 'NM DPS records' },
        ],
        ask: [
          'District court filing fee for CREA petitions; RAP-sheet-attached + filed-under-seal mechanics.',
          'Cannabis auto-expungement (§ 29-3A-8): actually running? how does someone check?',
          'The degree ladder as clerks apply it (kill the "2/4 years" oversimplification).',
        ],
      },
      ID: {
        contacts: [
          { label: 'ISP Bureau of Criminal Identification', note: 'via isp.idaho.gov/bci — the expungement application unit' },
          { label: 'Ada County District Court (Boise)' },
        ],
        ask: [
          '§ 67-3004(10) ISP request — free? turnaround?',
          'Shielding (§ 67-3004(11)): filings actually being granted? fee? form? (fresh-law reality check).',
          'Withheld-judgment dismissal flow at the clerk counter.',
        ],
      },
      NV: {
        window: 'your timezone',
        contacts: [
          { label: 'Nevada Legal Services (record-sealing manual authors)' },
          { label: 'Eighth Judicial District / LV Justice Court clerk' },
          { label: 'Records Repository, Carson City' },
        ],
        ask: [
          'All-in self-filed cost (~$150 LVJC?).',
          'Package rule in practice ("one ineligible case blocks the rest — how strictly applied?").',
          'Repository backlog after orders; general misdemeanor 1-yr tier (⚠️).',
        ],
      },
      OR: {
        window: 'your timezone',
        contacts: [
          { label: 'Multnomah County Circuit Court clerk', note: 'via courts.oregon.gov' },
          { label: 'Legal Aid Services of Oregon', phone: '1-800-351-7248', note: 'number from their published materials — confirm on site' },
          { label: 'OSP CJIS record-check unit' },
        ],
        ask: [
          'OSP fee — $33 or $80?',
          'Current county backlog honestly stated ("still up to 2 years anywhere?").',
          'The dismissed-charges drafting error: fixed or still biting? 2025 LFO amendment (expired judgments) — clerks aware?',
        ],
      },
    },
    targets: [
      'Minimum win: KY backlog + fee stack; KS fee conflict resolved; OR fee conflict resolved; NE honest-no on the record; AR zero-fee confirmed.',
      'Great session: + WV once-ever scoped; ID shielding reality; NM cannabis automation status; MS 2026 bill outcome; NV package-rule practice.',
      'Three fee-number conflicts this wave (KS $176/$195, OR $33/$80, NV ~$150) — exactly the class of error Turnleaf exists to kill.',
    ],
    standing: 'Confirm-don\'t-ask · log everything · numbers rot, office+site re-finds them · night-before emails (KLS especially).',
  },

  7: {
    subtitle: 'The final ten. One quirk: Hawaii is 3 hours BEHIND you — save it for after lunch.',
    intro: [
      'Timezone plan (Prescott = Pacific-equivalent in July):',
      '- 7:00–10:00 AM your time → NH, ME, RI, VT (Eastern +3): their 10 AM–1 PM.',
      '- 8:00–11:00 AM your time → SD, ND (Central +2, Pierre/Bismarck): their 10 AM–1 PM.',
      '- 9:00 AM–noon → MT, WY (Mountain +1).',
      '- Anytime → AK (Alaska is 1 hr behind Pacific: call late morning).',
      '- NOON–4:00 PM your time → HI (−3): their 9 AM–1 PM.',
      'Suggested split: Day 1 = NH, ME, VT, RI, ND, SD (east-first). Day 2 = MT, WY, AK + HI in the afternoon.',
    ],
    states: {
      NH: {
        window: '7–10 AM',
        contacts: [
          { label: 'Court Service Centers / a Circuit Court clerk', note: 'via courts.nh.gov' },
          { label: 'NH State Police Criminal Records Unit' },
        ],
        ask: [
          '$125 filing fee (vs the $100 some guides say) + the $100 SP fee + DOC fee amounts.',
          'Current Class B misdemeanor wait from RSA 651:5(III).',
          'The trap on record: "if someone files before the wait is up and is denied, is the 3-year re-file bar applied?"',
          'Post-2019 auto-annulment of dismissals actually firing.',
        ],
      },
      ME: {
        window: '7–10 AM',
        contacts: [
          { label: 'A Superior/District Court clerk', note: 'via courts.maine.gov' },
          { label: 'Pine Tree Legal Assistance' },
        ],
        ask: [
          'The age-cap repeal: "Can a 50-year-old seal a Class E conviction today?" (kills the stale guides on the record).',
          'CR-218 filing fee (~$5?); 4-yr prerequisite mechanics.',
          'Pre-2017 Class D/E marijuana sealing practice; LD 1871 trafficking-survivor sealing operative?',
        ],
      },
      VT: {
        window: '7–10 AM',
        headline: 'the fresh-law flagship call',
        contacts: [
          { label: 'Superior Court Criminal Division clerk (any county)', note: 'via vtcourts.gov' },
          { label: 'Vermont Legal Aid', phone: '1-800-917-7787', note: 'their published clinic line — confirm on site' },
        ],
        ask: [
          'Act 60 in practice: "Since July 1, are misdemeanor sealing petitions at 3 years being granted without hearings when the State doesn\'t object?"',
          '$90 + $30 VCIC fees; the 18–21 30-day path — real filings yet?',
          'Qualifying-felony list as clerks read it (drug trafficking really in?).',
        ],
      },
      RI: {
        window: '7–10 AM',
        contacts: [
          { label: 'District/Superior Court clerk', note: 'via courts.ri.gov' },
          { label: 'AG\'s BCI unit, Cranston', note: 'record copies, $5' },
          { label: 'RI Public Defender\'s expungement resources', note: 'ripd.org' },
        ],
        ask: [
          '$100-on-grant fee mechanics + waiver; multi-misdemeanor 10-yr path in practice.',
          'Rule 48(a) auto-sealing since Jan 2023 — reliable, or do people still need to file?',
          'Judge-discretion reality (denial rates for pro se).',
        ],
      },
      ND: {
        window: '8–11 AM',
        contacts: [
          { label: 'District court clerk (Burleigh County/Bismarck)', note: 'via ndcourts.gov' },
          { label: 'BCI record unit' },
        ],
        ask: [
          'Zero filing fee confirmed at the counter; 3-yr misd / 5-yr felony waits as applied.',
          'HB 1166: non-conviction auto-close starting Aug 1 — clerks briefed? pre-Aug-2025 petition with 10-day grant working?',
          'DUI sealing confirmed.',
        ],
      },
      SD: {
        window: '8–11 AM',
        contacts: [
          { label: 'UJS clerk (Minnehaha/Hughes County)', note: 'via ujs.sd.gov' },
          { label: 'DCI, Pierre', phone: '(605) 773-3331', note: 'from their page' },
        ],
        ask: [
          '§ 23A-3-34 automatic removal — 5 or 10 years? and is it actually automatic in the system? (the wave\'s ugliest source conflict).',
          'Expungement filing fee; Guide-and-File working.',
          'Suspended-imposition sealing on completion confirmed.',
        ],
      },
      MT: {
        window: '9 AM–noon',
        contacts: [
          { label: 'District court clerk (Yellowstone or Missoula)', note: 'via courts.mt.gov' },
          { label: 'MT DOJ CRISS', note: 'their expungement page has the mail-in mechanics' },
          { label: 'Montana Legal Services Association' },
        ],
        ask: [
          'District-court filing fee.',
          'Bundling: "one lifetime petition — can it cover misdemeanors from several counties/courts, or one district only?" (practitioner-reported inconsistency).',
          'Military no-wait branch in practice; cite check: clerks using §§ 1102–1111 or still saying 1101?',
        ],
      },
      WY: {
        window: '9 AM–noon',
        contacts: [
          { label: 'Circuit/District clerk (Laramie County/Cheyenne)', note: 'via wyocourts.gov' },
        ],
        ask: [
          '$100 misd / $300 felony fees current; non-conviction § 1401 fee + 180-day mechanics.',
          'Once-per-lifetime scope: "one 1501 petition ever — should someone bundle all eligible misdemeanors into it?"',
          'DV-misdemeanor expungement + firearms-restoration paperwork reality.',
        ],
      },
      AK: {
        window: 'late morning',
        contacts: [
          { label: 'Alaska Court System self-help', note: 'via courts.alaska.gov' },
          { label: 'DPS Criminal Records & Identification', note: 'sealing requests' },
        ],
        ask: [
          'TF-810 CourtView removal — process, 60-day rule, whole-case requirement on record.',
          '§ 12.62.180 sealing standard as DPS applies it.',
          'The 2024 marijuana non-publication provision — what does it actually do, and does anyone process requests? Confirm the honest-no plainly ("no general expungement, correct?").',
        ],
      },
      HI: {
        window: 'NOON–4 PM your time',
        contacts: [
          { label: 'HCJDC Expungement Section', phone: '(808) 587-3348', note: 'from ag.hawaii.gov — verified on their page 7/15' },
        ],
        ask: [
          '$35/$50 fees + money-order-only + 120-day timeline current.',
          'The 3-vs-4-year prostitution-deferral conflict (their PDF vs their web page).',
          'Act 003 auto-transmit: are post-Jul-2025 expungement orders reaching the Judiciary and producing Orders to Seal without applicant action? Pardoned-conviction non-eligibility confirmed.',
        ],
      },
    },
    targets: [
      'Minimum win: VT Act 60 reality + ND zero-fee + SD 5-vs-10 resolved + HI fee/timeline confirmed + AK honest-no on record.',
      'Great session: + ME age-cap kill-quote; NH early-filing trap confirmed; MT bundling answer; WY fee pair; RI auto-seal reliability.',
      'This wave completes 50/50 — the fee table, honest-no ladder, and fresh-law list are all fully sourced.',
    ],
    standing: 'Confirm-don\'t-ask · log everything · numbers rot, office+site re-finds them · HI after lunch.',
  },
};

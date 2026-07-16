import type { RecordField } from './screening';

// ============================================================================
// TURNLEAF FALLBACK RULES — CA / AZ / NY / TX
// Corrected 2026-07-14. Sources: primary statutes + state court self-help
// pages, verified via web research on 2026-07-14. This replaces the
// AI-skeleton version, which cited a repealed TX statute (Ch. 55), omitted
// NY's Clean Slate Act and AZ's 13-911 sealing entirely, applied a
// nonexistent waiting period to AZ set-asides, and carried fabricated
// verification metadata.
//
// verificationStatus is 'statute_cited' for all four states. NOTHING here
// is phone_verified. Items marked TODO(phone-verify) below are the ones to
// confirm with court clerks before flipping that flag:
//   - All fee amounts
//   - AZ petition form source (varies by county)
//   - TX form kit URL
// ============================================================================

/**
 * How far a state's rules have been checked.
 *
 * Seeding only ever writes 'draft'. 'statute_cited' and 'phone_verified' are
 * earned, one state at a time, by a person reading the statute text or calling
 * the clerk — they are never produced by a migration, a script, or a model.
 * Only draft states are withheld from screening (see db/client.ts).
 */
export type VerificationStatus = 'draft' | 'statute_cited' | 'phone_verified';

/**
 * A question the research package left open. Every ⚠️ flag in a package becomes
 * one of these — never a resolved value.
 *
 * `blocksFields` holds the dotted paths this question makes unknowable, e.g.
 * 'resources.remedies.expunction.fees'. Every path listed MUST be null while
 * the question stands, and every null MUST be listed by some question; the
 * validator enforces both directions. An empty array means the question blocks
 * no single field — it blocks a whole branch, or a sentence in a message.
 *
 * It is a LIST because dependent claims null together, and one unknown can
 * therefore strand several fields. "Fee waiver not required" only follows from
 * "the fee is $0" — so one unanswered question about a fee makes both the fee
 * and the waiver unknown, and one call answers both. Dependence is about
 * derivation, not field names: "waiver form FW-001 exists" stands on its own
 * and survives the fee being unknown.
 */
export interface OpenQuestion {
  question: string;
  blocksFields: string[];
  /**
   * Which call session closes this question. OMIT IT.
   *
   * Session N = Wave N, so the session is derived from the state's
   * sourcePackage (see sessionOf) and does not need saying twice. Set this only
   * when a question deliberately moves to a different session than its state's
   * — a field stored in two places is a field that drifts, and the prose
   * already went stale once when the sessions were renumbered.
   */
  session?: number;
}

/**
 * A statute the state's rules rest on.
 *
 * `url` and `retrievedOn` are null until someone actually opens the source and
 * records that they did. A citation we have not read is still just a citation.
 */
export interface StatuteSource {
  id: string;
  url: string | null;
  retrievedOn: string | null;
}

/**
 * A date that changes what the law does: when an act took effect, when an
 * automatic program actually began running, or a deadline the state is under.
 *
 * `date` carries EXACTLY the precision the package gives — 'YYYY', 'YYYY-MM',
 * or 'YYYY-MM-DD'. A package that says a provision was "added 2021" supports
 * '2021' and nothing finer; padding it to '2021-01-01' to satisfy a date type
 * invents a day the source never claimed. Consumers must render what is here
 * ("2021"), never expand it. Lexicographic sort still orders these correctly.
 * The validator enforces the format.
 */
export type PartialDate = string;

export interface KeyDate {
  label: string;
  date: PartialDate;
  kind: 'effective' | 'operative' | 'deadline';
  note: string | null;
}

/**
 * A waiting period, as the statute states it.
 *
 * `amount` is null when the package does not give a period, or gives conflicting
 * ones. A null period cannot be computed against, so it has no pass/fail branch
 * — see Validation. `anchor` records what the clock runs from, which differs by
 * state and is not recoverable from the number alone: two states can both say
 * "2 years" and mean different dates.
 */
export interface WaitingPeriod {
  amount: number | null;
  unit: 'days' | 'months' | 'years';
  anchor: string;
}

/**
 * A date node's rule.
 *
 * Split so that a null period CANNOT carry a pass/fail branch: if we do not
 * know the period, there is no answer to compute, and the only honest move is
 * to route to a result that says so. The type makes the alternative unwritable.
 */
export type Validation =
  | { period: WaitingPeriod & { amount: number }; nextPass: string; nextFail: string }
  | { period: WaitingPeriod & { amount: null }; nextUnknown: string };

export interface RuleNode {
  type: 'choice' | 'boolean' | 'date' | 'checkpoint';
  /** The question, as a person reads it. This IS the UI — the wizard renders
   *  it. There is no second copy of these questions in a form. */
  text: string;
  /**
   * Read the answer from this record field instead of asking.
   *
   * Set it only when the screening form already collects the answer. Every
   * option value must then be a value that field can hold (FIELD_DOMAINS) —
   * the validator rejects the rest, because an option the form can never emit
   * is an unreachable branch.
   *
   * Omit it and the node is ASKED: the tree names its own answers, so a state
   * can turn on class 2/3 felonies or indictable offences without the form
   * growing a field per state.
   */
  field?: RecordField;
  options?: Array<{ label: string; value: string; next: string }>;
  yes?: string;
  no?: string;
  validation?: Validation;
}

export interface RuleResult {
  status: 'eligible' | 'waiting' | 'ineligible' | 'complex';
  title: string;
  message: string;
  remedy: string;
  citation: string;
}

export interface StateRuleConfig {
  code: string;
  name: string;
  lastReviewed: string;
  verificationStatus: VerificationStatus;
  /** The research package this state's rules come from. Rules data may come
   *  from nowhere else — not from a model's knowledge of state law. */
  sourcePackage: string;
  /** What this state calls its remedies, and what it does NOT have. Load-bearing:
   *  California has no expungement, Texas destroys vs seals, New York only seals. */
  terminology: string;
  keyDates: KeyDate[];
  openQuestions: OpenQuestion[];
  sources: StatuteSource[];
  rules: {
    startNode: string;
    nodes: Record<string, RuleNode>;
    results: Record<string, RuleResult>;
  };
  resources: {
    /** null on any field means UNKNOWN — never zero, never "typical", never a
     *  guess. A null must be backed by an OpenQuestion naming its path. */
    remedies: Record<string, {
      name: string;
      formName: string | null;
      formUrl: string | null;
      steps: string[];
      fees: string | null;
      feeWaiver: string | null;
      courtContact: string | null;
    }>;
    legalAid: Array<{ name: string; url: string }>;
  };
}

/**
 * Which call session a state belongs to. Session N = Wave N — the research
 * package IS the session, so the number is read off `sourcePackage` rather than
 * stored a second time. Returns null if the package name carries no wave.
 */
export function sessionOf(config: StateRuleConfig): number | null {
  const match = /Wave(\d+)/i.exec(config.sourcePackage);
  return match ? Number(match[1]) : null;
}

/** Which session closes this question — its own, or its state's by default. */
export function sessionOfQuestion(config: StateRuleConfig, q: OpenQuestion): number | null {
  return q.session ?? sessionOf(config);
}

export const fallbackRules: Record<string, StateRuleConfig> = {
  // ==========================================================================
  // CALIFORNIA
  // Key 2026 landscape: petition-based dismissal (PC 1203.4 / 1203.4a /
  // 1203.41), arrest record sealing (PC 851.87 / 851.91), PLUS automatic
  // record relief run monthly by CA DOJ (PC 851.93 / 1203.425, fully
  // operative Oct 1, 2024 after SB 731 / AB 1076 / AB 168). SB 731 also
  // opened PC 1203.41 relief to many state-prison felonies.
  // ==========================================================================
  CA: {
    code: 'CA',
    name: 'California',
    lastReviewed: '2026-07-15',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology:
      'California has no true expungement. The petition remedy is a DISMISSAL / SET-ASIDE under PC § 1203.4 (probation cases), § 1203.4a (misdemeanours and infractions where probation was not granted), and §§ 1203.41/.42 (felony and realignment cases) — colloquially called "expungement", but it does not erase anything. Separately, California runs the largest AUTOMATIC relief system in the country: PC § 851.93 (arrests) and § 1203.425 (convictions), under which the Department of Justice reviews statewide databases monthly and grants relief with no petition at all. Since August 2022, courts are barred from disclosing set-asides, which makes them function as sealing. Because the automatic layer is running, the honest first question is not "can I petition" but "is my record already clear" — check first, petition second.',
    keyDates: [
      {
        label: 'Automatic record relief fully operative (PC § 1203.425)',
        date: '2024-10-01',
        kind: 'operative',
        note: 'AB 1076 (2019) as expanded by SB 731, after two delays: AB 134 pushed it to Jul 2024, AB 168 to Oct 2024. This final date is the one that governs.',
      },
      {
        label: 'Courts barred from disclosing set-asides',
        date: '2022-08',
        kind: 'effective',
        note: 'Wave 0 gives month and year only ("since Aug 2022"). Applies to all set-asides, past and future — this is what makes them function as sealing.',
      },
    ],
    openQuestions: [
      {
        question:
          'Is there any filing fee for the PC § 1203.4 dismissal petition (Form CR-180)? Recent sources say none statewide following the AB 1076-era fee elimination, but older county fee schedules show roughly $120-150. Wave 0 calls this "a perfect confirm-kill call" — ask an LA Superior Court clerk.',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Is arrest sealing under PC § 851.91 / § 851.87 genuinely free, and if there is a fee, is a waiver available? The encoded rules asserted "$0, no filing fee under state law", but Wave 0 does not address arrest sealing fees at all and no source is recorded for the claim.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'What are the exact felony tiers for automatic relief under the current PC § 1203.425(b)? Wave 0 gives "generally 4 yrs post-sentence for non-serious/non-violent" but flags the tiers as unverified. The 4-year figure has been removed from user-facing messages until this is confirmed.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the PC § 1203.41 waiting period for felony/realignment cases. Wave 0 gives "2 yrs post-completion" but flags it. The figure has been removed from the complex_prison message until confirmed.',
        blocksFields: [],
      },
      {
        question:
          'What are the sub-criteria for automatic misdemeanour relief at 1 year after judgment under PC § 1203.425? Wave 0 gives the 1-year period but flags the sub-criteria as unverified.',
        blocksFields: [],
      },
      {
        question:
          'Verify adjacent-remedy statute references: PC § 4852.01 (Certificate of Rehabilitation), PC § 17(b) (felony reduction), PC § 1203.3 (early termination of probation), and PC § 290.5 (ending registration). These are cited in user-facing messages but appear nowhere in Wave 0 — they entered the rules from outside the research package.',
        blocksFields: [],
      },
      {
        question:
          'The automatic relief layer (PC §§ 851.93, 1203.425) is not encoded as a branch — it exists only as prose inside petition results. The "check your record first" posture Wave 0 calls for has no structural representation.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Cal. Penal Code § 1203.4 (dismissal after probation)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 1203.4a (dismissal, probation not granted)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 1203.41 (felony/realignment dismissal)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 1203.42 (felony/realignment dismissal)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 1203.425 (automatic conviction relief)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 851.93 (automatic arrest relief)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 851.91 (arrest sealing petition)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 851.87 (sealing after completed diversion)', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 290 (sex offender registration; exclusion)', url: null, retrievedOn: null },
      { id: 'AB 1076 (2019); SB 731; AB 134; AB 168 (automatic relief and its delays)', url: null, retrievedOn: null },
      // Cited in messages but NOT present in Wave 0 — recorded here so they are
      // visible and verifiable rather than silently trusted. See open questions.
      { id: 'Cal. Penal Code § 4852.01 (Certificate of Rehabilitation) — NOT IN WAVE 0', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 17(b) (felony reduction) — NOT IN WAVE 0', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 1203.3 (early termination of probation) — NOT IN WAVE 0', url: null, retrievedOn: null },
      { id: 'Cal. Penal Code § 290.5 (ending registration) — NOT IN WAVE 0', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'sex_registration' },
            { label: 'Dismissed / Acquitted / Diversion Completed / Never Charged', value: 'dismissed', next: 'eligible_dismissed' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        sex_registration: {
          type: 'boolean',
          text: 'Does the conviction require you to register as a sex offender under Penal Code § 290?',
          yes: 'complex_registrant',
          no: 'prison_sentence'
        },
        prison_sentence: {
          type: 'boolean',
          field: 'prison_sentenced',
          text: 'Did your sentence include time in a California state prison (as opposed to county jail or probation)?',
          yes: 'complex_prison',
          no: 'probation_status'
        },
        probation_status: {
          type: 'choice',
          field: 'probation_status',
          text: 'What is your current probation status?',
          options: [
            { label: 'Successfully completed probation', value: 'completed', next: 'auto_relief_check_ca' },
            { label: 'Did not complete probation successfully', value: 'failed', next: 'complex_probation' },
            { label: 'Currently still on probation or supervision', value: 'active', next: 'ineligible_active_probation' },
            { label: 'No probation was sentenced', value: 'none', next: 'judgment_date' }
          ]
        },
        // CHECK-RECORD-FIRST (Wave 0 cross-package flag 2).
        //
        // California's DOJ grants relief automatically every month under PC
        // § 1203.425 — no petition, nobody asked. The honest first question is
        // therefore not "can you petition" but "are you already clear". Wave 0
        // asks for this posture explicitly and the tree did not have it: a
        // misdemeanant whose relief had probably already landed was told to go
        // and file a petition, with the automation mentioned afterwards under
        // "Also note". Found by running Wave 0's own CA persona 1.
        //
        // Misdemeanours get the 1-year automatic period (§ 1203.425). Felonies
        // do NOT route here: Wave 0 flags the felony tiers as unverified, so we
        // will not tell a felony conviction it is probably already clear.
        auto_relief_check_ca: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'auto_relief_date_ca' },
            { label: 'Infraction', value: 'infraction', next: 'auto_relief_date_ca' },
            { label: 'Felony', value: 'felony', next: 'eligible_expungement' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'eligible_expungement' }
          ]
        },
        auto_relief_date_ca: {
          type: 'date',
          // Reads the record: California's clock runs from judgment, which IS
          // the date the form collects. Contrast AZ/NY/TX, whose clocks run
          // from other events and therefore ask.
          field: 'disposition_date',
          text: 'When was judgment pronounced (your sentencing date)?',
          validation: {
            period: {
              amount: 1,
              unit: 'years',
              anchor: 'judgment pronounced (PC § 1203.425 automatic relief for misdemeanours)'
            },
            nextPass: 'check_record_first_ca',
            nextFail: 'eligible_expungement'
          }
        },
        // PC 1203.4a: the 1-year wait applies ONLY when probation was NOT
        // granted. If probation was completed, PC 1203.4 relief is available
        // upon completion with no additional waiting period.
        judgment_date: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was judgment pronounced (your sentencing date)?',
          validation: {
            period: {
              amount: 1,
              unit: 'years',
              anchor: 'judgment pronounced (PC § 1203.4a — applies only where probation was not granted)'
            },
            nextPass: 'eligible_expungement_no_probation',
            nextFail: 'waiting_period_ca'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Eligibility in California turns entirely on how the case ended: a dismissal, an acquittal, a completed diversion, and a conviction each follow a different statute and a different path. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request a record review from the California Department of Justice (about $25) to get your official criminal history, or ask the clerk of the court that heard the case for a certified copy of the disposition. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (CA DOJ Record Review)',
          citation: 'California Penal Code §§ 1203.4, 851.91 (which path applies depends on the disposition)'
        },
        // CHECK-RECORD-FIRST. The automatic system ran; lead with that.
        check_record_first_ca: {
          status: 'eligible',
          title: 'Your Record May Already Be Clear — Check Before You File',
          message: 'Start here, not with a petition. California\'s Department of Justice reviews state records every month and grants relief automatically under Penal Code § 1203.425 — no petition, no fee, and nobody tells you it happened. Misdemeanors generally qualify one year after judgment, and yours is past that, so there is a real chance this is already done. Find out before you spend anything: request a record review from the CA DOJ (a fingerprint-based review costs about $25), or ask the court that handled your case what your record shows now. If the automatic system did reach you, you are finished. If it missed you, or if you want the extra benefits a petition can add — such as a felony reduction under PC § 17(b) — the dismissal petition under PC § 1203.4 is still there, and completing probation makes it available as of right. We are still verifying which felonies the automatic program reaches and after how long.',
          remedy: 'Check Your Record First (CA DOJ Record Review) — then PC 1203.4 if needed',
          citation: 'California Penal Code §§ 1203.425, 1203.4'
        },
        eligible_dismissed: {
          status: 'eligible',
          title: 'Your Arrest Record May Already Be Cleared — Check First',
          // CHECK-RECORD-FIRST: § 851.93 automation leads, the § 851.91
          // petition follows. Wave 0's CA persona 5 asks for exactly this
          // order and the result used to lead with the petition instead.
          message: 'Start by checking, not by filing. Arrests that did not lead to a conviction are cleared automatically by the California Department of Justice under Penal Code § 851.93 — the DOJ reviews state databases monthly, grants the relief itself, and does not notify you. So the work may already be done. Request a record review from the CA DOJ (a fingerprint-based review costs about $25) to see where you stand. If the automatic system missed your arrest, you can petition to seal it under Penal Code § 851.91 — sealing is available as a matter of right in many cases where charges were dismissed, you were acquitted, or you were never charged — or under § 851.87 if you completed diversion.',
          remedy: 'Check Your Record First (PC 851.93) — then Arrest Sealing (PC 851.91 / 851.87)',
          citation: 'California Penal Code §§ 851.93, 851.91, 851.87'
        },
        eligible_expungement: {
          status: 'eligible',
          title: 'Potential Dismissal Eligible',
          // The "4 years after sentence completion" figure is removed: Wave 0
          // flags the § 1203.425(b) felony tiers as unverified. See open
          // questions. The 1-year misdemeanour period is stated unflagged in
          // Wave 0 and stays; only its sub-criteria are in question.
          message: 'You appear potentially eligible for a dismissal of conviction under Penal Code § 1203.4, available upon successful completion of probation. Also note: under the state\'s automatic record relief program (PC § 1203.425), many misdemeanors (1 year after judgment) and some non-serious, non-violent felonies are dismissed automatically by the DOJ — your conviction may already have relief, so it is worth checking your record before you file anything. We are still verifying which felonies qualify and after how long. Filing the petition can still add benefits, such as felony reduction under PC § 17(b).',
          remedy: 'Petition for Dismissal (PC 1203.4)',
          citation: 'California Penal Code §§ 1203.4, 1203.425'
        },
        eligible_expungement_no_probation: {
          status: 'eligible',
          title: 'Potential Dismissal Eligible',
          message: 'Since probation was not granted and at least one year has passed since judgment, you appear potentially eligible for dismissal under Penal Code § 1203.4a (misdemeanors/infractions without probation). Your conviction may also already have automatic relief under PC § 1203.425.',
          remedy: 'Petition for Dismissal (PC 1203.4a)',
          citation: 'California Penal Code §§ 1203.4a, 1203.425'
        },
        waiting_period_ca: {
          status: 'waiting',
          title: 'Waiting Period Not Met',
          message: 'When probation was not granted, California requires at least 1 year from the date judgment was pronounced before filing for dismissal under PC § 1203.4a. Misdemeanors also become eligible for automatic DOJ relief 1 year after judgment under PC § 1203.425.',
          remedy: 'Petition for Dismissal (PC 1203.4a)',
          citation: 'California Penal Code §§ 1203.4a, 1203.425'
        },
        complex_prison: {
          status: 'complex',
          title: 'State Prison Sentence — Relief May Still Be Available',
          // Both waiting periods removed: Wave 0 flags the § 1203.41 period
          // ("2 yrs post-completion") and the § 1203.425 felony tiers ("4 yrs")
          // as unverified. Neither number is asserted here. See open questions.
          message: 'State prison sentences are not eligible under PC § 1203.4, but SB 731 opened PC § 1203.41 to many felonies even where state prison time was served — the court may grant a discretionary dismissal after a waiting period, if no sex-offender registration is required. We are still verifying how long that period runs, so we are not going to put a number on it here; a legal aid attorney or the sentencing court can tell you. Automatic relief under PC § 1203.425 may also reach some non-serious, non-violent felonies. A Certificate of Rehabilitation (PC § 4852.01) is another path. This area is fact-specific — please consult legal aid.',
          remedy: 'Discretionary Dismissal (PC 1203.41) / Certificate of Rehabilitation',
          citation: 'California Penal Code §§ 1203.41, 1203.425, 4852.01'
        },
        complex_probation: {
          status: 'complex',
          title: 'Discretionary Dismissal',
          message: 'If you did not successfully complete probation, dismissal under PC § 1203.4 is not automatic, but the court has discretion to grant it "in the interests of justice." You will need to show rehabilitation.',
          remedy: 'Discretionary Dismissal (PC 1203.4)',
          citation: 'California Penal Code § 1203.4(a)(1)'
        },
        complex_registrant: {
          status: 'complex',
          title: 'Sex Offender Registration',
          message: 'Convictions requiring registration under PC § 290 are excluded from most standard record relief, including PC § 1203.41 relief and automatic relief under § 1203.425. Separate processes (such as petitioning to end the registration requirement under PC § 290.5) may exist depending on the tier and offense. Please consult a legal aid organization or attorney.',
          remedy: 'Consult Legal Aid (Registration-Related Relief)',
          citation: 'California Penal Code §§ 290, 290.5'
        },
        ineligible_active_probation: {
          status: 'ineligible',
          title: 'Currently on Probation or Supervision',
          message: 'You cannot obtain dismissal of a conviction while on active probation or supervision. Once probation ends — or if the court grants early termination under PC § 1203.3 — you can apply.',
          remedy: 'None Yet (Active Probation)',
          citation: 'California Penal Code §§ 1203.4, 1203.3'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Petition for Dismissal (PC 1203.4 / 1203.4a / 1203.41)',
          formName: 'Form CR-180 (Petition) & Form CR-181 (Order)',
          formUrl: 'https://selfhelp.courts.ca.gov/jcc-form/CR-180',
          steps: [
            'Consider requesting your RAP sheet from the CA DOJ first — your conviction may already show automatic relief under PC 1203.425, which can make the petition unnecessary.',
            'Fill out forms CR-180 and CR-181.',
            'File the forms with the clerk of the court where you were convicted.',
            'Serve a copy of the petition on the District Attorney (and probation department where required) at least 15 days before the hearing.',
            'Attend the court hearing if required by the judge.'
          ],
          // null: Wave 0 flags this fee. Recent sources say none statewide;
          // older county schedules charged ~$120-150. Blocked by an open
          // question — a confirm-kill call to an LA clerk settles it.
          fees: null,
          // NOT nulled: this does not derive from the fee being $0 — it is the
          // opposite claim (that a waiver exists if a fee does), so it survives
          // the fee being unknown.
          feeWaiver: 'Available using Form FW-001 (Request to Waive Court Fees).',
          courtContact: 'County Superior Court Clerk'
        },
        sealing: {
          name: 'Arrest Record Sealing (PC 851.91 / 851.87)',
          formName: 'Form CR-409 (Petition to Seal Arrest and Related Records)',
          formUrl: 'https://selfhelp.courts.ca.gov/jcc-form/CR-409',
          steps: [
            'Check whether the arrest was already cleared automatically by the DOJ under PC 851.93.',
            'Complete Form CR-409 (and proposed order CR-410).',
            'File the petition with the court in the county where the arrest occurred.',
            'Serve the law enforcement agency that arrested you and the District Attorney.'
          ],
          // null: "$0 under state law" is an affirmative claim about California
          // law that Wave 0 never makes — it does not address arrest sealing
          // fees at all. Blocked by an open question.
          fees: null,
          // Dependent claim: "not required" followed from the $0. Nulls with it.
          feeWaiver: null,
          courtContact: 'County Superior Court Clerk'
        }
      },
      legalAid: [
        { name: 'LawHelpCA', url: 'https://www.lawhelpca.org' },
        { name: 'Root & Rebound', url: 'https://www.rootandrebound.org' }
      ]
    }
  },

  // ==========================================================================
  // ARIZONA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave0_Draft_Package.md
  //
  // Three distinct remedies. Two are encoded as branches; the third is not:
  //   1. Set-aside (ARS § 13-905) — no waiting period after absolute
  //      discharge; conviction stays public but is annotated. Comes with a
  //      Certificate of Second Chance in many cases.
  //   2. Record sealing (ARS § 13-911, effective Jan 1, 2023) — hides the
  //      record from public view. Class-based waiting periods running from
  //      absolute discharge (which requires restitution paid in full):
  //      Class 2/3 felony: 10 yrs · Class 4/5/6 felony: 5 yrs ·
  //      Class 1 misdemeanor: 3 yrs · Class 2/3 misdemeanor: 2 yrs.
  //      Wave 0 flags this ladder "encode from statute text" — the numbers
  //      stand (they are not in conflict) but an open question stands too.
  //      The prior-felony bump has no representation here at all.
  //   3. Marijuana expungement (ARS § 36-2862) — NOT ENCODED. Prop 207
  //      offenses, free, no waiting period, mandatory grant if in scope. It
  //      appears in one message and nowhere else; it needs its own branch.
  //
  // Arizona has NO automatic relief. Every remedy is a petition. Users who
  // have heard "clean slate" news from other states assume otherwise, so the
  // copy has to say it plainly.
  // ==========================================================================
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    // Statute-verified by Diana against azleg.gov on 2026-07-15: §§ 13-905,
    // 13-911 and 36-2862 read in full. See sources[].retrievedOn — that field
    // records WHICH statutes were read, which is more than one state-level date
    // can say. NOT phone_verified: the sealing court filing fee, the DPS
    // investigation fee amount, the forms and the processing times are all
    // still counter questions.
    lastReviewed: '2026-07-15',
    verificationStatus: 'statute_cited',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology:
      'Arizona has three separate remedies and the difference between them matters. A SET ASIDE (ARS § 13-905) vacates the judgment of guilt and releases you from most penalties, but the conviction stays on the public record with a "set aside" notation — it is not an expungement and does not hide anything. SEALING (ARS § 13-911, in effect since Jan 1, 2023) is the stronger remedy: it hides the case records from public view, and you may deny the record in most contexts. Only marijuana relief under ARS § 36-2862 (Prop 207) is a true EXPUNGEMENT. Arizona has no automatic relief of any kind — every remedy requires a petition, and nothing arrives on its own.',
    keyDates: [
      {
        label: 'ARS § 13-911 record sealing available',
        date: '2023-01-01',
        kind: 'effective',
        note: 'The sealing remedy did not exist before this date.',
      },
      {
        label: 'Certificate of Second Chance added to § 13-905',
        // Year only — that is the precision Wave 0 gives ("added 2021").
        // Padding to 2021-01-01 would invent a day the package never claimed.
        date: '2021',
        kind: 'effective',
        note: 'Wave 0 gives the year only. The exact effective date is an open question.',
      },
    ],
    openQuestions: [
      {
        // NARROWED 7/16. The statute check answered the shape and left the
        // amounts. § 13-911(H) confirms a DPS investigation fee EXISTS but sets
        // its amount by the DPS director, not in statute. The WAIVER rule is
        // answered, so feeWaiver is filled and drops out of blocksFields.
        question:
          'Two amounts for the § 13-911 sealing petition. (a) What does the DPS investigation fee cost? § 13-911(H) confirms it exists but leaves the amount to the DPS director, so it is not in the statute — only DPS or a clerk can say. (b) Is there a court filing fee on top, and how much? § 13-911 does not mention one, which is not the same as there being none. The waiver rule is already answered by § 13-911(H).',
        blocksFields: ['resources.remedies.sealing.fees'],
      },
      {
        question:
          'Is a DUI misdemeanor eligible for a set-aside, and is it excluded from § 13-911 sealing? DUI does not appear among the § 13-911(O) items recorded on 7/15 — but that list was given as "including", not as exhaustive, so its absence is not an answer. The tree still hedges DUI rather than infer from a partial list.',
        blocksFields: [],
      },
      {
        // RESOLVED 7/16 by the statute check: the lists are NOT identical, and
        // the tree now has two gates. What is left is which side of the line a
        // particular offence falls on, which is a case-file question.
        question:
          'For a specific case, which exclusion list does the offense actually fall on? § 13-905(P) (set-aside) covers dangerous, registrable, sexual-motivation and victim-under-15 offenses. § 13-911(O) (sealing) adds serious/violent/aggravated offenses under § 13-706, dangerous crimes against children, sex trafficking, deadly-weapon or serious-injury elements, and the chapter 14/35.1 felony classes. The tree asks a person to self-assess both. Whether an offense was found "dangerous", or carried a sexual-motivation finding, is a legal finding in the case file — worth asking a clerk how someone reads that off their own paperwork.',
        blocksFields: [],
      },
      {
        // SOFTENED 7/16: the statute half is answered. § 13-911(A)(2)-(3) sets
        // no waiting period, so the tree says so. What a counter does with a
        // same-week dismissal is a different question, and it is the one left.
        question:
          'Statute confirmed: § 13-911(A)(2)-(3) sets NO waiting period for dismissed, acquitted or never-charged cases, and the tree now tells people they can file now. What remains is clerk practice — will a counter accept a petition on a case dismissed last week, and does the § 13-911(H) fee waiver get applied without a fight?',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions treated for sealing? Not covered in Wave 0 — add to call sheet. The tree hedges these rather than guess (see unknown_deferred).',
        blocksFields: [],
      },
      {
        // This question went STALE and I did not notice: it still said "not
        // encoded as a branch" after I had encoded the branch. A question
        // describing a gap that no longer exists is worse than no question — it
        // sends a call after an answer nobody needs.
        question:
          'Marijuana expungement (ARS § 36-2862) is encoded as its own branch and asked before the set-aside/sealing ladder. Statute checked 7/15. What is left is practice, not law: which form does the court want, how long does a § 36-2862 petition take, and does the "no fee" hold at the counter?',
        blocksFields: [],
      },
      {
        question:
          'What is the exact effective date of the Certificate of Second Chance addition to ARS § 13-905? Wave 0 gives only the year (2021), so it is recorded in no keyDate rather than guessed at.',
        blocksFields: [],
      },
      {
        // Blocks no field, but it is not call-craft: "Arizona has no automatic
        // relief of any kind" is asserted flatly in this state's terminology
        // and in UI copy. An asserted claim is a verifiable claim, whether or
        // not a field holds it — a sentence can be as wrong as a number.
        question:
          'Confirm plainly: there is no automatic record-clearing in Arizona — every remedy is petition-based, correct? Wave 0 says so and the app states it as fact in its terminology and its user-facing copy, so it needs the same confirmation any other asserted claim gets. Users arrive expecting "clean slate" automation because other states have it.',
        blocksFields: [],
      },
    ],
    // Three of these were READ, by a person, on 2026-07-15 — the first sources
    // in the project with a retrievedOn. That date is what separates a citation
    // we are relying on from one we merely wrote down.
    //
    // url stays null deliberately: the source given was "azleg.gov". The
    // canonical deep link is constructible, but constructing it means writing a
    // URL nobody actually opened, which is the same species as padding "2021"
    // into "2021-01-01". If the deep links were used, paste them and they go in.
    sources: [
      { id: 'Ariz. Rev. Stat. § 13-905 (set aside; Certificate of Second Chance; § 13-905(B) no filing fee; (K),(L) CSC timing; (O) firearms; (P) exclusions)', url: null, retrievedOn: '2026-07-15' },
      { id: 'Ariz. Rev. Stat. § 13-911 (record sealing; (A)(2)-(3) non-convictions; (D) 60-day rule; (E) clock; (F) prior-felony +5; (G) payment at filing; (H) DPS fee and waiver; (L) 3-year denial bar; (O) exclusions)', url: null, retrievedOn: '2026-07-15' },
      { id: 'Ariz. Rev. Stat. § 36-2862 (Prop 207 marijuana expungement)', url: null, retrievedOn: '2026-07-15' },
      { id: 'Ariz. Rev. Stat. § 13-3821 (registrable offenses; § 13-905 exclusion)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-705 (dangerous crimes against children; § 13-911(O) exclusion)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-706 (serious offenses; firearms exception at § 13-905(O))', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-1307 (sex trafficking; § 13-911(O) exclusion)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_setaside_az' },
            { label: 'Dismissed / Acquitted / Arrested but never charged', value: 'dismissed', next: 'eligible_seal_dismissed_az' },
            // Explicit, so a deferral does NOT widen into the 'dismissed'
            // option. This label names no diversion track, and Wave 0
            // researches none for AZ — see unknown_deferred.
            { label: 'Deferred adjudication / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // SPLIT 7/16. These were ONE question applying one answer to both
        // remedies, and the lists are not the same list:
        //
        //   § 13-905(P) — SET-ASIDE exclusions: dangerous, registrable,
        //     sexual-motivation, victim under 15.
        //   § 13-911(O) — SEALING exclusions: all of the above PLUS serious /
        //     violent / aggravated offences (§ 13-706), dangerous crimes against
        //     children (§ 13-705), sex trafficking (§ 13-1307), deadly-weapon or
        //     serious-injury elements, and the chapter 14 / 35.1 felony classes.
        //
        // So § 13-911(O) is the wider list, and a person can be SEALING-excluded
        // while remaining SET-ASIDE eligible. The merged question denied both to
        // that person — it took away a remedy the statute gives them. Two gates
        // now, each citing its own subsection, with a result for the gap.
        excluded_setaside_az: {
          type: 'boolean',
          text: 'Was the offense a dangerous offense (one involving a deadly weapon, a dangerous instrument, or serious physical injury), an offense requiring sex offender registration, an offense with a sexual motivation finding, or a crime against a victim under 15?',
          yes: 'ineligible_serious',
          no: 'marijuana_offense'
        },
        // Prop 207 relief is asked BEFORE the set-aside/sealing ladder, because
        // it is strictly better than both: a true expungement, free, no waiting
        // period, and a mandatory grant if the conduct is in scope. Wave 0
        // documents it as one of Arizona's three tracks; it was encoded as a
        // sentence in one message and nowhere else, so a person entitled to it
        // was routed to the slower, weaker remedy instead. Found by running
        // Wave 0's own AZ persona 2.
        marijuana_offense: {
          type: 'boolean',
          text: 'Was this offense for marijuana conduct that Proposition 207 made legal — possessing, consuming, or transporting 2.5 ounces or less, marijuana paraphernalia, or cultivating six plants or fewer at your primary residence?',
          yes: 'eligible_marijuana_az',
          no: 'dui_offense'
        },
        // Wave 0 leaves DUI unresolved: set-aside looks available, but whether
        // § 13-911 sealing is excluded for DUI is flagged "resolve from the
        // statute text". The tree used to treat a DUI as any other class 1
        // misdemeanour and offer BOTH remedies — asserting the very thing the
        // package says is unknown. It asks instead, and hedges.
        dui_offense: {
          type: 'boolean',
          text: 'Was this a DUI or impaired-driving offense?',
          yes: 'complex_dui_az',
          no: 'sentence_completed'
        },
        // CORRECTED 7/16 against § 13-911(E) and (G) (Diana, azleg.gov, 7/15).
        //
        // The old question asked whether the sentence was complete "including
        // payment of all fines, fees, and victim restitution", and the old
        // anchor ran the clock from that. Both were wrong. § 13-911(E) runs the
        // clock from completion of the NONMONETARY conditions plus discharge.
        // § 13-911(G) makes payment a condition of FILING, not of the clock.
        //
        // So an unpaid balance never delayed anyone's clock — the encoding just
        // said it did, and told people to wait who did not have to. Wrong in the
        // safe direction, and still wrong.
        sentence_completed: {
          type: 'boolean',
          text: 'Have you finished the NON-MONEY parts of your sentence and been discharged — probation, parole, any jail or prison time, classes, community service? (Money you still owe does not matter for this question. Unpaid fines, fees and restitution do NOT delay your waiting period; they only have to be paid by the time you file.)',
          yes: 'excluded_sealing_az',
          no: 'ineligible_not_discharged_az'
        },
        // The SECOND gate — § 13-911(O)'s additions over § 13-905(P). A "yes"
        // here does not end the screening: the set-aside survives it.
        excluded_sealing_az: {
          type: 'boolean',
          text: 'Was the offense any of these: a serious, violent or aggravated offense (ARS § 13-706); a dangerous crime against children (ARS § 13-705); sex trafficking (ARS § 13-1307); an offense with a deadly weapon or serious physical injury as an element; or a class 2, 3, 4 or 5 felony under chapter 14 (sexual offenses) or chapter 35.1 (sexual exploitation of children)?',
          yes: 'eligible_setaside_only_az',
          no: 'prior_felony_az'
        },
        // CONFIRMED 7/16: § 13-911(F) adds FIVE YEARS to each period where the
        // person has a prior felony conviction. This was an open question and is
        // now encoded — it was the item on the data that Diana's own call sheet
        // did not have.
        prior_felony_az: {
          type: 'boolean',
          text: 'Apart from this case, do you have any prior felony conviction?',
          yes: 'offense_level_bumped',
          no: 'offense_level'
        },
        offense_level: {
          type: 'choice',
          text: 'What was the level and class of the offense? (It appears on your sentencing paperwork or your DPS criminal history report.)',
          options: [
            { label: 'Class 2 or 3 Felony', value: 'felony_high', next: 'discharge_date_f23' },
            { label: 'Class 4, 5, or 6 Felony', value: 'felony_low', next: 'discharge_date_f456' },
            { label: 'Class 1 Misdemeanor', value: 'misd_1', next: 'discharge_date_m1' },
            { label: 'Class 2 or 3 Misdemeanor', value: 'misd_23', next: 'discharge_date_m23' }
          ]
        },
        // The same ladder, +5 years throughout — § 13-911(F).
        offense_level_bumped: {
          type: 'choice',
          text: 'What was the level and class of the offense? (It appears on your sentencing paperwork or your DPS criminal history report.)',
          options: [
            { label: 'Class 2 or 3 Felony', value: 'felony_high', next: 'discharge_date_f23_bumped' },
            { label: 'Class 4, 5, or 6 Felony', value: 'felony_low', next: 'discharge_date_f456_bumped' },
            { label: 'Class 1 Misdemeanor', value: 'misd_1', next: 'discharge_date_m1_bumped' },
            { label: 'Class 2 or 3 Misdemeanor', value: 'misd_23', next: 'discharge_date_m23_bumped' }
          ]
        },
        // The § 13-911 ladder. Wave 0 gives these numbers but flags them
        // "encode from statute text" — an open question stands on all four.
        // The anchor is the whole point: the clock runs from absolute
        // discharge, which does not arrive until restitution is paid in full.
        discharge_date_f23: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_f456: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m1: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m23: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        }
,
        discharge_date_f23_bumped: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 15, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock — plus five years for a prior felony conviction (§ 13-911(F))' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_f456_bumped: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock — plus five years for a prior felony conviction (§ 13-911(F))' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m1_bumped: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 8, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock — plus five years for a prior felony conviction (§ 13-911(F))' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m23_bumped: {
          type: 'date',
          text: 'When did you finish the non-money parts of your sentence and get discharged? (Probation, parole, jail or prison time, classes, community service — whichever came last. Do not count money still owed: that has to be paid before you file, but it does not change this date.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'completion of the NON-MONETARY conditions of sentence plus discharge (ARS § 13-911(E)); money owed is a condition of FILING under § 13-911(G), not of the clock — plus five years for a prior felony conviction (§ 13-911(F))' },
            nextPass: 'monetary_check_az',
            nextFail: 'waiting_seal_az'
          }
        },
        // § 13-911(G): money owed must be paid AT FILING. It is not a clock
        // gate and never was — it decides whether they file today or after
        // they have paid, which is a different sentence to write.
        monetary_check_az: {
          type: 'boolean',
          field: 'restitution_paid',
          text: 'Have you paid all fines, fees and restitution in full?',
          yes: 'eligible_both_az',
          no: 'eligible_pay_then_file_az'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Arizona\'s three remedies split on how the case ended: a dismissal or acquittal can be sealed under ARS § 13-911, while a conviction runs through a set-aside (ARS § 13-905), sealing, or both. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your criminal history report from the Arizona Department of Public Safety, or ask the clerk of the court that handled the case for a certified copy of the disposition. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (AZ DPS Criminal History Report)',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911 (which path applies depends on the disposition)'
        },
        // OPEN QUESTION (carry into openQuestions on the schema migration):
        // "How are completed deferrals/diversions treated for sealing?
        //  ⚠️ not covered in Wave 0 — add to call sheet."
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Arizona\'s set-aside (ARS § 13-905) and sealing (ARS § 13-911) paths are screened here for convictions, dismissals, and acquittals. How a completed deferral or diversion is treated is not something this screening has researched yet, and we would rather tell you that than guess — a guess here could point you at the wrong remedy, or tell you that you have none when you do. The legal aid organizations listed below can confirm how your case was actually disposed and which remedy fits.',
          remedy: 'Consult Legal Aid (Deferral / Diversion Not Yet Screened)',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911 (how these apply to a completed deferral is not yet researched)'
        },
        // The "no waiting period" claim was flagged in Wave 0 ("verify immediate
        // availability") and is asserted nowhere now. A flagged claim does not
        // get to stay just because it is the headline — see openQuestions.
        complex_dui_az: {
          status: 'complex',
          title: 'DUI — Set-Aside Likely, Sealing Being Verified',
          message: 'A set-aside under ARS § 13-905 appears to be available for a DUI once your sentence is complete and everything is paid — that part looks the same as any other conviction. What we are not going to tell you is whether Record Sealing under ARS § 13-911 is available for a DUI: our sources do not agree, and this is exactly the kind of thing that is worth a phone call rather than a guess. Ask the clerk of the court that handled your case whether a DUI can be sealed under § 13-911, or ask one of the legal aid organizations below. The set-aside is worth pursuing either way.',
          remedy: 'Set-Aside (ARS § 13-905); § 13-911 sealing eligibility unverified for DUI',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911 (DUI treatment under 13-911 not yet resolved)'
        },
        eligible_marijuana_az: {
          status: 'eligible',
          title: 'Marijuana Expungement — The Strongest Path Arizona Has',
          message: 'Because this was marijuana conduct that Proposition 207 made legal, you can petition to EXPUNGE it under ARS § 36-2862 — and that is a better outcome than either of Arizona\'s other remedies. An expungement is a true erasure, not a set-aside notation and not a sealing. There is no waiting period, you can file at any time, there is no fee, and the court must grant it if your conduct is within what Prop 207 legalized. Do this before considering a set-aside or a petition to seal: those are slower, weaker, and unnecessary here.',
          remedy: 'Petition to Expunge Marijuana Records (ARS § 36-2862)',
          citation: 'Arizona Revised Statutes § 36-2862 (Proposition 207)'
        },
        eligible_seal_dismissed_az: {
          status: 'eligible',
          title: 'Potentially Sealable Now — No Statutory Waiting Period',
          message: 'Charges that were dismissed, ended in a not-guilty verdict, or never led to charges can be sealed under ARS § 13-911, and the statute sets NO waiting period for them (§ 13-911(A)(2)-(3)) — you can file now. Two useful things. The DPS investigation fee that normally comes with a sealing petition is WAIVED where the case ended in a not-guilty verdict or a dismissal (§ 13-911(H)), so this should cost you little or nothing. And the court cannot rule for 60 calendar days unless nobody objects (§ 13-911(D)), so expect that wait after filing. One caution worth knowing before you file: if a sealing petition is denied, you must wait three years to file again (§ 13-911(L)). We have confirmed the statute; what we are still confirming is what the clerk\'s counter actually requires in practice.',
          remedy: 'Petition to Seal Case Records (ARS § 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-911(A)(2)-(3), 13-911(D), 13-911(H), 13-911(L)'
        },
        eligible_both_az: {
          status: 'eligible',
          title: 'Potential Set-Aside AND Sealing Eligible',
          message: 'You appear potentially eligible for both Arizona remedies, and they do different things. A SET-ASIDE under ARS § 13-905 is available any time after discharge with no waiting period, and it costs nothing — the clerk is not permitted to charge a filing fee (§ 13-905(B)). It vacates the judgment of guilt, but the record stays publicly visible with a "set aside" annotation. It also restores your right to possess a firearm, unless the offense was a serious offense under § 13-706 (§ 13-905(O)). SEALING under ARS § 13-911 is the stronger remedy — it hides the record from public view and most background checks — and based on your dates the waiting period appears satisfied. Many people pursue both. Two things to plan around before you file the sealing petition. First, the court cannot rule for 60 calendar days unless nobody objects (§ 13-911(D)), so build that into your timeline. Second, and more important: if a sealing petition is DENIED, you must wait three years before filing again (§ 13-911(L)). That makes this worth getting right the first time rather than fast — if anything about your case is borderline, the free legal aid organizations below are worth a call before you file.',
          remedy: 'Set-Aside (ARS § 13-905) + Petition to Seal (ARS § 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-905(B), 13-905(O), 13-911(D), 13-911(L)'
        },
        waiting_seal_az: {
          status: 'waiting',
          title: 'Set-Aside Available Now; Sealing Waiting Period Not Met',
          message: 'Two different answers here, and the first one is good. You appear potentially eligible RIGHT NOW for a Set-Aside under ARS § 13-905 — there is no waiting period once you are discharged, and it costs nothing, because the clerk is not permitted to charge a filing fee (§ 13-905(B)). It also restores your firearm rights unless the offense was a serious offense under § 13-706 (§ 13-905(O)). Do not wait to do that. Record Sealing under ARS § 13-911 is the one that needs time. The periods run from when you finished the NON-MONEY conditions of your sentence and were discharged (§ 13-911(E)): 10 years for a class 2 or 3 felony, 5 for a class 4, 5 or 6 felony, 3 for a class 1 misdemeanor, 2 for a class 2 or 3 misdemeanor — and five years is added to each if you have a prior felony conviction (§ 13-911(F)). Based on your dates, yours has not run yet. Worth knowing: money you still owe does NOT delay this clock. Under § 13-911(G) it has to be paid by the time you file, but the waiting period runs regardless — so if you owe a balance, your clock is still going.',
          remedy: 'Set-Aside Now (ARS § 13-905); Sealing Later (ARS § 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-905(B), 13-911(E), 13-911(F), 13-911(G)'
        },
        ineligible_serious: {
          status: 'ineligible',
          title: 'Excluded From Both Remedies',
          message: 'Dangerous offenses, offenses requiring sex offender registration, offenses with a sexual-motivation finding, and crimes against victims under 15 are excluded from a Set-Aside under ARS § 13-905(P). They also sit on the wider sealing exclusion list at § 13-911(O), so both of Arizona\'s main remedies are closed here, and no waiting period changes that. Two things still worth knowing. If your case involved marijuana conduct that Proposition 207 made legal, a separate expungement under ARS § 36-2862 may apply regardless — it is its own statute with its own rules. And these lists are narrower than they sound: whether an offense counts as "dangerous", or carries a sexual-motivation finding, is a specific legal finding in your case file rather than a description of what happened. If you are not certain, the free legal aid organizations below can read your paperwork and tell you which list you are actually on.',
          remedy: 'None (Excluded under § 13-905(P) and § 13-911(O)) — Consult Legal Aid',
          citation: 'Arizona Revised Statutes §§ 13-905(P), 13-911(O), 36-2862'
        },
        // REPLACED 7/16. The old result said unpaid money "will block a
        // Set-Aside and delay the start of the § 13-911 sealing waiting period".
        // The statute says otherwise: § 13-911(E) starts the clock at
        // NON-MONETARY completion plus discharge, and § 13-911(G) makes payment
        // a filing condition. Telling someone their clock had not started
        // because they owed money was simply false.
        ineligible_not_discharged_az: {
          status: 'ineligible',
          title: 'Not Discharged Yet — Your Clock Has Not Started',
          message: 'Arizona\'s sealing clock starts when you finish the non-money parts of your sentence and are discharged — probation, parole, any jail or prison time, classes, community service. Until that happens the waiting period has not begun. A Set-Aside under ARS § 13-905 also comes after discharge. One thing worth being clear about, because it is commonly misunderstood: money you still owe does NOT hold your clock back. Under § 13-911(G) fines, fees and restitution have to be paid by the time you FILE, but the waiting period runs regardless. So if the only thing outstanding is a balance, your clock is already running — come back when you are discharged.',
          remedy: 'Finish the non-money conditions and get discharged first',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911(E), 13-911(G)'
        },
        // The good news the old encoding was hiding.
        // The result the merged gate made unreachable.
        eligible_setaside_only_az: {
          status: 'eligible',
          title: 'Set-Aside Available — Sealing Is Not',
          message: 'Two different answers, and the useful one first. A SET-ASIDE under ARS § 13-905 appears to be available to you: it has no waiting period once you are discharged, and it costs nothing, because the clerk is not permitted to charge a filing fee (§ 13-905(B)). It vacates the judgment of guilt. The record stays publicly visible with a "set aside" annotation — but that annotation says a court reviewed your case and set the conviction aside, which is worth having. Ask for a Certificate of Second Chance at the same time (§ 13-905(K),(L)): for a class 4, 5 or 6 felony it comes two years after discharge, for a class 2 or 3 felony five years, and for felonies it is once in a lifetime. Now the other half. SEALING under ARS § 13-911 is not available to you: § 13-911(O) excludes serious, violent and aggravated offenses, dangerous crimes against children, sex trafficking, offenses with a deadly weapon or serious injury as an element, and the chapter 14 and 35.1 felony classes. That list is wider than the set-aside list, which is why one remedy is open and the other is not. Note too that a set-aside does not restore firearm rights where the offense was a serious offense under § 13-706 (§ 13-905(O)). The legal aid organizations below can confirm which list your offense actually falls on — worth a call, because the two statutes draw the line in different places.',
          remedy: 'Set-Aside (ARS § 13-905) — sealing excluded under § 13-911(O)',
          citation: 'Arizona Revised Statutes §§ 13-905(B), 13-905(K), 13-905(L), 13-905(O), 13-911(O)'
        },
        eligible_pay_then_file_az: {
          status: 'eligible',
          title: 'Your Waiting Period Is Done — Pay the Balance, Then File',
          message: 'Your waiting period has run. The only thing between you and filing is the money: under ARS § 13-911(G), fines, fees and restitution must be paid in full at the time you file — but, and this matters, an unpaid balance does NOT delay your waiting period. It has been running this whole time and it is finished. So there is no more waiting to do here; there is a balance to clear. Ask the court clerk for your exact payoff amount. Once it is paid you can file the Petition to Seal (ARS § 13-911) immediately, and a Set-Aside under § 13-905 alongside it — that one has no filing fee at all, because the clerk is not permitted to charge one. If the balance is the obstacle, ask the clerk about a payment plan or a community-restitution conversion; people do get these resolved.',
          remedy: 'Pay the balance, then Set-Aside (§ 13-905) + Petition to Seal (§ 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911(E), 13-911(G)'
        }
      }
    },
    resources: {
      remedies: {
        set_aside: {
          name: 'Application to Set Aside Conviction (ARS § 13-905)',
          formName: 'Application to Set Aside Judgment & Request for Certificate of Second Chance (varies by county)',
          // TODO(phone-verify): petition forms vary by county (Maricopa,
          // Pima, etc. publish their own). Confirm the right packet with the
          // sentencing court's self-service center before shipping this link.
          formUrl: 'https://www.azcourts.gov/selfservicecenter',
          steps: [
            'Verify you have been discharged — that you finished probation, parole, and any jail or prison time (probation office or Department of Corrections).',
            'Pay any outstanding fines, fees, and victim restitution.',
            'Complete the set-aside application used by the court where you were sentenced.',
            'File it with the Clerk of the Court in the county where you were sentenced. The clerk may not charge you a filing fee (ARS § 13-905(B)).',
            'Ask for a Certificate of Second Chance at the same time. Timing depends on the offense (ARS § 13-905(K),(L)): for a misdemeanor it can issue immediately with the set-aside; for a class 4, 5 or 6 felony, two years after discharge; for a class 2 or 3 felony, five years. For felonies it is once in a lifetime — so if you have more than one, think about which case to use it on.',
            'If the set-aside is granted, your firearm rights are restored unless the offense was a serious offense under ARS § 13-706 (ARS § 13-905(O)).'
          ],
          // CLOSED 7/16 by statute (Diana, azleg.gov, 7/15): § 13-905(B) says
          // the clerk MAY NOT charge a filing fee. Not "shows none in one
          // county" — the statute forbids it. This is what closing a question
          // with a citation looks like.
          fees: '$0 — the clerk may not charge a filing fee for a set-aside application (ARS § 13-905(B)).',
          // A waiver is moot where the statute forbids the fee.
          feeWaiver: 'Not applicable — there is no filing fee to waive.',
          courtContact: 'Clerk of the Superior Court / Municipal or Justice Court Clerk (wherever you were sentenced)'
        },
        sealing: {
          name: 'Petition to Seal Case Records (ARS § 13-911)',
          formName: 'Petition to Seal Case Records (varies by county)',
          // TODO(phone-verify): same as above — county-specific packets.
          formUrl: 'https://www.azcourts.gov/selfservicecenter',
          steps: [
            'Request your criminal history report from the Arizona Department of Public Safety to confirm offense classes and discharge dates.',
            'Confirm the offense is not excluded and the class-based waiting period has elapsed.',
            'File the petition to seal with the court that handled the case (each case must be filed separately).',
            // CONFIRMED 7/16 (Diana, azleg.gov, 7/15): § 13-911(D). The number
            // was pulled when it was unverified and comes back now that it is,
            // with the citation attached.
            'The court may not rule for 60 calendar days after filing, unless there are no objections (ARS § 13-911(D)). Attend a hearing if one is set.',
            'If the petition is DENIED, you must wait three years before filing again (ARS § 13-911(L)) — so it is worth getting right rather than fast.'
          ],
          // Still null: § 13-911(H) confirms a DPS investigation fee EXISTS but
          // sets its amount by the DPS director rather than in statute, and the
          // court filing fee is not in § 13-911 at all. Both are phone-tier.
          fees: null,
          // NOT null any more, and not dependent on the amount: § 13-911(H)
          // states the waiver rule itself. Dependence is about derivation — this
          // does not derive from the fee amount, so it survives not knowing it.
          feeWaiver: 'The DPS investigation fee is waived if you are indigent, or if the case ended in a not-guilty verdict or a dismissal (ARS § 13-911(H)).',
          courtContact: 'Clerk of the court that handled the original case'
        }
      },
      legalAid: [
        { name: 'AZLawHelp (Arizona Legal Services)', url: 'https://www.azlawhelp.org' },
        { name: 'Community Legal Services (Phoenix)', url: 'https://www.clsaz.org' }
      ]
    }
  },

  // ==========================================================================
  // NEW YORK
  // Two conviction-sealing tracks now coexist:
  //   1. Clean Slate Act (CPL § 160.57, effective Nov 16, 2024) — AUTOMATIC
  //      sealing: misdemeanors 3 yrs, felonies 8 yrs from sentencing or
  //      release from incarceration (whichever is later); no conviction-count
  //      limit; excluded: sex offenses requiring registration and non-drug
  //      Class A felonies; must not be on probation/parole/supervision; new
  //      convictions reset the clock. Courts have until Nov 16, 2027 to seal
  //      the backlog, so eligible ≠ already sealed.
  //   2. Petition sealing (CPL § 160.59) — max 2 lifetime convictions with
  //      at most 1 felony; excludes sex offenses, violent felonies, Class A
  //      felonies; 10-year wait.
  // Non-convictions: CPL § 160.50 automatic sealing (unchanged).
  // ==========================================================================
  NY: {
    code: 'NY',
    name: 'New York',
    lastReviewed: '2026-07-15',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology:
      'New York SEALS; it has no general adult expungement. (The one exception is cannabis: MRTA expunged qualifying marijuana convictions automatically in 2021.) There are two conviction pathways. The CLEAN SLATE ACT (CPL § 160.57) seals eligible convictions AUTOMATICALLY, with no petition. PETITION SEALING (CPL § 160.59) is a discretionary motion you file yourself. Non-convictions seal automatically at disposition under CPL §§ 160.50/.55 and always have. The crucial implementation fact: Clean Slate is law, but eligible does NOT mean sealed yet — the court system has until November 16, 2027 to work through the backlog of pre-existing records, so an eligible conviction may still be showing up on background checks today.',
    keyDates: [
      {
        label: 'Clean Slate Act (CPL § 160.57) effective',
        date: '2024-11-16',
        kind: 'effective',
        note: null,
      },
      {
        label: 'OCA deadline to seal the pre-existing backlog',
        date: '2027-11-16',
        kind: 'deadline',
        note: 'Until this date the rollout is incomplete: many eligible old records are NOT yet sealed. "Eligible" and "sealed" are different states and the copy must not blur them.',
      },
      {
        label: 'Petition sealing (CPL § 160.59) enacted',
        date: '2017',
        kind: 'effective',
        note: 'Wave 0 gives the year only.',
      },
    ],
    openQuestions: [
      {
        question:
          'Is there a filing fee for the CPL § 160.59 sealing motion, and if there is, is a waiver available? Wave 0 says "No filing fee" but flags it for verification.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Confirm the supervision condition for Clean Slate sealing: must the person be off probation/parole entirely? Wave 0 flags this. The whole supervision_status branch and the ineligible_supervision result rest on it.',
        blocksFields: [],
      },
      {
        // Found by running Wave 0's own persona 3 against the tree: the package
        // contradicts itself. Refereed to the rules section, so the tree lets a
        // violent felony through to Clean Slate. If the persona was right, New
        // York is currently telling violent-felony convictions they are sealable.
        question:
          'Are Penal Law § 70.02 violent felonies eligible for Clean Slate automatic sealing after the 8-year wait? (Package sources conflicted.) Wave 0\'s rules section lists Clean Slate exclusions as sex offences (Arts. 130/263) and non-drug Class A felonies only — § 70.02 appears solely as a CPL 160.59 petition exclusion — but Wave 0\'s own persona 3 says a violent felony is excluded from BOTH paths. Resolved to the rules section pending confirmation. This is a practitioner question (Legal Aid Society / LawNY), not a clerk question.',
        blocksFields: [],
      },
      {
        question:
          'The Clean Slate clock resets on a new conviction. This has no representation in the tree — the date nodes only ask for one date and cannot model a reset.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions treated for sealing? Not covered in Wave 0 — add to call sheet. The tree hedges these rather than guess (see unknown_deferred).',
        blocksFields: [],
      },
      {
        question:
          'What is the current Clean Slate rollout status? Wave 0 names this as the call question for nycourts.gov — how far through the backlog is OCA, and can a person find out whether their own record has been reached?',
        blocksFields: [],
      },
      {
        question:
          'MRTA cannabis expungement (2021) is a real New York remedy that Wave 0 documents, but it is not encoded as a branch and is not surfaced anywhere in the tree.',
        blocksFields: [],
      },
      {
        question:
          'The Certificate of Disposition cost ($5 outside NYC, $10 within) is stated in the filing steps but appears nowhere in Wave 0 — it entered the rules from outside the research package. Confirm with a court clerk.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.Y. Crim. Proc. Law § 160.57 (Clean Slate Act; automatic sealing)', url: null, retrievedOn: null },
      { id: 'N.Y. Crim. Proc. Law § 160.59 (petition sealing)', url: null, retrievedOn: null },
      { id: 'N.Y. Crim. Proc. Law § 160.50 (automatic sealing of non-convictions)', url: null, retrievedOn: null },
      { id: 'N.Y. Crim. Proc. Law § 160.55 (sealing of non-criminal dispositions)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 130 (sex offences; Clean Slate exclusion)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 263 (sexual performance by a child; Clean Slate exclusion)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 220 (Class A drug felonies — ARE Clean Slate eligible)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law § 70.02 (violent felonies; § 160.59 exclusion)', url: null, retrievedOn: null },
      { id: 'Marijuana Regulation and Taxation Act (MRTA, 2021; cannabis expungement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted of a misdemeanor or felony', value: 'convicted', next: 'excluded_offense_ny' },
            { label: 'Dismissed / Acquitted / Non-criminal violation or infraction', value: 'dismissed', next: 'eligible_seal_dismissed' },
            // Explicit, so a deferral does NOT widen into the 'dismissed'
            // option. This label names no diversion track, and Wave 0
            // researches none for NY — see unknown_deferred.
            { label: 'Deferred adjudication / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_offense_ny: {
          type: 'boolean',
          text: 'Is the conviction a sex offense requiring registration, or a Class A felony that is not a drug offense (e.g., murder)?',
          yes: 'ineligible_offense',
          no: 'supervision_status'
        },
        supervision_status: {
          type: 'boolean',
          text: 'Are you currently on probation, parole, or post-release supervision, or do you have pending criminal charges?',
          yes: 'ineligible_supervision',
          no: 'offense_level_ny'
        },
        offense_level_ny: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'clean_slate_date_misd' },
            { label: 'Felony', value: 'felony', next: 'clean_slate_date_felony' }
          ]
        },
        // Clean Slate periods. The anchor carries the "whichever is later"
        // rule, which the number alone cannot: sentencing and release can be
        // years apart. The clock-reset-on-new-conviction rule has no
        // representation here at all — see open questions.
        clean_slate_date_misd: {
          type: 'date',
          text: 'When were you sentenced, or released from incarceration for this conviction (whichever is later)? Note: a new conviction during the waiting period resets the clock.',
          validation: {
            period: {
              amount: 3,
              unit: 'years',
              anchor: 'sentencing, or release from incarceration — whichever is later'
            },
            nextPass: 'eligible_clean_slate',
            nextFail: 'waiting_clean_slate_misd'
          }
        },
        clean_slate_date_felony: {
          type: 'date',
          text: 'When were you sentenced, or released from incarceration for this conviction (whichever is later)? Note: a new conviction during the waiting period resets the clock.',
          validation: {
            period: {
              amount: 8,
              unit: 'years',
              anchor: 'sentencing, or release from incarceration — whichever is later'
            },
            nextPass: 'eligible_clean_slate',
            nextFail: 'waiting_clean_slate_felony'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'New York\'s paths split on how the case ended: dismissals and acquittals seal automatically at disposition under CPL § 160.50, while convictions run through the Clean Slate Act (CPL § 160.57) or a CPL § 160.59 petition. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your criminal history record from the NYS Division of Criminal Justice Services, or ask the clerk of the court that heard the case for a Certificate of Disposition. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (NYS DCJS Record Review)',
          citation: 'New York Criminal Procedure Law §§ 160.50, 160.57, 160.59 (which path applies depends on the disposition)'
        },
        // OPEN QUESTION (carry into openQuestions on the schema migration):
        // "How are completed deferrals/diversions treated for sealing?
        //  ⚠️ not covered in Wave 0 — add to call sheet."
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'New York\'s sealing paths are screened here for convictions, dismissals, and acquittals. How a completed deferral or diversion is treated is not something this screening has researched yet, and we would rather tell you that than guess — a guess here could point you at the wrong path, or tell you that you have none when you do. The legal aid organizations listed below can confirm how your case was actually disposed and which path fits.',
          remedy: 'Consult Legal Aid (Deferral / Diversion Not Yet Screened)',
          citation: 'New York Criminal Procedure Law §§ 160.50, 160.57, 160.59 (how these apply to a completed deferral is not yet researched)'
        },
        eligible_seal_dismissed: {
          status: 'eligible',
          title: 'Automatic Sealing (Non-Conviction)',
          message: 'Cases that ended in dismissal, acquittal, or a non-criminal violation/infraction are sealed automatically under CPL § 160.50/160.55. If your record still shows the case, you can ask the court to confirm sealing was applied.',
          remedy: 'Automatic Sealing (CPL 160.50)',
          citation: 'New York Criminal Procedure Law § 160.50'
        },
        eligible_clean_slate: {
          status: 'eligible',
          title: 'Clean Slate Automatic Sealing Likely Applies',
          // The 160.59 cap is spelled out rather than alluded to: Wave 0's NY
          // persona 4 wants a cost/speed tradeoff, and the tree has no
          // conviction-count logic to compute it. Disclosing the cap lets a
          // person work out for themselves whether the petition is open to
          // them. The count logic needs the record model — post-demo.
          message: 'Under New York\'s Clean Slate Act (CPL § 160.57, effective Nov 16, 2024), eligible misdemeanors are sealed automatically 3 years — and felonies 8 years — after sentencing or release from incarceration, whichever is later. Based on your entries, your conviction appears eligible. Important: courts have until November 16, 2027 to finish sealing pre-existing records, so an eligible conviction may not be physically sealed yet — eligible and sealed are not the same thing. Check where you stand by requesting your criminal history from the NYS Division of Criminal Justice Services. There may also be a faster route: the CPL § 160.59 petition lets you ask a judge to seal now rather than wait for the backlog, but it is capped at 2 convictions in your lifetime, of which at most 1 may be a felony, and it needs 10+ years since sentencing or release. If you are inside those limits it is worth weighing the petition\'s cost and effort against simply waiting for the automatic sealing to reach you; if you are outside them, waiting is your path.',
          remedy: 'Clean Slate Automatic Sealing (CPL 160.57); optional CPL 160.59 petition',
          citation: 'New York Criminal Procedure Law §§ 160.57, 160.59'
        },
        waiting_clean_slate_misd: {
          status: 'waiting',
          title: 'Clean Slate Waiting Period Not Met (Misdemeanor: 3 Years)',
          message: 'Misdemeanors seal automatically under the Clean Slate Act 3 years from sentencing or release from incarceration, whichever is later, provided you are not under supervision and have no new convictions or pending charges. No application is required once the period runs.',
          remedy: 'Clean Slate Automatic Sealing (CPL 160.57)',
          citation: 'New York Criminal Procedure Law § 160.57'
        },
        waiting_clean_slate_felony: {
          status: 'waiting',
          title: 'Clean Slate Waiting Period Not Met (Felony: 8 Years)',
          message: 'Felonies seal automatically under the Clean Slate Act 8 years from sentencing or release from incarceration, whichever is later, provided you are not under supervision and have no new convictions or pending charges. If you have no more than 2 lifetime convictions (max 1 felony) and 10+ years have passed since sentence or release, the CPL § 160.59 petition is an alternative — though in most cases the 8-year automatic path arrives first.',
          remedy: 'Clean Slate Automatic Sealing (CPL 160.57)',
          citation: 'New York Criminal Procedure Law §§ 160.57, 160.59'
        },
        ineligible_offense: {
          status: 'ineligible',
          title: 'Excluded Offense Type',
          message: 'Sex offenses requiring registration and non-drug Class A felonies (such as murder) are excluded from both Clean Slate automatic sealing (CPL § 160.57) and petition-based sealing (CPL § 160.59). Class A drug felonies, however, ARE eligible under Clean Slate — if that is your situation, consult legal aid.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid',
          citation: 'New York Criminal Procedure Law §§ 160.57, 160.59'
        },
        ineligible_supervision: {
          status: 'ineligible',
          title: 'Currently Under Supervision or Facing Charges',
          message: 'Convictions cannot seal — automatically or by petition — while you are on probation, parole, or post-release supervision, or while criminal charges are pending. Once supervision ends and charges resolve, the Clean Slate waiting period can complete.',
          remedy: 'None Yet (Active Supervision / Pending Charges)',
          citation: 'New York Criminal Procedure Law § 160.57'
        }
      }
    },
    resources: {
      remedies: {
        clean_slate: {
          name: 'Clean Slate Automatic Sealing (CPL 160.57)',
          formName: 'No application required (review-request form available from the courts by Nov 2027 if an eligible record is not sealed)',
          formUrl: 'https://www.nycourts.gov/criminal-history-record-search/new-york-states-clean-slate-act',
          steps: [
            'No petition is needed — sealing is automatic once the waiting period runs and you are not under supervision.',
            'Courts have until November 16, 2027 to seal all pre-existing eligible records, so an eligible record may still appear on checks for now.',
            'To check your status, request your NYS criminal history (RAP sheet) from the Division of Criminal Justice Services.',
            'If you believe an eligible conviction was not sealed, the court system provides a review-request process (form available no later than Nov 16, 2027).'
          ],
          fees: '$0 (automatic; no filing)',
          feeWaiver: 'Not applicable',
          courtContact: 'NYS Unified Court System / Division of Criminal Justice Services'
        },
        sealing: {
          name: 'CPL 160.59 Sealing Motion (petition path)',
          formName: 'CPL 160.59 Sealing Application (Notice of Motion & Affidavit in Support)',
          formUrl: 'https://www.nycourts.gov/FORMS/cpl_160.59_sealing_application/index.shtml',
          steps: [
            'Confirm you meet the limits: no more than 2 lifetime NY convictions, at most 1 felony, and 10+ years since sentencing or release (whichever is later).',
            'Obtain a Certificate of Disposition from the court where you were sentenced (one per case).',
            'Complete the Sealing Application (Notice of Motion and Affidavit in Support) and sign before a notary.',
            'Serve the District Attorney in each county of conviction, complete the Affidavit of Service, and file everything with the sentencing court.',
            // Moved out of `fees`: that one string held a flagged claim (the $0
            // motion fee) and an unflagged procedural cost. Nulling the field
            // would have destroyed the second along with the first, so the
            // Certificate of Disposition cost lives here, where it belongs.
            // It is not in Wave 0 either — see open questions.
            'Budget for the Certificate of Disposition itself: reported as $5 per case outside New York City and $10 within it. Confirm the current cost with the clerk.'
          ],
          // null: Wave 0 flags the "no filing fee" claim for the § 160.59
          // motion. Blocked by an open question.
          fees: null,
          // Dependent claim: "not required for the motion itself" followed from
          // the motion being free. Nulls with it.
          feeWaiver: null,
          courtContact: 'Sentencing Court Clerk (Supreme / County / City / Town Court)'
        }
      },
      legalAid: [
        { name: 'LawHelpNY', url: 'https://www.lawhelpny.org' },
        { name: 'Legal Aid Society of NYC', url: 'https://www.legalaidnyc.org' },
        { name: 'Clean Slate NY (info & webinars)', url: 'https://www.cleanslateny.org' }
      ]
    }
  },

  // ==========================================================================
  // TEXAS
  // HB 4504 repealed CCP Chapter 55 and recodified expunction as Chapter 55A,
  // effective Jan 1, 2025. All citations updated. Substance largely carried
  // over, with reduced waiting periods for uncharged arrests and immediate
  // expunction where the prosecutor certifies no charges will be filed.
  // Nondisclosure still lives in Government Code Chapter 411 (unchanged).
  // Standard convictions remain ineligible for both remedies.
  // ==========================================================================
  TX: {
    code: 'TX',
    name: 'Texas',
    // Statute-verified by Diana against statutes.capitol.texas.gov on
    // 2026-07-16: Ch. 55A read article by article, and the Gov't Code 411
    // nondisclosure sections (411.0725 corrected, .0735, .0736, .074) checked.
    // See sources[].retrievedOn. NOT phone_verified: the base county civil
    // filing fee, forms and processing times are still counter questions, and
    // 411.0735's 2-vs-5-year period is still in conflict (see open questions).
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology:
      'Texas has two remedies and they are not the same thing. EXPUNCTION (Code of Criminal Procedure Ch. 55A — recodified from Ch. 55 effective Jan 1, 2025, so any form or guide still citing Ch. 55 is stale) DESTROYS the records: you can lawfully deny the arrest ever happened. An ORDER OF NONDISCLOSURE (Government Code Ch. 411, Subch. E-1) only SEALS: the record survives and stays visible to law enforcement and some licensing bodies. The bright line that governs almost every Texas screening: CONVICTIONS ARE ESSENTIALLY NEVER EXPUNGABLE (a pardon aside). If you were convicted, nondisclosure is the only route, and only for certain offences. Nondisclosure is not one rule but a lattice of per-section rules under § 411.0725 and its neighbours.',
    keyDates: [
      {
        label: 'Expunction recodified from CCP Ch. 55 to Ch. 55A',
        date: '2025-01-01',
        kind: 'effective',
        note: 'HB 4504. Substance largely carried over. Most of the internet — including older forms and guides — still cites Ch. 55; every citation here reads 55A deliberately.',
      },
    ],
    openQuestions: [
      {
        // NARROWED 7/16 by the statute check. The per-agency half is answered:
        // Art. 55A.254(e)-(f) as amended 2025 makes electronic service FREE and
        // charges $25 only per entity that cannot receive it — so the
        // "~$280-$400 plus per-agency service costs" framing was describing a
        // cost structure the legislature has since changed. Art. 55A.203(c) can
        // make a specialty-court expunction free outright. What is left is the
        // base civil filing fee, which the statute leaves to the county.
        question:
          'What is the base civil filing fee for an expunction petition in a given county? The statute answers the rest: electronic service on the listed entities is free, $25 per entity that cannot receive electronic transmission (Art. 55A.254(e)-(f), 2025 amendment), and a specialty-court expunction may carry no fee at all (Art. 55A.203(c)). Ask a Harris County district clerk for the base filing fee, and confirm they are applying the 2025 electronic-service rule rather than the old per-agency charges.',
        blocksFields: ['resources.remedies.expunction.fees'],
      },
      {
        question:
          'What does an Order of Nondisclosure cost? Wave 0 gives "civil filing fee + $28 statutory fee"; the encoded rules said "approximately $280 to $350" and never mentioned the $28 statutory fee at all. Ask a Harris County district clerk.',
        blocksFields: ['resources.remedies.nondisclosure.fees'],
      },
      {
        question:
          'CONFLICT: what is the waiting period under Gov\'t Code § 411.0735 for certain misdemeanour convictions? Wave 0 records that sources split between 2 and 5 years and says to encode from the statute. Because the sources disagree, no period is encoded — this path stays prose-only until the statute settles it, then it gets a real branch.',
        blocksFields: [],
      },
      {
        // ANSWERED 7/16 by Art. 55A.201 — replaced with what the answer opened up.
        // The bars below are real and cited, but the tree only gates 55A.151;
        // the other two are disclosed in prose because they turn on facts the
        // screening does not ask for.
        question:
          'Two Ch. 55A bars are disclosed in the results but NOT gated by the tree, because each turns on a fact we do not ask about. Art. 55A.153: an arrest for violating community supervision is never expungable. Art. 55A.154: absconding bars expunction. Ask legal aid how often each actually bites in practice, and whether a person can tell from their own paperwork that one applies — if they can, both should become questions rather than paragraphs.',
        blocksFields: [],
      },
      {
        // RESOLVED 7/16 in structure by Art. 55A.053 — the tree now asks the
        // reason. What is left is whether a person can identify their own reason
        // from the order they were given.
        question:
          'Can a person actually tell which Art. 55A.053 dismissal reason applies to them from their own paperwork? The tree asks them to pick one — veterans court, mental health court, pretrial intervention, no probable cause / mistake / false information, or void indictment — and routes "I don\'t know" to a hedge that says to get the dismissal order. Ask a district clerk what the order typically says, and whether the recorded reason is legible to a non-lawyer.',
        blocksFields: [],
      },
      {
        question:
          'Map the correct DWI nondisclosure section numbers (§§ 411.0726 / .0731 / .0736). Wave 0 gives the rule — first-offence DWI, BAC under 0.15, no accident involving another person, no CDL: 2 years with full-term ignition interlock, 5 years without — but flags the section mapping. Neither the rule nor the interlock condition is encoded as a branch.',
        blocksFields: [],
      },
      {
        question:
          'The 180-day Class C expunction wait cannot be encoded yet: the screening form offers only misdemeanour/felony/infraction and has no way to say "Class C". A Class C arrestee currently gets the Class A/B 1-year rule and may be told to wait when they are already eligible. Needs a form value before it can be a branch.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the TexasLawHelp expunction kit URL and whether the county requires its own form. The current formUrl points at the site root because the deep link was never verified.',
        blocksFields: [],
      },
      {
        // Raised by Wave 0's own TX persona 4, which expects a dated answer
        // ("first DWI, interlock full term, done 2023 -> nondisclosure 2025")
        // the tree cannot give.
        question:
          'Confirm the first-DWI nondisclosure timing and which section governs: 2 years after sentence completion with a full-term ignition interlock, 5 years without? Wave 0 gives the rule but flags the mapping across §§ 411.0726 / .0731 / .0736. The DWI path is disclosed in prose on the conviction result but is NOT a branch — the tree has no interlock question — so a first-DWI person is currently told less than the research knows.',
        blocksFields: [],
      },
    ],
    // Ch. 55A read in full against the official text at
    // statutes.capitol.texas.gov on 2026-07-16, article by article — which is
    // why these carry a retrievedOn and the sub-articles are listed separately.
    // A citation we have read is a different thing from one we wrote down.
    sources: [
      { id: 'Tex. Code Crim. Proc. ch. 55A (expunction; recodified from ch. 55 eff. Jan 1, 2025)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.002 (entitlement after acquittal)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. arts. 55A.003, 55A.004 (pardon-based expunction)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.051(3) (community-supervision bar; Class C excepted)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.052 (no-charge ladder: 180d / 1y / 3y from arrest; (a)(4) prosecutor certification; (b) entitlement regardless of limitations)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.053 (charged-then-dismissed: entitling dismissal reasons)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.054 (expunction on expiry of limitations)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.151 (same-criminal-episode bar on acquittal expunction)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.153 (arrests for supervision violations never expungable)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.154 (absconding bar)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.201 (order entered within 30 days of acquittal, on request; court must advise of the right)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.203(c) (specialty-court expunction may carry no fee)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.253 (petition information required)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.254(e)-(f) (2025: electronic service free; $25 per non-electronic entity)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Code Crim. Proc. art. 55A.401 (effect of expunction — lawful denial)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code ch. 411, subch. E-1 (orders of nondisclosure)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.072 (deferred adjudication nondisclosure, certain misdemeanours)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code § 411.0725 (deferred adjudication nondisclosure)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0735 (certain misdemeanour convictions — period still in conflict; see open questions)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0736 (DWI nondisclosure)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.074 (nondisclosure — required conditions)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code §§ 411.0726, 411.0731 (DWI nondisclosure paths)', url: null, retrievedOn: null },
      { id: 'HB 4504 (recodification of ch. 55 to ch. 55A)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition_type',
      nodes: {
        disposition_type: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of your Texas case?',
          options: [
            // 55A.201 (verified 7/16): on an acquittal the court enters the
            // expunction order within 30 days AT THE PERSON'S REQUEST — not on
            // its own. So this is streamlined-on-request, not automatic, and
            // the copy says so. 55A.151 gates it first.
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'acquittal_episode_tx' },
            // 'dismissed', not 'dropped': option values are matched against the
            // screening form's vocabulary (ConvictionRecord['disposition']).
            // 'dropped' matched nothing, so every dismissed Texas case fell
            // through to this node's old default — 'ineligible_conviction'.
            //
            // This used to go straight to the 55A.052 waiting ladder, which was
            // wrong for anyone actually charged — see supervision_tx below.
            { label: 'Dismissed / Never charged / No-billed by grand jury', value: 'dismissed', next: 'supervision_tx' },
            { label: 'Deferred Adjudication (Completed)', value: 'deferred', next: 'offense_level' },
            { label: 'Convicted (Jail / Prison / Standard Probation)', value: 'convicted', next: 'ineligible_conviction' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // 55A.151 (verified 7/16). The same-criminal-episode bar: an acquittal
        // does not entitle you to expunction if you were convicted of, or are
        // still facing, another offence from the same episode.
        acquittal_episode_tx: {
          type: 'boolean',
          text: 'Thinking about the events that led to this charge — were you convicted of any OTHER offense arising out of the same incident, or are you still facing one?',
          yes: 'ineligible_episode_tx',
          no: 'check_record_first_tx'
        },
        // 55A.051(3) (verified 7/16). This gates the WHOLE subchapter — both the
        // no-charge ladder and the dismissal-reason path — so it is asked before
        // either. Class C community supervision is the exception.
        supervision_tx: {
          type: 'boolean',
          text: 'Were you placed on court-ordered community supervision (probation) for this charge? Answer no if it was for a Class C misdemeanor, which does not count here.',
          yes: 'ineligible_supervision_tx',
          no: 'charges_filed_tx'
        },
        // THE SPLIT. 55A.052 and 55A.053 are different regimes and the tree used
        // to send every dismissal down 55A.052's waiting ladder — which only
        // applies where NO indictment or information was ever presented. A charge
        // that was filed and then dismissed is governed by 55A.053, which
        // entitles expunction only for specific dismissal REASONS. Conflating
        // them told charged-then-dismissed people to wait a year and then file
        // for something they may have no entitlement to at all.
        charges_filed_tx: {
          type: 'boolean',
          text: 'Were formal charges ever filed with the court — an indictment or an information presented against you? (Answer no if you were arrested but the case never got that far, or if a grand jury no-billed it.)',
          yes: 'dismissal_reason_tx',
          no: 'dismissal_offense_level'
        },
        // 55A.053: the reason the case was dismissed decides entitlement.
        dismissal_reason_tx: {
          type: 'choice',
          text: 'Why was the case dismissed? This decides whether Texas entitles you to an expunction — under Article 55A.053 only certain reasons do.',
          options: [
            { label: 'I completed a veterans treatment court program', value: 'veterans_court', next: 'eligible_specialty_tx' },
            { label: 'I completed a mental health court program', value: 'mental_health_court', next: 'eligible_specialty_tx' },
            { label: 'I completed pretrial intervention', value: 'pretrial_intervention', next: 'eligible_expunction_053_tx' },
            { label: 'It was dismissed for lack of probable cause, a mistake, or false information', value: 'no_probable_cause', next: 'eligible_expunction_053_tx' },
            { label: 'The indictment or information was void', value: 'void_indictment', next: 'eligible_expunction_053_tx' },
            { label: 'Some other reason', value: 'other', next: 'ineligible_dismissal_reason_tx' },
            { label: 'I don\'t know why it was dismissed', value: 'unsure', next: 'complex_dismissal_reason_tx' }
          ]
        },
        dismissal_offense_level: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense that was dismissed or never charged?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'arrest_date_tx_misd' },
            { label: 'Felony', value: 'felony', next: 'arrest_date_tx_felony' }
          ]
        },
        // Class A/B misdemeanours: 1 year from arrest.
        //
        // Class C is only 180 days, and `unit: 'days'` can now express that —
        // but the branch still cannot exist, because the screening form has no
        // way to SAY "Class C" (its offence classes are misdemeanour / felony /
        // infraction / unknown). Encoding a Class C option here would create an
        // option value the UI can never produce. So a Class C arrestee lands
        // here and gets the 1-year rule: they may be told to wait when they are
        // already eligible. The waiting message discloses the 180-day rule so
        // nobody is misled, and an open question holds the gap until the form
        // grows the value.
        arrest_date_tx_misd: {
          type: 'date',
          text: 'When was the arrest date?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'date of arrest (Class A/B misdemeanour)' },
            nextPass: 'eligible_expunction',
            nextFail: 'waiting_period_tx_dismissal'
          }
        },
        arrest_date_tx_felony: {
          type: 'date',
          text: 'When was the arrest date?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'date of arrest (felony)' },
            nextPass: 'eligible_expunction',
            nextFail: 'waiting_period_tx_dismissal'
          }
        },
        offense_level: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'eligible_nondisclosure_misdemeanor' },
            { label: 'Felony', value: 'felony', next: 'sentence_date_tx_felony_deferred' }
          ]
        },
        sentence_date_tx_felony_deferred: {
          type: 'date',
          text: 'When did you complete your deferred adjudication probation?',
          validation: {
            period: {
              amount: 5,
              unit: 'years',
              anchor: 'discharge and dismissal from deferred adjudication'
            },
            nextPass: 'eligible_nondisclosure_felony',
            nextFail: 'waiting_period_tx_felony'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Texas draws a hard line on how a case ended: an acquittal or dismissal can lead to expunction under Code of Criminal Procedure Chapter 55A, completed deferred adjudication leads to an Order of Nondisclosure, and a conviction is generally eligible for neither. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Ask the district or county clerk in the county where the case was filed for a certified copy of the disposition. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (Certified Disposition from the Clerk)',
          citation: 'Texas Code of Criminal Procedure Chapter 55A; Texas Government Code Chapter 411, Subchapter E-1 (which path applies depends on the disposition)'
        },
        // ACQUITTALS. Corrected 7/16 against 55A.201: the order goes in within
        // 30 days AT THE PERSON'S REQUEST, and the court must advise them of the
        // right. Streamlined-on-request — NOT automatic-with-no-action, which is
        // what the earlier hedge guessed at. Petition information under 55A.253
        // is still required either way.
        check_record_first_tx: {
          status: 'eligible',
          title: 'It May Already Be Done — Check Before You File',
          message: 'Start with a phone call, not a petition. Because you were acquitted, Texas entitles you to an expunction (Art. 55A.002), and there is a fast route to it: the court enters the order within 30 days of the acquittal IF you or your attorney asked for it, and the court is supposed to have advised you of that right (Art. 55A.201). So the first question is whether that already happened. Ask the clerk of the court that tried your case whether an expunction order was entered. If it was, you are finished. If nobody asked at the time — which is common — you have lost nothing: you can still file, and the entitlement does not expire. You will need to provide the petition information Art. 55A.253 requires. An expunction destroys the records, and afterwards you can lawfully deny the arrest ever happened (Art. 55A.401).',
          remedy: 'Ask the court whether the order was entered — if not, petition (CCP Ch. 55A)',
          citation: 'Texas Code of Criminal Procedure Arts. 55A.002, 55A.201, 55A.253, 55A.401'
        },
        ineligible_episode_tx: {
          status: 'ineligible',
          title: 'Another Offense From the Same Incident Blocks This',
          message: 'An acquittal normally entitles you to an expunction — but not when another offense arising out of the same criminal episode ended in a conviction, or is still pending (Art. 55A.151). Texas treats the episode as a whole rather than charge by charge, so being acquitted of one part of it does not clear the arrest. If the other case is still pending, this is a timing bar rather than a permanent one: how that case ends changes the answer, so it is worth revisiting once it resolves. If you are not sure whether the offenses count as the same episode — that is a legal judgment, not a description of what happened — the Texas State Law Library answers questions like this by phone, and legal aid can look at the file.',
          remedy: 'None (Same-Episode Bar) — reassess if the other case is still pending',
          citation: 'Texas Code of Criminal Procedure Art. 55A.151'
        },
        ineligible_supervision_tx: {
          status: 'ineligible',
          title: 'Community Supervision Blocks Expunction',
          message: 'Court-ordered community supervision — probation — blocks expunction under this part of Chapter 55A (Art. 55A.051(3)). The one exception is supervision for a Class C misdemeanor, which does not count against you. This is a hard bar rather than a waiting period, so time does not fix it. There may be another route, though: if the supervision was DEFERRED adjudication that you completed, that is a different thing entirely, and an Order of Nondisclosure under Government Code Chapter 411 may be open to you — it seals rather than destroys, but it is real relief. Run this screening again and choose "Deferred Adjudication (Completed)" if that describes your case, or ask the Texas State Law Library, which answers exactly these questions by phone.',
          remedy: 'None under Ch. 55A — ask about nondisclosure if it was deferred adjudication',
          citation: 'Texas Code of Criminal Procedure Art. 55A.051(3)'
        },
        // 55A.053 dismissal reasons that DO entitle.
        eligible_expunction_053_tx: {
          status: 'eligible',
          title: 'Potential Expunction Eligible — Dismissal Reason Qualifies',
          message: 'Charges were filed and then dismissed, and the reason you gave is one of the specific reasons Texas entitles you to an expunction for (Art. 55A.053) — pretrial intervention you completed, a dismissal for lack of probable cause or because of a mistake or false information, or a void indictment. That matters, because a dismissal on its own is not enough in Texas: when charges were actually filed, the REASON decides. There is no waiting period to serve on this route. File the petition in a district court in the county of the arrest, listing every agency that may hold records. On cost: since 2025, serving the petition electronically on the listed entities is free, and $25 is charged only per entity that cannot receive electronic transmission (Art. 55A.254(e)-(f)). The county-set civil filing fee is separate and is something we are still confirming. An expunction destroys the records — afterwards you can lawfully deny the arrest ever happened (Art. 55A.401).',
          remedy: 'Petition for Expunction (CCP Art. 55A.053)',
          citation: 'Texas Code of Criminal Procedure Arts. 55A.053, 55A.254(e)-(f), 55A.401'
        },
        // Veterans / mental health court — once-ever, affidavit, and possibly free.
        eligible_specialty_tx: {
          status: 'eligible',
          title: 'Specialty Court Completion — Expunction Available, and Possibly Free',
          message: 'Completing a veterans treatment court or mental health court program is one of the specific dismissal reasons that entitles you to an expunction under Art. 55A.053. Three things worth knowing before you file. It is once in a lifetime on this ground, so if you have more than one case, think about which one to use it on. You will need to file an affidavit stating you have not previously used this route. And the cost may be nothing at all: a court may charge NO fee for an expunction granted on a specialty-court completion (Art. 55A.203(c)) — say which program you completed when you file, because that is what triggers it. Serving the petition electronically is also free, with $25 charged only per entity that cannot receive electronic transmission (Art. 55A.254(e)-(f)). An expunction destroys the records; afterwards you can lawfully deny the arrest ever happened (Art. 55A.401).',
          remedy: 'Petition for Expunction after specialty-court completion (CCP Art. 55A.053) — once per lifetime',
          citation: 'Texas Code of Criminal Procedure Arts. 55A.053, 55A.203(c), 55A.254(e)-(f), 55A.401'
        },
        ineligible_dismissal_reason_tx: {
          status: 'ineligible',
          title: 'Dismissed — But Not for a Reason Texas Expunges',
          message: 'This is the part of Texas law that surprises people most, so here it is plainly: once charges have actually been filed, a dismissal on its own does not entitle you to an expunction. Article 55A.053 lists the reasons that do — completing a veterans treatment court or mental health court program, completing pretrial intervention, a dismissal for lack of probable cause or because of a mistake or false information, or a void indictment — and a dismissal for any other reason is not on that list. Two things worth doing rather than stopping here. First, the reason recorded on your dismissal order may not be the reason you remember; it is worth reading the order itself, because the wording is what counts. Second, there are other routes: if the statute of limitations has since expired, Art. 55A.054 may open expunction anyway, and a pardon route exists under Arts. 55A.003 and 55A.004. The Texas State Law Library answers questions like this by phone, and they are good at it.',
          remedy: 'None under Art. 55A.053 — read the dismissal order, and ask about limitations expiry or a pardon',
          citation: 'Texas Code of Criminal Procedure Arts. 55A.053, 55A.054, 55A.003, 55A.004'
        },
        complex_dismissal_reason_tx: {
          status: 'complex',
          title: 'We Need to Know Why It Was Dismissed',
          message: 'In Texas, once charges have been filed, the REASON for the dismissal decides whether you are entitled to an expunction — not the dismissal itself. Article 55A.053 entitles you if you completed a veterans treatment court or mental health court program, completed pretrial intervention, or the case was dismissed for lack of probable cause, because of a mistake or false information, or on a void indictment. Anything else is not on the list. Since you are not sure which applies, we are not going to guess: the difference is between an entitlement and no route at all. The dismissal order itself states the reason, and the district clerk in the county of the case can give you a copy. The Texas State Law Library also answers reference questions like this by phone — call (844) 829-2843 — and TexasLawHelp has the forms once you know.',
          remedy: 'Get the dismissal order and read the reason (district clerk / Texas State Law Library)',
          citation: 'Texas Code of Criminal Procedure Art. 55A.053'
        },
        eligible_expunction: {
          status: 'eligible',
          title: 'Potential Expunction Eligible',
          message: 'Since your case ended in dismissal or was never charged, you appear potentially eligible for a complete Expunction under Texas Code of Criminal Procedure Chapter 55A (which replaced Chapter 55 effective January 1, 2025). An expunction destroys the records, and you can generally deny the arrest ever occurred.',
          remedy: 'Petition for Expunction (CCP Ch. 55A)',
          citation: 'Texas Code of Criminal Procedure Chapter 55A (e.g., Art. 55A.002 for acquittals)'
        },
        eligible_nondisclosure_misdemeanor: {
          status: 'eligible',
          title: 'Potential Nondisclosure Eligible',
          // Wave 0 § 411.0725: most misdemeanours immediate on discharge;
          // misdemeanours under Penal Code chs. 20-22, 25, 42, 43, 46, 71 -> 5
          // yrs. Neither figure is flagged, so both stand. The old text said "a
          // 2-year wait", which matches no figure in the package at all.
          //
          // The chapters are named by NUMBER, exactly as Wave 0 gives them.
          // Glossing them ("assaultive, weapons, public-order") means naming
          // Texas law the package never named — that is a rule 1 gap-fill, and
          // it is how the old text drifted in the first place.
          message: 'Since you completed Deferred Adjudication for a misdemeanor, you appear potentially eligible to petition for an Order of Nondisclosure — immediately upon discharge and dismissal for many misdemeanors. Misdemeanors under Texas Penal Code chapters 20, 21, 22, 25, 42, 43, 46, or 71 instead require a 5-year wait after discharge and dismissal, and some offense types (such as family violence) are excluded outright. Which chapter your offense sits under decides the answer, so confirm that on your court papers before relying on this.',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.072 / § 411.0725'
        },
        eligible_nondisclosure_felony: {
          status: 'eligible',
          title: 'Potential Nondisclosure Eligible',
          message: 'Since you completed Deferred Adjudication for a felony and 5 years have elapsed since discharge and dismissal, you appear potentially eligible for an Order of Nondisclosure under Government Code § 411.0725, provided the offense is not excluded (e.g., family violence, murder, offenses requiring sex offender registration).',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.0725'
        },
        waiting_period_tx_dismissal: {
          status: 'waiting',
          title: 'Waiting Period Not Met',
          message: 'For arrests that did not lead to charges (or dismissed charges without a probation condition), Texas generally requires: 180 days from arrest for Class C misdemeanors, 1 year for Class A/B misdemeanors, and 3 years for felonies. Exception: if the prosecutor\'s office certifies the records are not needed and no charges will be filed, expunction can be immediate. It may be worth contacting the district attorney\'s office.',
          remedy: 'Petition for Expunction (CCP Ch. 55A)',
          citation: 'Texas Code of Criminal Procedure Chapter 55A'
        },
        waiting_period_tx_felony: {
          status: 'waiting',
          title: '5-Year Waiting Period Unmet',
          message: 'Texas requires a 5-year waiting period after discharge and dismissal from felony deferred adjudication before you can petition for an Order of Nondisclosure.',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.0725'
        },
        ineligible_conviction: {
          status: 'ineligible',
          title: 'Conviction Generally Ineligible',
          // The § 411.0735 period is NOT stated: Wave 0 records that sources
          // split between 2 and 5 years. A conflicting period is exactly the
          // case where the value stays out — prose and an open question hold
          // the place until the statute settles it, then it gets a real branch.
          //
          // The DWI path IS disclosed in prose, with its conditions, because
          // Wave 0 states them unflagged and a first-DWI person otherwise
          // leaves here knowing less than the research does. It is not a
          // branch: there is no interlock question in the tree yet, and the
          // section mapping is flagged. See openQuestions.
          message: 'In Texas, standard convictions (found guilty and sentenced to jail, prison, or regular community supervision) are generally not eligible for expunction. Limited nondisclosure paths do exist. For certain first-time misdemeanor convictions with completed sentences (Gov\'t Code §§ 411.073, 411.0735), there is a waiting period after you finish your sentence — and we are not going to quote you a number, because our sources disagree on how long § 411.0735 requires and we would rather say so than pick one. For a FIRST DWI, a nondisclosure path exists (Gov\'t Code §§ 411.0726, 411.0731, 411.0736) if your BAC was under 0.15, no accident involved another person, and you did not hold a commercial license: reported as a 2-year wait after your sentence if you kept an ignition interlock for the full term, and 5 years without one. We have not confirmed which section applies to which situation, so treat those as leads to check rather than as your answer. A legal aid attorney or the sentencing court clerk can give you the current periods. Otherwise, a pardon is the remaining remedy.',
          remedy: 'Limited Nondisclosure (certain misdemeanors) / Governor\'s Pardon',
          citation: 'Texas Gov\'t Code §§ 411.073–411.0736; CCP Chapter 55A'
        }
      }
    },
    resources: {
      remedies: {
        expunction: {
          name: 'Petition for Expunction (CCP Ch. 55A)',
          formName: 'Petition for Expunction (varies by county)',
          // TODO(phone-verify): TexasLawHelp restructured its guides; confirm
          // the current expunction kit URL and whether the county has its own
          // required form before shipping a deep link.
          formUrl: 'https://texaslawhelp.org',
          steps: [
            'Acquire a certified copy of the case disposition showing dismissal, acquittal, or that no charges were filed.',
            'Fill out the Petition for Expunction, listing every law enforcement agency that may hold records of the arrest.',
            'File the petition in a district court in the county where the arrest occurred.',
            'Attend the scheduled hearing to obtain the Expunction Order, then confirm agencies comply with it.'
          ],
          // null: Wave 0 flags this fee and gives "~$280-$400 commonly cited"
          // — and the encoded $300-$450 did not even match that. "Commonly
          // cited" is not a source. Blocked by an open question.
          fees: null,
          // NOT nulled: an independent waiver mechanism, not a claim derived
          // from the fee amount.
          feeWaiver: 'Available using the Statement of Inability to Afford Payment of Court Costs.',
          courtContact: 'County District Court Clerk'
        },
        nondisclosure: {
          name: 'Order of Nondisclosure',
          formName: 'Petition for Order of Nondisclosure (form depends on which § 411 section applies)',
          formUrl: 'https://www.txcourts.gov/rules-forms/forms/',
          steps: [
            'Confirm you completed deferred adjudication and received a discharge and dismissal order.',
            'Ensure the waiting period for your offense category has elapsed.',
            'Fill out the specific Nondisclosure form for your offense category (the Office of Court Administration publishes them by section).',
            'File with the court that placed you on deferred adjudication.'
          ],
          // null: Wave 0 gives "civil filing fee + $28 statutory fee" and flags
          // it. The encoded "$280 to $350" never mentioned the $28 statutory
          // fee at all. Blocked by an open question.
          fees: null,
          feeWaiver: 'Available using the Statement of Inability to Afford Payment of Court Costs.',
          courtContact: 'Sentencing Court Clerk'
        }
      },
      legalAid: [
        { name: 'TexasLawHelp', url: 'https://texaslawhelp.org' },
        { name: 'Lone Star Legal Aid', url: 'https://www.lonestarlegal.org' }
      ]
    }
  },

  // ==========================================================================
  // UTAH — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave1_Draft_Package.md
  //
  // The structural fact most tools miss: Utah requires a BCI Certificate of
  // Eligibility BEFORE the court petition. The court will not accept a petition
  // without one, and BCI reviews the person's FULL history including
  // out-of-state records. So Utah's petition path ends at "apply to BCI", not
  // "file with the court" — and the certificate expires after 180 days, so
  // requesting it early wastes it.
  //
  // Two tracks, and their periods INVERT. Petition is FASTER than automatic for
  // the same offence (class C: 3 years vs 5). So between the two thresholds the
  // honest answer is "petitioning now beats waiting", which is the opposite of
  // what every other state's automation advice says. Wave 1 flags the inversion
  // as counter-intuitive enough to possibly be a transcription error — an open
  // question stands on it, and the result says the counterintuitive thing
  // plainly rather than smoothing it over.
  //
  // Automatic (Clean Slate) covers misdemeanour-level ONLY: class C/infraction
  // 5 yrs, class B 6 yrs, class A drug possession 7 yrs. Class A non-drug,
  // misdemeanour DUI and every felony are petition-only.
  //
  // The count-limit gate (§ 77-40a-303(4)/(5)) is a hard gate BEFORE any
  // per-conviction check, and it is a four-clause test over a person's whole
  // history. ConvictionRecord holds one charge and has no offence-class field,
  // so the engine cannot compute it — it is asked, spelled out, with an
  // "unsure" route to a hedge. A wrong self-count at the master gate is worse
  // than a clunky question, and nobody is forced to guess. The record-model
  // version is backlogged alongside NY's and MI's count logic.
  // ==========================================================================
  UT: {
    code: 'UT',
    name: 'Utah',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave1_Draft_Package.md',
    terminology:
      'Utah says EXPUNGEMENT, and it covers what other states split into sealing and expungement. '
      + 'Two tracks. PETITION expungement requires a Certificate of Eligibility from the Bureau of '
      + 'Criminal Identification (BCI) FIRST — the court will not accept a petition without one, and '
      + 'BCI reviews your full history including out-of-state records. So the petition path ends at '
      + '"apply to BCI", not "file with the court". AUTOMATIC ("Clean Slate") expungement needs no '
      + 'petition and no fee, but reaches misdemeanour-level offences only; felonies are '
      + 'petition-only. Counter-intuitively, the petition periods are SHORTER than the automatic '
      + 'ones for the same offence, so petitioning can be faster than waiting.',
    keyDates: [
      {
        label: 'Automatic expungement process changed — form requirement ended, courts self-identify',
        date: '2026-01-01',
        kind: 'effective',
        note: 'Confirm the current process description before writing UI copy.',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the court filing fee for a Petition to Expunge Records, and if there is one, can it be waived? Wave 1 gives "~$135 per one source" and marks it VERIFY BY PHONE — one source and an approximation is not a fee. Ask both halves: the waiver answer is only knowable once the fee is.',
        blocksFields: ['resources.remedies.petition.fees', 'resources.remedies.petition.feeWaiver'],
      },
      {
        question:
          'The automatic-expungement process changed on Jan 1, 2026 — the form requirement ended and courts self-identify cases again. Confirm the current process on the utcourts self-help page, and confirm how a person checks whether their case was already auto-expunged.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the petition-vs-automatic period split against §§ 77-40a-303 and -205 directly. The same offence has a SHORTER petition period than automatic period (class C: 3 years petition vs 5 years automatic), which is counter-intuitive enough to be a transcription error somewhere. Both tracks are encoded separately and the tree tells people plainly that petitioning is faster — if the inversion is wrong, that advice is wrong.',
        blocksFields: [],
      },
      {
        question:
          'BCI posts which date it is currently processing, and the backlog is real. What is the actual wait now? No duration is asserted anywhere in the app until this is answered.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions (including pleas in abeyance) treated for expungement? Not covered in Wave 1 — standing call-sheet question for every state. The tree hedges these rather than guess.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 77-40a-303(4)/(5) count limits and the § 303(8) "+1 if 10 years clean" allowance. The tree asks a person to self-assess this four-clause test because the record model cannot compute it; if the clauses are wrong, the master gate is wrong.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Utah Code § 77-40a-301 (petition expungement)', url: null, retrievedOn: null },
      { id: 'Utah Code § 77-40a-303 (waiting periods; count limits; disqualifiers)', url: null, retrievedOn: null },
      { id: 'Utah Code § 77-40a-304 (petition expungement procedure)', url: null, retrievedOn: null },
      { id: 'Utah Code §§ 77-40a-202 through -206 (automatic "Clean Slate" expungement)', url: null, retrievedOn: null },
      { id: 'Utah Code § 77-40a-205 (automatic expungement periods)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'pending_charges_ut' },
            { label: 'Dismissed', value: 'dismissed', next: 'dismissal_prejudice_ut' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_acquittal_ut' },
            { label: 'Deferred adjudication / Plea in abeyance / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        pending_charges_ut: {
          type: 'boolean',
          text: 'Do you have any criminal charges pending against you right now?',
          yes: 'ineligible_pending_ut',
          no: 'count_limits_ut'
        },
        // The § 303(4)/(5) master gate. Asked, not computed: it is a test over a
        // whole history and the record model holds one charge at a time.
        count_limits_ut: {
          type: 'choice',
          text: 'Counting every separate criminal episode on your record — not just this case, and including any out-of-state convictions, since BCI reviews your full history — does ANY of these describe you? (a) two or more felonies that were not drug offenses; (b) three or more convictions of any kind, of which two or more are class A misdemeanors; (c) four or more convictions, of which three or more are class B misdemeanors; or (d) five or more convictions of any degree. If ten or more years have passed clean since your last conviction, you are allowed one more than each number above.',
          options: [
            { label: 'No — none of those describe me', value: 'within', next: 'supervision_ut' },
            { label: 'Yes — at least one describes me', value: 'over_limits', next: 'ineligible_counts_ut' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_counts_ut' }
          ]
        },
        supervision_ut: {
          type: 'boolean',
          text: 'Are you currently incarcerated, on probation, or on parole?',
          yes: 'ineligible_supervision_ut',
          no: 'disqualifiers_ut'
        },
        disqualifiers_ut: {
          type: 'boolean',
          text: 'Was this offense a capital felony, a first-degree felony, a violent felony, a felony DUI, or an offense requiring registration as a sex offender or child-abuse offender?',
          yes: 'ineligible_serious_ut',
          no: 'restitution_ut'
        },
        restitution_ut: {
          type: 'boolean',
          field: 'restitution_paid',
          text: 'Have you paid all fines, fees and restitution in full?',
          yes: 'offense_level_ut',
          no: 'ineligible_restitution_ut'
        },
        // Utah's classes. Asked — the form has no class field, and asking is how
        // a state's own vocabulary reaches the person.
        offense_level_ut: {
          type: 'choice',
          text: 'What was the level and class of the offense? (It appears on your sentencing paperwork, or on the criminal history BCI will review.)',
          options: [
            { label: 'Felony (other than capital, first-degree, violent, or DUI)', value: 'felony', next: 'closure_felony_ut' },
            { label: 'Misdemeanor DUI or impaired driving', value: 'dui', next: 'closure_dui_ut' },
            { label: 'Class A Misdemeanor — drug possession', value: 'a_drug', next: 'closure_a_drug_ut' },
            { label: 'Class A Misdemeanor — anything else', value: 'a_nondrug', next: 'closure_a_ut' },
            { label: 'Class B Misdemeanor', value: 'b', next: 'closure_b_ut' },
            { label: 'Class C Misdemeanor or Infraction', value: 'c', next: 'closure_c_ut' }
          ]
        },
        // Every closure date node ASKS. Utah's clock runs from CASE CLOSURE —
        // sentence complete AND fines and restitution paid — which is not the
        // date the form collects and can land years after it.
        closure_dui_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'eligible_bci_apply_ut',
            nextFail: 'waiting_ut'
          }
        },
        closure_felony_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'eligible_bci_apply_ut',
            nextFail: 'waiting_ut'
          }
        },
        // Class A drug possession: petition 7 yrs, automatic 7 yrs. The periods
        // coincide, so past the threshold BOTH have arrived — check first.
        closure_a_drug_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'check_record_first_ut',
            nextFail: 'waiting_ut'
          }
        },
        // Class A non-drug: petition 5 yrs, and NO automatic track reaches it.
        closure_a_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'eligible_bci_apply_ut',
            nextFail: 'waiting_ut'
          }
        },
        // Class B: petition at 4, automatic at 6. Between them, petitioning wins.
        closure_b_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'closure_b_auto_ut',
            nextFail: 'waiting_ut'
          }
        },
        closure_b_auto_ut: {
          type: 'date',
          text: 'And again, so we can check the automatic track: when did your case close?',
          validation: {
            period: { amount: 6, unit: 'years', anchor: 'case closure — automatic expungement period for a class B misdemeanour (§ 77-40a-205)' },
            nextPass: 'check_record_first_ut',
            nextFail: 'eligible_petition_faster_ut'
          }
        },
        // Class C / infraction: petition at 3, automatic at 5.
        closure_c_ut: {
          type: 'date',
          text: 'When did your case close — that is, when did you finish your sentence AND finish paying all fines, fees and restitution, whichever came last?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'case closure — sentence complete and all fines, fees and restitution paid' },
            nextPass: 'closure_c_auto_ut',
            nextFail: 'waiting_ut'
          }
        },
        closure_c_auto_ut: {
          type: 'date',
          text: 'And again, so we can check the automatic track: when did your case close?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'case closure — automatic expungement period for a class C misdemeanour or infraction (§ 77-40a-205)' },
            nextPass: 'check_record_first_ut',
            nextFail: 'eligible_petition_faster_ut'
          }
        },
        dismissal_prejudice_ut: {
          type: 'choice',
          text: 'Was the case dismissed WITH prejudice (it cannot be refiled) or WITHOUT prejudice (it could be refiled)? Your dismissal order says which.',
          options: [
            { label: 'With prejudice', value: 'with', next: 'closure_dismissal_30_ut' },
            { label: 'Without prejudice', value: 'without', next: 'closure_dismissal_180_ut' },
            { label: 'I don\'t know / Not sure', value: 'unsure', next: 'closure_dismissal_180_ut' }
          ]
        },
        // Dismissals read the record: the anchor IS the dismissal, which is the
        // disposition the form already collected.
        closure_dismissal_30_ut: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case dismissed?',
          validation: {
            period: { amount: 30, unit: 'days', anchor: 'date of dismissal with prejudice' },
            nextPass: 'eligible_dismissal_ut',
            nextFail: 'waiting_dismissal_ut'
          }
        },
        closure_dismissal_180_ut: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case dismissed?',
          validation: {
            period: { amount: 180, unit: 'days', anchor: 'date of dismissal without prejudice' },
            nextPass: 'eligible_dismissal_ut',
            nextFail: 'waiting_dismissal_ut'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Utah\'s paths split sharply on how the case ended: a dismissal can be expunged in as little as 30 days, an acquittal is handled automatically, and a conviction runs through the BCI certificate process with waiting periods of 3 to 10 years. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Ask the clerk of the court that handled your case for a copy of the disposition, or request your criminal history from the Utah Bureau of Criminal Identification. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (Utah BCI / court clerk)',
          citation: 'Utah Code § 77-40a-301 et seq. (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Utah\'s expungement rules are screened here for convictions, dismissals, and acquittals. How a completed deferral, diversion, or plea in abeyance is treated is not something this screening has researched yet, and we would rather tell you that than guess — a guess here could point you at the wrong remedy, or tell you that you have none when you do. Clean Slate Utah and Utah Legal Services can confirm how your case was actually disposed and which path fits.',
          remedy: 'Consult Legal Aid (Deferral / Diversion Not Yet Screened)',
          citation: 'Utah Code § 77-40a-301 et seq. (treatment of deferrals not yet researched)'
        },
        eligible_acquittal_ut: {
          status: 'eligible',
          title: 'Acquittal — Expungement Should Be Automatic',
          // No computed date: Wave 1 says "~60 days" and the tilde is the
          // package hedging. The result inherits the hedge rather than turning
          // an approximation into a deadline.
          message: 'Because you were found not guilty, the expungement of this case should happen automatically — you do not need to petition and you do not need a Certificate of Eligibility. Wave 1 research puts the timeframe at roughly 60 days, but that is an approximation and we are not going to hand you a date built on it. Contact the Utah Bureau of Criminal Identification to confirm the expungement was processed. If it was not, Clean Slate Utah can help you find out why.',
          remedy: 'Automatic Expungement After Acquittal — confirm with BCI',
          citation: 'Utah Code §§ 77-40a-202 through -206'
        },
        eligible_dismissal_ut: {
          status: 'eligible',
          title: 'Dismissed Case — Potentially Expungeable Now',
          message: 'Because your case was dismissed, the waiting period is short: 30 days when the dismissal was with prejudice, 180 days when it was without. Based on your dates, that period appears to have passed. You will still need a Certificate of Eligibility from the Utah Bureau of Criminal Identification before the court will take a petition — but there is no issuance fee for dismissals, only the $65 application fee. Apply to BCI first; the court cannot act without the certificate.',
          remedy: 'Apply to BCI for a Certificate of Eligibility, then Petition to Expunge',
          citation: 'Utah Code §§ 77-40a-303, 77-40a-304'
        },
        waiting_dismissal_ut: {
          status: 'waiting',
          title: 'Dismissed Case — Short Wait Not Yet Met',
          message: 'Dismissed cases have Utah\'s shortest waiting periods: 30 days if the case was dismissed with prejudice, 180 days if it was dismissed without prejudice. Based on your dates that period has not run yet. Come back when it has — and if you are not sure which kind of dismissal you got, your dismissal order says, and the difference here is five months.',
          remedy: 'Wait, then apply to BCI for a Certificate of Eligibility',
          citation: 'Utah Code § 77-40a-303'
        },
        // The BCI-first ending. This is the structural fact most tools miss.
        eligible_bci_apply_ut: {
          status: 'eligible',
          title: 'Potentially Eligible — Start With BCI, Not the Court',
          message: 'Based on your dates, the waiting period for your offense appears to have passed. Utah\'s process starts somewhere people do not expect: you must get a Certificate of Eligibility from the Bureau of Criminal Identification BEFORE the court will accept a petition. The court cannot act without it. BCI reviews your ENTIRE criminal history for this — including out-of-state records — not just the case you want expunged, so anything anywhere can affect the answer. The application costs $65, plus $65 per conviction case when the certificate issues. One thing worth planning around: the certificate is only valid for 180 days once issued, so do not request it until you are ready to file the petition — an expired certificate means paying again. BCI publishes which date\'s applications it is currently processing; check that before you count on any timeline.',
          remedy: 'BCI Certificate of Eligibility, then Petition to Expunge Records',
          citation: 'Utah Code §§ 77-40a-301, 77-40a-303, 77-40a-304'
        },
        // The inversion, said plainly.
        eligible_petition_faster_ut: {
          status: 'eligible',
          title: 'Petitioning Now Is Faster Than Waiting',
          message: 'Here is something counterintuitive, and it is worth reading twice: for your offense, petitioning now is FASTER than waiting for Utah\'s automatic system to reach you. Utah has automatic ("Clean Slate") expungement that needs no petition and costs nothing — but its waiting period is LONGER than the petition\'s for the same offense. A class C misdemeanor can be petitioned at 3 years but is not automatically expunged until 5; a class B at 4 years versus 6. Based on your dates you have passed the petition threshold but not the automatic one, so waiting would cost you time you do not have to spend. If you would rather not pay and not file, you can wait — but you would be waiting longer on purpose. To petition: get a Certificate of Eligibility from the Bureau of Criminal Identification first ($65, plus $65 per conviction case at issuance, valid 180 days), then file the Petition to Expunge Records in the court that handled the case. We are still verifying these periods against the statute — that shorter-petition-than-automatic split is unusual enough that we want it confirmed.',
          remedy: 'Petition now (BCI Certificate, then Petition to Expunge) — do not wait for automatic',
          citation: 'Utah Code §§ 77-40a-303 (petition periods), 77-40a-205 (automatic periods)'
        },
        // Check-record-first, Wave 1 flag 2.
        check_record_first_ut: {
          status: 'eligible',
          title: 'Your Record May Already Be Clear — Check Before You File',
          message: 'Start here, not with a petition or a fee. Utah expunges eligible misdemeanor-level offenses AUTOMATICALLY under its Clean Slate law — no petition, no application, no cost, and nobody tells you it happened. Based on your dates you are past the automatic period for your offense, so there is a real chance this is already done. Find out before you spend anything: contact the Bureau of Criminal Identification and ask what your record shows now. If the automatic system reached you, you are finished. If it missed you, the petition path is still open — a Certificate of Eligibility from BCI first, then a Petition to Expunge in the court that handled the case. One caution: the automatic process changed on January 1, 2026, and we are still confirming how a person checks their status under the new process, so ask BCI directly rather than relying on older guidance.',
          remedy: 'Check with BCI first — petition only if automatic relief missed you',
          citation: 'Utah Code §§ 77-40a-202 through -206'
        },
        waiting_ut: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Utah\'s waiting periods run from CASE CLOSURE — which means the later of finishing your sentence and finishing payment of every fine, fee and restitution amount. Unpaid restitution does not just block the petition; it stops the clock from starting. The periods are 10 years for a misdemeanor DUI, 7 years for an eligible felony or a class A drug possession, 5 years for other class A misdemeanors, 4 years for a class B, and 3 years for a class C or infraction. Based on your dates, yours has not run yet. If you have an unpaid balance, paying it off is the single thing that starts your clock.',
          remedy: 'Wait for the period to run, then apply to BCI',
          citation: 'Utah Code § 77-40a-303'
        },
        ineligible_pending_ut: {
          status: 'ineligible',
          title: 'Pending Charges Block Expungement',
          message: 'Utah will not expunge a record while you have criminal charges pending. This is not a permanent no — once the pending case resolves, come back and run this again. How that case ends will also affect what you are eligible for, so it is worth waiting for the outcome before planning anything.',
          remedy: 'None Yet (Pending Charges)',
          citation: 'Utah Code § 77-40a-303(2)'
        },
        ineligible_counts_ut: {
          status: 'ineligible',
          title: 'Conviction History Exceeds Utah\'s Limits',
          message: 'Utah caps how much can be expunged across a person\'s whole record, not just per case. Based on what you told us, your history is over one of those caps: two or more non-drug felonies; three or more convictions with two or more class A misdemeanors; four or more with three or more class B misdemeanors; or five or more convictions of any degree. One thing worth knowing: if ten or more years pass clean since your last conviction, Utah allows one more than each of those numbers — so this can change with time. A pardon is a separate path that these caps do not govern. Clean Slate Utah can look at the whole picture with you; the counting rules are genuinely intricate and worth a person\'s eyes.',
          remedy: 'Consult Legal Aid (History Exceeds Statutory Caps)',
          citation: 'Utah Code § 77-40a-303(4), (5), (8)'
        },
        complex_counts_ut: {
          status: 'complex',
          title: 'Your Conviction History Needs Counting — By a Person',
          message: 'Utah\'s eligibility turns on a count across your ENTIRE record before anything about this specific case matters, and the counting rules are intricate: two or more non-drug felonies; three or more convictions with two or more class A misdemeanors; four or more with three or more class B misdemeanors; or five or more of any degree — with one extra allowed on each if you have been ten years clean. Since you are not sure where you fall, we are not going to guess: getting this wrong would send you down the wrong path entirely. Two ways to find out: BCI reviews your full history (including out-of-state records) as part of the Certificate of Eligibility process, so applying will answer it definitively. Or Clean Slate Utah can look at your record with you first, which costs nothing.',
          remedy: 'Get Your Full History Counted (BCI or Clean Slate Utah)',
          citation: 'Utah Code § 77-40a-303(4), (5), (8)'
        },
        ineligible_supervision_ut: {
          status: 'ineligible',
          title: 'Not While You Are Under Supervision',
          message: 'Utah will not expunge a record while you are incarcerated, on probation, or on parole. This is a timing bar, not a permanent one. Note also that Utah\'s waiting period does not begin at sentencing — it begins at case closure, meaning the later of finishing your sentence and paying every fine, fee and restitution amount in full. So the clock starts when supervision ends and the balance is zero.',
          remedy: 'None Yet (Active Supervision)',
          citation: 'Utah Code § 77-40a-303(2)'
        },
        ineligible_serious_ut: {
          status: 'ineligible',
          title: 'Excluded Offense',
          message: 'Capital felonies, first-degree felonies, violent felonies, felony DUI, and offenses requiring registration as a sex offender or child-abuse offender are excluded from expungement in Utah. That exclusion is in the statute itself, so no waiting period changes it. A pardon from the Board of Pardons and Parole is a separate remedy that is not governed by these rules — Clean Slate Utah or Utah Legal Services can tell you whether it is worth pursuing in your situation.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid About a Pardon',
          citation: 'Utah Code § 77-40a-303(2)'
        },
        ineligible_restitution_ut: {
          status: 'ineligible',
          title: 'Unpaid Balance Blocks — And Stops the Clock',
          message: 'Utah requires all fines, fees and restitution to be paid before an expungement, and there is a second thing here that catches people out: the waiting period runs from CASE CLOSURE, and your case does not close until that balance is zero. So an unpaid balance is not just a blocker at the end — it means your waiting period has not started at all. Paying it off is the single most useful thing you can do, and the clock starts the day you do. Ask the court clerk what your current balance is; Clean Slate Utah offers fee assistance and may be able to help.',
          remedy: 'Pay the Balance in Full — that starts your waiting period',
          citation: 'Utah Code § 77-40a-303'
        }
      }
    },
    resources: {
      remedies: {
        bci_certificate: {
          name: 'BCI Certificate of Eligibility (required before any petition)',
          formName: 'BCI Expungement Application',
          formUrl: 'https://bci.utah.gov/expungements/',
          steps: [
            'Apply to the Bureau of Criminal Identification for a Certificate of Eligibility — the court will not accept a petition without one.',
            'BCI reviews your FULL criminal history, including out-of-state records, not just the case you want expunged.',
            'BCI posts which date\'s applications it is currently processing; check that before counting on a timeline.',
            'A certificate is valid for 180 days once issued — do not request it before you are ready to file, or you will pay for it twice.'
          ],
          fees: '$65 application fee, plus $65 per conviction case when the certificate issues. No issuance fee for dismissals or acquittals.',
          feeWaiver: 'An indigency waiver exists for the BCI fees.',
          courtContact: 'Utah Bureau of Criminal Identification (BCI)'
        },
        petition: {
          name: 'Petition to Expunge Records',
          formName: 'Petition to Expunge Records',
          formUrl: 'https://utcourts.gov/en/self-help/case-categories/criminal-justice/expunge.html',
          steps: [
            'Obtain your BCI Certificate of Eligibility first — this petition cannot be filed without it.',
            'File the Petition to Expunge Records in the court that handled the case.',
            'File within 180 days of the certificate issuing, or it expires and you start over.'
          ],
          // null: Wave 1 gives "~$135 per one source" and says VERIFY BY PHONE.
          fees: null,
          // Dependent: whether a waiver applies is unknowable while the fee is.
          feeWaiver: null,
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Clean Slate Utah (fee assistance available)', url: 'https://cleanslateutah.org' },
        { name: 'Utah Legal Services', url: 'https://utahlegalservices.org' }
      ]
    }
  },

  // ==========================================================================
  // MICHIGAN — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave1_Draft_Package.md
  //
  // Three tracks: petition set-aside (MCL 780.621), automatic set-aside
  // (MCL 780.621g, live since Apr 11, 2023), and a marijuana misdemeanour fast
  // path (MCL 780.621e) with NO waiting period — asked first, because it beats
  // both.
  //
  // The two tracks have DIFFERENT exclusion lists and DIFFERENT clocks, and
  // that asymmetry is the whole shape of this state:
  //   - Automatic excludes far more (assaultive, serious misdemeanours,
  //     dishonesty, 10+yr offences, offences involving minors/vulnerable
  //     adults/injury/death, trafficking, OWI, injurious traffic, CDL
  //     commercial traffic). Its clock runs from SENTENCING.
  //   - Petition excludes less (life-punishable felonies, most CSC, injurious
  //     traffic, trafficking, terrorism). Its clock runs from the LATEST of
  //     sentencing, release from imprisonment, or discharge from probation or
  //     parole — three events, and the tree asks for that date directly.
  // So an offence excluded from automatic is often still petitionable, and OWI
  // is exactly that case: petitionable at the court's discretion since Feb
  // 2022, never automatic.
  //
  // NOT COVERED BY WAVE 1: non-convictions. The package documents only
  // convictions, so dismissals and acquittals hedge rather than guess.
  //
  // The "One Bad Night" rule (MCL 780.621b) — multiple offences inside 24 hours
  // from one transaction count as ONE conviction — has no representation: it is
  // a rule about relationships between records, and the record model holds one
  // charge. Open question; third state needing count logic (NY, UT, MI).
  // ==========================================================================
  MI: {
    code: 'MI',
    name: 'Michigan',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave1_Draft_Package.md',
    terminology:
      'Michigan says SET ASIDE. That is the statutory term; almost everyone says "expungement", and '
      + 'they mean the same thing. Three tracks: a PETITION set-aside (MCL 780.621, form MC 227), an '
      + 'AUTOMATIC set-aside (MCL 780.621g, running since April 2023, no petition and no fee), and a '
      + 'MARIJUANA misdemeanour fast path (MCL 780.621e) with no waiting period at all. The two main '
      + 'tracks exclude different offences and count from different dates, so an offence that will '
      + 'never be set aside automatically may still be petitionable. One thing people are caught out '
      + 'by: setting aside a traffic offence does NOT clear your Secretary of State driving record.',
    keyDates: [
      {
        label: 'Automatic set-aside (MCL 780.621g) live',
        date: '2023-04-11',
        kind: 'operative',
        note: 'Records have been setting aside automatically since this date, with no petition and no notice to the person.',
      },
      {
        label: 'First-offence OWI became petitionable (court discretion)',
        date: '2022-02',
        kind: 'effective',
        note: 'Wave 1 gives month and year only ("since Feb 2022"). OWI remains excluded from the automatic track.',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the fee to file a set-aside application, and if there is one, can it be waived? Wave 1 gives "$50 fee to Michigan State Police" and marks it "widely cited but VERIFY BY PHONE — it is on the MC 227 instructions". Widely cited is not a source. Ask about the RI-008 fingerprint card fee at the same time — Wave 1 calls it "small" without giving a number, so it is not stated anywhere in the app.',
        blocksFields: ['resources.remedies.petition.fees', 'resources.remedies.petition.feeWaiver'],
      },
      {
        question:
          'Confirm the automatic set-aside exclusion list against MCL 780.621g, and confirm it really is broader than the petition exclusion list in MCL 780.621c. The tree asks a person to self-assess both lists; if either is wrong or if they are not actually different, the track fork is wrong.',
        blocksFields: [],
      },
      {
        question:
          'The "One Bad Night" rule (MCL 780.621b) — multiple offences within 24 hours arising from the same transaction count as ONE conviction, except for assaultive, weapon, or 10+ year offences — has no representation in the tree. It changes the count that decides the waiting period, and the record model cannot express relationships between charges.',
        blocksFields: [],
      },
      {
        question:
          'How are non-convictions treated? Wave 1 documents only convictions for Michigan — dismissals and acquittals are not covered at all, so the tree hedges them. What relief exists for a dismissed charge or an acquittal?',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions (including HYTA and 7411 dispositions) treated for set-aside? Not covered in Wave 1 — standing call-sheet question for every state.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the automatic-track count limits: max 2 felonies and 4 misdemeanours of 93 days or more set aside automatically, with unlimited 92-day-or-less misdemeanours. The tree does not gate on these — it cannot count — so a person past the limits may be told to check a record that will never clear on its own.',
        blocksFields: [],
      },
      {
        question:
          'What is the exact effective date of the first-offence OWI petition path? Wave 1 gives month and year only ("since Feb 2022").',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Mich. Comp. Laws § 780.621 (petition set-aside)', url: null, retrievedOn: null },
      { id: 'Mich. Comp. Laws § 780.621b ("One Bad Night" — same-transaction offences count as one)', url: null, retrievedOn: null },
      { id: 'Mich. Comp. Laws § 780.621c (petition-track exclusions)', url: null, retrievedOn: null },
      { id: 'Mich. Comp. Laws § 780.621d (petition waiting periods)', url: null, retrievedOn: null },
      { id: 'Mich. Comp. Laws § 780.621e (marijuana misdemeanour set-aside)', url: null, retrievedOn: null },
      { id: 'Mich. Comp. Laws § 780.621g (automatic set-aside)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'pending_charges_mi' },
            { label: 'Dismissed', value: 'dismissed', next: 'unknown_nonconviction_mi' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'unknown_nonconviction_mi' },
            { label: 'Deferred adjudication / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        pending_charges_mi: {
          type: 'boolean',
          text: 'Do you have any criminal charges pending against you right now?',
          yes: 'ineligible_pending_mi',
          no: 'marijuana_mi'
        },
        // Asked first: MCL 780.621e has no waiting period and a rebuttable
        // presumption of eligibility, so it beats both other tracks outright.
        marijuana_mi: {
          type: 'boolean',
          text: 'Was this a misdemeanor marijuana offense — conduct that would not be a crime now that recreational marijuana is legal in Michigan?',
          yes: 'eligible_marijuana_mi',
          no: 'petition_excluded_mi'
        },
        petition_excluded_mi: {
          type: 'boolean',
          text: 'Was the offense any of these: a felony punishable by life imprisonment, most criminal sexual conduct offenses, a traffic offense that caused injury or death, a human-trafficking-related offense, or a terrorism-related offense?',
          yes: 'ineligible_serious_mi',
          no: 'owi_mi'
        },
        // OWI is the case that proves the two lists differ: excluded from
        // automatic, but petitionable at the court's discretion since Feb 2022.
        owi_mi: {
          type: 'boolean',
          text: 'Was this a first-offense OWI (operating while intoxicated)?',
          yes: 'complex_owi_mi',
          no: 'auto_excluded_mi'
        },
        auto_excluded_mi: {
          type: 'boolean',
          text: 'Is the offense any of these: an assaultive crime, a "serious misdemeanor", a crime of dishonesty, an offense punishable by 10 or more years, an offense involving a minor or a vulnerable adult, an offense causing injury or death, human trafficking, a traffic offense causing injury or death, or a commercial traffic offense committed while holding a CDL? (These are excluded from Michigan\'s AUTOMATIC set-aside — a petition may still be possible.)',
          yes: 'petition_counts_mi',
          no: 'auto_level_mi'
        },
        // Check-record-first (Wave 1 flag 2): automatic has been running since
        // April 2023 and nobody is told when it fires.
        auto_level_mi: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'auto_date_misd_mi' },
            { label: 'Felony', value: 'felony', next: 'auto_date_felony_mi' },
            { label: 'Infraction', value: 'infraction', next: 'petition_counts_mi' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'petition_counts_mi' }
          ]
        },
        auto_date_misd_mi: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you sentenced?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'sentencing (MCL 780.621g automatic set-aside, misdemeanours)' },
            nextPass: 'check_record_first_mi',
            nextFail: 'petition_counts_mi'
          }
        },
        auto_date_felony_mi: {
          type: 'date',
          text: 'When were you sentenced, or released from an MDOC facility — whichever came later?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'sentencing, or release from MDOC — whichever is later (MCL 780.621g, felonies)' },
            nextPass: 'check_record_first_mi',
            nextFail: 'petition_counts_mi'
          }
        },
        // The petition waiting period is set by the COUNT, not by this offence's
        // class — so the person is asked about their whole record.
        petition_counts_mi: {
          type: 'choice',
          text: 'Thinking about your whole record, not just this case: which describes you best? (Michigan allows up to 3 felonies and unlimited misdemeanors to be set aside in a lifetime, and at most 2 assaultive crimes.)',
          options: [
            { label: 'Misdemeanors only, none of them "serious misdemeanors"', value: 'misd_nonserious', next: 'petition_date_3_mi' },
            { label: 'One felony, or misdemeanors including a "serious misdemeanor"', value: 'one_felony_or_serious', next: 'petition_date_5_mi' },
            { label: 'More than one felony (up to 3 total)', value: 'multiple_felonies', next: 'petition_date_7_mi' },
            { label: 'More than 3 felonies, or more than 2 assaultive crimes', value: 'over_limits', next: 'ineligible_counts_mi' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_counts_mi' }
          ]
        },
        // All three ASK: the petition clock runs from the LATEST of three
        // events, which is not the date the form collects.
        petition_date_3_mi: {
          type: 'date',
          text: 'Which came LAST: your sentencing, your release from jail or prison, or your discharge from probation or parole? Enter that date.',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'the LATEST of sentencing, release from imprisonment, or discharge from probation/parole (MCL 780.621d)' },
            nextPass: 'new_convictions_mi',
            nextFail: 'waiting_mi'
          }
        },
        petition_date_5_mi: {
          type: 'date',
          text: 'Which came LAST: your sentencing, your release from jail or prison, or your discharge from probation or parole? Enter that date.',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'the LATEST of sentencing, release from imprisonment, or discharge from probation/parole (MCL 780.621d)' },
            nextPass: 'new_convictions_mi',
            nextFail: 'waiting_mi'
          }
        },
        petition_date_7_mi: {
          type: 'date',
          text: 'Which came LAST: your sentencing, your release from jail or prison, or your discharge from probation or parole? Enter that date.',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'the LATEST of sentencing, release from imprisonment, or discharge from probation/parole (MCL 780.621d)' },
            nextPass: 'new_convictions_mi',
            nextFail: 'waiting_mi'
          }
        },
        new_convictions_mi: {
          type: 'boolean',
          text: 'Have you been convicted of anything new since that date?',
          yes: 'ineligible_new_conviction_mi',
          no: 'eligible_petition_mi'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Michigan\'s set-aside rules turn entirely on how the case ended, and the paths do not resemble each other. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your criminal history from the Michigan State Police, or ask the clerk of the convicting court for a certified copy of the disposition. Once you know the outcome, come back and run this again.',
          remedy: 'Get Your Record First (Michigan State Police)',
          citation: 'Mich. Comp. Laws § 780.621 et seq. (which path applies depends on the disposition)'
        },
        unknown_nonconviction_mi: {
          status: 'complex',
          title: 'Dismissals and Acquittals Are Not Screened Here Yet',
          message: 'Michigan\'s set-aside statutes are about convictions, and that is what this screening has researched. What happens to a dismissed charge or an acquittal in Michigan is not something we have verified yet, and we would rather tell you that than guess — the answer is usually better than for a conviction, not worse, so it is worth asking someone. Michigan Legal Help has a free online tool and Safe & Just Michigan can point you at the right process.',
          remedy: 'Consult Legal Aid (Non-Convictions Not Yet Screened)',
          citation: 'Mich. Comp. Laws § 780.621 et seq. (non-convictions not yet researched)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Michigan\'s set-aside rules are screened here for convictions. How a completed deferral or diversion is treated — including dispositions under HYTA or section 7411, which Michigan uses often — is not something this screening has researched yet, and we would rather tell you that than guess. Michigan Legal Help or Safe & Just Michigan can confirm how your case was actually disposed and which path fits.',
          remedy: 'Consult Legal Aid (Deferral / Diversion Not Yet Screened)',
          citation: 'Mich. Comp. Laws § 780.621 et seq. (treatment of deferrals not yet researched)'
        },
        eligible_marijuana_mi: {
          status: 'eligible',
          title: 'Marijuana Misdemeanor — The Fast Path',
          message: 'Because this was a misdemeanor marijuana offense for conduct that is now legal in Michigan, you can apply to set it aside under MCL 780.621e — and this is the best route Michigan has. There is NO waiting period, so you can apply today, and the law presumes you are eligible: the prosecutor has to rebut that presumption rather than you having to prove it. The form is MC 227a, filed in the court that convicted you. Do this before considering the ordinary petition path; it is faster and the burden is on the other side.',
          remedy: 'Application to Set Aside Marijuana Conviction (form MC 227a, MCL 780.621e)',
          citation: 'Mich. Comp. Laws § 780.621e'
        },
        check_record_first_mi: {
          status: 'eligible',
          title: 'Your Record May Already Be Set Aside — Check Before You File',
          message: 'Start here, not with an application or a fee. Michigan has been setting records aside AUTOMATICALLY since April 2023 under MCL 780.621g — no petition, no fee, and nobody tells you it happened. Misdemeanors qualify 7 years after sentencing; felonies 10 years after sentencing or release from an MDOC facility, whichever is later. Based on your dates you are past that, and the offense you described is not on the automatic exclusion list — so there is a real chance this is already done. Find out before you spend anything: request your criminal history from the Michigan State Police and see what it shows. If the automatic system reached you, you are finished. If it missed you — and there are caps on how much clears automatically, at most 2 felonies and 4 misdemeanors of 93 days or more — the petition path under MCL 780.621 is still open. One thing to know either way: a set-aside does not clear your Secretary of State driving record.',
          remedy: 'Check with Michigan State Police first — petition (form MC 227) only if automatic relief missed you',
          citation: 'Mich. Comp. Laws §§ 780.621g, 780.621'
        },
        eligible_petition_mi: {
          status: 'eligible',
          title: 'Potentially Eligible to Petition for a Set-Aside',
          message: 'Based on your dates and your record, you appear potentially eligible to apply to set this conviction aside under MCL 780.621. File form MC 227 in the court that convicted you (MC 227a if it is a marijuana misdemeanor). You will need a certified copy of the conviction and a fingerprint card (form RI-008, taken at a local law enforcement agency for a small fee), and you must serve copies on the Attorney General and the prosecuting agency. A hearing is usually required, so expect to appear. Michigan Legal Help has a free guided interview that fills the form out with you — it is worth using. Two things worth knowing: setting aside a traffic offense does NOT clear your Secretary of State driving record, and the fee amount is one of the things we are still verifying.',
          remedy: 'Application to Set Aside Conviction (form MC 227, MCL 780.621)',
          citation: 'Mich. Comp. Laws §§ 780.621, 780.621d'
        },
        waiting_mi: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Michigan\'s petition waiting period runs from whichever came LAST: your sentencing, your release from jail or prison, or your discharge from probation or parole. It is 3 years for misdemeanors that are not "serious misdemeanors", 5 years for one felony or for serious misdemeanors, and 7 years where you have more than one felony. Based on your dates, yours has not run yet. Note that a new conviction during the wait restarts the clock — staying conviction-free is what gets you there. Separately, Michigan sets many records aside automatically 7 years (misdemeanors) or 10 years (felonies) after sentencing, so even if you never file, relief may arrive on its own.',
          remedy: 'Wait for the period to run, then file form MC 227',
          citation: 'Mich. Comp. Laws § 780.621d'
        },
        complex_owi_mi: {
          status: 'complex',
          title: 'First-Offense OWI — Possible, But the Court Decides',
          message: 'A first-offense OWI sits in an unusual spot in Michigan, and it is worth understanding why. Since February 2022 you CAN petition to set it aside — but it is discretionary, meaning the judge decides rather than the statute deciding for them. And it is excluded from Michigan\'s automatic set-aside entirely, so waiting will not clear it: nothing happens unless you file. That combination is exactly the situation where a person makes the difference, so this is not a screening we should finish for you. Michigan Legal Help and Safe & Just Michigan both handle OWI set-asides, and the Attorney General runs expungement clinics. Note too that setting aside an OWI does not clear your Secretary of State driving record.',
          remedy: 'Consult Legal Aid (Discretionary OWI Petition; Never Automatic)',
          citation: 'Mich. Comp. Laws §§ 780.621, 780.621g'
        },
        ineligible_pending_mi: {
          status: 'ineligible',
          title: 'Pending Charges Block a Set-Aside',
          message: 'Michigan will not set a record aside while you have criminal charges pending, and pending charges also stop the automatic track. This is not a permanent no — once the pending case resolves, come back and run this again. How that case ends will affect what you are eligible for, so it is worth waiting for the outcome before planning anything.',
          remedy: 'None Yet (Pending Charges)',
          citation: 'Mich. Comp. Laws §§ 780.621, 780.621g'
        },
        ineligible_serious_mi: {
          status: 'ineligible',
          title: 'Excluded Offense',
          message: 'Felonies punishable by life imprisonment, most criminal sexual conduct offenses, traffic offenses that caused injury or death, human-trafficking-related offenses, and terrorism-related offenses cannot be set aside in Michigan — not by petition and not automatically. That exclusion is in the statute, so no waiting period changes it. If you are not certain your offense is on that list, it is worth checking with someone before you accept this answer: Michigan Legal Help is free and the Attorney General runs expungement clinics.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid',
          citation: 'Mich. Comp. Laws § 780.621c'
        },
        ineligible_counts_mi: {
          status: 'ineligible',
          title: 'Record Exceeds Michigan\'s Lifetime Caps',
          message: 'Michigan caps what can be set aside across a lifetime: at most 3 felonies, and at most 2 assaultive crimes. Misdemeanors are not capped. Based on what you told us, your record is over one of those caps. Two things worth knowing before you take this as final: the "One Bad Night" rule (MCL 780.621b) means multiple offenses from a single transaction within 24 hours can count as ONE conviction — which can bring a record back under the cap, and this screening cannot apply that rule for you. And a pardon is a separate path these caps do not govern. Michigan Legal Help or an Attorney General expungement clinic can count your record properly.',
          remedy: 'Consult Legal Aid (Record Exceeds Statutory Caps)',
          citation: 'Mich. Comp. Laws §§ 780.621, 780.621b'
        },
        complex_counts_mi: {
          status: 'complex',
          title: 'Your Record Needs Counting — By a Person',
          message: 'In Michigan the waiting period depends on your whole record, not on this one case: 3 years for misdemeanors, 5 for one felony or a "serious misdemeanor", 7 for multiple felonies — and there are lifetime caps of 3 felonies and 2 assaultive crimes. Since you are not sure where you fall, we are not going to guess. There is also a rule that could work in your favour and that we cannot apply for you: "One Bad Night" (MCL 780.621b) treats multiple offenses from one transaction within 24 hours as a single conviction. Michigan Legal Help has a free guided tool that walks your record with you, and the Attorney General runs expungement clinics.',
          remedy: 'Get Your Record Counted (Michigan Legal Help / AG clinic)',
          citation: 'Mich. Comp. Laws §§ 780.621b, 780.621d'
        },
        ineligible_new_conviction_mi: {
          status: 'ineligible',
          title: 'A New Conviction Restarted the Clock',
          message: 'Michigan requires you to stay conviction-free through the whole waiting period. A new conviction during that time restarts it, so the clock now runs from the most recent one rather than from the case you asked about. This is a timing bar, not a permanent one — the period is 3 years for misdemeanors, 5 for one felony or a serious misdemeanor, 7 for multiple felonies, counted from whichever came last: sentencing, release, or discharge from supervision. Come back and run this again using the newer conviction\'s dates.',
          remedy: 'None Yet (Waiting Period Restarted)',
          citation: 'Mich. Comp. Laws § 780.621d'
        }
      }
    },
    resources: {
      remedies: {
        petition: {
          name: 'Application to Set Aside Conviction (MCL 780.621)',
          formName: 'Form MC 227 (MC 227a for marijuana misdemeanors)',
          formUrl: 'https://www.courts.michigan.gov/492269/siteassets/forms/scao-approved/mc227.pdf',
          steps: [
            'Get a certified copy of the conviction from the convicting court.',
            'Get a fingerprint card (form RI-008) from a local law enforcement agency — there is a fee, which we have not verified.',
            'Complete form MC 227 (or MC 227a for a marijuana misdemeanor) and file it in the court that convicted you.',
            'Serve copies on the Michigan Attorney General and the prosecuting agency.',
            'Expect a hearing — one is usually required.',
            'Michigan Legal Help has a free guided interview that completes the form with you.'
          ],
          // null: Wave 1 gives "$50 to Michigan State Police" and marks it
          // "widely cited but VERIFY BY PHONE". Widely cited is not a source.
          fees: null,
          // Dependent: whether a waiver applies is unknowable while the fee is.
          feeWaiver: null,
          courtContact: 'The court that convicted you'
        },
        automatic: {
          name: 'Automatic Set-Aside (MCL 780.621g) — no application',
          formName: 'No application required',
          formUrl: 'https://www.michigan.gov/msp/services/criminal-justice-info-center/clean-slate',
          steps: [
            'Nothing to file — Michigan has been setting eligible records aside automatically since April 2023.',
            'Misdemeanors qualify 7 years after sentencing; felonies 10 years after sentencing or release from MDOC, whichever is later.',
            'You are not notified when it happens, so check your record rather than assume: request your criminal history from the Michigan State Police.',
            'Caps apply: at most 2 felonies and 4 misdemeanors of 93 days or more clear automatically. Misdemeanors of 92 days or less are unlimited.',
            'If automatic relief missed you, the petition path (form MC 227) is still open.'
          ],
          fees: '$0 — no application and no fee.',
          feeWaiver: 'Not applicable',
          courtContact: 'Michigan State Police (criminal history record check)'
        }
      },
      legalAid: [
        { name: 'Michigan Legal Help (free guided set-aside interview)', url: 'https://michiganlegalhelp.org' },
        { name: 'Safe & Just Michigan', url: 'https://safeandjustmi.org' }
      ]
    }
  },

  // ==========================================================================
  // PENNSYLVANIA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave1_Draft_Package.md
  //
  // THREE remedies that must not be blurred:
  //   1. EXPUNGEMENT (18 Pa.C.S. § 9122) — destruction, and NARROW: chiefly
  //      non-convictions, summary offences after 5 arrest-free years, people
  //      aged 70+, pardoned offences, and completed ARD.
  //   2. PETITION SEALING / "Order for Limited Access" (§ 9122.1, Rule 791) —
  //      misdemeanours after 7 conviction-free years; certain low-level
  //      drug/property felonies (total sentence under 7 years) after 10.
  //   3. AUTOMATIC CLEAN SLATE SEALING (§ 9122.2) — no petition, no fee.
  //
  // THE CONFLICT — and the first live use of a null period. Clean Slate 3.0
  // changed the automatic misdemeanour period and Wave 1's sources SPLIT on the
  // result: "7 for petition only" vs "7 for both". The package calls reading
  // § 9122.2 directly the #1 verify item for PA. A period whose sources
  // disagree is exactly the case where the value stays OUT: auto_misd_unknown_pa
  // carries `amount: null`, which the type forbids from having a pass/fail
  // branch, so the only route is nextUnknown → a result that says we do not know
  // and tells the person how to find out. The petition period (7 years) is NOT
  // in conflict, so it is encoded and the person is told they can file now.
  //
  // Fines/costs vs restitution: Wave 1 found a conflict (Clean Slate 2.0 removed
  // unpaid fines/costs as a barrier; one current source says restitution still
  // blocks) and says to encode the split ONLY if the statute confirms it. It
  // does not, yet — so NOTHING gates on it here. It is disclosed in prose and
  // held as an open question.
  // ==========================================================================
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave1_Draft_Package.md',
    terminology:
      'Pennsylvania has THREE different remedies and they are not interchangeable. EXPUNGEMENT '
      + '(18 Pa.C.S. § 9122) destroys the record but is narrow: mostly non-convictions, summary '
      + 'offences after five arrest-free years, people aged 70 or over, pardoned offences, and '
      + 'completed ARD. SEALING — formally an "Order for Limited Access" (§ 9122.1) — hides the '
      + 'record from most employers and landlords but keeps it visible to law enforcement, and you '
      + 'petition for it. AUTOMATIC CLEAN SLATE SEALING (§ 9122.2) does the same thing with no '
      + 'petition and no fee, and it runs on its own. Sealing is not expungement: the record still '
      + 'exists.',
    keyDates: [
      {
        label: 'Automatic sealing of summary convictions began',
        date: '2024-06',
        kind: 'operative',
        note: 'Wave 1 gives month and year only ("started June 2024").',
      },
      {
        label: 'Pardoned offences automatically expunged',
        date: '2024-06',
        kind: 'operative',
        note: 'Wave 1 gives month and year only ("auto-expunged since June 2024").',
      },
    ],
    openQuestions: [
      {
        question:
          'THE #1 PA VERIFY ITEM. What is the AUTOMATIC sealing period for 2nd/3rd-degree misdemeanours and misdemeanours punishable by 2 years or less under 18 Pa.C.S. § 9122.2 — 7 years or 10? Clean Slate 3.0 changed it and Wave 1\'s sources SPLIT: some say 7 applies to the petition only, others say 7 applies to both. Because the sources conflict, no automatic period is encoded — the tree routes to a result that says we do not know. Read § 9122.2\'s text directly rather than any summary.',
        blocksFields: [],
      },
      {
        question:
          'What does it cost to file for expungement or limited access, and can it be waived? Wave 1 found fees vary BY COUNTY: Montgomery County $176.50 plus $13.50 per extra agency; other counties cited between $132 and $215. Wave 1 calls this Turnleaf\'s phone-verification showcase — verify Philadelphia, Allegheny and Montgomery, then decide whether to display per-county or as a verified range.',
        // One call answers the fee for both filings — the variance is by county,
        // not by remedy — so one question blocks all four fields.
        blocksFields: [
          'resources.remedies.sealing.fees',
          'resources.remedies.sealing.feeWaiver',
          'resources.remedies.expungement.fees',
          'resources.remedies.expungement.feeWaiver',
        ],
      },
      {
        question:
          'Do unpaid fines and costs block AUTOMATIC sealing, and does unpaid restitution block it separately? Wave 1 found a conflict: Clean Slate 2.0 (Act 83 of 2020) removed unpaid fines/costs as a barrier, but at least one current source says unpaid restitution still blocks. Wave 1 says to encode restitution as blocking and fines/costs as not ONLY if § 9122.2\'s condition text confirms that split. It is not confirmed, so NOTHING in the tree gates on it — the results disclose the uncertainty instead.',
        blocksFields: [],
      },
      {
        question:
          'What does a PSP criminal history record (epatch) cost? Wave 1 gives "~$22, VERIFY". It is needed for a petition, so it is part of the real cost of filing.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the sealing exclusion for anyone with 4 or more misdemeanours of the 2nd degree or higher. The tree asks a person to self-assess this; the record model cannot count it.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the "certain drug felonies after 10 years" automatic path added by Clean Slate 3.0, and which drug and property felonies qualify for the 10-year PETITION sealing path (total sentence under 7 years of confinement).',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions other than ARD treated? Standing call-sheet question for every state. ARD completion is covered by Wave 1 as an expungement path; nothing else is.',
        blocksFields: [],
      },
      {
        question:
          'What are the exact effective dates for the June 2024 starts (automatic summary sealing; automatic expungement of pardoned offences)? Wave 1 gives month and year only.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: '18 Pa.C.S. § 9122 (expungement)', url: null, retrievedOn: null },
      { id: '18 Pa.C.S. § 9122.1 (petition sealing — order for limited access)', url: null, retrievedOn: null },
      { id: '18 Pa.C.S. § 9122.2 (automatic Clean Slate sealing — period in conflict)', url: null, retrievedOn: null },
      { id: 'Pa.R.Crim.P. 490 (summary expungement petition)', url: null, retrievedOn: null },
      { id: 'Pa.R.Crim.P. 790 (court of common pleas expungement petition)', url: null, retrievedOn: null },
      { id: 'Pa.R.Crim.P. 791 (petition for limited access)', url: null, retrievedOn: null },
      { id: 'Act 83 of 2020 (Clean Slate 2.0 — fines/costs as a barrier)', url: null, retrievedOn: null },
      { id: 'Clean Slate 3.0 (misdemeanour period change; drug felony automatic path)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'sealing_excluded_pa' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_pa' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_pa' },
            { label: 'Deferred / Diversion completed', value: 'deferred', next: 'ard_pa' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        ard_pa: {
          type: 'boolean',
          text: 'Was your case resolved through ARD — Accelerated Rehabilitative Disposition — and did you complete the program?',
          yes: 'eligible_ard_pa',
          no: 'unknown_deferred'
        },
        sealing_excluded_pa: {
          type: 'boolean',
          text: 'Was the offense any of these: a first-degree felony, an offense punishable by 20 or more years, a felony involving danger to a person, a crime against the family, a firearms offense, or a sex offense requiring registration?',
          yes: 'ineligible_serious_pa',
          no: 'misd_count_pa'
        },
        misd_count_pa: {
          type: 'boolean',
          text: 'Counting your whole record: do you have FOUR or more misdemeanor convictions of the second degree or higher?',
          yes: 'ineligible_misd_count_pa',
          no: 'grade_pa'
        },
        grade_pa: {
          type: 'choice',
          text: 'How was the offense graded? (Your court paperwork says — Pennsylvania grades everything, and the grade decides which remedy you get.)',
          options: [
            { label: 'Summary offense', value: 'summary', next: 'summary_date_pa' },
            { label: 'Misdemeanor — 2nd or 3rd degree, or punishable by 2 years or less', value: 'm2_m3', next: 'petition_misd_date_pa' },
            { label: 'Misdemeanor — 1st degree', value: 'm1', next: 'petition_m1_date_pa' },
            { label: 'Felony — drug or property, total sentence under 7 years', value: 'felony_eligible', next: 'felony_date_pa' },
            { label: 'Felony — anything else', value: 'felony_other', next: 'ineligible_felony_pa' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_grade_pa' }
          ]
        },
        summary_date_pa: {
          type: 'date',
          text: 'When were you last arrested for anything? (Summary offenses clear after five arrest-free years, so this is the date that matters — not the conviction date.)',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'last arrest — summary offences require five ARREST-free years (§ 9122; automatic under § 9122.2 since June 2024)' },
            nextPass: 'check_record_first_pa',
            nextFail: 'waiting_pa'
          }
        },
        petition_misd_date_pa: {
          type: 'date',
          text: 'When were you last convicted of anything? (The clock runs conviction-free, so a later conviction restarts it.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'last conviction — seven CONVICTION-free years (§ 9122.1 petition sealing)' },
            nextPass: 'auto_misd_unknown_pa',
            nextFail: 'waiting_misd_pa'
          }
        },
        // THE CONFLICT. Clean Slate 3.0 changed the automatic misdemeanour
        // period and Wave 1's sources split between 7 and 10 years. A period we
        // cannot pin has no pass/fail to compute — the type forbids it — so the
        // only route out is nextUnknown.
        auto_misd_unknown_pa: {
          type: 'date',
          text: 'When were you last convicted of anything?',
          validation: {
            period: {
              amount: null,
              unit: 'years',
              anchor: 'last conviction — automatic sealing period under § 9122.2, which our sources report as either 7 or 10 years',
            },
            nextUnknown: 'check_record_unknown_period_pa'
          }
        },
        petition_m1_date_pa: {
          type: 'date',
          text: 'When were you last convicted of anything? (The clock runs conviction-free, so a later conviction restarts it.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'last conviction — seven CONVICTION-free years (§ 9122.1 petition sealing)' },
            nextPass: 'eligible_petition_pa',
            nextFail: 'waiting_misd_pa'
          }
        },
        felony_date_pa: {
          type: 'date',
          text: 'When were you last convicted of anything? (The clock runs conviction-free, so a later conviction restarts it.)',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'last conviction — ten CONVICTION-free years (§ 9122.1 for qualifying drug/property felonies)' },
            nextPass: 'eligible_felony_pa',
            nextFail: 'waiting_felony_pa'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Pennsylvania has three different remedies and they split on how the case ended: non-convictions are sealed automatically and can also be expunged, ARD completion has its own expungement path, and convictions run through sealing with waiting periods of 5 to 10 years depending on the grade. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your criminal history from the Pennsylvania State Police (epatch), or ask the Clerk of Courts in the county of the case. MyCleanSlatePA.com will also check your eligibility for free.',
          remedy: 'Get Your Record First (PSP epatch / MyCleanSlatePA)',
          citation: '18 Pa.C.S. §§ 9122, 9122.1, 9122.2 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Pennsylvania\'s ARD program has a clear expungement path, and this screening covers it. Other kinds of deferral or diversion are not something we have researched yet, and we would rather tell you that than guess. MyCleanSlatePA.com (run by Community Legal Services) checks eligibility for free and will know how your disposition is treated.',
          remedy: 'Consult Legal Aid (Deferral / Diversion Not Yet Screened)',
          citation: '18 Pa.C.S. § 9122 (ARD expungement); other deferrals not yet researched'
        },
        eligible_nonconviction_pa: {
          status: 'eligible',
          title: 'Non-Conviction — Sealing Is Automatic, and Expungement Is Available Too',
          message: 'Good news on two fronts. First, Pennsylvania seals non-convictions AUTOMATICALLY under Clean Slate — there is no waiting period and the sealing runs about monthly, so this may already be done. Second, sealing is not the strongest thing available to you: because there was no conviction, you can also petition to EXPUNGE the record under 18 Pa.C.S. § 9122, which destroys it rather than hiding it. Sealing keeps the record visible to law enforcement; expungement does not leave one. Check your status first with a PSP criminal history (epatch), or let MyCleanSlatePA.com check for free — then decide whether the expungement petition is worth filing on top.',
          remedy: 'Automatic Clean Slate Sealing (already running) + optional Expungement Petition (§ 9122)',
          citation: '18 Pa.C.S. §§ 9122, 9122.2'
        },
        eligible_ard_pa: {
          status: 'eligible',
          title: 'Completed ARD — Expungement Available',
          message: 'Because you completed ARD, you can petition to EXPUNGE this record under 18 Pa.C.S. § 9122 — expungement, not just sealing, so the record is destroyed rather than hidden. ARD is not a conviction, which is why the stronger remedy is open to you. File the petition in the Court of Common Pleas for the county where the case was heard; the District Attorney has 30 days to respond. MyCleanSlatePA.com will confirm your eligibility for free before you spend anything on filing.',
          remedy: 'Petition for Expungement after ARD (§ 9122, Pa.R.Crim.P. 790)',
          citation: '18 Pa.C.S. § 9122'
        },
        check_record_first_pa: {
          status: 'eligible',
          title: 'Your Summary Offense May Already Be Sealed — Check First',
          message: 'Start by checking, not by filing. Pennsylvania has been sealing summary convictions AUTOMATICALLY since June 2024, once five arrest-free years have passed — no petition, no fee, and no notification. Based on your dates you are past that, so there is a real chance it is already done. Find out before you spend anything: request a PSP criminal history (epatch), or let MyCleanSlatePA.com check for free. If the automatic system missed you, you can petition to EXPUNGE a summary offense under 18 Pa.C.S. § 9122 — and note that is expungement, which destroys the record, rather than the sealing the automatic system gives you. Filing fees vary by county and are something we are still verifying.',
          remedy: 'Check your record first — then Summary Expungement (Pa.R.Crim.P. 490) if needed',
          citation: '18 Pa.C.S. §§ 9122, 9122.2'
        },
        // The honest answer when the sources disagree.
        check_record_unknown_period_pa: {
          status: 'eligible',
          title: 'You Can Petition Now — Whether It Is Already Sealed, We Cannot Say',
          message: 'Two things here, and we are being straight with you about both. The first is solid: you are past seven conviction-free years, so you can petition now for an Order for Limited Access under 18 Pa.C.S. § 9122.1 — that is sealing, and it is available to you today. The second we do not know. Pennsylvania also seals misdemeanors like yours AUTOMATICALLY, and Clean Slate 3.0 changed when that happens — our sources disagree about whether the automatic period is seven years or ten, and we are not going to pick one and let you plan around a coin flip. So: your record may already be sealed, or it may be three years away. Check rather than assume — a PSP criminal history (epatch) will show you, and MyCleanSlatePA.com checks for free. If it is already sealed, you are finished and you owe nobody a filing fee. If it is not, the petition is open to you now. Resolving that period is our top verification item for Pennsylvania.',
          remedy: 'Check your record — you can petition (Rule 791) now either way',
          citation: '18 Pa.C.S. §§ 9122.1, 9122.2 (automatic period unresolved — sources conflict)'
        },
        eligible_petition_pa: {
          status: 'eligible',
          title: 'Potentially Eligible to Petition for Sealing',
          message: 'Based on your dates you appear potentially eligible to petition for an Order for Limited Access — sealing — under 18 Pa.C.S. § 9122.1, after seven conviction-free years. First-degree misdemeanors are not reached by Pennsylvania\'s automatic sealing, so waiting will not clear this: filing is the route. Use Pa.R.Crim.P. 791, filed in the Court of Common Pleas for the county of conviction; the District Attorney has 30 days to respond. You will need a recent PSP criminal history (epatch). Understand what you are getting: sealing hides the record from most employers and landlords but keeps it visible to law enforcement — it is not expungement. Filing fees vary by county and are something we are still verifying. MyCleanSlatePA.com checks eligibility for free before you file.',
          remedy: 'Petition for Limited Access (Pa.R.Crim.P. 791, § 9122.1)',
          citation: '18 Pa.C.S. § 9122.1'
        },
        eligible_felony_pa: {
          status: 'eligible',
          title: 'Qualifying Felony — Potentially Sealable After 10 Years',
          message: 'Pennsylvania seals very few felonies, and yours may be one of the exceptions: certain drug and property felonies where the total sentence was under seven years of confinement can be sealed after ten conviction-free years. Based on your dates, that period appears to have passed. Clean Slate 3.0 also added an automatic path for certain drug felonies at ten years — which we are still verifying — so check your record before you file: a PSP criminal history (epatch) will show whether it is already done, and MyCleanSlatePA.com checks for free. If it is not, petition under Pa.R.Crim.P. 791 in the Court of Common Pleas for the county of conviction. Given how narrow the felony path is, this is worth having a person confirm — Community Legal Services runs the free eligibility check.',
          remedy: 'Check record, then Petition for Limited Access (Rule 791) if needed',
          citation: '18 Pa.C.S. §§ 9122.1, 9122.2'
        },
        waiting_pa: {
          status: 'waiting',
          title: 'Five Arrest-Free Years Not Yet Met',
          message: 'A summary offense clears after five ARREST-free years — note that is arrest-free, not conviction-free, which is a stricter test than the one that applies to misdemeanors. Based on your dates, that period has not run yet. Once it does, Pennsylvania seals summary convictions automatically, so relief may arrive without you filing anything.',
          remedy: 'Wait for five arrest-free years',
          citation: '18 Pa.C.S. §§ 9122, 9122.2'
        },
        waiting_misd_pa: {
          status: 'waiting',
          title: 'Seven Conviction-Free Years Not Yet Met',
          message: 'Petition sealing for a misdemeanor needs seven conviction-free years — Clean Slate 3.0 cut this from ten. Based on your dates, that period has not run yet, and a new conviction restarts it. Pennsylvania also seals many misdemeanors automatically; the automatic period is the thing we are still verifying, because our sources disagree about whether it is seven years or ten. Either way, staying conviction-free is what gets you there.',
          remedy: 'Wait for seven conviction-free years',
          citation: '18 Pa.C.S. §§ 9122.1, 9122.2'
        },
        waiting_felony_pa: {
          status: 'waiting',
          title: 'Ten Conviction-Free Years Not Yet Met',
          message: 'Qualifying drug and property felonies — those with a total sentence under seven years of confinement — can be sealed after ten conviction-free years. Based on your dates, that period has not run yet, and a new conviction restarts it.',
          remedy: 'Wait for ten conviction-free years',
          citation: '18 Pa.C.S. § 9122.1'
        },
        ineligible_serious_pa: {
          status: 'ineligible',
          title: 'Excluded From Sealing',
          message: 'Pennsylvania excludes first-degree felonies, offenses punishable by 20 or more years, felonies involving danger to a person, crimes against the family, firearms offenses, and sex offenses requiring registration from sealing. No waiting period changes that. There is another route, though, and it is a real one in Pennsylvania: a PARDON from the Board of Pardons, which — since June 2024 — carries automatic expungement once granted. Pennsylvania grants more pardons than most states and the application is free. Community Legal Services (MyCleanSlatePA.com) and PALawHelp.org can tell you whether it is worth pursuing.',
          remedy: 'None (Excluded from Sealing) — consider a Board of Pardons application',
          citation: '18 Pa.C.S. §§ 9122.1, 9122.2'
        },
        ineligible_misd_count_pa: {
          status: 'ineligible',
          title: 'Four or More Misdemeanors Blocks Sealing',
          message: 'Pennsylvania excludes anyone with four or more misdemeanor convictions of the second degree or higher from sealing — it is a limit on the person, not on the offense, so the individual case does not matter. A pardon from the Board of Pardons is a separate path that this limit does not govern, and since June 2024 a pardon carries automatic expungement. Before accepting this as final, it is worth having someone count your record properly: MyCleanSlatePA.com checks eligibility for free, and grading matters here — misdemeanors of the third degree do not count toward this limit.',
          remedy: 'Consult Legal Aid (Record Exceeds Misdemeanor Limit)',
          citation: '18 Pa.C.S. § 9122.1'
        },
        ineligible_felony_pa: {
          status: 'ineligible',
          title: 'Most Felonies Cannot Be Sealed in Pennsylvania',
          message: 'Pennsylvania seals only a narrow set of felonies: certain drug and property felonies where the total sentence was under seven years of confinement. Other felonies are not sealable, however long ago they were and however clean your record has been since. The real route here is a PARDON from the Board of Pardons — Pennsylvania grants more than most states, the application is free, and since June 2024 a pardon brings automatic expungement with it. If you are 70 or older and have been arrest-free for ten years since completing supervision, there is also an age-based expungement path under § 9122. Community Legal Services (MyCleanSlatePA.com) can advise on both.',
          remedy: 'Board of Pardons application (or age-70 expungement under § 9122)',
          citation: '18 Pa.C.S. §§ 9122, 9122.1'
        },
        complex_grade_pa: {
          status: 'complex',
          title: 'We Need the Grade — It Decides Everything Here',
          message: 'Pennsylvania grades every offense, and the grade decides which of three remedies you get and how long you wait: a summary clears in five arrest-free years, a 2nd or 3rd degree misdemeanor in seven conviction-free years, a 1st degree misdemeanor also seven but with no automatic path, and most felonies not at all. Guessing at the grade would send you down the wrong path entirely, so we will not. Your court paperwork states it. A PSP criminal history (epatch) shows it. And MyCleanSlatePA.com — run by Community Legal Services — will check your eligibility for free, which is the easiest way to find out.',
          remedy: 'Get Your Grade First (court paperwork / PSP epatch / MyCleanSlatePA)',
          citation: '18 Pa.C.S. §§ 9122, 9122.1, 9122.2'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'Petition for Limited Access — sealing (§ 9122.1, Pa.R.Crim.P. 791)',
          formName: 'Petition for Limited Access (Rule 791)',
          formUrl: 'https://www.pacourts.us/forms',
          steps: [
            'Check first whether Clean Slate already sealed it — MyCleanSlatePA.com checks free, and a PSP criminal history (epatch) shows your current record.',
            'Obtain a recent PSP criminal history record through epatch.',
            'Complete the Petition for Limited Access (Rule 791) and file it in the Court of Common Pleas for the county of conviction.',
            'Serve the District Attorney, who has 30 days to respond.',
            'Understand what you are getting: sealing hides the record from most employers and landlords, but law enforcement still sees it. It is not expungement.'
          ],
          // null: Wave 1 found fees vary BY COUNTY — Montgomery $176.50 plus
          // $13.50 per extra agency, others cited $132-$215. A range across
          // counties is not this county's fee.
          fees: null,
          feeWaiver: null,
          courtContact: 'Court of Common Pleas, county of conviction'
        },
        expungement: {
          name: 'Petition for Expungement (§ 9122) — destroys the record',
          formName: 'Petition for Expungement (Pa.R.Crim.P. 490 for summary offenses; Rule 790 in the Court of Common Pleas)',
          formUrl: 'https://www.pacourts.us/forms',
          steps: [
            'Confirm you are in one of the narrow categories: a non-conviction, a summary offense after five arrest-free years, completed ARD, a pardoned offense, or aged 70+ with ten arrest-free years since completing supervision.',
            'Obtain a recent PSP criminal history record through epatch.',
            'File Rule 490 for a summary offense, or Rule 790 in the Court of Common Pleas otherwise, in the county where the case was heard.',
            'Serve the District Attorney, who has 30 days to respond.'
          ],
          fees: null,
          feeWaiver: null,
          courtContact: 'Court of Common Pleas (or Magisterial District Court for summary offenses), county of the case'
        }
      },
      legalAid: [
        { name: 'MyCleanSlatePA (Community Legal Services — free eligibility check)', url: 'https://mycleanslatepa.com' },
        { name: 'PALawHelp', url: 'https://www.palawhelp.org' }
      ]
    }
  },

  // ==========================================================================
  // NEW JERSEY — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave1_Draft_Package.md
  //
  // NJ's vocabulary is its own and the UI must use it: felonies are INDICTABLE
  // OFFENCES, misdemeanours are DISORDERLY PERSONS (DP) OFFENCES. Using the
  // wrong words here is not a style problem — a person looking at their own
  // paperwork will not recognise "felony" on it.
  //
  // TITLE 39 IS ASKED FIRST, and it is the single most useful thing this tree
  // does. Motor-vehicle offences under Title 39 — including DWI — are NOT
  // expungable in New Jersey, at all, ever. Wave 1 calls this a common user
  // confusion, and it is: people come looking to clear a DWI and there is
  // nothing to clear it with. Better to say so in one question than to walk
  // them through five.
  //
  // Two petition tracks: STANDARD (2C:52-2/-3) for one indictable plus up to 3
  // DP offences (or up to 5 DP with no indictable), 5 years from the latest of
  // four events; and CLEAN SLATE (2C:52-5.3) for everyone who does not fit —
  // the entire record, 10 years from the most recent of the same four events,
  // regardless of conviction count and even with prior expungements.
  // ==========================================================================
  NJ: {
    code: 'NJ',
    name: 'New Jersey',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave1_Draft_Package.md',
    terminology:
      'New Jersey says EXPUNGEMENT, and it means it — the records are extracted and isolated, not '
      + 'just hidden. The vocabulary is New Jersey\'s own: what other states call felonies are '
      + 'INDICTABLE OFFENSES here, and what other states call misdemeanors are DISORDERLY PERSONS '
      + '(DP) OFFENSES. Your paperwork will use those words. The one thing to know before anything '
      + 'else: motor-vehicle offenses under Title 39 — including DWI — cannot be expunged in New '
      + 'Jersey at all. Filing is free and done online through the eCourts Expungement System.',
    keyDates: [
      {
        label: 'Clean Slate expungement (2C:52-5.3) enacted',
        date: '2019',
        kind: 'effective',
        note: 'Wave 1 gives the year only. The same 2019 law ordered an AUTOMATED clean-slate system whose rollout has been slow — see open questions.',
      },
      {
        label: 'Venue expanded to the county of residence',
        date: '2025',
        kind: 'effective',
        note: 'Wave 1 gives the year only. You may now file in the Superior Court for the county where you live, not only where you were convicted.',
      },
    ],
    openQuestions: [
      {
        question:
          'Is expungement filing genuinely free, and is there any fee at any stage? Wave 1 says the NJ Courts\' own page states it is free and that the $75 fee was eliminated in the 2019 reforms — but flags that older sources still cite $75 and says to VERIFY on njcourts.gov and by phone. Sources conflict, so no fee is stated in the app; the results attribute the free claim to njcourts.gov rather than asserting it. Wave 1 wants to "wear it proudly" once confirmed, and it is worth confirming: free-and-online is New Jersey\'s headline.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'What is the current status of the AUTOMATED clean-slate system ordered by the 2019 law? Wave 1 says the rollout has been slow and backlogged, and says to verify before claiming any automation in the UI. Nothing in the tree claims it — no automatic path is encoded for New Jersey — but if it is running, people need to be told to check their records first, as in every other automated state.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the early-pathway waiting periods: 4 years via "compelling circumstances" instead of the standard 5, and Wave 1 flags a possible 3-year early path for DP-only records. The tree offers the 4-year compelling-circumstances route as a "talk to someone" result and does not encode the 3-year DP path at all, because it is flagged unverified.',
        blocksFields: [],
      },
      {
        question:
          'What is the name and URL of the State Police backlog status portal created by the 2025 law (A3881)? Wave 1 flags both as unverified. State Police processing backlogs are documented, so a person needs to know where to check whether their granted expungement has actually been processed.',
        blocksFields: [],
      },
      {
        question:
          'Confirm how unpaid financial assessments are treated on the Clean Slate path: Wave 1 says a non-willful unpaid assessment does NOT block, and the court enters a civil judgment instead. This is disclosed in the results because it is user-relevant, but it is not verified.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the once-per-lifetime limit on the indictable expungement grant, and the crime-spree / interdependent-offences exception to it.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions (including PTI and conditional discharge) treated? Standing call-sheet question for every state. Not covered in Wave 1.',
        blocksFields: [],
      },
      {
        question:
          'What are the exact effective dates for the 2019 Clean Slate law and the 2025 venue expansion? Wave 1 gives years only.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.J.S.A. 2C:52-2 (standard expungement — indictable offences)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-2(b) (ineligible convictions)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-3 (disorderly persons offences)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-4 (ordinance violations)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-5.1 (marijuana expungement)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-5.3 (clean slate expungement)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-6 (dismissals and acquittals)', url: null, retrievedOn: null },
      { id: 'N.J.S.A. 2C:52-6.1 (marijuana)', url: null, retrievedOn: null },
      { id: 'A3881 (2025 — State Police backlog status portal)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'title39_nj' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_dismissal_nj' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_dismissal_nj' },
            { label: 'Deferred / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // Asked first for convictions: a Title 39 offence has no path at all, so
        // there is no kindness in walking someone through five more questions.
        title39_nj: {
          type: 'boolean',
          text: 'Was this a motor vehicle offense under Title 39 — for example DWI, driving while suspended, or reckless driving?',
          yes: 'ineligible_title39_nj',
          no: 'marijuana_nj'
        },
        marijuana_nj: {
          type: 'boolean',
          text: 'Was this a marijuana offense?',
          yes: 'eligible_marijuana_nj',
          no: 'excluded_nj'
        },
        excluded_nj: {
          type: 'boolean',
          text: 'Was the offense any of these: homicide (other than vehicular), kidnapping, sexual assault, robbery, arson, endangering the welfare of a child, terrorism, most first-degree drug distribution, or a crime committed in a public office that touched that office?',
          yes: 'ineligible_serious_nj',
          no: 'count_profile_nj'
        },
        count_profile_nj: {
          type: 'choice',
          text: 'Thinking about your whole record: which describes you? (In New Jersey, indictable offenses are what other states call felonies; disorderly persons offenses are what they call misdemeanors.)',
          options: [
            { label: 'One indictable offense, plus no more than 3 disorderly persons offenses', value: 'standard', next: 'date_5_nj' },
            { label: 'No indictable offenses, and no more than 5 disorderly persons offenses', value: 'standard_dp', next: 'date_5_nj' },
            { label: 'More than that — more indictables, or more DP offenses', value: 'clean_slate', next: 'date_10_nj' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_counts_nj' }
          ]
        },
        // NJ's clock runs from the LATEST of four events. Asked, because no
        // single collected date can stand in for that.
        date_5_nj: {
          type: 'date',
          text: 'Which of these came LAST: your conviction, your payment of all fines and financial assessments, your completion of probation or parole, or your release from custody? Enter that date.',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'the LATEST of conviction, fine payment, probation/parole completion, or release (N.J.S.A. 2C:52-2)' },
            nextPass: 'eligible_standard_nj',
            nextFail: 'date_4_nj'
          }
        },
        date_4_nj: {
          type: 'date',
          text: 'And the same date again, so we can check the early pathway: which of conviction, fine payment, completion of supervision, or release came last?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'the LATEST of the four events — the "compelling circumstances" early pathway (N.J.S.A. 2C:52-2)' },
            nextPass: 'complex_early_nj',
            nextFail: 'waiting_nj'
          }
        },
        date_10_nj: {
          type: 'date',
          text: 'Thinking about your MOST RECENT conviction, not just this one: which came last — that conviction, your payment of all fines and financial assessments, your completion of probation or parole, or your release from custody? Enter that date.',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'the LATEST of the four events, measured from the MOST RECENT conviction (N.J.S.A. 2C:52-5.3 clean slate)' },
            nextPass: 'eligible_clean_slate_nj',
            nextFail: 'waiting_clean_slate_nj'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'New Jersey\'s paths split sharply on how the case ended: a dismissal or acquittal can be expunged immediately with no waiting period, while a conviction runs through a 5-year or 10-year clock depending on your whole record. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. LSNJ Law\'s "Clearing Your Record" guide and hotline (888-576-5529) can help you find out what your disposition actually was.',
          remedy: 'Get Your Record First (LSNJ Law)',
          citation: 'N.J.S.A. 2C:52-1 et seq. (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'New Jersey\'s expungement rules are screened here for convictions, dismissals, and acquittals. How a completed diversion is treated — including PTI (Pretrial Intervention) and conditional discharge, which New Jersey uses often — is not something this screening has researched yet, and we would rather tell you that than guess. LSNJ Law (888-576-5529) can confirm how your case was disposed and which path fits.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Screened)',
          citation: 'N.J.S.A. 2C:52-1 et seq. (treatment of diversions not yet researched)'
        },
        // The most useful thing this tree says.
        ineligible_title39_nj: {
          status: 'ineligible',
          title: 'Title 39 Motor Vehicle Offenses Cannot Be Expunged',
          message: 'This is the thing most people are surprised by, so here it is plainly: motor vehicle offenses under Title 39 — including DWI, driving while suspended, and reckless driving — cannot be expunged in New Jersey. Not after a waiting period, not through Clean Slate, not at all. New Jersey\'s expungement law covers criminal offenses; Title 39 offenses are motor vehicle violations, which sit outside it entirely. That is a hard no and we would rather you hear it now than after paying for advice. Two things that may still help: your driving record and your criminal record are different things, and a Title 39 offense does not create a criminal record to clear. And if you have OTHER offenses that are not Title 39, those may well be expungable — run this again for them. LSNJ Law (888-576-5529) can confirm.',
          remedy: 'None (Title 39 Offenses Are Outside the Expungement Statute)',
          citation: 'N.J.S.A. 2C:52-1 et seq. (applies to criminal offenses; Title 39 motor vehicle offenses are not covered)'
        },
        eligible_dismissal_nj: {
          status: 'eligible',
          title: 'Dismissed or Acquitted — Expungeable Now',
          message: 'Because your case ended without a conviction, you can seek expungement immediately under N.J.S.A. 2C:52-6 — no waiting period at all. File through the eCourts Expungement System at njcourts.gov: it is online, the system generates the petition for you, and the NJ Courts\' own page says there is no filing fee (we are confirming that, since older sources still mention $75). Once a judge grants the order it is transmitted to the agencies electronically. One thing worth knowing: the State Police have documented backlogs in processing granted expungements, so it is worth checking afterwards that yours went through rather than assuming.',
          remedy: 'eCourts Expungement (N.J.S.A. 2C:52-6) — no waiting period',
          citation: 'N.J.S.A. 2C:52-6'
        },
        eligible_marijuana_nj: {
          status: 'eligible',
          title: 'Marijuana Offense — Expungeable Now',
          message: 'Since New Jersey legalized marijuana in 2021, most marijuana offenses are treated as disorderly persons offenses and can be expunged IMMEDIATELY — no waiting period. File through the eCourts Expungement System at njcourts.gov; it is online and the NJ Courts say filing is free (we are confirming that). This is a better route than waiting out any general clock, so start here. If your marijuana offense was a large-scale distribution charge rather than possession, the answer may differ — LSNJ Law (888-576-5529) can confirm which category yours falls in.',
          remedy: 'eCourts Expungement — Marijuana (N.J.S.A. 2C:52-5.1, -6.1)',
          citation: 'N.J.S.A. 2C:52-5.1, 2C:52-6.1'
        },
        eligible_standard_nj: {
          status: 'eligible',
          title: 'Potentially Eligible — Standard Expungement',
          message: 'Based on your record and your dates, you appear potentially eligible for a standard expungement: New Jersey allows one indictable offense plus up to three disorderly persons offenses (or up to five DP offenses if you have no indictable), five years after the latest of your conviction, your final payment, your completion of supervision, or your release. File through the eCourts Expungement System at njcourts.gov — it is online, it generates the petition for you, and the NJ Courts\' own page says filing is free, which we are in the process of confirming. Since 2025 you can file in the Superior Court for the county where you LIVE, not only where you were convicted. Two notes: the indictable expungement is generally once per lifetime, and the State Police have documented backlogs, so check afterwards that your granted order was actually processed.',
          remedy: 'eCourts Expungement — Standard (N.J.S.A. 2C:52-2, -3)',
          citation: 'N.J.S.A. 2C:52-2, 2C:52-3'
        },
        complex_early_nj: {
          status: 'complex',
          title: 'Four Years In — The Early Pathway May Be Open',
          message: 'You are short of the standard five-year mark but past four, and that gap is exactly where New Jersey has an early pathway: a court can grant an expungement at four years in "compelling circumstances". That is a discretionary judgment about your situation rather than a box this screening can tick — a pending job offer, for instance, is the kind of thing courts consider. We are also still verifying a possible three-year early path for records with no indictable offense, so if your record is disorderly-persons-only it is doubly worth asking. This is a good moment to talk to a person: LSNJ Law (888-576-5529) runs a free hotline and their "Clearing Your Record" guide covers the early pathway. If the early route is not open, you are a short wait from the standard one.',
          remedy: 'Consult Legal Aid (Compelling-Circumstances Early Pathway)',
          citation: 'N.J.S.A. 2C:52-2'
        },
        eligible_clean_slate_nj: {
          status: 'eligible',
          title: 'Potentially Eligible — Clean Slate Expungement of Your ENTIRE Record',
          message: 'Your record is outside the standard limits, and New Jersey has a route built for exactly that: Clean Slate expungement under N.J.S.A. 2C:52-5.3 expunges your ENTIRE record — every conviction — ten years after the latest of your most recent conviction, your final payment, your completion of supervision, or your release. It does not care how many convictions you have, and it is available even if you have had an expungement before. Based on your dates that period appears to have passed. One thing worth knowing, because it stops people who should not be stopped: an unpaid financial assessment does NOT block Clean Slate if the non-payment was not willful — the court enters a civil judgment for the balance instead and grants the expungement. So do not assume an outstanding balance is the end of it. File through eCourts at njcourts.gov; the NJ Courts say filing is free, which we are confirming.',
          remedy: 'eCourts Clean Slate Expungement (N.J.S.A. 2C:52-5.3)',
          citation: 'N.J.S.A. 2C:52-5.3'
        },
        waiting_nj: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'New Jersey\'s standard expungement comes five years after whichever of these came LAST: your conviction, your payment of all fines and financial assessments, your completion of probation or parole, or your release from custody. Based on your dates, that has not run yet. Two things worth knowing. A court can grant an expungement at four years in "compelling circumstances", so if you are close and have a reason — a job offer, say — it is worth asking LSNJ Law about the early pathway. And if paying off a remaining balance is what is holding your date back, paying it is what starts the clock running to its end.',
          remedy: 'Wait for the five-year period (or ask about the early pathway)',
          citation: 'N.J.S.A. 2C:52-2'
        },
        waiting_clean_slate_nj: {
          status: 'waiting',
          title: 'Clean Slate — Ten-Year Period Not Yet Met',
          message: 'Your record is outside the standard expungement limits, so the route open to you is Clean Slate under N.J.S.A. 2C:52-5.3 — which expunges your ENTIRE record, regardless of how many convictions, ten years after the latest of your most recent conviction, final payment, completion of supervision, or release. Based on your dates that has not run yet. It is measured from your MOST RECENT conviction, so staying conviction-free is what gets you there. And note: an unpaid balance does not block Clean Slate if the non-payment was not willful — the court enters a civil judgment instead — so an outstanding amount is not necessarily what is standing in your way.',
          remedy: 'Wait for the ten-year Clean Slate period',
          citation: 'N.J.S.A. 2C:52-5.3'
        },
        ineligible_serious_nj: {
          status: 'ineligible',
          title: 'Excluded Offense',
          message: 'New Jersey excludes a specific list of convictions from expungement entirely: homicide other than vehicular, kidnapping, sexual assault, robbery, arson, endangering the welfare of a child, terrorism, most first-degree drug distribution, and crimes committed in a public office that touched that office. No waiting period changes that, and Clean Slate does not reach them either. If you are not certain your offense is on that list — the categories are narrower than they sound, and the degree matters — it is worth asking before you accept this answer. LSNJ Law runs a free hotline at 888-576-5529.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid',
          citation: 'N.J.S.A. 2C:52-2(b)'
        },
        complex_counts_nj: {
          status: 'complex',
          title: 'Your Record Needs Counting — By a Person',
          message: 'Which New Jersey route you take depends on your whole record, not on this one case. The standard path covers one indictable offense plus up to three disorderly persons offenses, or up to five DP offenses with no indictable, at five years. Anything beyond that goes to Clean Slate, which expunges everything but takes ten years. Since you are not sure where you fall, we are not going to guess — the two paths differ by five years, and getting it wrong means either waiting when you did not need to or filing when you cannot. There is also a rule that may help: multiple offenses that were part of a single crime spree, or that are interdependent, can be treated as one for the once-per-lifetime indictable limit. LSNJ Law (888-576-5529) will count your record with you for free.',
          remedy: 'Get Your Record Counted (LSNJ Law)',
          citation: 'N.J.S.A. 2C:52-2, 2C:52-5.3'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'eCourts Expungement (N.J.S.A. 2C:52-1 et seq.)',
          formName: 'No paper form — the eCourts Expungement System generates the petition',
          formUrl: 'https://www.njcourts.gov/self-help/expunge-record',
          steps: [
            'File online through the eCourts Expungement System at njcourts.gov — the system generates the petition from your answers.',
            'File in the Superior Court for the county where you live OR any county where you were convicted (the residence option was added in 2025).',
            'If a judge grants the order, it is transmitted to the agencies electronically.',
            'Check afterwards that it was actually processed — State Police backlogs are documented, and a granted order is not the same as a cleared record.'
          ],
          // null: Wave 1 says the NJ Courts' own page states filing is free and
          // that the $75 fee went in the 2019 reforms — but flags that older
          // sources still cite $75, and says to verify. Sources conflict, so the
          // field stays out; the results attribute the claim to njcourts.gov
          // rather than asserting it.
          fees: null,
          feeWaiver: null,
          courtContact: 'Superior Court — county of residence or of any conviction'
        }
      },
      legalAid: [
        { name: 'LSNJ Law — Clearing Your Record (hotline 888-576-5529)', url: 'https://www.lsnjlaw.org' },
        { name: 'NJ Courts Expungement Self-Help', url: 'https://www.njcourts.gov/self-help/expunge-record' }
      ]
    }
  },

  // ==========================================================================
  // COLORADO — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave1_Draft_Package.md
  //
  // Colorado SEALS. "Expungement" here mostly means juvenile records, so the UI
  // says sealing throughout — using the wrong word sends people looking for a
  // remedy that does not apply to them.
  //
  // TWO CONFLICTS, handled differently because they are different kinds:
  //   1. The FELONY petition period. Wave 1: "one source says 3 yrs most
  //      felonies / 5 yrs others — read § 706 yourself and encode the statute's
  //      own table". Sources disagree on the number, so felony_unknown_co
  //      carries `amount: null` and routes to nextUnknown. Same treatment as
  //      Pennsylvania's automatic misdemeanour period.
  //   2. The FEE. $65 per statute-based sources vs $224 in an older judicial
  //      district packet — which Wave 1 reads as the pre-2022 separate-civil-
  //      action fee, i.e. probably stale rather than wrong. Still a conflict, so
  //      the field stays null.
  //
  // THE INVERSION AGAIN, and worse than Utah's. Every Colorado petition period
  // is SHORTER than its automatic counterpart: petty offences 1 yr vs 4
  // automatic, misdemeanours 2-3 vs 7, eligible felonies 3-5 vs 10. So for most
  // people petitioning beats waiting by years, and the tree says so plainly.
  //
  // Wave 1's rule of thumb for what is sealable — "largely offences WITHOUT a
  // named victim" — is a useful intuition and NOT encoded as a rule. Its own
  // persona 1 shows why: theft has a victim but IS commonly listed as eligible.
  // The exclusion list is asked from the statute instead.
  // ==========================================================================
  CO: {
    code: 'CO',
    name: 'Colorado',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave1_Draft_Package.md',
    terminology:
      'Colorado SEALS adult criminal records (C.R.S. 24-72-701 et seq.). It does not expunge them — '
      + 'in Colorado "expungement" almost always means juvenile or underage records, so if you are '
      + 'searching for help, search for sealing or you will find the wrong law. Two tracks: PETITION '
      + 'sealing, where you file a motion in your own criminal case, and AUTOMATIC "Clean Slate" '
      + 'sealing (SB22-099), which has been running since July 2024 and needs no petition and no fee. '
      + 'Counter-intuitively, every petition period is SHORTER than its automatic counterpart — so '
      + 'filing is usually faster than waiting.',
    keyDates: [
      {
        label: 'Automatic Clean Slate sealing (SB22-099, C.R.S. 13-3-117) effective',
        date: '2024-07-01',
        kind: 'effective',
        note: 'Over 100,000 records were sealed in the first batch in August 2024.',
      },
      {
        label: 'Sealing moved into the criminal case — no separate civil action',
        date: '2022',
        kind: 'effective',
        note: 'Wave 1 gives the year only. This is why an older packet quotes a $224 civil filing fee that may no longer apply.',
      },
      {
        label: 'HB24-1133 expanded non-conviction automation',
        date: '2025',
        kind: 'operative',
        note: 'Wave 1 gives the year only ("implemented 2025").',
      },
    ],
    openQuestions: [
      {
        question:
          'CONFLICT: what is the petition sealing waiting period for eligible felonies (class 4-6, drug levels 2-4) under C.R.S. 24-72-706? Wave 1 records that one source says 3 years for most felonies and 5 for others, and says to read § 706 and encode the statute\'s own table. Because the sources disagree, no felony period is encoded — the tree routes to a result that says we do not know and tells the person how to find out. This is the top verification item for Colorado.',
        blocksFields: [],
      },
      {
        question:
          'CONFLICT: what does it cost to file a Motion to Seal (JDF 612), and can it be waived? Wave 1 gives $65 from statute-based sources versus $224 in an older judicial-district packet, and reads the $224 as the pre-2022 separate-civil-action fee that the 2022 simplification removed. Probably stale rather than wrong — but "probably" is not a fee. Ask a district court clerk. Confirm also that sealing a record which should have auto-sealed is free, and ask about the fee waiver (JDF 205) at the same time.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Confirm the exact class split for the 2-year petition period in § 706(1)(b): Wave 1 gives "class 2/3 misdemeanors, drug misdemeanors" but flags the split as needing verification against the statute text.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the sealing exclusion list against § 706(2), and specifically check theft. Wave 1\'s own persona 1 raises it: the rule of thumb is that eligible offences are those without a named victim, but theft HAS a victim and is nonetheless commonly listed as eligible. The tree does not encode the rule of thumb — it asks the statutory list — but the list itself needs confirming.',
        blocksFields: [],
      },
      {
        question:
          'What does a CBI criminal history report cost? Wave 1 gives "~$12.50 verify". It must be attached to the motion, so it is part of the real cost of filing.',
        blocksFields: [],
      },
      {
        question:
          'How often does the DA object to automatic sealing on public-safety grounds, and what happens when they do? Wave 1 notes the DA can object; a person told "your record may already be sealed" needs to know that is not guaranteed.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the non-conviction paths: arrests without charges auto-seal after 1 year for post-2022 offences, and acquittals/dismissals/completed deferred judgments seal through a simplified in-case process expanded by HB24-1133. What does a person actually do if it has not happened?',
        blocksFields: [],
      },
      {
        question:
          'What are the exact effective dates for the 2022 in-case simplification and the 2025 HB24-1133 implementation? Wave 1 gives years only.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'C.R.S. 24-72-701 et seq. (adult record sealing)', url: null, retrievedOn: null },
      { id: 'C.R.S. 24-72-704 through -710 (petition sealing)', url: null, retrievedOn: null },
      { id: 'C.R.S. 24-72-706 (waiting periods — felony period in conflict)', url: null, retrievedOn: null },
      { id: 'C.R.S. 24-72-706(2) (exclusions)', url: null, retrievedOn: null },
      { id: 'C.R.S. 13-3-117 (automatic Clean Slate sealing)', url: null, retrievedOn: null },
      { id: 'SB22-099 (Clean Slate — automatic sealing, eff. July 1, 2024)', url: null, retrievedOn: null },
      { id: 'HB24-1133 (2024 — expanded non-conviction automation)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_co' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_co' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_co' },
            // Colorado is the first state in either wave whose package actually
            // covers completed deferred judgments — so this does not hedge.
            { label: 'Deferred judgment completed', value: 'deferred', next: 'eligible_nonconviction_co' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_co: {
          type: 'boolean',
          text: 'Was the offense any of these: a class 1, 2 or 3 felony; a level 1 drug felony; DUI or DWAI; domestic violence; a crime of violence or an "extraordinary risk" crime; a sex offense; a crime against a victim protected by the Victim Rights Act; child abuse; or a traffic offense?',
          yes: 'ineligible_serious_co',
          no: 'intervening_co'
        },
        intervening_co: {
          type: 'boolean',
          text: 'Have you been convicted of anything since this case ended?',
          yes: 'ineligible_intervening_co',
          no: 'level_co'
        },
        level_co: {
          type: 'choice',
          text: 'How was the offense classified? (Your court paperwork says — in Colorado the classification decides both whether you can seal and how long you wait.)',
          options: [
            { label: 'Civil infraction, petty offense, or drug petty offense', value: 'petty', next: 'date_1_co' },
            { label: 'Class 2 or 3 misdemeanor, or a drug misdemeanor', value: 'misd_23', next: 'date_2_co' },
            { label: 'Class 1 misdemeanor', value: 'misd_1', next: 'date_3_misd_co' },
            { label: 'Felony — class 4, 5 or 6, or drug level 2, 3 or 4', value: 'felony_eligible', next: 'felony_unknown_co' },
            { label: 'I was pardoned for this offense', value: 'pardoned', next: 'eligible_pardon_co' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_level_co' }
          ]
        },
        // Colorado's clock runs from final disposition OR release — asked,
        // because release can land long after the disposition the form collects.
        date_1_co: {
          type: 'date',
          text: 'Which came LATER: your final disposition in the case, or your release from any custody or supervision? Enter that date.',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'final disposition or release, whichever is later (C.R.S. 24-72-706 — petty offences)' },
            nextPass: 'date_1_auto_co',
            nextFail: 'waiting_co'
          }
        },
        date_1_auto_co: {
          type: 'date',
          text: 'And the same date again, so we can check the automatic track: which came later, your final disposition or your release?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'final disposition or release — automatic sealing period for civil infractions (C.R.S. 13-3-117)' },
            nextPass: 'check_record_first_co',
            nextFail: 'eligible_petition_faster_co'
          }
        },
        date_2_co: {
          type: 'date',
          text: 'Which came LATER: your final disposition in the case, or your release from any custody or supervision? Enter that date.',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'final disposition or release, whichever is later (C.R.S. 24-72-706 — class 2/3 and drug misdemeanours)' },
            nextPass: 'date_2_auto_co',
            nextFail: 'waiting_co'
          }
        },
        date_2_auto_co: {
          type: 'date',
          text: 'And the same date again, so we can check the automatic track: which came later, your final disposition or your release?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'final disposition or release — automatic sealing period for misdemeanours (C.R.S. 13-3-117)' },
            nextPass: 'check_record_first_co',
            nextFail: 'eligible_petition_faster_co'
          }
        },
        date_3_misd_co: {
          type: 'date',
          text: 'Which came LATER: your final disposition in the case, or your release from any custody or supervision? Enter that date.',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'final disposition or release, whichever is later (C.R.S. 24-72-706 — class 1 misdemeanours)' },
            nextPass: 'date_3_auto_co',
            nextFail: 'waiting_co'
          }
        },
        date_3_auto_co: {
          type: 'date',
          text: 'And the same date again, so we can check the automatic track: which came later, your final disposition or your release?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'final disposition or release — automatic sealing period for misdemeanours (C.R.S. 13-3-117)' },
            nextPass: 'check_record_first_co',
            nextFail: 'eligible_petition_discretion_co'
          }
        },
        // THE FELONY CONFLICT. Wave 1's sources split between 3 years for most
        // felonies and 5 for others. A period we cannot pin has no pass/fail —
        // the type forbids it — so the only route is nextUnknown.
        felony_unknown_co: {
          type: 'date',
          text: 'Which came LATER: your final disposition in the case, or your release from any custody or supervision?',
          validation: {
            period: {
              amount: null,
              unit: 'years',
              anchor: 'final disposition or release — the felony petition period under C.R.S. 24-72-706, which our sources report as either 3 or 5 years depending on the felony',
            },
            nextUnknown: 'complex_felony_period_co'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Colorado\'s paths split on how the case ended: dismissals, acquittals and completed deferred judgments go through a simplified process with no waiting period, while convictions run through waiting periods of 1 to 10 years depending on the classification. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your criminal history from the Colorado Bureau of Investigation, or ask the clerk of the court that handled the case. Expunge Colorado runs free pro bono sealing clinics and can help you read it.',
          remedy: 'Get Your Record First (CBI / court clerk)',
          citation: 'C.R.S. 24-72-701 et seq. (which path applies depends on the disposition)'
        },
        eligible_nonconviction_co: {
          status: 'eligible',
          title: 'No Conviction — Sealing Should Be Simple, and May Be Done',
          message: 'Because your case ended without a conviction, Colorado treats this as its easiest category. Acquittals, dismissals and completed deferred judgments are sealed through a simplified process handled inside your existing criminal case — no separate civil action, no waiting period. Arrests that never led to charges seal automatically after a year for offenses from 2022 onward, and a 2024 law (HB24-1133) expanded that automation further from 2025. So this may already be done: check with the Colorado Bureau of Investigation before you file anything. If it has not happened, sealing a record that should have sealed on its own is free. Expunge Colorado runs free pro bono clinics and this is exactly what they are for.',
          remedy: 'Check with CBI first — simplified in-case sealing if needed',
          citation: 'C.R.S. 24-72-701 et seq.; HB24-1133'
        },
        check_record_first_co: {
          status: 'eligible',
          title: 'Your Record May Already Be Sealed — Check Before You File',
          message: 'Start here, not with a motion or a fee. Colorado has been sealing eligible records AUTOMATICALLY since July 2024 under Clean Slate — no petition, no fee, and no notification. Over 100,000 records went in the first batch alone. Based on your dates you are past the automatic period for your offense, so there is a real chance this is already done. Find out before you spend anything: request your criminal history from the Colorado Bureau of Investigation and see what it shows. One caveat worth knowing rather than discovering: the District Attorney can object to automatic sealing on public-safety grounds, so automatic is not the same as guaranteed. If the automatic system did not reach you, the petition path is still open — a Motion to Seal (form JDF 612) filed in your existing criminal case — and sealing a record that should have auto-sealed is free.',
          remedy: 'Check with CBI first — Motion to Seal (JDF 612) only if automatic sealing missed you',
          citation: 'C.R.S. 13-3-117; C.R.S. 24-72-706'
        },
        // The inversion, said plainly — as in Utah.
        eligible_petition_faster_co: {
          status: 'eligible',
          title: 'Petitioning Now Is Faster Than Waiting',
          message: 'Here is something counterintuitive and worth reading twice: for your offense, filing now is FASTER than waiting for Colorado\'s automatic system. Colorado has automatic Clean Slate sealing that costs nothing and needs no petition — but its waiting periods are LONGER than the petition\'s for the same offense. A petty offense can be petitioned at 1 year but is not automatically sealed until 4; a class 2 or 3 misdemeanor at 2 years versus 7. Based on your dates you have passed the petition threshold but not the automatic one, so waiting would cost you years you do not have to spend. If you would rather not file, you can wait — but you would be waiting longer on purpose. To petition: file a Motion to Seal Conviction Records (form JDF 612, instructions JDF 611) in your existing criminal case — since 2022 there is no separate civil action — attach a current CBI criminal history, and serve the District Attorney. Remote hearings are allowed. The filing fee is one of the things we are still verifying.',
          remedy: 'File now — Motion to Seal (JDF 612). Do not wait for automatic sealing.',
          citation: 'C.R.S. 24-72-706 (petition periods); C.R.S. 13-3-117 (automatic periods)'
        },
        eligible_petition_discretion_co: {
          status: 'eligible',
          title: 'Eligible to Petition — But the Court Decides',
          message: 'Based on your dates you appear eligible to petition now, and filing beats waiting: the automatic period for a misdemeanor is 7 years, and you are past the 3-year petition threshold. One thing to go in knowing, though — for a class 1 misdemeanor the court does not simply grant it. The judge weighs your privacy interest against the public interest in the record staying open, so this is a decision rather than a formality, and how you present it matters. File a Motion to Seal (form JDF 612) in your existing criminal case, attach a current CBI criminal history, and serve the District Attorney, who may object. Remote hearings are allowed. Expunge Colorado runs free pro bono sealing clinics, and for a discretionary motion that help is worth taking.',
          remedy: 'Motion to Seal (JDF 612) — court discretion applies',
          citation: 'C.R.S. 24-72-706'
        },
        eligible_pardon_co: {
          status: 'eligible',
          title: 'Pardoned — You Can Petition Immediately',
          message: 'Because you were pardoned for this offense, Colorado lets you petition to seal it immediately — there is no waiting period to serve. File a Motion to Seal Conviction Records (form JDF 612) in your existing criminal case, attach a current CBI criminal history, and serve the District Attorney. Expunge Colorado runs free pro bono sealing clinics if you want help with the filing.',
          remedy: 'Motion to Seal (JDF 612) — no waiting period after a pardon',
          citation: 'C.R.S. 24-72-706'
        },
        // The honest answer when the sources disagree.
        complex_felony_period_co: {
          status: 'complex',
          title: 'Eligible Felony — But We Cannot Tell You the Waiting Period',
          message: 'Your offense is in the category Colorado CAN seal: class 4, 5 and 6 felonies and drug levels 2 through 4 are sealable, which is more than most states allow. What we cannot tell you is when. Our sources disagree about the waiting period — one says 3 years for most felonies, another says 5 for some — and we are not going to pick one and let you plan around a coin flip. So here is what to do instead. Colorado also seals eligible felonies automatically at 10 years, so if you are past that, check with the Colorado Bureau of Investigation first: it may already be done, and that costs nothing. If you are inside 10 years, you are very likely in the window where petitioning beats waiting — every Colorado petition period is shorter than its automatic counterpart — and a clerk or Expunge Colorado can tell you the exact date in about five minutes. Expunge Colorado runs free pro bono sealing clinics. Resolving this period is our top verification item for Colorado.',
          remedy: 'Ask a clerk or Expunge Colorado for the exact period — then Motion to Seal (JDF 612)',
          citation: 'C.R.S. 24-72-706 (felony petition period unresolved — sources conflict); C.R.S. 13-3-117'
        },
        waiting_co: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Colorado\'s petition periods run from your final disposition or your release, whichever came later, and they are short: 1 year for a civil infraction, petty offense or drug petty offense; 2 years for a class 2 or 3 misdemeanor or a drug misdemeanor; 3 years for a class 1 misdemeanor. Based on your dates yours has not run yet. Two things worth knowing: a new conviction in the meantime blocks sealing, so staying conviction-free is what gets you there. And when your date does arrive, filing will probably beat waiting — Colorado\'s automatic sealing takes 4 to 7 years for the same offenses.',
          remedy: 'Wait for the petition period, then file JDF 612',
          citation: 'C.R.S. 24-72-706'
        },
        ineligible_serious_co: {
          status: 'ineligible',
          title: 'Excluded Offense',
          message: 'Colorado excludes a specific list from sealing: class 1, 2 and 3 felonies; level 1 drug felonies; DUI and DWAI; domestic violence; crimes of violence and "extraordinary risk" crimes; sex offenses; crimes against victims protected by the Victim Rights Act; child abuse; and traffic offenses. No waiting period changes that, and automatic sealing does not reach them either. DUI is the one that surprises people most — Colorado does not seal it however long ago it was. If you are not certain your offense is on that list, it is worth checking: Expunge Colorado runs free pro bono sealing clinics, and Colorado Legal Services can advise. A pardon is a separate path these exclusions do not govern — and a pardon lets you petition to seal immediately.',
          remedy: 'None (Statutorily Excluded) — ask about a pardon',
          citation: 'C.R.S. 24-72-706(2)'
        },
        ineligible_intervening_co: {
          status: 'ineligible',
          title: 'A Later Conviction Blocks Sealing',
          message: 'Colorado requires you to have stayed conviction-free since the case you want sealed. A conviction after it blocks sealing of the earlier record — both by petition and automatically. This is not necessarily permanent: the newer conviction has its own waiting period, and once that runs you may be able to seal both. Come back and run this again using the newer conviction\'s details, or take it to one of Expunge Colorado\'s free pro bono clinics — the interaction between two records is exactly what they can untangle.',
          remedy: 'None Yet (Later Conviction) — reassess from the newer conviction\'s dates',
          citation: 'C.R.S. 24-72-706'
        },
        complex_level_co: {
          status: 'complex',
          title: 'We Need the Classification — It Decides Everything Here',
          message: 'In Colorado the classification decides both whether you can seal and how long you wait: a petty offense clears in 1 year, a class 2 or 3 misdemeanor in 2, a class 1 misdemeanor in 3 with a hearing, and class 4-6 felonies are sealable on a period we are still verifying — while class 1-3 felonies are excluded entirely. Guessing would send you down the wrong path, so we will not. Your court paperwork states the classification. A CBI criminal history shows it. And Expunge Colorado runs free pro bono sealing clinics where someone will read it with you — which is the easiest way to find out.',
          remedy: 'Get Your Classification First (court paperwork / CBI / Expunge Colorado)',
          citation: 'C.R.S. 24-72-706'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'Motion to Seal Conviction Records (C.R.S. 24-72-704 to -710)',
          formName: 'Form JDF 612 (instructions JDF 611)',
          formUrl: 'https://www.coloradojudicial.gov/self-help/sealing-criminal-records',
          steps: [
            'Check first whether Clean Slate already sealed it — request your criminal history from the Colorado Bureau of Investigation. Sealing has been automatic since July 2024, and over 100,000 records went in the first batch.',
            'Obtain a current CBI criminal history report to attach to the motion.',
            'Complete form JDF 612 (instructions are in JDF 611) and file it IN your existing criminal case — since 2022 there is no separate civil action.',
            'Serve the District Attorney, who may object.',
            'Attend the hearing if one is set — remote hearings have been allowed since 2024. For a class 1 misdemeanor or a felony, the court weighs your privacy against the public interest, so expect a decision rather than a formality.'
          ],
          // null: Wave 1 gives $65 (statute-based sources) vs $224 (older
          // judicial-district packet, probably the pre-2022 civil-action fee).
          // Probably stale rather than wrong — but "probably" is not a fee.
          fees: null,
          feeWaiver: null,
          courtContact: 'The court that handled your criminal case'
        }
      },
      legalAid: [
        { name: 'Expunge Colorado (free pro bono sealing clinics)', url: 'https://expungecolorado.org' },
        { name: 'Colorado Legal Services', url: 'https://www.coloradolegalservices.org' }
      ]
    }
  },

  // ==========================================================================
  // CONNECTICUT — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave2_Draft_Package.md
  //
  // CT says ERASURE, and it means the strong thing: an erased record may be
  // lawfully sworn never to have happened. Three tracks, and the structurally
  // unusual one is the pardon: in Connecticut an ABSOLUTE PARDON from the Board
  // of Pardons and Paroles IS the expungement mechanism for the serious
  // felonies the automatic and petition paths do not reach — so it is encoded
  // as a path, never as "ineligible".
  //
  // THE CLOCK QUIRK, and the thing generic tools get wrong: the automatic
  // waiting period runs from the person's MOST RECENT conviction of ANY crime,
  // not from this offence's own date. A new conviction resets everyone's clock.
  // The date node asks for that date in those words.
  //
  // ROLLOUT: Clean Slate erasures were delayed for years and RESUMED October
  // 2025 (~50k done, 100k+ expected). Every automatic result says "may have
  // been or will be erased — check", never "done".
  // ==========================================================================
  CT: {
    code: 'CT',
    name: 'Connecticut',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave2_Draft_Package.md',
    terminology:
      'Connecticut says ERASURE — its single word for what other states split into expungement and '
      + 'sealing. An erased record is treated as never having existed, and you may lawfully deny it. '
      + 'Three routes. AUTOMATIC "Clean Slate" erasure clears many post-2000 convictions with no '
      + 'petition. PETITION erasure (form JD-CR-202, free) covers pre-2000 convictions and cannabis. '
      + 'And an ABSOLUTE PARDON from the Board of Pardons and Paroles — which in Connecticut is not '
      + 'just clemency but a full erasure of your entire record, and is the route for the serious '
      + 'felonies the other two do not reach.',
    keyDates: [
      {
        label: 'Clean Slate automatic erasures resumed after delays',
        date: '2025-10',
        kind: 'operative',
        note: 'Wave 2 gives month and year only. Delayed for years by data-system problems; ~50,000 convictions erased so far, 100,000+ expected. "Eligible" does not yet mean "erased".',
      },
      {
        label: 'Clean Slate Act (Public Act 21-42) — automatic erasure of post-2000 convictions',
        date: '2021',
        kind: 'effective',
        note: 'Wave 2 gives the year only.',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the current Clean Slate rollout status, and how does a person check whether their own record has been erased yet? Wave 2 says erasures resumed October 2025 with ~50k of 100k+ done, and that individuals are not notified. Confirm the status page (portal.ct.gov/cleanslate) and the record-check process before any UI copy claims completeness.',
        blocksFields: [],
      },
      {
        question:
          'DUI CONFLICT: is a DUI (Conn. Gen. Stat. § 14-227a) eligible for automatic erasure? One attorney source says DUIs are eligible; the state\'s own petition-form guidance blocks § 14-227a where there is a repeat within 10 years — which reads as first-offence eligible, repeat blocked. Read § 54-142a(e)(2)(C) and encode exactly what it says. The tree currently routes DUI to the exclusion gate as a question rather than assuming.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 54-142a(e)(2)(C) exclusion list in full: family violence crimes (§ 46b-38a), sex offences requiring registration, and crimes with a maximum sentence over 5 years even where the actual sentence was less. The tree asks a person to self-assess this; the exact list needs confirming against the statute.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the automatic erasure waiting periods against § 54-142a(e): misdemeanours 7 years, and class D/E and unclassified felonies with maximum terms of 5 years or less at 10 years — both measured from the person\'s MOST RECENT conviction of any crime.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions (including accelerated rehabilitation) treated for erasure? Not covered in Wave 2 — standing call-sheet question for every state.',
        blocksFields: [],
      },
      {
        question:
          'Is petition erasure (form JD-CR-202) and cannabis erasure genuinely free, and pardon applications too? Wave 2 says all three are free; confirm at the counter and on the Board of Pardons page.',
        blocksFields: ['resources.remedies.petition.fees', 'resources.remedies.petition.feeWaiver'],
      },
      {
        question:
          'What is the exact effective date of the resumed automatic erasures and of Public Act 21-42? Wave 2 gives month/year and year only.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Conn. Gen. Stat. § 54-142a (erasure of criminal records)', url: null, retrievedOn: null },
      { id: 'Conn. Gen. Stat. § 54-142a(e) (automatic Clean Slate erasure; periods; exclusions (e)(2)(C))', url: null, retrievedOn: null },
      { id: 'Conn. Gen. Stat. § 54-130a (absolute pardon — Board of Pardons and Paroles)', url: null, retrievedOn: null },
      { id: 'Conn. Gen. Stat. § 46b-38a (family violence crimes — automatic-erasure exclusion)', url: null, retrievedOn: null },
      { id: 'Conn. Gen. Stat. § 14-227a (DUI — erasure eligibility in conflict)', url: null, retrievedOn: null },
      { id: 'Public Act 21-42 (Clean Slate Act)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'conviction_era_ct' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_ct' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_ct' },
            { label: 'Deferred / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        conviction_era_ct: {
          type: 'boolean',
          text: 'Was this conviction entered on or after January 1, 2000?',
          yes: 'excluded_ct',
          no: 'pre2000_ct'
        },
        pre2000_ct: {
          type: 'boolean',
          text: 'Was this a cannabis possession offense?',
          yes: 'eligible_cannabis_ct',
          no: 'eligible_petition_ct'
        },
        excluded_ct: {
          type: 'boolean',
          text: 'Was the offense any of these: a family violence crime, an offense requiring sex offender registration, a DUI, or any offense whose MAXIMUM possible sentence was more than 5 years — even if the sentence you actually received was shorter?',
          yes: 'pardon_path_ct',
          no: 'offense_class_ct'
        },
        offense_class_ct: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'auto_date_misd_ct' },
            { label: 'Felony', value: 'felony', next: 'felony_class_ct' },
            { label: 'Infraction', value: 'infraction', next: 'auto_date_misd_ct' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_class_ct' }
          ]
        },
        felony_class_ct: {
          type: 'choice',
          text: 'What class of felony was it? (Your sentencing paperwork says. Connecticut automatically erases only the lower-level felonies.)',
          options: [
            { label: 'Class D or E felony, or an unclassified felony with a maximum term of 5 years or less', value: 'low', next: 'auto_date_felony_ct' },
            { label: 'Class A, B, or C felony (or maximum term over 5 years)', value: 'high', next: 'pardon_path_ct' },
            { label: 'I don\'t know the class', value: 'unsure', next: 'complex_class_ct' }
          ]
        },
        // THE CLOCK QUIRK. Both automatic date nodes ask for the MOST RECENT
        // conviction date, not this offence's date — that is the § 54-142a(e)
        // trigger, and it is what generic tools miss.
        auto_date_misd_ct: {
          type: 'date',
          text: 'What is the date of your MOST RECENT conviction of any crime — not just this case, but the latest conviction on your whole record? (Connecticut measures the wait from that date, and a newer conviction restarts it.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'the person\'s most recent conviction of any crime (Conn. Gen. Stat. § 54-142a(e) — misdemeanours)' },
            nextPass: 'check_record_first_ct',
            nextFail: 'waiting_ct'
          }
        },
        auto_date_felony_ct: {
          type: 'date',
          text: 'What is the date of your MOST RECENT conviction of any crime — not just this case, but the latest conviction on your whole record? (Connecticut measures the wait from that date, and a newer conviction restarts it.)',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'the person\'s most recent conviction of any crime (Conn. Gen. Stat. § 54-142a(e) — class D/E and low unclassified felonies)' },
            nextPass: 'check_record_first_ct',
            nextFail: 'waiting_ct'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Connecticut\'s erasure rules split on how the case ended: dismissals, acquittals and nolles are already erased automatically, while convictions run through the Clean Slate clock, a petition, or a pardon depending on the offense. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable — and guessing would be worse than saying nothing. Request your conviction record through the Connecticut Judicial Branch, or ask the clerk of the sentencing court. Clean Slate CT (cleanslatect.org) also has an eligibility-date calculator.',
          remedy: 'Get Your Record First (CT Judicial Branch / Clean Slate CT)',
          citation: 'Conn. Gen. Stat. § 54-142a (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Connecticut\'s erasure rules are screened here for convictions, dismissals, and acquittals. How a completed diversion — including accelerated rehabilitation — is treated for erasure is not something this screening has researched yet, and we would rather tell you that than guess. Clean Slate CT and Connecticut Legal Services can confirm how your disposition is treated.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Screened)',
          citation: 'Conn. Gen. Stat. § 54-142a (treatment of diversions not yet researched)'
        },
        eligible_nonconviction_ct: {
          status: 'eligible',
          title: 'Non-Conviction — Already Erased',
          message: 'Because your case ended without a conviction, Connecticut has almost certainly already erased it — dismissals and acquittals erase automatically, and a nolle erases 13 months after it is entered. This is long-standing law, not the new Clean Slate program, so it does not depend on the current rollout. You do not need to file anything. If your record still shows the case, request your conviction record through the Connecticut Judicial Branch to confirm the erasure went through, and if it did not, the clerk of the court that heard the case can correct it. Once erased, you may lawfully state the case never happened.',
          remedy: 'Automatic Erasure of Non-Convictions (already applied) — confirm with the Judicial Branch',
          citation: 'Conn. Gen. Stat. § 54-142a'
        },
        check_record_first_ct: {
          status: 'eligible',
          title: 'Your Record May Already Be Erased — Check Before Anything Else',
          message: 'Start by checking. Connecticut erases eligible convictions AUTOMATICALLY under Clean Slate — no petition, no fee, and no notification. Based on your dates you are past the waiting period for your offense (7 years for a misdemeanor, 10 for a low-level felony, both measured from your most recent conviction of any crime). The program was delayed for years and only resumed in October 2025, so it is working through a backlog and "eligible" does not yet guarantee "done" — but there is a real chance yours is erased or soon will be. Check your status on the state\'s Clean Slate page (portal.ct.gov/cleanslate) or by requesting your conviction record through the Judicial Branch. Clean Slate CT (cleanslatect.org) has a calculator for the dates. If yours has not been reached, there is nothing to file — the erasure is automatic once the program gets to it; court debt does not block it, though the debt itself survives.',
          remedy: 'Check your Clean Slate status (portal.ct.gov/cleanslate) — erasure is automatic',
          citation: 'Conn. Gen. Stat. § 54-142a(e)'
        },
        eligible_petition_ct: {
          status: 'eligible',
          title: 'Pre-2000 Conviction — Petition to Erase (Free)',
          message: 'Because your conviction is from before January 1, 2000, it falls outside the automatic Clean Slate program, but you can petition to erase it — and it is free. File form JD-CR-202 in the court where you were sentenced, one form per docket number. There is no filing fee. If your record has more than one old case, you file for each separately.',
          remedy: 'Petition for Erasure (form JD-CR-202) — free',
          citation: 'Conn. Gen. Stat. § 54-142a'
        },
        eligible_cannabis_ct: {
          status: 'eligible',
          title: 'Cannabis Possession — Free Erasure, No Waiting Period',
          message: 'Cannabis possession offenses have their own erasure path in Connecticut, and it is the easiest one: no waiting period and no fee. This covers possession of up to 4 ounces from October 2015 to January 2021, and pre-2000 cannabis possession. Many qualifying cannabis records were already erased automatically, so check your record first through the Judicial Branch — if yours was not, the petition is free.',
          remedy: 'Cannabis Erasure — free, no waiting period',
          citation: 'Conn. Gen. Stat. § 54-142a'
        },
        pardon_path_ct: {
          status: 'complex',
          title: 'Your Path Is a Pardon — And in Connecticut That Means Full Erasure',
          message: 'Connecticut does not automatically erase this offense — but do not read that as a dead end, because Connecticut\'s pardon is unusual and strong. An ABSOLUTE PARDON from the Board of Pardons and Paroles erases your ENTIRE record, and it is how the state clears serious felonies, family violence offenses, and anything with a maximum sentence over 5 years. You can apply 3 years after a misdemeanor conviction or 5 years after a felony, as long as you have no pending charges, are not on probation or parole, and have had no nolle in the last 13 months. It is free, and hearings are held virtually. This is a real route that most people do not know exists — the Board of Pardons and Paroles (ct.gov/bopp) has pre-screening resources, and Connecticut Legal Services can help you prepare.',
          remedy: 'Absolute Pardon Application (Board of Pardons and Paroles) — free, full erasure',
          citation: 'Conn. Gen. Stat. § 54-130a'
        },
        waiting_ct: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Connecticut\'s automatic erasure comes 7 years after a misdemeanor conviction, or 10 years after a low-level felony — but here is the part that catches people out, and it is worth understanding: the clock runs from your MOST RECENT conviction of any crime, not from this case. A newer conviction restarts it for everything. Based on the date you gave, the period has not run yet. Staying conviction-free is what gets you there, and once the period runs the erasure is automatic — court debt does not block it. If you would rather not wait, an absolute pardon from the Board of Pardons and Paroles is available to apply for sooner (3 years for a misdemeanor, 5 for a felony).',
          remedy: 'Wait for the automatic period, or apply for a pardon sooner',
          citation: 'Conn. Gen. Stat. §§ 54-142a(e), 54-130a'
        },
        complex_class_ct: {
          status: 'complex',
          title: 'We Need the Offense Class',
          message: 'In Connecticut the class of the offense decides which erasure path you take and how long you wait — a misdemeanor is 7 years, a class D/E or low-level felony is 10, and the more serious felonies go through a pardon instead. Guessing would send you down the wrong path, so we will not. Your sentencing paperwork states the class, and Clean Slate CT (cleanslatect.org) can read your record with you. Connecticut Legal Services also helps for free.',
          remedy: 'Get Your Offense Class First (sentencing paperwork / Clean Slate CT)',
          citation: 'Conn. Gen. Stat. § 54-142a(e)'
        }
      }
    },
    resources: {
      remedies: {
        petition: {
          name: 'Petition for Erasure (pre-2000 convictions and cannabis)',
          formName: 'Form JD-CR-202',
          formUrl: 'https://portal.ct.gov/cleanslate',
          steps: [
            'For a post-2000 conviction, there is nothing to file — erasure is automatic once the Clean Slate program reaches it. Check your status at portal.ct.gov/cleanslate first.',
            'For a pre-2000 conviction or a cannabis offense, complete form JD-CR-202.',
            'File it in the court where you were sentenced — one form per docket number.',
            'There is no filing fee.'
          ],
          // null: Wave 2 says petition, cannabis and pardon applications are all
          // free, but flags it for confirmation at the counter.
          fees: null,
          feeWaiver: null,
          courtContact: 'The court where you were sentenced'
        },
        pardon: {
          name: 'Absolute Pardon (Board of Pardons and Paroles) — full erasure',
          formName: 'Absolute Pardon Application',
          formUrl: 'https://www.ct.gov/bopp',
          steps: [
            'Confirm you are eligible to apply: 3 years since a misdemeanor conviction or 5 years since a felony, no pending charges, not on probation or parole, no nolle in the last 13 months.',
            'Apply through the Board of Pardons and Paroles (ct.gov/bopp) — the application is free.',
            'Use the Board\'s pre-screening resources before applying.',
            'Hearings are held virtually. An absolute pardon erases your entire record.'
          ],
          fees: '$0 — the pardon application is free.',
          feeWaiver: 'Not applicable',
          courtContact: 'Connecticut Board of Pardons and Paroles'
        }
      },
      legalAid: [
        { name: 'Clean Slate CT (eligibility-date calculator)', url: 'https://www.cleanslatect.org' },
        { name: 'Connecticut Legal Services', url: 'https://www.ctlegal.org' }
      ]
    }
  },

  // ==========================================================================
  // DELAWARE — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave2_Draft_Package.md
  //
  // Two petition tracks with statutory names the UI keeps, plus automatic.
  //   MANDATORY (SBI, 11 Del. C. § 4373): if you fit a category, the State
  //     Bureau of Identification MUST expunge — no judicial discretion.
  //   DISCRETIONARY (court, § 4374): a judge weighs "manifest injustice"; the
  //     AG gets 120 days to object.
  //   AUTOMATIC Clean Slate (SB 111/112 of 2021, processing since Aug 2024)
  //     covers the mandatory-eligible universe with no application — but the
  //     statute preserves the right to APPLY if it has not happened yet, which
  //     is the user's action path.
  //
  // The favourable-termination rule is the branch worth getting right: a case
  // terminated in the accused's favour is mandatory-expungeable IMMEDIATELY,
  // even with other ineligible convictions on the record (§ 4373).
  // ==========================================================================
  DE: {
    code: 'DE',
    name: 'Delaware',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave2_Draft_Package.md',
    terminology:
      'Delaware says EXPUNGEMENT, and it has two petition versions plus an automatic one. MANDATORY '
      + 'expungement runs through the State Bureau of Identification (SBI): if your case fits a '
      + 'listed category, they MUST expunge it — a judge is not involved. DISCRETIONARY expungement '
      + 'runs through the court, where a judge decides whether keeping the record would be a '
      + '"manifest injustice". AUTOMATIC "Clean Slate" expungement has, since August 2024, been '
      + 'clearing the mandatory-eligible cases with no application at all — and if it has not reached '
      + 'yours yet, you keep the right to apply for the mandatory expungement yourself.',
    keyDates: [
      {
        label: 'Automatic Clean Slate expungement processing began',
        date: '2024-08',
        kind: 'operative',
        note: 'Wave 2 gives month and year only. Covers the mandatory-eligible universe; rollout completeness is an open question.',
      },
      {
        label: 'Clean Slate Act (SB 111 / SB 112) enacted',
        date: '2021',
        kind: 'effective',
        note: 'Wave 2 gives the year only.',
      },
    ],
    openQuestions: [
      {
        question:
          'WHICH felonies are on the § 4373 mandatory felony list (the 10-year path)? Wave 2 flags that the source text cut off here — the felony list itself was not captured. The tree routes an eligible-list felony to a result that says its dates but flags that the list membership needs confirming against § 4373.',
        blocksFields: [],
      },
      {
        question:
          'What is the current fingerprinting fee for mandatory expungement through SBI? Wave 2 gives "$52 (ACLU-DE figure)" and marks it for verification. And is there any waiver? Ask SBI/DSP directly.',
        blocksFields: ['resources.remedies.mandatory.fees', 'resources.remedies.mandatory.feeWaiver'],
      },
      {
        question:
          'What is the court fee for a discretionary expungement petition? § 4374(j) authorises a "reasonable fee" but does not state an amount. And can it be waived? Get the number from a Superior Court clerk.',
        blocksFields: ['resources.remedies.discretionary.fees', 'resources.remedies.discretionary.feeWaiver'],
      },
      {
        question:
          'What is the current status and completeness of the automatic Clean Slate rollout? Wave 2 says processing began August 2024 and to verify completeness on delaware.gov before any UI copy claims records are already done.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 4372(f) exclusion list: Title 21 motor-vehicle offences including DUI (with narrow § 4374(i)(2) exceptions), violent felonies (§ 4201(c) list), and DV / child-victim / vulnerable-adult crimes (barred from mandatory, 7-year discretionary or pardon instead). Also confirm the prior-expungement-within-10-years and felony-after-felony-expungement bars.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions (including Probation Before Judgment) treated for expungement? Standing call-sheet question for every state — Wave 2 does not cover it.',
        blocksFields: [],
      },
      {
        question:
          'What are the exact effective dates for the August 2024 automatic-processing start and the 2021 Clean Slate Act? Wave 2 gives month/year and year only.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: '11 Del. C. § 4372 (definitions; exclusions at (f))', url: null, retrievedOn: null },
      { id: '11 Del. C. § 4373 (mandatory expungement — SBI)', url: null, retrievedOn: null },
      { id: '11 Del. C. § 4374 (discretionary expungement — court; (j) reasonable fee)', url: null, retrievedOn: null },
      { id: '11 Del. C. § 4375 (post-pardon expungement)', url: null, retrievedOn: null },
      { id: '11 Del. C. § 4201(c) (violent felony list — exclusion)', url: null, retrievedOn: null },
      { id: 'SB 111 / SB 112 of 2021 (Clean Slate — automatic expungement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_de' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_favorable_de' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_favorable_de' },
            { label: 'Deferred / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_de: {
          type: 'boolean',
          text: 'Was the offense any of these: a motor-vehicle offense under Title 21 including DUI, a violent felony, or a crime involving domestic violence, a child victim, or a vulnerable adult?',
          yes: 'excluded_path_de',
          no: 'marijuana_de'
        },
        excluded_path_de: {
          type: 'boolean',
          text: 'Was it specifically a Title 21 motor-vehicle offense or a DUI?',
          yes: 'ineligible_title21_de',
          no: 'discretionary_de'
        },
        marijuana_de: {
          type: 'boolean',
          text: 'Was this a marijuana or paraphernalia possession offense, or an underage-alcohol offense?',
          yes: 'eligible_immediate_de',
          no: 'other_convictions_de'
        },
        other_convictions_de: {
          type: 'boolean',
          text: 'Apart from this case, do you have ANY other conviction on your record — anywhere, ever?',
          yes: 'has_record_de',
          no: 'offense_level_de'
        },
        offense_level_de: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'mandatory_misd_date_de' },
            { label: 'Felony', value: 'felony', next: 'mandatory_felony_date_de' },
            { label: 'Infraction', value: 'infraction', next: 'mandatory_violation_date_de' }
          ]
        },
        // No other convictions at all -> the clean mandatory path (5yr misd).
        mandatory_misd_date_de: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction (11 Del. C. § 4373 — misdemeanour mandatory expungement, no other convictions)' },
            nextPass: 'check_record_first_de',
            nextFail: 'waiting_de'
          }
        },
        mandatory_violation_date_de: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction (11 Del. C. § 4373 — violation mandatory expungement)' },
            nextPass: 'check_record_first_de',
            nextFail: 'waiting_de'
          }
        },
        mandatory_felony_date_de: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted, or released — whichever was later?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'conviction or release, whichever later (11 Del. C. § 4373 — listed-felony mandatory expungement)' },
            nextPass: 'eligible_felony_list_de',
            nextFail: 'waiting_de'
          }
        },
        // Has other convictions -> discretionary (court) path.
        has_record_de: {
          type: 'choice',
          text: 'Roughly how much else is on your record?',
          options: [
            { label: 'One or more other misdemeanors or violations, no felonies', value: 'misd_multi', next: 'discretionary_multi_date_de' },
            { label: 'A felony', value: 'felony', next: 'discretionary_de' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_record_de' }
          ]
        },
        discretionary_multi_date_de: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your MOST RECENT case resolved?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'most recent case (11 Del. C. § 4374 — multiple violations/misdemeanours, discretionary)' },
            nextPass: 'eligible_discretionary_de',
            nextFail: 'waiting_de'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Delaware\'s expungement rules split sharply on how the case ended: a case that ended in your favor is expungeable immediately even if you have other convictions, while a conviction runs through the mandatory or discretionary path depending on your record. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. Request a Certified Delaware Criminal History from SBI, or ask the court that handled the case. The ACLU of Delaware runs free expungement workshops.',
          remedy: 'Get Your Record First (SBI / court clerk)',
          citation: '11 Del. C. §§ 4373, 4374 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Delaware\'s expungement rules are screened here for convictions, dismissals, and acquittals. How a completed diversion — including Probation Before Judgment — is treated is not something this screening has researched yet, and we would rather tell you that than guess. The ACLU of Delaware and the Delaware Center for Justice can confirm how your disposition is treated.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Screened)',
          citation: '11 Del. C. §§ 4373, 4374 (treatment of diversions not yet researched)'
        },
        eligible_favorable_de: {
          status: 'eligible',
          title: 'Case Ended in Your Favor — Expungeable Now, Whatever Else Is on Your Record',
          message: 'This is Delaware\'s strongest rule and it works in your favor: because the case ended without a conviction — dismissed or acquitted — you are entitled to a MANDATORY expungement immediately, and it does not matter what else is on your record. Other convictions, even ineligible ones, do not block this. It may already have happened automatically since August 2024, so check first: request a Certified Delaware Criminal History from the State Bureau of Identification. If it has not been done, you can apply to SBI for the mandatory expungement yourself.',
          remedy: 'Mandatory Expungement — favorable termination (11 Del. C. § 4373), check SBI first',
          citation: '11 Del. C. § 4373'
        },
        eligible_immediate_de: {
          status: 'eligible',
          title: 'Marijuana or Underage-Alcohol Offense — Immediate Mandatory Expungement',
          message: 'Marijuana and paraphernalia possession, and underage-alcohol offenses, get a mandatory expungement in Delaware with no waiting period. This may already have happened automatically since August 2024 — check by requesting a Certified Delaware Criminal History from SBI. If it has not, you can apply to SBI for the mandatory expungement.',
          remedy: 'Mandatory Expungement — immediate (11 Del. C. § 4373), check SBI first',
          citation: '11 Del. C. § 4373'
        },
        check_record_first_de: {
          status: 'eligible',
          title: 'Your Record May Already Be Expunged — Check Before You Apply',
          message: 'Start by checking. Since August 2024, Delaware has been expunging mandatory-eligible cases AUTOMATICALLY under Clean Slate — no application and no fee. Based on your dates you appear to be in that eligible group (a misdemeanor with no other convictions after 5 years, or a violation after 3), so there is a real chance it is already done. Request a Certified Delaware Criminal History from the State Bureau of Identification to see. If the automatic system has not reached you yet, you keep the right to apply for the mandatory expungement yourself — SBI must grant it if you fit the category. That route involves fingerprinting and an SBI application, and the fee is one of the things we are still confirming.',
          remedy: 'Check with SBI first — apply for mandatory expungement if it has not happened',
          citation: '11 Del. C. § 4373'
        },
        eligible_felony_list_de: {
          status: 'eligible',
          title: 'Possible Mandatory Felony Expungement — One Thing to Confirm',
          message: 'Based on your dates — 10 years since conviction or release, with no other convictions — you may qualify for a mandatory expungement of this felony under 11 Del. C. § 4373. There is one thing we cannot confirm for you: § 4373 lists which specific felonies are eligible for this path, and we have not been able to verify the full list, so whether YOUR felony is on it is the open question. That is exactly what the State Bureau of Identification checks, so applying will answer it, and the ACLU of Delaware\'s expungement workshops can check before you file. Do not assume either way until the offense is confirmed against the § 4373 list.',
          remedy: 'Mandatory Expungement if the felony is on the § 4373 list — confirm with SBI',
          citation: '11 Del. C. § 4373'
        },
        eligible_discretionary_de: {
          status: 'eligible',
          title: 'Discretionary Expungement — A Judge Decides',
          message: 'Because you have more than one case on your record, your route is a DISCRETIONARY expungement through the court rather than the automatic mandatory one. Based on your dates — 5 years since your most recent case — you are eligible to petition. Understand what "discretionary" means: a judge decides whether keeping the record would be a "manifest injustice", so this is an argument you make rather than a box you tick, and how you present it matters. File the petition in the Superior Court for the county of your most recent case; you MUST attach your criminal history or the petition is rejected outright. The Attorney General gets 120 days to object, and any victim is consulted. The court fee is set by the court and is something we are still confirming. The ACLU of Delaware runs free expungement workshops and this is a good one to bring to them.',
          remedy: 'Discretionary Expungement Petition (11 Del. C. § 4374) — Superior Court',
          citation: '11 Del. C. § 4374'
        },
        discretionary_de: {
          status: 'complex',
          title: 'Discretionary Expungement — And Worth a Person\'s Help',
          message: 'Your record includes a felony, which puts you on the DISCRETIONARY path: a court, not SBI, decides, and it weighs whether keeping the record would be a "manifest injustice". The waiting periods here are longer — generally 7 years for a felony, or for misdemeanors on the excluded list — and the exact eligibility depends on which offenses are involved. This is fact-specific enough that we are not going to finish the screening for you and risk getting it wrong. Two routes worth knowing: if you were unconditionally pardoned, § 4375 opens discretionary expungement for almost anything. And the ACLU of Delaware runs free expungement workshops built for exactly this. Bring your criminal history — you will need it either way.',
          remedy: 'Discretionary Expungement or Post-Pardon (11 Del. C. §§ 4374, 4375) — consult legal aid',
          citation: '11 Del. C. §§ 4374, 4375'
        },
        ineligible_title21_de: {
          status: 'ineligible',
          title: 'Title 21 Motor-Vehicle Offenses Are Mostly Not Expungeable',
          message: 'Motor-vehicle offenses under Title 21 — including DUI — are largely excluded from expungement in Delaware, whether mandatory or discretionary. There are a couple of narrow exceptions in § 4374(i)(2), but they are narrow. If you were unconditionally pardoned, § 4375 may open a discretionary expungement even here. A DUI is also a driving-record matter separate from your criminal record. If you are not certain your offense is a Title 21 offense rather than a criminal-code one, it is worth checking — the ACLU of Delaware runs free expungement workshops.',
          remedy: 'Generally None (Title 21) — ask about the § 4374(i)(2) exceptions or a pardon',
          citation: '11 Del. C. §§ 4372(f), 4374(i)(2)'
        },
        waiting_de: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Delaware\'s expungement waiting periods depend on the path: a mandatory misdemeanor expungement comes 5 years after conviction (with no other convictions at all), a violation after 3 years, and a listed felony 10 years after conviction or release. Based on your dates, yours has not run yet. Delaware also expunges mandatory-eligible cases automatically now, so once your period runs relief may arrive without you filing. If your record has more than one case, a discretionary path with different timing may apply instead.',
          remedy: 'Wait for the period to run, then check with SBI',
          citation: '11 Del. C. §§ 4373, 4374'
        },
        complex_record_de: {
          status: 'complex',
          title: 'Your Record Needs Sorting Out — By a Person',
          message: 'Which Delaware path you take depends on exactly what else is on your record: a clean record points to the mandatory (SBI) path, other misdemeanors or violations point to a 5-year discretionary path, and a felony changes the analysis again. Since you are not sure what your record holds, we are not going to guess — and the good news is that finding out is a concrete step. Request a Certified Delaware Criminal History from SBI; you need it for any petition anyway. The ACLU of Delaware runs free expungement workshops where someone will read it with you.',
          remedy: 'Get Your Criminal History First (SBI) — then reassess',
          citation: '11 Del. C. §§ 4373, 4374'
        }
      }
    },
    resources: {
      remedies: {
        mandatory: {
          name: 'Mandatory Expungement (State Bureau of Identification, 11 Del. C. § 4373)',
          formName: 'SBI Mandatory Expungement Application',
          formUrl: 'https://courts.delaware.gov/help/expungement/',
          steps: [
            'Check first whether Clean Slate already did it — request a Certified Delaware Criminal History from SBI.',
            'If not, complete fingerprinting and obtain your Certified Delaware Criminal History through SBI.',
            'Submit the SBI mandatory expungement application. If you fit the category, SBI must grant it.',
            'The courts.delaware.gov expungement packet is the full how-to.'
          ],
          // null: Wave 2 gives "$52 fingerprinting (ACLU-DE figure)" and flags it.
          fees: null,
          feeWaiver: null,
          courtContact: 'Delaware State Bureau of Identification (SBI)'
        },
        discretionary: {
          name: 'Discretionary Expungement (Superior Court, 11 Del. C. § 4374)',
          formName: 'Petition for Discretionary Expungement',
          formUrl: 'https://courts.delaware.gov/help/expungement/',
          steps: [
            'Obtain your Certified Delaware Criminal History — you MUST attach it or the petition is summarily rejected.',
            'File the petition in the Superior Court for the county of your most recent case (Family Court if all charges were Family Court; it accepts email filing at FC_Expungement@delaware.gov).',
            'The Attorney General has 120 days to object, and any victim is consulted.',
            'Be ready to show that keeping the record would be a "manifest injustice" — this path is discretionary.'
          ],
          // null: § 4374(j) authorises a "reasonable fee" without an amount.
          fees: null,
          feeWaiver: null,
          courtContact: 'Superior Court (or Family Court), county of the most recent case'
        }
      },
      legalAid: [
        { name: 'ACLU of Delaware (free expungement workshops)', url: 'https://www.aclu-de.org' },
        { name: 'Delaware Center for Justice', url: 'https://www.dcjustice.org' }
      ]
    }
  },

  // ==========================================================================
  // OKLAHOMA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave2_Draft_Package.md
  //
  // TWO different things are called expungement and the UI must keep them apart:
  //   SECTION 18 (22 O.S. § 18) — seals the arrest AND the court record. The
  //     real one.
  //   SECTION 991(c) — a deferred-sentence cleanup that updates the disposition
  //     to "pled not guilty, case dismissed" but does NOT seal the arrest
  //     record. Weaker, and often paired with § 18.
  //
  // THE SINGLE-SOURCE RULE is the branch generic tools miss. Automatic Clean
  // Slate (HB 3316, § 18(B)-(C); processing legally began Nov 1, 2025) covers 11
  // of the § 18(A) categories — BUT 2024's SB 1770 limited the automatic path
  // for dismissals/misdemeanours to SINGLE-SOURCE records: any out-of-state or
  // federal arrest kills the AUTOMATIC path (not the petition path). One node.
  //
  // Honesty note the package asks for: a conviction expunges to "partially
  // sealed" — law enforcement can still see and use it. Said in the results.
  // ==========================================================================
  OK: {
    code: 'OK',
    name: 'Oklahoma',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave2_Draft_Package.md',
    terminology:
      'In Oklahoma "expungement" means sealing — the records survive but are hidden. Two different '
      + 'things share the name, and they are not the same: a SECTION 18 expungement seals both the '
      + 'arrest record and the court record (this is the real one), while a SECTION 991(c) '
      + 'expungement only cleans up a deferred sentence — it changes the disposition to show the '
      + 'case was dismissed but does NOT seal the arrest record. There is also an automatic "Clean '
      + 'Slate" path now rolling out. One honesty point: a conviction that is expunged becomes '
      + '"partially sealed", which means law enforcement can still see and use it.',
    keyDates: [
      {
        label: 'Automatic Clean Slate processing legally began',
        date: '2025-11-01',
        kind: 'operative',
        note: 'Effective Nov 1, 2022; automatic processing began Nov 1, 2025. OSBI is mid-implementation with a phased bridge plan — rollout status is an open question.',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the current OSBI Clean Slate rollout status? Automatic processing legally began Nov 1, 2025 but OSBI is mid-implementation with a phased bridge. Verify on oklahoma.gov/osbi before any UI copy claims records are being processed now. OSBI answers email at expungements@osbi.ok.gov and phone (405) 879-2641.',
        blocksFields: [],
      },
      {
        question:
          'Did HB 3037 pass? Wave 2 flags a proposed change raising the fine-only misdemeanor threshold to $1,000 and cutting waits. Encode CURRENT law only — the tree uses the existing under-$501 fine-only threshold. Check the legislature site for HB 3037\'s fate before updating.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the current § 18(A)(12)-(13) text on single-nonviolent-felony expungement, specifically any pardon prerequisites. Wave 2 flags this. The tree encodes the 5-year (one felony) and 10-year (two felonies) periods but the pardon-prerequisite detail is unverified.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the OSBI arrest-record processing fee. Wave 2 gives "$150 (their own page)"; the court-record expungement is free. Confirm the $150 and whether any waiver exists.',
        blocksFields: ['resources.remedies.section18.fees', 'resources.remedies.section18.feeWaiver', 'resources.remedies.section991c.fees', 'resources.remedies.section991c.feeWaiver'],
      },
      {
        question:
          'Confirm the SB 1770 single-source rule: any out-of-state or federal arrest disqualifies the AUTOMATIC path for dismissals and misdemeanours (not the petition path). The tree gates on this; confirm it applies only to the automatic path and only to those categories.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the 57 O.S. § 571 violent-offense list that separates a "nonviolent felony" (expungeable) from a violent one (not). The tree asks a person whether their felony was violent; the list itself needs confirming.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: '22 O.S. § 18 (expungement categories; (A) petition; (B)-(C) automatic; (D) same-transaction)', url: null, retrievedOn: null },
      { id: '22 O.S. § 19 (expungement procedure)', url: null, retrievedOn: null },
      { id: '22 O.S. § 991(c) (deferred-sentence expungement)', url: null, retrievedOn: null },
      { id: '57 O.S. § 571 (violent-offense list — separates nonviolent felony from violent)', url: null, retrievedOn: null },
      { id: 'HB 3316 (Clean Slate — automatic expungement)', url: null, retrievedOn: null },
      { id: 'SB 1770 of 2024 (single-source limitation on the automatic path)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'felony_or_misd_ok' },
            { label: 'Dismissed', value: 'dismissed', next: 'single_source_ok' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_acquittal_ok' },
            { label: 'Deferred Adjudication / Deferred sentence (Completed)', value: 'deferred', next: 'deferred_date_ok' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // THE SINGLE-SOURCE RULE — for dismissals (an automatic category).
        single_source_ok: {
          type: 'boolean',
          text: 'Do you have any arrest or criminal record OUTSIDE Oklahoma — in another state, or a federal case?',
          yes: 'eligible_dismissal_petition_ok',
          no: 'eligible_dismissal_auto_ok'
        },
        felony_or_misd_ok: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'misd_sentence_ok' },
            { label: 'Felony', value: 'felony', next: 'felony_violent_ok' },
            { label: 'Infraction', value: 'infraction', next: 'misd_sentence_ok' }
          ]
        },
        misd_sentence_ok: {
          type: 'choice',
          text: 'What was the sentence for the misdemeanor?',
          options: [
            { label: 'A fine only, under $501, and it is paid', value: 'fine_only', next: 'eligible_fine_only_ok' },
            { label: 'Jail time or a suspended sentence', value: 'jail', next: 'misd_jail_date_ok' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_misd_ok' }
          ]
        },
        misd_jail_date_ok: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the sentence?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence (22 O.S. § 18(A) — misdemeanour with jail/suspended sentence; no felony convictions, no pending charges)' },
            nextPass: 'eligible_misd_ok',
            nextFail: 'waiting_ok'
          }
        },
        felony_violent_ok: {
          type: 'boolean',
          text: 'Was the felony a violent offense on Oklahoma\'s list (57 O.S. § 571)?',
          yes: 'ineligible_violent_ok',
          no: 'felony_count_ok'
        },
        felony_count_ok: {
          type: 'choice',
          text: 'Counting your whole record: how many felony convictions do you have?',
          options: [
            { label: 'This is my only felony', value: 'one', next: 'felony_one_date_ok' },
            { label: 'Two felonies total', value: 'two', next: 'felony_two_date_ok' },
            { label: 'Three or more felonies', value: 'three_plus', next: 'ineligible_felony_count_ok' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_felony_ok' }
          ]
        },
        felony_one_date_ok: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the sentence?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence (22 O.S. § 18(A) — single nonviolent felony; no other convictions)' },
            nextPass: 'eligible_felony_ok',
            nextFail: 'waiting_ok'
          }
        },
        felony_two_date_ok: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the more recent sentence?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of sentence (22 O.S. § 18(A) — two nonviolent felonies)' },
            nextPass: 'eligible_felony_ok',
            nextFail: 'waiting_ok'
          }
        },
        deferred_date_ok: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case dismissed at the end of your deferred sentence?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'dismissal after a deferred sentence (22 O.S. § 18(A) — 1 year)' },
            nextPass: 'eligible_deferred_ok',
            nextFail: 'waiting_ok'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Oklahoma\'s expungement rules split on how the case ended: an acquittal or a dismissal with no prior felony is eligible with little or no wait, a deferred sentence clears a year after dismissal, and a conviction runs through waiting periods of up to 10 years. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. OSBI answers questions by email (expungements@osbi.ok.gov) and phone ((405) 879-2641), and Legal Aid Services of Oklahoma can help.',
          remedy: 'Get Your Record First (OSBI)',
          citation: '22 O.S. § 18 (which path applies depends on the disposition)'
        },
        eligible_acquittal_ok: {
          status: 'eligible',
          title: 'Acquitted — Eligible to Expunge',
          message: 'Because you were acquitted, you are eligible for a Section 18 expungement — the strong kind that seals both the arrest and the court record. File the petition in the district court of the county of arrest, with notice to the district attorney, the arresting agency, and OSBI. The court-record part is free; OSBI charges a processing fee for the arrest record that we are still confirming. Legal Aid Services of Oklahoma and the OU/TU law-school expungement clinics can help you file.',
          remedy: 'Section 18 Expungement Petition (22 O.S. § 18)',
          citation: '22 O.S. § 18'
        },
        eligible_dismissal_auto_ok: {
          status: 'eligible',
          title: 'Dismissed, Oklahoma-Only Record — May Expunge Automatically',
          message: 'Your case was dismissed and your record is Oklahoma-only, which matters: Oklahoma\'s automatic Clean Slate program covers dismissals, but a 2024 law (SB 1770) limits the AUTOMATIC path to "single-source" records — Oklahoma-only. Since yours qualifies, automatic processing may reach it without you filing anything. Automatic processing legally began November 1, 2025 and OSBI is still ramping up, so check your status with OSBI (expungements@osbi.ok.gov) rather than assume it is done. If you would rather not wait, the Section 18 petition path is always open — it seals both the arrest and court record. Note one thing: if this was a conviction rather than a true dismissal, an expunged conviction is only "partially sealed", meaning law enforcement can still see it.',
          remedy: 'Automatic Clean Slate (check OSBI) or Section 18 petition',
          citation: '22 O.S. § 18(A)-(C)'
        },
        eligible_dismissal_petition_ok: {
          status: 'eligible',
          title: 'Dismissed — Eligible to Petition (Automatic Path Blocked by an Out-of-State Record)',
          message: 'Your case was dismissed, so you are eligible for a Section 18 expungement. Here is the wrinkle worth knowing: because you have a record outside Oklahoma, the AUTOMATIC Clean Slate path is not open to you — a 2024 law (SB 1770) limits automatic processing to "single-source", Oklahoma-only records. That does NOT affect your right to petition; the out-of-state record blocks only the automatic route, not the manual one. So file the Section 18 petition in the district court of the county of arrest, with notice to the DA, the arresting agency, and OSBI. Legal Aid Services of Oklahoma can help.',
          remedy: 'Section 18 Expungement Petition (22 O.S. § 18) — automatic path blocked by out-of-state record',
          citation: '22 O.S. §§ 18(A), 18(B)-(C)'
        },
        eligible_fine_only_ok: {
          status: 'eligible',
          title: 'Fine-Only Misdemeanor — Eligible Now',
          message: 'A misdemeanor that ended in a fine only of less than $501, with the fine paid, is eligible for a Section 18 expungement immediately — no waiting period. File the petition in the district court of the county of arrest. The court-record expungement is free; OSBI charges a processing fee for the arrest record that we are still confirming. (Note: a bill was proposed to raise this fine threshold and cut waiting periods, but this reflects current law — check with OSBI if your fine was higher.)',
          remedy: 'Section 18 Expungement Petition (22 O.S. § 18) — immediate',
          citation: '22 O.S. § 18(A)'
        },
        eligible_misd_ok: {
          status: 'eligible',
          title: 'Misdemeanor — Eligible to Expunge',
          message: 'Based on your dates — 5 years since you completed the sentence, with no felony convictions and no pending charges — you are eligible for a Section 18 expungement of this misdemeanor. File the petition in the district court of the county of arrest, with notice to the DA, arresting agency, and OSBI; a hearing is typical. The court-record part is free; the OSBI arrest-record processing fee is something we are still confirming. An expunged conviction becomes "partially sealed" — hidden from the public, but law enforcement can still see it.',
          remedy: 'Section 18 Expungement Petition (22 O.S. § 18)',
          citation: '22 O.S. § 18(A)'
        },
        eligible_felony_ok: {
          status: 'eligible',
          title: 'Nonviolent Felony — Eligible to Expunge',
          message: 'Based on your dates and record, you appear eligible for a Section 18 expungement of this nonviolent felony — 5 years after completing the sentence for a single felony, or 10 years where you have two. File the petition in the district court of the county of arrest, with notice to the DA, arresting agency, and OSBI. There is one detail we are still confirming: § 18 has pardon-related prerequisites for some felony expungements, so a legal aid clinic is worth using to make sure yours is not one of them. The court-record part is free; the OSBI processing fee is separate. An expunged conviction becomes "partially sealed" — law enforcement can still see it.',
          remedy: 'Section 18 Expungement Petition (22 O.S. § 18)',
          citation: '22 O.S. § 18(A)'
        },
        eligible_deferred_ok: {
          status: 'eligible',
          title: 'Completed Deferred Sentence — Two Steps Worth Taking',
          message: 'Because your deferred sentence ended in dismissal more than a year ago, you have two things available and they do different jobs. A Section 991(c) expungement updates the court record to show you "pled not guilty, case dismissed" — but it does NOT seal the arrest record, so on its own it is only half the picture. A Section 18 expungement (available a year after the dismissal) seals both the arrest and the court record. Most people want both: 991(c) to correct the disposition and § 18 to seal the arrest. File in the district court of the county of arrest. Legal Aid Services of Oklahoma and the law-school clinics handle exactly this pairing.',
          remedy: 'Section 991(c) + Section 18 Expungement (22 O.S. §§ 991(c), 18)',
          citation: '22 O.S. §§ 991(c), 18(A)'
        },
        waiting_ok: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Oklahoma\'s Section 18 waiting periods depend on the offense: a misdemeanor with a jail or suspended sentence is 5 years after completion, a single nonviolent felony is 5 years, two nonviolent felonies are 10, and a deferred sentence clears 1 year after dismissal. Based on your dates, yours has not run yet, and it also requires no new convictions and no pending charges in the meantime. Once your period runs, Oklahoma\'s automatic Clean Slate program may reach an eligible case without you filing — though for now that path is still ramping up.',
          remedy: 'Wait for the period to run, then petition or check OSBI',
          citation: '22 O.S. § 18(A)'
        },
        ineligible_violent_ok: {
          status: 'ineligible',
          title: 'Violent Felonies Are Not Expungeable',
          message: 'Felonies on Oklahoma\'s violent-offense list (57 O.S. § 571) cannot be expunged under Section 18. No waiting period changes that. Two things worth knowing before you take this as final: the § 571 list is specific, and whether an offense counts as "violent" is a legal classification rather than a description of what happened — so if you are not certain, it is worth confirming. And a pardon is a separate route. OSBI answers questions directly, and Legal Aid Services of Oklahoma can check the classification against § 571.',
          remedy: 'None (Violent Felony under § 571) — confirm the classification; ask about a pardon',
          citation: '22 O.S. § 18(A); 57 O.S. § 571'
        },
        ineligible_felony_count_ok: {
          status: 'ineligible',
          title: 'Three or More Felonies Blocks Section 18 Expungement',
          message: 'Oklahoma\'s Section 18 expungement is not available once you have three or more felony convictions. There is one thing that can change this count, and it is worth checking: under § 18(D), multiple offenses arising from the SAME transaction count as a single conviction — so a record that looks like three felonies may legally be fewer. A pardon is also a separate route these limits do not govern. Legal Aid Services of Oklahoma and the law-school clinics can count your record properly and tell you whether the same-transaction rule brings you back under the limit.',
          remedy: 'Consult Legal Aid (Felony Count) — the same-transaction rule may help',
          citation: '22 O.S. §§ 18(A), 18(D)'
        },
        complex_misd_ok: {
          status: 'complex',
          title: 'We Need to Know the Sentence',
          message: 'For a misdemeanor, Oklahoma\'s timing turns on the sentence: a fine only under $501 is immediate, while a jail or suspended sentence is 5 years after completion. Since you are not sure which yours was, we are not going to guess. Your court paperwork states the sentence, and OSBI answers questions by email (expungements@osbi.ok.gov) and phone. Legal Aid Services of Oklahoma can also read your record with you.',
          remedy: 'Get Your Sentence Details First (court paperwork / OSBI)',
          citation: '22 O.S. § 18(A)'
        },
        complex_felony_ok: {
          status: 'complex',
          title: 'We Need Your Felony Count',
          message: 'For a nonviolent felony, Oklahoma\'s timing depends on how many felonies are on your record: one is 5 years after completion, two is 10, and three or more is not eligible. And the same-transaction rule (§ 18(D)) can reduce that count, since offenses from a single incident count as one. Since you are not sure of your count, we are not going to guess — getting it wrong here changes the answer entirely. OSBI can tell you what your record shows, and Legal Aid Services of Oklahoma can apply the same-transaction rule for you.',
          remedy: 'Get Your Felony Count First (OSBI / legal aid)',
          citation: '22 O.S. §§ 18(A), 18(D)'
        }
      }
    },
    resources: {
      remedies: {
        section18: {
          name: 'Section 18 Expungement (seals arrest + court record)',
          formName: 'Petition for Expungement (22 O.S. § 18)',
          formUrl: 'https://oklahoma.gov/osbi/services/criminal-history/expungements.html',
          steps: [
            'Check first whether the automatic Clean Slate path applies — OSBI answers at expungements@osbi.ok.gov and (405) 879-2641. It only reaches Oklahoma-only ("single-source") records.',
            'File the Section 18 petition in the district court of the county of arrest (one petition per county; multiple arrests in the same county can be combined).',
            'Give notice to the district attorney, the arresting agency, and OSBI. A hearing is typical.',
            'The court-record expungement is free; OSBI charges a processing fee for the arrest record.'
          ],
          // null: Wave 2 gives OSBI arrest-record processing fee "$150 (their
          // own page)"; court-record expungement free. Flagged for confirmation.
          fees: null,
          feeWaiver: null,
          courtContact: 'District court of the county of arrest; OSBI for the arrest record'
        },
        section991c: {
          name: 'Section 991(c) Expungement (deferred-sentence disposition cleanup)',
          formName: 'Motion under 22 O.S. § 991(c)',
          formUrl: 'https://oklahoma.gov/osbi/services/criminal-history/expungements.html',
          steps: [
            'Confirm your deferred sentence ended in dismissal.',
            'File the § 991(c) motion in the court that handled the case — it updates the disposition to "pled not guilty, case dismissed".',
            'Understand its limit: § 991(c) does NOT seal the arrest record. Pair it with a Section 18 expungement (available 1 year after dismissal) to seal the arrest too.'
          ],
          fees: null,
          feeWaiver: null,
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Legal Aid Services of Oklahoma', url: 'https://oklaw.org' },
        { name: 'OSBI Expungements (answers by email and phone)', url: 'https://oklahoma.gov/osbi/services/criminal-history/expungements.html' }
      ]
    }
  },

  // ==========================================================================
  // VIRGINIA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave2_Draft_Package.md
  //
  // HANDLE WITH CARE: the sealing regime took effect July 1, 2026 — two weeks
  // before the package was drafted. Before it, Virginia had essentially NO
  // conviction relief. Automatic processes are only spinning up, so every
  // automatic result carries a rollout caveat, and secondary sources are full
  // of stale 2025 effective dates.
  //
  // TWO regimes coexist: SEALING (new, convictions, § 19.2-392.5 et seq.) and
  // EXPUNGEMENT (old, non-convictions, § 19.2-392.2 — still exists). Only
  // offences on/after Jan 1, 1986 are sealable — a boolean gate, because the
  // offence date predates the disposition date the form collects.
  //
  // The felony petition gate is a whole-record test (no Class 1-2 ever; no
  // Class 3-4 in 20 years; no felony in 10 years) that the record model cannot
  // compute — asked, unsure -> hedge. FIFTH state on the count-logic backlog.
  // ==========================================================================
  VA: {
    code: 'VA',
    name: 'Virginia',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave2_Draft_Package.md',
    terminology:
      'Virginia now has two different remedies. SEALING is the new one (effective July 1, 2026, '
      + 'Va. Code § 19.2-392.5 and following) and it is what covers convictions — before this law, '
      + 'Virginia had almost no way to clear a conviction at all. EXPUNGEMENT is the older remedy '
      + '(§ 19.2-392.2) and still exists, but only for non-convictions. Because the sealing law is '
      + 'brand new, its automatic parts are still being switched on: eligible does not yet mean '
      + 'sealed, and any date you see on another website may be wrong. Only records with offense '
      + 'dates on or after January 1, 1986 can be sealed.',
    keyDates: [
      {
        label: 'Comprehensive sealing regime took effect (SB 1466 / HB 2723)',
        date: '2026-07-01',
        kind: 'effective',
        note: 'Two weeks old as of the Wave 2 draft. The biggest recent second-chance-law change in the country. Automatic processes are spinning up — verify rollout status before any UI copy claims sealing is happening automatically now.',
      },
      {
        label: 'Earliest sealable offense date',
        date: '1986-01-01',
        kind: 'effective',
        note: 'Only records with offense dates on or after this date can be sealed.',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the current automatic-sealing rollout status? The regime took effect July 1, 2026 and automatic processes are only spinning up. Verify on vsp.virginia.gov (the State Police petition-based-record-sealing page) and vscc.virginia.gov before any UI copy claims records are being sealed automatically now. Trust only VSP, the Crime Commission, and the statute — secondary sources carry stale 2025 dates.',
        blocksFields: [],
      },
      {
        question:
          'Are petition sealing filings genuinely free with no fingerprint card, per the 2025 amendments? Wave 2 says yes and calls it a UI headline if confirmed — verify on the Circuit Court\'s own instructions and by phone. This is one of the most user-relevant facts in the state.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver', 'resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'Confirm the exact lifetime-limit mechanics in § 19.2-392.12: Wave 2 says 2 lifetime sealing petitions but flags the precise mechanics. The tree discloses the limit in prose but cannot count a person\'s prior petitions.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the automatic misdemeanor list in § 19.2-392.7: petit larceny, shoplifting, trespass variants, disorderly conduct, misdemeanor marijuana distribution — sealed 7 years after conviction if no other CCRE-reportable conviction in that window (traffic infractions do not count against). The tree asks a person whether their offense is on this list.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the full § 19.2-392.12 petition exclusion list and the felony gating: no Class 1-2 felony ever, no Class 3-4 felony in 20 years, no felony of any kind in 10 years, 10 years clean, drug/alcohol convictions require a rehabilitation showing. The tree asks a person to self-assess the felony-history gate; the exact provisions need confirming.',
        blocksFields: [],
      },
      {
        question:
          'How are DEFERRED dispositions treated under the new sealing regime? Not covered in Wave 2 — standing call-sheet question. The tree hedges deferrals.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the felony non-conviction path: Wave 2 says a felony charge that ended without conviction is sealable at conclusion WITH the defendant\'s request and the Commonwealth\'s Attorney\'s concurrence, or via old-regime expungement otherwise. The tree routes felony non-convictions to a result that explains both; confirm the concurrence requirement.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Va. Code § 19.2-392.5 et seq. (record sealing — new regime, eff. July 1, 2026)', url: null, retrievedOn: null },
      { id: 'Va. Code § 19.2-392.7 (automatic sealing — misdemeanour list; 7-year rule)', url: null, retrievedOn: null },
      { id: 'Va. Code § 19.2-392.11 (automatic sealing provisions)', url: null, retrievedOn: null },
      { id: 'Va. Code § 19.2-392.12 (petition sealing; felony gating; exclusions; lifetime limit)', url: null, retrievedOn: null },
      { id: 'Va. Code § 19.2-392.2 (expungement — old regime, non-convictions)', url: null, retrievedOn: null },
      { id: 'SB 1466 / HB 2723 (comprehensive sealing regime)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'offense_1986_va' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconviction_va' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconviction_va' },
            { label: 'Deferred / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        offense_1986_va: {
          type: 'boolean',
          text: 'Was the offense committed on or after January 1, 1986?',
          yes: 'excluded_va',
          no: 'ineligible_pre1986_va'
        },
        excluded_va: {
          type: 'boolean',
          text: 'Was the offense any of these: a Class 1, 2, 3, or 4 felony; a sex offense; a violent felony; a firearm felony; a DUI; an assault and battery against a family member; a protective-order violation; or a hate crime?',
          yes: 'ineligible_excluded_va',
          no: 'offense_class_va'
        },
        offense_class_va: {
          type: 'choice',
          text: 'Which best describes the offense? (Your court paperwork has the details — Virginia\'s new sealing law treats these groups differently.)',
          options: [
            { label: 'A specific automatic-list misdemeanor: petit larceny, shoplifting, trespass, disorderly conduct, or misdemeanor marijuana distribution', value: 'auto_misd', next: 'auto_date_va' },
            { label: 'Any other misdemeanor', value: 'other_misd', next: 'petition_misd_date_va' },
            { label: 'A Class 5 or 6 felony, or grand larceny', value: 'low_felony', next: 'felony_history_va' },
            { label: 'I\'m not sure which group', value: 'unsure', next: 'complex_class_va' }
          ]
        },
        auto_date_va: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'conviction (Va. Code § 19.2-392.7 — automatic misdemeanour sealing; no other CCRE-reportable conviction in the window)' },
            nextPass: 'check_record_first_va',
            nextFail: 'waiting_auto_va'
          }
        },
        petition_misd_date_va: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted? (The clock runs conviction-free, so a later conviction restarts it.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'conviction, conviction-free (Va. Code § 19.2-392.12 — petition sealing, misdemeanours)' },
            nextPass: 'eligible_petition_va',
            nextFail: 'waiting_petition_va'
          }
        },
        // The whole-record felony gate — asked, unsure -> hedge. Fifth state on
        // the count-logic backlog (UT, NY, MI, NJ, VA).
        felony_history_va: {
          type: 'choice',
          text: 'This one is about your WHOLE record, not just this case. Do ALL of these describe you: you have never been convicted of a Class 1 or 2 felony; you have no Class 3 or 4 felony in the last 20 years; and you have no felony of any kind in the last 10 years?',
          options: [
            { label: 'Yes — all three are true of me', value: 'clear', next: 'felony_date_va' },
            { label: 'No — at least one is not true', value: 'blocked', next: 'ineligible_felony_history_va' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_felony_history_va' }
          ]
        },
        felony_date_va: {
          type: 'date',
          field: 'disposition_date',
          text: 'Which came LATEST: your conviction, your release, or the end of any supervision for this case? Enter that date. (The clock runs conviction-free from then.)',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'the latest of conviction, release, or violation events, conviction-free (Va. Code § 19.2-392.12 — petition sealing, felonies)' },
            nextPass: 'eligible_petition_felony_va',
            nextFail: 'waiting_petition_felony_va'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Virginia has two different remedies that split on how the case ended: non-convictions go through expungement, while convictions go through the new sealing law. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Virginia State Police (vsp.virginia.gov) can provide your record, and Justice Forward Virginia\'s sealing explainer is a good plain-language guide.',
          remedy: 'Get Your Record First (Virginia State Police)',
          citation: 'Va. Code §§ 19.2-392.2, 19.2-392.5 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred and Diverted Cases Need a Person',
          message: 'Virginia\'s new sealing law is screened here for convictions, and its expungement law for non-convictions. How a deferred or diverted disposition is treated under the new sealing regime is not something we have researched yet — the law is only weeks old — and we would rather tell you that than guess. The Legal Aid Justice Center and Justice Forward Virginia are tracking the new law closely.',
          remedy: 'Consult Legal Aid (Deferral Under the New Law — Not Yet Screened)',
          citation: 'Va. Code § 19.2-392.5 et seq. (treatment of deferrals not yet researched)'
        },
        nonconviction_va: {
          status: 'eligible',
          title: 'No Conviction — Sealing or Expungement Should Be Available',
          message: 'Because your case ended without a conviction, Virginia has a route for you — and which one depends on the level. A misdemeanor non-conviction seals at the conclusion of the case for new cases, or through an annual State Police sweep for older ones once you have been 3 years clean. A FELONY non-conviction is sealable at conclusion too, but it needs your request and the Commonwealth\'s Attorney\'s agreement — if that is not given, the older expungement law (§ 19.2-392.2) is still open to you as a petition. Because the new sealing law only took effect on July 1, 2026 and its automatic parts are still starting up, check your record with the Virginia State Police rather than assume it is done. If you need the petition route, the Legal Aid Justice Center can help.',
          remedy: 'Automatic/at-conclusion sealing, or expungement petition (§ 19.2-392.2) — check with VSP',
          citation: 'Va. Code §§ 19.2-392.7, 19.2-392.2'
        },
        check_record_first_va: {
          status: 'eligible',
          title: 'Your Record May Be Sealed Automatically — Check, Because the Law Is New',
          message: 'Good news, with one honest caveat. Your offense is on Virginia\'s automatic-sealing list, and based on your dates — 7 years since conviction with no other reportable conviction in that window — it qualifies to be sealed with no petition and no fee. The caveat: Virginia\'s sealing law only took effect on July 1, 2026, so the automatic machinery is still being switched on. "Eligible" does not yet mean "done", and you should not assume it has happened. Check your status with the Virginia State Police (vsp.virginia.gov) rather than a third-party site — secondary sources have this law wrong. If the automatic process has not reached you yet, it is coming; there is nothing you need to file for the automatic path.',
          remedy: 'Check with Virginia State Police — automatic sealing (Va. Code § 19.2-392.7)',
          citation: 'Va. Code § 19.2-392.7'
        },
        eligible_petition_va: {
          status: 'eligible',
          title: 'Potentially Eligible to Petition to Seal',
          message: 'Based on your dates — 7 conviction-free years — you appear eligible to petition to seal this misdemeanor under Virginia\'s new law (§ 19.2-392.12). File the petition in the Circuit Court where the charge originated. Two things worth knowing. Per the 2025 amendments, there are reportedly no filing fees and no fingerprint card required — we are confirming that, and if it holds it makes this one of the easiest petitions in the country. And there is a lifetime limit of two sealing petitions, so if you have records you might seal, it is worth thinking about which to use a petition on. Because the law is brand new, the Legal Aid Justice Center and Justice Forward Virginia are the best current guides.',
          remedy: 'Petition to Seal (Va. Code § 19.2-392.12) — Circuit Court',
          citation: 'Va. Code § 19.2-392.12'
        },
        eligible_petition_felony_va: {
          status: 'eligible',
          title: 'Potentially Eligible to Petition to Seal This Felony',
          message: 'This is new for Virginia: until July 2026 a felony like yours — a Class 5 or 6 felony, or grand larceny — could not be cleared at all. Now it can be sealed by petition. Based on what you told us, you clear the record requirements (no Class 1-2 felony ever, none Class 3-4 in 20 years, no felony in 10 years) and you are past 10 conviction-free years. File the petition in the Circuit Court where the charge originated. A few things to plan around: if this was a drug- or alcohol-related conviction, the court will want to see a showing of rehabilitation; there is a lifetime limit of two sealing petitions; and the court weighs statutory criteria rather than granting automatically. Per the 2025 amendments, filing is reportedly free with no fingerprint card, which we are confirming. Given how new this is, use the Legal Aid Justice Center — they are tracking it closely.',
          remedy: 'Petition to Seal a Felony (Va. Code § 19.2-392.12) — Circuit Court',
          citation: 'Va. Code § 19.2-392.12'
        },
        waiting_auto_va: {
          status: 'waiting',
          title: 'Automatic Sealing — Seven-Year Mark Not Yet Reached',
          message: 'Your offense is on Virginia\'s automatic-sealing list, which is the easy path — but it seals 7 years after conviction, and only if you have no other reportable conviction in that window (traffic infractions do not count against you). Based on your dates, that has not run yet. Once it does, and if you stay conviction-free, the sealing is automatic — nothing to file. Because the law is only weeks old, check your status with the Virginia State Police as the date approaches rather than relying on other sites.',
          remedy: 'Wait for the 7-year automatic mark (Va. Code § 19.2-392.7)',
          citation: 'Va. Code § 19.2-392.7'
        },
        waiting_petition_va: {
          status: 'waiting',
          title: 'Seven Conviction-Free Years Not Yet Met',
          message: 'Petition sealing for a misdemeanor under Virginia\'s new law needs 7 conviction-free years. Based on your dates, that has not run yet, and a new conviction restarts it. Staying conviction-free is what gets you there.',
          remedy: 'Wait for 7 conviction-free years (Va. Code § 19.2-392.12)',
          citation: 'Va. Code § 19.2-392.12'
        },
        waiting_petition_felony_va: {
          status: 'waiting',
          title: 'Ten Conviction-Free Years Not Yet Met',
          message: 'Petition sealing for a Class 5 or 6 felony or grand larceny needs 10 conviction-free years, measured from the latest of your conviction, release, or the end of supervision. Based on your dates, that has not run yet, and a new conviction restarts it. This route only became possible in July 2026, so it is worth knowing it is there for when your date arrives.',
          remedy: 'Wait for 10 conviction-free years (Va. Code § 19.2-392.12)',
          citation: 'Va. Code § 19.2-392.12'
        },
        ineligible_pre1986_va: {
          status: 'ineligible',
          title: 'Offenses Before 1986 Cannot Be Sealed',
          message: 'Virginia\'s sealing law reaches only offenses committed on or after January 1, 1986, so this conviction falls outside it. That is a hard line in the statute, not a waiting period. If the case actually ended without a conviction, the older expungement law (§ 19.2-392.2) may still help regardless of date. Given how specific this is, it is worth confirming with someone: the Legal Aid Justice Center can tell you whether any route fits.',
          remedy: 'None under the sealing law (pre-1986) — ask about old-regime expungement',
          citation: 'Va. Code § 19.2-392.5 et seq.'
        },
        ineligible_excluded_va: {
          status: 'ineligible',
          title: 'Excluded From Sealing',
          message: 'Virginia\'s sealing law excludes a specific set of offenses: Class 1 through 4 felonies, sex offenses, violent felonies, firearm felonies, DUI, assault and battery against a family member, protective-order violations, and hate crimes. No waiting period changes that. Two things worth knowing before you accept this: the categories are legal classifications, so whether your offense counts as, say, a "violent felony" is something worth confirming rather than assuming from what happened. And if the case actually ended without a conviction, a different route (expungement) may apply. The Legal Aid Justice Center and Justice Forward Virginia can check where your offense falls.',
          remedy: 'None (Statutorily Excluded from Sealing) — confirm the classification',
          citation: 'Va. Code § 19.2-392.12'
        },
        ineligible_felony_history_va: {
          status: 'ineligible',
          title: 'Your Felony History Blocks This Petition',
          message: 'Sealing a Class 5 or 6 felony or grand larceny requires a clean-enough felony history: no Class 1 or 2 felony ever, no Class 3 or 4 felony in the last 20 years, and no felony of any kind in the last 10. Based on what you told us, one of those is not met, so this petition is not available right now. Some of this can change with time — the 10-year and 20-year windows move — so it may be worth revisiting later. And because these rules are brand new and the counting is intricate, it is worth having someone confirm it: the Legal Aid Justice Center is tracking the new law and can check your specific history.',
          remedy: 'Not eligible now (felony history) — the time windows may open later',
          citation: 'Va. Code § 19.2-392.12'
        },
        complex_class_va: {
          status: 'complex',
          title: 'We Need to Know Which Group the Offense Falls In',
          message: 'Virginia\'s new sealing law treats offenses very differently depending on the group: a specific list of misdemeanors seals automatically, other misdemeanors go by petition at 7 years, and only Class 5 or 6 felonies and grand larceny are sealable among felonies — everything Class 4 and up is excluded. Since you are not sure which group yours is in, we are not going to guess. Your court paperwork has the offense and its class, and because the law is only weeks old, the Legal Aid Justice Center and Justice Forward Virginia are the best places to have it read.',
          remedy: 'Get Your Offense and Its Class First (court paperwork / legal aid)',
          citation: 'Va. Code § 19.2-392.12'
        },
        complex_felony_history_va: {
          status: 'complex',
          title: 'Your Felony History Needs Checking — By a Person',
          message: 'Whether you can seal this felony depends on your whole felony history: no Class 1 or 2 felony ever, no Class 3 or 4 in the last 20 years, no felony of any kind in the last 10. Since you are not sure whether all of that is true of you, we are not going to guess — getting it wrong points you the wrong way on a route that is brand new. The Virginia State Police can give you your full record, and the Legal Aid Justice Center, which is tracking this law closely, can apply the rules to it with you.',
          remedy: 'Get Your Full Record Checked (VSP / Legal Aid Justice Center)',
          citation: 'Va. Code § 19.2-392.12'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'Petition to Seal (new regime, Va. Code § 19.2-392.12)',
          formName: 'Petition for Sealing of Criminal Records',
          formUrl: 'https://vsp.virginia.gov/sealing/',
          steps: [
            'Confirm your offense is not on the exclusion list and that your dates and felony history qualify — the Virginia State Police can provide your record.',
            'File the petition in the Circuit Court where the charge originated.',
            'Per the 2025 amendments there are reportedly no filing fees and no fingerprint card required — confirm on the court\'s own instructions.',
            'Remember the lifetime limit of two sealing petitions, and that the court weighs statutory criteria before granting.'
          ],
          // null: Wave 2 says no fees / no fingerprint card per 2025 amendments,
          // but flags both for confirmation — and calls it a headline if true.
          fees: null,
          feeWaiver: null,
          courtContact: 'Circuit Court where the charge originated'
        },
        expungement: {
          name: 'Expungement (old regime, non-convictions, Va. Code § 19.2-392.2)',
          formName: 'Petition for Expungement',
          formUrl: 'https://www.vacourts.gov/',
          steps: [
            'This route is for non-convictions — dismissals, acquittals, and charges that did not result in a conviction.',
            'File the petition in the Circuit Court where the charge was heard.',
            'For a felony non-conviction, sealing at conclusion may be faster if the Commonwealth\'s Attorney concurs — ask about that first.'
          ],
          fees: null,
          feeWaiver: null,
          courtContact: 'Circuit Court where the charge was heard'
        }
      },
      legalAid: [
        { name: 'Legal Aid Justice Center', url: 'https://www.justice4all.org' },
        { name: 'Justice Forward Virginia (sealing explainer)', url: 'https://justiceforwardva.com' }
      ]
    }
  },

  // ==========================================================================
  // MINNESOTA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave2_Draft_Package.md
  //
  // "Expungement" here means court-ordered SEALING — the statute explicitly
  // prohibits destruction. Multiple tracks; the automatic one is the headline:
  // § 609A.015, live Jan 1, 2025, and NEARLY DONE — the BCA reported ~94% of
  // ~2 million eligible records expunged by spring 2026. So Minnesota gets the
  // strongest check-record-first copy of any state in Waves 1-2: "most eligible
  // records have already been expunged — check yours."
  //
  // The clock quirk worth encoding: automatic periods run from discharge of
  // sentence, and a new NON-PETTY offence during the wait breaks the clock and
  // it recomputes from the newer discharge (persona 5).
  //
  // Individuals are NOT notified when expunged — checking is on them.
  // ==========================================================================
  MN: {
    code: 'MN',
    name: 'Minnesota',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave2_Draft_Package.md',
    terminology:
      'In Minnesota "expungement" means the court orders your record SEALED — the statute '
      + 'specifically forbids destroying it, so sealing is as far as it goes. There are several '
      + 'routes. AUTOMATIC "Clean Slate" expungement (§ 609A.015) went live January 1, 2025 and is '
      + 'nearly finished — most eligible records are already sealed. A PETITION route (§§ 609A.02 / '
      + '609A.03) covers what the automatic process misses and reaches records the automatic one '
      + 'cannot, such as those held by health-licensing boards. A prosecutor can also agree to '
      + 'sealing without a petition (§ 609A.025). Cannabis has its own tracks.',
    keyDates: [
      {
        label: 'Automatic Clean Slate expungement (§ 609A.015) live',
        date: '2025-01-01',
        kind: 'effective',
        note: 'The BCA began sending records April 2025 and sealing from June 2025; ~94% of ~2 million eligible records expunged by spring 2026, remainder in judicial review. The strongest automatic-track status of any state in Waves 1-2.',
      },
      {
        label: 'Automatic petty-cannabis expungement (§ 609A.055) completed',
        date: '2024-05',
        kind: 'operative',
        note: 'Wave 2 gives month and year only.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the exact § 609A.015 subd. 3(b) exclusion lists and the § 609A.02 subd. 3 lists — secondary sources paraphrase them loosely. Wave 2 flags DWI, domestic assault, harassment/stalking, and 4th-degree assault as carve-outs; the precise lists need pulling from the statute.',
        blocksFields: [],
      },
      {
        question:
          'Is DWI excluded from the PETITION track as well as the automatic one? Wave 2 flags this specifically — read § 609A.02 subd. 3 against § 609A.015 subd. 3(b). The tree currently routes DWI to a hedge that says the automatic path is out and the petition path is unconfirmed.',
        blocksFields: [],
      },
      {
        question:
          'What is the current petition filing fee? Wave 2 gives "~$300-ish, in-forma-pauperis waiver available" and flags it. Confirm the current amount with a district court.',
        blocksFields: ['resources.remedies.petition.fees'],
      },
      {
        question:
          'Confirm the § 609.13 quirk: a felony deemed a misdemeanor via stay of imposition does NOT become automatic-eligible through the demotion — separate petition rules with 4/5-year splits apply. The tree does not currently special-case this; it is disclosed as an open question.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 609A.015 rollout is as complete as reported (~94% by spring 2026) and the BCA record-check path. This is the strongest automatic-track claim in the app, so it is worth confirming before the copy leans on it.',
        blocksFields: [],
      },
      {
        question:
          'How are completed diversions and stays of adjudication treated beyond the 1-year automatic period Wave 2 gives? The tree encodes the 1-year automatic diversion period; confirm the boundaries.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Minn. Stat. § 609A.015 (automatic Clean Slate expungement; periods; exclusions subd. 3(b))', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609A.02 (petition expungement; eligible-felony list subd. 3(b); exclusions subd. 3)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609A.03 (petition expungement procedure)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609A.025 (prosecutor-agreed sealing — no petition)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609A.055 (automatic petty-cannabis expungement)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609A.06 (Cannabis Expungement Board — felony cannabis)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 609.13 (felony deemed misdemeanour — stay of imposition quirk)', url: null, retrievedOn: null },
      { id: 'Minn. Stat. § 243.166 (predatory-offender registration — never expungable)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'registration_mn' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_mn' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_mn' },
            { label: 'Diversion / Stay of adjudication (Completed)', value: 'deferred', next: 'diversion_date_mn' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        registration_mn: {
          type: 'boolean',
          text: 'Does the offense require you to register as a predatory offender?',
          yes: 'ineligible_registration_mn',
          no: 'excluded_mn'
        },
        excluded_mn: {
          type: 'boolean',
          text: 'Was the offense a DWI, a domestic assault, a harassment or stalking offense, or a 4th-degree assault?',
          yes: 'complex_excluded_mn',
          no: 'level_mn'
        },
        level_mn: {
          type: 'choice',
          text: 'How was the offense classified? (Your court paperwork says — Minnesota\'s waiting period depends on it.)',
          options: [
            { label: 'Petty misdemeanor or misdemeanor', value: 'misd', next: 'misd_date_mn' },
            { label: 'Gross misdemeanor', value: 'gross', next: 'gross_date_mn' },
            { label: '5th-degree drug (controlled substance) felony', value: 'drug5', next: 'drug5_date_mn' },
            { label: 'Another felony', value: 'felony', next: 'felony_eligible_mn' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_mn' }
          ]
        },
        misd_date_mn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you discharged from your sentence for this case?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'discharge of sentence (Minn. Stat. § 609A.015 — petty misdemeanours and misdemeanours; no new non-petty offence during the wait)' },
            nextPass: 'check_record_first_mn',
            nextFail: 'waiting_mn'
          }
        },
        gross_date_mn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you discharged from your sentence for this case?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'discharge of sentence (Minn. Stat. § 609A.015 — gross misdemeanours; no new non-petty offence during the wait)' },
            nextPass: 'check_record_first_mn',
            nextFail: 'waiting_mn'
          }
        },
        drug5_date_mn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you discharged from your sentence for this case?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'discharge of sentence (Minn. Stat. § 609A.015 — 5th-degree drug felony; no new non-petty offence during the wait)' },
            nextPass: 'check_record_first_mn',
            nextFail: 'waiting_mn'
          }
        },
        felony_eligible_mn: {
          type: 'boolean',
          text: 'Is this offense on Minnesota\'s list of expungement-eligible felonies (roughly 50 offenses — drug possession, theft, forgery, and financial crimes)? If you are not sure, answer no.',
          yes: 'felony_date_mn',
          no: 'complex_felony_mn'
        },
        felony_date_mn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you discharged from your sentence for this case?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'discharge of sentence (Minn. Stat. § 609A.015 — listed eligible felonies; no new non-petty offence during the wait)' },
            nextPass: 'check_record_first_mn',
            nextFail: 'waiting_mn'
          }
        },
        diversion_date_mn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the diversion or the stay of adjudication?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'completion of diversion or stay of adjudication (Minn. Stat. § 609A.015 — non-felony)' },
            nextPass: 'check_record_first_mn',
            nextFail: 'waiting_mn'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Minnesota\'s expungement timing depends on how the case ended: dismissals resolve with no wait, a completed diversion after 1 year, and convictions from 2 to 5 years depending on the level. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. A BCA criminal history search will show you your record, and the Volunteer Lawyers Network runs expungement clinics.',
          remedy: 'Get Your Record First (BCA)',
          citation: 'Minn. Stat. § 609A.015 (which path applies depends on the disposition)'
        },
        eligible_nonconviction_mn: {
          status: 'eligible',
          title: 'No Conviction — Likely Already Expunged, No Wait',
          message: 'Because your case ended without a conviction, it is eligible for expungement with no waiting period — and Minnesota\'s automatic Clean Slate program, which is nearly complete, has very likely already sealed it. Nobody is notified when this happens, so the way to know is to check: run a BCA criminal history search. If it has not been sealed, the petition route is available, and a prosecutor can also agree to sealing without a petition (§ 609A.025).',
          remedy: 'Automatic expungement (check BCA) — no waiting period',
          citation: 'Minn. Stat. §§ 609A.015, 609A.025'
        },
        check_record_first_mn: {
          status: 'eligible',
          title: 'Most Eligible Records Are Already Sealed — Check Yours',
          message: 'This is the strongest starting point of any state we cover. Minnesota\'s automatic Clean Slate program went live in January 2025 and by spring 2026 had already expunged about 94% of the roughly two million eligible records. Based on your dates you are past the waiting period for your offense, so there is a very good chance yours is already sealed. The catch is that nobody is notified when it happens — so you have to check. Run a BCA criminal history search to see. If yours is in the small remainder still in judicial review, it is on its way and there is nothing to file for the automatic path. If for some reason it was missed, the petition route (§§ 609A.02/609A.03) reaches records the automatic process cannot — including those held by health-licensing boards — and a prosecutor can agree to sealing without a petition at all (§ 609A.025).',
          remedy: 'Check your record with the BCA — automatic expungement is nearly complete',
          citation: 'Minn. Stat. § 609A.015'
        },
        waiting_mn: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Minnesota\'s automatic expungement comes after a wait that depends on the level: 1 year for a completed diversion, 2 years for a misdemeanor, 3 for a gross misdemeanor, 4 for a 5th-degree drug felony, and 5 for other eligible felonies — all measured from discharge of your sentence. Based on your dates, yours has not run yet. One thing worth knowing: a new non-petty offense during the wait breaks the clock, and it restarts from the newer discharge. Once your period runs, the sealing is automatic — Minnesota is doing this without petitions for eligible records — so check your BCA record when the time comes.',
          remedy: 'Wait for the period to run, then check the BCA',
          citation: 'Minn. Stat. § 609A.015'
        },
        ineligible_registration_mn: {
          status: 'ineligible',
          title: 'Predatory-Offender Registration Blocks Expungement',
          message: 'An offense that requires predatory-offender registration under Minn. Stat. § 243.166 cannot be expunged in Minnesota — not automatically and not by petition. This is a hard bar in the statute. If you are uncertain whether your offense actually carries a registration requirement, that is worth confirming rather than assuming, and the Volunteer Lawyers Network expungement clinics can check.',
          remedy: 'None (Registration Offense) — confirm the registration requirement',
          citation: 'Minn. Stat. § 243.166'
        },
        complex_excluded_mn: {
          status: 'complex',
          title: 'DWI and Certain Assaults Need a Closer Look',
          message: 'DWI, domestic assault, harassment and stalking offenses, and 4th-degree assault are carved out of Minnesota\'s AUTOMATIC expungement — so the Clean Slate program will not seal them on its own. What we cannot yet tell you cleanly is whether the PETITION route is open to them: the exclusion lists for the automatic and petition tracks are not identical, and we are still confirming exactly where DWI in particular falls. Rather than guess in either direction, this is one to take to a person: the Volunteer Lawyers Network runs free expungement clinics, and a petition under § 609A.02 may well be available even though the automatic path is not.',
          remedy: 'Consult Legal Aid (Automatic Path Excluded; Petition Path Being Confirmed)',
          citation: 'Minn. Stat. §§ 609A.015 subd. 3(b), 609A.02 subd. 3'
        },
        complex_level_mn: {
          status: 'complex',
          title: 'We Need the Offense Classification',
          message: 'In Minnesota the waiting period depends on the level: 2 years for a misdemeanor, 3 for a gross misdemeanor, 4 for a 5th-degree drug felony, 5 for other eligible felonies. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, a BCA criminal history search shows it, and the Volunteer Lawyers Network can read your record with you.',
          remedy: 'Get Your Offense Classification First (court paperwork / BCA)',
          citation: 'Minn. Stat. § 609A.015'
        },
        complex_felony_mn: {
          status: 'complex',
          title: 'Whether This Felony Is Eligible Needs Checking',
          message: 'Minnesota expunges only a specific list of about 50 felonies — drug possession, theft, forgery, financial crimes, and similar — and not felonies generally. Whether yours is on that list decides everything, and it is not something to guess at. The list is in § 609A.02 subd. 3(b); a BCA record will identify your exact offense, and the Volunteer Lawyers Network expungement clinics can check it against the list. One more wrinkle worth mentioning to them: a felony that was reduced to a misdemeanor by a stay of imposition does NOT automatically become expungement-eligible through that reduction — it has its own petition rules.',
          remedy: 'Check the Felony List (§ 609A.02 subd. 3(b)) with legal aid',
          citation: 'Minn. Stat. §§ 609A.02, 609.13'
        }
      }
    },
    resources: {
      remedies: {
        petition: {
          name: 'Petition Expungement (Minn. Stat. §§ 609A.02 / 609A.03)',
          formName: 'MN Judicial Branch Expungement forms packet',
          formUrl: 'https://www.mncourts.gov/Help-Topics/Expungement.aspx',
          steps: [
            'Check first whether the automatic program already sealed it — run a BCA criminal history search. Most eligible records are already done.',
            'If you need to petition, complete the MN Judicial Branch expungement packet and file in the district court of the case.',
            'Serve the agencies. The petition route reaches records the automatic process cannot, including those held by health-licensing boards.',
            'Before petitioning, it can be worth asking the prosecutor about agreed sealing under § 609A.025 — it skips the petition entirely.'
          ],
          // null: Wave 2 gives "~$300-ish, in-forma-pauperis waiver available".
          fees: null,
          // NOT null: the waiver mechanism is named independently of the amount.
          feeWaiver: 'A fee waiver (in forma pauperis) is available if you cannot afford the filing fee.',
          courtContact: 'District court of the case'
        }
      },
      legalAid: [
        { name: 'Volunteer Lawyers Network (expungement clinics)', url: 'https://www.vlnmn.org' },
        { name: 'Until We Are All Free (Clean Slate implementation tracking)', url: 'https://www.uwaaf.org' }
      ]
    }
  }
};





// Directory of all 50 states for the selector. A state appears in the app as
// soon as it exists here; it only has RULES once it has been researched, encoded,
// tested, and cited (Tier A definition of done). No generic templates — a state
// either has real, cited rules in fallbackRules / the database, or the UI shows
// an honest "in research" panel with referral links. (One-pager: "no fallback
// templates, no shallow data.")
export const stateDirectory: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

// National referral links shown for states still in research. These are honest
// referrals (where to get real help today), not rules.
export const nationalReferrals: Array<{ name: string; url: string }> = [
  { name: 'CCRC Restoration of Rights Project (your state profile)', url: 'https://ccresourcecenter.org/state-restoration-profiles/' },
  { name: 'LSC Legal Aid Directory (find free legal help)', url: 'https://www.lsc.gov/about-lsc/what-legal-aid/get-legal-help' }
];

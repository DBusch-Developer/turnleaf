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
    lastReviewed: '2026-07-15',
    verificationStatus: 'draft',
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
        question:
          'Is there a filing fee to apply for a set-aside under ARS § 13-905, and if there is, is a waiver or deferral available? The Maricopa County packet appears to show none, but that is one county and it is not confirmed. Ask both halves: the waiver answer is only knowable once the fee is.',
        blocksFields: ['resources.remedies.set_aside.fees', 'resources.remedies.set_aside.feeWaiver'],
      },
      {
        question:
          'Is there a filing fee to petition for sealing under ARS § 13-911, and if there is, is a waiver or deferral available? The encoded rules claimed "the legislature removed filing fees", but Wave 0 does not state this and no source is recorded for it.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Confirm the § 13-911 waiting periods against the current statute text: class 2-3 felonies 10 yrs, class 4-6 felonies 5 yrs, class 1 misdemeanors 3 yrs, class 2-3 misdemeanors 2 yrs. Wave 0 flags these as "encode from statute text" rather than as verified.',
        blocksFields: [],
      },
      {
        question:
          'How does the prior-felony bump change the § 13-911 waiting periods? Wave 0 notes a bump exists but does not give its size, and the decision tree cannot express it at all.',
        blocksFields: [],
      },
      {
        question:
          'What is the prosecutor/victim response window on a § 13-911 petition? The filing steps currently tell people the court must wait 60 days, which is unverified.',
        blocksFields: [],
      },
      {
        question:
          'Is a DUI misdemeanor eligible for a set-aside, and is it excluded from § 13-911 sealing? Resolve from the § 13-911 text.',
        blocksFields: [],
      },
      {
        question:
          'Is § 13-911 sealing of a non-conviction really available immediately? The tree currently tells dismissed/acquitted users there is no waiting period.',
        blocksFields: [],
      },
      {
        question:
          'How are completed deferrals/diversions treated for sealing? Not covered in Wave 0 — add to call sheet. The tree hedges these rather than guess (see unknown_deferred).',
        blocksFields: [],
      },
      {
        question:
          'Marijuana expungement under ARS § 36-2862 (Prop 207) is a real Arizona remedy — petition anytime, free, mandatory grant if in scope — but it is not encoded as a branch, only mentioned in one message. It needs its own path.',
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
    sources: [
      { id: 'Ariz. Rev. Stat. § 13-905 (set aside; Certificate of Second Chance)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-911 (record sealing)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-3821 (registrable offenses; § 13-905 exclusion)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 13-706 (serious offenses; § 13-911 exclusion)', url: null, retrievedOn: null },
      { id: 'Ariz. Rev. Stat. § 36-2862 (Prop 207 marijuana expungement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_offense' },
            { label: 'Dismissed / Acquitted / Arrested but never charged', value: 'dismissed', next: 'eligible_seal_dismissed_az' },
            // Explicit, so a deferral does NOT widen into the 'dismissed'
            // option. This label names no diversion track, and Wave 0
            // researches none for AZ — see unknown_deferred.
            { label: 'Deferred adjudication / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_offense: {
          type: 'boolean',
          text: 'Was the offense a dangerous offense (involving a deadly weapon, dangerous instrument, or serious physical injury), an offense requiring sex offender registration, an offense with a sexual motivation finding, or a crime against a victim under 15?',
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
        sentence_completed: {
          type: 'boolean',
          text: 'Have you completed all terms of your sentence and been discharged (including probation, jail/prison time, and payment of all fines, fees, and victim restitution)?',
          yes: 'offense_level',
          no: 'ineligible_restitution'
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
        // The § 13-911 ladder. Wave 0 gives these numbers but flags them
        // "encode from statute text" — an open question stands on all four.
        // The anchor is the whole point: the clock runs from absolute
        // discharge, which does not arrive until restitution is paid in full.
        discharge_date_f23: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'absolute discharge — completion of the entire sentence, including all fines, fees, and victim restitution' },
            nextPass: 'eligible_both_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_f456: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'absolute discharge — completion of the entire sentence, including all fines, fees, and victim restitution' },
            nextPass: 'eligible_both_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m1: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'absolute discharge — completion of the entire sentence, including all fines, fees, and victim restitution' },
            nextPass: 'eligible_both_az',
            nextFail: 'waiting_seal_az'
          }
        },
        discharge_date_m23: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'absolute discharge — completion of the entire sentence, including all fines, fees, and victim restitution' },
            nextPass: 'eligible_both_az',
            nextFail: 'waiting_seal_az'
          }
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
          title: 'Potentially Sealable — Waiting Period Being Verified',
          message: 'Charges that were dismissed, resulted in a not-guilty verdict, or never led to charges may be sealable under ARS § 13-911. Whether any waiting period applies to a non-conviction is one of the things we are still verifying, so we are not going to tell you it is zero until we have confirmed it — call the clerk of the court that handled your case and ask when you can file. Once a record is sealed, you can generally state the arrest never happened in most situations.',
          remedy: 'Petition to Seal Case Records (ARS § 13-911)',
          citation: 'Arizona Revised Statutes § 13-911'
        },
        eligible_both_az: {
          status: 'eligible',
          title: 'Potential Set-Aside AND Sealing Eligible',
          message: 'You appear potentially eligible for both Arizona remedies. A Set-Aside under ARS § 13-905 (available any time after discharge, no waiting period) vacates the judgment of guilt and can come with a Certificate of Second Chance, but the record stays publicly visible with an annotation. Record Sealing under ARS § 13-911 hides the record from public view and most background checks — and based on your dates, the sealing waiting period appears satisfied. Many people pursue both.',
          remedy: 'Set-Aside (ARS § 13-905) + Petition to Seal (ARS § 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911'
        },
        waiting_seal_az: {
          status: 'waiting',
          title: 'Set-Aside Available Now; Sealing Waiting Period Not Met',
          message: 'You appear potentially eligible RIGHT NOW for a Set-Aside under ARS § 13-905 — there is no waiting period after absolute discharge. However, Record Sealing under ARS § 13-911 requires a waiting period after completing your entire sentence: 10 years for Class 2/3 felonies, 5 years for Class 4/5/6 felonies, 3 years for Class 1 misdemeanors, and 2 years for Class 2/3 misdemeanors. You can file the set-aside now and seal later.',
          remedy: 'Set-Aside Now (ARS § 13-905); Sealing Later (ARS § 13-911)',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911'
        },
        ineligible_serious: {
          status: 'ineligible',
          title: 'Excluded Offense',
          message: 'Dangerous offenses, offenses requiring sex offender registration, offenses with a sexual-motivation finding, and crimes against victims under 15 are excluded from both Set-Aside (ARS § 13-905) and Record Sealing (ARS § 13-911). If your case involved marijuana conduct legalized by Prop 207, a separate expungement under ARS § 36-2862 may still apply — consult legal aid.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911'
        },
        ineligible_restitution: {
          status: 'ineligible',
          title: 'Sentence Not Yet Complete',
          message: 'Both remedies require completion of all sentence terms. Unpaid fines, fees, or victim restitution will block a Set-Aside (ARS § 13-905) and delay the start of the § 13-911 sealing waiting period. Confirm your balance is $0 with the court clerk, obtain your discharge, and then apply.',
          remedy: 'Complete Sentence / Pay Restitution First',
          citation: 'Arizona Revised Statutes §§ 13-905, 13-911'
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
            'Verify you have completed all terms of your sentence and been discharged (probation office or Department of Corrections).',
            'Ensure all fines, fees, and victim restitution are paid in full.',
            'Complete the set-aside application used by the court where you were sentenced.',
            'File the completed form with the Clerk of the Court in the county where you were sentenced.'
          ],
          // null: Wave 0 flags this fee. The Maricopa packet appears to show
          // none, but that is one county and unconfirmed. Blocked by an open
          // question; do not fill this in without a call.
          fees: null,
          // feeWaiver followed from the $0 claim, so it goes with it.
          feeWaiver: null,
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
            // Was: "The court must wait 60 days before ruling unless the
            // prosecutor and any victims waive objection." Wave 0 flags the
            // response window as unverified, so the number comes out until the
            // call confirms it. See open questions.
            'The prosecutor and any victims get a window to respond before the court rules; ask the clerk how long it currently runs. Attend a hearing if one is set.'
          ],
          // null: the old value asserted "the legislature removed filing fees"
          // — an affirmative claim about Arizona law that Wave 0 does not make
          // and no recorded source supports. Blocked by an open question.
          fees: null,
          feeWaiver: null,
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
    lastReviewed: '2026-07-15',
    verificationStatus: 'draft',
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
        question:
          'What does an expunction actually cost? Wave 0 gives "civil filing fee, county-set, ~$280-$400 range commonly cited, plus per-agency service costs" — "commonly cited" is not a source. The encoded rules said $300-$450, which does not even match. Ask a Harris County district clerk for both fee stacks.',
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
        question:
          'Does CCP Ch. 55A create AUTOMATIC expunction at acquittal — the trial court ordering it then and there? Wave 0 flags this as new and unverified. It matters directly: if true, an acquitted person may already have relief and should confirm it happened rather than petition. The eligible_expunction message now says both.',
        blocksFields: [],
      },
      {
        question:
          'Which dismissals qualify for expunction without community supervision, and what are the "certain automatic-dismissal pathways" Wave 0 flags?',
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
    sources: [
      { id: 'Tex. Code Crim. Proc. ch. 55A (expunction; recodified from ch. 55 eff. Jan 1, 2025)', url: null, retrievedOn: null },
      { id: 'Tex. Code Crim. Proc. art. 55A.002 (expunction after acquittal)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code ch. 411, subch. E-1 (orders of nondisclosure)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code § 411.072 (deferred adjudication nondisclosure, certain misdemeanours)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code § 411.0725 (deferred adjudication nondisclosure)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code § 411.0735 (certain misdemeanour convictions — period in conflict)', url: null, retrievedOn: null },
      { id: 'Tex. Gov\'t Code §§ 411.0726, 411.0731, 411.0736 (DWI nondisclosure paths)', url: null, retrievedOn: null },
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
            // CHECK-RECORD-FIRST: 55A may have had the trial court order the
            // expunction on the spot, so an acquittal gets its own result that
            // says "check whether it already happened" BEFORE petition advice.
            // Wave 0's TX persona 5 asks for exactly this.
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'check_record_first_tx' },
            // 'dismissed', not 'dropped': option values are matched against the
            // screening form's vocabulary (ConvictionRecord['disposition']).
            // 'dropped' matched nothing, so every dismissed Texas case fell
            // through to this node's old default — 'ineligible_conviction'.
            { label: 'Dismissed / Never charged / No-billed by grand jury', value: 'dismissed', next: 'dismissal_offense_level' },
            { label: 'Deferred Adjudication (Completed)', value: 'deferred', next: 'offense_level' },
            { label: 'Convicted (Jail / Prison / Standard Probation)', value: 'convicted', next: 'ineligible_conviction' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
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
        // CHECK-RECORD-FIRST for acquittals.
        check_record_first_tx: {
          status: 'eligible',
          title: 'It May Already Be Done — Check Before You File',
          message: 'Start with a phone call, not a petition. Since January 1, 2025, Texas expunction lives in Chapter 55A of the Code of Criminal Procedure, and that chapter may direct the trial court to order an expunction at the time of an acquittal — then and there, without you asking. If that happened in your case, it is finished and you owe nobody a filing fee. Ask the clerk of the court that tried your case whether an expunction order was entered. We are still verifying how far this reaches, so do not assume either way. If no order was entered, you appear potentially eligible to petition for an Expunction under Chapter 55A: an expunction destroys the records, and afterwards you can generally deny the arrest ever occurred.',
          remedy: 'Ask the Court Whether It Was Already Ordered — then Petition for Expunction (CCP Ch. 55A)',
          citation: 'Texas Code of Criminal Procedure Chapter 55A (Art. 55A.002 for acquittals)'
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

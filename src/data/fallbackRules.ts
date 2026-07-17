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
  /** When someone last LOOKED at this state — a fresh draft, or a re-review.
   *  Distinct from verifiedDate: lastReviewed moves on every re-review, the
   *  badge date does not, so the two drift apart after the first post-call look. */
  lastReviewed: string;
  verificationStatus: VerificationStatus;
  /** When the human verification that earned the current badge happened — null
   *  on a draft state (no badge), a date on a verified one. "lastReviewed means
   *  someone looked; verifiedDate means the badge was earned." The validator
   *  enforces the null-iff-draft correspondence. */
  verifiedDate?: string | null;
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
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
    sourcePackage: 'research/waves/Turnleaf_Wave0_Draft_Package.md',
    terminology:
      'California has no true expungement. The petition remedy is a DISMISSAL / SET-ASIDE under PC § 1203.4 (probation cases), § 1203.4a (misdemeanours and infractions where probation was not granted), and §§ 1203.41/.42 (felony and realignment cases) — colloquially called "expungement", but it does not erase anything. Separately, California runs the largest AUTOMATIC relief system in the country: PC § 851.93 (arrests) and § 1203.425 (convictions), under which the Department of Justice reviews statewide databases monthly and grants relief with no petition at all. Since August 2022, courts are barred from disclosing set-asides, which makes them function as sealing. Because the automatic layer is running, the honest first question is not "can I petition" but "is my record already clear" — check first, petition second. One rule runs through EVERY California dismissal path and is worth stating up front: unpaid restitution or fines CANNOT be used to deny you relief (PC §§ 1203.4(c)(3), 1203.4a(e), 1203.41(d), 1203.42(c)) — owing money does not stop a dismissal here.',
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
          'Is there any filing fee for the PC § 1203.4 dismissal petition (Form CR-180)? Recent sources say none statewide following the AB 1076-era fee elimination, but older county fee schedules show roughly $120-150. Wave 0 calls this "a perfect confirm-kill call" — ask an LA Superior Court clerk. (Practice tier; the statute Diana verified is silent on it.)',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Is arrest sealing under PC § 851.91 / § 851.87 genuinely free, and if there is a fee, is a waiver available? Diana verified § 851.91\'s eligibility (7/16) but the statute does not settle the filing fee — practice tier.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Adjacent-remedy statutes cited only in result PROSE, not yet human-read: PC § 4852.01 (Certificate of Rehabilitation), § 17(b) (felony reduction), § 1203.3 (early termination of probation), § 290.5 (ending registration). No routing claim traces to them (badge call, 7/16 — CA flipped to statute_cited on the six verified sections + 1203.4 with these retained as unread citations). Read them when convenient to link.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Cal. Penal Code § 1203.4 (dismissal after probation; (a)(1) as-of-right on probation fulfilled/early discharge; (b) exclusions incl. listed sex offenses + infractions; (c)(3) unpaid restitution cannot deny; (a)(2) no firearm restoration, (a)(1) still disclosable on office/licensure/Lottery, (a)(4) protective orders survive)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=1203.4', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 1203.4a (dismissal, probation not granted; as-of-right at 1 yr with the honest-and-upright-life condition, (b) discretionary otherwise; (d) exclusions misd 288(c)/VC 42002.1/VC 42001 infractions; (e) unpaid restitution cannot deny)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=1203.4a', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 1203.41 (felony/realignment dismissal, SB 731; 1 yr post-completion for mandatory supervision 1170(h)(5)(B), 2 yr for straight jail (h)(5)(A) or state prison; (a)(6) excludes if sex-registration; discretionary; (c) any conviction date; (d) unpaid restitution cannot deny)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=1203.41', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 1203.42 (pre-realignment (pre-2011) would-be-1170(h) felonies; 2 yr; discretionary; (c) unpaid restitution cannot deny)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=1203.42', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 1203.425 (automatic conviction relief; (a)(1)(B)(iv)(I)(ia) any probation-completed-without-revocation conviction, (ib) non-probation misd/infraction at 1 yr; (II) felony = all terms completed + 4 yrs no new felony, excl. serious 1192.7(c)/violent 667.5/registrable; (B)(i)-(iii) gates; post-1973; (b) DA/probation may petition to block up to 90 days pre-eligibility)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=1203.425', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 851.93 (automatic arrest relief; (a)(2) misd arrest+dismissal -> relief, misd never charged -> 1 yr, felony -> 3 yr, felony punishable 8+ yrs -> 6 yr, completed diversions (D list) -> relief; operative Oct 1, 2024)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=851.93', retrievedOn: '2026-07-16' },
      { id: 'Cal. Penal Code § 851.91 (arrest sealing petition, as-of-right; gates: not still chargeable, murder/no-SOL excluded unless acquitted/factually innocent, evasion bars; DV/child/elder-abuse arrests interests-of-justice only on a pattern of 2+ convictions or 5+ arrests in 3 yrs)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=851.91', retrievedOn: '2026-07-16' },
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
            { label: 'Successfully completed probation', value: 'completed', next: 'check_record_first_ca' },
            { label: 'Did not complete probation successfully', value: 'failed', next: 'complex_probation' },
            { label: 'Currently still on probation or supervision', value: 'active', next: 'ineligible_active_probation' },
            { label: 'No probation was sentenced', value: 'none', next: 'no_probation_level_ca' }
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
        // No probation was sentenced. 1203.425(a)(1)(B)(iv)(I)(ib): a non-probation
        // misdemeanor or infraction gets automatic relief 1 year after judgment;
        // (II): a non-probation felony after 4 conviction-free years since
        // completing ALL terms, if not serious/violent/registrable.
        no_probation_level_ca: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'judgment_date' },
            { label: 'Infraction', value: 'infraction', next: 'judgment_date' },
            { label: 'Felony', value: 'felony', next: 'felony_auto_ca' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'eligible_expungement' }
          ]
        },
        felony_auto_ca: {
          type: 'boolean',
          text: 'Was it a serious felony (PC § 1192.7(c)), a violent felony (PC § 667.5), or a felony requiring sex-offender registration?',
          yes: 'eligible_expungement',
          no: 'auto_relief_felony_date_ca'
        },
        // ASKS for completion, not judgment: the 4-year clock runs from completing
        // ALL sentence terms, which is not the date the form collects (contrast the
        // misdemeanor 1-year clock, which does run from judgment). Same class of
        // anchor as Arizona's absolute-discharge clock.
        auto_relief_felony_date_ca: {
          type: 'date',
          text: 'When did you complete ALL terms of your sentence — incarceration, mandatory supervision, post-release community supervision, and parole?',
          validation: {
            period: {
              amount: 4,
              unit: 'years',
              anchor: 'four conviction-free years since completing ALL sentence terms (PC § 1203.425(a)(1)(B)(iv)(II) — non-serious, non-violent, non-registrable felony)'
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
              anchor: 'judgment pronounced (PC § 1203.425(a)(1)(B)(iv)(I)(ib) automatic relief / PC § 1203.4a petition — non-probation misdemeanor or infraction)'
            },
            nextPass: 'check_record_first_ca',
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
          message: 'Start here, not with a petition. California\'s Department of Justice reviews state records every month and grants relief automatically under Penal Code § 1203.425 — no petition, no fee, and nobody tells you it happened. Based on your entries you appear to be in a tier the automatic program reaches: any conviction where you completed probation without revocation qualifies; a non-probation misdemeanor or infraction qualifies 1 year after judgment; and a non-probation felony qualifies 4 conviction-free years after you complete ALL sentence terms, as long as it is not a serious, violent, or registrable felony. So there is a real chance this is already done. Find out before you spend anything: request a record review from the CA DOJ (a fingerprint-based review costs about $25), or ask the court what your record shows now. In rare cases a prosecutor can move (up to 90 days before you become eligible) to contest the automatic relief — if that happened, the petition paths below stay open. If the automation missed you, or you want the extra benefits a petition can add (such as a felony reduction under PC § 17(b)), the § 1203.4 dismissal is available as of right once probation is complete — and unpaid restitution or fines cannot block it. Two honest limits: a dismissal does NOT restore firearm rights, and the conviction can still be disclosed on public-office, licensing, and Lottery applications.',
          remedy: 'Check Your Record First (CA DOJ Record Review) — then PC 1203.4 if needed',
          citation: 'California Penal Code §§ 1203.425, 1203.4'
        },
        eligible_dismissed: {
          status: 'eligible',
          title: 'Your Arrest Record May Already Be Cleared — Check First',
          // CHECK-RECORD-FIRST: § 851.93 automation leads, the § 851.91
          // petition follows. Wave 0's CA persona 5 asks for exactly this
          // order and the result used to lead with the petition instead.
          message: 'Start by checking, not by filing. Arrests that did not lead to a conviction are cleared automatically by the California DOJ under Penal Code § 851.93 (operative Oct 1, 2024) — the DOJ reviews state databases monthly and grants relief itself, without notifying you. The tiers: a misdemeanor arrest that was dismissed clears; a misdemeanor where you were never charged clears 1 year after arrest; a felony after 3 years (6 years if it was punishable by 8+ years); and a completed diversion clears. So the work may already be done — request a CA DOJ record review (about $25) to see where you stand. If the automation missed your arrest, you can petition to seal it under § 851.91, which is available as of right when charges were dismissed, you were acquitted, or you were never charged — with a few gates: it is not available while you can still be charged, murder and no-statute-of-limitations charges are excluded unless you were acquitted or found factually innocent, and a pattern of evading arrest bars it. One exception to the as-of-right rule: an arrest for domestic violence, child abuse, or elder abuse is sealable only in the interests of justice (not as of right) if your record shows a pattern — 2 or more convictions or 5 or more arrests in 3 years. Diversion completions can also seal under § 851.87.',
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
          message: 'You appear eligible for a dismissal under Penal Code § 1203.4. Once you have fulfilled probation (or been granted early discharge), this relief is available AS OF RIGHT, at any time after probation ends, as long as you are not currently serving a sentence, on probation, or facing charges — and unpaid restitution or fines cannot be used to deny it (§ 1203.4(c)(3)). Check your record first, though: under the automatic program (§ 1203.425) many convictions are dismissed by the DOJ with no petition at all, so yours may already be done. Filing can still add benefits, such as a felony reduction under PC § 17(b). Know the limits of a § 1203.4 dismissal before you rely on it: it does NOT restore firearm rights (§ (a)(2)); the conviction remains disclosable on public-office, professional-licensing, and Lottery questionnaires (§ (a)(1)); any protective orders survive (§ (a)(4)); and the conviction can still be used against you in a later prosecution.',
          remedy: 'Petition for Dismissal (PC 1203.4)',
          citation: 'California Penal Code §§ 1203.4, 1203.425'
        },
        waiting_period_ca: {
          status: 'waiting',
          title: 'Waiting Period Not Met',
          message: 'When probation was not granted, the § 1203.4a dismissal becomes available AS OF RIGHT 1 year after judgment — provided you have lived an honest and upright life since (a statutory condition); before the year is up, or without that showing, the court may still grant it as a discretionary matter (§ (b)). The same 1-year mark is when a non-probation misdemeanor or infraction becomes eligible for automatic DOJ relief under § 1203.425. Unpaid restitution or fines cannot be used to deny the dismissal (§ 1203.4a(e)). Based on your dates, the year has not passed yet.',
          remedy: 'Petition for Dismissal (PC 1203.4a)',
          citation: 'California Penal Code §§ 1203.4a, 1203.425'
        },
        complex_prison: {
          status: 'complex',
          title: 'State Prison Sentence — Relief May Still Be Available',
          // Both waiting periods removed: Wave 0 flags the § 1203.41 period
          // ("2 yrs post-completion") and the § 1203.425 felony tiers ("4 yrs")
          // as unverified. Neither number is asserted here. See open questions.
          message: 'A state prison sentence is not eligible under PC § 1203.4, but SB 731 opened PC § 1203.41 to many felonies even where prison or jail time was served — a discretionary dismissal (not as of right) the court may grant after a waiting period from when you complete your sentence: 1 year if you were on mandatory supervision (§ 1170(h)(5)(B)), or 2 years for a straight county-jail sentence (§ 1170(h)(5)(A)) or state prison. It is excluded if the felony requires sex-offender registration (§ (a)(6)), and it applies to convictions of any date. Unpaid restitution cannot be used to deny it (§ (d)). Separately, the automatic program (§ 1203.425) may reach a non-serious, non-violent, non-registrable felony 4 conviction-free years after you complete all terms — worth a DOJ record check. A Certificate of Rehabilitation (PC § 4852.01) is another path. This area is fact-specific — please consult legal aid.',
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
    verifiedDate: '2026-07-15',
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
      { id: 'Ariz. Rev. Stat. § 13-905 (set aside; Certificate of Second Chance; § 13-905(B) no filing fee; (K),(L) CSC timing; (O) firearms; (P) exclusions)', url: 'https://www.azleg.gov/ars/13/00905.htm', retrievedOn: '2026-07-15' },
      { id: 'Ariz. Rev. Stat. § 13-911 (record sealing; (A)(2)-(3) non-convictions; (D) 60-day rule; (E) clock; (F) prior-felony +5; (G) payment at filing; (H) DPS fee and waiver; (L) 3-year denial bar; (O) exclusions)', url: 'https://www.azleg.gov/ars/13/00911.htm', retrievedOn: '2026-07-15' },
      { id: 'Ariz. Rev. Stat. § 36-2862 (Prop 207 marijuana expungement; (B) state bears the clear-and-convincing burden of proving ineligibility)', url: 'https://www.azleg.gov/ars/36/02862.htm', retrievedOn: '2026-07-16' },
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
          message: 'Because this was marijuana conduct that Proposition 207 made legal, you can petition to EXPUNGE it under ARS § 36-2862 — and that is a better outcome than either of Arizona\'s other remedies. An expungement is a true erasure, not a set-aside notation and not a sealing. There is no waiting period, you can file at any time, and there is no fee. And the burden is on the STATE: under § 36-2862(B), the court must grant the expungement unless the prosecuting agency proves by clear and convincing evidence that you are not eligible. Do this before considering a set-aside or a petition to seal: those are slower, weaker, and unnecessary here.',
          remedy: 'Petition to Expunge Marijuana Records (ARS § 36-2862)',
          citation: 'Arizona Revised Statutes § 36-2862; state bears the clear-and-convincing burden under § 36-2862(B) (Proposition 207)'
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
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
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
        note: 'CPL 160.57 subd. 6: OCA must complete sealing of pre-effective-date convictions no later than 3 years after the effective date. Until then many eligible old records are NOT yet sealed — "eligible" and "sealed" are different states and the copy must not blur them.',
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
          'Is there a filing fee for the CPL § 160.59 sealing motion, and if there is, is a waiver available? The statute is SILENT on a filing fee (Diana, 7/16), so this is an OCA/practice question, not statute-resolved — the fee and waiver fields stay null pending it.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Clock-reset modeling limitation (not a legal unknown). Diana confirmed the mechanic (7/16): under CPL 160.57 a new conviction before sealing restarts the prior conviction\'s clock on the SAME date as the new conviction\'s clock; under 160.59 subd. 5, time incarcerated after the latest conviction tolls the 10-year period. The single-date tree cannot model a multi-conviction reset — the copy states it in prose instead.',
        blocksFields: [],
      },
      {
        question:
          'What is the current Clean Slate rollout status? Wave 0 names this as the call question for nycourts.gov — how far through the backlog is OCA (subd. 6 deadline Nov 16, 2027), and can a person find out whether their own record has been reached?',
        blocksFields: [],
      },
      {
        question:
          'The Certificate of Disposition cost ($5 outside NYC, $10 within) is stated in the § 160.59 filing steps but is a court-clerk practice figure, not in the verified statute. Confirm the current cost with a court clerk.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.Y. Crim. Proc. Law § 160.57 (Clean Slate automatic sealing; (1)(a) DWAI 3-yr; (1)(b)(i)/(ii) misd 3-yr / felony 8-yr anchors; (1)(b)(iv)+subd.8 supervision bar; (1)(b)(v)-(vi) exclusions; (1)(c) quarterly recheck; (1)(e) 30-day form; subd.4 waiver void; subd.6 Nov-16-2027 backlog; subd.10 LFOs survive but do not gate)', url: 'https://legislation.nysenate.gov/laws/CPL/leaf/160.57', retrievedOn: '2026-07-16' },
      { id: 'N.Y. Crim. Proc. Law § 160.59 (petition sealing; (1)(a) exclusions incl. §70.02/art.125/130/263/105/attempts/SORA; (2)(a)+4 cap of 2 (max 1 felony), same-transaction=one; (3)(f)/(3)(h) summary-denial gates; 10-yr from latest conviction/release, subd.5 tolled by incarceration; subd.6 no hearing if DA does not oppose, 45-day objection; subd.11 waiver void)', url: 'https://legislation.nysenate.gov/laws/CPL/leaf/160.59', retrievedOn: '2026-07-16' },
      { id: 'N.Y. Crim. Proc. Law § 160.50 (favorable-termination sealing incl. COURT records (1)(c); subd.3 termination list incl. ACD 170.55, marijuana-ACD 170.56/210.46, declination (3)(i), police no-action (3)(j); subd.5 MRTA marijuana vacatur/expungement; interests-of-justice exception on 5 days notice)', url: 'https://legislation.nysenate.gov/laws/CPL/leaf/160.50', retrievedOn: '2026-07-16' },
      { id: 'N.Y. Crim. Proc. Law § 160.55 (traffic-infraction/violation sealing at termination, EXCEPT VTL 1192(1) DWAI; (1)(c) seals DCJS/police/prosecutor but NOT the court file; interests-of-justice exception; (1)(a)/(d)(vi) harassment-2 family carve-out)', url: 'https://legislation.nysenate.gov/laws/CPL/leaf/160.55', retrievedOn: '2026-07-16' },
      { id: 'N.Y. Veh. & Traf. Law § 1192(1) (DWAI — carved out of 160.55, sealed under Clean Slate 160.57(1)(a) after 3 yrs)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 130 (sex offences; 160.57 and 160.59 exclusion)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 263 (sexual performance by a child; exclusion)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 125 (homicide felonies; 160.59 exclusion)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law art. 220 (Class A drug felonies — ARE Clean Slate eligible)', url: null, retrievedOn: null },
      { id: 'N.Y. Penal Law § 70.02 (violent felonies — Clean Slate 160.57 ELIGIBLE, but 160.59 petition EXCLUSION)', url: null, retrievedOn: null },
      { id: 'N.Y. Correction Law § 168-a (sex-offense registration; defines the 160.57(1)(b)(v) exclusion)', url: null, retrievedOn: null },
      { id: 'Marijuana Regulation and Taxation Act (MRTA, 2021) — cannabis expungement, now statute-cited to CPL 160.50 subd. 5', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted of a misdemeanor or felony', value: 'convicted', next: 'cannabis_ny' },
            { label: 'Dismissed / Acquitted / Non-criminal violation or infraction', value: 'dismissed', next: 'eligible_seal_dismissed' },
            // A completed ACD (CPL 170.55 / marijuana 170.56/210.46) is a
            // termination in favor of the accused (160.50 subd. 3(b)) and seals
            // automatically at the dismissal. (Diana, statute pass 7/16.)
            { label: 'Deferred adjudication / ACD / Diversion completed', value: 'deferred', next: 'eligible_acd_ny' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        cannabis_ny: {
          type: 'boolean',
          text: 'Was this a marijuana or cannabis conviction?',
          yes: 'check_cannabis_ny',
          no: 'excluded_offense_ny'
        },
        excluded_offense_ny: {
          type: 'boolean',
          text: 'Is the conviction a sex offense requiring registration (a Correction Law § 168-a offense) or a sexually violent offense, or a Class A felony that is NOT an Article 220 drug offense (for example, murder)?',
          yes: 'ineligible_offense',
          no: 'supervision_status'
        },
        supervision_status: {
          type: 'boolean',
          text: 'For THIS conviction, are you still serving any part of the sentence — incarceration, probation, parole, or post-release supervision — or do you have any pending criminal charges?',
          yes: 'ineligible_supervision',
          no: 'offense_level_ny'
        },
        offense_level_ny: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'clean_slate_date_misd' },
            { label: 'Felony', value: 'felony', next: 'clean_slate_date_felony' },
            { label: 'Traffic infraction or violation', value: 'infraction', next: 'violation_dwai_ny' }
          ]
        },
        // A DWAI (VTL 1192(1)) is carved OUT of the 160.55 immediate violation-seal
        // and instead seals under Clean Slate 160.57(1)(a) after 3 years. Every
        // other violation/traffic infraction conviction seals at termination (160.55).
        violation_dwai_ny: {
          type: 'boolean',
          text: 'Was this a DWAI — driving while ability impaired under Vehicle & Traffic Law § 1192(1)?',
          yes: 'clean_slate_date_dwai',
          no: 'eligible_violation_seal_ny'
        },
        // Clean Slate periods. The anchor carries the statute's "release, else
        // sentencing" rule; a new conviction restarts the clock (see open questions
        // — the single-date tree states the reset in prose, cannot compute it).
        clean_slate_date_misd: {
          type: 'date',
          text: 'When were you released from incarceration for this conviction — or, if there was no incarceration, when was sentence imposed? (A new conviction before sealing restarts this clock.)',
          validation: {
            period: {
              amount: 3,
              unit: 'years',
              anchor: 'release from incarceration, or imposition of sentence if none (CPL 160.57(1)(b)(i) — misdemeanor)'
            },
            nextPass: 'eligible_clean_slate',
            nextFail: 'waiting_clean_slate_misd'
          }
        },
        clean_slate_date_felony: {
          type: 'date',
          text: 'When were you LAST released from incarceration for this conviction — or, if there was no incarceration, when was sentence imposed? (A new conviction before sealing restarts this clock.)',
          validation: {
            period: {
              amount: 8,
              unit: 'years',
              anchor: 'last release from incarceration for the sentence, or imposition of sentence if none (CPL 160.57(1)(b)(ii) — felony)'
            },
            nextPass: 'eligible_clean_slate',
            nextFail: 'waiting_clean_slate_felony'
          }
        },
        clean_slate_date_dwai: {
          type: 'date',
          text: 'When were you sentenced for the DWAI — or released from incarceration, if any (whichever is later)?',
          validation: {
            period: {
              amount: 3,
              unit: 'years',
              anchor: 'release from incarceration, or imposition of sentence if none (CPL 160.57(1)(a) — VTL 1192(1) DWAI)'
            },
            nextPass: 'eligible_clean_slate',
            nextFail: 'waiting_clean_slate_misd'
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
        eligible_acd_ny: {
          status: 'eligible',
          title: 'ACD / Deferral Completed — Sealed Automatically at Dismissal',
          message: 'Because you completed an adjournment in contemplation of dismissal (ACD) or a similar diversion, New York treats the resulting dismissal as a termination in your favor (CPL § 160.50 subd. 3(b)), and it seals automatically — reaching the court file as well as the DCJS, police, and prosecutor records. One timing point: the sealing follows the DISMISSAL at the end of the adjournment period, not the date you took the ACD, so if your adjournment is not over yet, the seal comes when it ends. For a marijuana ACD (CPL 170.56/210.46), the fingerprints are sealed rather than destroyed. As with any § 160.50 sealing, the district attorney (on 5 days\' notice) or the court can move to keep it open in the interests of justice. If your record still shows the case after dismissal, ask the court to confirm sealing. LawHelpNY can help.',
          remedy: 'Automatic sealing at ACD dismissal (CPL 160.50 subd. 3(b))',
          citation: 'New York Criminal Procedure Law § 160.50 subd. 3(b)'
        },
        eligible_violation_seal_ny: {
          status: 'eligible',
          title: 'Violation / Traffic Infraction — Sealed at Termination',
          message: 'A conviction for a non-criminal violation or a traffic infraction (other than DWAI) is sealed automatically when the case terminates, under CPL § 160.55. One honest limit on how far that seal reaches: § 160.55 seals the records held by DCJS, the police, and the prosecutor, but — unlike the § 160.50 sealing for non-convictions — it does NOT reach the COURT\'s file, which remains. Sealing is the default but not unconditional: the DA (on 5 days\' notice) or the court can move to keep a record open in the interests of justice. One carve-out to know: a harassment-in-the-second-degree conviction against a family or household member keeps its fingerprints and stays visible to law enforcement. (A DWAI is handled differently — it is not sealed as a violation, but clears under Clean Slate after 3 years.)',
          remedy: 'Automatic sealing at termination (CPL 160.55) — court file remains',
          citation: 'New York Criminal Procedure Law § 160.55'
        },
        check_cannabis_ny: {
          status: 'eligible',
          title: 'Marijuana Conviction — Expunged Automatically (Check Your Record)',
          message: 'Because this was a marijuana or cannabis conviction, New York has likely already handled it: under the MRTA (now in CPL § 160.50 subd. 5), qualifying marijuana convictions were automatically vacated, dismissed, and EXPUNGED — not merely sealed — and the deadline for clearing pre-2019 records has passed. So the honest first step is to CHECK whether yours has come off rather than assume you must do anything: request your DCJS criminal-history record. If it is somehow still showing, there is a concrete fix — under subd. 5(b)(ii)(B) you can present a disposition record to the court, and the expungement must be completed within 30 days. LawHelpNY and the Legal Aid Society can help.',
          remedy: 'Automatic MRTA expungement (CPL 160.50 subd. 5) — check your record',
          citation: 'New York Criminal Procedure Law § 160.50 subd. 5 (MRTA)'
        },
        eligible_seal_dismissed: {
          status: 'eligible',
          title: 'Automatic Sealing (Non-Conviction)',
          message: 'Because your case ended in your favor, New York seals it automatically under CPL § 160.50 — and § 160.50 reaches the full record, INCLUDING the court file, along with the DCJS, police, and prosecutor records. This covers acquittals; dismissals (including trial orders of dismissal, grand-jury dismissals under 190.75, and vacaturs under 440.10 with no retrial); cases the prosecutor declined to charge (subd. 3(i)); and arrests where the police released you without further action (subd. 3(j)). Sealing is the default, but not unconditional: on 5 days\' notice the district attorney can move, or the court can act on its own, to keep a record open in the interests of justice. If your record still shows the case, ask the court to confirm sealing was applied. (A conviction for a non-criminal violation or traffic infraction seals under the narrower § 160.55 instead — see that result.)',
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
          message: 'Under New York\'s Clean Slate Act (CPL § 160.57, effective Nov 16, 2024), an eligible misdemeanor is sealed automatically 3 years, and an eligible felony 8 years, after you are released from incarceration — or, if there was no incarceration, after sentence was imposed. Based on your entries, your conviction appears eligible; note that even a Penal Law § 70.02 violent felony qualifies for Clean Slate (only the discretionary § 160.59 petition excludes violent felonies). Two reassurances: unpaid fines or restitution do NOT block sealing — they survive but are not a condition (subd. 10) — and any plea term waiving your Clean Slate eligibility is void (subd. 4). The catch is timing, not eligibility: courts have until November 16, 2027 to work through pre-existing records (subd. 6), so an eligible conviction may not be physically sealed yet — eligible and sealed are not the same thing. Check your status by requesting your criminal history from the NYS Division of Criminal Justice Services; OCA also re-checks eligibility quarterly. If your record is eligible but still not sealed, there is a concrete remedy: submit the Judiciary Law § 212(2)(dd) request form, and OCA must seal within 30 days. A faster route than waiting for the backlog is the CPL § 160.59 petition — but it is narrower (it excludes violent felonies and other categories, is capped at 2 eligible convictions with at most 1 felony, and runs 10 years from your latest conviction); see the petition steps below to weigh it.',
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
          message: 'A sex offense requiring registration (a Correction Law § 168-a offense) and a Class A felony that is not an Article 220 drug offense (such as murder) are excluded from BOTH Clean Slate automatic sealing (CPL § 160.57) and the § 160.59 petition. Two things worth knowing: a Class A DRUG felony under Article 220 IS eligible for Clean Slate; and a Penal Law § 70.02 violent felony, while excluded from the § 160.59 petition, is NOT excluded from Clean Slate — it seals automatically after the 8-year wait. If either might be your situation, consult legal aid.',
          remedy: 'None (Statutorily Excluded) — Consult Legal Aid',
          citation: 'New York Criminal Procedure Law §§ 160.57, 160.59'
        },
        ineligible_supervision: {
          status: 'ineligible',
          title: 'Currently Under Supervision or Facing Charges',
          message: 'A conviction cannot seal — automatically or by petition — while you are still serving any part of its sentence: incarceration, probation, parole, or post-release supervision (CPL § 160.57(1)(b)(iv) and subd. 8), or while criminal charges are pending. One nuance: being held on a parole or post-release-supervision detention does not by itself pause the Clean Slate clock — the clock only restarts if the detention leads to revocation and reincarceration. Once your sentence is fully served and any charges resolve, the waiting period can complete.',
          remedy: 'None Yet (Active Supervision / Pending Charges)',
          citation: 'New York Criminal Procedure Law § 160.57'
        }
      }
    },
    resources: {
      remedies: {
        clean_slate: {
          name: 'Clean Slate Automatic Sealing (CPL 160.57)',
          formName: 'No application required; if an eligible record is not sealed, submit the Judiciary Law § 212(2)(dd) request form (OCA must then seal within 30 days)',
          formUrl: 'https://www.nycourts.gov/criminal-history-record-search/new-york-states-clean-slate-act',
          steps: [
            'No petition is needed — sealing is automatic once the waiting period runs and you are not under supervision.',
            'Courts have until November 16, 2027 to seal all pre-existing eligible records, so an eligible record may still appear on checks for now.',
            'To check your status, request your NYS criminal history (RAP sheet) from the Division of Criminal Justice Services.',
            'If an eligible conviction is not sealed, submit the Judiciary Law § 212(2)(dd) request form — OCA must then complete sealing within 30 days. OCA also re-checks eligibility quarterly.'
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
            'Confirm eligibility: no more than 2 eligible convictions total, at most 1 a felony (offenses from the same criminal transaction count as ONE). The petition is summarily denied if you have 2+ felony convictions, more than 2 crimes, or any conviction entered AFTER the one you want sealed.',
            'Confirm the offense is not excluded: § 160.59 excludes sex offenses (Penal art. 130), art. 263, § 70.02 violent felonies, art. 125 homicide felonies, Class A felonies, conspiracies/attempts tied to an ineligible offense, and SORA-registrable offenses. (A § 70.02 violent felony is barred here but still qualifies for Clean Slate.)',
            'Confirm the wait: 10 years from imposition of sentence on your LATEST conviction (or latest release from incarceration) — not from the conviction being sealed — and any time you spent incarcerated after that conviction extends it (subd. 5).',
            'Obtain a Certificate of Disposition from the court where you were sentenced (one per case), complete the Sealing Application (Notice of Motion & Affidavit in Support), sign before a notary, and serve the District Attorney in each county of conviction.',
            // Procedure + the Certificate-of-Disposition cost (a clerk practice
            // figure, not in the verified statute — see open questions).
            'The DA has 45 days to object; if the DA does not oppose, there is no hearing (subd. 6). Any plea term waiving sealing eligibility is void (subd. 11). Budget for the Certificate of Disposition (reported $5 per case outside New York City, $10 within — confirm the current cost with the clerk).'
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
    verifiedDate: '2026-07-16',
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
        // STATUTE-PASS WORKLIST (7/16): a guard on future encoding, not a fee/date question.
        question:
          'Before any TX DWI nondisclosure branch is built on § 411.0731, do a FULL read of the section. Only subsection (f) — the waiting ladder (2 years with an ignition interlock, 5 without) — has been human-verified against the official text (it surfaced via a page-break spillover in the retrieved PDF); the section\'s applicability and conditions are unread. The link on the 411.0731 source is kept because the sole currently-encoded claim traces to that verified (f) text, but no further 411.0731 rule may be encoded until the whole section is read.',
        blocksFields: [],
      },
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
      { id: 'Tex. Code Crim. Proc. ch. 55A (expunction; recodified from ch. 55 eff. Jan 1, 2025)', url: 'https://statutes.capitol.texas.gov/Docs/CR/htm/CR.55A.htm', retrievedOn: '2026-07-16' },
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
      { id: 'Tex. Gov\'t Code § 411.0725 (deferred adjudication nondisclosure)', url: 'https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm#411.0725', retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0735 (certain misdemeanour convictions — period still in conflict; see open questions)', url: 'https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm#411.0735', retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0736 (DWI nondisclosure)', url: 'https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm#411.0736', retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.074 (nondisclosure — required conditions)', url: 'https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm#411.074', retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0731 (DWI nondisclosure path — PARTIAL READ: only subsection (f), the waiting ladder (2y with interlock / 5y without), was verified against official text via a page-break spillover; applicability and conditions unread. Full read required before a DWI branch is built on this section)', url: 'https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm#411.0731', retrievedOn: '2026-07-16' },
      { id: 'Tex. Gov\'t Code § 411.0726 (DWI nondisclosure path)', url: null, retrievedOn: null },
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
  },

  // ==========================================================================
  // FLORIDA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave3_Draft_Package.md
  //
  // THE RESTRICTIVE GIANT. The honest answer for most Floridians with a
  // conviction is "not eligible", and saying so plainly is the tool doing its
  // job. Two rules decide almost everything, and both are asked before anything
  // else:
  //   1. ONE court-ordered seal-or-expunge per LIFETIME (§§ 943.0585/.059). A
  //      prior Florida seal or expunge makes a person permanently ineligible.
  //   2. ANY adjudication of guilt on the Florida record, for ANY offence ever,
  //      bars the FDLE Certificate of Eligibility. Florida does not seal or
  //      expunge convictions. Withheld adjudication is the only conviction-
  //      adjacent outcome that can ever be sealed.
  //
  // Like Utah, a Certificate of Eligibility from FDLE comes BEFORE any court
  // petition — but stricter. The result copy pairs every "no" with the real
  // remaining doors (niche tracks, legal aid).
  // ==========================================================================
  FL: {
    code: 'FL',
    name: 'Florida',
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
    sourcePackage: 'research/waves/Turnleaf_Wave3_Draft_Package.md',
    terminology:
      'Florida has two court remedies and they are not interchangeable. EXPUNCTION (Fla. Stat. '
      + '§ 943.0585) is for cases that ended without a conviction — dismissed, never charged, or a '
      + 'record already sealed for 10 years. SEALING (§ 943.059) hides a record where adjudication '
      + 'was WITHHELD and for some non-convictions. The hard truth Florida makes people confront: it '
      + 'does not seal or expunge actual convictions, and any adjudication of guilt anywhere on your '
      + 'record — for any offence, ever — blocks relief entirely. Before either petition, you must '
      + 'get a Certificate of Eligibility from FDLE, and you can only use a court seal-or-expunge '
      + 'ONCE in your lifetime.',
    keyDates: [
      {
        label: 'Administrative/automatic sealing of qualifying non-conviction arrests (§ 943.0595)',
        date: '2019',
        kind: 'effective',
        note: 'FDLE MANDATORILY auto-seals qualifying non-conviction arrest records (§ 943.0595), with no lifetime limit ((2)(b)) — but NOT forcible felonies (§ 776.08) or specified sex-registry offenses ((2)(a)), and FDLE sealing its own copy does not force other agencies to seal theirs ((3)(c)). (Diana, statute pass 2026-07-16.)',
      },
    ],
    openQuestions: [
      {
        question:
          'What is the county clerk filing fee for a seal or expunge petition? Wave 3 gives "~$42-$60 range commonly cited" and flags it as a phone target — a range across counties is not any one county\'s fee. The FDLE application fee is separately confirmed at $75 (see below). Ask one county clerk.',
        blocksFields: ['resources.remedies.petition.fees', 'resources.remedies.petition.feeWaiver'],
      },
    ],
    sources: [
      // Diana read all seven directly (7/16); FL statute URLs (leg.state.fl.us uses
      // chapter-range paths) not yet supplied, so retrievedOn is set and url is
      // held pending her links — read-but-unlinked.
      { id: 'Fla. Stat. § 943.0585 (expunction; (1)(g) lifetime bar cross-references only FL relief; (2)(b) 12-month COE validity; (5)-(6) $75/fingerprint/notarized COE mechanics)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.059 (court-ordered sealing; (1)(e) lifetime bar cross-references only FL relief; (2)(b) 12-month COE validity)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.0578 (lawful self-defense expunction; (1) notwithstanding 943.0585(1)&(2) — overrides the lifetime and conviction bars; (2) own COE; (4) imports 943.0585(5)-(6))', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.0581 (administrative expunction; read 7/16)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.0582 (juvenile diversion expunction; (4) does not use the adult once-per-lifetime relief)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.0584 (offenses ineligible even with adjudication withheld; (1) conviction = any guilty/nolo plea or finding, withheld or not; (2)(a)-(hh) the full category list)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 943.0595 (MANDATORY auto-sealing of non-conviction arrests; (2)(b) no lifetime limit; (2)(a) excludes forcible felony 776.08 and specified registry offenses even if dismissed/acquitted; (3)(c) FDLE sealing does not force other agencies)', url: null, retrievedOn: '2026-07-16' },
      { id: 'Fla. Stat. § 776.08 (forcible felony — excluded from 943.0595 auto-sealing; cross-reference)', url: null, retrievedOn: null },
      { id: 'Fla. Stat. § 943.0435(1)(h)1.a.(I) (sex-offender-registry offenses excluded from 943.0595 auto-sealing; cross-reference)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'prior_relief_fl',
      nodes: {
        // The lifetime rule is asked FIRST — it is the fastest "no".
        prior_relief_fl: {
          type: 'boolean',
          text: 'Have you ever had a Florida criminal record sealed or expunged before, by court order?',
          yes: 'selfdefense_lifetime_fl',
          no: 'prior_adjudication_fl'
        },
        // The conviction bar is the second-fastest "no".
        prior_adjudication_fl: {
          type: 'boolean',
          text: 'Has any criminal charge on your Florida record — this case or any other, ever — ended in an ADJUDICATION of guilt (a formal conviction, as opposed to adjudication being WITHHELD)?',
          yes: 'selfdefense_conviction_fl',
          no: 'disposition'
        },
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of THIS case?',
          options: [
            { label: 'Dismissed / Never charged / Charges dropped', value: 'dismissed', next: 'eligible_expunction_fl' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_expunction_fl' },
            { label: 'Adjudication WITHHELD (guilty or no contest, but no formal conviction entered)', value: 'convicted', next: 'disqualified_offense_fl' },
            { label: 'Diversion completed', value: 'deferred', next: 'diversion_type_fl' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // Self-defense expunction (943.0578) overrides BOTH the lifetime bar and
        // the conviction bar ("notwithstanding 943.0585(1) and (2)").
        selfdefense_lifetime_fl: {
          type: 'boolean',
          text: 'Did the state attorney or the court find that you acted in lawful self-defense under chapter 776, and either not file charges or dismiss them on that basis?',
          yes: 'eligible_selfdefense_fl',
          no: 'ineligible_lifetime_fl'
        },
        selfdefense_conviction_fl: {
          type: 'boolean',
          text: 'Did the state attorney or the court find that you acted in lawful self-defense under chapter 776, and either not file charges or dismiss them on that basis?',
          yes: 'eligible_selfdefense_fl',
          no: 'ineligible_conviction_fl'
        },
        diversion_type_fl: {
          type: 'choice',
          text: 'What kind of diversion did you complete?',
          options: [
            { label: 'Juvenile diversion (a diversion program for a minor)', value: 'juvenile', next: 'eligible_juvenile_fl' },
            { label: 'Adult diversion — and the case was then dismissed or dropped (nolle prossed) by the state attorney', value: 'adult_dismissed', next: 'eligible_expunction_fl' },
            { label: 'I\'m not sure how the case finally ended', value: 'unsure', next: 'unknown_deferred' }
          ]
        },
        disqualified_offense_fl: {
          type: 'choice',
          text: 'Florida keeps a specific list of offenses that cannot be sealed even when adjudication was WITHHELD — and for this list, a "conviction" means any guilty or no-contest plea or trial finding, whether or not adjudication was withheld (§ 943.0584(1)). Is your offense in any of these categories?',
          options: [
            { label: 'A sexual offense (ch. 794, sexual misconduct, lewd/lascivious on a minor/elderly/disabled person, sexual performance by a child, obscenity, or voyeurism)', value: 'sexual', next: 'ineligible_disqualified_fl' },
            { label: 'Murder, manslaughter, aggravated assault, felony or aggravated battery, stalking, kidnapping, or false imprisonment', value: 'violent', next: 'ineligible_disqualified_fl' },
            { label: 'Domestic-violence assault or battery', value: 'dv', next: 'ineligible_disqualified_fl' },
            { label: 'An offense against a child (luring/enticing, child abuse, buying/selling minors, or procuring a minor for prostitution)', value: 'child', next: 'ineligible_disqualified_fl' },
            { label: 'Human trafficking', value: 'trafficking', next: 'ineligible_disqualified_fl' },
            { label: 'Burglary of a dwelling, robbery, carjacking, or home-invasion robbery', value: 'burglary_robbery', next: 'ineligible_disqualified_fl' },
            { label: 'Arson', value: 'arson', next: 'ineligible_disqualified_fl' },
            { label: 'Abuse of an elderly or disabled person', value: 'elder', next: 'ineligible_disqualified_fl' },
            { label: 'Drug trafficking, or manufacturing a controlled substance', value: 'drug_traffic', next: 'ineligible_disqualified_fl' },
            { label: 'Terrorism, illegal use of explosives, or aircraft piracy', value: 'terrorism', next: 'ineligible_disqualified_fl' },
            { label: 'Communications or wire fraud (the Florida Communications Fraud Act)', value: 'fraud', next: 'ineligible_disqualified_fl' },
            { label: 'An offense that requires sexual-predator or sex-offender registration', value: 'registry', next: 'ineligible_disqualified_fl' },
            { label: 'None of the above', value: 'none', next: 'sentence_complete_fl' }
          ]
        },
        sentence_complete_fl: {
          type: 'boolean',
          field: 'restitution_paid',
          text: 'Have you completed all terms of your sentence, including any probation and payment of restitution?',
          yes: 'eligible_sealing_fl',
          no: 'ineligible_incomplete_fl'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Florida\'s rules turn entirely on how the case ended, and the differences are stark: a dismissal can be expunged, a withheld adjudication can sometimes be sealed, and an actual conviction cannot be cleared at all. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. Request your criminal history from FDLE, or ask the clerk of the court that handled the case. County legal aid organizations and the Florida Justice Center can help you read it.',
          remedy: 'Get Your Record First (FDLE / court clerk)',
          citation: 'Fla. Stat. §§ 943.0585, 943.059 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'You told us a diversion was completed but were not sure how the case finally ended — and in Florida that last step decides the path. If the state attorney dismissed or dropped the charges, the case can be expunged like any non-conviction; if adjudication was withheld, sealing may be possible; and juvenile diversion and lawful-self-defense cases have their own separate doors. Rather than guess, pull your FDLE criminal history or ask the court clerk how the case was finally disposed, then run this again. County legal aid and the Florida Justice Center can help you read it.',
          remedy: 'Confirm how the case finally ended (FDLE / court clerk), then re-run',
          citation: 'Fla. Stat. §§ 943.0585, 943.059 (the path depends on the final disposition)'
        },
        ineligible_lifetime_fl: {
          status: 'ineligible',
          title: 'You Have Used Florida\'s Once-Per-Lifetime Relief',
          message: 'Florida allows a person only ONE court-ordered seal or expunge in their lifetime, and because you have had a Florida record sealed or expunged before, you cannot obtain another. This is a hard rule in the statute, not a waiting period. One thing worth knowing that is easy to miss: this bar is about a prior FLORIDA relief. A seal or expunge you obtained in ANOTHER STATE does not count against you here, because both statutes only cross-reference Florida sealing and expunction statutes (§§ 943.059(1)(e), 943.0585(1)(g)). If your prior relief was out of state, it is worth confirming with a Florida legal aid organization that you are not actually barred. The Florida Justice Center and county legal aid can check.',
          remedy: 'None (Once-Per-Lifetime Rule Used) — an out-of-state prior relief does NOT count',
          citation: 'Fla. Stat. §§ 943.059(1)(e), 943.0585(1)(g)'
        },
        ineligible_conviction_fl: {
          status: 'ineligible',
          title: 'A Conviction on Your Record Bars Sealing and Expunction',
          message: 'This is the hard truth about Florida, and we would rather tell you plainly than leave you to find out after paying application fees: Florida does not seal or expunge convictions, and any adjudication of guilt anywhere on your record — for any offense, ever — blocks the Certificate of Eligibility you would need. That is the law (§§ 943.0585/.059), not a discretionary call. But "not this route" is not the same as "no doors", so here are the real ones. Executive clemency from the Florida Board of Executive Clemency can restore rights and, in some cases, lead to relief. There are niche expunction tracks — lawful self-defense (§ 943.0578) and human-trafficking survivors — that are not blocked the same way. And if any single case on your record ended WITHOUT an adjudication, that case on its own may still qualify. County legal aid and the Florida Justice Center handle exactly these situations.',
          remedy: 'None under §§ 943.0585/.059 — clemency, niche tracks, or a non-adjudicated case may remain',
          citation: 'Fla. Stat. §§ 943.0585, 943.059'
        },
        ineligible_disqualified_fl: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Sealed, Even With Adjudication Withheld',
          message: 'Florida keeps a specific statutory list of offenses that cannot be sealed even when adjudication was withheld (§ 943.0584(2)), and yours falls in one of those categories. An important trap this closes: for this list, a "conviction" includes any guilty or no-contest plea or trial finding whether or not adjudication was withheld (§ 943.0584(1)) — so a withhold does not help here. Because these are specific legal categories, if you are not certain your offense is actually on the list it is worth confirming rather than assuming from what happened — county legal aid and the Florida Justice Center can check. If it is on the list, executive clemency from the Board of Executive Clemency is the remaining route.',
          remedy: 'None (Disqualified Offense under § 943.0584) — confirm the classification; ask about clemency',
          citation: 'Fla. Stat. § 943.0584'
        },
        ineligible_incomplete_fl: {
          status: 'ineligible',
          title: 'Finish the Sentence First',
          message: 'Sealing a withheld-adjudication case in Florida requires that you have completed all terms of your sentence, including probation and restitution. Based on what you told us, something is still outstanding, so you are not eligible to apply yet — but this is a "not yet", not a "no". Complete the remaining terms, and then come back: the offense itself qualifies. If an unpaid balance is the obstacle, ask the clerk about your exact payoff and whether a payment plan is available.',
          remedy: 'Complete the Sentence First, then apply for a Certificate of Eligibility',
          citation: 'Fla. Stat. § 943.059'
        },
        eligible_expunction_fl: {
          status: 'eligible',
          title: 'Case Ended Without a Conviction — Expunction Available',
          message: 'Because this case ended without a conviction — dismissed, dropped, or an acquittal — you appear eligible for an EXPUNCTION under Fla. Stat. § 943.0585, the stronger of Florida\'s two remedies. There is a specific order to it. First, apply to FDLE for a Certificate of Eligibility: a $75 application (non-refundable, by money order), a notarized form, your fingerprints, and a certified copy of the disposition. For an expunction, the State Attorney also completes a section certifying the outcome. FDLE\'s own estimate is about 12 weeks to process. Once you have the certificate, you file the petition in the county where the arrest happened; the clerk\'s filing fee varies by county. One caution to plan around: you get only ONE court-ordered seal or expunge in your lifetime, so if you have more than one clearable case, think about which to use it on. Florida also has MANDATORY automatic sealing of qualifying non-conviction arrests (§ 943.0595): FDLE seals them itself, with no lifetime limit ((2)(b)), so yours may already be done — check your FDLE record first. Two honest caveats, though: automatic sealing does NOT apply if the underlying charge was a forcible felony (§ 776.08) or a specified sex-offense-registry offense, even if the case was dismissed or you were acquitted ((2)(a)); and when FDLE seals its own copy, other agencies that received the record are not automatically required to seal theirs ((3)(c)), so a background check could still surface it until you follow up.',
          remedy: 'FDLE Certificate of Eligibility, then Expunction Petition (§ 943.0585)',
          citation: 'Fla. Stat. §§ 943.0585, 943.0595(1),(2)(a),(2)(b),(3)(c),(3)(d)'
        },
        eligible_sealing_fl: {
          status: 'eligible',
          title: 'Withheld Adjudication, Sentence Complete — Sealing Available',
          message: 'Because adjudication was withheld, your offense is not on the disqualified list, and you have completed your sentence, you appear eligible to SEAL this record under Fla. Stat. § 943.059. The process starts with FDLE, not the court: apply for a Certificate of Eligibility — a $75 application (non-refundable, by money order), a notarized form, fingerprints, and a certified disposition — and FDLE estimates about 12 weeks. With the certificate in hand, you file the petition in the county of arrest; the clerk\'s filing fee varies by county. Two things to hold onto: this is your one court-ordered relief for life, so use it where it counts most; and after a record has been sealed for 10 years, you may then petition to EXPUNGE it, which is stronger.',
          remedy: 'FDLE Certificate of Eligibility, then Sealing Petition (§ 943.059)',
          citation: 'Fla. Stat. § 943.059'
        },
        eligible_selfdefense_fl: {
          status: 'eligible',
          title: 'Lawful Self-Defense — a Separate Expunction That Overrides the Bars',
          message: 'This is a specific and powerful Florida route. If the state attorney or the court found that you acted in lawful self-defense under chapter 776 and either declined to file charges or dismissed them on that basis, you may qualify for a self-defense expunction under Fla. Stat. § 943.0578 — and, importantly, it applies "notwithstanding" the usual rules, so it is NOT blocked by a prior Florida relief or by a conviction elsewhere on your record (§ 943.0578(1)). It uses its own Certificate of Eligibility process (§ 943.0578(2)), with the same mechanics as a standard petition — a $75 application, fingerprints, and a notarized form (§ 943.0585(5)-(6), imported by § 943.0578(4)). Because it turns on the self-defense finding and is fact-specific, it is worth doing with help: the Florida Justice Center and county legal aid handle these.',
          remedy: 'Lawful self-defense expunction (§ 943.0578) — overrides the lifetime and conviction bars',
          citation: 'Fla. Stat. § 943.0578'
        },
        eligible_juvenile_fl: {
          status: 'eligible',
          title: 'Juvenile Diversion — a Separate Path That Does Not Use Your Adult Shot',
          message: 'Because you completed a JUVENILE diversion program, Florida has a separate expunction path under Fla. Stat. § 943.0582 — and here is the part that matters: using it does NOT burn your once-per-lifetime ADULT seal-or-expunge (§ 943.0582(4)). So this is its own door, not the one you would use for an adult case later. It runs through FDLE like the others. Because juvenile-record rules have their own details, the Florida Justice Center and county legal aid can confirm your eligibility and walk you through it.',
          remedy: 'Juvenile diversion expunction (§ 943.0582) — does not use your adult lifetime relief',
          citation: 'Fla. Stat. § 943.0582'
        }
      }
    },
    resources: {
      remedies: {
        petition: {
          name: 'Seal or Expunge (FDLE Certificate, then court petition)',
          formName: 'FDLE Application for Certificate of Eligibility, then the seal/expunge petition',
          formUrl: 'https://www.fdle.state.fl.us/SAC/Home.aspx',
          steps: [
            'Check first whether a non-conviction arrest was already sealed automatically (§ 943.0595) — request your FDLE criminal history.',
            'Apply to FDLE for a Certificate of Eligibility: $75 non-refundable money order, notarized application, fingerprints, and a certified copy of the disposition.',
            'For an expunction, have the State Attorney complete Section B certifying the outcome. FDLE estimates about 12 weeks to process.',
            'With the certificate, file the seal or expunge petition in the county of arrest. The clerk\'s filing fee varies by county.',
            'Remember: only ONE court-ordered seal or expunge is allowed per lifetime.'
          ],
          // The FDLE application fee IS known ($75, in the steps). The COUNTY
          // clerk filing fee is the null one — Wave 3 gives only a range.
          fees: null,
          // NOT null: fee-waiver practice is a separate question, but Wave 3
          // records no waiver claim to null out, and the FDLE $75 is stated as
          // non-refundable with no waiver. Leave feeWaiver as an honest unknown
          // tied to the same open question as the county fee.
          feeWaiver: null,
          courtContact: 'FDLE for the certificate; county clerk (county of arrest) for the petition'
        }
      },
      legalAid: [
        { name: 'Florida Justice Center', url: 'https://www.floridajusticecenter.org' },
        { name: 'Florida Courts self-help (find your county legal aid)', url: 'https://www.flcourts.gov/Resources-Services/Court-Improvement/Self-Help-Center' }
      ]
    }
  },

  // ==========================================================================
  // ILLINOIS — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave3_Draft_Package.md
  //
  // THE GENEROUS GIANT, with a two-week-old change. Clean Slate Act (signed
  // Jan 16, 2026; phasing in from June 30, 2026): misdemeanour sealing wait
  // dropped 3 -> 2 years, and a prior felony no longer AUTOMATICALLY bars a
  // later felony sealing petition. The automatic-sealing SYSTEM comes later, so
  // until then Illinois is petition-only — no "automatic" copy yet.
  //
  // Expungement (destroy) vs sealing (hide) are distinct: expungement for
  // non-convictions, supervision, and qualified probation; sealing for most
  // convictions. DUI is absolutely never sealable.
  //
  // GENUINE FIGHT (see research/REFEREE_QUEUE.md): how a prior felony now
  // interacts with a later felony petition under the new text is unresolved.
  // A felony-plus-another-felony routes to complex_new_law_il and is hedged.
  // ==========================================================================
  IL: {
    code: 'IL',
    name: 'Illinois',
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
    sourcePackage: 'research/waves/Turnleaf_Wave3_Draft_Package.md',
    terminology:
      'Illinois has two remedies. EXPUNGEMENT destroys the record and is for cases without a '
      + 'conviction — arrests that went nowhere, acquittals, dismissals, completed court '
      + 'supervision, and qualified probation. SEALING hides the record from most employers and is '
      + 'how most convictions are cleared. A fresh law matters here: the Clean Slate Act, signed in '
      + 'January 2026 and phasing in from June 30, 2026, cut the misdemeanor sealing wait from 3 '
      + 'years to 2 and repealed the rule that a prior felony blocked sealing a later one entirely '
      + '(it is now (c)(4) "Blank"). Automatic sealing begins January 1, 2029, so for now Illinois is '
      + 'petition-only — and petitioning now, at a 2-to-3-year wait, beats waiting for the automation. '
      + 'Unpaid court debt does not block sealing (except unconverted victim restitution). One hard '
      + 'line: a DUI can never be sealed.',
    keyDates: [
      {
        label: 'Clean Slate Act began phasing in (misdemeanour wait 3->2 yrs; prior-felony bar removed)',
        date: '2026-06-30',
        kind: 'effective',
        note: 'Signed Jan 16, 2026. Two weeks old as of the Wave 3 draft. The automatic-sealing system starts later — verify that date before any "automatic" UI copy.',
      },
      {
        label: 'Clean Slate Act signed',
        date: '2026-01-16',
        kind: 'effective',
        note: null,
      },
      {
        label: 'Governing amendment P.A. 104-459 effective (20 ILCS 2630/5.2)',
        date: '2026-06-01',
        kind: 'effective',
        note: 'The version Diana verified against ilga.gov (7/16): repeals the (c)(4) prior-felony bar, sets the (c)(3)(B) 2-yr / (c)(2)(F) 3-yr ladder, blanks the (d)(3) drug test, and adds the (k)/(l) automatic-sealing provisions.',
      },
      {
        label: 'Automatic sealing begins (20 ILCS 2630/5.2(k)) — ISP quarterly',
        date: '2029-01-01',
        kind: 'operative',
        note: 'ISP seals eligible conviction records quarterly, with its own exclusion list (Class X, Articles 9/11, crimes of violence, robbery, hijacking, residential/Class 1-2 burglary, trafficking, organized retail; felonies wait until ALL eligible felonies meet timing). Petitioning now beats waiting for this.',
      },
      {
        label: 'Automatic-sealing backlog phase-in deadline (subsection (k))',
        date: '2034',
        kind: 'deadline',
        note: 'Wave 7 / Diana statute pass: the automatic-sealing backlog is phased in through 2034 — another reason to petition now rather than wait.',
      },
      {
        label: 'Clerk auto-sealing of municipal-ordinance & Class C misdemeanor records begins (subsection (l))',
        date: '2028-01-01',
        kind: 'operative',
        note: 'Circuit clerks auto-seal municipal-ordinance-violation and Class C misdemeanor records one year after the case closes.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the education-waiver provision: does earning a diploma or degree during the sealing wait accelerate eligibility? Wave 3 says it is real and great UX but flags it for verification. Disclosed in prose on the sealing results, not encoded as a branch (it is a discretionary accelerator).',
        blocksFields: [],
      },
      {
        question:
          'What is the county filing fee, and specifically the Cook County rule that one fee covers all petitions filed the same day? Wave 3 flags it. A fee waiver is available.',
        blocksFields: ['resources.remedies.petition.fees'],
      },
    ],
    sources: [
      { id: '20 ILCS 2630/5.2 — expungement and sealing (GOVERNING TEXT: after amendment by P.A. 104-459, eff. 6-1-26). (c)(4) Blank (prior-felony bar + unseal-on-new-conviction repealed); (c)(3)(B) 2-yr / (c)(2)(F) 3-yr sealing ladder; (d)(3) Blank (drug test repealed); (d)(6)(C) + (a)(1)(M) LFO rule; (k) automatic sealing (Jan 1 2029); (l) clerk auto-seal (Jan 1 2028); (b)(2)(A-5) 61-day-early diversion filing; (b)(2)(B)(i)/(i-5) 5-year supervision list (Vehicle Code 3-707/3-708/3-710/5-401.3, Criminal Code 11-1.50/12-3.2/12-15, under-25 11-503) vs (ii) 2-year default', url: 'https://ilga.gov/documents/legislation/ilcs/documents/002026300K5.2.htm', retrievedOn: '2026-07-16' },
      { id: 'Illinois Clean Slate Act / P.A. 104-459 (amends 20 ILCS 2630/5.2; signed Jan 16, 2026; amendment eff. 6-1-26)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'sealable_il' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_expungement_il' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_expungement_il' },
            { label: 'Court supervision / Qualified probation (Completed)', value: 'deferred', next: 'supervision_type_il' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        sealable_il: {
          type: 'boolean',
          text: 'Was the offense any of these: a DUI, reckless driving, domestic battery, a violation of an order of protection, a sex offense or registry offense, or an animal-cruelty offense?',
          yes: 'ineligible_excluded_il',
          no: 'seal_level_il'
        },
        seal_level_il: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'seal_misd_date_il' },
            { label: 'Felony', value: 'felony', next: 'felony_prob_il' },
            { label: 'Infraction', value: 'infraction', next: 'seal_misd_date_il' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_level_il' }
          ]
        },
        seal_misd_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'from completion of the LAST sentence, conviction-free (20 ILCS 2630/5.2 (c)(3)(B) as amended by P.A. 104-459 — misdemeanor sealing; 3 yrs cut to 2)' },
            nextPass: 'eligible_sealing_il',
            nextFail: 'waiting_sealing_il'
          }
        },
        // P.A. 104-459 blanked (c)(4): a prior felony no longer bars sealing a
        // later one. What matters now is HOW the sentence was served — a felony
        // completed on probation/conditional discharge seals at 2 yrs ((c)(2)(D)),
        // one that included incarceration at 3 ((c)(2)(F)).
        felony_prob_il: {
          type: 'boolean',
          text: 'Was this felony sentence completed on probation or conditional discharge WITHOUT revocation — as opposed to a sentence that included incarceration?',
          yes: 'seal_felony_prob_date_il',
          no: 'seal_felony_date_il'
        },
        seal_felony_prob_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'from completion of the LAST sentence, conviction-free (20 ILCS 2630/5.2 (c)(3)(B), (c)(2)(D) as amended by P.A. 104-459 — felony completed on probation/conditional discharge without revocation)' },
            nextPass: 'eligible_sealing_il',
            nextFail: 'waiting_sealing_il'
          }
        },
        seal_felony_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'from completion of the LAST sentence, conviction-free (20 ILCS 2630/5.2 (c)(2)(F) as amended by P.A. 104-459 — felony sentence including incarceration)' },
            nextPass: 'eligible_sealing_il',
            nextFail: 'waiting_sealing_il'
          }
        },
        supervision_type_il: {
          type: 'boolean',
          text: 'Was it QUALIFIED probation — a program like 410 (drug), TASC, or a similar deferred sentence — as opposed to ordinary court supervision?',
          yes: 'qualified_prob_date_il',
          no: 'supervision_5yr_list_il'
        },
        // (b)(2)(B)(i)/(i-5): a specific list of supervisions carries a 5-year wait;
        // (ii): all other supervisions clear at 2. (Diana, statute pass 7/16.)
        supervision_5yr_list_il: {
          type: 'boolean',
          text: 'Was the court supervision for one of these specific offenses, which carry a longer 5-year wait: certain insurance- or registration-related traffic offenses (625 ILCS 5/3-707, 3-708, 3-710, or 5-401.3), domestic battery (720 ILCS 5/12-3.2), or criminal sexual abuse (720 ILCS 5/11-1.50 or 12-15) — or, if you were under 25, reckless driving (625 ILCS 5/11-503)?',
          yes: 'supervision_5yr_date_il',
          no: 'supervision_date_il'
        },
        supervision_5yr_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the court supervision?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of court supervision for a listed offense (20 ILCS 2630/5.2(b)(2)(B)(i)/(i-5) as amended by P.A. 104-459 — Vehicle Code 3-707/3-708/3-710/5-401.3, Criminal Code 11-1.50/12-3.2/12-15, or under-25 reckless driving 11-503)' },
            nextPass: 'eligible_expungement_il',
            nextFail: 'waiting_expungement_il'
          }
        },
        supervision_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the court supervision?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'completion of court supervision (20 ILCS 2630/5.2(b)(2)(B)(ii) as amended by P.A. 104-459 — all supervisions except the listed 5-year offenses)' },
            nextPass: 'eligible_expungement_il',
            nextFail: 'waiting_expungement_il'
          }
        },
        qualified_prob_date_il: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the probation program?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of qualified probation (20 ILCS 2630/5.2 — 410/TASC etc.)' },
            nextPass: 'eligible_expungement_il',
            nextFail: 'waiting_expungement_il'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Illinois treats cases very differently by outcome: a non-conviction can be expunged (destroyed), a completed supervision can be expunged after a wait, and most convictions can be sealed (hidden). Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Illinois Legal Aid Online Easy Form can help you check, and Cabrini Green Legal Aid runs clinics. Cook County has an Adult Expungement Advice Desk at the Daley Center.',
          remedy: 'Get Your Record First (Illinois Legal Aid Online)',
          citation: '20 ILCS 2630/5.2 (which path applies depends on the disposition)'
        },
        ineligible_excluded_il: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Sealed',
          message: 'Illinois excludes a specific set of offenses from sealing: DUI (absolutely, no exceptions), reckless driving (unless you were under 25), domestic battery, violations of an order of protection, sex and registry offenses, and animal-cruelty offenses. No waiting period changes that. If you are not certain your offense falls in one of these categories, it is worth confirming — the Illinois Legal Aid Online Easy Form walks through it, and Cabrini Green Legal Aid can check. For a DUI specifically, there is no sealing route in Illinois, so be cautious of any service that suggests otherwise.',
          remedy: 'None (Statutorily Excluded from Sealing)',
          citation: '20 ILCS 2630/5.2'
        },
        eligible_expungement_il: {
          status: 'eligible',
          title: 'Non-Conviction — Eligible for Expungement',
          message: 'Because this case did not end in a conviction, you are eligible for EXPUNGEMENT — the stronger remedy, which destroys the record rather than just hiding it. Arrests without conviction, acquittals, and dismissals can generally be expunged right away. File in the circuit court of the county of the case; the Illinois Legal Aid Online Easy Form generates the petition for you, and e-filing is available statewide. The county filing fee varies (in Cook County, one fee covers all petitions filed the same day), and a fee waiver is available if you cannot afford it. There is a roughly 60-day window for the State\'s Attorney or State Police to object. One diversion-specific timing rule worth knowing: if you are in a problem-solving court or a diversion program, you can file the expungement petition up to 61 days BEFORE your anticipated dismissal (20 ILCS 2630/5.2(b)(2)(A-5)), so the relief is ready when the case closes.',
          remedy: 'Petition for Expungement (20 ILCS 2630/5.2)',
          citation: '20 ILCS 2630/5.2'
        },
        eligible_sealing_il: {
          status: 'eligible',
          title: 'Potentially Eligible to Seal',
          message: 'Based on your dates, you appear eligible to petition to SEAL this conviction under 20 ILCS 2630/5.2. The waits are 2 years for a misdemeanor and for a felony completed on probation or conditional discharge, and 3 years for a felony sentence that included incarceration. A prior felony no longer blocks you — that bar was repealed — though if the State objects, the court may weigh your criminal history in deciding. One timing note: the clock runs from your MOST RECENT sentence, so a newer conviction restarts the wait for everything. Two reassurances: unpaid court debt cannot be used to deny sealing (except unconverted victim restitution), and your sentence counts as complete even if you still owe fines or fees. And do not wait for automation: Illinois begins automatic sealing on January 1, 2029 (phased through 2034), but petitioning now at a 2-to-3-year wait clears your record years sooner. File in the circuit court of the county of the case — the Illinois Legal Aid Online Easy Form builds the petition and e-filing is statewide; the county fee varies (Cook County: one fee for all same-day petitions) and a waiver is available. (For the lowest-level records — a municipal-ordinance violation or Class C misdemeanor — circuit clerks begin auto-sealing one year after the case closes as of January 1, 2028.) Ask legal aid whether the education accelerator applies if you are working toward a diploma or degree.',
          remedy: 'Petition to Seal now (20 ILCS 2630/5.2) — do not wait for 2029 automation',
          citation: '20 ILCS 2630/5.2'
        },
        waiting_sealing_il: {
          status: 'waiting',
          title: 'Sealing Waiting Period Not Yet Met',
          message: 'Illinois sealing comes after a wait from when you completed your MOST RECENT sentence: 2 years for a misdemeanor or a felony completed on probation/conditional discharge, and 3 years for a felony sentence that included incarceration. Based on your dates, yours has not run yet — and note a newer conviction would restart the clock. A reassurance for the meantime: unpaid court debt does not delay or block sealing (except unconverted victim restitution), and your sentence counts as complete even with fines or fees outstanding. One thing that can move your date: earning a diploma or degree during the wait may accelerate eligibility — ask legal aid whether it applies to you.',
          remedy: 'Wait for the sealing period, or ask about the education accelerator',
          citation: '20 ILCS 2630/5.2'
        },
        waiting_expungement_il: {
          status: 'waiting',
          title: 'Expungement Waiting Period Not Yet Met',
          message: 'For a completed court supervision, Illinois expungement generally comes 2 years after you finish — though a specific list of offenses carries a longer 5-year wait (certain insurance/registration traffic offenses, domestic battery, criminal sexual abuse, and, if you were under 25, reckless driving), and qualified probation like 410 or TASC is 5 years. Based on your dates, yours has not run yet. Once it does, the record can be expunged — destroyed, not just hidden.',
          remedy: 'Wait for the expungement period',
          citation: '20 ILCS 2630/5.2'
        },
        complex_level_il: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Illinois the sealing wait depends on the level: 2 years for a misdemeanor, 3 for a Class 1-4 felony. Since you are not sure which yours was, we are not going to guess. Your court paperwork states it, and the Illinois Legal Aid Online Easy Form will walk you through it. Cabrini Green Legal Aid also runs clinics.',
          remedy: 'Get Your Offense Level First (court paperwork / Illinois Legal Aid Online)',
          citation: '20 ILCS 2630/5.2'
        }
      }
    },
    resources: {
      remedies: {
        petition: {
          name: 'Expungement or Sealing Petition (20 ILCS 2630/5.2)',
          formName: 'Illinois Legal Aid Online Easy Form (Expungement / Sealing)',
          formUrl: 'https://www.illinoislegalaid.org',
          steps: [
            'Use the Illinois Legal Aid Online Easy Form to build your petition — it is genuinely good and covers both expungement and sealing.',
            'File in the circuit court of the county of the case (in Cook County: any district, or the Expungement Department at the Leighton Courthouse). E-filing is available statewide.',
            'The county filing fee varies; in Cook County one fee covers all petitions filed the same day. A fee waiver is available if you cannot afford it.',
            'The State\'s Attorney and State Police have roughly 60 days to object.'
          ],
          // null: Wave 3 flags the county fee and the Cook same-day rule.
          fees: null,
          // NOT null: the waiver is a named, independent mechanism.
          feeWaiver: 'A fee waiver is available if you cannot afford the filing fee.',
          courtContact: 'Circuit court of the county of the case'
        }
      },
      legalAid: [
        { name: 'Illinois Legal Aid Online (Easy Form)', url: 'https://www.illinoislegalaid.org' },
        { name: 'Cabrini Green Legal Aid', url: 'https://www.cgla.net' },
        { name: 'New Leaf Illinois (cannabis records, free representation)', url: 'https://www.newleafillinois.org' }
      ]
    }
  },

  // ==========================================================================
  // OHIO — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave3_Draft_Package.md
  //
  // Since SB 288 (Apr 4, 2023), SEALING (hide) and EXPUNGEMENT (destroy) are
  // DISTINCT remedies with different waits. Most people want sealing;
  // expungement is the longer-wait upgrade. This tree does sealing; expungement
  // timing is disclosed in the results as the later option.
  //
  // The package resolves the one apparent conflict for us: a secondary source
  // claims an HB 1 "up to 5 felonies / 3 F4+" cap, but the Ohio Supreme Court's
  // June 2026 bench card and CCRC describe offence-specific rules with F3 COUNT
  // LIMITS. Encode from the bench card, NOT the secondary. So: F1/F2 never; F3
  // blocked if the person has more than one other felony; OVI and all traffic
  // never; offences of violence, registry sex offences, victim-under-13, DV
  // (narrow M4 DV sealing) all excluded.
  //
  // CQE (Certificate of Qualification for Employment) is the fallback door for
  // the ineligible — named in the "no" results, per the restrictive-state rule.
  // ==========================================================================
  OH: {
    code: 'OH',
    name: 'Ohio',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave3_Draft_Package.md',
    terminology:
      'Since SB 288 took effect in April 2023, Ohio has two separate remedies. SEALING hides the '
      + 'record from most background checks; EXPUNGEMENT destroys it. They are no longer the same '
      + 'thing, and they have different waiting periods — most people want sealing, and expungement '
      + 'is a longer-wait upgrade you can pursue later. Both run from your FINAL DISCHARGE, which '
      + 'means sentence, probation or parole, fines and restitution all complete (unpaid court costs '
      + 'do not count against you). A few offences are never eligible: OVI and all traffic offences, '
      + 'first- and second-degree felonies, and offences of violence among them.',
    keyDates: [
      {
        label: 'SB 288 — sealing and expungement became distinct remedies',
        date: '2023-04-04',
        kind: 'effective',
        note: 'Also removed the old "eligible offender" numerical cap in favour of per-conviction analysis.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the F3 count-limit rules against the Ohio Supreme Court June 2026 Adult Rights Restoration bench card and R.C. 2953.32: an F3 is blocked where the person has more than one other felony (and the related 2-F3-plus-2-misdemeanour pattern). Wave 3 flags a secondary source claiming an HB 1 "5 felonies / 3 F4+" cap and instructs encoding from the bench card instead — which the tree does. Confirm the bench-card rules directly.',
        blocksFields: [],
      },
      {
        question:
          'What is the court filing fee? Wave 3 gives "commonly $50" but flags it as set by individual court schedules. Confirm with a clerk of courts (Hamilton or Franklin). One application can cover multiple cases in the same court.',
        blocksFields: ['resources.remedies.sealing.fees', 'resources.remedies.sealing.feeWaiver'],
      },
      {
        question:
          'Confirm the full exclusion list from the bench card: F1/F2, OVI and all traffic, offences of violence, registry sex offences, offences with a victim under 13, DV convictions (with the narrow M4 DV sealing allowance), and protection-order violations.',
        blocksFields: [],
      },
      {
        question:
          'How are completed diversions and intervention-in-lieu treated? Standing call-sheet question. Wave 3 mentions prosecutor-initiated sealing for low-level drug offences (2953.39) and human-trafficking expungement anytime, but not general diversion timing.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Ohio R.C. 2953.32 (sealing of conviction records)', url: null, retrievedOn: null },
      { id: 'Ohio R.C. 2953.31 (definitions)', url: null, retrievedOn: null },
      { id: 'Ohio R.C. 2953.33 (dismissals/acquittals/no-bills — immediate sealing)', url: null, retrievedOn: null },
      { id: 'Ohio R.C. 2953.34 (expungement)', url: null, retrievedOn: null },
      { id: 'Ohio R.C. 2953.39 (prosecutor-initiated sealing, low-level drug offences)', url: null, retrievedOn: null },
      { id: 'Ohio Supreme Court Adult Rights Restoration bench card (June 2026 rev — primary for eligibility)', url: null, retrievedOn: null },
      { id: 'SB 288 (2023 — sealing/expungement split; per-conviction analysis)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_oh' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_oh' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_oh' },
            { label: 'Diversion / Intervention in lieu (Completed)', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_oh: {
          type: 'boolean',
          text: 'Was the offense any of these: an OVI or any traffic offense, an offense of violence, a sex offense requiring registration, an offense with a victim under 13, or a domestic violence offense?',
          yes: 'excluded_path_oh',
          no: 'level_oh'
        },
        excluded_path_oh: {
          type: 'boolean',
          text: 'Was it specifically an OVI or a traffic offense?',
          yes: 'ineligible_traffic_oh',
          no: 'ineligible_excluded_oh'
        },
        level_oh: {
          type: 'choice',
          text: 'What was the level of the offense? (Your paperwork says. Ohio\'s sealing wait and eligibility both turn on it.)',
          options: [
            { label: 'Minor misdemeanor', value: 'minor_misd', next: 'minor_misd_date_oh' },
            { label: 'Misdemeanor', value: 'misd', next: 'misd_date_oh' },
            { label: 'Felony of the 4th or 5th degree (F4/F5)', value: 'f45', next: 'f45_date_oh' },
            { label: 'Felony of the 3rd degree (F3)', value: 'f3', next: 'f3_count_oh' },
            { label: 'Felony of the 1st or 2nd degree (F1/F2)', value: 'f12', next: 'ineligible_f12_oh' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_oh' }
          ]
        },
        minor_misd_date_oh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your final discharge — sentence, probation, fines and restitution all complete?',
          validation: {
            period: { amount: 6, unit: 'months', anchor: 'final discharge (R.C. 2953.32 — minor misdemeanour)' },
            nextPass: 'eligible_sealing_oh',
            nextFail: 'waiting_oh'
          }
        },
        misd_date_oh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your final discharge — sentence, probation, fines and restitution all complete?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'final discharge (R.C. 2953.32 — misdemeanours)' },
            nextPass: 'eligible_sealing_oh',
            nextFail: 'waiting_oh'
          }
        },
        f45_date_oh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your final discharge — sentence, probation, fines and restitution all complete?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'final discharge (R.C. 2953.32 — F4/F5)' },
            nextPass: 'eligible_sealing_oh',
            nextFail: 'waiting_oh'
          }
        },
        // The F3 count limit — the bench-card rule, asked.
        f3_count_oh: {
          type: 'choice',
          text: 'For a third-degree felony, Ohio limits sealing by your record. Counting your whole history, how many OTHER felony convictions do you have (not this one)?',
          options: [
            { label: 'None, or one other felony', value: 'ok', next: 'f3_date_oh' },
            { label: 'More than one other felony', value: 'blocked', next: 'ineligible_f3_count_oh' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_f3_oh' }
          ]
        },
        f3_date_oh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your final discharge — sentence, probation, fines and restitution all complete?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'final discharge (R.C. 2953.32 — F3 where eligible)' },
            nextPass: 'eligible_sealing_oh',
            nextFail: 'waiting_oh'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Ohio treats cases very differently by outcome: a dismissal or acquittal seals immediately with no limits, while a conviction runs through waiting periods that depend on the offense level. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. Ohio Legal Help can point you to your record, and the Ohio Justice & Policy Center\'s plain-language guide is excellent.',
          remedy: 'Get Your Record First (Ohio Legal Help)',
          citation: 'Ohio R.C. 2953.32, 2953.33 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'Ohio\'s sealing rules are screened here for convictions, dismissals, and acquittals. How a completed diversion or intervention-in-lieu is treated for sealing is not something this screening has researched in detail, and we would rather tell you that than guess. Ohio Legal Help and the Ohio Justice & Policy Center can confirm how your disposition is treated — and for low-level drug offenses, Ohio has a prosecutor-initiated sealing route worth asking about (R.C. 2953.39).',
          remedy: 'Consult Legal Aid (Diversion Not Yet Screened)',
          citation: 'Ohio R.C. 2953.32, 2953.39 (treatment of diversions not yet detailed)'
        },
        eligible_nonconviction_oh: {
          status: 'eligible',
          title: 'No Conviction — Seal It Now, No Waiting Period',
          message: 'Because your case ended without a conviction — dismissed, acquitted, or no-billed — Ohio lets you seal it immediately, with no waiting period and no numerical limits (R.C. 2953.33). File with the court that handled the case. This is the most straightforward category Ohio has.',
          remedy: 'Seal a Non-Conviction (R.C. 2953.33) — immediate',
          citation: 'Ohio R.C. 2953.33'
        },
        eligible_sealing_oh: {
          status: 'eligible',
          title: 'Potentially Eligible to Seal',
          message: 'Based on your dates, you appear eligible to petition to SEAL this conviction under R.C. 2953.32. Apply to the sentencing court — common pleas for a felony, municipal court for a misdemeanor — and note that one application can cover multiple cases in the same court. The prosecutor gets 60 days to object, and a hearing is usually set 45 to 90 days after filing; the judge weighs your interest against the government\'s need to keep the record, so this is a decision rather than a formality. The filing fee is set by the local court and is something we are still confirming. One thing to keep in mind for later: sealing hides the record, and after a longer wait you can pursue EXPUNGEMENT, which destroys it — for a felony that is generally 10 years after it became sealing-eligible.',
          remedy: 'Petition to Seal (R.C. 2953.32)',
          citation: 'Ohio R.C. 2953.32'
        },
        waiting_oh: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Ohio\'s sealing waits run from your FINAL DISCHARGE — sentence, probation or parole, fines and restitution all complete (unpaid court costs do not count against you). They are 6 months for a minor misdemeanor, 1 year for a misdemeanor or an F4/F5, and 3 years for an eligible F3. Based on your dates, yours has not run yet. Getting any outstanding fines or restitution paid can matter here, because final discharge is what starts the clock.',
          remedy: 'Wait for the period from final discharge',
          citation: 'Ohio R.C. 2953.32'
        },
        ineligible_traffic_oh: {
          status: 'ineligible',
          title: 'OVI and Traffic Offenses Cannot Be Sealed',
          message: 'Ohio does not allow sealing or expungement of OVI or any traffic offense — this is absolute, and no waiting period changes it. Be cautious of any service that suggests an OVI can be cleared in Ohio. If your record also has non-traffic offenses, those may well be sealable — run this again for them. And for employment specifically, Ohio offers a Certificate of Qualification for Employment (CQE), which does not seal the record but lifts many automatic license and hiring bars; the Ohio Justice & Policy Center can explain whether it fits.',
          remedy: 'None (OVI/Traffic) — ask about a Certificate of Qualification for Employment',
          citation: 'Ohio R.C. 2953.32'
        },
        ineligible_excluded_oh: {
          status: 'ineligible',
          title: 'This Offense Is Excluded From Sealing',
          message: 'Offenses of violence, sex offenses requiring registration, offenses with a victim under 13, and (with a narrow exception for fourth-degree misdemeanor domestic violence) domestic violence offenses are excluded from sealing in Ohio. No waiting period changes that. Because these are specific legal categories, if you are not certain your offense is actually excluded it is worth confirming — the Ohio Justice & Policy Center\'s guide is built for this. If sealing is truly off the table, a Certificate of Qualification for Employment (CQE) can still lift many hiring and licensing bars without sealing the record, and human-trafficking-related offenses have their own expungement route available anytime.',
          remedy: 'None (Excluded Offense) — ask about a CQE',
          citation: 'Ohio R.C. 2953.32'
        },
        ineligible_f12_oh: {
          status: 'ineligible',
          title: 'First- and Second-Degree Felonies Cannot Be Sealed',
          message: 'Ohio does not permit sealing of first- or second-degree felonies. This is a categorical bar, not a matter of time. The route that remains is a Certificate of Qualification for Employment (CQE), which does not clear the record but removes many of the automatic barriers a felony creates for jobs and licenses — and it is available for offenses that cannot be sealed. The Ohio Justice & Policy Center can tell you whether a CQE, or executive clemency, is worth pursuing in your situation.',
          remedy: 'None (F1/F2) — pursue a CQE or clemency',
          citation: 'Ohio R.C. 2953.32'
        },
        ineligible_f3_count_oh: {
          status: 'ineligible',
          title: 'Your Felony Record Blocks Sealing This F3',
          message: 'A third-degree felony can be sealed in Ohio, but not when the person has more than one other felony conviction on their record. Based on what you told us, that limit is reached. This is one worth having someone check carefully, because the counting rules are specific and Ohio changed them in 2023 — the Ohio Justice & Policy Center and Ohio Legal Help can look at your actual record against the current bench card. If sealing stays out of reach, a Certificate of Qualification for Employment (CQE) can still lift many hiring and licensing barriers.',
          remedy: 'Consult Legal Aid (F3 Count Limit) — or pursue a CQE',
          citation: 'Ohio R.C. 2953.32'
        },
        complex_level_oh: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Ohio the sealing wait and whether it is possible at all both depend on the level: 6 months for a minor misdemeanor, 1 year for a misdemeanor or F4/F5, 3 years for an eligible F3, and never for F1/F2. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and the Ohio Justice & Policy Center\'s guide walks through the levels.',
          remedy: 'Get Your Offense Level First (court paperwork / OJPC guide)',
          citation: 'Ohio R.C. 2953.32'
        },
        complex_f3_oh: {
          status: 'complex',
          title: 'We Need Your Felony Count',
          message: 'A third-degree felony can be sealed unless you have more than one other felony conviction. Since you are not sure of your felony count, we are not going to guess — it is the difference between eligible and not. The Ohio Justice & Policy Center and Ohio Legal Help can pull your record and count it against the current 2026 bench card, which is the authoritative source for this.',
          remedy: 'Get Your Felony Count First (OJPC / Ohio Legal Help)',
          citation: 'Ohio R.C. 2953.32'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'Application to Seal a Conviction (R.C. 2953.32)',
          formName: 'Application for Sealing / Expungement',
          formUrl: 'https://www.ohiolegalhelp.org/topic/sealing-expungement',
          steps: [
            'Confirm your offense is eligible and you are past the wait from final discharge — the Ohio Justice & Policy Center guide walks through it.',
            'Apply to the sentencing court: common pleas for a felony, municipal court for a misdemeanor. One application can cover multiple cases in the same court.',
            'The prosecutor has 60 days to object; a hearing is typically 45 to 90 days after filing.',
            'The judge weighs your interest against the government\'s need to keep the record.'
          ],
          // null: Wave 3 gives "commonly $50" but set by court schedules.
          fees: null,
          feeWaiver: null,
          courtContact: 'The sentencing court (common pleas for felonies, municipal for misdemeanours)'
        }
      },
      legalAid: [
        { name: 'Ohio Justice & Policy Center (plain-language guide)', url: 'https://www.ohiojpc.org' },
        { name: 'Ohio Legal Help', url: 'https://www.ohiolegalhelp.org' }
      ]
    }
  },

  // ==========================================================================
  // GEORGIA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave3_Draft_Package.md
  //
  // THE VOCABULARY IS THE PRODUCT. Georgia does not "expunge". The remedy is
  // RECORD RESTRICTION (hiding the GCIC history from non-criminal-justice
  // access) plus court-record SEALING. Using Georgia's words is credibility.
  //
  // Restrictive, with a hard cap: only 2 misdemeanour convictions can be
  // restricted+sealed in a LIFETIME (SB 288 "Second Chance", eff. Jan 1, 2021),
  // 4 years after sentence completion. Felonies go through a PARDON from the
  // State Board of Pardons and Paroles FIRST, then a petition — encoded as a
  // path, not "ineligible".
  //
  // Non-convictions on/after July 1, 2013 restrict AUTOMATICALLY (with
  // documented reporting gaps — "should be automatic; verify your GCIC report").
  // Pre-2013 arrests apply to the arresting agency.
  // ==========================================================================
  GA: {
    code: 'GA',
    name: 'Georgia',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave3_Draft_Package.md',
    terminology:
      'Georgia does not use the word "expunge". Its remedy is RECORD RESTRICTION — hiding your '
      + 'criminal history at GCIC from most employers and the public, though criminal-justice '
      + 'agencies still see it — usually paired with SEALING the court file. The rules are '
      + 'restrictive. A non-conviction arrest from July 1, 2013 onward is supposed to be restricted '
      + 'automatically. Misdemeanor CONVICTIONS can be restricted and sealed only through a petition, '
      + 'capped at two in your lifetime, four years after you finish the sentence. Felonies require a '
      + 'PARDON from the State Board of Pardons and Paroles first, and then a petition — so a felony '
      + 'is a longer road, but not a closed one.',
    keyDates: [
      {
        label: 'SB 288 "Second Chance Act" — misdemeanour conviction restriction',
        date: '2021-01-01',
        kind: 'effective',
        note: 'Allows petitioning to restrict and seal up to 2 misdemeanour convictions in a lifetime.',
      },
      {
        label: 'Automatic restriction of non-conviction arrests began',
        date: '2013-07-01',
        kind: 'effective',
        note: 'Arrests on/after this date that end without conviction are restricted automatically by GCIC — with documented reporting gaps, so verification of the GCIC report is advised. Pre-2013 arrests require applying to the arresting agency.',
      },
    ],
    openQuestions: [
      {
        question:
          'How complete is the automatic restriction of post-2013 non-conviction arrests in practice? Wave 3 flags documented reporting gaps — the UI says "should be automatic; verify your GCIC report". Confirm with GBI/GCIC how a person checks and corrects a missed restriction.',
        blocksFields: [],
      },
      {
        question:
          'What does it cost to restrict a pre-2013 arrest through the arresting agency, and what are the county court costs for a conviction restriction petition? Wave 3 flags both as varying by agency/county with no statewide fee. Phone targets.',
        blocksFields: ['resources.remedies.restriction.fees', 'resources.remedies.restriction.feeWaiver'],
      },
      {
        question:
          'Confirm the § 35-3-37(j)(4)(A) exclusion list for misdemeanour conviction restriction: DUI, family-violence battery (unless under 21 at arrest), sex offences, crimes against minors, and serious traffic offences. The tree asks a person whether their offence is on this list.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the First Offender Act and retroactive First Offender mechanics: deferred adjudication once, judge-approved, and the ability to apply retroactively for old cases. Wave 3 names these as additional felony-adjacent routes but the tree does not yet branch on them — disclosed in the felony result.',
        blocksFields: [],
      },
      {
        question:
          'How are completed diversions treated, and how does the Survivors First Act track (trafficking survivors — vacate or restrict+seal) work? Standing call-sheet question plus a named niche track.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'O.C.G.A. § 35-3-37 (record restriction and sealing)', url: null, retrievedOn: null },
      { id: 'O.C.G.A. § 35-3-37(j)(4)(A) (exclusion list for misdemeanour conviction restriction)', url: null, retrievedOn: null },
      { id: 'SB 288 "Second Chance Act" (2021 — misdemeanour conviction restriction)', url: null, retrievedOn: null },
      { id: 'Georgia First Offender Act (deferred adjudication; retroactive First Offender)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'conviction_level_ga' },
            { label: 'Dismissed / Charges dropped / Not prosecuted', value: 'dismissed', next: 'arrest_era_ga' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'arrest_era_ga' },
            { label: 'First Offender / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // Non-convictions: pre/post 2013 fork.
        arrest_era_ga: {
          type: 'boolean',
          text: 'Was the arrest on or after July 1, 2013?',
          yes: 'eligible_auto_restrict_ga',
          no: 'eligible_pre2013_ga'
        },
        conviction_level_ga: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'misd_excluded_ga' },
            { label: 'Felony', value: 'felony', next: 'pardon_path_ga' },
            { label: 'Infraction', value: 'infraction', next: 'misd_excluded_ga' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ga' }
          ]
        },
        misd_excluded_ga: {
          type: 'boolean',
          text: 'Was the offense any of these: a DUI, family-violence battery, a sex offense, a crime against a minor, or a serious traffic offense?',
          yes: 'ineligible_excluded_ga',
          no: 'misd_date_ga'
        },
        misd_date_ga: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the sentence? (The 4-year clock also requires no new convictions since, and no pending charges now.)',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'sentence completion (O.C.G.A. § 35-3-37 — misdemeanour conviction restriction; no new convictions in the window)' },
            nextPass: 'eligible_misd_restrict_ga',
            nextFail: 'waiting_ga'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Georgia\'s record restriction rules split on how the case ended: a non-conviction is often restricted automatically, a misdemeanor conviction can be petitioned after 4 years, and a felony needs a pardon first. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Georgia Justice Project (gjp.org) — who wrote the law and run statewide clinics — are the best people to help you read your record.',
          remedy: 'Get Your Record First (Georgia Justice Project)',
          citation: 'O.C.G.A. § 35-3-37 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'First Offender and Diversion Cases Need a Person',
          message: 'Georgia has strong routes for cases that were not straight convictions — the First Offender Act (deferred adjudication, once, judge-approved) and even retroactive First Offender treatment for old cases — but exactly how yours is treated for restriction depends on the details, and we would rather point you to someone than guess. The Georgia Justice Project runs statewide clinics and wrote much of this law; they are the right call.',
          remedy: 'Consult Legal Aid (First Offender / Diversion Not Yet Screened)',
          citation: 'O.C.G.A. § 35-3-37; Georgia First Offender Act (treatment not yet detailed)'
        },
        eligible_auto_restrict_ga: {
          status: 'eligible',
          title: 'Non-Conviction — Should Be Restricted Automatically (Check It)',
          message: 'Because this arrest was on or after July 1, 2013 and ended without a conviction, Georgia is supposed to have restricted it AUTOMATICALLY at GCIC — no petition needed. The honest caveat: there are documented gaps in the automatic reporting, so "should be" is not "definitely is". Request your GCIC criminal history report and confirm the restriction actually shows. If it does not, the Georgia Justice Project can help you get it corrected. You may also separately want the court file SEALED, which is a distinct step from the GCIC restriction.',
          remedy: 'Automatic Restriction (check your GCIC report) — GJP can fix a missed one',
          citation: 'O.C.G.A. § 35-3-37'
        },
        eligible_pre2013_ga: {
          status: 'eligible',
          title: 'Pre-2013 Non-Conviction — Apply to the Arresting Agency',
          message: 'Because this arrest was before July 1, 2013, it is not covered by Georgia\'s automatic restriction — but it can still be restricted. For pre-2013 arrests, you apply directly to the arresting agency rather than going through the automatic GCIC process. The fee varies by agency. The Georgia Justice Project can walk you through which agency and how, and can also help with sealing the court file.',
          remedy: 'Apply to the Arresting Agency (pre-2013 restriction)',
          citation: 'O.C.G.A. § 35-3-37'
        },
        eligible_misd_restrict_ga: {
          status: 'eligible',
          title: 'Misdemeanor Conviction — Eligible to Restrict and Seal',
          message: 'Based on your dates — 4 years since you completed the sentence, no new convictions since, and none pending — you appear eligible to petition to RESTRICT and SEAL this misdemeanor conviction under Georgia\'s Second Chance Act. Petition the court where you were convicted and serve the prosecutor; a hearing is possible, and GCIC applies the restriction within weeks of the order. One important limit to plan around: Georgia allows only TWO misdemeanor convictions to be restricted in a lifetime, so if you have more than one you might clear, think about which to use these on. There is no statewide fee, but county court costs vary. The Georgia Justice Project runs free clinics for exactly this.',
          remedy: 'Petition to Restrict and Seal (O.C.G.A. § 35-3-37) — 2 per lifetime',
          citation: 'O.C.G.A. § 35-3-37'
        },
        pardon_path_ga: {
          status: 'complex',
          title: 'For a Felony, the Path Runs Through a Pardon',
          message: 'Georgia does not let you restrict a felony conviction directly — but this is a road, not a wall. The route is to obtain a PARDON from the State Board of Pardons and Paroles first (available for most felonies, though not serious violent or sex felonies), and then petition to restrict and seal. It is more steps than a misdemeanor, but people do complete it. Two other things worth raising with a lawyer: if your case was originally handled under the First Offender Act, or could be treated as First Offender retroactively, that can change the picture entirely. The Georgia Justice Project — who wrote much of this law and run statewide clinics — are the people to map your specific route.',
          remedy: 'Pardon (State Board of Pardons and Paroles), then Petition to Restrict — or retroactive First Offender',
          citation: 'O.C.G.A. § 35-3-37; Georgia First Offender Act'
        },
        ineligible_excluded_ga: {
          status: 'ineligible',
          title: 'This Misdemeanor Is Excluded From Restriction',
          message: 'Georgia\'s Second Chance Act excludes certain misdemeanors from restriction: DUI, family-violence battery (unless you were under 21 at the time of arrest), sex offenses, crimes against minors, and serious traffic offenses (§ 35-3-37(j)(4)(A)). No waiting period changes that. Two things worth checking rather than assuming: whether your offense is genuinely on that list, since these are specific categories; and, for family-violence battery, whether the under-21-at-arrest exception applies to you. The Georgia Justice Project can confirm both, and can advise on whether a pardon route exists.',
          remedy: 'None (Excluded Misdemeanor) — confirm with GJP; ask about the under-21 exception',
          citation: 'O.C.G.A. § 35-3-37(j)(4)(A)'
        },
        waiting_ga: {
          status: 'waiting',
          title: 'Four-Year Waiting Period Not Yet Met',
          message: 'To restrict a misdemeanor conviction in Georgia, four years must pass after you complete the sentence, with no new convictions in that time and no pending charges. Based on your dates, that has not run yet. Staying conviction-free is what gets you there. Remember too that Georgia caps this at two misdemeanor restrictions per lifetime, so it is worth being deliberate about which convictions you use it on.',
          remedy: 'Wait for the 4-year period (conviction-free)',
          citation: 'O.C.G.A. § 35-3-37'
        },
        complex_level_ga: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'In Georgia the path is completely different by level: a misdemeanor can be petitioned to restrict after 4 years, while a felony requires a pardon first. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and the Georgia Justice Project can read your record with you — they run free statewide clinics.',
          remedy: 'Get Your Conviction Level First (court paperwork / Georgia Justice Project)',
          citation: 'O.C.G.A. § 35-3-37'
        }
      }
    },
    resources: {
      remedies: {
        restriction: {
          name: 'Record Restriction and Sealing (O.C.G.A. § 35-3-37)',
          formName: 'Petition for Record Restriction and Sealing (or agency application for pre-2013 arrests)',
          formUrl: 'https://www.gjp.org/record-restriction/',
          steps: [
            'For a non-conviction on/after July 1, 2013: it should be restricted automatically — request your GCIC report and confirm it shows.',
            'For a pre-2013 non-conviction: apply to the arresting agency.',
            'For a misdemeanor conviction (up to 2 per lifetime): petition the court of conviction 4 years after completing the sentence, and serve the prosecutor.',
            'For a felony: obtain a pardon from the State Board of Pardons and Paroles first, then petition.',
            'GCIC applies the restriction within weeks of a court order.'
          ],
          // null: Wave 3 flags county court costs and pre-2013 agency fees as
          // varying with no statewide fee.
          fees: null,
          feeWaiver: null,
          courtContact: 'The court of conviction (or the arresting agency for pre-2013 arrests)'
        }
      },
      legalAid: [
        { name: 'Georgia Justice Project (wrote the law; statewide clinics)', url: 'https://www.gjp.org' },
        { name: 'Atlanta Legal Aid', url: 'https://atlantalegalaid.org' }
      ]
    }
  },

  // ==========================================================================
  // NORTH CAROLINA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave3_Draft_Package.md
  //
  // The most category-heavy expunction statute in the country, with a fresh
  // 2025 cut. S.L. 2025-71 (petitions on/after July 9, 2025) dropped the wait
  // for ONE nonviolent misdemeanour from 5 years to 3 — most guides online
  // still say 5. Encoded at 3, cited to the current § 15A-145.5(c)(1)(a) text.
  //
  // The two statutes the tree needs: § 15A-146 (dismissals/not-guilty) and
  // § 15A-145.5 (nonviolent convictions).
  //
  // THE TRAP (persona 5): 2-3 nonviolent felonies are expungeable at 20 years,
  // but ONLY if they were committed within a single 24-month window. Two
  // felonies from 2004 and 2009 are >24 months apart -> not eligible, however
  // long ago. That is its own node, reached only for the 2-3 felony count.
  //
  // Date nodes ASK for "the later of conviction or sentence completion" — the
  // anchor is not the single date the form collects.
  // ==========================================================================
  NC: {
    code: 'NC',
    name: 'North Carolina',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave3_Draft_Package.md',
    terminology:
      'North Carolina says EXPUNCTION (and also expungement) — the record is destroyed. The rules '
      + 'are unusually category-heavy: more than a dozen separate statutes, with eligibility turning '
      + 'on whether an offence is "nonviolent", how many you have, and when they happened. A fresh '
      + 'change matters here: as of July 9, 2025, the wait for a single nonviolent misdemeanor '
      + 'dropped from 5 years to 3 — most online guides still say 5. Non-convictions have their own, '
      + 'faster path, and many are now expunged automatically. Outstanding restitution blocks an '
      + 'expunction, and DWI is never expungeable.',
    keyDates: [
      {
        label: 'S.L. 2025-71 — one-nonviolent-misdemeanour wait cut 5 yrs to 3',
        date: '2025-07-09',
        kind: 'effective',
        note: 'Applies to petitions filed on/after this date. Most secondary guides still cite the old 5-year figure.',
      },
      {
        label: 'Automatic expunction of non-convictions (§ 15A-146) resumed under SB 565',
        date: '2024-07-08',
        kind: 'operative',
        note: 'Dismissals/not-guilty on/after Dec 1, 2021 expunge automatically 180-210 days after disposition. Paused Aug 2022, resumed July 8, 2024 — verify it is still running. Plea-agreement dismissals are NOT automatic.',
      },
    ],
    openQuestions: [
      {
        question:
          'Is the § 15A-146 automatic expunction of non-convictions still running? Wave 3 says it paused Aug 2022 and resumed July 8, 2024 under SB 565, and flags it for verification. Confirm on the current status before UI copy promises automatic expunction — the tree tells people to check rather than assume.',
        blocksFields: [],
      },
      {
        question:
          'What is the current conviction-expunction filing fee? Wave 3 gives "$175, waived for indigent petitioners" and flags it. Non-conviction petitions are generally free. Confirm with a clerk of superior court.',
        blocksFields: ['resources.remedies.conviction.fees'],
      },
      {
        question:
          'Confirm the prior-§15A-145.5-expunction limits in subsections (c4)/(c5): Wave 3 says a misdemeanour expunction generally bars a later one and flags the legacy clauses. The tree discloses this in prose but cannot count a person\'s prior expunctions.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the full "nonviolent" exclusion list against § 15A-145.5(a): Class A-G felonies, Class A1 misdemeanours, any assault-element offence, registry offences, listed sex/stalking offences, meth/heroin/PWISD-cocaine felonies, CMV felonies, DWI, and attempts at any. The tree asks a person to self-assess this.',
        blocksFields: [],
      },
      {
        question:
          'How are completed diversions and deferred-prosecution dismissals treated? Wave 3 says deferred-prosecution dismissals are not free like other non-conviction petitions but does not detail eligibility. Standing call-sheet question for every state.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.C. Gen. Stat. § 15A-145.5 (expunction of nonviolent convictions; waits; the 24-month felony window)', url: null, retrievedOn: null },
      { id: 'N.C. Gen. Stat. § 15A-145.5(c)(1)(a) (one-nonviolent-misdemeanour wait — 3 yrs since S.L. 2025-71)', url: null, retrievedOn: null },
      { id: 'N.C. Gen. Stat. § 15A-146 (expunction of dismissals/not-guilty; automatic path)', url: null, retrievedOn: null },
      { id: 'N.C. Gen. Stat. § 14-54(a) (felony breaking & entering — 15-yr expunction wait)', url: null, retrievedOn: null },
      { id: 'S.L. 2025-71 (2025 — misdemeanour wait cut)', url: null, retrievedOn: null },
      { id: 'S.L. 2021 / SB 565 (automatic non-conviction expunction; pause and resumption)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'nonviolent_nc' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconviction_nc' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconviction_nc' },
            { label: 'Deferred prosecution / Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        nonviolent_nc: {
          type: 'boolean',
          text: 'Was the offense any of these: a Class A through G felony; a Class A1 misdemeanor; any offense with an assault element; a sex or stalking offense, or one requiring registration; a methamphetamine, heroin, or cocaine-trafficking felony; a commercial-vehicle felony; a DWI; or an attempt at any of these?',
          yes: 'ineligible_excluded_nc',
          no: 'restitution_nc'
        },
        restitution_nc: {
          type: 'boolean',
          field: 'restitution_paid',
          text: 'Have you paid all restitution ordered in the case?',
          yes: 'conviction_count_nc',
          no: 'ineligible_restitution_nc'
        },
        conviction_count_nc: {
          type: 'choice',
          text: 'Thinking about your whole record, which describes your nonviolent convictions?',
          options: [
            { label: 'One nonviolent misdemeanor', value: 'one_misd', next: 'misd_date_nc' },
            { label: 'More than one nonviolent misdemeanor', value: 'multi_misd', next: 'multi_misd_date_nc' },
            { label: 'One nonviolent felony', value: 'one_felony', next: 'felony_be_nc' },
            { label: 'Two or three nonviolent felonies', value: 'multi_felony', next: 'felony_window_nc' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_count_nc' }
          ]
        },
        misd_date_nc: {
          type: 'date',
          text: 'Which came LATER: your conviction, or completing your sentence? Enter that date. (The clock runs conviction-free from then.)',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'the later of conviction or sentence completion, conviction-free (N.C. Gen. Stat. § 15A-145.5(c)(1)(a) — one nonviolent misdemeanour; cut from 5 to 3 by S.L. 2025-71)' },
            nextPass: 'eligible_conviction_nc',
            nextFail: 'waiting_nc'
          }
        },
        multi_misd_date_nc: {
          type: 'date',
          text: 'Which came LATER for your MOST RECENT case: the conviction, or completing the sentence? Enter that date.',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'the later of the last conviction or its sentence completion, conviction-free (N.C. Gen. Stat. § 15A-145.5 — multiple nonviolent misdemeanours)' },
            nextPass: 'eligible_conviction_nc',
            nextFail: 'waiting_nc'
          }
        },
        felony_be_nc: {
          type: 'boolean',
          text: 'Was the felony a breaking-and-entering offense under G.S. 14-54(a)?',
          yes: 'felony_be_date_nc',
          no: 'felony_one_date_nc'
        },
        felony_one_date_nc: {
          type: 'date',
          text: 'Which came LATER: your conviction, or completing your sentence? Enter that date.',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'the later of conviction or sentence completion, conviction-free (N.C. Gen. Stat. § 15A-145.5 — one nonviolent felony)' },
            nextPass: 'eligible_conviction_nc',
            nextFail: 'waiting_nc'
          }
        },
        felony_be_date_nc: {
          type: 'date',
          text: 'Which came LATER: your conviction, or completing your sentence? Enter that date.',
          validation: {
            period: { amount: 15, unit: 'years', anchor: 'the later of conviction or sentence completion, conviction-free (N.C. Gen. Stat. § 15A-145.5 — felony breaking & entering, G.S. 14-54(a))' },
            nextPass: 'eligible_conviction_nc',
            nextFail: 'waiting_nc'
          }
        },
        // THE TRAP — reached only for 2-3 felonies.
        felony_window_nc: {
          type: 'boolean',
          text: 'Were all of those felonies COMMITTED within a single 24-month period of each other? (North Carolina only allows expunging multiple felonies when they came from roughly the same stretch of time — not spread across years.)',
          yes: 'felony_multi_date_nc',
          no: 'ineligible_felony_window_nc'
        },
        felony_multi_date_nc: {
          type: 'date',
          text: 'Which came LATER for your MOST RECENT of those felonies: the conviction, or completing the sentence? Enter that date.',
          validation: {
            period: { amount: 20, unit: 'years', anchor: 'the later of the last conviction or its sentence completion, conviction-free (N.C. Gen. Stat. § 15A-145.5 — 2-3 nonviolent felonies within a 24-month window)' },
            nextPass: 'eligible_conviction_nc',
            nextFail: 'waiting_nc'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'North Carolina treats convictions and non-convictions through entirely different statutes, with very different timing. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The NC Second Chance Alliance (ncsecondchance.org) runs statewide clinics, and the UNC School of Government\'s Relief guide is the authoritative reference for reading your situation.',
          remedy: 'Get Your Record First (NC Second Chance Alliance)',
          citation: 'N.C. Gen. Stat. §§ 15A-145.5, 15A-146 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Deferred Prosecution and Diversion Need a Person',
          message: 'North Carolina\'s expunction rules are screened here for convictions, dismissals, and acquittals. Deferred-prosecution dismissals are treated differently — they are not free like other non-conviction petitions, and the eligibility details are not something this screening has fully researched — so we would rather point you to someone than guess. The NC Second Chance Alliance runs statewide clinics and can tell you how your disposition is treated.',
          remedy: 'Consult Legal Aid (Deferred Prosecution / Diversion Not Yet Screened)',
          citation: 'N.C. Gen. Stat. § 15A-146 (deferred-prosecution treatment not yet detailed)'
        },
        nonconviction_nc: {
          status: 'eligible',
          title: 'No Conviction — Likely Expungeable, Possibly Already Done',
          message: 'Because your case ended without a conviction, North Carolina has a fast path for you, and part of it may already have happened. Dismissals and not-guilty verdicts from December 1, 2021 onward are expunged AUTOMATICALLY, about 180 to 210 days after the case ends — a process that paused in 2022 and resumed in July 2024, so check rather than assume. Two things to know: if your dismissal came as part of a plea agreement, it is NOT automatic and you would petition instead; and older non-convictions can be petitioned with no waiting period, no prior-conviction bar, and generally no fee. Request your record to see whether the automatic expunction went through; if not, the petition (the AOC-CR-281/287/298 forms) is straightforward. The NC Second Chance Alliance can help.',
          remedy: 'Automatic or petition expunction of a non-conviction (§ 15A-146) — check your record',
          citation: 'N.C. Gen. Stat. § 15A-146'
        },
        eligible_conviction_nc: {
          status: 'eligible',
          title: 'Potentially Eligible to Expunge This Conviction',
          message: 'Based on your dates and record, you appear eligible to petition to EXPUNGE this nonviolent conviction under § 15A-145.5 — expunction destroys the record rather than just hiding it. If this is a single nonviolent misdemeanor, note that the wait is now 3 years, cut from 5 by a July 2025 law that most online guides have not caught up to. File in the county of conviction using the AOC-CR-281/287/298 forms; the district attorney and any victim are notified, and a judge may order an SBI or FBI record check. The filing fee for a conviction expunction is reportedly $175, waived if you cannot afford it — we are confirming the current amount. One thing worth raising with legal aid: a prior expunction under this statute can limit a later one, so if you have used one before, confirm you are still eligible. The NC Second Chance Alliance runs free clinics.',
          remedy: 'Petition to Expunge a Conviction (§ 15A-145.5)',
          citation: 'N.C. Gen. Stat. § 15A-145.5'
        },
        waiting_nc: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'North Carolina\'s conviction-expunction waits run from the later of your conviction or completing your sentence, and you must stay conviction-free through them: 3 years for a single nonviolent misdemeanor (recently cut from 5), 7 years for multiple nonviolent misdemeanors, 10 years for a nonviolent felony (15 for felony breaking and entering), and 20 years for two or three felonies from a single 24-month stretch. Based on your dates, yours has not run yet. Staying conviction-free is what gets you there, and any outstanding restitution needs to be cleared as well.',
          remedy: 'Wait for the period (conviction-free), and clear any restitution',
          citation: 'N.C. Gen. Stat. § 15A-145.5'
        },
        ineligible_excluded_nc: {
          status: 'ineligible',
          title: 'This Offense Is Not "Nonviolent" Under the Statute',
          message: 'North Carolina\'s conviction expunction only reaches "nonviolent" offenses, and it defines that narrowly — Class A through G felonies, Class A1 misdemeanors, anything with an assault element, sex and stalking and registry offenses, certain drug-trafficking felonies, commercial-vehicle felonies, DWI, and attempts at any of these are all excluded. For a DWI specifically, there is no expunction route in North Carolina, so be wary of any service that suggests one. Because "nonviolent" is a legal definition rather than a description of what happened, if you are not certain your offense is actually excluded it is genuinely worth confirming — the UNC School of Government Relief guide and the NC Second Chance Alliance can check it against the current list.',
          remedy: 'None (Not a "Nonviolent" Offense) — confirm against the statutory list',
          citation: 'N.C. Gen. Stat. § 15A-145.5(a)'
        },
        ineligible_restitution_nc: {
          status: 'ineligible',
          title: 'Outstanding Restitution Blocks Expunction',
          message: 'North Carolina will not expunge a conviction while restitution ordered in the case remains unpaid. This is a "not yet", not a permanent no: the offense itself may well qualify, so clearing the balance is the step that unlocks it. Ask the clerk of court for your exact restitution balance and how to pay it, then come back and run this again. The NC Second Chance Alliance can help you sort out what is owed.',
          remedy: 'Pay Outstanding Restitution First, then petition',
          citation: 'N.C. Gen. Stat. § 15A-145.5'
        },
        ineligible_felony_window_nc: {
          status: 'ineligible',
          title: 'These Felonies Are Too Far Apart in Time to Expunge Together',
          message: 'This is a rule that catches many people, so here it is plainly: North Carolina lets you expunge two or three nonviolent felonies together only if they were COMMITTED within a single 24-month window. Because yours were spread further apart than that, they do not qualify for the multiple-felony expunction — and this does not change with time, since it is about when the offenses happened, not how long ago. It is worth having someone confirm this, because the analysis is specific: if only one of your felonies is actually the barrier, a different single-felony route might still reach the others. The UNC School of Government Relief guide and the NC Second Chance Alliance can look at the exact dates and offenses.',
          remedy: 'None for the multiple-felony route (24-month window) — a single-felony route may still fit',
          citation: 'N.C. Gen. Stat. § 15A-145.5'
        },
        complex_count_nc: {
          status: 'complex',
          title: 'Your Record Needs Counting — By a Person',
          message: 'North Carolina\'s expunction timing turns on exactly how many nonviolent convictions you have and, for felonies, when they were committed relative to each other — one misdemeanor is 3 years, multiple are 7, one felony is 10, and two or three felonies are 20 but only if they fall within a 24-month window. Since you are not sure how your record counts, we are not going to guess, because the categories point to very different answers. The UNC School of Government Relief guide is the authoritative reference, and the NC Second Chance Alliance runs free statewide clinics where someone will count your record with you.',
          remedy: 'Get Your Record Counted (UNC SOG guide / NC Second Chance Alliance)',
          citation: 'N.C. Gen. Stat. § 15A-145.5'
        }
      }
    },
    resources: {
      remedies: {
        conviction: {
          name: 'Expunction of a Nonviolent Conviction (§ 15A-145.5)',
          formName: 'AOC-CR-281 / 287 / 298 series',
          formUrl: 'https://www.ncsecondchance.org',
          steps: [
            'Confirm the offense is "nonviolent" under the statute and that any restitution is paid.',
            'File the AOC-CR petition in the county of conviction; the district attorney and any victim are notified.',
            'A judge may order an SBI or FBI record check.',
            'The filing fee is reportedly $175, waived if you cannot afford it.'
          ],
          // null: Wave 3 gives "$175, waived for indigent" and flags it.
          fees: null,
          // NOT null: the indigency waiver is a named, independent mechanism.
          feeWaiver: 'The $175 fee is waived for petitioners who cannot afford it (indigent).',
          courtContact: 'Clerk of Superior Court, county of conviction'
        },
        nonconviction: {
          name: 'Expunction of a Non-Conviction (§ 15A-146)',
          formName: 'AOC-CR non-conviction expunction forms',
          formUrl: 'https://www.ncsecondchance.org',
          steps: [
            'Check first whether it was expunged automatically — dismissals and not-guilty verdicts from Dec 1, 2021 onward expunge about 180-210 days after disposition (the process resumed July 2024).',
            'If your dismissal was part of a plea agreement, it is NOT automatic — petition instead.',
            'Older non-convictions can be petitioned with no waiting period and no prior-conviction bar.',
            'Non-conviction petitions are generally free (deferred-prosecution dismissals are an exception).'
          ],
          fees: '$0 for most non-conviction petitions (deferred-prosecution dismissals are an exception).',
          feeWaiver: 'Not applicable to the generally free non-conviction petitions.',
          courtContact: 'Clerk of Superior Court, county of the case'
        }
      },
      legalAid: [
        { name: 'NC Second Chance Alliance (statewide clinics)', url: 'https://www.ncsecondchance.org' },
        { name: 'NC Justice Center (Summary of NC Expunctions)', url: 'https://www.ncjustice.org' }
      ]
    }
  },

  // ==========================================================================
  // WASHINGTON — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave4_Draft_Package.md
  //
  // THE QUIRK: Washington VACATES, it does not expunge or (generally) seal.
  // After a vacation you may lawfully say you were never convicted and WSP stops
  // reporting it — BUT THE COURT FILE STAYS PUBLIC. Sealing (GR 15) is separate
  // and rare. Every WA result says this plainly; competitors blur it.
  //
  // The 2024 New Hope Act change is the fresh-rule persona: the waiting clock no
  // longer waits for LFO (fines/fees) payoff — it runs from release/sentencing,
  // and courts can waive outstanding LFOs on motion. Older guides still say "pay
  // everything first". The tree does NOT gate on LFOs.
  //
  // The 2019 surprise-yes: Assault 2, Assault 3 (non-officer), and Robbery 2 are
  // vacatable if there was no firearm/deadly-weapon/sexual-motivation
  // enhancement — a real carve-out from the "violent = never" rule.
  // ==========================================================================
  WA: {
    code: 'WA',
    name: 'Washington',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave4_Draft_Package.md',
    terminology:
      'Washington does not expunge or, in most cases, seal. Instead it VACATES a conviction — the '
      + 'plea is withdrawn or the verdict set aside and the charge dismissed. After a vacation you '
      + 'may legally state you were never convicted, and the State Patrol stops reporting it. But '
      + 'there is one honest catch that matters: the COURT FILE itself stays public. Vacating is '
      + 'strong relief, but it is not the same as the record disappearing. A 2024 change (the New '
      + 'Hope Act) also means unpaid fines and fees no longer delay your eligibility — the clock '
      + 'runs from your release or sentencing, and the court can even reduce what you owe.',
    keyDates: [
      {
        label: 'New Hope Act — waiting clock no longer waits for LFO payoff',
        date: '2024',
        kind: 'effective',
        note: 'Wave 4 gives the year only. The clock runs from release/sentencing; courts can waive or reduce outstanding legal financial obligations on motion. Older guides still say "pay all fines first". Verify the session-law cite.',
      },
      {
        label: 'New Hope Act — Assault 2/3 and Robbery 2 carve-out from the violent-offence bar',
        date: '2019',
        kind: 'effective',
        note: 'Wave 4 gives the year only. Vacatable if no firearm/deadly-weapon/sexual-motivation enhancement.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the 2024 New Hope Act session-law cite for the rule that the waiting clock no longer waits for LFO (legal financial obligation) payoff. Wave 4 says the clock runs from release/sentencing and courts can waive LFOs on motion — but flags the exact cite. The tree encodes this rule; confirm it against the current RCW 9.96.060 / 9.94A.640 text.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the DV-related misdemeanour subsection: Wave 4 gives a 5-year track with extra conditions (no restraining-order violations in the prior 5 years; fewer than two separate-incident DV convictions) but flags the exact DV subsection. The tree asks whether the offence was DV-related and applies the 5-year track.',
        blocksFields: [],
      },
      {
        question:
          'What is the filing fee for a vacation motion? Wave 4 says one guide reports generally none but counties may differ — phone target. A WSP WATCH self-check is $11 online, free in person.',
        blocksFields: ['resources.remedies.vacation.fees', 'resources.remedies.vacation.feeWaiver'],
      },
      {
        question:
          'How are completed diversions treated? Wave 4 details special tracks (trafficking/DV-victim convictions under 9.96.080 / 9.94A.648, marijuana misdemeanours, pre-1975 treaty-fishing) but not general diversion. Standing call-sheet question.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Wash. Rev. Code § 9.96.060 (vacating misdemeanour convictions)', url: null, retrievedOn: null },
      { id: 'Wash. Rev. Code § 9.94A.640 (vacating felony convictions)', url: null, retrievedOn: null },
      { id: 'Wash. Rev. Code § 9.94A.637 (Certificate of Discharge — felony prerequisite)', url: null, retrievedOn: null },
      { id: 'Wash. Rev. Code § 46.61.502/.504 (DUI/physical control — never vacatable)', url: null, retrievedOn: null },
      { id: 'New Hope Act (2019, amended 2021/2024 — broadened offences; LFO change)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_wa' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_wa' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_wa' },
            { label: 'Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_wa: {
          type: 'boolean',
          text: 'Was the offense a DUI or physical-control offense, a sex offense, or an obscenity/child-exploitation offense?',
          yes: 'ineligible_excluded_wa',
          no: 'violent_wa'
        },
        violent_wa: {
          type: 'boolean',
          text: 'Was it a violent offense or a crime against a person?',
          yes: 'violent_carveout_wa',
          no: 'level_wa'
        },
        // The 2019 surprise-yes carve-out.
        violent_carveout_wa: {
          type: 'boolean',
          text: 'Was it specifically Assault in the 2nd degree, Assault in the 3rd degree (not against an officer), or Robbery in the 2nd degree — AND with no firearm, deadly-weapon, or sexual-motivation enhancement?',
          yes: 'level_wa',
          no: 'ineligible_violent_wa'
        },
        level_wa: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'dv_wa' },
            { label: 'Felony', value: 'felony', next: 'felony_class_wa' },
            { label: 'Infraction', value: 'infraction', next: 'dv_wa' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_level_wa' }
          ]
        },
        dv_wa: {
          type: 'boolean',
          text: 'Was the misdemeanor a domestic-violence-related offense?',
          yes: 'misd_dv_date_wa',
          no: 'misd_date_wa'
        },
        misd_date_wa: {
          type: 'date',
          text: 'Which came LATER: your release from confinement or supervision, or your sentencing? Enter that date. (Unpaid fines do NOT delay this — the 2024 law changed that.)',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'the later of release or sentencing (RCW 9.96.060 — misdemeanours; LFOs no longer delay the clock per the 2024 New Hope Act)' },
            nextPass: 'eligible_vacate_wa',
            nextFail: 'waiting_wa'
          }
        },
        misd_dv_date_wa: {
          type: 'date',
          text: 'Which came LATER: your release from confinement or supervision, or your sentencing? Enter that date.',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'the later of release or sentencing (RCW 9.96.060 — DV-related misdemeanours; extra conditions apply)' },
            nextPass: 'eligible_vacate_dv_wa',
            nextFail: 'waiting_wa'
          }
        },
        felony_class_wa: {
          type: 'choice',
          text: 'What class of felony was it? (Your sentencing paperwork says. Washington vacates lower felony classes only.)',
          options: [
            { label: 'Class C felony', value: 'c', next: 'felony_c_date_wa' },
            { label: 'Class B felony', value: 'b', next: 'felony_b_date_wa' },
            { label: 'Class A felony', value: 'a', next: 'ineligible_class_a_wa' },
            { label: 'I don\'t know the class', value: 'unsure', next: 'complex_level_wa' }
          ]
        },
        felony_c_date_wa: {
          type: 'date',
          text: 'When did you receive your Certificate of Discharge? (Washington requires this before vacating a felony.)',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'Certificate of Discharge (RCW 9.94A.640 — Class C felony; no new crime in the prior 5 years)' },
            nextPass: 'eligible_vacate_felony_wa',
            nextFail: 'waiting_wa'
          }
        },
        felony_b_date_wa: {
          type: 'date',
          text: 'When did you receive your Certificate of Discharge?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'Certificate of Discharge (RCW 9.94A.640 — Class B felony; no new crime in the prior 10 years)' },
            nextPass: 'eligible_vacate_felony_wa',
            nextFail: 'waiting_wa'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Washington treats a conviction (which can be vacated) very differently from a case that ended without one. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. A WSP WATCH self-check ($11 online, free in person) will show your record, and WashingtonLawHelp.org has plain-language vacate guides updated for the 2024 changes.',
          remedy: 'Get Your Record First (WSP WATCH)',
          citation: 'RCW 9.96.060, 9.94A.640 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'Washington\'s vacation rules are screened here for convictions, dismissals, and acquittals. How a completed diversion is treated is not something this screening has researched in detail, and Washington also has special expedited tracks — for trafficking and domestic-violence victims (RCW 9.96.080 / 9.94A.648) and mandatory marijuana-misdemeanor vacation. We would rather point you to someone than guess. WashingtonLawHelp.org can tell you which track fits.',
          remedy: 'Consult Legal Aid (Diversion / Special Tracks Not Yet Screened)',
          citation: 'RCW 9.96.060 (treatment of diversions not yet detailed)'
        },
        eligible_nonconviction_wa: {
          status: 'eligible',
          title: 'No Conviction — Likely Nothing to Vacate',
          message: 'Because your case ended without a conviction — dismissed or acquitted — there is generally no conviction on your record to vacate, which is good news. Your record should already reflect that no conviction resulted. If you want to confirm what shows, a WSP WATCH self-check ($11 online, free in person) will tell you. If a non-conviction is still appearing incorrectly, WashingtonLawHelp.org can help you get it corrected.',
          remedy: 'Confirm your record (WSP WATCH) — generally no conviction to vacate',
          citation: 'RCW 9.96.060'
        },
        eligible_vacate_wa: {
          status: 'eligible',
          title: 'Potentially Eligible to Vacate — With One Honest Caveat',
          message: 'Based on your dates, you appear eligible to VACATE this misdemeanor conviction under RCW 9.96.060 — three years have passed since the later of your release or sentencing, with no new convictions in that window. Here is the honest caveat Washington makes people live with, and that many tools gloss over: vacating lets you lawfully say you were never convicted and stops the State Patrol from reporting it, but the COURT FILE stays public. It is strong relief, not disappearance. Two pieces of good news from the 2024 law: unpaid fines and fees no longer hold up your eligibility, and the court can even reduce what you owe on a motion. File the motion in the sentencing court — statewide forms are on courts.wa.gov, and counties like Pierce and King publish complete packets.',
          remedy: 'Motion to Vacate (RCW 9.96.060) — court file stays public',
          citation: 'RCW 9.96.060'
        },
        eligible_vacate_dv_wa: {
          status: 'eligible',
          title: 'DV-Related Misdemeanor — Potentially Vacatable on the 5-Year Track',
          message: 'A domestic-violence-related misdemeanor can be vacated in Washington, but on a longer 5-year track with extra conditions — you must have no restraining-order violations in the prior 5 years, and there are limits on multiple separate-incident DV convictions. Based on your dates the 5 years appear met, but because the DV conditions are specific, this is worth confirming with legal aid before filing. The same honest caveat applies to all Washington vacations: it lets you say you were never convicted and stops State Patrol reporting, but the court file stays public. WashingtonLawHelp.org has DV-specific guidance.',
          remedy: 'Motion to Vacate (RCW 9.96.060, DV track) — confirm the conditions with legal aid',
          citation: 'RCW 9.96.060'
        },
        eligible_vacate_felony_wa: {
          status: 'eligible',
          title: 'Potentially Eligible to Vacate This Felony',
          message: 'Based on your dates, you appear eligible to VACATE this felony under RCW 9.94A.640 — 5 years since your Certificate of Discharge for a Class C felony, or 10 years for a Class B, with no new crime in that window. The same honest caveat applies as for any Washington vacation: it lets you lawfully deny the conviction and stops State Patrol reporting, but the court file stays public. File the motion in the sentencing court. If you have not yet obtained your Certificate of Discharge (RCW 9.94A.637), that is the first step — the vacation cannot proceed without it.',
          remedy: 'Motion to Vacate a Felony (RCW 9.94A.640) — Certificate of Discharge required first',
          citation: 'RCW 9.94A.640'
        },
        waiting_wa: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Washington\'s vacation waits run from the later of your release or sentencing (for a felony, from your Certificate of Discharge): 3 years for most misdemeanors, 5 for a DV-related misdemeanor or a Class C felony, 10 for a Class B felony. Based on your dates, yours has not run yet, and it also requires no new convictions during the wait. One thing that is NOT a barrier anymore: unpaid fines and fees do not delay your clock — the 2024 law changed that, so do not let an outstanding balance make you think you have longer to wait than you do.',
          remedy: 'Wait for the period (unpaid fines do NOT extend it)',
          citation: 'RCW 9.96.060, 9.94A.640'
        },
        ineligible_excluded_wa: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Vacated',
          message: 'Washington never vacates DUI or physical-control offenses, sex offenses, or obscenity and child-exploitation offenses. This is categorical, not a matter of time. For a DUI specifically, there is no vacation route in Washington, so be cautious of any service that suggests otherwise. If you have other convictions that are not on this list, those may well be vacatable — run this again for them. WashingtonLawHelp.org can confirm where your offense falls.',
          remedy: 'None (Excluded Offense)',
          citation: 'RCW 9.96.060'
        },
        ineligible_violent_wa: {
          status: 'ineligible',
          title: 'Violent Offenses Generally Cannot Be Vacated',
          message: 'Washington generally does not vacate violent offenses or crimes against a person. There is a real exception worth knowing about, though — since 2019, Assault in the 2nd degree, Assault in the 3rd degree (not against an officer), and Robbery in the 2nd degree CAN be vacated if there was no firearm, deadly-weapon, or sexual-motivation enhancement. If your offense might be one of those, it is genuinely worth checking rather than accepting a no — the enhancement question is specific and a lawyer can read it from your judgment and sentence. WashingtonLawHelp.org and county legal aid can look.',
          remedy: 'Generally None (Violent Offense) — but check the 2019 Assault/Robbery carve-out',
          citation: 'RCW 9.94A.640'
        },
        ineligible_class_a_wa: {
          status: 'ineligible',
          title: 'Class A Felonies Cannot Be Vacated',
          message: 'Washington does not vacate Class A felonies — this is a categorical bar with no waiting period that changes it. The route that may remain is executive clemency through the Governor\'s office, which is a different and higher bar but not a closed door. WashingtonLawHelp.org and county legal aid can advise whether clemency is realistic in your situation.',
          remedy: 'None (Class A Felony) — clemency is the remaining route',
          citation: 'RCW 9.94A.640'
        },
        complex_level_wa: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Washington the vacation wait and whether it is possible both depend on the level and class: 3 years for a misdemeanor, 5 for a Class C felony, 10 for a Class B, and never for a Class A. Since you are not sure which yours is, we are not going to guess. Your sentencing paperwork states it, and a WSP WATCH self-check will show it. WashingtonLawHelp.org can read your record with you.',
          remedy: 'Get Your Offense Level First (sentencing paperwork / WSP WATCH)',
          citation: 'RCW 9.96.060, 9.94A.640'
        }
      }
    },
    resources: {
      remedies: {
        vacation: {
          name: 'Motion to Vacate a Conviction (RCW 9.96.060 / 9.94A.640)',
          formName: 'Motion and Declaration to Vacate (statewide forms; county packets)',
          formUrl: 'https://www.courts.wa.gov/forms/',
          steps: [
            'For a felony, obtain a Certificate of Discharge first (RCW 9.94A.637) — the vacation cannot proceed without it.',
            'Complete the vacation motion — statewide forms are on courts.wa.gov, and Pierce and King counties publish complete packets.',
            'File in the sentencing court.',
            'Understand what you get: you may lawfully deny the conviction and the State Patrol stops reporting it, but the court file stays public.'
          ],
          // null: Wave 4 says one guide reports generally no filing fee but
          // counties may differ. Phone target.
          fees: null,
          feeWaiver: null,
          courtContact: 'The sentencing court'
        }
      },
      legalAid: [
        { name: 'WashingtonLawHelp.org (vacate guides, 2024-updated)', url: 'https://www.washingtonlawhelp.org' },
        { name: 'Washington Courts self-help forms', url: 'https://www.courts.wa.gov/forms/' }
      ]
    }
  },

  // ==========================================================================
  // TENNESSEE — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave4_Draft_Package.md
  //
  // THE QUIRK: since Jan 1, 2024, no conviction-expunction order may be entered
  // without a TBI CERTIFICATE OF ELIGIBILITY attached — TBI certifies the
  // offence qualifies (the court still decides). Every conviction result says
  // this is the first step.
  //
  // Non-convictions expunge FREE and anytime (the statute declares no fee ever).
  // Trap (persona from same-episode): convicted of ANY count from an episode and
  // the rest generally can't be expunged (§ (a)(1)(E)).
  //
  // Convictions: single eligible conviction (misdemeanours + listed Class E
  // felonies) at 5 years; a newer tier of certain Class C/D felonies at 10
  // years. A two-conviction path (§ (k)) exists, once per lifetime.
  // ==========================================================================
  TN: {
    code: 'TN',
    name: 'Tennessee',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave4_Draft_Package.md',
    terminology:
      'Tennessee says EXPUNCTION, and it means it — the public records are destroyed. Cases that '
      + 'ended without a conviction (dismissed, nolle, no-bill, not guilty, an arrest with no '
      + 'charge) can be expunged for FREE, and the law says so on purpose. Convictions are harder: '
      + 'a single eligible conviction can be expunged after 5 years, and since January 2024 there '
      + 'is a new step — you must first get a Certificate of Eligibility from the TBI confirming the '
      + 'offense qualifies before a court will enter the order. DUI is never expungeable.',
    keyDates: [
      {
        label: 'TBI Certificate of Eligibility required for conviction expunctions',
        date: '2024-01-01',
        kind: 'effective',
        note: 'No conviction-expunction order may be entered without a TBI certificate confirming the offence qualifies. Adds a step and processing time to every conviction track.',
      },
      {
        label: 'Statutory reorganization of § 40-32-101 into §§ 40-32-106/107',
        date: '2025',
        kind: 'effective',
        note: 'Wave 4 gives the year only, and flags that content is mid-renumbering — cite both old and new until settled; the AOC site says "updated information coming soon".',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the current statute numbering: Wave 4 flags a 2025 reorganization renumbering § 40-32-101 content into §§ 40-32-106/107, still settling. Cite both until confirmed. The AOC site itself says updated information is coming.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the newer 10-year felony tier: Wave 4 says certain Class C and D felonies were added at 10 years, and flags the exact (g)(1)(D)-(F) list — most older guides only mention Class E. The tree encodes a 10-year Class C/D track but the specific eligible-offence list needs confirming.',
        blocksFields: [],
      },
      {
        question:
          'What is the TBI certificate-of-eligibility request process and turnaround? Wave 4 flags this as a new step (since Jan 2024) that adds processing time to every conviction track. Verify on TBI\'s site.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the clerk fee practice: Wave 4 says no state fee but the clerk may charge up to $100 (§ 8-21-401(b)(1)(D)(x)) for conviction/diversion expunctions, waived by indigency affidavit; dismissals are free. Confirm the current practice with a clerk (Davidson County).',
        blocksFields: ['resources.remedies.conviction.fees'],
      },
      {
        question:
          'How are pretrial and judicial diversion completions treated, and confirm the same-episode trap (§ (a)(1)(E)): conviction of any count from an episode generally bars expunging the rest. The tree hedges diversions and discloses the same-episode rule in prose.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Tenn. Code Ann. § 40-32-101 (expunction; being renumbered to §§ 40-32-106/107 in 2025)', url: null, retrievedOn: null },
      { id: 'Tenn. Code Ann. § 40-32-101(g) (conviction expunction; eligible offences; 5-yr and 10-yr tiers)', url: null, retrievedOn: null },
      { id: 'Tenn. Code Ann. § 40-32-101(k) (two-conviction path; once per lifetime)', url: null, retrievedOn: null },
      { id: 'Tenn. Code Ann. § 8-21-401(b)(1)(D)(x) (clerk fee up to $100)', url: null, retrievedOn: null },
      { id: '2024 amendment (TBI certificate-of-eligibility requirement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_tn' },
            { label: 'Dismissed / Nolle / No-billed / Never charged', value: 'dismissed', next: 'eligible_nonconviction_tn' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_tn' },
            { label: 'Diversion completed (pretrial or judicial)', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_tn: {
          type: 'boolean',
          text: 'Was the offense any of these: a DUI, a sexual offense, a vehicular assault, or a Class A or Class B felony?',
          yes: 'ineligible_excluded_tn',
          no: 'other_convictions_tn'
        },
        other_convictions_tn: {
          type: 'boolean',
          text: 'Apart from this case, do you have any other conviction on your record?',
          yes: 'complex_multi_tn',
          no: 'conv_level_tn'
        },
        conv_level_tn: {
          type: 'choice',
          text: 'How was the offense classified? (Your court paperwork says. Tennessee expunges only certain levels.)',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_date_tn' },
            { label: 'Class E felony (theft, forgery, credit-card fraud, some drug possession)', value: 'e', next: 'e_date_tn' },
            { label: 'Class C or D felony', value: 'cd', next: 'cd_date_tn' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_tn' }
          ]
        },
        misd_date_tn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, with all fines, costs, and restitution paid?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'sentence completion, all obligations paid (T.C.A. § 40-32-101(g) — single eligible misdemeanour)' },
            nextPass: 'eligible_conviction_tn',
            nextFail: 'waiting_tn'
          }
        },
        e_date_tn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, with all fines, costs, and restitution paid?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'sentence completion, all obligations paid (T.C.A. § 40-32-101(g) — listed Class E felony)' },
            nextPass: 'eligible_conviction_tn',
            nextFail: 'waiting_tn'
          }
        },
        cd_date_tn: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, with all fines, costs, and restitution paid?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'sentence completion, all obligations paid (T.C.A. § 40-32-101(g) — certain Class C/D felonies, newer tier)' },
            nextPass: 'eligible_conviction_cd_tn',
            nextFail: 'waiting_tn'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Tennessee treats non-convictions (free to expunge, anytime) very differently from convictions (a wait, plus a new TBI certificate step). Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The tncourts.gov expungement page has the forms and current information, and county clerks can tell you your disposition.',
          remedy: 'Get Your Record First (tncourts.gov / court clerk)',
          citation: 'T.C.A. § 40-32-101 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'Tennessee lets you expunge a completed pretrial or judicial diversion, and a fee applies to that. The exact eligibility and process are not something this screening has researched in detail, so we would rather point you to someone than guess. One thing worth knowing generally: if you were convicted of any count arising from the same episode as this case, that can block expunging the rest (§ (a)(1)(E)). The tncourts.gov expungement page and county legal aid can confirm your situation.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Detailed)',
          citation: 'T.C.A. § 40-32-101 (diversion treatment not yet detailed)'
        },
        eligible_nonconviction_tn: {
          status: 'eligible',
          title: 'No Conviction — Free Expunction, Anytime',
          message: 'Because your case ended without a conviction — dismissed, nolle prosequi, no-billed, acquitted, or an arrest that never led to a charge — you can expunge it for FREE, and Tennessee law is explicit that no fee should ever be charged for this. There is no waiting period. File the petition in the court that handled the case. One thing to be aware of: if you were CONVICTED of any other count arising from the same incident, that can prevent expunging the rest (§ (a)(1)(E)) — so this cleanest path assumes nothing from that episode ended in a conviction.',
          remedy: 'Expunction of a Non-Conviction (T.C.A. § 40-32-101) — free, anytime',
          citation: 'T.C.A. § 40-32-101'
        },
        eligible_conviction_tn: {
          status: 'eligible',
          title: 'Potentially Eligible to Expunge — One New Step to Know About',
          message: 'Based on your dates — 5 years since you completed the sentence with all fines, costs, and restitution paid, and no other convictions — this conviction appears eligible for expunction under § 40-32-101(g). One step changed in January 2024 and it is worth planning for: before a court will enter the order, you must first obtain a Certificate of Eligibility from the TBI confirming the offense qualifies. That adds processing time, so start it early. Then file the petition in the court of conviction; the clerk may charge up to $100, waived if you cannot afford it. An expunction destroys the public record.',
          remedy: 'TBI Certificate of Eligibility, then Expunction Petition (§ 40-32-101(g))',
          citation: 'T.C.A. § 40-32-101(g)'
        },
        eligible_conviction_cd_tn: {
          status: 'eligible',
          title: 'Possibly Eligible on the Newer 10-Year Felony Tier',
          message: 'Tennessee recently added a path for certain Class C and D felonies at 10 years — most older guides do not mention it, so this may be newer than what you have read elsewhere. Based on your dates the 10 years appear met. Two things to confirm, though: whether YOUR specific offense is on the eligible list is exactly what we are still verifying, and it is also what the TBI Certificate of Eligibility (required since January 2024) will determine before a court acts. So the honest next step is to request that certificate — it both confirms eligibility and is required to proceed. A legal aid organization can help you check the offense against the current list first. The clerk may charge up to $100, waived for indigency.',
          remedy: 'TBI Certificate of Eligibility (confirms the offence too), then Petition (§ 40-32-101(g))',
          citation: 'T.C.A. § 40-32-101(g)'
        },
        waiting_tn: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Tennessee\'s conviction expunction comes 5 years after you complete your sentence (with all fines, costs, and restitution paid) for a misdemeanor or listed Class E felony, and 10 years for the newer Class C/D felony tier. Based on your dates, yours has not run yet. Getting any outstanding fines or restitution paid matters, since the clock runs from full completion. When the time comes, remember the TBI certificate step added in 2024.',
          remedy: 'Wait for the period (all obligations paid), then request the TBI certificate',
          citation: 'T.C.A. § 40-32-101(g)'
        },
        ineligible_excluded_tn: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Expunged',
          message: 'Tennessee does not expunge DUI convictions, sexual offenses, vehicular assault, or Class A and Class B felonies. For a DUI specifically, there is no expunction route, so be wary of any service suggesting one. If you have a non-conviction or a different, eligible conviction on your record, those may still qualify — run this again for them. Legal aid can confirm where your offense falls; the categories are specific.',
          remedy: 'None (Excluded Offense)',
          citation: 'T.C.A. § 40-32-101'
        },
        complex_multi_tn: {
          status: 'complex',
          title: 'More Than One Conviction — Worth a Closer Look',
          message: 'The simplest Tennessee expunction path is for a single eligible conviction with nothing else on your record. Because you have more than one conviction, your situation needs a closer look: Tennessee does have a two-conviction path (§ (k)) — up to two offenses, each independently eligible, both before any ineligible conviction — but it can only be used ONCE in a lifetime, so timing and which convictions to include actually matter. This is worth a person rather than a screening tool. Legal aid and the tncourts.gov expungement resources can map which of your convictions qualify and whether the two-conviction path is your best move.',
          remedy: 'Consult Legal Aid (Multiple Convictions; the § (k) Two-Conviction Path)',
          citation: 'T.C.A. § 40-32-101(k)'
        },
        complex_level_tn: {
          status: 'complex',
          title: 'We Need the Offense Classification',
          message: 'In Tennessee the expunction wait depends on the class: 5 years for a misdemeanor or listed Class E felony, 10 for the newer Class C/D tier, and never for Class A/B felonies, DUI, or sexual offenses. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and the tncourts.gov expungement page walks through the categories. Legal aid can also read your record with you.',
          remedy: 'Get Your Offense Classification First (court paperwork / tncourts.gov)',
          citation: 'T.C.A. § 40-32-101(g)'
        }
      }
    },
    resources: {
      remedies: {
        conviction: {
          name: 'Conviction Expunction (T.C.A. § 40-32-101(g))',
          formName: 'Petition for Expunction (with TBI Certificate of Eligibility)',
          formUrl: 'https://www.tncourts.gov/programs/expunctions',
          steps: [
            'Since January 2024, first request a Certificate of Eligibility from the TBI — it confirms the offense qualifies, and a court cannot enter the order without it. Start this early; it adds processing time.',
            'File the petition in the court of conviction; the district attorney is served.',
            'The clerk may charge up to $100; an indigency affidavit waives it.',
            'For a non-conviction instead, the expunction is free and needs no TBI certificate.'
          ],
          // null: Wave 4 gives "up to $100, indigency waives" and flags the
          // current practice.
          fees: null,
          // NOT null: the indigency waiver is a named, independent mechanism.
          feeWaiver: 'An indigency affidavit waives the clerk fee.',
          courtContact: 'The court of conviction; TBI for the certificate'
        },
        nonconviction: {
          name: 'Non-Conviction Expunction (T.C.A. § 40-32-101)',
          formName: 'Petition for Expunction (non-conviction)',
          formUrl: 'https://www.tncourts.gov/programs/expunctions',
          steps: [
            'For a dismissal, nolle, no-bill, acquittal, or arrest without charge, file in the court that handled the case.',
            'No TBI certificate is needed for a non-conviction.',
            'It is free — the statute is explicit that no fee should be charged.'
          ],
          fees: '$0 — the statute declares no fee should ever be charged for a non-conviction expunction.',
          feeWaiver: 'Not applicable (free).',
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Tennessee Courts — Expunctions', url: 'https://www.tncourts.gov/programs/expunctions' },
        { name: 'Legal Aid Society of Middle Tennessee and the Cumberlands', url: 'https://www.las.org' }
      ]
    }
  },

  // ==========================================================================
  // MASSACHUSETTS — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave4_Draft_Package.md
  //
  // THE FLAGSHIP QUIRK, and the best UX in the country: administrative SEALING
  // of a conviction is ONE FORM, BY MAIL, FREE, NO COURT, and NON-DISCRETIONARY
  // once the wait is met. The Commissioner of Probation MUST seal — no judge, no
  // hearing, no reasons. For most users this is the whole answer, and the copy
  // leads with it.
  //
  // Sealing (CORI hidden, §§ 100A-100C) vs expungement (destruction, §§ 100E-
  // 100U, narrow). Expungement is the exception (offence before 21st birthday,
  // max 2 lifetime, ~20 excluded categories); sealing is the product.
  //
  // Waits from disposition or release (whichever later), reset by intervening
  // convictions/incarceration: misdemeanours 3 yrs, felonies 7, sex offences 15
  // (and registry-required cannot seal at all).
  // ==========================================================================
  MA: {
    code: 'MA',
    name: 'Massachusetts',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave4_Draft_Package.md',
    terminology:
      'Massachusetts has two remedies, and the common one is unusually easy. SEALING hides your '
      + 'record (your CORI) from most employers, and for a conviction it is administrative: you mail '
      + 'ONE form to the Commissioner of Probation, there is no fee and no court hearing, and once '
      + 'the waiting period is met the Commissioner MUST seal it — a judge is not involved and there '
      + 'is no discretion to say no. EXPUNGEMENT permanently destroys the record but is deliberately '
      + 'narrow, mostly for offenses committed before the person turned 21. For most people, sealing '
      + 'is the whole answer.',
    keyDates: [],
    openQuestions: [
      {
        question:
          'Confirm the current Petition to Seal form name/number. Wave 4 gives "TC-005" but flags it. Verify on the mass.gov "Seal your criminal record" page along with the current Commissioner of Probation mailing address.',
        blocksFields: [],
      },
      {
        question:
          'Confirm which offense categories are ineligible for administrative sealing under § 100A. Wave 4 flags the list (firearms-licensing statutes, some state-ethics offenses). The tree asks a person whether their offense is in one of these categories.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 100J expungement exclusion list (~20 categories: ABDW, firearms, OUI, restraining-order violations, sex offenses) and the § 100E-100U mechanics: offense before the 21st birthday, 3-yr misd / 7-yr felony waits, max 2 lifetime, no subsequent cases. The expungement path is disclosed but not fully branched.',
        blocksFields: [],
      },
      {
        question:
          'How are completed diversions and continuances-without-a-finding (CWOF) treated for sealing? Standing call-sheet question. Wave 4 does not detail these.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Mass. Gen. Laws c. 276 § 100A (administrative sealing of convictions)', url: null, retrievedOn: null },
      { id: 'Mass. Gen. Laws c. 276 § 100C (court sealing of non-convictions)', url: null, retrievedOn: null },
      { id: 'Mass. Gen. Laws c. 276 §§ 100E-100U (expungement — narrow)', url: null, retrievedOn: null },
      { id: 'Mass. Gen. Laws c. 276 § 100J (expungement exclusion list)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'seal_ineligible_ma' },
            { label: 'Dismissed / Nolle prosequi', value: 'dismissed', next: 'eligible_court_seal_ma' },
            { label: 'Acquitted / No probable cause / No-billed', value: 'acquitted', next: 'eligible_auto_seal_ma' },
            { label: 'Diversion completed / Continuance without a finding', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        seal_ineligible_ma: {
          type: 'boolean',
          text: 'Was the offense a sex offense that requires you to register, a firearms-licensing offense, or a state-ethics offense?',
          yes: 'complex_ineligible_ma',
          no: 'seal_level_ma'
        },
        seal_level_ma: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'misd_date_ma' },
            { label: 'Felony', value: 'felony', next: 'felony_date_ma' },
            { label: 'Infraction', value: 'infraction', next: 'misd_date_ma' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'complex_level_ma' }
          ]
        },
        misd_date_ma: {
          type: 'date',
          text: 'Which came LATER: the disposition of the case, or your release from any incarceration? Enter that date. (A later conviction or incarceration resets this clock.)',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'the later of disposition or release (M.G.L. c. 276 § 100A — misdemeanours; reset by intervening convictions/incarceration)' },
            nextPass: 'eligible_seal_ma',
            nextFail: 'waiting_ma'
          }
        },
        felony_date_ma: {
          type: 'date',
          text: 'Which came LATER: the disposition of the case, or your release from any incarceration? Enter that date. (A later conviction or incarceration resets this clock.)',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'the later of disposition or release (M.G.L. c. 276 § 100A — felonies; reset by intervening convictions/incarceration)' },
            nextPass: 'eligible_seal_ma',
            nextFail: 'waiting_ma'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'In Massachusetts, a non-conviction can often be sealed right away, while a conviction seals administratively after a wait. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. An iCORI self-request ($25, waived if you cannot afford it) will show your record, and Greater Boston Legal Services has excellent CORI self-help materials.',
          remedy: 'Get Your Record First (iCORI)',
          citation: 'M.G.L. c. 276 §§ 100A, 100C (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion and CWOF Cases Need a Person',
          message: 'Massachusetts sealing rules are screened here for convictions and non-convictions. How a completed diversion or a continuance without a finding (CWOF) is treated is not something this screening has researched in detail, and we would rather point you to someone than guess — these often resolve favorably, so it is worth asking. Greater Boston Legal Services has strong CORI self-help materials and can tell you how your disposition is treated.',
          remedy: 'Consult Legal Aid (Diversion / CWOF Not Yet Detailed)',
          citation: 'M.G.L. c. 276 § 100A (treatment of diversions not yet detailed)'
        },
        eligible_auto_seal_ma: {
          status: 'eligible',
          title: 'Acquittal or No-Bill — Sealed Automatically',
          message: 'Because your case ended in an acquittal, a finding of no probable cause, or a no-bill, Massachusetts seals it AUTOMATICALLY at disposition under § 100C — there is nothing you need to do. If your record still shows it, you can ask the court to confirm the sealing was applied. An iCORI self-request will let you check what your record shows.',
          remedy: 'Automatic Court Sealing (§ 100C) — already applied',
          citation: 'M.G.L. c. 276 § 100C'
        },
        eligible_court_seal_ma: {
          status: 'eligible',
          title: 'Dismissed — You Can Seal It Now, No Waiting Period',
          message: 'Because your case was dismissed or nolle prossed, you can petition the court to seal it right away under § 100C — no waiting period. It is a court petition (the judge weighs whether sealing serves "substantial justice"), which makes it a good option for people who do not want to wait out the administrative timeline. This is separate from the mail-in administrative sealing that applies to convictions. Greater Boston Legal Services can help you file.',
          remedy: 'Court Petition to Seal a Non-Conviction (§ 100C) — no wait',
          citation: 'M.G.L. c. 276 § 100C'
        },
        eligible_seal_ma: {
          status: 'eligible',
          title: 'Mail One Form — They Cannot Say No',
          message: 'This is the good news, and it is genuinely simple. Based on your dates, you can seal this conviction administratively under § 100A — and that means ONE form, mailed to the Commissioner of Probation, with no fee, no court, and no hearing. Once the wait is met (3 years for a misdemeanor, 7 for a felony, from the later of your disposition or release), the Commissioner MUST seal it. There is no discretion and no reason they can give to refuse. Mail the Petition to Seal to the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108. That is the whole process for most people. Greater Boston Legal Services has the current form and a plain-language walkthrough.',
          remedy: 'Mail the Petition to Seal to the Commissioner of Probation (§ 100A) — free, non-discretionary',
          citation: 'M.G.L. c. 276 § 100A'
        },
        waiting_ma: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Massachusetts administrative sealing comes 3 years after a misdemeanor or 7 years after a felony, measured from the later of your disposition or your release from any incarceration. Based on your dates, that has not run yet — and note that a later conviction or incarceration resets the clock. The good news for when you get there: sealing is a single mailed form, free, with no court and no discretion. Staying case-free is what gets you to it.',
          remedy: 'Wait for the period, then mail one form (no fee, no court)',
          citation: 'M.G.L. c. 276 § 100A'
        },
        complex_ineligible_ma: {
          status: 'complex',
          title: 'This Offense Category Needs a Closer Look',
          message: 'A sex offense that requires registration cannot be sealed while the registration duty continues (and sex offenses have a longer 15-year track even when sealable), and firearms-licensing and state-ethics offenses have their own limits on administrative sealing. Because these categories are specific and the rules differ within them, we are not going to give you a flat yes or no — it is worth having someone look. Greater Boston Legal Services handles exactly these situations and can tell you whether a sealing or the narrower expungement route fits.',
          remedy: 'Consult Legal Aid (Registration / Firearms / Ethics Offense)',
          citation: 'M.G.L. c. 276 § 100A'
        },
        complex_level_ma: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Massachusetts the administrative sealing wait is 3 years for a misdemeanor and 7 for a felony. Since you are not sure which yours was, we are not going to guess. Your court paperwork states it, and an iCORI self-request will show it. Once you know, sealing is a single mailed form with no fee and no court — Greater Boston Legal Services has the walkthrough.',
          remedy: 'Get Your Offense Level First (court paperwork / iCORI)',
          citation: 'M.G.L. c. 276 § 100A'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'Administrative Sealing of a Conviction (M.G.L. c. 276 § 100A)',
          formName: 'Petition to Seal (mail to the Commissioner of Probation)',
          formUrl: 'https://www.mass.gov/how-to/seal-your-criminal-record',
          steps: [
            'Confirm you are past the wait: 3 years for a misdemeanor, 7 for a felony, from the later of disposition or release.',
            'Complete the Petition to Seal and MAIL it to the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108.',
            'There is no fee, no court, and no hearing. Once the wait is met, the Commissioner must seal it.',
            'For a dismissal or acquittal instead, use the court-sealing path (§ 100C), which has no waiting period.'
          ],
          fees: '$0 — administrative sealing is free.',
          feeWaiver: 'Not applicable (free).',
          courtContact: 'Commissioner of Probation (by mail), One Ashburton Place, Room 405, Boston, MA 02108'
        }
      },
      legalAid: [
        { name: 'Mass.gov — Seal your criminal record', url: 'https://www.mass.gov/how-to/seal-your-criminal-record' },
        { name: 'Greater Boston Legal Services (CORI self-help)', url: 'https://www.gbls.org' }
      ]
    }
  },

  // ==========================================================================
  // INDIANA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave4_Draft_Package.md
  //
  // THE QUIRK, and a tree design no scraper has: ONE expungement petition per
  // lifetime (§ 9-9). It must include everything at once; multi-county records
  // are separate petitions per county, all within a 365-day window, together
  // counting as the one shot. So the right answer is sometimes "you are
  // eligible, but DON'T FILE YET" — filing now on one case can burn the shot
  // for records not yet eligible.
  //
  // That is complex_timing_in: an ADVISORY, not a clean eligible, because
  // whether to wait depends on the eligibility of OTHER records the screening
  // cannot compute. Reached when a person says they have other records.
  //
  // Tracks: arrests/no-conviction (§ 9-1, 1yr, free); misdemeanours (§ 9-2, 5yr,
  // MANDATORY grant); Level 6/Class D (§ 9-3, 8yr, mandatory); Level 4/5 (§ 9-4,
  // 8yr, DISCRETIONARY, record marked-public not hidden); serious (§ 9-5, 10yr +
  // prosecutor consent). Never: murder, sex/violent registry, official misconduct.
  // ==========================================================================
  IN: {
    code: 'IN',
    name: 'Indiana',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave4_Draft_Package.md',
    terminology:
      'Indiana calls it EXPUNGEMENT, though for lower-level offenses it works like sealing and for '
      + 'higher felonies it marks the record "expunged" while leaving it public. The rule that '
      + 'shapes everything: you get ONE expungement petition in your LIFETIME. It has to include all '
      + 'your eligible records at once, and if your records are in different counties you file one '
      + 'petition per county, all within a single 365-day window — together they are your one shot. '
      + 'That means the right move is sometimes to WAIT: filing now on one case can waste the '
      + 'petition for records that are not eligible yet. Lower-level grants are mandatory if you '
      + 'qualify; higher felonies are up to the judge.',
    keyDates: [],
    openQuestions: [
      {
        question:
          'Confirm the scope of the post-2022 automatic expungement of dismissed-case arrests (§ 9-1), and the 2022 additions for infraction-adjudication arrests and diversion-participant eligibility (with prosecutor authorization). Wave 4 flags the scope. The tree tells non-conviction petitioners to check whether it was already done.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 9-3 exclusion list for Level 6 / Class D felonies (bodily-injury offenses, sex/violent offenders, etc.). The tree asks a person whether their offense is excluded from the § 9-3 mandatory path.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 9-5(b) never-expungeable list (murder/homicide-level, sex/violent-offender registry, sex crimes, official misconduct). The tree asks a person whether their offense is on it.',
        blocksFields: [],
      },
      {
        question:
          'What is the conviction-petition filing fee? Wave 4 says § 9-1 arrest petitions are free by statute, and conviction petitions pay the civil filing fee (~$100 vicinity, county-set). Phone target.',
        blocksFields: ['resources.remedies.conviction.fees', 'resources.remedies.conviction.feeWaiver'],
      },
      {
        question:
          'Confirm the "earlier with prosecutor\'s written consent" mechanics for the § 9-2 misdemeanour path and the § 9-5 serious-felony prosecutor-consent requirement. The tree uses the standard waits and notes the consent shortcuts in prose.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Ind. Code § 35-38-9-1 (arrest/non-conviction expungement; automatic post-2022)', url: null, retrievedOn: null },
      { id: 'Ind. Code § 35-38-9-2 (misdemeanour expungement; 5 yrs; mandatory)', url: null, retrievedOn: null },
      { id: 'Ind. Code § 35-38-9-3 (Level 6/Class D felony; 8 yrs; mandatory; exclusion list)', url: null, retrievedOn: null },
      { id: 'Ind. Code § 35-38-9-4 (Level 4/5 felony; 8 yrs; discretionary; marked-public)', url: null, retrievedOn: null },
      { id: 'Ind. Code § 35-38-9-5 (serious felony; 10 yrs + prosecutor consent; discretionary)', url: null, retrievedOn: null },
      { id: 'Ind. Code § 35-38-9-9 (one petition per lifetime; 365-day multi-county window)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_in' },
            { label: 'Dismissed / Arrested but not convicted', value: 'dismissed', next: 'eligible_arrest_in' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_arrest_in' },
            { label: 'Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_in: {
          type: 'boolean',
          text: 'Was the offense any of these: murder or a homicide-level offense, a sex crime or one requiring sex/violent-offender registration, or official misconduct by a public official?',
          yes: 'ineligible_excluded_in',
          no: 'level_in'
        },
        level_in: {
          type: 'choice',
          text: 'How was the offense classified? (Your paperwork says. Indiana\'s waiting period and whether a judge has discretion both depend on it.)',
          options: [
            { label: 'Misdemeanor (or a felony reduced to a misdemeanor)', value: 'misd', next: 'misd_date_in' },
            { label: 'Level 6 felony / Class D felony', value: 'l6', next: 'l6_excluded_in' },
            { label: 'Level 4 or Level 5 felony', value: 'l45', next: 'l45_date_in' },
            { label: 'A serious felony (serious bodily injury, elected-official misconduct)', value: 'serious', next: 'serious_in' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_in' }
          ]
        },
        l6_excluded_in: {
          type: 'boolean',
          text: 'Did the offense involve bodily injury to another person?',
          yes: 'complex_l6_excluded_in',
          no: 'l6_date_in'
        },
        misd_date_in: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction (Ind. Code § 35-38-9-2 — misdemeanour; mandatory grant; earlier with prosecutor consent)' },
            nextPass: 'other_records_mand_in',
            nextFail: 'waiting_in'
          }
        },
        l6_date_in: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 8, unit: 'years', anchor: 'conviction (Ind. Code § 35-38-9-3 — Level 6/Class D felony; mandatory grant)' },
            nextPass: 'other_records_mand_in',
            nextFail: 'waiting_in'
          }
        },
        l45_date_in: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 8, unit: 'years', anchor: 'conviction, or 3 years post-sentence whichever later (Ind. Code § 35-38-9-4 — Level 4/5 felony; discretionary; record stays publicly marked)' },
            nextPass: 'other_records_disc_in',
            nextFail: 'waiting_in'
          }
        },
        serious_in: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'conviction (Ind. Code § 35-38-9-5 — serious felony; discretionary; also requires the prosecutor\'s written consent)' },
            nextPass: 'other_records_disc_in',
            nextFail: 'waiting_in'
          }
        },
        // THE ONE-PETITION-TIMING gate. Shared per grant type so the "no" branch
        // keeps its track identity.
        other_records_mand_in: {
          type: 'boolean',
          text: 'Do you have any OTHER arrests or convictions on your Indiana record — in this county or any other — that you might also want expunged someday?',
          yes: 'complex_timing_in',
          no: 'eligible_mandatory_in'
        },
        other_records_disc_in: {
          type: 'boolean',
          text: 'Do you have any OTHER arrests or convictions on your Indiana record — in this county or any other — that you might also want expunged someday?',
          yes: 'complex_timing_in',
          no: 'eligible_discretionary_in'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Indiana treats arrests without conviction (1 year, free) very differently from convictions (longer waits, and only one petition ever). Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. Indiana Legal Services has expungement materials, and the indy.gov Second Chance page walks through the categories.',
          remedy: 'Get Your Record First (Indiana Legal Services)',
          citation: 'Ind. Code § 35-38-9 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'Indiana expanded eligibility in 2022 to include some diversion participants (with prosecutor authorization), but the exact rules are not something this screening has researched in detail, so we would rather point you to someone than guess. And remember Indiana\'s one-petition-per-lifetime rule makes timing matter even here. Indiana Legal Services can tell you how your diversion is treated and how to time a petition.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Detailed)',
          citation: 'Ind. Code § 35-38-9-1 (diversion treatment not yet detailed)'
        },
        eligible_arrest_in: {
          status: 'eligible',
          title: 'Arrest Without Conviction — Free Expungement (Maybe Already Done)',
          message: 'Because this case did not end in a conviction, you can expunge the arrest under § 35-38-9-1 — it is free, and available 1 year after the arrest. Since 2022, Indiana also expunges some dismissed-case arrests AUTOMATICALLY, so check first whether yours was already done before filing anything. Here is the Indiana-specific thing to keep in mind even for a free arrest expungement: Indiana gives you ONE expungement petition in your lifetime for convictions, and while arrest expungements are treated more flexibly, if you also have convictions you may want expunged, it is worth talking to legal aid about sequencing before you file anything. Indiana Legal Services can advise.',
          remedy: 'Arrest Expungement (§ 35-38-9-1) — free; check if already automatic',
          citation: 'Ind. Code § 35-38-9-1'
        },
        eligible_mandatory_in: {
          status: 'eligible',
          title: 'Eligible — And the Grant Is Mandatory',
          message: 'Based on your dates and the fact that you told us you have no other records to worry about, you appear eligible to expunge this conviction, and the good news is that for a misdemeanor or a Level 6 / Class D felony the grant is MANDATORY — if you meet the criteria, the court must grant it. Petition the convicting court; the prosecutor has 30 days to object, and a hearing is possible. One thing to double-check before filing, because it is the whole ballgame in Indiana: you get only ONE expungement petition in your lifetime, so make sure this really is everything you would want expunged. Indiana Legal Services can confirm before you use your shot.',
          remedy: 'Petition to Expunge (§ 35-38-9-2 / 9-3) — mandatory grant, one lifetime petition',
          citation: 'Ind. Code §§ 35-38-9-2, 35-38-9-3'
        },
        eligible_discretionary_in: {
          status: 'eligible',
          title: 'Eligible — But a Judge Decides, and the Record Stays Publicly Marked',
          message: 'Based on your dates, you appear eligible to petition to expunge this felony — but set your expectations, because a higher-level felony works differently in Indiana. For a Level 4 or 5 felony, the grant is DISCRETIONARY: the judge weighs whether to grant it rather than being required to. And even when granted, the record is not hidden — it is publicly MARKED as "expunged" rather than sealed away. That is still meaningful relief (it carries legal protections against discrimination), but it is not the disappearance that the word suggests. The prosecutor has 30 days to object, and for the most serious felonies their written consent is required. Because this is discretionary and you get only one petition ever, this is worth doing with Indiana Legal Services.',
          remedy: 'Petition to Expunge (§ 35-38-9-4 / 9-5) — discretionary, record stays publicly marked',
          citation: 'Ind. Code §§ 35-38-9-4, 35-38-9-5'
        },
        complex_timing_in: {
          status: 'complex',
          title: 'You May Be Eligible — But in Indiana, Timing Is Everything',
          message: 'This is the most important thing to understand about Indiana, and it is why we are not just telling you to go file. You appear to be past the waiting period for this case. But Indiana gives you exactly ONE expungement petition in your entire life. It has to include everything you want expunged, all at once — and if your records are in more than one county, all those petitions have to be filed within a single 365-day window and together they count as your one shot. Because you told us you have other records, filing now on just this case could BURN that one petition and leave the rest permanently on your record. Here is the strategic part: if your other records are not eligible yet, it is often far better to WAIT until they are, so a single petition can clear everything together. This is genuinely worth a conversation with a lawyer before you file anything — Indiana Legal Services and the indy.gov Second Chance program help people sequence exactly this, and getting it right once beats getting it wrong forever.',
          remedy: 'Do NOT file yet — plan the timing with Indiana Legal Services (one petition, ever)',
          citation: 'Ind. Code § 35-38-9-9'
        },
        waiting_in: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Indiana\'s expungement waits run from your conviction: 5 years for a misdemeanor, 8 for a Level 6 or higher felony (or 3 years post-sentence, whichever is later, for the higher felonies), and 10 for the most serious. Based on your dates, yours has not run yet, and it also requires no new convictions and paid obligations. There is a silver lining to waiting in Indiana specifically: because you only get one petition ever, a not-yet-eligible record is a reason to hold off filing on your other cases too, so that one petition can eventually catch everything. Indiana Legal Services can help you plan the timing.',
          remedy: 'Wait for the period — and use the time to line up all your records',
          citation: 'Ind. Code § 35-38-9'
        },
        ineligible_excluded_in: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Expunged',
          message: 'Indiana never expunges murder or homicide-level offenses, sex crimes or offenses requiring sex or violent-offender registration, or official misconduct by a public official. This is categorical. If you have other, eligible records, those may still be expungeable — but given Indiana\'s one-petition rule, how you handle them matters, so it is worth a conversation with Indiana Legal Services rather than filing on your own. If your offense is genuinely on this never-list, executive clemency is the remaining route.',
          remedy: 'None (Never-Expungeable Offense) — clemency is the remaining route',
          citation: 'Ind. Code § 35-38-9-5'
        },
        complex_l6_excluded_in: {
          status: 'complex',
          title: 'A Bodily-Injury Offense Needs a Closer Look',
          message: 'A Level 6 or Class D felony is normally a mandatory expungement after 8 years — but offenses involving bodily injury to another person are treated differently and may fall outside that mandatory path or into a discretionary one. Because the § 9-3 exclusions are specific, we are not going to guess where yours lands. Indiana Legal Services can check your exact offense against the exclusion list — and given Indiana\'s one-petition-per-lifetime rule, having a lawyer look before you file is worth it regardless.',
          remedy: 'Consult Legal Aid (Level 6 Bodily-Injury Exclusion)',
          citation: 'Ind. Code § 35-38-9-3'
        },
        complex_level_in: {
          status: 'complex',
          title: 'We Need the Offense Classification',
          message: 'In Indiana the wait and whether a judge has discretion both depend on the level: 5 years for a misdemeanor (mandatory grant), 8 for a Level 6 or 4/5 felony (mandatory for Level 6, discretionary above), 10 for the most serious. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and Indiana Legal Services can read your record with you — which is worth doing anyway, because you only get one petition ever.',
          remedy: 'Get Your Offense Classification First (court paperwork / Indiana Legal Services)',
          citation: 'Ind. Code § 35-38-9'
        }
      }
    },
    resources: {
      remedies: {
        conviction: {
          name: 'Expungement of a Conviction (Ind. Code § 35-38-9)',
          formName: 'Petition for Expungement',
          formUrl: 'https://www.indianalegalservices.org/expungement',
          steps: [
            'Before anything: remember you get ONE petition in your lifetime. Line up ALL your eligible records first — multi-county records are separate petitions filed within a single 365-day window.',
            'File in the convicting court; the prosecutor has 30 days to object, and a hearing is possible.',
            'Misdemeanors and Level 6 felonies are mandatory grants if you qualify; higher felonies are discretionary and the record stays publicly marked.',
            'This is worth doing with Indiana Legal Services so you do not waste your one petition.'
          ],
          // null: Wave 4 gives "~$100 vicinity, county-set" and flags it.
          fees: null,
          feeWaiver: null,
          courtContact: 'The convicting court'
        },
        arrest: {
          name: 'Expungement of an Arrest / Non-Conviction (§ 35-38-9-1)',
          formName: 'Petition for Expungement of Arrest Records',
          formUrl: 'https://www.indianalegalservices.org/expungement',
          steps: [
            'Available 1 year after the arrest, and free by statute.',
            'Since 2022, some dismissed-case arrests expunge automatically — check whether yours already was.',
            'File in the court where the case was handled.'
          ],
          fees: '$0 — arrest/non-conviction petitions are free by statute.',
          feeWaiver: 'Not applicable (free).',
          courtContact: 'The court where the case was handled'
        }
      },
      legalAid: [
        { name: 'Indiana Legal Services (expungement)', url: 'https://www.indianalegalservices.org/expungement' },
        { name: 'indy.gov Second Chance (Marion County)', url: 'https://www.indy.gov' }
      ]
    }
  },

  // ==========================================================================
  // MISSOURI — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave4_Draft_Package.md
  //
  // THE QUIRK: the presumption is FOR expungement. When the statutory criteria
  // are met and pled, there is a REBUTTABLE PRESUMPTION for expungement and the
  // PROSECUTOR bears the burden to defeat it — unusually petitioner-friendly.
  //
  // Exclusion-list architecture: everything is expungeable UNLESS listed
  // (~1,900 offences qualify; 11 exception categories). The tree asks the
  // exclusion question, not an inclusion one.
  //
  // FRESH LAW (Jan 1, 2025, SB 754): lifetime limits raised to 2 felonies + 3
  // misdemeanours (was 1F+2M — many attorney sites still show the old numbers).
  // The surprise-yes: a first-time DWI can be expunged after 10 years with no
  // further alcohol offences (its own track).
  //
  // Waits (SB 53): felony 3 yrs, misdemeanour/ordinance/infraction 1 yr, from
  // completion of disposition; the clean period runs BACKWARD from filing.
  // ==========================================================================
  MO: {
    code: 'MO',
    name: 'Missouri',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave4_Draft_Package.md',
    terminology:
      'Missouri says EXPUNGEMENT, and it means a court-ordered sealing that restores you to your '
      + 'pre-offense status — in most situations you may lawfully deny it happened. Missouri is '
      + 'built as an exclusion list: almost everything qualifies UNLESS it is one of a set of '
      + 'excepted categories, so roughly 1,900 offenses are eligible. Two things make Missouri '
      + 'notably favorable. A fresh 2025 law raised the lifetime limits to 2 felonies plus 3 '
      + 'misdemeanors (many websites still show the old, lower numbers). And when you meet the '
      + 'criteria, the presumption is FOR expungement — the prosecutor has to prove why not.',
    keyDates: [
      {
        label: 'SB 754 — lifetime limits raised to 2 felonies + 3 misdemeanours',
        date: '2025-01-01',
        kind: 'effective',
        note: 'Was 1 felony + 2 misdemeanours. Many attorney sites still show the old numbers. Also: separate crimes in one case are no longer automatically counted as one; arrest expungements available at 18 months (was 3 years).',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the SB 754 counting change against the current § 610.140 text: separate crimes in one case are no longer automatically counted as one toward the limits, with a nuanced same-course-of-conduct exception. Wave 4 flags the exact text. The tree asks the person to self-assess their count for the 2-felony / 3-misdemeanour limits.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the first-time-DWI expungement track: Wave 4 says a first DWI can be expunged after 10 years with no further alcohol offenses, and flags the cite (likely § 610.130/.140 interplay). The tree routes a first DWI to its own 10-year result.',
        blocksFields: [],
      },
      {
        question:
          'FEE CONFLICT: Wave 4 gives "$250 statutory surcharge per one source vs standard circuit filing fee per another" and flags it as a phone target. Fee waiver by in-forma-pauperis motion. Confirm the actual fee with a circuit clerk.',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'What is the status of the 2022 Amendment XIV automatic marijuana expungement rollout? Wave 4 says courts are still processing and flags a status check. And confirm no Clean Slate automation bill passed this session (Wave 4 says pending, not law).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 610.140.3 exclusion list: Class A felonies, dangerous felonies (§ 556.061), death-element felonies, felony assault, ANY domestic assault, felony kidnapping, sex-registry offenses, most weapons offenses, intoxication-related traffic (except the first-DWI 10-year track), CDL offenses. The tree asks a person whether their offence is on it.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Mo. Rev. Stat. § 610.140 (expungement; exclusion list at .3; presumption)', url: null, retrievedOn: null },
      { id: 'Mo. Rev. Stat. § 610.130 (first-DWI expungement interplay)', url: null, retrievedOn: null },
      { id: 'Mo. Rev. Stat. § 556.061 (dangerous felony definitions — exclusion)', url: null, retrievedOn: null },
      { id: 'SB 754 (2025 — raised lifetime limits; counting change; 18-month arrest track)', url: null, retrievedOn: null },
      { id: 'SB 53 (2021 — waiting periods)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'dwi_mo' },
            { label: 'Dismissed / Arrested but not charged', value: 'dismissed', next: 'arrest_date_mo' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'arrest_date_mo' },
            { label: 'Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // First-DWI carve-out is checked before the general exclusion gate, since
        // DWI is otherwise excluded but a first one has its own 10-yr track.
        dwi_mo: {
          type: 'boolean',
          text: 'Was this offense a DWI (driving while intoxicated)?',
          yes: 'dwi_first_mo',
          no: 'excluded_mo'
        },
        dwi_first_mo: {
          type: 'boolean',
          text: 'Was this your FIRST alcohol-related driving offense, with no further alcohol offenses since?',
          yes: 'dwi_date_mo',
          no: 'ineligible_dwi_mo'
        },
        dwi_date_mo: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the disposition of the DWI?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of disposition (Mo. Rev. Stat. § 610.130/.140 — first-DWI track; no further alcohol offences)' },
            nextPass: 'eligible_dwi_mo',
            nextFail: 'waiting_mo'
          }
        },
        excluded_mo: {
          type: 'boolean',
          text: 'Was the offense any of these: a Class A felony, a "dangerous felony", a felony causing death, any felony assault, ANY domestic assault, felony kidnapping, a sex-registry offense, a weapons offense, or a CDL-related driving offense?',
          yes: 'ineligible_excluded_mo',
          no: 'count_mo'
        },
        count_mo: {
          type: 'choice',
          text: 'Counting your whole record (the 2025 law allows up to 2 felonies and 3 misdemeanors/ordinance violations expunged in a lifetime): where do you stand?',
          options: [
            { label: 'Within those limits (this would be within 2 felonies / 3 misdemeanors)', value: 'within', next: 'conv_level_mo' },
            { label: 'Already at or over those limits', value: 'over', next: 'ineligible_count_mo' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_count_mo' }
          ]
        },
        conv_level_mo: {
          type: 'choice',
          field: 'charge_type',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'misd_date_mo' },
            { label: 'Felony', value: 'felony', next: 'felony_date_mo' },
            { label: 'Infraction', value: 'infraction', next: 'misd_date_mo' },
            { label: 'I\'m not sure', value: 'unknown', next: 'complex_level_mo' }
          ]
        },
        misd_date_mo: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the disposition of the case (sentence and obligations done)?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'completion of disposition (Mo. Rev. Stat. § 610.140 — misdemeanour/ordinance; clean period runs backward from filing)' },
            nextPass: 'eligible_mo',
            nextFail: 'waiting_mo'
          }
        },
        felony_date_mo: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the disposition of the case (sentence and obligations done)?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'completion of disposition (Mo. Rev. Stat. § 610.140 — felony; clean period runs backward from filing)' },
            nextPass: 'eligible_mo',
            nextFail: 'waiting_mo'
          }
        },
        arrest_date_mo: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the arrest?',
          validation: {
            period: { amount: 18, unit: 'months', anchor: 'the arrest (Mo. Rev. Stat. § 610.140 — arrest without charge; cut to 18 months by SB 754, 2025)' },
            nextPass: 'eligible_arrest_mo',
            nextFail: 'waiting_arrest_mo'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Missouri\'s timing depends on how the case ended: an arrest without charge can be expunged at 18 months, a misdemeanor at 1 year, a felony at 3. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The courts.mo.gov self-help forms and clearmyrecordmo.org can help you figure out where you stand.',
          remedy: 'Get Your Record First (courts.mo.gov / clearmyrecordmo.org)',
          citation: 'Mo. Rev. Stat. § 610.140 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'Missouri\'s expungement rules are screened here for convictions and non-convictions. How a completed diversion is treated is not something this screening has researched in detail, so we would rather point you to someone than guess. clearmyrecordmo.org and Missouri legal aid can tell you how your disposition is treated. If it was marijuana-related, note that Missouri has a separate automatic expungement process from the 2022 Amendment XIV, which courts are still working through.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Detailed)',
          citation: 'Mo. Rev. Stat. § 610.140 (diversion treatment not yet detailed)'
        },
        eligible_arrest_mo: {
          status: 'eligible',
          title: 'Arrest Without Charge — Expungeable Now',
          message: 'Because this was an arrest that did not lead to a charge or conviction, you can petition to expunge it — and a 2025 law cut the wait to 18 months (it used to be 3 years), so you may qualify sooner than older guides suggest. File in the court of the case; the prosecutor has 30 days to object and the court must rule within 6 months. Missouri\'s petitioner-friendly presumption applies: when you meet the criteria, the burden is on the prosecutor to show why not.',
          remedy: 'Petition to Expunge an Arrest (§ 610.140) — 18-month wait',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        eligible_mo: {
          status: 'eligible',
          title: 'Potentially Eligible — And the Presumption Is on Your Side',
          message: 'Based on your dates and record, you appear eligible to expunge this conviction under § 610.140 — 1 year after completing a misdemeanor, 3 years after a felony. Missouri is unusually favorable here in two ways worth knowing. First, the 2025 law raised the lifetime limits to 2 felonies and 3 misdemeanors, so more people qualify than the older figures on most websites suggest. Second, when you meet the criteria, there is a rebuttable presumption FOR expungement — the prosecutor bears the burden of showing why it should not be granted, rather than you having to prove your case. File in the court of the case; the prosecutor has 30 days to object and the court must rule within 6 months. The filing fee has a documented discrepancy we are still confirming, and a fee waiver is available if you cannot afford it.',
          remedy: 'Petition to Expunge (§ 610.140) — presumption in your favor',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        eligible_dwi_mo: {
          status: 'eligible',
          title: 'First DWI, 10 Years Clean — This One Can Be Expunged',
          message: 'This is a route many people do not know exists. A DWI is normally excluded from expungement in Missouri — but a FIRST alcohol-related driving offense is an exception: it can be expunged 10 years after you completed the disposition, provided you have had no further alcohol offenses since. Based on your dates, that appears met. File in the court of the case. The same petitioner-friendly presumption applies once you meet the criteria. Because the DWI rules have specific interplay between statutes, clearmyrecordmo.org and Missouri legal aid are worth using to confirm.',
          remedy: 'Petition to Expunge a First DWI (§ 610.130/.140) — 10-year track',
          citation: 'Mo. Rev. Stat. §§ 610.130, 610.140'
        },
        waiting_mo: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Missouri\'s expungement waits run from when you completed the disposition: 1 year for a misdemeanor, 3 for a felony, and 10 for a first-DWI. Based on your dates, yours has not run yet. One Missouri-specific nuance worth understanding: the clean period is measured BACKWARD from when you file — you need no other convictions (beyond most traffic) in the year or three years before filing — so the relevant question is your record in the run-up to filing, not just elapsed time since this case.',
          remedy: 'Wait for the period (measured backward from filing)',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        waiting_arrest_mo: {
          status: 'waiting',
          title: 'Arrest — 18-Month Mark Not Yet Reached',
          message: 'An arrest without a charge can be expunged 18 months after the arrest (a 2025 law cut this from 3 years). Based on your dates, that has not run yet. Come back when it has — the process is quick and the presumption favors you.',
          remedy: 'Wait for the 18-month mark',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        ineligible_excluded_mo: {
          status: 'ineligible',
          title: 'This Offense Is on Missouri\'s Exclusion List',
          message: 'Missouri expunges almost everything, but it keeps a specific exclusion list: Class A felonies, "dangerous felonies", felonies causing death, any felony assault, ANY domestic assault, felony kidnapping, sex-registry offenses, most weapons offenses, and CDL-related driving offenses. No waiting period changes that. Because these are precise legal categories — "dangerous felony" in particular is a defined term — if you are not certain your offense is actually on the list, it is worth confirming rather than assuming. clearmyrecordmo.org and Missouri legal aid can check it against the current § 610.140.3 list.',
          remedy: 'None (Excluded Offense) — confirm against § 610.140.3',
          citation: 'Mo. Rev. Stat. § 610.140.3'
        },
        ineligible_dwi_mo: {
          status: 'ineligible',
          title: 'A Repeat DWI Cannot Be Expunged',
          message: 'Missouri allows expunging only a FIRST alcohol-related driving offense (after 10 years with nothing further). Because this was not your first, or there have been further alcohol offenses since, the DWI expungement route is not open. This is a firm rule. If you have other, non-alcohol offenses on your record, those may well be expungeable — run this again for them. clearmyrecordmo.org can confirm your DWI history and what else might qualify.',
          remedy: 'None (Repeat DWI) — other offenses may still qualify',
          citation: 'Mo. Rev. Stat. §§ 610.130, 610.140.3'
        },
        ineligible_count_mo: {
          status: 'ineligible',
          title: 'You Have Reached Missouri\'s Lifetime Limits',
          message: 'Missouri caps lifetime expungements at 2 felonies and 3 misdemeanors or ordinance violations (the 2025 law raised these from 1 and 2 — so double-check, because if you were relying on the old numbers you may actually have more room than you think). Based on what you told us, you are at or over the current limits. This is worth confirming carefully with someone, because the 2025 law also changed HOW offenses are counted — separate crimes in one case are no longer automatically treated as one, which cuts both ways. clearmyrecordmo.org has a law-change page built for exactly this, and Missouri legal aid can count your record properly.',
          remedy: 'Consult Legal Aid (Lifetime Limits) — the 2025 counting change may help',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        complex_count_mo: {
          status: 'complex',
          title: 'Your Record Count Needs Checking',
          message: 'Missouri lets you expunge up to 2 felonies and 3 misdemeanors in a lifetime, and the 2025 law changed both the numbers and the counting method, so where you stand is genuinely worth checking rather than guessing. Since you are not sure of your count, we are not going to assume. clearmyrecordmo.org has a page specifically on the law change and its counting rules, and Missouri legal aid can pull your record and count it against the current limits.',
          remedy: 'Get Your Record Counted (clearmyrecordmo.org / legal aid)',
          citation: 'Mo. Rev. Stat. § 610.140'
        },
        complex_level_mo: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Missouri the wait is 1 year for a misdemeanor and 3 for a felony. Since you are not sure which yours was, we are not going to guess. Your court paperwork states it, and courts.mo.gov has self-help forms. clearmyrecordmo.org can also help you read your record.',
          remedy: 'Get Your Offense Level First (court paperwork / courts.mo.gov)',
          citation: 'Mo. Rev. Stat. § 610.140'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Petition to Expunge (Mo. Rev. Stat. § 610.140)',
          formName: 'Missouri expungement petition (courts.mo.gov self-help forms)',
          formUrl: 'https://www.courts.mo.gov/page.jsp?id=98230',
          steps: [
            'Confirm your offense is not on the § 610.140.3 exclusion list and that you are within the lifetime limits (2 felonies / 3 misdemeanors, as of 2025).',
            'File in the court of the case; the prosecutor has 30 days to object.',
            'The court must rule within 6 months. When you meet the criteria, the presumption is FOR expungement.',
            'A fee waiver is available by in-forma-pauperis motion if you cannot afford the fee.'
          ],
          // null: Wave 4 gives a FEE CONFLICT ($250 surcharge vs standard circuit
          // fee) flagged as a phone target.
          fees: null,
          // NOT null: the in-forma-pauperis waiver is a named mechanism.
          feeWaiver: 'A fee waiver is available by in-forma-pauperis motion.',
          courtContact: 'The court of the case'
        }
      },
      legalAid: [
        { name: 'Clear My Record MO (law-change page + forms help)', url: 'https://www.clearmyrecordmo.org' },
        { name: 'Missouri Courts — Expungement self-help', url: 'https://www.courts.mo.gov/page.jsp?id=98230' }
      ]
    }
  },

  // ==========================================================================
  // MARYLAND — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave5_Draft_Package.md
  //
  // Cheap, broad, freshly reformed. The REDEEM Act (Oct 1, 2023) cut conviction
  // waits (eligible misdemeanours 5 yrs, second-degree assault 7, eligible
  // felonies 7, with burglary 1/2 + felony theft at 10). Several sites still
  // quote the un-passed 3/5-year version — encode the enacted numbers.
  //
  // PBJ (probation before judgment) is Maryland's signature disposition and has
  // its own 3-year branch.
  //
  // THE UNIT RULE, which blocks tons of Marylanders and needs its own node: all
  // charges in one case must be expungable or NONE are — except cannabis
  // charges (2023 carve-out). Encode current law; flag the 2025 session outcome.
  // ==========================================================================
  MD: {
    code: 'MD',
    name: 'Maryland',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave5_Draft_Package.md',
    terminology:
      'Maryland uses EXPUNGEMENT (Criminal Procedure § 10-101 and following). It is one of the '
      + 'cheaper and broader states, and it got broader in October 2023 when the REDEEM Act cut the '
      + 'waiting periods for convictions. Two Maryland-specific things shape the answer: PBJ '
      + '(probation before judgment) is a common disposition here with its own timeline, and there '
      + 'is a "unit rule" — every charge in a single case must be expungable, or none of them are, '
      + 'with a carve-out for cannabis. Non-conviction expungements are free; conviction petitions '
      + 'cost a small fee.',
    keyDates: [
      {
        label: 'REDEEM Act — conviction waiting periods cut',
        date: '2023-10-01',
        kind: 'effective',
        note: 'Eligible misdemeanours 5 yrs (was 10), second-degree assault 7 (was 15), eligible felonies 7, burglary 1/2 + felony theft 10 (was 15). Several sites still quote the un-passed 3/5-year version.',
      },
      {
        label: 'Automatic expungement of acquittals and full dismissals began',
        date: '2021-10',
        kind: 'operative',
        note: 'Wave 5 gives month and year only. NOT retroactive — older cases petition. Verify the mechanics.',
      },
    ],
    openQuestions: [
      {
        question:
          'What actually passed in Maryland\'s 2025 legislative session? Wave 5 flags a "2025 Expungement Reform Act" headline and says to verify what passed before encoding. The tree encodes the enacted REDEEM Act (2023) waits; confirm whether 2025 changed anything against the MVLS 2025 presentation.',
        blocksFields: [],
      },
      {
        question:
          'Does "sentence completed" for the conviction waiting clock include full expiration of parole and probation? Wave 5 flags this as contested (2024 HB 73 stalled). The tree anchors on completion of sentence including probation/parole; confirm current practice.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 10-110 eligible-offence list itself: Wave 5 notes REDEEM cut the WAITS but did NOT expand the eligible-offence list (mostly nonviolent misdemeanours plus a short felony list). The tree asks a person whether their offence is eligible; the list needs confirming.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the non-conviction mechanics: automatic expungement of acquittals/full dismissals since Oct 2021 (not retroactive), nolle prosequi (3-yr wait or immediate with general waiver), and stet (3 yrs). Wave 5 flags the nolle and automatic mechanics.',
        blocksFields: [],
      },
      {
        question:
          'What is the conviction petition fee? Wave 5 gives "$30 per petition, waivable" and flags it; non-conviction expungements are free. Confirm with a clerk.',
        blocksFields: ['resources.remedies.conviction.fees'],
      },
    ],
    sources: [
      { id: 'Md. Code, Crim. Proc. § 10-105 (expungement of non-convictions)', url: null, retrievedOn: null },
      { id: 'Md. Code, Crim. Proc. § 10-110 (expungement of convictions; eligible-offence list)', url: null, retrievedOn: null },
      { id: 'REDEEM Act (2023 — conviction waiting periods)', url: null, retrievedOn: null },
      { id: 'Md. Code, Crim. Proc. § 10-101 et seq. (expungement generally; unit rule; cannabis carve-out)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'unit_rule_md' },
            { label: 'Dismissed / Acquitted', value: 'dismissed', next: 'eligible_nonconviction_md' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_md' },
            { label: 'Probation Before Judgment (PBJ) / Stet / Diversion', value: 'deferred', next: 'pbj_date_md' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // THE UNIT RULE — its own node.
        unit_rule_md: {
          type: 'boolean',
          text: 'Did this case include any OTHER charge that is NOT eligible for expungement — for example a charge that resulted in a separate conviction that cannot be expunged? (In Maryland, every charge in one case must be expungable or none are — except cannabis charges.)',
          yes: 'complex_unit_md',
          no: 'cannabis_md'
        },
        cannabis_md: {
          type: 'boolean',
          text: 'Was this a simple cannabis (marijuana) possession offense?',
          yes: 'eligible_cannabis_md',
          no: 'eligible_offense_md'
        },
        eligible_offense_md: {
          type: 'choice',
          text: 'Which best describes the offense? (Maryland only expunges a specific list — mostly nonviolent misdemeanors plus a short felony list. Your court paperwork has the offense.)',
          options: [
            { label: 'An eligible misdemeanor', value: 'misd', next: 'misd_date_md' },
            { label: 'Second-degree assault', value: 'assault2', next: 'assault2_date_md' },
            { label: 'An eligible felony (short list — most felonies are NOT eligible)', value: 'felony', next: 'felony_date_md' },
            { label: 'Burglary (1st/2nd degree) or felony theft', value: 'burglary', next: 'burglary_date_md' },
            { label: 'I\'m not sure if my offense is on the eligible list', value: 'unsure', next: 'complex_offense_md' }
          ]
        },
        misd_date_md: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your entire sentence, including any probation or parole?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence including probation/parole (Md. Crim. Proc. § 10-110 — eligible misdemeanours; 5 yrs under the 2023 REDEEM Act)' },
            nextPass: 'eligible_conviction_md',
            nextFail: 'waiting_md'
          }
        },
        assault2_date_md: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your entire sentence, including any probation or parole?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'completion of sentence including probation/parole (Md. Crim. Proc. § 10-110 — second-degree assault; 7 yrs under REDEEM)' },
            nextPass: 'eligible_conviction_md',
            nextFail: 'waiting_md'
          }
        },
        felony_date_md: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your entire sentence, including any probation or parole?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'completion of sentence including probation/parole (Md. Crim. Proc. § 10-110 — eligible felonies; 7 yrs under REDEEM)' },
            nextPass: 'eligible_conviction_md',
            nextFail: 'waiting_md'
          }
        },
        burglary_date_md: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your entire sentence, including any probation or parole?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of sentence including probation/parole (Md. Crim. Proc. § 10-110 — burglary 1/2 and felony theft; 10 yrs under REDEEM)' },
            nextPass: 'eligible_conviction_md',
            nextFail: 'waiting_md'
          }
        },
        pbj_date_md: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you discharged from probation (for a PBJ or stet)?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'discharge from probation (Md. Crim. Proc. § 10-105 — PBJ and stet)' },
            nextPass: 'eligible_pbj_md',
            nextFail: 'waiting_pbj_md'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Maryland treats a conviction, a PBJ, and a dismissal on completely different timelines. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Maryland Court Help Centers offer free brief advice (statewide line on mdcourts.gov), and MVLS is the practitioner authority.',
          remedy: 'Get Your Record First (Maryland Court Help Centers)',
          citation: 'Md. Crim. Proc. § 10-101 et seq. (which path applies depends on the disposition)'
        },
        eligible_nonconviction_md: {
          status: 'eligible',
          title: 'No Conviction — Likely Already Expunged, or Free to Petition',
          message: 'Because your case ended without a conviction, Maryland has a fast, free path. Acquittals and full dismissals have been expunged AUTOMATICALLY since October 2021 — though that is not retroactive, so an older case may need a petition. Either way, non-conviction expungements are FREE. Check whether yours was already done through the Maryland Court Help Centers; if not, the petition costs nothing. If your case was a nolle prosequi or a stet, a short wait may apply instead.',
          remedy: 'Automatic or free petition expungement of a non-conviction (§ 10-105)',
          citation: 'Md. Crim. Proc. § 10-105'
        },
        eligible_pbj_md: {
          status: 'eligible',
          title: 'PBJ, Discharged 3+ Years Ago — Expungeable',
          message: 'Because you received a probation before judgment (PBJ) and were discharged more than 3 years ago, you are eligible to expunge this record under § 10-105. A PBJ is not a conviction, which is why the path is shorter. File the petition in the court of the case. The fee for a PBJ expungement is small (and non-conviction expungements are often free) — the Maryland Court Help Centers can confirm and help you file.',
          remedy: 'Petition to Expunge a PBJ (§ 10-105)',
          citation: 'Md. Crim. Proc. § 10-105'
        },
        eligible_conviction_md: {
          status: 'eligible',
          title: 'Potentially Eligible to Expunge This Conviction',
          message: 'Based on your dates, you appear eligible to expunge this conviction under § 10-110. The 2023 REDEEM Act cut the waiting periods — so if you last checked a while ago, you may be eligible sooner than you think (5 years for an eligible misdemeanor, 7 for second-degree assault or an eligible felony, 10 for burglary or felony theft, all from completing your sentence including probation and parole). File the petition (form CC-DC-CR-072) in the court of the case; the fee is about $30 and can be waived, and the prosecutor has 30 days to object. Completion typically takes around 90 days.',
          remedy: 'Petition to Expunge a Conviction (§ 10-110, form CC-DC-CR-072)',
          citation: 'Md. Crim. Proc. § 10-110'
        },
        eligible_cannabis_md: {
          status: 'eligible',
          title: 'Cannabis Possession — Petition Now, No Fee (and Check Your Court Record)',
          message: 'Simple cannabis possession has Maryland\'s easiest path: you can petition to expunge it immediately, and the fee is waived. One important thing many people do not realize, and it can save you confusion: Maryland\'s automatic cannabis expungement that took effect by July 2024 updated the state police (CJIS) database only — NOT the court records. So your state record may already look clear while the court file still shows the case. Filing this petition is what finishes the job on the court side. The Maryland Court Help Centers can help.',
          remedy: 'Cannabis Expungement Petition — immediate, no fee (court record separate from CJIS)',
          citation: 'Md. Crim. Proc. § 10-105'
        },
        waiting_md: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Maryland\'s conviction expungement waits, cut by the 2023 REDEEM Act, run from when you completed your sentence including any probation and parole: 5 years for an eligible misdemeanor, 7 for second-degree assault or an eligible felony, 10 for burglary or felony theft. Based on your dates, yours has not run yet. One nuance Maryland is still settling: exactly when the clock starts if you were on long probation or parole — so if you are close, it is worth confirming the start date with the Court Help Centers.',
          remedy: 'Wait for the REDEEM Act period from sentence completion',
          citation: 'Md. Crim. Proc. § 10-110'
        },
        waiting_pbj_md: {
          status: 'waiting',
          title: 'PBJ — 3-Year Wait Not Yet Met',
          message: 'A probation before judgment (PBJ) becomes expungeable 3 years after you are discharged from probation. Based on your dates, that has not run yet. Come back when it has — a PBJ expungement is one of Maryland\'s simpler and cheaper paths.',
          remedy: 'Wait for 3 years post-discharge',
          citation: 'Md. Crim. Proc. § 10-105'
        },
        complex_unit_md: {
          status: 'complex',
          title: 'The Unit Rule May Block This — Worth a Closer Look',
          message: 'Maryland has a rule that surprises people and blocks quite a few: every charge in a single case must be expungable, or none of them are. So if this case also included a charge that cannot be expunged, that can hold up the whole case — even the parts that would otherwise qualify. There is one important exception: cannabis charges are carved out of this rule (2023), so a non-cannabis conviction in the same case does not block the cannabis charge. Because whether a specific charge is "eligible" is a legal determination, this is worth having someone look at rather than assuming the worst. MVLS and the Maryland Court Help Centers can check whether the unit rule actually blocks you.',
          remedy: 'Consult Legal Aid (Unit Rule) — cannabis charges are exempt',
          citation: 'Md. Crim. Proc. § 10-101 et seq.'
        },
        complex_offense_md: {
          status: 'complex',
          title: 'We Need to Confirm the Offense Is on Maryland\'s List',
          message: 'Maryland only expunges a specific list of offenses — mostly nonviolent misdemeanors plus a short list of felonies — and the 2023 REDEEM Act cut the waits but did NOT add new offenses to that list. So the threshold question is whether YOUR offense is on it, and that is not something to guess at. Your court paperwork has the exact offense, and MVLS or the Maryland Court Help Centers can check it against § 10-110. If it is on the list, the wait is 5 to 10 years depending on the offense.',
          remedy: 'Confirm the Offense Is Eligible (§ 10-110) — MVLS / Court Help Centers',
          citation: 'Md. Crim. Proc. § 10-110'
        }
      }
    },
    resources: {
      remedies: {
        conviction: {
          name: 'Expungement of a Conviction (Md. Crim. Proc. § 10-110)',
          formName: 'Form CC-DC-CR-072 (and related series)',
          formUrl: 'https://www.mdcourts.gov/legalhelp/expungement',
          steps: [
            'Confirm the offense is on the § 10-110 eligible list and that no other charge in the case blocks it under the unit rule (cannabis charges are exempt).',
            'Confirm you are past the REDEEM Act wait from completing your sentence including probation/parole.',
            'File form CC-DC-CR-072 in the court of the case; the prosecutor has 30 days to object.',
            'The fee is about $30 and can be waived; completion typically takes around 90 days.'
          ],
          // null: Wave 5 gives "$30, waivable" and flags it.
          fees: null,
          // NOT null: waivability is stated independently of the amount.
          feeWaiver: 'The conviction petition fee can be waived; non-conviction expungements are free.',
          courtContact: 'The court of the case'
        }
      },
      legalAid: [
        { name: 'Maryland Court Help Centers (free brief advice)', url: 'https://www.mdcourts.gov/legalhelp' },
        { name: 'Maryland Volunteer Lawyers Service (MVLS)', url: 'https://www.mvlslaw.org' }
      ]
    }
  },

  // ==========================================================================
  // WISCONSIN — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave5_Draft_Package.md
  //
  // THE HONEST-NO TEMPLATE. Wis. Stat. § 973.015: expungement exists ONLY if the
  // judge ordered it AT SENTENCING, for offences committed BEFORE age 25, max
  // penalty 6 years or less. If the judge did not order it then, NO PETITION
  // PROCESS EXISTS (State v. Matasek / State v. Arberry closed the door). Reform
  // failed AGAIN in 2025. Almost everyone gets "no path; here is the pardon".
  //
  // Two honesty notes in every result: (1) if it WAS ordered, completion is
  // self-executing (State v. Hemp) and may already have happened — check CCAP.
  // (2) Expungement removes COURT records (CCAP) only; the DOJ Crime Information
  // Bureau record survives, so CIB-check employers still see it.
  //
  // Getting this page right — accurate, kind, useful — demonstrates the
  // product's integrity better than any generous state.
  // ==========================================================================
  WI: {
    code: 'WI',
    name: 'Wisconsin',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave5_Draft_Package.md',
    terminology:
      'Wisconsin expungement is unusually limited, and being honest about that is the whole point. '
      + 'Under Wis. Stat. § 973.015, a record can only be expunged if the JUDGE ORDERED it at the '
      + 'time of sentencing — for an offense committed before you turned 25, with a maximum penalty '
      + 'of six years or less. If the judge did not order it then, there is no later petition you '
      + 'can file; the courts have confirmed that door is closed. For most people, the real path is '
      + 'a Governor\'s pardon, which does not erase the record but restores rights. And even a '
      + 'granted expungement only clears the court record — the state Crime Information Bureau record '
      + 'survives, so some background checks still show it.',
    keyDates: [
      {
        label: 'Governor\'s pardon process revived',
        date: '2019',
        kind: 'operative',
        note: 'Wave 5 gives the year only. Felony convictions, generally 5 years post-sentence-completion, via the Pardon Advisory Board.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm no expungement-petition process passed in the 2025-26 Wisconsin session. Wave 5 says reform failed again — Evers put a petition process in the budget (LRB-1770), the Legislature stripped it; Assembly bills passed in 2021 and 2024 but the Senate never voted. As of the research date the answer is no. Verify nothing passed in the weeks since before softening the honest-no.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the current Governor\'s pardon criteria and wait: Wave 5 gives felony convictions, ~5 years post-sentence-completion, via the Pardon Advisory Board, with some expedited review since 2021. The tree routes most people here; confirm the criteria.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 973.015(1m)(a)3 exclusion list (listed violent Class H felonies and others) and the special tracks: juvenile § 938.355(4m) petition at 17, and trafficking-survivor § 973.015(2m) motion for prostitution convictions anytime. The tree asks the at-sentencing question; these are disclosed.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Wis. Stat. § 973.015 (expungement — at-sentencing only; under 25; max 6-yr penalty)', url: null, retrievedOn: null },
      { id: 'State v. Matasek; State v. Arberry (no post-sentencing petition process)', url: null, retrievedOn: null },
      { id: 'State v. Hemp (completion self-executing once ordered)', url: null, retrievedOn: null },
      { id: 'Wis. Stat. § 973.015(2m) (trafficking-survivor motion)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'ordered_wi' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconviction_wi' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconviction_wi' },
            { label: 'Diversion completed', value: 'deferred', next: 'unknown_deferred' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        // The single question that decides everything in Wisconsin.
        ordered_wi: {
          type: 'boolean',
          text: 'At your SENTENCING, did the judge order that this offense would be expunged upon your successful completion? (This had to be decided at sentencing — for an offense committed before you turned 25, with a maximum penalty of 6 years or less. If it was not ordered then, Wisconsin has no way to add it later.)',
          yes: 'completed_wi',
          no: 'pardon_path_wi'
        },
        completed_wi: {
          type: 'boolean',
          text: 'Have you successfully completed the sentence — no new convictions, probation not revoked, all conditions met, and fines paid?',
          yes: 'eligible_already_wi',
          no: 'waiting_wi'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Wisconsin\'s expungement rules are narrow and depend heavily on what happened at your sentencing. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. You can check your court record on Wisconsin\'s CCAP system, and the Wisconsin court system\'s expungement brochure explains the basics.',
          remedy: 'Get Your Record First (Wisconsin CCAP)',
          citation: 'Wis. Stat. § 973.015 (which path applies depends on the disposition)'
        },
        unknown_deferred: {
          status: 'complex',
          title: 'Diversion Cases Need a Person',
          message: 'How a completed diversion is treated in Wisconsin is not something this screening has researched in detail, and given how narrow Wisconsin\'s options are, it is worth talking to someone. Wisconsin legal aid can tell you whether your disposition left you a record to address and, if so, whether the pardon process is your route.',
          remedy: 'Consult Legal Aid (Diversion Not Yet Detailed)',
          citation: 'Wis. Stat. § 973.015'
        },
        eligible_nonconviction_wi: {
          status: 'eligible',
          title: 'No Conviction — Limited Record to Address',
          message: 'Because your case ended without a conviction, there is generally no conviction on your record. Wisconsin\'s court records (CCAP) may still show the case was filed, and CCAP does not remove non-conviction case entries the way some states do. If the case is showing and causing problems, Wisconsin legal aid can advise on your options — but there is no conviction here to expunge.',
          remedy: 'Generally no conviction to expunge — consult legal aid if the CCAP entry is a problem',
          citation: 'Wis. Stat. § 973.015'
        },
        eligible_already_wi: {
          status: 'eligible',
          title: 'It May Already Be Expunged — Check CCAP',
          message: 'Here is some good news that a lot of people miss: because the judge ordered expungement at your sentencing and you successfully completed the sentence, your expungement is SELF-EXECUTING — it happens automatically on completion, with no petition to file. It may already be done. Check the Wisconsin court records system (CCAP) to confirm the case has been expunged. One honest caveat to know, though: Wisconsin expungement removes the COURT record only. The state Department of Justice Crime Information Bureau (CIB) record survives, so an employer running a CIB background check may still see it. That is a real limit, not a technicality — but the court-record expungement is still meaningful.',
          remedy: 'Check CCAP — expungement is automatic on completion (but the CIB record survives)',
          citation: 'Wis. Stat. § 973.015'
        },
        waiting_wi: {
          status: 'waiting',
          title: 'Finish the Sentence — Then It Expunges Automatically',
          message: 'Your judge ordered expungement at sentencing, which is the hard part in Wisconsin — so you are on the right track. It has not happened yet because it triggers on SUCCESSFUL completion: no new convictions, probation not revoked, all conditions met, and fines paid. Once you finish all of that, the expungement is automatic — you do not file anything. Stay on track and it will happen. One thing to know for later: it clears the court record but not the state Crime Information Bureau record, which survives.',
          remedy: 'Complete the sentence successfully — expungement is then automatic',
          citation: 'Wis. Stat. § 973.015'
        },
        pardon_path_wi: {
          status: 'complex',
          title: 'No Expungement Path — But a Pardon Is a Real Route',
          message: 'We are going to be straight with you, because Wisconsin is unusual and a lot of tools are not honest about it. If the judge did NOT order expungement at your sentencing, there is no way to add it now — Wisconsin has no petition process to expunge a conviction after the fact, and the courts have confirmed that. That is a hard no on expungement, and we would rather tell you plainly than send you chasing a filing that does not exist. But it is not the end of the road. The real path in Wisconsin is a GOVERNOR\'S PARDON, and the process is active — you can generally apply 5 years after completing your sentence for a felony. A pardon does not erase the record, but it restores your rights and removes many barriers, and Wisconsin has been granting them. Apply through the Governor\'s Pardon Advisory Board (evers.wi.gov has the information). If you were under 18, or your conviction was a trafficking-related prostitution offense, there are separate narrow routes worth asking legal aid about.',
          remedy: 'Governor\'s Pardon (Pardon Advisory Board) — no expungement path exists',
          citation: 'Wis. Stat. § 973.015; State v. Matasek'
        }
      }
    },
    resources: {
      remedies: {
        pardon: {
          name: 'Governor\'s Pardon (the route for most Wisconsin convictions)',
          formName: 'Pardon Application (Governor\'s Pardon Advisory Board)',
          formUrl: 'https://evers.wi.gov/Pages/Pardon-Information.aspx',
          steps: [
            'Confirm expungement is not already available: it exists only if the judge ordered it at sentencing (for an offense before age 25, max penalty 6 years) — if so, it is automatic on completion, no application.',
            'For everything else, apply for a Governor\'s pardon — generally 5 years after completing your sentence for a felony.',
            'Apply through the Governor\'s Pardon Advisory Board (evers.wi.gov).',
            'A pardon restores rights and removes barriers, but does not erase the record.'
          ],
          fees: '$0 — there is no statutory fee for the at-sentencing expungement mechanism or the pardon application.',
          feeWaiver: 'Not applicable.',
          courtContact: 'Governor\'s Pardon Advisory Board'
        }
      },
      legalAid: [
        { name: 'Wisconsin Governor — Pardon Information', url: 'https://evers.wi.gov/Pages/Pardon-Information.aspx' },
        { name: 'Wisconsin Court System — Expungement information', url: 'https://www.wicourts.gov' }
      ]
    }
  },

  // ==========================================================================
  // SOUTH CAROLINA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave5_Draft_Package.md
  //
  // THE STRUCTURAL QUIRK: you apply through the circuit SOLICITOR'S office (a
  // prosecutor), not the court. The solicitor determines eligibility,
  // coordinates SLED verification, and processes the order. "Where do I go" is a
  // prosecutor's office — that surprises people, so every result says it.
  //
  // Convictions are a CLOSED LIST of specific first-offence statutes (§ 22-5-910
  // low-penalty first offence 3yr; § 22-5-920 Youthful Offender Act 5yr once-
  // ever; § 22-5-930 first-offence drug possession 3yr; and niche ones).
  // Everything else -> pardon only. The general first-offence bill (§ 17-22-915)
  // is NOT law as of the research date — encode current law, flag the bill.
  //
  // Fees: $310 total ($250 solicitor + $25 SLED + $35 clerk), separate money
  // orders. Summary-court dismissals auto-expunge free since 2009.
  // ==========================================================================
  SC: {
    code: 'SC',
    name: 'South Carolina',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave5_Draft_Package.md',
    terminology:
      'South Carolina EXPUNGEMENT (an Order for Destruction of Arrest Records) works differently '
      + 'from most states in one big way: you apply through the circuit SOLICITOR\'S office — a '
      + 'prosecutor\'s office — not the court. The solicitor decides eligibility, coordinates the '
      + 'SLED record check, and processes the order. Which convictions can be expunged is a short, '
      + 'closed list of specific first-offense situations; most everything else routes to a pardon. '
      + 'Non-conviction cases from the lower (summary) courts have been expunged automatically and '
      + 'for free since 2009.',
    keyDates: [
      {
        label: 'Automatic free expungement of summary-court non-convictions',
        date: '2009-06',
        kind: 'operative',
        note: 'Wave 5 gives month and year only. Magistrate/municipal dismissals and not-guilty verdicts (§ 17-22-950).',
      },
    ],
    openQuestions: [
      {
        question:
          'Did the general first-offense nonviolent expungement bill (§ 17-22-915, H.4602 / H.3730) become law? Wave 5 says it has been filed repeatedly and was NOT law as of the research date — verify the session status. If it passed, South Carolina changes fundamentally (a broad 3-year path). The tree encodes current law (the closed statute list); confirm nothing passed.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the $310 fee breakdown and refund mechanics: Wave 5 gives $250 solicitor admin + $25 SLED verification + $35 clerk, separate money orders, nonrefundable if denied at the SLED stage but the $35 returns if the solicitor rejects. Confirm current amounts and the refund rule (per the 14th circuit\'s description).',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'Confirm the plea-deal dismissal fee rule: Wave 5 says General Sessions dismissals/nolle pros are free through the solicitor if NOT part of a plea deal, but plea-deal dismissals pay full fees. Verify.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the § 22-5-930 first-offense drug-possession conditional-discharge 10-year lookback quirk, and the § 22-5-920 Youthful Offender Act retroactive path for pre-2010 convictions. The tree uses the standard 3-yr and 5-yr periods; these nuances are flagged.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'S.C. Code § 17-22-910 et seq. (Uniform Expungement of Criminal Records Act; solicitor process)', url: null, retrievedOn: null },
      { id: 'S.C. Code § 17-22-950 (automatic summary-court non-conviction expungement)', url: null, retrievedOn: null },
      { id: 'S.C. Code § 22-5-910 (first-offence low-penalty conviction; 3 yrs)', url: null, retrievedOn: null },
      { id: 'S.C. Code § 22-5-920 (Youthful Offender Act convictions; 5 yrs; once per lifetime)', url: null, retrievedOn: null },
      { id: 'S.C. Code § 22-5-930 (first-offence drug possession; 3 yrs)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'conv_type_sc' },
            { label: 'Dismissed / Charges dropped', value: 'dismissed', next: 'court_type_sc' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'court_type_sc' },
            { label: 'PTI / Diversion completed', value: 'deferred', next: 'eligible_diversion_sc' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        court_type_sc: {
          type: 'boolean',
          text: 'Was the case in a summary court — a magistrate court or a municipal court (for a lower-level offense) — rather than General Sessions (the main trial court)?',
          yes: 'eligible_auto_sc',
          no: 'eligible_gs_dismissal_sc'
        },
        conv_type_sc: {
          type: 'choice',
          text: 'South Carolina only expunges a few specific first-offense situations. Which, if any, describes yours?',
          options: [
            { label: 'A first-offense conviction with a penalty of 30 days or less, or a $1,000 fine or less', value: 's910', next: 's910_date_sc' },
            { label: 'A Youthful Offender Act conviction (I was 17 to 24, non-violent, no registry)', value: 's920', next: 's920_date_sc' },
            { label: 'A first-offense simple drug possession or minor drug offense', value: 's930', next: 's930_date_sc' },
            { label: 'None of these — it was a more serious offense, a DUI, or a repeat offense', value: 'other', next: 'pardon_path_sc' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_conv_sc' }
          ]
        },
        s910_date_sc: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction, conviction-free (S.C. Code § 22-5-910 — first-offence low-penalty; DV 3rd degree is 5 yrs)' },
            nextPass: 'eligible_conviction_sc',
            nextFail: 'waiting_sc'
          }
        },
        s920_date_sc: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the sentence?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'sentence completion (S.C. Code § 22-5-920 — Youthful Offender Act; non-violent; no registry; once per lifetime)' },
            nextPass: 'eligible_yoa_sc',
            nextFail: 'waiting_sc'
          }
        },
        s930_date_sc: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction (S.C. Code § 22-5-930 — first-offence drug possession; conditional-discharge lookback may apply)' },
            nextPass: 'eligible_conviction_sc',
            nextFail: 'waiting_sc'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'South Carolina treats non-convictions and its short list of expungeable convictions very differently. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The sccourts.org expungement FAQ is current and good, and the solicitor\'s office in your circuit is where expungement is actually handled.',
          remedy: 'Get Your Record First (sccourts.org / circuit solicitor)',
          citation: 'S.C. Code § 17-22-910 et seq. (which path applies depends on the disposition)'
        },
        eligible_diversion_sc: {
          status: 'eligible',
          title: 'Completed Diversion or PTI — Expungeable',
          message: 'Because you completed a pretrial intervention (PTI) or diversion program, that case is expungeable. Here is the South Carolina-specific thing to know: you apply through the SOLICITOR\'S office (the prosecutor) in your circuit, not the court — the solicitor handles eligibility and processing. Many PTI programs include the expungement as part of completion, so check whether yours was already done. The sccourts.org FAQ explains the process.',
          remedy: 'Expungement through the Circuit Solicitor (PTI/diversion)',
          citation: 'S.C. Code § 17-22-910 et seq.'
        },
        eligible_auto_sc: {
          status: 'eligible',
          title: 'Summary-Court Non-Conviction — Should Be Automatic and Free',
          message: 'Because your case ended without a conviction in a summary court (magistrate or municipal), South Carolina should have expunged it AUTOMATICALLY and for FREE — this has been the rule since 2009 (§ 17-22-950). So there may be nothing for you to do. Request your record to confirm the expungement went through; if it did not, the solicitor\'s office in your circuit can correct it. This is the one South Carolina path that does not run up the usual fees.',
          remedy: 'Automatic Free Expungement (§ 17-22-950) — check it was applied',
          citation: 'S.C. Code § 17-22-950'
        },
        eligible_gs_dismissal_sc: {
          status: 'eligible',
          title: 'General Sessions Dismissal — Expungeable Through the Solicitor',
          message: 'Because your General Sessions case ended without a conviction, you can have it expunged — through the SOLICITOR\'S office (the prosecutor) in your circuit, which is where South Carolina handles this rather than the court. One thing that affects the cost: if the dismissal was NOT part of a plea deal, it is generally free; if it came as part of a plea agreement, the full fees may apply. The sccourts.org FAQ and your circuit solicitor\'s application page explain the process.',
          remedy: 'Expungement through the Circuit Solicitor (free if not part of a plea deal)',
          citation: 'S.C. Code § 17-22-910 et seq.'
        },
        eligible_conviction_sc: {
          status: 'eligible',
          title: 'Eligible First-Offense Conviction — Apply Through the Solicitor',
          message: 'Based on your dates, this first-offense conviction appears eligible for expungement. Two South Carolina-specific things to know. First, you apply through the SOLICITOR\'S office in your circuit — the prosecutor, not the court — and they coordinate the SLED record check and process the order. Second, the cost: expungement in South Carolina runs about $310 total ($250 to the solicitor, $25 for SLED verification, $35 to the clerk), typically in separate money orders. The sccourts.org FAQ walks through it, and your circuit solicitor\'s page has the application.',
          remedy: 'Expungement through the Circuit Solicitor (§ 22-5-910 / 930)',
          citation: 'S.C. Code §§ 22-5-910, 22-5-930'
        },
        eligible_yoa_sc: {
          status: 'eligible',
          title: 'Youthful Offender Act Conviction — Eligible, Once in a Lifetime',
          message: 'Because this was a Youthful Offender Act conviction (you were 17 to 24, it was non-violent, and it is not a registry offense) and you completed your sentence more than 5 years ago, you appear eligible to expunge it under § 22-5-920. One important limit: this route can be used only ONCE in your lifetime, so if you have more than one YOA conviction you might clear, it is worth being deliberate about which. You apply through the SOLICITOR\'S office in your circuit, and the cost is about $310 total. If your conviction is from before 2010, there is a retroactive YOA path worth asking about.',
          remedy: 'YOA Expungement through the Circuit Solicitor (§ 22-5-920) — once per lifetime',
          citation: 'S.C. Code § 22-5-920'
        },
        waiting_sc: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'South Carolina\'s conviction expungement waits are 3 years for a first-offense low-penalty conviction or a first drug-possession offense (5 years for a third-degree DV), and 5 years after sentence completion for a Youthful Offender Act conviction. Based on your dates, yours has not run yet, and it requires staying conviction-free. When the time comes, you apply through the solicitor\'s office in your circuit.',
          remedy: 'Wait for the period (conviction-free), then apply through the solicitor',
          citation: 'S.C. Code §§ 22-5-910, 22-5-920, 22-5-930'
        },
        pardon_path_sc: {
          status: 'complex',
          title: 'This Conviction Is Not on the Expungement List — A Pardon Is the Route',
          message: 'We will be straight with you: South Carolina only expunges a short, specific list of first-offense situations, and most convictions — including more serious offenses, DUIs, and repeat offenses — are not on it. There is no general expungement for them, however long ago they were. But there is a real route, and it is worth pursuing: a PARDON from the South Carolina Board of Probation, Parole and Pardon Services. A pardon does not erase the record, but it removes many of the barriers a conviction creates and restores rights. One thing to watch: South Carolina\'s legislature has repeatedly considered a broad first-offense expungement bill, and if it passes, more convictions would become expungeable — so it is worth checking current law. The sccourts.org resources and the Pardon board can point you to the right path.',
          remedy: 'Pardon (Board of Probation, Parole and Pardon Services) — not on the expungement list',
          citation: 'S.C. Code § 17-22-910 et seq.'
        },
        complex_conv_sc: {
          status: 'complex',
          title: 'We Need to Match Your Conviction to the List',
          message: 'South Carolina expunges only a few specific first-offense situations — a low-penalty first offense, a Youthful Offender Act conviction, or a first drug-possession offense — and everything else needs a pardon instead. Since you are not sure which, if any, fits your case, we are not going to guess, because it is the difference between a straightforward expungement and no expungement at all. Your court paperwork has the offense and penalty, and the solicitor\'s office in your circuit determines eligibility as a matter of course. The sccourts.org FAQ is a good starting point.',
          remedy: 'Match Your Conviction to the List (court paperwork / circuit solicitor)',
          citation: 'S.C. Code § 17-22-910 et seq.'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement through the Circuit Solicitor (S.C. Code § 17-22-910 et seq.)',
          formName: 'Application for Expungement (filed with the circuit solicitor)',
          formUrl: 'https://www.sccourts.org/selfHelp/',
          steps: [
            'Identify your circuit\'s solicitor office — that is where South Carolina expungements are handled, not the court.',
            'For a summary-court non-conviction, it should already be automatic and free (since 2009) — check first.',
            'For an eligible conviction or a General Sessions dismissal, file the application with the solicitor; they coordinate the SLED verification.',
            'Budget for the fees: about $310 total ($250 solicitor, $25 SLED, $35 clerk), typically in separate money orders — with exemptions for non-plea-deal dismissals.'
          ],
          // null: Wave 5 gives the $310 breakdown but flags current amounts and
          // the refund mechanics.
          fees: null,
          feeWaiver: null,
          courtContact: 'The circuit solicitor\'s office (16 judicial circuits)'
        }
      },
      legalAid: [
        { name: 'South Carolina Courts — Expungement self-help', url: 'https://www.sccourts.org/selfHelp/' },
        { name: 'SC Appleseed Legal Justice Center', url: 'https://www.scjustice.org' }
      ]
    }
  },

  // ==========================================================================
  // ALABAMA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave5_Draft_Package.md
  //
  // Broad-ish law, brutal fee. Ala. Code § 15-27 (2014 + 2021 REDEEMER Act). No
  // automatic anything. THE HEADLINE IS THE FEE: $500 administrative filing fee
  // per case/arrest event (raised from $300; Act 2024-407) — the highest flat
  // fee in the country alongside Louisiana. One fee covers multiple charges from
  // the same arrest. Indigency relief exists (the main AL call question). The
  // fee leads the copy.
  //
  // Non-convictions: petition after 90 days (dismissed-with-prejudice, no-bill,
  // acquittal, unconditional nolle); diversion/specialty-court completions 1 yr.
  // Misdemeanour convictions (REDEEMER): 3 yrs; DUI counts as serious traffic
  // (explicitly since Jul 1, 2023) so never. Felonies: pardon-first + 180 days.
  // ==========================================================================
  AL: {
    code: 'AL',
    name: 'Alabama',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave5_Draft_Package.md',
    terminology:
      'Alabama EXPUNGEMENT (Ala. Code § 15-27) is reasonably broad in what it covers but expensive '
      + 'to use: there is a flat $500 administrative filing fee per arrest event, one of the highest '
      + 'in the country, though one fee covers all the charges from a single arrest and an indigency '
      + 'waiver exists. Nothing is automatic — everything is a petition to the circuit court. '
      + 'Non-convictions can be petitioned relatively quickly; misdemeanor convictions after 3 years '
      + 'under the 2021 REDEEMER Act; and felonies only after a full pardon.',
    keyDates: [
      {
        label: '$500 administrative filing fee (raised from $300, Act 2024-407)',
        date: '2024-10-01',
        kind: 'effective',
        note: 'Per case/arrest event. One fee covers multiple charges from the same arrest. Confirm the current amount.',
      },
      {
        label: 'REDEEMER Act — misdemeanour conviction expungement',
        date: '2021-07-01',
        kind: 'effective',
        note: '3 years from conviction. DUI was explicitly made a "serious traffic" offence (never expungeable) as of July 1, 2023.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the current administrative filing fee: Wave 5 gives $500 per case/arrest event (raised from $300 by Act 2024-407, effective Oct 1, 2024) and flags it. This is the main Alabama call. Confirm the amount and, critically, the § 15-27-4 indigency-relief mechanics with a circuit clerk.',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Confirm the § 15-27-2.1 lifetime cap: Wave 5 says secondary sources report 2 misdemeanour-conviction expungements lifetime, and flags verifying the section text. The tree does not gate on this (it cannot count priors); it is disclosed in prose.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the felony pardon-then-expunge mechanics: a full pardon with restoration of civil and political rights from the Board of Pardons and Paroles, plus 180 days from the certificate, not violent/sex/moral-turpitude/serious-traffic, 1 pardoned-felony expungement lifetime. Also the Act 2015-185 reclassified-felony exception (15-yr clean record).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the moral-turpitude offence list that bars misdemeanour-conviction expungement alongside violent, sex, and serious-traffic offences. The tree asks a person whether their offence is excluded; the moral-turpitude list is specific and needs confirming.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Ala. Code § 15-27-1 (non-conviction expungement)', url: null, retrievedOn: null },
      { id: 'Ala. Code § 15-27-2 (misdemeanour/felony conviction expungement; REDEEMER Act)', url: null, retrievedOn: null },
      { id: 'Ala. Code § 15-27-2.1 (lifetime caps)', url: null, retrievedOn: null },
      { id: 'Ala. Code § 15-27-4 (fees; indigency relief)', url: null, retrievedOn: null },
      { id: 'Act 2024-407 ($500 fee); REDEEMER Act 2021; Act 2015-185 (reclassified felonies)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_al' },
            { label: 'Dismissed with prejudice / No-billed / Charges dropped', value: 'dismissed', next: 'nonconv_date_al' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_date_al' },
            { label: 'Diversion / Drug court / Mental health court / Veterans court (Completed)', value: 'deferred', next: 'diversion_date_al' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_al: {
          type: 'boolean',
          text: 'Was the offense a violent offense, a sex offense, a DUI or other serious traffic offense, or a "moral turpitude" offense?',
          yes: 'excluded_path_al',
          no: 'conv_level_al'
        },
        excluded_path_al: {
          type: 'boolean',
          text: 'Was it specifically a DUI?',
          yes: 'ineligible_dui_al',
          no: 'conv_level_al_excluded'
        },
        conv_level_al: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'misd_date_al' },
            { label: 'Felony', value: 'felony', next: 'pardon_path_al' },
            { label: 'Infraction', value: 'infraction', next: 'misd_date_al' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_al' }
          ]
        },
        misd_date_al: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted? (You must also have completed all supervision and paid everything owed.)',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction, supervision complete and all paid (Ala. Code § 15-27-2 — misdemeanour; REDEEMER Act)' },
            nextPass: 'eligible_misd_al',
            nextFail: 'waiting_al'
          }
        },
        nonconv_date_al: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case dismissed, no-billed, or acquitted?',
          validation: {
            period: { amount: 90, unit: 'days', anchor: 'dismissal/no-bill/acquittal (Ala. Code § 15-27-1 — non-conviction; 90 days)' },
            nextPass: 'eligible_nonconviction_al',
            nextFail: 'waiting_nonconv_al'
          }
        },
        diversion_date_al: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the diversion or specialty-court program?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'completion of diversion/specialty court (Ala. Code § 15-27-1 — 1 year)' },
            nextPass: 'eligible_nonconviction_al',
            nextFail: 'waiting_nonconv_al'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Alabama treats non-convictions (petition after 90 days), misdemeanor convictions (3 years), and felonies (pardon first) on completely different tracks — and the fee is significant, so it is worth being sure before filing. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Montgomery Volunteer Lawyers Program handout is practitioner-grade, and a circuit clerk can confirm your disposition.',
          remedy: 'Get Your Record First (circuit clerk / MVLP)',
          citation: 'Ala. Code § 15-27 (which path applies depends on the disposition)'
        },
        eligible_nonconviction_al: {
          status: 'eligible',
          title: 'No Conviction — Eligible to Petition (Mind the Fee)',
          message: 'Because your case ended without a conviction — dismissed with prejudice, no-billed, acquitted, or a completed diversion — you are eligible to petition to expunge it, and there is no limit on how many non-conviction expungements you can get. The catch in Alabama is the cost: there is a $500 administrative filing fee per arrest event (though one fee covers all the charges from the same arrest), plus court costs. That fee is the single most important thing to plan for. Critically, Alabama has an indigency provision that can waive or reduce it if you cannot afford it — asking the circuit clerk about that is the most valuable question you can ask. File in the circuit court of the county where the charges were filed.',
          remedy: 'Non-Conviction Expungement Petition (§ 15-27-1) — ask about the indigency waiver',
          citation: 'Ala. Code § 15-27-1'
        },
        eligible_misd_al: {
          status: 'eligible',
          title: 'Misdemeanor Conviction — Eligible Under REDEEMER (Mind the Fee)',
          message: 'Based on your dates — 3 years since conviction, with all supervision complete and everything paid — this misdemeanor appears eligible for expungement under Alabama\'s 2021 REDEEMER Act. Two things to plan for. The fee: $500 per arrest event, the main hurdle, though one fee covers all charges from the same arrest — and there is an indigency provision to ask the clerk about if you cannot afford it. And a lifetime limit: Alabama caps how many misdemeanor-conviction expungements you can get, so it is worth being deliberate. File in the circuit court of the county where the charges were filed.',
          remedy: 'Misdemeanor Expungement Petition (§ 15-27-2) — ask about the indigency waiver',
          citation: 'Ala. Code § 15-27-2'
        },
        waiting_al: {
          status: 'waiting',
          title: 'Three-Year Wait Not Yet Met',
          message: 'A misdemeanor conviction becomes expungeable in Alabama 3 years after conviction, provided all supervision is complete and everything owed is paid. Based on your dates, that has not run yet. Getting any outstanding balance paid matters, since the requirements include full payment. When the time comes, remember to budget for the $500 fee — and ask about the indigency waiver.',
          remedy: 'Wait for 3 years (supervision complete, all paid)',
          citation: 'Ala. Code § 15-27-2'
        },
        waiting_nonconv_al: {
          status: 'waiting',
          title: 'Short Wait Not Yet Met',
          message: 'A non-conviction can be expunged 90 days after the dismissal, no-bill, or acquittal, and a completed diversion after 1 year. Based on your dates, that short period has not quite run yet. Come back when it has — and budget for the $500 fee, or ask the clerk about the indigency waiver.',
          remedy: 'Wait out the short period (90 days / 1 year)',
          citation: 'Ala. Code § 15-27-1'
        },
        ineligible_dui_al: {
          status: 'ineligible',
          title: 'DUI Cannot Be Expunged',
          message: 'As of July 1, 2023, Alabama explicitly treats a DUI as a "serious traffic" offense, which cannot be expunged. This is a firm rule, so be cautious of any service suggesting otherwise. If you have a non-conviction or a different, eligible conviction on your record, those may still qualify — run this again for them. The Montgomery Volunteer Lawyers Program can confirm your options.',
          remedy: 'None (DUI / Serious Traffic)',
          citation: 'Ala. Code § 15-27-2'
        },
        conv_level_al_excluded: {
          status: 'ineligible',
          title: 'This Offense Is Excluded From Expungement',
          message: 'Alabama does not expunge violent offenses, sex offenses, or "moral turpitude" offenses. No waiting period changes that for a conviction. Because "moral turpitude" is a specific legal category and not always obvious, if you are not certain your offense is actually on that list it is worth confirming rather than assuming. For a felony, the route may still exist through a pardon (see below). The Montgomery Volunteer Lawyers Program can check where your offense falls.',
          remedy: 'None (Excluded Offense) — confirm the classification; a pardon may help a felony',
          citation: 'Ala. Code § 15-27-2'
        },
        pardon_path_al: {
          status: 'complex',
          title: 'For a Felony, the Path Runs Through a Pardon First',
          message: 'Alabama does not expunge a felony conviction directly — but it is a road, not a wall. The route is to obtain a FULL PARDON with restoration of your civil and political rights from the Board of Pardons and Paroles first, and then, 180 days after the pardon certificate, you can petition to expunge (for one pardoned felony in your lifetime, and not for violent, sex, moral-turpitude, or serious-traffic offenses). There is also a narrower path for certain felonies reclassified by a 2015 law if you have a 15-year clean record. It is more steps and it carries the $500 expungement fee at the end, but people do complete it. The Board of Pardons and Paroles handles the pardon, and the Montgomery Volunteer Lawyers Program can map the full sequence.',
          remedy: 'Full Pardon (Board of Pardons and Paroles), then Expungement 180 days later',
          citation: 'Ala. Code § 15-27-2'
        },
        complex_level_al: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'In Alabama the path is different by level: a misdemeanor can be expunged 3 years after conviction, while a felony requires a full pardon first. Since you are not sure which yours is, we are not going to guess, especially given the $500 fee at stake. Your court paperwork states it, and the Montgomery Volunteer Lawyers Program can read your record with you.',
          remedy: 'Get Your Conviction Level First (court paperwork / MVLP)',
          citation: 'Ala. Code § 15-27-2'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement Petition (Ala. Code § 15-27)',
          formName: 'Petition for Expungement (circuit court)',
          formUrl: 'https://eforms.alacourt.gov',
          steps: [
            'Confirm eligibility: non-convictions after 90 days (diversion after 1 year), misdemeanor convictions after 3 years, felonies only after a full pardon plus 180 days.',
            'File in the circuit court of the county where the charges were filed.',
            'Budget for the $500 administrative filing fee per arrest event (one fee covers all charges from the same arrest), plus court costs.',
            'If you cannot afford it, ask the clerk about the § 15-27-4 indigency provision — this is the most important question in an Alabama expungement.'
          ],
          // null: Wave 5 gives $500 (Act 2024-407) but flags confirming the
          // current amount and the indigency mechanics.
          fees: null,
          // NOT null: the indigency provision is a named, independent mechanism.
          feeWaiver: 'Alabama\'s § 15-27-4 has an indigency provision that can waive or reduce the fee — ask the clerk.',
          courtContact: 'Circuit court of the county where the charges were filed'
        }
      },
      legalAid: [
        { name: 'Montgomery Volunteer Lawyers Program (CLE handout)', url: 'https://www.montgomeryvlp.org' },
        { name: 'Alabama Board of Pardons and Paroles', url: 'https://paroles.alabama.gov' }
      ]
    }
  },

  // ==========================================================================
  // LOUISIANA — DRAFT. Nothing below is phone-verified; see openQuestions.
  // Source: research/waves/Turnleaf_Wave5_Draft_Package.md
  //
  // Highest fees, newest automation. Motion to expunge (CCrP arts. 971-995);
  // records removed from public access, not destroyed; eligible = MANDATORY
  // grant. Filed in the parish of arrest/conviction.
  //
  // THE MONEY-SAVING LEAD, on every eligible result: SB 111's automated BCII
  // request process (live Jan 1, 2025) covers all art. 976/977/978-eligible
  // records back to Jan 1, 2006 — submit basic info, Bureau expunges within 30
  // days, FREE. So the copy says "try the free automated request before paying
  // up to $550". Its operational reality is an open question.
  //
  // FELONY COUNT follows art. 978(F), NOT the guides: multiple felonies OK in a
  // 10-year window if each is eligible (old one-shot limit repealed 2020).
  // 978(E) surprise: six named violent offences ARE expungable after 10 yrs via
  // contradictory hearing. COURT DEBT CANNOT BLOCK ELIGIBILITY — LA is the only
  // state; the results say so and there is no restitution gate.
  // ==========================================================================
  LA: {
    code: 'LA',
    name: 'Louisiana',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave5_Draft_Package.md',
    terminology:
      'Louisiana uses a MOTION TO EXPUNGE (Code of Criminal Procedure arts. 971-995), which removes '
      + 'a record from public access rather than destroying it — and if you are eligible, the grant '
      + 'is mandatory. Two things make Louisiana distinctive. Since January 2025 there is an '
      + 'automated, FREE request system for eligible records, so the first move is often to try that '
      + 'before paying the fees, which otherwise run up to $550. And Louisiana is the only state '
      + 'where court debt cannot block your eligibility — owing money does not stop you.',
    keyDates: [
      {
        label: 'SB 111 automated/free expungement request system (LSP BCII) live',
        date: '2025-01-01',
        kind: 'operative',
        note: 'Covers art. 976/977/978-eligible records back to Jan 1, 2006. Submit basic info, Bureau expunges eligible records within 30 days, free. No damages remedy if records are missed. Verify the portal is operational.',
      },
      {
        label: 'First-offence marijuana possession fee reduced to $300 (sunsets)',
        date: '2026-08-01',
        kind: 'deadline',
        note: 'The reduced $300 fee for first-offence marijuana possession sunsets on this date, after which it reverts. Dated urgency for that specific case.',
      },
    ],
    openQuestions: [
      {
        question:
          'Is the SB 111 automated expungement portal actually live and working? Wave 5 calls this the state\'s biggest story and says to verify operational reality — is the online portal live, what is it called, is it processing requests? The tree leads eligible results with "try the free automated request first"; confirm it exists before the copy leans on it. LSP BCII expungement page is the check.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the art. 978(F) felony-count rule against the current article text: a person may expunge MORE THAN ONE felony in a 10-year period if each is eligible (the old 15-year/one-shot limit was repealed 2020). Wave 5 says encode from the article, not the guides that still say one-per-lifetime. The tree does not cap felonies; confirm.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the fee structure: Wave 5 caps it at $550 ($250 LSP BCII + $50 sheriff + $50 DA + up to $200 clerk), nonrefundable, one fee per arrest event. First-offence marijuana possession is $300 until Aug 1, 2026. DA-certified fee waiver only for non-conviction outcomes with zero felony history; expedited (17-yr-old arrestee, 2025) and trafficking-victim paths fee-exempt. Confirm the clerk portion with a parish clerk.',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Confirm the art. 978(E) six-offence violent carve-out list (aggravated battery, second-degree battery, aggravated criminal damage, simple robbery, purse snatching, illegal use of weapons — expungable after 10 yrs via contradictory hearing) and the general exclusion list (crimes of violence R.S. 14:2(B), sex-registry, crimes against minors, domestic abuse battery, certain CDS). The tree asks these; confirm the lists.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the art. 893/894 set-aside-and-dismiss immediate expungement path, and the non-conviction charging-time-limit waits (felony-hard-labour 6 yrs / other felony 4 / misdemeanour 2 / fine-only 6 mo where there was no prosecution). The tree routes deferred to an immediate set-aside result and non-convictions to a general result.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'La. Code Crim. Proc. art. 977 (misdemeanour expungement; 5-yr cleansing period)', url: null, retrievedOn: null },
      { id: 'La. Code Crim. Proc. art. 978 (felony expungement; 10-yr; (E) violent carve-out; (F) multiple-felony rule)', url: null, retrievedOn: null },
      { id: 'La. Code Crim. Proc. art. 976 (non-conviction expungement)', url: null, retrievedOn: null },
      { id: 'La. Code Crim. Proc. arts. 893, 894 (set-aside-and-dismiss)', url: null, retrievedOn: null },
      { id: 'La. Code Crim. Proc. art. 983 (expungement fees; $550 cap)', url: null, retrievedOn: null },
      { id: 'SB 111 of 2023 (automated expungement request system, live Jan 1, 2025)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_la' },
            { label: 'Dismissed / Refused prosecution', value: 'dismissed', next: 'nonconviction_la' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconviction_la' },
            { label: 'Set aside and dismissed (Art. 893/894) / Diversion completed', value: 'deferred', next: 'eligible_setaside_la' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_la: {
          type: 'boolean',
          text: 'Was the offense any of these: a crime of violence, a sex offense requiring registration, a crime against a minor, domestic abuse battery, or certain controlled-substance offenses?',
          yes: 'violent_carveout_la',
          no: 'level_la'
        },
        // THE SURPRISE-YES — inside the excluded path.
        violent_carveout_la: {
          type: 'boolean',
          text: 'Was the offense specifically one of these six: aggravated battery, second-degree battery, aggravated criminal damage to property, simple robbery, purse snatching, or illegal use of weapons? (Louisiana allows expunging these six after 10 years even though they are violent.)',
          yes: 'felony_978e_date_la',
          no: 'ineligible_excluded_la'
        },
        level_la: {
          type: 'choice',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'dwi_la' },
            { label: 'Felony', value: 'felony', next: 'felony_date_la' },
            { label: 'Infraction', value: 'infraction', next: 'dwi_la' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_la' }
          ]
        },
        dwi_la: {
          type: 'boolean',
          text: 'Was this a DWI (driving while intoxicated)?',
          yes: 'dwi_date_la',
          no: 'misd_date_la'
        },
        misd_date_la: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including any probation or parole?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence/probation/parole, conviction-free (La. C.Cr.P. art. 977 — misdemeanour; one per 5-year period)' },
            nextPass: 'eligible_misd_la',
            nextFail: 'waiting_la'
          }
        },
        dwi_date_la: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence for the DWI?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence (La. C.Cr.P. art. 977 — DWI; limited to one per 10 years; +$50 OMV fee)' },
            nextPass: 'eligible_dwi_la',
            nextFail: 'waiting_la'
          }
        },
        felony_date_la: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including any probation or parole?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of sentence/probation/parole, conviction-free with DA certification (La. C.Cr.P. art. 978 — felony; multiple felonies allowed in a 10-yr window per 978(F))' },
            nextPass: 'eligible_felony_la',
            nextFail: 'waiting_la'
          }
        },
        felony_978e_date_la: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including any probation or parole?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'completion of sentence/probation/parole (La. C.Cr.P. art. 978(E) — one of the six carve-out offences; via a contradictory hearing)' },
            nextPass: 'eligible_978e_la',
            nextFail: 'waiting_la'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Louisiana treats convictions, non-convictions, and set-aside dispositions on different tracks. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable. The Justice & Accountability Center of Louisiana ((504) 273-1091) runs workshops and has the CLEAN JACKET eligibility app, and an LSP Right to Review fingerprint check is recommended before filing.',
          remedy: 'Get Your Record First (JAC of Louisiana / LSP Right to Review)',
          citation: 'La. C.Cr.P. arts. 971-995 (which path applies depends on the disposition)'
        },
        nonconviction_la: {
          status: 'eligible',
          title: 'No Conviction — Expungeable (Try the Free Automated Request First)',
          message: 'Because your case ended without a conviction — dismissed, acquitted, or refused for prosecution — it is expungeable. Start with the cheapest route: since January 2025, Louisiana has an automated request system that expunges eligible records for FREE, so try that before paying anything. If you need to file a motion instead, a DA-certified fee waiver is available for non-conviction outcomes when you have no felony history. And a Louisiana-specific reassurance: court debt does NOT block your eligibility here — owing money does not stop you. The Justice & Accountability Center can help.',
          remedy: 'Try the free automated request; else a non-conviction motion (art. 976)',
          citation: 'La. C.Cr.P. art. 976'
        },
        eligible_setaside_la: {
          status: 'eligible',
          title: 'Set Aside and Dismissed — Immediate Expungement Path',
          message: 'Because your case was set aside and dismissed under Article 893 or 894 (Louisiana\'s version of a deferred disposition), you have an immediate path to expungement — no lengthy waiting period. Try the free automated request system first (live since January 2025); if you need to file a motion, do so in the parish of the case. Remember that in Louisiana, court debt does not block eligibility. The Justice & Accountability Center and their CLEAN JACKET app can confirm your route.',
          remedy: 'Expungement after a 893/894 set-aside — try the automated request first',
          citation: 'La. C.Cr.P. arts. 893, 894'
        },
        eligible_misd_la: {
          status: 'eligible',
          title: 'Misdemeanor, 5+ Years Clean — Expungeable (Try Automated First)',
          message: 'Based on your dates — 5 years conviction-free since completing your sentence — this misdemeanor is expungeable under Article 977, and if you are eligible the grant is mandatory. Do the cheap thing first: try Louisiana\'s free automated request system (live since January 2025) before paying, since it covers eligible records at no cost. If you file a motion instead, it goes in the parish of the case and the fees are capped at $550. Two Louisiana specifics worth knowing: you can use the misdemeanor expungement once per 5-year period, and court debt does not block your eligibility. The Justice & Accountability Center can help.',
          remedy: 'Try the free automated request; else a motion (art. 977)',
          citation: 'La. C.Cr.P. art. 977'
        },
        eligible_dwi_la: {
          status: 'eligible',
          title: 'DWI, 5+ Years Clean — Expungeable, With Two Catches',
          message: 'A DWI can be expunged in Louisiana 5 years after you complete the sentence — with two DWI-specific catches worth knowing. You can only expunge a DWI once every 10 years, and there is an extra $50 fee to the Office of Motor Vehicles on top of the regular costs. Try the free automated request system first (live since January 2025) to see whether it handles yours. If you file a motion, it goes in the parish of the case, fees capped at $550 plus the $50 OMV fee. Court debt does not block your eligibility in Louisiana. The Justice & Accountability Center can confirm the timing.',
          remedy: 'Expunge a DWI (art. 977) — once per 10 years, +$50 OMV fee',
          citation: 'La. C.Cr.P. art. 977'
        },
        eligible_felony_la: {
          status: 'eligible',
          title: 'Felony, 10+ Years Clean — Expungeable (and Not Just One)',
          message: 'Based on your dates — 10 years conviction-free since completing your sentence — this felony appears expungeable under Article 978, with the district attorney certifying your clean record. One thing many guides get wrong, so it is worth stating: Louisiana no longer limits you to one felony expungement for life. Under the current article, you can expunge more than one felony within a 10-year period as long as each is eligible (the old one-shot limit was repealed in 2020). Try the free automated request system first (live since January 2025). If you file a motion, it goes in the parish of the case, fees capped at $550. And court debt does not block your eligibility. The Justice & Accountability Center and their CLEAN JACKET app can help.',
          remedy: 'Try the free automated request; else a motion (art. 978) — multiple felonies allowed',
          citation: 'La. C.Cr.P. art. 978'
        },
        eligible_978e_la: {
          status: 'eligible',
          title: 'One of the Six — Expungeable Despite Being a Violent Offense',
          message: 'This is a route many people do not know exists. Louisiana generally does not expunge crimes of violence — but there is a specific exception for six offenses (aggravated battery, second-degree battery, aggravated criminal damage, simple robbery, purse snatching, and illegal use of weapons), and yours appears to be one of them. After 10 years, these can be expunged through a contradictory hearing (a hearing where the district attorney can weigh in). Based on your dates, the 10 years appear met. Because this route involves a hearing and is specific, it is worth doing with help: the Justice & Accountability Center handles exactly these. Court debt does not block your eligibility. The free automated system may not cover a hearing-based path, so plan on the motion.',
          remedy: 'Expungement via contradictory hearing (art. 978(E)) — one of the six carve-out offences',
          citation: 'La. C.Cr.P. art. 978(E)'
        },
        waiting_la: {
          status: 'waiting',
          title: 'Cleansing Period Not Yet Met',
          message: 'Louisiana\'s "cleansing periods" run conviction-free from when you complete your sentence, probation, and parole: 5 years for a misdemeanor or DWI, 10 years for a felony (including the six violent-offense carve-outs). Based on your dates, yours has not run yet, and it requires staying conviction-free. One reassurance for the meantime: unlike almost everywhere else, court debt does NOT delay or block your Louisiana expungement — so an unpaid balance is not something holding your clock back. When the time comes, try the free automated request system first.',
          remedy: 'Wait for the cleansing period (court debt does not block it)',
          citation: 'La. C.Cr.P. arts. 977, 978'
        },
        ineligible_excluded_la: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Expunged',
          message: 'Louisiana excludes crimes of violence generally, sex offenses requiring registration, crimes against minors, domestic abuse battery, and certain controlled-substance offenses from expungement. No waiting period changes that. There is one important exception you should rule out first, because it catches people: six specific violent offenses (aggravated battery, second-degree battery, aggravated criminal damage, simple robbery, purse snatching, illegal use of weapons) CAN be expunged after 10 years — so if your offense might be one of those, it is worth confirming. Otherwise, a first-offender pardon (Louisiana\'s automatic constitutional pardon) can open an expungement path for some non-violent offenses. The Justice & Accountability Center can check where yours falls.',
          remedy: 'None (Excluded Offense) — rule out the six carve-outs; ask about a first-offender pardon',
          citation: 'La. C.Cr.P. art. 978'
        },
        complex_level_la: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'In Louisiana the cleansing period depends on the level: 5 years for a misdemeanor or DWI, 10 for a felony. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and the Justice & Accountability Center\'s CLEAN JACKET app can help you check your eligibility. An LSP Right to Review fingerprint check will also show your record.',
          remedy: 'Get Your Offense Level First (court paperwork / CLEAN JACKET)',
          citation: 'La. C.Cr.P. arts. 977, 978'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Motion to Expunge (La. C.Cr.P. arts. 971-995)',
          formName: 'Standardized statewide expungement forms (art. 992) / the automated request system',
          formUrl: 'https://www.lsp.org/services/legal/expungements/',
          steps: [
            'Try the FREE automated request system first (live since January 2025) — it expunges eligible records back to 2006 within 30 days at no cost. This can save you up to $550.',
            'If you file a motion, do it in the parish of the arrest or conviction, using the standardized statewide forms.',
            'Budget for the capped fees ($550 max: $250 LSP BCII, $50 sheriff, $50 DA, up to $200 clerk) — first-offense marijuana possession is $300 until August 1, 2026.',
            'Court debt does NOT block your eligibility in Louisiana. An LSP Right to Review fingerprint check before filing is recommended.'
          ],
          // null: Wave 5 gives the $550 cap breakdown but flags the clerk portion
          // and the various exemptions/reductions.
          fees: null,
          // NOT null: the DA-certified and specialty waivers are named mechanisms.
          feeWaiver: 'A DA-certified fee waiver is available for non-conviction outcomes with no felony history; expedited (17-year-old arrestee) and trafficking-victim paths are fee-exempt.',
          courtContact: 'The parish of arrest or conviction; LSP BCII for the automated request'
        }
      },
      legalAid: [
        { name: 'Justice & Accountability Center of Louisiana (CLEAN JACKET app; (504) 273-1091)', url: 'https://www.jaclouisiana.org' },
        { name: 'Louisiana Law Help', url: 'https://www.louisianalawhelp.org' }
      ]
    }
  },
  WV: {
    code: 'WV',
    name: 'West Virginia',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'West Virginia uses EXPUNGEMENT, filed in the circuit court where the case was decided — § 61-11-26 '
      + 'for convictions and § 61-11-25 for non-convictions. Two things make it distinctive. First, an '
      + 'ACCELERATION lane (§ 61-11-26a): if you complete an approved substance-abuse treatment or recovery '
      + 'program, or a WV Department of Education job-readiness course, your waiting periods drop sharply AND '
      + 'the $100 State Police fee is waived — a treatment-and-work fast lane no other state has. Second, and '
      + 'important to know before you file: the Supreme Court\'s official petition instructions (form SCA-C900) '
      + 'say a person may request expungement under these sections only ONCE — so the question is not just '
      + 'whether you are eligible, but whether this is the record worth spending that one request on.',
    keyDates: [],
    openQuestions: [
      {
        question:
          'Confirm the SCA-C900 "only once" language and its SCOPE. Wave 6 flags this: the Supreme Court\'s official petition instructions say a person may request expungement under §§ 61-11-26/26a only once, but it is unclear whether that means once per person for life or once per statute/petition. It changes strategy the way Indiana\'s one-petition rule does. The tree routes people who have already expunged once to a "confirm this before you spend your one request" result; confirm the scope with a circuit clerk (Kanawha).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the full § 61-11-26(c) exclusion list. Wave 6 gives violent felonies, felonies with minor victims, sexual offenses, deadly-weapon offenses, DV assault/battery, DUI, driving-suspended, and CDL offenses, and flags the (c) list as needing the full statutory text. Also confirm the note that an old DUI (5+ years) does not itself block expunging a separate, eligible felony. The tree asks these as exclusions; confirm the list against current § 61-11-26(c).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the circuit court filing fee amount (it varies by county). Wave 6 gives the $100 State Police records-division fee (§ 61-11-26(n), waived on the 26a acceleration lane) but flags the separate circuit court filing fee as a per-county phone target. The fees field is null pending this; a Kanawha circuit clerk is the check.',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Confirm West Virginia has NOT enacted automatic expungement. Wave 6 says to check whether any 2024-26 automation bill (HB 4344-era proposals) moved, and to encode "petition-only" unless a call says otherwise. The tree is petition-only throughout; confirm no automation program is live.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'W. Va. Code § 61-11-26 (expungement of convictions; 1-yr / 2-yr / 5-yr waits; (c) exclusions; (n) $100 WSP fee)', url: null, retrievedOn: null },
      { id: 'W. Va. Code § 61-11-26a (acceleration: treatment/recovery or job-readiness course shortens waits to 90 days / 1 yr / 3 yrs and waives the WSP fee)', url: null, retrievedOn: null },
      { id: 'W. Va. Code § 61-11-25 (expungement of non-convictions; 60-day wait; pretrial diversion / deferred adjudication dismissals)', url: null, retrievedOn: null },
      { id: 'W. Va. Supreme Court petition instructions SCA-C900 ("only once" language)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_wv' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_wv' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_wv' },
            { label: 'Diversion / deferred adjudication completed and dismissed', value: 'deferred', next: 'eligible_deferred_wv' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_wv: {
          type: 'boolean',
          text: 'Was the offense any of these: a violent felony, a felony with a minor victim, a sexual offense, a deadly-weapon offense, domestic-violence assault or battery, DUI, driving on a suspended license, or a CDL-holder traffic offense?',
          yes: 'ineligible_excluded_wv',
          no: 'prior_use_wv'
        },
        prior_use_wv: {
          type: 'boolean',
          text: 'Have you ever obtained a West Virginia expungement before, under § 61-11-26 or § 61-11-26a?',
          yes: 'complex_onceever_wv',
          no: 'accel_wv'
        },
        accel_wv: {
          type: 'boolean',
          text: 'Have you completed an approved substance-abuse treatment or recovery program, or a WV Department of Education job-readiness course? (This "acceleration" shortens your waiting periods and waives the $100 State Police fee.)',
          yes: 'level_accel_wv',
          no: 'level_wv'
        },
        level_wv: {
          type: 'choice',
          text: 'Which best describes the conviction(s) you want to clear?',
          options: [
            { label: 'A single misdemeanor', value: 'misd_single', next: 'misd_single_date_wv' },
            { label: 'Multiple misdemeanors', value: 'misd_multi', next: 'misd_multi_date_wv' },
            { label: 'A non-violent felony (or several from the same incident)', value: 'felony', next: 'felony_date_wv' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_wv' }
          ]
        },
        level_accel_wv: {
          type: 'choice',
          text: 'Which best describes the conviction(s) you want to clear?',
          options: [
            { label: 'A single misdemeanor', value: 'misd_single', next: 'misd_single_accel_date_wv' },
            { label: 'Multiple misdemeanors', value: 'misd_multi', next: 'misd_multi_accel_date_wv' },
            { label: 'A non-violent felony (or several from the same incident)', value: 'felony', next: 'felony_accel_date_wv' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_wv' }
          ]
        },
        misd_single_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete this misdemeanor case — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'conviction / incarceration / supervision completion, whichever latest (W. Va. Code § 61-11-26 — single misdemeanor)' },
            nextPass: 'eligible_misd_wv',
            nextFail: 'waiting_wv'
          }
        },
        misd_multi_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the LAST of the misdemeanors — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'completion of the LAST misdemeanor, whichever of conviction/incarceration/supervision is latest (W. Va. Code § 61-11-26 — multiple misdemeanors)' },
            nextPass: 'eligible_misd_wv',
            nextFail: 'waiting_wv'
          }
        },
        felony_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the felony case — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction / incarceration / supervision completion, whichever latest (W. Va. Code § 61-11-26 — non-violent felony)' },
            nextPass: 'eligible_felony_wv',
            nextFail: 'waiting_wv'
          }
        },
        misd_single_accel_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete this misdemeanor case — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 90, unit: 'days', anchor: 'completion, whichever latest, on the acceleration lane (W. Va. Code § 61-11-26a — single misdemeanor; treatment/job-readiness completed)' },
            nextPass: 'eligible_accel_wv',
            nextFail: 'waiting_wv'
          }
        },
        misd_multi_accel_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the LAST of the misdemeanors — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'completion of the last, whichever latest, on the acceleration lane (W. Va. Code § 61-11-26a — multiple misdemeanors)' },
            nextPass: 'eligible_accel_wv',
            nextFail: 'waiting_wv'
          }
        },
        felony_accel_date_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the felony case — conviction, any incarceration, and any supervision, whichever was latest?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'completion, whichever latest, on the acceleration lane (W. Va. Code § 61-11-26a — non-violent felony)' },
            nextPass: 'eligible_accel_wv',
            nextFail: 'waiting_wv'
          }
        },
        nonconv_wv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case acquitted or dismissed?',
          validation: {
            period: { amount: 60, unit: 'days', anchor: 'after the acquittal or dismissal (W. Va. Code § 61-11-25 — non-conviction)' },
            nextPass: 'eligible_nonconv_wv',
            nextFail: 'waiting_nonconv_wv'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'West Virginia handles convictions (§ 61-11-26) and non-convictions (§ 61-11-25) on different tracks, and the waiting periods differ. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a West Virginia State Police criminal-history request will show the disposition; Legal Aid of West Virginia can help you read it.',
          remedy: 'Get Your Record First (court paperwork / WV State Police)',
          citation: 'W. Va. Code §§ 61-11-25, 61-11-26 (which path applies depends on the disposition)'
        },
        eligible_deferred_wv: {
          status: 'eligible',
          title: 'Diversion Completed — Likely Expungeable',
          message: 'Because you completed a pretrial diversion or deferred-adjudication agreement and the charge was dismissed, West Virginia generally allows that dismissal to be expunged. One caution to confirm: there are carve-outs for domestic-violence-related matters, so if yours involved a DV charge, check that first. This is filed in the circuit court where the case was handled. Legal Aid of West Virginia can confirm your route. And a planning note worth knowing up front: the Supreme Court\'s official instructions say you may request expungement only once, so it is worth being deliberate about timing.',
          remedy: 'Expunge a completed-diversion dismissal (§ 61-11-25) — confirm DV carve-outs',
          citation: 'W. Va. Code § 61-11-25'
        },
        eligible_nonconv_wv: {
          status: 'eligible',
          title: 'No Conviction — Expungeable After 60 Days',
          message: 'Because your case ended in an acquittal or dismissal, you can petition to expunge it 60 days after the case ended — and based on your date, that window has passed. You file in the circuit court where the case was decided, serving the State Police, the prosecutor, and the arresting agency, who then certify compliance. Legal Aid of West Virginia can help with the petition.',
          remedy: 'Non-conviction expungement petition (§ 61-11-25)',
          citation: 'W. Va. Code § 61-11-25'
        },
        eligible_misd_wv: {
          status: 'eligible',
          title: 'Misdemeanor Waiting Period Met — Expungeable',
          message: 'Based on your dates, the waiting period for your misdemeanor record has passed — 1 year for a single misdemeanor, or 2 years from the last if there were several. You can petition the circuit court where the case was decided. Two things to plan around: there is a $100 State Police fee plus a circuit court filing fee (the circuit fee varies by county — worth calling to confirm), and the Supreme Court\'s official instructions say you may request expungement only once, so be deliberate about which record you clear. If you have completed a substance-abuse treatment or recovery program, or a job-readiness course, ask about the acceleration lane — it shortens the wait and waives the $100 fee. Legal Aid of West Virginia and Jobs & Hope WV can help.',
          remedy: 'Conviction expungement petition (§ 61-11-26)',
          citation: 'W. Va. Code § 61-11-26'
        },
        eligible_felony_wv: {
          status: 'eligible',
          title: 'Non-Violent Felony, 5+ Years — Expungeable',
          message: 'Based on your dates, the 5-year waiting period for a non-violent felony (or several felonies from the same incident, counted together) has passed. You can petition the circuit court where the case was decided. Plan around two things: a $100 State Police fee plus a circuit court filing fee that varies by county, and the Supreme Court\'s official instruction that you may request expungement only once — so this is worth doing deliberately. If you have completed an approved treatment or recovery program, or a WV job-readiness course, the acceleration lane can cut the wait to 3 years and waive the $100 fee. Legal Aid of West Virginia and Jobs & Hope WV can help.',
          remedy: 'Conviction expungement petition (§ 61-11-26)',
          citation: 'W. Va. Code § 61-11-26'
        },
        eligible_accel_wv: {
          status: 'eligible',
          title: 'Acceleration Lane — Shorter Wait, Fee Waived',
          message: 'Because you completed an approved substance-abuse treatment or recovery program, or a WV Department of Education job-readiness course, you qualify for West Virginia\'s acceleration lane (§ 61-11-26a): the waiting periods drop to 90 days for a single misdemeanor, 1 year for multiple misdemeanors, and 3 years for a non-violent felony — and the $100 State Police fee is waived. Based on your dates, your shortened period has passed. This treatment-and-work fast lane is unique to West Virginia; Jobs & Hope WV is the program hub. You still file in the circuit court where the case was decided (a circuit filing fee, which varies by county, may still apply). Remember the once-only rule when choosing which record to clear.',
          remedy: 'Accelerated expungement petition (§ 61-11-26a) — $100 State Police fee waived',
          citation: 'W. Va. Code § 61-11-26a'
        },
        waiting_wv: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'West Virginia\'s waiting periods run from whichever is latest of your conviction, release from incarceration, or completion of supervision: 1 year for a single misdemeanor, 2 years for multiple misdemeanors, and 5 years for a non-violent felony. Based on your dates, yours has not passed yet. One route can shorten it: completing an approved substance-abuse treatment or recovery program, or a WV job-readiness course, drops the waits to 90 days / 1 year / 3 years and waives the $100 State Police fee (§ 61-11-26a). Jobs & Hope WV runs those programs.',
          remedy: 'Wait for the period — or shorten it via the § 61-11-26a acceleration lane',
          citation: 'W. Va. Code §§ 61-11-26, 61-11-26a'
        },
        waiting_nonconv_wv: {
          status: 'waiting',
          title: 'Not Yet 60 Days',
          message: 'For an acquittal or dismissal, West Virginia lets you petition to expunge 60 days after the case ended. Based on your date, that 60-day window has not passed yet. Once it does, you file in the circuit court where the case was decided. Legal Aid of West Virginia can help you prepare in the meantime.',
          remedy: 'Wait until 60 days after the case ended, then petition (§ 61-11-25)',
          citation: 'W. Va. Code § 61-11-25'
        },
        ineligible_excluded_wv: {
          status: 'ineligible',
          title: 'This Offense Is Excluded From Expungement',
          message: 'West Virginia\'s expungement statute excludes a set of offenses: violent felonies, felonies with a minor victim, sexual offenses, deadly-weapon offenses, domestic-violence assault or battery, DUI, driving on a suspended license, and CDL-holder traffic offenses. No waiting period changes that for the excluded offense itself. One thing worth knowing, though: an old DUI (5 or more years back) does not, by itself, block you from expunging a SEPARATE, eligible offense — each offense is judged on its own, so if you have another record that qualifies, screen that one on its own. For an offense that is truly excluded, a Governor\'s pardon is the remaining route. Legal Aid of West Virginia can help you check where yours falls.',
          remedy: 'None for the excluded offense — a separate eligible offense can still be pursued; else pardon',
          citation: 'W. Va. Code § 61-11-26(c)'
        },
        complex_onceever_wv: {
          status: 'complex',
          title: 'You May Have Already Used Your One Request — Confirm First',
          message: 'This is a West Virginia-specific caution, not a no. The Supreme Court\'s official petition instructions (form SCA-C900) say a person may request expungement under §§ 61-11-26/26a only once. Because you told us you have expunged a record before, you may have already used that one request — but the exact scope of the "only once" rule (once per person for life, or once per petition) is something we flag for confirmation rather than guess at. Before filing anything, confirm with the circuit clerk where you would file (Kanawha County is a good reference) whether you can request again. If you can only go once, this is a decision about which record matters most. Legal Aid of West Virginia can help you weigh it.',
          remedy: 'Confirm the scope of the once-only rule with a circuit clerk before filing',
          citation: 'W. Va. Supreme Court petition instructions SCA-C900; W. Va. Code §§ 61-11-26, 61-11-26a'
        },
        complex_level_wv: {
          status: 'complex',
          title: 'We Need to Know What You Are Clearing',
          message: 'West Virginia\'s waiting period depends on whether you are clearing a single misdemeanor (1 year), multiple misdemeanors (2 years from the last), or a non-violent felony (5 years) — and the acceleration lane changes those to 90 days / 1 year / 3 years. Since you are not sure which describes your record, we are not going to guess. Your court paperwork or a West Virginia State Police criminal-history request will show it. Legal Aid of West Virginia can help you read it.',
          remedy: 'Get Your Record First (court paperwork / WV State Police)',
          citation: 'W. Va. Code §§ 61-11-26, 61-11-26a'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (W. Va. Code §§ 61-11-25, 61-11-26, 61-11-26a)',
          formName: 'WV Supreme Court expungement forms (SCA-C900 series)',
          formUrl: 'https://www.courtswv.gov/lower-courts/sca-forms',
          steps: [
            'Confirm your offense is not on the § 61-11-26(c) exclusion list (violent felonies, minor-victim felonies, sex offenses, deadly-weapon offenses, DV assault/battery, DUI, driving-suspended, CDL offenses).',
            'If you completed a substance-abuse treatment/recovery program or a WV job-readiness course, use the § 61-11-26a acceleration lane — shorter waits and the $100 State Police fee is waived. Jobs & Hope WV is the program hub.',
            'File in the circuit court where the case was decided, serving the State Police superintendent, the prosecutor, the police chief, and (if applicable) the warden; agencies certify compliance within 60 days.',
            'Because the official instructions say you may request expungement only once, be deliberate about which record you clear — confirm the scope with your circuit clerk before filing.'
          ],
          // null: the $100 State Police fee is known, but Wave 6 flags the separate
          // circuit court filing fee as a per-county unknown, so the total is unknown.
          fees: null,
          // NOT null: the § 61-11-26a acceleration is a named mechanism that waives the WSP fee.
          feeWaiver: 'The § 61-11-26a acceleration lane — completing an approved substance-abuse treatment/recovery program or a WV Department of Education job-readiness course — waives the $100 State Police fee.',
          courtContact: 'The circuit court where the case was decided (Kanawha County is a reference for fee confirmation)'
        }
      },
      legalAid: [
        { name: 'Legal Aid of West Virginia', url: 'https://www.lawv.net' },
        { name: 'Jobs & Hope WV (acceleration-lane program hub)', url: 'https://jobsandhope.wv.gov' }
      ]
    }
  },
  KY: {
    code: 'KY',
    name: 'Kentucky',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Kentucky uses EXPUNGEMENT, and almost everything runs through one document: a CERTIFICATE OF '
      + 'ELIGIBILITY from the State Police / Administrative Office of the Courts (KRS § 431.079), required '
      + 'before you file a petition under § 431.073 (Class D felonies), § 431.076 (non-convictions), or '
      + '§ 431.078 (misdemeanors). The certificate costs $40, is valid for only 30 days once issued, and — '
      + 'this is the dominant practical fact — the State Police say it averages 4-5 MONTHS to process. So '
      + 'the real advice is: start the certificate first and plan around the wait, even if your eligibility '
      + 'date is still ahead of you. The one exception is non-convictions since July 15, 2020, which are '
      + 'automatic and need no certificate. (Drug offenses also have a separate void-and-seal path under '
      + 'KRS §§ 218A.275(8), 218A.276.)',
    keyDates: [
      {
        label: 'Automatic non-conviction expungement begins (KRS § 431.076)',
        date: '2020-07-15',
        kind: 'operative',
        note: 'Acquittals and dismissals-with-prejudice on or after this date are expunged automatically, 30 days after the case ends — no petition, no certificate. Does NOT cover plea-deal dismissals. Older cases use the petition route.',
      },
      {
        label: 'Amendment allowing MULTIPLE Class D felony expungements (KRS § 431.073)',
        date: '2023-06-29',
        kind: 'effective',
        note: 'The 2023 amendment repealed the once-per-lifetime limit; a person may now expunge more than one qualifying Class D felony. Older guides still say once-only — encode from the amended statute. Flagged for confirmation against current text.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the full KRS § 431.078 misdemeanor exclusion list. Wave 6 gives 5-year eligibility for most misdemeanors/violations but excludes sex offenses and offenses against children, and flags the full exclusion list as needing the statute text. The tree asks a sex-offense/child-offense exclusion; confirm the complete list.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the 2023 amendment (eff. Jun 29, 2023) to KRS § 431.073 allows expunging MULTIPLE qualifying Class D felonies, not one per lifetime. Wave 6 persona 4 (two Class D felonies, separate incidents) is the verify-then-encode branch and says to encode from the amended statute. The tree does not cap Class D felonies at one; confirm against the current text.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the State Police certificate backlog (KSP\'s own page says 4-5 months to process the § 431.079 Certificate of Eligibility) and confirm no automation exists: Wave 6 says SB 290 (automatic expungement) failed in the 2026 session. The tree tells conviction-eligible people to start the certificate first and plan around the wait, and is petition-only for convictions; confirm both facts.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Ky. Rev. Stat. § 431.073 (Class D felony expungement; 5-yr wait; multiple-felony amendment 2023)', url: null, retrievedOn: null },
      { id: 'Ky. Rev. Stat. § 431.078 (misdemeanor expungement; 5-yr wait; $100 filing fee)', url: null, retrievedOn: null },
      { id: 'Ky. Rev. Stat. § 431.076 (non-conviction expungement; automatic since Jul 15, 2020)', url: null, retrievedOn: null },
      { id: 'Ky. Rev. Stat. § 431.079 (Certificate of Eligibility; $40; 30-day validity; KSP/AOC)', url: null, retrievedOn: null },
      { id: 'Ky. Rev. Stat. §§ 218A.275(8), 218A.276 (drug-offense void-and-seal)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_ky' },
            { label: 'Dismissed', value: 'dismissed', next: 'dismissal_ky' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'dismissal_ky' },
            { label: 'Diversion completed / charge dismissed', value: 'deferred', next: 'dismissal_ky' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        dismissal_ky: {
          type: 'boolean',
          text: 'Was the case dismissed WITH PREJUDICE, or were you acquitted (found not guilty) — as opposed to a dismissal that was part of a plea deal?',
          yes: 'auto_cutoff_ky',
          no: 'petition_dismissal_ky'
        },
        auto_cutoff_ky: {
          type: 'boolean',
          text: 'Did the case end (the dismissal or acquittal) on or after July 15, 2020?',
          yes: 'check_record_auto_ky',
          no: 'petition_dismissal_ky'
        },
        level_ky: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor or violation', value: 'misd', next: 'misd_excluded_ky' },
            { label: 'Class D felony (the lowest felony level)', value: 'felonyD', next: 'felonyD_eligible_ky' },
            { label: 'Class A, B, or C felony', value: 'felonyABC', next: 'ineligible_felony_ky' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ky' }
          ]
        },
        misd_excluded_ky: {
          type: 'boolean',
          text: 'Was the offense a sex offense, or an offense against a child?',
          yes: 'ineligible_excluded_ky',
          no: 'misd_date_ky'
        },
        misd_date_ky: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including any probation?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence or probation (Ky. Rev. Stat. § 431.078 — misdemeanor)' },
            nextPass: 'eligible_misd_ky',
            nextFail: 'waiting_ky'
          }
        },
        felonyD_eligible_ky: {
          type: 'choice',
          text: 'Kentucky expunges about 61 enumerated Class D felonies (plus same-incident offenses, pardoned felonies, and multiple qualifying felonies since 2023). Is your Class D felony one of the eligible enumerated offenses?',
          options: [
            { label: 'Yes, it is one of the eligible offenses', value: 'eligible', next: 'felonyD_date_ky' },
            { label: 'No, it is not on the eligible list', value: 'not_eligible', next: 'ineligible_felonyD_ky' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_felonyD_list_ky' }
          ]
        },
        felonyD_date_ky: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including any probation or parole?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'completion of sentence/probation/parole, no new convictions in the prior 5 years and none pending (Ky. Rev. Stat. § 431.073 — Class D felony)' },
            nextPass: 'eligible_felonyD_ky',
            nextFail: 'waiting_ky'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Kentucky handles convictions and non-convictions on very different tracks — non-convictions since July 15, 2020 are automatic, while convictions require a Certificate of Eligibility and a petition. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. A KSP criminal-history request or your court paperwork will show the disposition; the Department of Public Advocacy expungement guide explains the tracks.',
          remedy: 'Get Your Record First (KSP / court paperwork)',
          citation: 'Ky. Rev. Stat. §§ 431.073, 431.076, 431.078 (which path applies depends on the disposition)'
        },
        check_record_auto_ky: {
          status: 'eligible',
          title: 'Likely Already Expunged Automatically — Check Your Record',
          message: 'Because your case was a dismissal-with-prejudice or an acquittal that ended on or after July 15, 2020, Kentucky expunges it AUTOMATICALLY — 30 days after the case ended, with no petition, no certificate, and no fee (KRS § 431.076). So the honest first step is not to file anything but to CHECK whether it has already come off: request your KSP criminal-history record and look. If it is still showing after well past 30 days, the Department of Public Advocacy or a legal-aid expungement clinic can help you follow up. Note this automatic path does not cover dismissals that were part of a plea deal.',
          remedy: 'Check your record — it should already be expunged (§ 431.076)',
          citation: 'Ky. Rev. Stat. § 431.076'
        },
        petition_dismissal_ky: {
          status: 'eligible',
          title: 'Non-Conviction — Expungeable by Petition',
          message: 'Because your case ended without a conviction, it can be expunged — but not automatically, either because it ended before July 15, 2020 or because it was a plea-deal dismissal rather than a dismissal-with-prejudice or acquittal. You file a petition (KRS § 431.076), and for non-convictions there is NO filing fee (confirmed by the Department of Public Advocacy). There is a 60-day waiting period on the older petition route. Because plea-deal and diversion dismissals can be handled differently, this is worth doing with help: the DPA and legal-aid expungement clinics do exactly this.',
          remedy: 'Non-conviction expungement petition (§ 431.076) — no filing fee',
          citation: 'Ky. Rev. Stat. § 431.076'
        },
        eligible_misd_ky: {
          status: 'eligible',
          title: 'Misdemeanor, 5+ Years — Expungeable (Start the Certificate First)',
          message: 'Based on your dates — 5 years since completing your sentence or probation — your misdemeanor is expungeable under KRS § 431.078. Here is the Kentucky-specific advice that matters: start the Certificate of Eligibility FIRST. It costs $40, is valid only 30 days once issued, and the State Police say it takes 4-5 months to process, so it is the long pole. The petition itself carries a $100 filing fee. Total is roughly $140. Fee-help clinics (Louisville Goodwill / Urban League) can assist. The Department of Public Advocacy expungement guide walks through the steps.',
          remedy: 'Misdemeanor expungement (§ 431.078) — get the § 431.079 certificate first',
          citation: 'Ky. Rev. Stat. § 431.078'
        },
        eligible_felonyD_ky: {
          status: 'eligible',
          title: 'Class D Felony, 5+ Years — Expungeable (Plan Around the Certificate)',
          message: 'Based on your dates — 5 years since completing your sentence, probation, or parole, with no new convictions in the prior 5 years and none pending — your Class D felony appears eligible under KRS § 431.073. Start the Certificate of Eligibility first: $40, valid 30 days, and 4-5 months to process at the State Police, so build your timeline around it. The petition costs $50 to file plus $250 due if it is granted (payable over 18 months — the expungement is not final until it is paid), roughly $340 all-in with the certificate. And one thing many guides get wrong: since a 2023 amendment, you can expunge MORE THAN ONE qualifying Class D felony, not just one for life. Fee-help clinics (Louisville Goodwill / Urban League) and the Department of Public Advocacy can help.',
          remedy: 'Class D felony expungement (§ 431.073) — certificate first; multiple felonies allowed since 2023',
          citation: 'Ky. Rev. Stat. § 431.073'
        },
        waiting_ky: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Kentucky\'s waiting period is 5 years from completing your sentence (and, for a Class D felony, with no new convictions in the prior 5 years). Based on your dates, yours has not passed yet. Here is a Kentucky-specific tip for the meantime: because the Certificate of Eligibility takes 4-5 months to process, many people start that process a few months before their eligibility date so the paperwork is ready when the wait ends. The Department of Public Advocacy expungement guide explains the timing.',
          remedy: 'Wait for the 5-year period — but start the certificate a few months early',
          citation: 'Ky. Rev. Stat. §§ 431.073, 431.078'
        },
        ineligible_excluded_ky: {
          status: 'ineligible',
          title: 'This Offense Is Excluded',
          message: 'Kentucky\'s misdemeanor expungement excludes sex offenses and offenses against children, and no waiting period changes that. (The full exclusion list is something we are confirming against the statute.) For an offense that is truly excluded, a Governor\'s pardon is the remaining route. The Department of Public Advocacy can help you check where yours falls.',
          remedy: 'None (Excluded Offense) — ask about a pardon',
          citation: 'Ky. Rev. Stat. § 431.078'
        },
        ineligible_felonyD_ky: {
          status: 'ineligible',
          title: 'This Class D Felony Is Not on the Eligible List',
          message: 'Kentucky expunges only about 61 enumerated Class D felonies. Because yours is not one of them, the standard expungement route does not apply. Two things can still open a door: if the felony was pardoned, pardoned felonies are expungeable; and same-incident offenses can sometimes be swept in with an eligible one. Because this is list-specific, it is worth confirming with help — the Department of Public Advocacy and legal-aid clinics can check the enumerated list against your exact offense.',
          remedy: 'None on the standard list — check pardon / same-incident paths',
          citation: 'Ky. Rev. Stat. § 431.073'
        },
        ineligible_felony_ky: {
          status: 'ineligible',
          title: 'Class A, B, or C Felony — Pardon Only',
          message: 'Kentucky\'s felony expungement reaches only Class D felonies (the lowest level). Class A, B, and C felonies cannot be expunged except when they have been pardoned. So the route here is a Governor\'s pardon; if one is granted, the pardoned felony then becomes expungeable. The Department of Public Advocacy can explain the pardon process.',
          remedy: 'None (higher-level felony) — a pardon can open an expungement path',
          citation: 'Ky. Rev. Stat. § 431.073'
        },
        complex_level_ky: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'In Kentucky the route depends heavily on the level: misdemeanors and about 61 enumerated Class D felonies can be expunged, while Class A/B/C felonies cannot (except by pardon). Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a KSP criminal-history request will show it. The Department of Public Advocacy can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / KSP)',
          citation: 'Ky. Rev. Stat. §§ 431.073, 431.078'
        },
        complex_felonyD_list_ky: {
          status: 'complex',
          title: 'We Need to Match Your Felony to the Eligible List',
          message: 'Kentucky\'s Class D felony expungement covers about 61 specific, enumerated offenses. Whether yours qualifies depends on matching your exact offense to that list — something we are not going to guess at. Your court paperwork names the precise statute you were convicted under, and the Department of Public Advocacy expungement guide (or a legal-aid clinic) can check it against the eligible list. If it is on the list and 5 years have passed, the certificate-first process applies.',
          remedy: 'Match Your Offense to the § 431.073 List (DPA / court paperwork)',
          citation: 'Ky. Rev. Stat. § 431.073'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (Ky. Rev. Stat. §§ 431.073, 431.076, 431.078; certificate § 431.079)',
          formName: 'AOC expungement forms + Certificate of Eligibility application',
          formUrl: 'https://kycourts.gov/Legal-Help/Pages/Expungement.aspx',
          steps: [
            'For a conviction, request the Certificate of Eligibility FIRST (KRS § 431.079): $40, valid only 30 days once issued, and 4-5 months to process at the State Police — it is the long pole, so start it early.',
            'For a non-conviction that ended on or after July 15, 2020 (dismissal-with-prejudice or acquittal), do NOT file — it should be automatic; check your KSP record instead.',
            'File the petition in the court of conviction: misdemeanors $100 (§ 431.078); Class D felonies $50 to file plus $250 due on grant, payable over 18 months (§ 431.073); non-convictions have no filing fee.',
            'Use a fee-help clinic (Louisville Goodwill / Urban League) or the Department of Public Advocacy guide if the fees are a barrier.'
          ],
          // NOT null: statutory fees are given precisely — $40 certificate, $100
          // misdemeanor, $50 + $250 Class D felony. Non-convictions have no fee.
          fees: '$40 Certificate of Eligibility (KRS § 431.079). Misdemeanor petition: $100 (§ 431.078). Class D felony petition: $50 to file plus $250 due if granted, payable over 18 months (§ 431.073). Non-conviction petitions: no filing fee.',
          feeWaiver: 'Non-conviction petitions carry no filing fee (DPA-confirmed). For conviction fees, fee-help clinics (Louisville Goodwill / Urban League) assist people who cannot pay.',
          courtContact: 'The court of conviction; KSP/AOC for the Certificate of Eligibility'
        }
      },
      legalAid: [
        { name: 'Kentucky Department of Public Advocacy — Expungement Guide', url: 'https://dpa.ky.gov' },
        { name: 'expungeky.com (eligibility FAQ)', url: 'https://expungeky.com' }
      ]
    }
  },
  OR: {
    code: 'OR',
    name: 'Oregon',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Oregon calls it SETTING ASIDE a conviction (ORS 137.225), which seals the record. The 2022 overhaul '
      + '(SB 397) shortened the waiting periods dramatically and made many older convictions newly eligible — '
      + 'a Class B felony that once carried a 20-year wait now runs 7 years, so a lot of people became eligible '
      + 'without realizing it. A 2025 amendment went further: expired money-judgment obligations now count as '
      + '"sentence complete," so old unpaid fines whose judgments have lapsed no longer block you. Filing is '
      + 'FREE (SB 397 eliminated the court fee); only a State Police record-check fee remains. Two traps to '
      + 'know: DUII and other traffic offenses are excluded, and a completed DUII DIVERSION does not qualify '
      + 'either. Counties can be slow — backlogs run up to about two years.',
    keyDates: [
      {
        label: 'SB 397 set-aside overhaul takes effect (ORS 137.225)',
        date: '2022-01-01',
        kind: 'effective',
        note: 'Shortened waits (Class B felony 20 yrs -> 7 yrs, etc.) and eliminated the court filing fee. Made many older convictions newly eligible — a key "you may already qualify" fact.',
      },
      {
        label: 'Amendment: expired money-judgment obligations count as sentence-complete',
        date: '2025',
        kind: 'effective',
        note: 'Chapter 395 of 2025. Wave 6 gives the year only. Unpaid old LFOs whose money judgments have expired no longer block a set-aside.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the Oregon State Police record-check / fingerprint fee amount. Wave 6 flags a conflict: $33 (Powell Law) vs $80 (fingerprint-card provisions/others). One OSP fee covers filings across multiple counties. The court filing fee itself was eliminated by SB 397. The fees and feeWaiver fields are null pending this amount; an OSP or circuit-court call is the check.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'Confirm the ORS 137.225 dismissal subsection against the current text. Wave 6 flags a known drafting error (an old subsection (9) cross-reference) that made SOME dismissed charges wait conviction-length periods rather than being expungeable anytime; a practitioner article flagged it unfixed as of 2024. The tree treats dismissals/acquittals as expungeable with essentially no wait but names this caveat; confirm the current statute and county practice (Multnomah).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the 2025 chapter 395 amendment (expired money-judgment obligations count as sentence-complete) and the county backlog reality (~2 years, practitioner-documented). The tree tells people old expired-judgment LFOs no longer block them and sets an honest timeline expectation; confirm both against current practice.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Or. Rev. Stat. § 137.225 (set-aside; SB 397 of 2021 eff. 2022; ch. 395 of 2025; waits and exclusions)', url: null, retrievedOn: null },
      { id: 'Or. Rev. Stat. § 475C.397 (marijuana conviction set-aside; anytime, no fees, no fingerprints)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_or' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_or' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_or' },
            { label: 'Diversion completed', value: 'deferred', next: 'diversion_duii_or' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_or: {
          type: 'boolean',
          text: 'Was the offense any of these: a Class A felony, a person felony, a sex offense, an offense with a child or elderly victim, or a traffic offense (including DUII)?',
          yes: 'ineligible_excluded_or',
          no: 'level_or'
        },
        level_or: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Class B felony (non-person, non-firearms)', value: 'felonyB', next: 'felonyB_date_or' },
            { label: 'Class C felony', value: 'felonyC', next: 'felonyC_date_or' },
            { label: 'Class A misdemeanor', value: 'misdA', next: 'misdA_date_or' },
            { label: 'Class B or C misdemeanor, violation, or contempt', value: 'misdBC', next: 'misdBC_date_or' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_or' }
          ]
        },
        diversion_duii_or: {
          type: 'boolean',
          text: 'Was this a DUII (driving-under-the-influence) diversion?',
          yes: 'ineligible_duii_or',
          no: 'nonconv_or'
        },
        felonyB_date_or: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted, or released from custody — whichever was later?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'conviction or release, whichever later, no other convictions during the wait, supervision complete (ORS 137.225 — Class B felony)' },
            nextPass: 'eligible_conviction_or',
            nextFail: 'waiting_or'
          }
        },
        felonyC_date_or: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted, or released from custody — whichever was later?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction or release, whichever later, no other convictions during the wait, supervision complete (ORS 137.225 — Class C felony)' },
            nextPass: 'eligible_conviction_or',
            nextFail: 'waiting_or'
          }
        },
        misdA_date_or: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted, or released from custody — whichever was later?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction or release, whichever later, no other convictions during the wait (ORS 137.225 — Class A misdemeanor)' },
            nextPass: 'eligible_conviction_or',
            nextFail: 'waiting_or'
          }
        },
        misdBC_date_or: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted, or released from custody — whichever was later?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'conviction or release, whichever later, no other convictions during the wait (ORS 137.225 — Class B/C misdemeanor, violation, contempt)' },
            nextPass: 'eligible_conviction_or',
            nextFail: 'waiting_or'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Oregon treats convictions and non-convictions differently, and the outcome decides the whole route. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or an Oregon State Police record check will show the disposition; Legal Aid Services of Oregon (1-800-351-7248) can help you read it.',
          remedy: 'Get Your Record First (court paperwork / OSP)',
          citation: 'Or. Rev. Stat. § 137.225 (the route depends on the disposition)'
        },
        eligible_conviction_or: {
          status: 'eligible',
          title: 'Waiting Period Met — Set-Aside Available',
          message: 'Based on your dates, your waiting period under ORS 137.225 has passed (7 years for a Class B felony, 5 for a Class C, 3 for a Class A misdemeanor, 1 for lesser misdemeanors and violations), you have had no other convictions during that time, and any supervision is complete. Two things worth knowing: the 2022 SB 397 overhaul made many older convictions newly eligible — so this may be newer than you think — and since a 2025 amendment, old unpaid fines whose money judgments have expired no longer block you. Filing is FREE; only a State Police record-check fee applies (the amount is something we are confirming), and one such fee covers filings in multiple counties. Expect the county to be slow — backlogs can run up to about two years. Legal Aid Services of Oregon can help.',
          remedy: 'Set-aside petition (ORS 137.225) — free to file',
          citation: 'Or. Rev. Stat. § 137.225'
        },
        nonconv_or: {
          status: 'eligible',
          title: 'No Conviction — Expungeable (One Caveat to Confirm)',
          message: 'Because your case ended without a conviction — dismissed, acquitted, or a non-DUII diversion — Oregon generally lets you set it aside with essentially no waiting period (arrests that never led to a charge have a short 60-day wait). Filing is free apart from the State Police record-check fee. One honest caveat: there is a known drafting error in ORS 137.225 that, as of 2024, some practitioners said could make certain DISMISSED charges wait a conviction-length period in some counties — it is on our list to verify against the current statute. So if a clerk pushes back on timing, that is why; Legal Aid Services of Oregon can help you navigate it.',
          remedy: 'Set-aside of a non-conviction (ORS 137.225) — confirm the dismissal-timing caveat',
          citation: 'Or. Rev. Stat. § 137.225'
        },
        ineligible_duii_or: {
          status: 'ineligible',
          title: 'DUII Diversion — Not Eligible to Set Aside',
          message: 'This is one of Oregon\'s traps, and it catches people. Even though you completed a DUII diversion and the charge was dismissed, Oregon does NOT allow a DUII diversion dismissal to be set aside — DUII is treated as a traffic offense, and those are excluded whether they end in conviction or diversion. So there is no set-aside route here. If you have OTHER, non-traffic offenses on your record, those may still qualify on their own; and it is worth confirming your exact disposition with Legal Aid Services of Oregon, since diversion records are handled unusually.',
          remedy: 'None (DUII diversion is excluded) — screen any non-traffic offenses separately',
          citation: 'Or. Rev. Stat. § 137.225'
        },
        waiting_or: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Oregon\'s set-aside waiting periods run from your conviction or release, whichever is later, with no other convictions in between: 7 years for a Class B felony, 5 for a Class C, 3 for a Class A misdemeanor, and 1 year for lesser misdemeanors and violations. Based on your dates, yours has not passed yet. When it does, filing is free apart from a State Police record-check fee. Legal Aid Services of Oregon can help you prepare.',
          remedy: 'Wait for the ORS 137.225 period',
          citation: 'Or. Rev. Stat. § 137.225'
        },
        ineligible_excluded_or: {
          status: 'ineligible',
          title: 'This Offense Is Excluded',
          message: 'Oregon excludes several categories from set-aside: Class A felonies, person felonies, sex offenses, offenses with a child or elderly victim, and traffic offenses including DUII. No waiting period changes that for the excluded offense. Two things worth knowing: marijuana convictions have their own separate path (ORS 475C.397) that is available anytime with no fees and no fingerprints, so if yours was marijuana-related, ask about that; and a Governor\'s pardon remains a route for otherwise-excluded offenses. Legal Aid Services of Oregon can help you check.',
          remedy: 'None for the excluded offense — ask about the marijuana path (475C.397) or a pardon',
          citation: 'Or. Rev. Stat. § 137.225'
        },
        complex_level_or: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'In Oregon the waiting period depends on the exact level — Class B felony (7 years), Class C felony (5), Class A misdemeanor (3), or lesser (1). Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and an Oregon State Police record check will show it. Legal Aid Services of Oregon can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / OSP)',
          citation: 'Or. Rev. Stat. § 137.225'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Set Aside a Conviction (ORS 137.225)',
          formName: 'Oregon Judicial Department set-aside forms',
          formUrl: 'https://www.courts.oregon.gov/forms/Pages/set-aside.aspx',
          steps: [
            'Confirm your offense is not excluded (Class A / person felonies, sex offenses, child/elder-victim offenses, traffic including DUII). Marijuana convictions use the separate, anytime, free path in ORS 475C.397.',
            'Check the waiting period for your level (7 / 5 / 3 / 1 years) from conviction or release, whichever is later — SB 397 shortened these, so you may already qualify.',
            'File in the sentencing court. The court filing fee was eliminated; a State Police record-check fee remains (one fee covers multiple counties).',
            'Expect a wait — the DA has 120 days to object and county backlogs can run up to about two years. Legal Aid Services of Oregon can help.'
          ],
          // null: SB 397 eliminated the filing fee, but the remaining OSP record-check
          // fee conflicts in the sources ($33 vs $80), so the total is unknown — and
          // with it, whether any waiver applies.
          fees: null,
          feeWaiver: null,
          courtContact: 'The sentencing court; Oregon State Police for the record check'
        }
      },
      legalAid: [
        { name: 'Legal Aid Services of Oregon (1-800-351-7248)', url: 'https://lasoregon.org' },
        { name: 'Oregon Judicial Department — Self-Help / Forms', url: 'https://www.courts.oregon.gov/self-help' }
      ]
    }
  },
  IA: {
    code: 'IA',
    name: 'Iowa',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Iowa uses EXPUNGEMENT (the record is made confidential, not destroyed), under Chapter 901C. It is '
      + 'narrow. There is NO felony-conviction expungement — felonies clear only by a Governor\'s pardon. '
      + 'Non-convictions can be expunged, but with an unusual and harsh catch: every court cost in the case '
      + 'must be PAID first. Completed deferred judgments are expunged automatically. And since 2019 you can '
      + 'expunge a misdemeanor conviction — but only ONE, ever: it is a once-per-lifetime application, so if '
      + 'you have several, you have to choose which one to spend it on. That makes the real question less '
      + '"am I eligible" and more "is this the record worth using my one chance on."',
    keyDates: [
      {
        label: 'Misdemeanor-conviction expungement enacted (Iowa Code § 901C.3)',
        date: '2019',
        kind: 'effective',
        note: 'Wave 6 gives the year only. Since 2019, a single misdemeanor conviction can be expunged 8 years after conviction — once per lifetime.',
      },
      {
        label: 'Automatic expungement of completed deferred judgments (Iowa Code § 907.9)',
        date: '2013-07',
        kind: 'operative',
        note: 'Wave 6 gives month and year. Deferred judgments completed after July 2013 are expunged automatically; earlier ones (and some rural unsupervised-probation cases) may need a motion.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the filing fee for Chapter 901C petitions. Wave 6 found no statutory filing fee for 901C petitions and flags it for a clerk (Polk County) — the petition is filed in the criminal case. The fees and feeWaiver fields are null pending this.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'Confirm the full list of ~25 excluded misdemeanor categories under Iowa Code § 901C.3. Wave 6 gives OWI (§ 321J.2), assault variants, harassment, stalking, weapons (ch. 724), and sex offenses among them, and flags the complete list as needing the statute. The tree asks these as exclusions; confirm the full set.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Iowa Code § 901C.2 (non-conviction expungement; all court costs paid; 180-day wait)', url: null, retrievedOn: null },
      { id: 'Iowa Code § 901C.3 (misdemeanor-conviction expungement; 8-yr wait; once per lifetime; ~25 exclusions)', url: null, retrievedOn: null },
      { id: 'Iowa Code § 907.9 (deferred-judgment expungement; automatic since Jul 2013)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_ia' },
            { label: 'Dismissed', value: 'dismissed', next: 'costs_ia' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'costs_ia' },
            { label: 'Deferred judgment completed', value: 'deferred', next: 'check_deferred_ia' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        costs_ia: {
          type: 'boolean',
          text: 'Have ALL court costs and fees in the case been paid? (Iowa is unusual — it requires every court cost paid before a non-conviction can be expunged.)',
          yes: 'nonconv_date_ia',
          no: 'ineligible_costs_ia'
        },
        nonconv_date_ia: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did the case end (the acquittal or dismissal)?',
          validation: {
            period: { amount: 180, unit: 'days', anchor: 'after the acquittal/dismissal with all court costs paid (Iowa Code § 901C.2 — non-conviction; waivable for good cause)' },
            nextPass: 'eligible_nonconv_ia',
            nextFail: 'waiting_nonconv_ia'
          }
        },
        level_ia: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_excluded_ia' },
            { label: 'Felony', value: 'felony', next: 'ineligible_felony_ia' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ia' }
          ]
        },
        misd_excluded_ia: {
          type: 'boolean',
          text: 'Was the offense any of these: OWI (operating while intoxicated), an assault, harassment, stalking, a weapons offense, a sex offense, or another similar excluded category?',
          yes: 'ineligible_excluded_ia',
          no: 'misd_date_ia'
        },
        misd_date_ia: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you convicted?',
          validation: {
            period: { amount: 8, unit: 'years', anchor: 'from conviction, all financial obligations paid, no pending charges (Iowa Code § 901C.3 — misdemeanor; once per lifetime)' },
            nextPass: 'eligible_misd_ia',
            nextFail: 'waiting_misd_ia'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Iowa handles non-convictions, completed deferred judgments, and misdemeanor convictions on three different tracks — and felonies not at all except by pardon. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Iowa Courts Online or your paperwork will show the disposition; Iowa Legal Aid can help you read it.',
          remedy: 'Get Your Record First (Iowa Courts Online / paperwork)',
          citation: 'Iowa Code §§ 901C.2, 901C.3, 907.9 (the route depends on the disposition)'
        },
        check_deferred_ia: {
          status: 'eligible',
          title: 'Deferred Judgment — Likely Already Expunged, Check',
          message: 'Because you completed a deferred judgment, Iowa expunges it AUTOMATICALLY if it was completed after July 2013 — no petition needed. So the honest first step is to CHECK whether it has already come off: look yourself up on Iowa Courts Online. If it completed before July 2013, or it was a rural unsupervised-probation case, you may need to file a motion to finish the job. Iowa Legal Aid can help you confirm and, if needed, file.',
          remedy: 'Check your record — a post-2013 deferred should already be expunged (§ 907.9)',
          citation: 'Iowa Code § 907.9'
        },
        eligible_nonconv_ia: {
          status: 'eligible',
          title: 'No Conviction, Costs Paid — Expungeable',
          message: 'Because your case ended without a conviction, all court costs are paid, and more than 180 days have passed, it can be expunged under Iowa Code § 901C.2. You file in the criminal case. Note this does not apply to deferred-judgment dismissals (those have their own automatic path) or insanity/incompetency dismissals. Iowa Legal Aid can help with the filing.',
          remedy: 'Non-conviction expungement (§ 901C.2)',
          citation: 'Iowa Code § 901C.2'
        },
        waiting_nonconv_ia: {
          status: 'waiting',
          title: 'Not Yet 180 Days',
          message: 'For a non-conviction with all court costs paid, Iowa lets you expunge 180 days after the case ended. Based on your date, that has not passed yet (the wait can sometimes be waived for good cause, such as identity theft). Once it does, you file in the criminal case. Iowa Legal Aid can help you prepare.',
          remedy: 'Wait until 180 days after the case ended (§ 901C.2)',
          citation: 'Iowa Code § 901C.2'
        },
        ineligible_costs_ia: {
          status: 'ineligible',
          title: 'Court Costs Must Be Paid First',
          message: 'Iowa has an unusual and, frankly, harsh requirement: even for a case that ended WITHOUT a conviction, you cannot expunge it until every court cost and fee in the case is paid. Because those are still outstanding, the expungement is blocked for now — but this is a "not yet," not a "never." Once the costs are cleared, and 180 days have passed since the case ended, you can file under § 901C.2. Iowa Legal Aid can help you sort out what is owed and to whom.',
          remedy: 'Pay the outstanding court costs, then expunge (§ 901C.2)',
          citation: 'Iowa Code § 901C.2'
        },
        eligible_misd_ia: {
          status: 'eligible',
          title: 'Misdemeanor, 8+ Years — Eligible, But Choose Carefully',
          message: 'Based on your dates — 8 years since conviction, financial obligations paid, and no pending charges — this misdemeanor is eligible for expungement under Iowa Code § 901C.3. But here is the Iowa-specific catch you should weigh before filing: you get only ONE misdemeanor expungement in your lifetime (one application covers multiple misdemeanors only if they were from the same incident). So if you have more than one misdemeanor on your record, the real question is which one is worth spending your single chance on. Iowa Legal Aid flags exactly this trade-off and can help you decide.',
          remedy: 'Misdemeanor expungement (§ 901C.3) — but it is once per lifetime',
          citation: 'Iowa Code § 901C.3'
        },
        waiting_misd_ia: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Iowa lets you expunge a misdemeanor conviction 8 years after the conviction, with all financial obligations paid and no pending charges. Based on your dates, that has not passed yet. When it does, remember it is a once-per-lifetime expungement, so it is worth being deliberate about which record you use it on. Iowa Legal Aid can help you plan.',
          remedy: 'Wait for the 8-year period (§ 901C.3)',
          citation: 'Iowa Code § 901C.3'
        },
        ineligible_excluded_ia: {
          status: 'ineligible',
          title: 'This Offense Is Excluded',
          message: 'Iowa\'s misdemeanor expungement law excludes about 25 categories, including OWI (operating while intoxicated), assault variants, harassment, stalking, weapons offenses, and sex offenses. Because yours falls in an excluded category, the § 901C.3 route does not apply, and no waiting period changes that. For an excluded offense, a Governor\'s pardon is the remaining route. Iowa Legal Aid can help you confirm the category and explain the pardon process.',
          remedy: 'None (Excluded Offense) — ask about a pardon',
          citation: 'Iowa Code § 901C.3'
        },
        ineligible_felony_ia: {
          status: 'ineligible',
          title: 'Felony Conviction — Pardon Only',
          message: 'Iowa does not have felony-conviction expungement at all — the only route to clear a felony conviction is a Governor\'s pardon. That is a real process, just a different one from expungement. Iowa Legal Aid and the Governor\'s office can explain how to apply. (If any of your charges ended without a conviction, those may still be expungeable separately.)',
          remedy: 'None (no felony expungement in Iowa) — a pardon is the route',
          citation: 'Iowa Code ch. 901C'
        },
        complex_level_ia: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'It matters a lot in Iowa: a misdemeanor conviction may be expungeable (once per lifetime, after 8 years), but a felony conviction cannot be expunged at all — only pardoned. Since you are not sure which yours is, we are not going to guess. Iowa Courts Online or your paperwork states it, and Iowa Legal Aid can help you read it.',
          remedy: 'Get the Conviction Level First (Iowa Courts Online / paperwork)',
          citation: 'Iowa Code § 901C.3'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (Iowa Code ch. 901C; deferred judgments § 907.9)',
          formName: 'Iowa Judicial Branch expungement forms',
          formUrl: 'https://www.iowacourts.gov/for-the-public/court-forms/',
          steps: [
            'For a completed deferred judgment, check Iowa Courts Online first — post-July-2013 completions are expunged automatically.',
            'For a non-conviction, pay every court cost in the case first (Iowa requires it), then file after 180 days under § 901C.2.',
            'For a misdemeanor conviction 8+ years old, file under § 901C.3 — but remember it is once per lifetime, so choose which record deliberately.',
            'Felony convictions cannot be expunged; a Governor\'s pardon is the only route. Iowa Legal Aid can help throughout.'
          ],
          // null: Wave 6 found no statutory filing fee for 901C petitions and flags
          // it for a clerk — so the fee, and any waiver, are unknown.
          fees: null,
          feeWaiver: null,
          courtContact: 'The court where the criminal case was filed'
        }
      },
      legalAid: [
        { name: 'Iowa Legal Aid', url: 'https://www.iowalegalaid.org' },
        { name: 'Iowa Judicial Branch — Court Forms', url: 'https://www.iowacourts.gov/for-the-public/court-forms/' }
      ]
    }
  },
  NV: {
    code: 'NV',
    name: 'Nevada',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Nevada uses RECORD SEALING — NRS 179.245 for convictions, NRS 179.255 for non-convictions. There is '
      + 'no automation; you petition. The waiting periods ladder by offense level, running from your release '
      + 'or discharge. The single most important thing to understand is the PACKAGE RULE: Nevada seals your '
      + 'record as one complete set, so a single case that is not yet eligible blocks the WHOLE petition, and '
      + 'a new conviction resets the clock. Non-convictions, by contrast, can be sealed immediately with no '
      + 'wait — something people often do not realize. Sealing restores your right to vote, hold office, and '
      + 'sit on a jury, but NOT firearm rights (that needs a pardon).',
    keyDates: [
      {
        label: 'Marijuana (<=2.5 oz) decriminalized-offense sealing, immediate (AB 192)',
        date: '2019',
        kind: 'effective',
        note: 'Wave 6 gives the year only. Records of now-decriminalized minor marijuana possession can be sealed immediately.',
      },
      {
        label: 'Pardoned convictions become sealable on receipt of the pardon',
        date: '2021',
        kind: 'effective',
        note: 'Wave 6 gives the year only. A pardoned conviction can be sealed once the pardon is received.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm when the sealing waiting clock starts — specifically whether "release or discharge" requires fines/fees paid. Wave 6 notes practitioner sources say completion includes fines but flags the clock start for verification. The tree runs each ladder period from release/discharge; confirm whether unpaid financial obligations delay the clock.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the 1-year general (catch-all) misdemeanor tier from the statute. Wave 6 lists it but flags it for confirmation against NRS 179.245. The tree routes "other misdemeanors" to a 1-year wait; confirm.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the sealing cost reality. Wave 6 says there is no single statutory fee — the cost is SCOPE reports from each arresting agency, a criminal-history record, and certified copies, roughly $150 all-in self-filed in Las Vegas Justice Court (practitioner figure), plus a months-long Carson City Repository backlog to actually seal after the order. The fees and feeWaiver fields are null pending this; the Nevada Legal Services Record Sealing Manual and the Eighth Judicial District are the checks.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Nev. Rev. Stat. § 179.245 (conviction sealing; tiered waits)', url: null, retrievedOn: null },
      { id: 'Nev. Rev. Stat. § 179.255 (non-conviction sealing; immediate)', url: null, retrievedOn: null },
      { id: 'Nev. Rev. Stat. § 179.2445 (rebuttable presumption in favor of sealing)', url: null, retrievedOn: null },
      { id: 'AB 192 of 2019 (sealing of decriminalized minor marijuana possession)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_nv' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconv_nv' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_nv' },
            { label: 'Diversion completed / charge dismissed', value: 'deferred', next: 'eligible_nonconv_nv' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_nv: {
          type: 'boolean',
          text: 'Was the offense any of these: a crime against a child, a sex offense, a felony DUI, or home invasion with a deadly weapon?',
          yes: 'ineligible_excluded_nv',
          no: 'package_rule_nv'
        },
        package_rule_nv: {
          type: 'boolean',
          text: 'Nevada seals your record as one complete set. Do you have ANY other criminal case that is not yet eligible to be sealed — for example a more recent conviction, or another case still inside its waiting period?',
          yes: 'complex_package_nv',
          no: 'level_nv'
        },
        level_nv: {
          type: 'choice',
          text: 'How would you describe the offense?',
          options: [
            { label: 'Category A felony, a crime of violence, or residential burglary', value: 'catA', next: 'date10_nv' },
            { label: 'Category B, C, or D felony', value: 'catBCD', next: 'date5_nv' },
            { label: 'Category E felony', value: 'catE', next: 'date2_nv' },
            { label: 'Gross misdemeanor', value: 'gross', next: 'date2_nv' },
            { label: 'Misdemeanor DV battery, misdemeanor DUI, or welfare fraud', value: 'misd7', next: 'date7_nv' },
            { label: 'Misdemeanor battery, harassment, stalking, or protection-order violation', value: 'misd2', next: 'date2_nv' },
            { label: 'Another misdemeanor', value: 'misd1', next: 'date1_nv' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_nv' }
          ]
        },
        date10_nv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you released or discharged from this case (custody, probation, or parole)?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from release/discharge (NRS 179.245 — Category A felony, crime of violence, or residential burglary)' },
            nextPass: 'eligible_conviction_nv',
            nextFail: 'waiting_nv'
          }
        },
        date5_nv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you released or discharged from this case (custody, probation, or parole)?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from release/discharge (NRS 179.245 — Category B, C, or D felony)' },
            nextPass: 'eligible_conviction_nv',
            nextFail: 'waiting_nv'
          }
        },
        date2_nv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you released or discharged from this case (custody, probation, or parole)?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'from release/discharge (NRS 179.245 — Category E felony, gross misdemeanor, or misd. battery/harassment/stalking/protection-order violation)' },
            nextPass: 'eligible_conviction_nv',
            nextFail: 'waiting_nv'
          }
        },
        date7_nv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you released or discharged from this case (custody, probation, or parole)?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'from release/discharge (NRS 179.245 — misdemeanor DV battery, misdemeanor DUI, or welfare fraud)' },
            nextPass: 'eligible_conviction_nv',
            nextFail: 'waiting_nv'
          }
        },
        date1_nv: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you released or discharged from this case (custody, probation, or parole)?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'from release/discharge (NRS 179.245 — general misdemeanor)' },
            nextPass: 'eligible_conviction_nv',
            nextFail: 'waiting_nv'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Nevada seals convictions and non-convictions differently — non-convictions can be sealed immediately, while convictions ladder by level from your release date. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. A Nevada criminal-history (SCOPE) report or your court paperwork will show the disposition; the Nevada Legal Services Record Sealing Manual explains the tracks.',
          remedy: 'Get Your Record First (SCOPE / court paperwork)',
          citation: 'Nev. Rev. Stat. §§ 179.245, 179.255 (the route depends on the disposition)'
        },
        eligible_nonconv_nv: {
          status: 'eligible',
          title: 'No Conviction — Sealable Immediately',
          message: 'Because your case ended without a conviction — dismissed, acquitted, or a completed diversion — Nevada lets you seal it IMMEDIATELY, with no waiting period. People often do not realize this is available. You petition under NRS 179.255; there is a rebuttable presumption in your favor, and if the prosecutor stipulates, the court must seal. The main cost is gathering the records (SCOPE reports, criminal history, certified copies) rather than a single filing fee. The Nevada Legal Services Record Sealing Manual walks through it.',
          remedy: 'Non-conviction sealing (NRS 179.255) — no wait',
          citation: 'Nev. Rev. Stat. § 179.255'
        },
        eligible_conviction_nv: {
          status: 'eligible',
          title: 'Waiting Period Met — Sealing Available',
          message: 'Based on your dates, the waiting period for your offense level has passed, running from your release or discharge (10 years for the most serious, down through 5, 2, and 1 year for lesser offenses; 7 years for misdemeanor DV battery, misdemeanor DUI, or welfare fraud). Nevada applies a rebuttable presumption in your favor, and if the prosecutor stipulates the court must seal. Remember the package rule: everything you want sealed has to be eligible at once. There is no single filing fee — budget for record-gathering (SCOPE reports, criminal history, certified copies), and expect a months-long Repository backlog to actually seal after the order. Sealing restores voting, office, and jury rights, but not firearms. Nevada Legal Services can help.',
          remedy: 'Conviction sealing petition (NRS 179.245)',
          citation: 'Nev. Rev. Stat. § 179.245'
        },
        waiting_nv: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Nevada\'s sealing waiting periods run from your release or discharge and ladder by level: 10 years for the most serious offenses, 5 for mid-level felonies, 2 for the lowest felony and gross misdemeanors, 7 for misdemeanor DV battery / DUI / welfare fraud, and 1 year for other misdemeanors. Based on your dates, yours has not passed yet — and note a new conviction would reset the clock. When the time comes, the Nevada Legal Services Record Sealing Manual is the self-help authority.',
          remedy: 'Wait for the NRS 179.245 period (a new conviction resets it)',
          citation: 'Nev. Rev. Stat. § 179.245'
        },
        ineligible_excluded_nv: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Sealed',
          message: 'Nevada never seals certain offenses: crimes against children, sex offenses, felony DUI, and home invasion with a deadly weapon. No waiting period changes that. For an offense like this, a pardon from the State Board of Pardons is the remaining route — and a pardoned conviction can then be sealed. Nevada Legal Services can explain the pardon process and check whether any of your other cases might be sealable on their own.',
          remedy: 'None (Excluded Offense) — a pardon can open a sealing path',
          citation: 'Nev. Rev. Stat. § 179.245'
        },
        complex_package_nv: {
          status: 'complex',
          title: 'The Package Rule May Be Blocking You',
          message: 'This is Nevada\'s most important and least-known rule. Nevada seals your record as one complete SET — so even if the offense you asked about is eligible, a single OTHER case that is not yet eligible (a more recent conviction, or another case still inside its waiting period) blocks the entire petition. Because you told us there is such a case, sealing is likely blocked until that case also becomes eligible. This is not necessarily a permanent no: once every case is past its own waiting period, the whole set can be sealed together. Nevada Legal Services can map out when that happens for your specific record.',
          remedy: 'Wait until every case is eligible — the package must clear together',
          citation: 'Nev. Rev. Stat. § 179.245'
        },
        complex_level_nv: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'Nevada\'s waiting period depends closely on the exact level — the category of felony, or which kind of misdemeanor. Since you are not sure which yours is, we are not going to guess between a 1-year and a 10-year wait. A SCOPE criminal-history report or your court paperwork states it, and the Nevada Legal Services Record Sealing Manual can help you read it.',
          remedy: 'Get the Offense Level First (SCOPE / court paperwork)',
          citation: 'Nev. Rev. Stat. § 179.245'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Record Sealing (Nev. Rev. Stat. §§ 179.245, 179.255)',
          formName: 'Nevada Legal Services Record Sealing Manual / Eighth Judicial District forms',
          formUrl: 'https://nlslaw.net/record-sealing/',
          steps: [
            'Confirm your offense is not one Nevada never seals (crimes against children, sex offenses, felony DUI, home invasion with a deadly weapon).',
            'Check the package rule first: every case you want sealed must be past its own waiting period, because Nevada seals the whole set at once.',
            'Gather the records: SCOPE reports from each arresting agency, your criminal history, and certified copies — there is no single statutory filing fee.',
            'File the petition; there is a rebuttable presumption in your favor and a 30-day objection window. Expect a months-long Repository backlog to actually seal after the order.'
          ],
          // null: Wave 6 says there is no single statutory fee — cost is record-gathering,
          // roughly $150 all-in per a practitioner figure that is flagged for verification,
          // so the fee and any waiver are unknown.
          fees: null,
          feeWaiver: null,
          courtContact: 'The court where the case was decided (Las Vegas Justice Court / Eighth Judicial District)'
        }
      },
      legalAid: [
        { name: 'Nevada Legal Services — Record Sealing Manual', url: 'https://nlslaw.net' },
        { name: 'Legal Aid Center of Southern Nevada', url: 'https://www.lacsn.org' }
      ]
    }
  },
  AR: {
    code: 'AR',
    name: 'Arkansas',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Arkansas uses SEALING, under the Comprehensive Criminal Record Sealing Act of 2013 (§ 16-90-1401 '
      + 'et seq.), with uniform petition and order forms statewide. It is quietly one of the more generous '
      + 'states, and two facts drive that. First, filing is FREE — there has been no filing fee since July '
      + '2019 (Act 680). Second, many records seal IMMEDIATELY on sentence completion, with no waiting '
      + 'period: most misdemeanors, and non-violent Class C/D felonies plus Class A/B DRUG felonies. '
      + '"Completion" includes paying your fines and costs. There is a cap worth knowing — you can seal with '
      + 'at most one prior felony conviction (felonies from the same episode count as one).',
    keyDates: [
      {
        label: 'Filing fee eliminated statewide (Act 680)',
        date: '2019-07',
        kind: 'effective',
        note: 'Wave 6 gives month and year. Since July 2019 there has been no filing fee to seal a record in Arkansas (confirmed by Legal Aid of Arkansas).',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the short list of more serious misdemeanors that carry a 5-year wait (rather than immediate sealing). Wave 6 gives negligent-homicide A-misdemeanor, third-degree battery, indecent exposure, and DV-adjacent offenses among them, and flags the full list for the statute (§ 16-90-1405). The tree asks a "serious misdemeanor" question routing to a 5-year wait; confirm the list.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the misdemeanor-DWI 10-year wait. Wave 6 gives it per Legal Aid of Arkansas and flags it as a surprisingly long outlier needing confirmation. The tree routes a misdemeanor DWI to a 10-year wait; confirm against the statute.',
        blocksFields: [],
      },
      {
        question:
          'Confirm that non-convictions (arrests, nolle prosequi, dismissals, acquittals) are sealable with NO waiting period under §§ 16-90-1409/1410. Wave 6 gives this but flags it for confirmation. The tree routes non-convictions to an immediate result; confirm.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the one-prior-felony cap and how same-episode felonies count. Wave 6 says sealing allows at most one prior felony conviction, with same-episode felonies counting as one, and flags persona 3 (two separate felony convictions) as an analysis branch. The tree routes people with more than one prior felony to a "get an analysis" result; confirm the rule (§ 16-90-1406).',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Ark. Code § 16-90-1405 (misdemeanor sealing; immediate on completion; serious-list and DWI waits)', url: null, retrievedOn: null },
      { id: 'Ark. Code § 16-90-1406 (felony sealing; immediate for non-violent C/D and A/B drug; one-prior-felony cap)', url: null, retrievedOn: null },
      { id: 'Ark. Code § 16-90-1408 (offenses ineligible for sealing)', url: null, retrievedOn: null },
      { id: 'Ark. Code §§ 16-90-1409, 16-90-1410 (non-conviction sealing)', url: null, retrievedOn: null },
      { id: 'Act 680 of 2019 (eliminated the sealing filing fee)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_ar' },
            { label: 'Dismissed / Nolle prosequi', value: 'dismissed', next: 'eligible_nonconv_ar' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_ar' },
            { label: 'First Offender Act 346 / diversion completed', value: 'deferred', next: 'eligible_nonconv_ar' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        level_ar: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_dwi_ar' },
            { label: 'Felony', value: 'felony', next: 'felony_excluded_ar' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ar' }
          ]
        },
        misd_dwi_ar: {
          type: 'boolean',
          text: 'Was this a DWI (driving while intoxicated)?',
          yes: 'misd_dwi_date_ar',
          no: 'misd_serious_ar'
        },
        misd_serious_ar: {
          type: 'boolean',
          text: 'Was it one of a short list of more serious misdemeanors — negligent homicide, third-degree battery, indecent exposure, or a domestic-violence-related misdemeanor?',
          yes: 'misd_serious_date_ar',
          no: 'eligible_misd_ar'
        },
        misd_dwi_date_ar: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including paying all fines and costs?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from completion of sentence including fines/costs (Ark. Code § 16-90-1405 — misdemeanor DWI)' },
            nextPass: 'eligible_misd_ar',
            nextFail: 'waiting_ar'
          }
        },
        misd_serious_date_ar: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including paying all fines and costs?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from completion of sentence including fines/costs (Ark. Code § 16-90-1405 — serious-list misdemeanor)' },
            nextPass: 'eligible_misd_ar',
            nextFail: 'waiting_ar'
          }
        },
        felony_excluded_ar: {
          type: 'boolean',
          text: 'Was the offense any of these: a Class Y, A, or B felony that is NOT a drug offense; manslaughter; a sex offense; a violent felony; an unclassified felony with a maximum over 10 years; or a CDL-holder traffic felony?',
          yes: 'ineligible_excluded_ar',
          no: 'felony_prior_ar'
        },
        felony_prior_ar: {
          type: 'boolean',
          text: 'Do you have more than one prior felony conviction? (Arkansas allows sealing with at most one prior felony; felonies from the same episode count as one.)',
          yes: 'complex_priorfelony_ar',
          no: 'felony_violent_ar'
        },
        felony_violent_ar: {
          type: 'boolean',
          text: 'Was it a VIOLENT Class C or D felony? (Non-violent Class C/D felonies and Class A/B drug felonies seal immediately; violent C/D felonies have a 5-year wait.)',
          yes: 'felony_violent_date_ar',
          no: 'eligible_felony_ar'
        },
        felony_violent_date_ar: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including paying all fines and costs?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from completion of sentence including fines/costs (Ark. Code § 16-90-1406 — violent Class C/D felony)' },
            nextPass: 'eligible_felony_ar',
            nextFail: 'waiting_ar'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Arkansas seals convictions and non-convictions differently, and many records seal immediately once you know which track you are on. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. An Arkansas State Police (ACIC) criminal-history request or your court paperwork will show the disposition; Legal Aid of Arkansas can help you read it.',
          remedy: 'Get Your Record First (ACIC / court paperwork)',
          citation: 'Ark. Code § 16-90-1401 et seq. (the route depends on the disposition)'
        },
        eligible_nonconv_ar: {
          status: 'eligible',
          title: 'No Conviction — Sealable Now, Free',
          message: 'Because your case ended without a conviction — dismissed, nolle prosequi, acquitted, or completed under the First Offender Act 346 — Arkansas lets you seal it with no waiting period, and filing is free (no fee since Act 680 in 2019). You use the statewide uniform petition, filed in the court of the case. Legal Aid of Arkansas can help. (First Offender Act 346 completions and pardoned convictions also have their own sealing doors.)',
          remedy: 'Non-conviction sealing (§§ 16-90-1409/1410) — free, no wait',
          citation: 'Ark. Code §§ 16-90-1409, 16-90-1410'
        },
        eligible_misd_ar: {
          status: 'eligible',
          title: 'Misdemeanor — Sealable, and Filing Is Free',
          message: 'Your misdemeanor is sealable in Arkansas, and filing is free (no fee since Act 680 in 2019). Most misdemeanors seal IMMEDIATELY once your sentence is complete and your fines and costs are paid — there is no waiting period and no limit on how many you can seal. A short list of more serious misdemeanors carries a 5-year wait, and a misdemeanor DWI a 10-year wait, but based on what you told us yours is clear to file. You use the statewide uniform petition in the court of the case; the prosecutor has 30 days to object, and the standard is that the court SHALL seal absent clear-and-convincing reasons not to. Legal Aid of Arkansas can help.',
          remedy: 'Misdemeanor sealing (§ 16-90-1405) — free',
          citation: 'Ark. Code § 16-90-1405'
        },
        eligible_felony_ar: {
          status: 'eligible',
          title: 'Felony — Sealable, Possibly Right Now',
          message: 'This is Arkansas being quietly generous. Non-violent Class C and D felonies, and Class A/B DRUG felonies, seal IMMEDIATELY once your sentence is complete and your fines and costs are paid — no waiting period. (Violent Class C/D felonies have a 5-year wait.) Filing is free, on the statewide uniform petition in the court of the case; the court must wait 90 days before granting, and the decision is discretionary. Remember the cap: this works with at most one prior felony conviction. Legal Aid of Arkansas can help you file.',
          remedy: 'Felony sealing (§ 16-90-1406) — free; immediate for non-violent C/D and A/B drug',
          citation: 'Ark. Code § 16-90-1406'
        },
        waiting_ar: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'A few Arkansas offenses carry a wait before sealing: a short list of serious misdemeanors (5 years), a misdemeanor DWI (10 years), and violent Class C/D felonies (5 years), each running from when you completed your sentence and paid your fines and costs. Based on your dates, yours has not passed yet. When it does, filing is free. Legal Aid of Arkansas can help you time it.',
          remedy: 'Wait for the period, then seal for free',
          citation: 'Ark. Code §§ 16-90-1405, 16-90-1406'
        },
        ineligible_excluded_ar: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Sealed',
          message: 'Arkansas excludes certain offenses from sealing entirely (§ 16-90-1408): Class Y, A, and B felonies that are not drug offenses, manslaughter, sex offenses, violent felonies, unclassified felonies with a maximum over 10 years, and CDL-holder traffic felonies. No waiting period changes that. A pardon from the Governor remains a route for an otherwise-ineligible offense. Legal Aid of Arkansas can help you confirm where yours falls and explain the pardon process.',
          remedy: 'None (Ineligible Offense) — a pardon is the remaining route',
          citation: 'Ark. Code § 16-90-1408'
        },
        complex_priorfelony_ar: {
          status: 'complex',
          title: 'The One-Prior-Felony Cap Needs a Closer Look',
          message: 'Arkansas lets you seal a felony only if you have at most ONE prior felony conviction — but with an important wrinkle: felonies arising from the same episode count as a single conviction. Because you told us you have more than one prior felony, whether you qualify depends on how those convictions are counted, which is exactly the kind of analysis worth doing with help rather than guessing at. Legal Aid of Arkansas can look at your specific record and tell you whether the cap is met. If it is, the good news is that filing is free.',
          remedy: 'Get a One-Prior-Felony Analysis (Legal Aid of Arkansas)',
          citation: 'Ark. Code § 16-90-1406'
        },
        complex_level_ar: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'Arkansas sealing works differently for misdemeanors and felonies, and within felonies the class and whether it is a drug offense matter a lot. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and an ACIC criminal-history request will show it. Legal Aid of Arkansas can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / ACIC)',
          citation: 'Ark. Code § 16-90-1401 et seq.'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Record Sealing (Comprehensive Criminal Record Sealing Act, Ark. Code § 16-90-1401 et seq.)',
          formName: 'ACIC uniform statewide petition and order forms',
          formUrl: 'https://acic.arkansas.gov',
          steps: [
            'Confirm your offense is not on the § 16-90-1408 ineligible list, and that you have at most one prior felony conviction (same-episode felonies count as one).',
            'Complete your sentence, including paying all fines and costs — "completion" includes the money owed.',
            'File the statewide uniform petition in the court of the case. There is no filing fee (Act 680, 2019).',
            'The prosecutor has 30 days to object on misdemeanors; on felonies the court waits 90 days before granting. Legal Aid of Arkansas can help.'
          ],
          // NOT null: Wave 6 states there is no filing fee since Act 680 (July 2019).
          fees: 'No filing fee — Arkansas eliminated the sealing filing fee statewide in July 2019 (Act 680).',
          feeWaiver: 'Not needed — filing is free statewide since Act 680 (2019).',
          courtContact: 'The court where the case was decided'
        }
      },
      legalAid: [
        { name: 'Legal Aid of Arkansas', url: 'https://arlegalaid.org' },
        { name: 'Center for Arkansas Legal Services', url: 'https://arlegalservices.org' }
      ]
    }
  },
  MS: {
    code: 'MS',
    name: 'Mississippi',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Mississippi uses EXPUNCTION (§ 99-19-71), filed in the court that handled the case. The defining fact '
      + 'for felonies: you get ONE felony expunction in your LIFETIME, five years after you finish every term '
      + 'of the sentence and pay all fines and costs — and it is discretionary, so a judge has to find you '
      + 'rehabilitated after a hearing with 10 days\' notice to the district attorney. That makes the real '
      + 'question less "am I eligible" and more "is this the conviction worth using my one chance on." '
      + 'Misdemeanors are easier — a first-offense, non-traffic misdemeanor can be petitioned with no set '
      + 'waiting period. Non-convictions can be expunged on petition (the court "shall" grant), though not '
      + 'automatically.',
    keyDates: [
      {
        label: 'General one-felony-per-lifetime expunction rule in effect (§ 99-19-71)',
        date: '2019',
        kind: 'effective',
        note: 'Wave 6 gives the year only ("post-Jul 2019 general rule"). A person may expunge one felony in their lifetime, 5 years after completing all sentence terms.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the full felony exclusion list under § 99-19-71. Wave 6 gives crimes of violence (§ 97-3-2), first-degree arson, drug trafficking, third-or-later DUI, felon-in-possession, failure to register as a sex offender, and EMBEZZLEMENT (the surprising one), and flags the list as needing the full statute text. The tree asks these as exclusions; confirm the complete set.',
        blocksFields: [],
      },
      {
        question:
          'Confirm that a first-offense, non-traffic misdemeanor has NO statutory waiting period for expunction. Wave 6 gives this but flags it for confirmation. The tree routes a first-offense misdemeanor to an immediate petition result; confirm.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the $150 expunction fee is current and whether it applies to non-conviction petitions. Wave 6 gives § 99-19-72: $100 judicial fund + $40 DA fund + $10 clerk = $150, and flags both currency and non-conviction scope. Also confirm the 2026 automatic-expungement bill (HB 1344) died before encoding "no automation" (bills were introduced 2024 HB 801, 2025 HB 1117, 2026 HB 1344).',
        blocksFields: [],
      },
      {
        question:
          'Confirm whether a pauper\'s/indigency waiver applies to the $150 expunction fee. Wave 6 gives the fee amount but says nothing about a waiver; the feeWaiver field is null pending confirmation with a circuit clerk (Hinds).',
        blocksFields: ['resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Miss. Code § 99-19-71 (expunction; one felony per lifetime; 5-yr wait; misdemeanor and non-conviction paths; exclusions)', url: null, retrievedOn: null },
      { id: 'Miss. Code § 99-19-72 ($150 expunction fee: $100 judicial + $40 DA + $10 clerk)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_ms' },
            { label: 'Dismissed / Charges dropped', value: 'dismissed', next: 'eligible_nonconv_ms' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_ms' },
            { label: 'Non-adjudication / diversion completed', value: 'deferred', next: 'eligible_nonconv_ms' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        level_ms: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_firstoffender_ms' },
            { label: 'Felony', value: 'felony', next: 'felony_prioruse_ms' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ms' }
          ]
        },
        misd_firstoffender_ms: {
          type: 'boolean',
          text: 'Is this your first offense, and was it a non-traffic misdemeanor?',
          yes: 'eligible_misd_ms',
          no: 'complex_misd_discretionary_ms'
        },
        felony_prioruse_ms: {
          type: 'boolean',
          text: 'Have you already used a felony expunction before? (Mississippi allows only ONE felony expunction in your lifetime.)',
          yes: 'ineligible_prioruse_ms',
          no: 'felony_excluded_ms'
        },
        felony_excluded_ms: {
          type: 'boolean',
          text: 'Was the offense any of these: a crime of violence, first-degree arson, drug trafficking, a third-or-later DUI, felon-in-possession of a weapon, failure to register as a sex offender, or embezzlement?',
          yes: 'ineligible_excluded_ms',
          no: 'felony_date_ms'
        },
        felony_date_ms: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete every term of your sentence, including paying all fines and costs?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'after completing all sentence terms with fines/costs paid (Miss. Code § 99-19-71 — felony; discretionary, one per lifetime)' },
            nextPass: 'eligible_felony_ms',
            nextFail: 'waiting_ms'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Mississippi handles convictions and non-convictions differently, and felonies have a once-in-a-lifetime rule that makes the outcome important to get right. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a Mississippi criminal-history request will show the disposition; the Mississippi Center for Justice has expungement resources.',
          remedy: 'Get Your Record First (court paperwork / criminal history)',
          citation: 'Miss. Code § 99-19-71 (the route depends on the disposition)'
        },
        eligible_nonconv_ms: {
          status: 'eligible',
          title: 'No Conviction — Expungeable by Petition',
          message: 'Because your case ended without a conviction — dismissed, dropped, acquitted, or resolved through non-adjudication — Mississippi expunges it on petition, and for these the court "shall" grant expunction. It is not automatic, so you do have to file, in the court that handled the case. Note the $150 statutory fee may or may not apply to non-conviction petitions (we are confirming that). The Mississippi Center for Justice can help.',
          remedy: 'Non-conviction expunction petition (§ 99-19-71) — court shall grant',
          citation: 'Miss. Code § 99-19-71'
        },
        eligible_misd_ms: {
          status: 'eligible',
          title: 'First-Offense Misdemeanor — Expungeable, No Set Wait',
          message: 'Because this is a first-offense, non-traffic misdemeanor, Mississippi lets you petition the convicting court to expunge it with no set waiting period. You file in the court that handled the case; the statutory fee is $150 ($100 judicial fund, $40 DA fund, $10 clerk). The Mississippi Center for Justice can help with the petition. (Even beyond first offenses, municipal and justice courts can expunge misdemeanors at their discretion after two years of good conduct, and there is a separate path for people under 23.)',
          remedy: 'First-offense misdemeanor expunction (§ 99-19-71)',
          citation: 'Miss. Code § 99-19-71'
        },
        complex_misd_discretionary_ms: {
          status: 'complex',
          title: 'Not a First Offense — a Discretionary Path May Still Exist',
          message: 'The simplest misdemeanor route (a first-offense, non-traffic misdemeanor with no set wait) does not fit, because this is not a first offense. That is not the end of the road: municipal and justice courts in Mississippi can expunge misdemeanors at their DISCRETION after two years of good conduct, and there is a separate first-offender path for people who were under 23. Because these are discretionary and court-specific, it is worth confirming with the court that handled your case, or with the Mississippi Center for Justice, rather than guessing.',
          remedy: 'Ask the convicting court about discretionary misdemeanor expunction (2-yr good conduct)',
          citation: 'Miss. Code § 99-19-71'
        },
        eligible_felony_ms: {
          status: 'eligible',
          title: 'Felony, 5+ Years — Eligible, But It Is Your One Shot',
          message: 'Based on your dates — five years since you finished every term of the sentence and paid all fines and costs — this felony is eligible for expunction under § 99-19-71. Two Mississippi-specific things to weigh before you file. First, you get only ONE felony expunction in your lifetime, so if you have more than one felony, choose deliberately (offenses sharing a common set of facts count as one conviction). Second, it is discretionary: a judge decides after a hearing, with 10 days\' notice to the district attorney, and has to find you rehabilitated — so it helps to come prepared. The $150 fee applies. The Mississippi Center for Justice can help you make the strongest case.',
          remedy: 'Felony expunction (§ 99-19-71) — once per lifetime, discretionary',
          citation: 'Miss. Code § 99-19-71'
        },
        waiting_ms: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Mississippi lets you expunge a felony five years after you complete every term of the sentence and pay all fines and costs. Based on your dates, that has not passed yet. When it does, remember this is a once-in-a-lifetime, discretionary expunction — so it is worth being deliberate about which conviction you use it on and coming to the hearing prepared. The Mississippi Center for Justice can help you plan.',
          remedy: 'Wait for the 5-year period (§ 99-19-71)',
          citation: 'Miss. Code § 99-19-71'
        },
        ineligible_excluded_ms: {
          status: 'ineligible',
          title: 'This Felony Is Excluded',
          message: 'Mississippi excludes a set of felonies from expunction, and this one falls in it: crimes of violence, first-degree arson, drug trafficking, a third-or-later DUI, felon-in-possession of a weapon, failure to register as a sex offender, and — the one that surprises people — embezzlement. No waiting period changes that. A pardon from the Governor remains a route for an otherwise-ineligible offense. The Mississippi Center for Justice can help you confirm the category and explain the pardon process.',
          remedy: 'None (Excluded Felony) — a pardon is the remaining route',
          citation: 'Miss. Code § 99-19-71'
        },
        ineligible_prioruse_ms: {
          status: 'ineligible',
          title: 'Your One Felony Expunction Has Been Used',
          message: 'Mississippi allows only one felony expunction in a lifetime, and because you have already used it, a second felony cannot be expunged — no waiting period changes that. Two things are still worth checking: any NON-conviction on your record can still be expunged separately, and a pardon from the Governor remains a route for the felony itself. The Mississippi Center for Justice can help you look at both.',
          remedy: 'None (one-felony limit used) — check non-convictions or a pardon',
          citation: 'Miss. Code § 99-19-71'
        },
        complex_level_ms: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'Mississippi treats misdemeanors and felonies very differently — a first-offense misdemeanor has no set wait, while a felony is a once-in-a-lifetime, discretionary expunction after 5 years. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a criminal-history request will show it. The Mississippi Center for Justice can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / criminal history)',
          citation: 'Miss. Code § 99-19-71'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expunction (Miss. Code § 99-19-71)',
          formName: 'Petition for expunction (filed in the court that handled the case)',
          formUrl: 'https://www.mscenterforjustice.org',
          steps: [
            'For a felony, confirm it is not excluded (violence, first-degree arson, trafficking, 3rd+ DUI, felon-in-possession, sex-registration failure, embezzlement) and that you have not used your one lifetime felony expunction.',
            'Complete every term of the sentence and pay all fines and costs; for a felony, wait 5 years from that point.',
            'File the petition in the court that handled the case. The statutory fee is $150 ($100 judicial + $40 DA + $10 clerk).',
            'A felony expunction is discretionary — the judge holds a hearing with 10 days\' notice to the DA and must find you rehabilitated, so come prepared. The Mississippi Center for Justice can help.'
          ],
          // NOT null: § 99-19-72 gives $150 ($100 + $40 + $10). Currency and
          // non-conviction scope are flagged as open questions, not a conflicting value.
          fees: '$150 statutory expunction fee (§ 99-19-72): $100 judicial fund, $40 DA fund, $10 clerk. Whether it applies to non-conviction petitions is being confirmed.',
          // null: Wave 6 gives no waiver information; whether a pauper's/indigency
          // waiver applies is an open question.
          feeWaiver: null,
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Mississippi Center for Justice', url: 'https://www.mscenterforjustice.org' },
        { name: 'Mission First Legal Aid Office', url: 'https://missionfirst.org' }
      ]
    }
  },
  KS: {
    code: 'KS',
    name: 'Kansas',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Kansas uses EXPUNGEMENT (K.S.A. 21-6614), which functions as sealing — the record survives for certain '
      + 'listed agencies. It is discretionary but broad, and it has two features that stand out from the rest '
      + 'of this wave. First, DUI is actually expungeable here (a first DUI after a 5-year wait), which is '
      + 'unusual. Second, a Kansas expungement RESTORES firearm rights (since 2021) — rare among states. The '
      + 'waiting periods run from when your sentence is satisfied, and graduates of a drug court or veterans '
      + 'treatment court can petition immediately with the docket fee waivable. The court "shall" expunge if '
      + 'you have had no felony conviction in the past two years, none is pending, and the circumstances '
      + 'warrant it.',
    keyDates: [
      {
        label: 'Expungement restores firearm rights (K.S.A. 21-6614(k)(2))',
        date: '2021',
        kind: 'effective',
        note: 'Wave 6 gives the year only. A Kansas expungement restores firearm rights — rare among states, and worth knowing.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the docket fee. Wave 6 flags a conflict: the statute text says $176, while current guides and Judicial Council materials say $195 (set by a Supreme Court order that updates over time). The fees field is null pending this; a district clerk is the check. (The fee is waived for non-convictions, and a poverty affidavit is available.)',
        blocksFields: ['resources.remedies.expungement.fees'],
      },
      {
        question:
          'Confirm the exact waiting period for a second-or-later DUI. Wave 6 gives it as a 7-to-10-year range, which is not a single number; the tree routes a 2nd+ DUI to an "exact period needs confirming" result rather than guess. Confirm the precise period against K.S.A. 21-6614.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Kan. Stat. Ann. § 21-6614 (expungement; 3-yr and 5-yr tiers; discretionary standard; firearm restoration)', url: null, retrievedOn: null },
      { id: 'Kan. Stat. Ann. § 22-2410 (arrest-record expungement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_ks' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconv_ks' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_ks' },
            { label: 'Diversion agreement completed', value: 'deferred', next: 'diversion_date_ks' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_ks: {
          type: 'boolean',
          text: 'Was the offense any of these: murder, manslaughter, rape, a sex offense against a minor, child abuse, or a commercial-vehicle DUI — or are you still required to register as an offender?',
          yes: 'ineligible_excluded_ks',
          no: 'specialty_ks'
        },
        specialty_ks: {
          type: 'boolean',
          text: 'Did you graduate from a drug court or a veterans treatment court program?',
          yes: 'eligible_specialty_ks',
          no: 'level_ks'
        },
        level_ks: {
          type: 'choice',
          text: 'How would you describe the offense?',
          options: [
            { label: 'A misdemeanor, or a traffic/tobacco infraction', value: 'misd', next: 'date3_ks' },
            { label: 'An older Class D/E felony, a nongrid or severity 6-10 non-drug felony, or a lower-level drug felony', value: 'felony3', next: 'date3_ks' },
            { label: 'A more serious eligible felony', value: 'felony5', next: 'date5_ks' },
            { label: 'A first DUI', value: 'dui1', next: 'date5_ks' },
            { label: 'A second or later DUI', value: 'dui2', next: 'dateDUI2_ks' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_ks' }
          ]
        },
        date3_ks: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your sentence satisfied (discharge from custody or supervision)?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'from sentence satisfied / discharge (K.S.A. 21-6614 — 3-year tier: misdemeanors, infractions, lower-level and older felonies)' },
            nextPass: 'eligible_conviction_ks',
            nextFail: 'waiting_ks'
          }
        },
        date5_ks: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your sentence satisfied (discharge from custody or supervision)?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from sentence satisfied / discharge (K.S.A. 21-6614 — 5-year tier: more serious eligible felonies and first DUI)' },
            nextPass: 'eligible_conviction_ks',
            nextFail: 'waiting_ks'
          }
        },
        dateDUI2_ks: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your sentence satisfied (discharge from custody or supervision)?',
          validation: {
            period: { amount: null, unit: 'years', anchor: 'from sentence satisfied (K.S.A. 21-6614 — second-or-later DUI; Wave 6 gives a 7-to-10-year range, not a single period)' },
            nextUnknown: 'complex_dui2_ks'
          }
        },
        diversion_date_ks: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the diversion agreement?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'from completion of the diversion agreement (K.S.A. 21-6614 — diversion)' },
            nextPass: 'eligible_conviction_ks',
            nextFail: 'waiting_ks'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Kansas expunges convictions, diversions, and non-convictions on different timelines. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a KBI criminal-history request will show the disposition; Kansas Legal Services runs free expungement clinics and can help you read it.',
          remedy: 'Get Your Record First (KBI / court paperwork)',
          citation: 'Kan. Stat. Ann. § 21-6614 (the timeline depends on the disposition)'
        },
        eligible_nonconv_ks: {
          status: 'eligible',
          title: 'No Conviction — Expungeable, Fee Waived',
          message: 'Because your case ended without a conviction, you can expunge it, and the docket fee is waived for non-convictions. You file in the court that handled the case. Expect the process to take a couple of months (a hearing roughly 60+ days out, then 8-12 weeks for the KBI to update). Kansas Legal Services runs free expungement clinics (kls_expunge@klsinc.org) and can help.',
          remedy: 'Non-conviction expungement (§ 21-6614) — fee waived',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        eligible_specialty_ks: {
          status: 'eligible',
          title: 'Specialty-Court Graduate — Petition Now, Fee Waivable',
          message: 'Because you graduated from a drug court or veterans treatment court, Kansas lets you petition for expungement IMMEDIATELY — no waiting period — and the docket fee can be waived. You file in the court that handled the case; the court "shall" expunge if you have had no felony conviction in the past two years, none is pending, and the circumstances warrant it. And a nice bonus in Kansas: expungement restores your firearm rights. Kansas Legal Services runs free clinics (kls_expunge@klsinc.org).',
          remedy: 'Immediate expungement for specialty-court graduates (§ 21-6614) — fee waivable',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        eligible_conviction_ks: {
          status: 'eligible',
          title: 'Waiting Period Met — Expungeable',
          message: 'Based on your dates, the waiting period for your offense has passed — generally 3 years for misdemeanors, infractions, and lower-level or older felonies, or 5 years for more serious eligible felonies and a first DUI, running from when your sentence was satisfied. Two Kansas advantages worth knowing: a first DUI really is expungeable here (unusual), and expungement restores your firearm rights (since 2021). The court "shall" expunge if you have had no felony conviction in the past two years and none is pending. Kansas Legal Services runs free expungement clinics (kls_expunge@klsinc.org).',
          remedy: 'Expungement petition (§ 21-6614)',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        waiting_ks: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Kansas expungement waiting periods run from when your sentence is satisfied: 3 years for misdemeanors, infractions, and lower-level or older felonies; 5 years for more serious eligible felonies and a first DUI; and 3 years from completing a diversion. Based on your dates, yours has not passed yet. When it does, remember Kansas expungement also restores firearm rights, and Kansas Legal Services runs free clinics to help.',
          remedy: 'Wait for the period (§ 21-6614)',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        complex_dui2_ks: {
          status: 'complex',
          title: 'Second DUI — We Need the Exact Waiting Period',
          message: 'A second or later DUI is expungeable in Kansas, but the waiting period is longer and our source gives it as a range (roughly 7 to 10 years) rather than a single number — so rather than guess your eligibility date, we are flagging it for a precise answer. A district court clerk or Kansas Legal Services can tell you the exact period that applies to your case. The good news is that the route exists; it is the timing we want to pin down. Kansas Legal Services runs free expungement clinics (kls_expunge@klsinc.org).',
          remedy: 'Confirm the exact 2nd-DUI waiting period (district clerk / Kansas Legal Services)',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        ineligible_excluded_ks: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Expunged',
          message: 'Kansas never expunges certain offenses: murder, manslaughter, rape, sex offenses against a minor, child abuse, and commercial-vehicle DUI — and no one who is still required to register can expunge while that requirement is in place. No waiting period changes that. If a registration requirement is the only barrier, this may become a "not yet" once that ends; otherwise a pardon is the remaining route. Kansas Legal Services can help you check.',
          remedy: 'None (Excluded Offense, or still registering) — check when registration ends, or a pardon',
          citation: 'Kan. Stat. Ann. § 21-6614'
        },
        complex_level_ks: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'The Kansas waiting period depends on the offense — 3 years for most misdemeanors and lower-level felonies, 5 for more serious felonies and a first DUI, longer for repeat DUIs. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a KBI criminal-history request will show it. Kansas Legal Services can help you read it.',
          remedy: 'Get the Offense Level First (court paperwork / KBI)',
          citation: 'Kan. Stat. Ann. § 21-6614'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (Kan. Stat. Ann. § 21-6614)',
          formName: 'Kansas Judicial Council expungement forms',
          formUrl: 'https://www.kansasjudicialcouncil.org/legal-forms/expungement',
          steps: [
            'Confirm your offense is not one Kansas never expunges, and that you are not still required to register.',
            'Check your waiting period from when your sentence was satisfied (3 or 5 years for most offenses; specialty-court graduates can file immediately).',
            'File the petition in the court that handled the case. The docket fee is waived for non-convictions; a poverty affidavit is available otherwise.',
            'Expect 2-4 months (a hearing ~60+ days out, then 8-12 weeks for the KBI). Kansas Legal Services runs free clinics: kls_expunge@klsinc.org.'
          ],
          // null: Wave 6 flags a fee conflict — statute says $176, current guides/Judicial
          // Council say $195 (Supreme Court order). Waived for non-convictions.
          fees: null,
          // NOT null: non-conviction fee waiver, poverty affidavit, and specialty-court
          // waiver are named mechanisms.
          feeWaiver: 'The docket fee is waived for non-conviction expungements; a poverty affidavit is available for others; and drug-court/veterans-court graduates can have the docket fee waived.',
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Kansas Legal Services (free expungement clinics; kls_expunge@klsinc.org)', url: 'https://www.kansaslegalservices.org' },
        { name: 'Kansas Judicial Council — Expungement Forms', url: 'https://www.kansasjudicialcouncil.org' }
      ]
    }
  },
  NM: {
    code: 'NM',
    name: 'New Mexico',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'New Mexico uses EXPUNGEMENT under the Criminal Record Expungement Act (§ 29-3A), effective January 1, '
      + '2020 — one of the broader laws in the country when it passed. The waiting periods for convictions '
      + 'ladder by the DEGREE of the offense, and getting that ladder right matters: many legal blogs flatten '
      + 'it to "2 years for misdemeanors, 4 for felonies," which is wrong. Non-convictions clear after just '
      + '1 year. There is also an automatic path for minor cannabis possession. A handful of offenses are '
      + 'excluded entirely, including DWI (even a first-offense deferred one) and — the odd one out — '
      + 'embezzlement.',
    keyDates: [
      {
        label: 'Criminal Record Expungement Act takes effect (§ 29-3A)',
        date: '2020-01-01',
        kind: 'effective',
        note: 'One of the nation\'s broader expungement laws when passed. 2021 amendments added motor-vehicle penalty assessments and allowed one petition to cover multiple records in a district.',
      },
      {
        label: 'Automatic cannabis expungement (§ 29-3A-8; HB 314)',
        date: '2021',
        kind: 'operative',
        note: 'Wave 6 gives the year (with a 2023 HB 314 update). Possession of 2 oz or less is to be expunged automatically 2 years after conviction/arrest — operational status flagged for verification.',
      },
    ],
    openQuestions: [
      {
        question:
          'Verify the operational status of automatic cannabis expungement (§ 29-3A-8, 2021 + 2023 HB 314). Wave 6 says possession of 2 oz or less should be expunged automatically 2 years after conviction/arrest — New Mexico\'s only automation — but flags that the automation actually running needs confirmation (call DPS or the Second Judicial District). The tree routes cannabis to a "check whether it is already off" result; confirm the program is live.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the filing fee. Wave 6 notes CREA sets no statutory fee, so a district court civil filing fee applies (~$132 historically) — a phone target. The fees and feeWaiver fields are null pending this; nmcourts.gov and a district clerk are the checks.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
      {
        question:
          'Confirm the full conviction waiting-period ladder from § 29-3A-5, against the flattened version many blogs give. Wave 6 gives: municipal/most misdemeanors 2 yrs; misdemeanor aggravated battery and 4th-degree felonies 4 yrs; 3rd-degree 6 yrs; 2nd-degree 8 yrs; 1st-degree and Crimes Against Household Members Act (DV) offenses 10 yrs. The tree encodes this full ladder; confirm against the statute.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.M. Stat. § 29-3A-4 (non-conviction expungement; 1-yr wait)', url: null, retrievedOn: null },
      { id: 'N.M. Stat. § 29-3A-5 (conviction expungement; degree-laddered waits)', url: null, retrievedOn: null },
      { id: 'N.M. Stat. § 29-3A-8 (automatic cannabis expungement; HB 314)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_nm' },
            { label: 'Dismissed / Nolle prosequi', value: 'dismissed', next: 'nonconv_date_nm' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_date_nm' },
            { label: 'Pre-prosecution diversion / conditional discharge completed', value: 'deferred', next: 'nonconv_date_nm' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        excluded_nm: {
          type: 'boolean',
          text: 'Was the offense any of these: a crime against a child, an offense causing great bodily harm or death, a sex offense, embezzlement, or DWI?',
          yes: 'ineligible_excluded_nm',
          no: 'cannabis_nm'
        },
        cannabis_nm: {
          type: 'boolean',
          text: 'Was this a conviction for possession of 2 ounces or less of cannabis?',
          yes: 'check_cannabis_nm',
          no: 'level_nm'
        },
        level_nm: {
          type: 'choice',
          text: 'How would you describe the offense?',
          options: [
            { label: 'A municipal-ordinance offense or most misdemeanors', value: 'misd', next: 'date2_nm' },
            { label: 'Misdemeanor aggravated battery, or a 4th-degree felony', value: 'deg4', next: 'date4_nm' },
            { label: 'A 3rd-degree felony', value: 'deg3', next: 'date6_nm' },
            { label: 'A 2nd-degree felony', value: 'deg2', next: 'date8_nm' },
            { label: 'A 1st-degree felony, or a Crimes Against Household Members Act (DV) offense', value: 'deg1', next: 'date10_nm' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_nm' }
          ]
        },
        nonconv_date_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case finally disposed of (dismissal, acquittal, or completion of diversion)?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'from final disposition (N.M. Stat. § 29-3A-4 — non-conviction)' },
            nextPass: 'eligible_nonconv_nm',
            nextFail: 'waiting_nonconv_nm'
          }
        },
        date2_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your last sentence, with fines, fees, and restitution paid?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'conviction-free from last sentence completed, financial obligations paid (N.M. Stat. § 29-3A-5 — municipal / most misdemeanors)' },
            nextPass: 'eligible_conviction_nm',
            nextFail: 'waiting_nm'
          }
        },
        date4_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your last sentence, with fines, fees, and restitution paid?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'conviction-free from last sentence completed, financial obligations paid (N.M. Stat. § 29-3A-5 — misdemeanor aggravated battery / 4th-degree felony)' },
            nextPass: 'eligible_conviction_nm',
            nextFail: 'waiting_nm'
          }
        },
        date6_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your last sentence, with fines, fees, and restitution paid?',
          validation: {
            period: { amount: 6, unit: 'years', anchor: 'conviction-free from last sentence completed, financial obligations paid (N.M. Stat. § 29-3A-5 — 3rd-degree felony)' },
            nextPass: 'eligible_conviction_nm',
            nextFail: 'waiting_nm'
          }
        },
        date8_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your last sentence, with fines, fees, and restitution paid?',
          validation: {
            period: { amount: 8, unit: 'years', anchor: 'conviction-free from last sentence completed, financial obligations paid (N.M. Stat. § 29-3A-5 — 2nd-degree felony)' },
            nextPass: 'eligible_conviction_nm',
            nextFail: 'waiting_nm'
          }
        },
        date10_nm: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your last sentence, with fines, fees, and restitution paid?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'conviction-free from last sentence completed, financial obligations paid (N.M. Stat. § 29-3A-5 — 1st-degree felony / Crimes Against Household Members Act)' },
            nextPass: 'eligible_conviction_nm',
            nextFail: 'waiting_nm'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'New Mexico clears non-convictions after 1 year and convictions on a degree-based ladder, so the outcome decides the timeline. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a DPS record check will show the disposition; the nmcourts.gov expungement forms and Supreme Court handout explain the tracks.',
          remedy: 'Get Your Record First (court paperwork / DPS)',
          citation: 'N.M. Stat. § 29-3A (the timeline depends on the disposition)'
        },
        eligible_nonconv_nm: {
          status: 'eligible',
          title: 'No Conviction — Expungeable After 1 Year',
          message: 'Because your case ended without a conviction — dismissed, nolle prosequi, acquitted, or completed through pre-prosecution diversion or a conditional discharge — New Mexico lets you expunge it 1 year after the final disposition, and based on your date that year has passed. The petition is filed under seal with a DPS RAP sheet no more than 90 days old attached, and one petition can cover multiple records in the same district. The nmcourts.gov forms walk through it.',
          remedy: 'Non-conviction expungement (§ 29-3A-4)',
          citation: 'N.M. Stat. § 29-3A-4'
        },
        waiting_nonconv_nm: {
          status: 'waiting',
          title: 'Not Yet 1 Year',
          message: 'For a non-conviction, New Mexico requires 1 year from the final disposition before you can expunge. Based on your date, that year has not passed yet. Once it does, you file under seal with a recent DPS RAP sheet attached. The nmcourts.gov forms and Supreme Court handout can help you prepare.',
          remedy: 'Wait until 1 year after final disposition (§ 29-3A-4)',
          citation: 'N.M. Stat. § 29-3A-4'
        },
        check_cannabis_nm: {
          status: 'eligible',
          title: 'Minor Cannabis — Should Be Automatic, Check Your Record',
          message: 'Because this was possession of 2 ounces or less of cannabis, New Mexico is supposed to expunge it AUTOMATICALLY — 2 years after the conviction or arrest, with no petition (§ 29-3A-8). This is the state\'s only automatic path. So the honest first step is to CHECK whether it has already come off: request your DPS record and look. Because the automation is newer, we are still confirming how reliably it is running — so if it is still showing after the 2 years, you can fall back on filing the regular petition. New Mexico Legal Aid can help you check or file.',
          remedy: 'Check your record — minor cannabis should be automatic (§ 29-3A-8)',
          citation: 'N.M. Stat. § 29-3A-8'
        },
        eligible_conviction_nm: {
          status: 'eligible',
          title: 'Waiting Period Met — Expungeable',
          message: 'Based on your dates, the waiting period for your offense\'s degree has passed, running conviction-free from when you completed your last sentence with fines, fees, and restitution paid. New Mexico\'s ladder is: 2 years for municipal offenses and most misdemeanors, 4 for misdemeanor aggravated battery and 4th-degree felonies, 6 for 3rd-degree, 8 for 2nd-degree, and 10 for 1st-degree felonies and domestic-violence (Crimes Against Household Members Act) offenses. The court weighs a "justice served" balancing. The nmcourts.gov forms and New Mexico Legal Aid can help.',
          remedy: 'Conviction expungement (§ 29-3A-5)',
          citation: 'N.M. Stat. § 29-3A-5'
        },
        waiting_nm: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'New Mexico\'s conviction waiting periods run conviction-free from when you complete your last sentence with all financial obligations paid, and they ladder by degree: 2 / 4 / 6 / 8 / 10 years from most misdemeanors up to 1st-degree felonies and domestic-violence offenses. Based on your dates, yours has not passed yet. The nmcourts.gov forms and New Mexico Legal Aid can help when the time comes.',
          remedy: 'Wait for the degree-based period (§ 29-3A-5)',
          citation: 'N.M. Stat. § 29-3A-5'
        },
        ineligible_excluded_nm: {
          status: 'ineligible',
          title: 'This Offense Is Excluded',
          message: 'New Mexico excludes several categories from expungement entirely: crimes against children, offenses causing great bodily harm or death, sex offenses, embezzlement (the one that surprises people), and DWI — including a first-offense deferred DWI. No waiting period changes that. A pardon from the Governor remains a route for an otherwise-excluded offense. New Mexico Legal Aid can help you confirm the category and explain the pardon process.',
          remedy: 'None (Excluded Offense) — a pardon is the remaining route',
          citation: 'N.M. Stat. § 29-3A-5'
        },
        complex_level_nm: {
          status: 'complex',
          title: 'We Need the Offense Degree',
          message: 'New Mexico\'s waiting period depends closely on the DEGREE — anywhere from 2 years for a misdemeanor to 10 years for a first-degree or domestic-violence felony. Since you are not sure which yours is, we are not going to guess (and be wary of blogs that flatten this to "2 years misdemeanor, 4 years felony" — that is not the real ladder). Your court paperwork states the degree, and a DPS record check will show it. New Mexico Legal Aid can help you read it.',
          remedy: 'Get the Offense Degree First (court paperwork / DPS)',
          citation: 'N.M. Stat. § 29-3A-5'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (Criminal Record Expungement Act, N.M. Stat. § 29-3A)',
          formName: 'New Mexico courts expungement forms + Supreme Court handout',
          formUrl: 'https://www.nmcourts.gov',
          steps: [
            'Confirm your offense is not excluded (crimes against children, great-bodily-harm/death offenses, sex offenses, embezzlement, DWI).',
            'For minor cannabis, check your DPS record first — it should be expunged automatically 2 years after conviction/arrest.',
            'For other convictions, check the degree-based waiting period (2 / 4 / 6 / 8 / 10 years) conviction-free from completing your last sentence with all financial obligations paid.',
            'File the petition under seal with a DPS RAP sheet no more than 90 days old attached; one petition can cover multiple records in a district. New Mexico Legal Aid can help.'
          ],
          // null: CREA sets no statutory fee, so a district-court civil filing fee applies
          // (~$132 historically, unconfirmed) — the amount and any waiver are open.
          fees: null,
          feeWaiver: null,
          courtContact: 'The district court where the case was decided'
        }
      },
      legalAid: [
        { name: 'New Mexico Legal Aid', url: 'https://www.newmexicolegalaid.org' },
        { name: 'New Mexico Courts — Self-Help / Expungement', url: 'https://www.nmcourts.gov' }
      ]
    }
  },
  NE: {
    code: 'NE',
    name: 'Nebraska',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Nebraska needs an honest expectation reset in the first breath, because it is unlike every other '
      + 'state: its conviction relief is limited to a SET-ASIDE, with no general sealing authority. A granted '
      + 'set-aside nullifies the conviction and removes civil disabilities — but the conviction STAYS on your '
      + 'public record, annotated "set aside." So if you are searching for "expungement," the thing Nebraska '
      + 'offers is real but different: it clears the legal effect, not the visibility. Set-asides cover '
      + 'sentences of probation, a fine, community service, or (since 2020) up to one year of imprisonment; '
      + 'anything longer needs a pardon. Non-convictions and pardoned convictions CAN be removed or sealed.',
    keyDates: [
      {
        label: 'Set-aside extended to imprisonment of 1 year or less (LB 881)',
        date: '2020',
        kind: 'effective',
        note: 'Wave 6 gives the year only. Before LB 881, set-aside was limited to probation/fine/community-service sentences; it now also reaches completed imprisonment of one year or less.',
      },
      {
        label: 'Pardoned convictions become sealable',
        date: '2021',
        kind: 'effective',
        note: 'Wave 6 gives the year only. A pardoned conviction can now be sealed — one of the few things in Nebraska that actually comes off the public record.',
      },
      {
        label: 'Voting restored automatically on sentence completion (LB20)',
        date: '2024',
        kind: 'effective',
        note: 'Wave 6 gives the year only. LB20 ended the former 2-year waiting period; voting rights are restored automatically once the sentence is complete. An adjacent-rights fact, not part of set-aside.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the § 29-2264 set-aside conditions: eligible for probation/fine/community-service sentences, or (since LB 881, 2020) completed imprisonment of one year or less; not still pending; not registrable; not vehicular homicide; and no set-aside denial in the past 2 years. It is discretionary (Brunsen factors). The tree routes on sentence type and these exclusions; confirm against the statute.',
        blocksFields: [],
      },
      {
        question:
          'Confirm whether a set-aside restores firearm rights, and the county-practice split on domestic-violence misdemeanors. Wave 6 says firearms are NOT restored by a set-aside (that needs the pardon board) and flags live litigation with counties split on DV misdemeanors. The tree tells people firearms are not restored; confirm the current state of that litigation.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'Neb. Rev. Stat. § 29-2264 (set-aside of a conviction; LB 881 of 2020)', url: null, retrievedOn: null },
      { id: 'Neb. Rev. Stat. § 29-3523 (removal/sealing of non-conviction records)', url: null, retrievedOn: null },
      { id: 'Neb. Rev. Stat. § 29-3005 (trafficking-survivor set-aside and sealing)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'pardoned_ne' },
            { label: 'Dismissed', value: 'dismissed', next: 'eligible_nonconv_ne' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_ne' },
            { label: 'Diversion completed / charge dismissed', value: 'deferred', next: 'eligible_nonconv_ne' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        pardoned_ne: {
          type: 'boolean',
          text: 'Has this conviction been pardoned?',
          yes: 'eligible_pardoned_ne',
          no: 'sentence_ne'
        },
        sentence_ne: {
          type: 'choice',
          text: 'What kind of sentence did you receive?',
          options: [
            { label: 'Probation, a fine only, or community service', value: 'noncustody', next: 'setaside_excluded_ne' },
            { label: 'Imprisonment of one year or less', value: 'short_prison', next: 'setaside_excluded_ne' },
            { label: 'Imprisonment of more than one year', value: 'long_prison', next: 'ineligible_prison_ne' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_sentence_ne' }
          ]
        },
        setaside_excluded_ne: {
          type: 'boolean',
          text: 'Is the offense one that requires you to register (a sex offense), or was it vehicular homicide?',
          yes: 'ineligible_excluded_ne',
          no: 'eligible_setaside_ne'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Nebraska handles convictions (set-aside) and non-convictions (removal or sealing) differently. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a Nebraska State Patrol record check will show the disposition; the nebraskajudicial.gov self-help pages and Legal Aid of Nebraska\'s Clean Slate Program can help you read it.',
          remedy: 'Get Your Record First (court paperwork / State Patrol)',
          citation: 'Neb. Rev. Stat. §§ 29-2264, 29-3523 (the route depends on the disposition)'
        },
        eligible_nonconv_ne: {
          status: 'eligible',
          title: 'No Conviction — Removable or Sealable',
          message: 'Because your case ended without a conviction, Nebraska can actually remove or seal it — one of the few things here that genuinely comes off the record. This covers arrests without a charge (on set timelines), dismissed cases, and erroneous arrests (shown by clear-and-convincing evidence), under § 29-3523. Legal Aid of Nebraska\'s Clean Slate Program can help you file. The nebraskajudicial.gov self-help pages have the forms.',
          remedy: 'Non-conviction removal/sealing (§ 29-3523)',
          citation: 'Neb. Rev. Stat. § 29-3523'
        },
        eligible_pardoned_ne: {
          status: 'eligible',
          title: 'Pardoned — Now Sealable',
          message: 'Because this conviction was pardoned, Nebraska now lets you SEAL it (since 2021) — which, in a state where convictions normally stay visible even after a set-aside, is meaningful. This is one of the few Nebraska paths that actually takes the record off public view. Legal Aid of Nebraska\'s Clean Slate Program can help you with the sealing, and the nebraskajudicial.gov self-help pages have guidance.',
          remedy: 'Seal a pardoned conviction (2021 law)',
          citation: 'Neb. Rev. Stat. § 29-2264'
        },
        eligible_setaside_ne: {
          status: 'eligible',
          title: 'Set-Aside Available — But Know What It Does',
          message: 'Based on your sentence (probation, a fine, community service, or imprisonment of one year or less), you appear eligible to petition for a SET-ASIDE under § 29-2264, once your sentence is complete and any payment is made. Here is the honest part you should hold onto: a set-aside nullifies the conviction and removes civil disabilities, but the conviction STAYS on your public record, annotated "set aside." It clears the legal effect, not the visibility — and it does not restore firearm rights (that needs the Board of Pardons). It is also discretionary, so a judge weighs the circumstances. Within those limits it is real and worth doing. Legal Aid of Nebraska\'s Clean Slate Program can help.',
          remedy: 'Set-aside petition (§ 29-2264) — nullifies the conviction, but it stays visible',
          citation: 'Neb. Rev. Stat. § 29-2264'
        },
        ineligible_prison_ne: {
          status: 'ineligible',
          title: 'Sentence Over One Year — Pardon Only',
          message: 'Because your sentence was more than one year of imprisonment, it is beyond what a set-aside can reach (set-aside covers probation, fines, community service, or up to one year of imprisonment). The remaining route is a pardon from the Nebraska Board of Pardons — a real process, just a different one, and a pardoned conviction can then be sealed. Legal Aid of Nebraska\'s Clean Slate Program can explain the pardon process.',
          remedy: 'None by set-aside — a pardon is the route (and a pardon can then be sealed)',
          citation: 'Neb. Rev. Stat. § 29-2264'
        },
        ineligible_excluded_ne: {
          status: 'ineligible',
          title: 'This Offense Is Excluded From Set-Aside',
          message: 'Nebraska\'s set-aside is not available for offenses that require registration (sex offenses) or for vehicular homicide. No completion or waiting changes that. The remaining route is a pardon from the Board of Pardons. Legal Aid of Nebraska\'s Clean Slate Program can help you confirm the category and explain the pardon process.',
          remedy: 'None (Excluded Offense) — a pardon is the route',
          citation: 'Neb. Rev. Stat. § 29-2264'
        },
        complex_sentence_ne: {
          status: 'complex',
          title: 'We Need to Know Your Sentence',
          message: 'In Nebraska, whether a set-aside is available turns on your sentence: probation, a fine, community service, or imprisonment of one year or less can qualify, but more than a year of imprisonment cannot (pardon only). Since you are not sure which describes yours, we are not going to guess. Your court paperwork states the sentence, and the nebraskajudicial.gov self-help pages and Legal Aid of Nebraska can help you read it.',
          remedy: 'Get Your Sentence Details First (court paperwork)',
          citation: 'Neb. Rev. Stat. § 29-2264'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Set-Aside of a Conviction (Neb. Rev. Stat. § 29-2264)',
          formName: 'Nebraska Judicial Branch set-aside self-help forms',
          formUrl: 'https://supremecourt.nebraska.gov/self-help',
          steps: [
            'Understand what a set-aside does: it nullifies the conviction and removes civil disabilities, but the conviction stays on your public record marked "set aside," and firearm rights are not restored.',
            'Confirm your sentence qualifies (probation, fine, community service, or imprisonment of one year or less) and the offense is not registrable or vehicular homicide.',
            'Complete your sentence and any payment, then file the set-aside petition — it is discretionary, so the judge weighs the circumstances.',
            'If the sentence was over a year, or you want the record actually off public view, a pardon is the route (and a pardoned conviction can then be sealed). Legal Aid of Nebraska\'s Clean Slate Program can help.'
          ],
          // NOT null: Wave 6 says a set-aside petition typically carries no fee.
          fees: 'Typically none — Nebraska set-aside petitions usually carry no fee.',
          feeWaiver: 'Not typically needed — set-aside petitions usually carry no fee.',
          courtContact: 'The court that entered the conviction'
        }
      },
      legalAid: [
        { name: 'Legal Aid of Nebraska — Clean Slate Program (AccessLine)', url: 'https://www.legalaidofnebraska.org' },
        { name: 'Nebraska Judicial Branch — Self-Help', url: 'https://supremecourt.nebraska.gov/self-help' }
      ]
    }
  },
  ID: {
    code: 'ID',
    name: 'Idaho',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave6_Draft_Package.md',
    terminology:
      'Idaho is honest-limited: it has no general expungement of convictions, but three narrow tools, and one '
      + 'of them is new enough that most guides miss it. (1) NON-CONVICTIONS clear through a written request to '
      + 'the Idaho State Police (§ 67-3004(10)) — administrative, not a court petition. (2) SHIELDING '
      + '(§ 67-3004(11), from HB 149 in 2023) is the new door: ONE conviction — a non-violent misdemeanor or '
      + 'a felony drug-possession — can be hidden from public view after 5 conviction-free years. (3) A '
      + 'WITHHELD JUDGMENT (§ 19-2601) that you complete can be dismissed under § 19-2604, restoring rights '
      + '(including firearms) — but the record then reads "Dismissed by Court" and is NOT sealed. There is no '
      + 'automation.',
    keyDates: [
      {
        label: 'Conviction shielding created (§ 67-3004(11), HB 149)',
        date: '2023',
        kind: 'effective',
        note: 'Wave 6 gives the year only. HB 149 created a new shielding remedy for one non-violent-misdemeanor or felony-drug-possession conviction after 5 conviction-free years. Fresh law that most older guides do not reflect — they still say Idaho has no conviction relief.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the § 67-3004(11) shielding rule (HB 149, 2023): ONE conviction, either a non-violent misdemeanor or a felony drug-possession, petitioned after 5 conviction-free years from full sentence completion (probation, parole, fines, restitution), under a "held accountable" standard; the record is hidden from public view and deniable, but law enforcement retains access; assaultive/violent misdemeanors are excluded. Wave 6 flags this as fresh-law discrepancy material. The tree encodes it; confirm against the statute and district practice (Ada County).',
        blocksFields: [],
      },
      {
        question:
          'Confirm the fees. Wave 6 says the § 67-3004(10) ISP administrative non-conviction request appears to be free (documentation only), and flags the § 67-3004(11) shielding petition as a court filing whose fee is a phone target. The fees and feeWaiver fields are null pending both.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Idaho Code § 67-3004(10) (non-conviction expungement via ISP BCI request)', url: null, retrievedOn: null },
      { id: 'Idaho Code § 67-3004(11) (conviction shielding; HB 149 of 2023)', url: null, retrievedOn: null },
      { id: 'Idaho Code §§ 19-2601, 19-2604 (withheld judgment; dismissal; felony-to-misdemeanor reduction)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'shielding_type_id' },
            { label: 'Dismissed / Never charged', value: 'dismissed', next: 'eligible_nonconv_id' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_id' },
            { label: 'Withheld judgment completed', value: 'deferred', next: 'withheld_id' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        shielding_type_id: {
          type: 'choice',
          text: 'Shielding covers only ONE conviction, and only two kinds. Which best describes yours?',
          options: [
            { label: 'A non-violent misdemeanor', value: 'nonviolent_misd', next: 'shielding_date_id' },
            { label: 'A felony drug-possession offense', value: 'felony_drug', next: 'shielding_date_id' },
            { label: 'An assaultive or violent misdemeanor', value: 'violent_misd', next: 'ineligible_violent_id' },
            { label: 'Something else (another felony, etc.)', value: 'other', next: 'ineligible_nopath_id' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_id' }
          ]
        },
        shielding_date_id: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your full sentence — probation, parole, fines, and restitution?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction-free from full sentence completion (Idaho Code § 67-3004(11) — shielding; one conviction)' },
            nextPass: 'eligible_shielding_id',
            nextFail: 'waiting_id'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Idaho\'s three tools depend entirely on the outcome — a non-conviction goes to the State Police, a completed withheld judgment gets dismissed, and only certain single convictions can be shielded. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or an Idaho State Police record check will show the disposition; the Idaho courts\' self-help pages can help you read it.',
          remedy: 'Get Your Record First (court paperwork / ISP)',
          citation: 'Idaho Code § 67-3004 (the tool depends on the disposition)'
        },
        eligible_nonconv_id: {
          status: 'eligible',
          title: 'No Conviction — Clear It Through the State Police',
          message: 'Because your case ended without a conviction — dismissed, acquitted, or an arrest that never led to a charge (after 1 year) — Idaho clears it through a WRITTEN REQUEST to the Idaho State Police (§ 67-3004(10)), not a court petition. The State Police has an application form; once granted, your fingerprints and criminal history are expunged and the court file is sealed. One exception to know: this does not cover a dismissal that came from a withheld judgment (§ 19-2604(1)) — those follow a different path. The Idaho courts\' self-help pages can help.',
          remedy: 'ISP administrative expungement request (§ 67-3004(10))',
          citation: 'Idaho Code § 67-3004(10)'
        },
        withheld_id: {
          status: 'eligible',
          title: 'Withheld Judgment — Move to Dismiss (But Know It Stays Visible)',
          message: 'Because you completed a withheld judgment, you can move to have the case DISMISSED under § 19-2604, which restores your rights — including firearm rights. That is a real and worthwhile step. But here is the honest caveat: after dismissal the record is not sealed. It will read "Dismissed by Court" and remains visible to anyone who looks. (For a felony, you may also be able to have it reduced to a misdemeanor under § 19-2604(2).) If you want it actually hidden, a shielding petition may be available separately for an eligible conviction. The Idaho courts\' self-help pages explain the motion.',
          remedy: 'Motion to dismiss a completed withheld judgment (§ 19-2604) — visible but dismissed',
          citation: 'Idaho Code § 19-2604'
        },
        eligible_shielding_id: {
          status: 'eligible',
          title: 'Shielding Available — Idaho\'s New 2023 Door',
          message: 'Based on your dates — 5 conviction-free years since you completed your full sentence, including fines and restitution — your conviction appears eligible for SHIELDING under § 67-3004(11), a remedy Idaho created in 2023 (HB 149) that many guides still do not know exists. It covers one conviction (a non-violent misdemeanor or a felony drug-possession), and once granted the record is hidden from public view and you can deny it — though law enforcement keeps access. The standard is whether you have been "held accountable." Because this is fresh law, it is worth filing with help; the Idaho courts\' self-help pages and a district clerk (Ada County) can guide the petition.',
          remedy: 'Shielding petition (§ 67-3004(11)) — one conviction, hidden from public view',
          citation: 'Idaho Code § 67-3004(11)'
        },
        waiting_id: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Idaho\'s shielding remedy requires 5 conviction-free years from when you completed your full sentence — probation, parole, fines, and restitution. Based on your dates, that has not passed yet. When it does, remember shielding covers only one conviction, so if you have more than one eligible offense, it is worth being deliberate. The Idaho courts\' self-help pages can help you plan.',
          remedy: 'Wait for the 5 conviction-free years (§ 67-3004(11))',
          citation: 'Idaho Code § 67-3004(11)'
        },
        ineligible_violent_id: {
          status: 'ineligible',
          title: 'Assaultive/Violent Misdemeanor — Not Shieldable',
          message: 'Idaho\'s shielding remedy specifically excludes assaultive and violent misdemeanors, so this conviction cannot be shielded, and no waiting period changes that. Idaho has no general conviction expungement, so the remaining routes are a pardon or commutation from the Commission of Pardons and Parole. If any part of your record was a non-conviction, that can still be cleared through the State Police separately. The Idaho courts\' self-help pages can help you check.',
          remedy: 'None (excluded from shielding) — a pardon/commutation is the route',
          citation: 'Idaho Code § 67-3004(11)'
        },
        ineligible_nopath_id: {
          status: 'ineligible',
          title: 'No Expungement Path for This Conviction',
          message: 'Idaho has no general expungement of convictions. Its shielding remedy reaches only one non-violent misdemeanor or a felony drug-possession, so a conviction outside those categories (such as another kind of felony) does not have an expungement or shielding route. The honest answer is that the remaining path is a pardon or commutation from the Commission of Pardons and Parole. If any of your charges ended without a conviction, those can still be cleared through the State Police. The Idaho courts\' self-help pages can point you to the pardon process.',
          remedy: 'None (no conviction expungement in Idaho) — a pardon/commutation is the route',
          citation: 'Idaho Code § 67-3004'
        },
        complex_level_id: {
          status: 'complex',
          title: 'We Need to Know the Conviction',
          message: 'Idaho\'s shielding remedy is narrow — it covers only a non-violent misdemeanor or a felony drug-possession, and excludes assaultive/violent misdemeanors and other felonies. Whether yours qualifies depends on exactly what it was, which we are not going to guess. Your court paperwork names the offense, and an Idaho State Police record check will show it. The Idaho courts\' self-help pages can help you read it.',
          remedy: 'Get the Conviction Details First (court paperwork / ISP)',
          citation: 'Idaho Code § 67-3004(11)'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Idaho record relief (ISP expungement § 67-3004(10); shielding § 67-3004(11); withheld-judgment dismissal § 19-2604)',
          formName: 'Idaho State Police expungement application / Idaho courts shielding forms',
          formUrl: 'https://isp.idaho.gov/BCI/',
          steps: [
            'For a non-conviction, submit the Idaho State Police expungement request (§ 67-3004(10)) — administrative, not a court filing.',
            'For a completed withheld judgment, file a motion to dismiss under § 19-2604 (restores rights, including firearms) — but know the record stays visible, marked "Dismissed by Court."',
            'For one eligible conviction (non-violent misdemeanor or felony drug-possession), file a shielding petition (§ 67-3004(11)) after 5 conviction-free years from full sentence completion.',
            'There is no general conviction expungement otherwise; a pardon or commutation is the remaining route. The Idaho courts\' self-help pages can guide each.'
          ],
          // null: Wave 6 says the ISP administrative request "appears free" (unconfirmed)
          // and the shielding petition court fee is a phone target — both unknown.
          fees: null,
          feeWaiver: null,
          courtContact: 'Idaho State Police (BCI) for non-convictions; the district court for shielding and withheld-judgment motions'
        }
      },
      legalAid: [
        { name: 'Idaho Legal Aid Services', url: 'https://www.idaholegalaid.org' },
        { name: 'Idaho Courts — Self-Help', url: 'https://www.courtselfhelp.idaho.gov' }
      ]
    }
  },
  NH: {
    code: 'NH',
    name: 'New Hampshire',
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'New Hampshire calls it ANNULMENT (RSA 651:5), filed in the court that handled the case — a separate '
      + 'petition for each charge. The single most important thing to know is a procedural trap: if you file '
      + 'before your waiting period has fully run, the petition is denied AND you are barred from filing a new '
      + 'one for THREE YEARS. So the rule here is simple and strict — do not file early. Waiting periods run '
      + 'from completion of ALL terms and conditions of the sentence, including fines and fees, and they vary a '
      + 'lot by offense. You also have to stay conviction-free during the wait — a new DWI breaks that clean '
      + 'record, though minor motor-vehicle violations do not. Dismissals and acquittals since January 1, 2019 '
      + 'are annulled automatically 30 days after disposition, so those usually need no petition at all.',
    keyDates: [
      {
        label: 'Automatic annulment of dismissals/acquittals begins (RSA 651:5)',
        date: '2019-01-01',
        kind: 'operative',
        note: 'Dismissals and acquittals on or after this date are annulled automatically 30 days after disposition — no petition. A streamlined post-2019 process also applies to violations and Class B misdemeanors (20-day prosecutor objection, no DOC investigation).',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the court filing fee amount. Diana verified RSA 651:5 against gc.nh.gov (7/16): the three statutory fees are now known — $100 DOC investigation (IX), $100 DPS record-correction, and up to $100 State Police removal (X(d)), each waived if indigent, acquitted, or dismissed. The COURT filing fee is not set by statute and remains a phone-tier item (a waiver form exists); confirm the amount with courts.nh.gov.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.H. Rev. Stat. Ann. § 651:5 (annulment; III ladder 1/2/3/5/10-yr with 10-yr carve-outs (f)/(g)/(h) and 2-yr drug carve-out (i); III clean-record anchor; IV 3-year re-file bar; V/XIII never-eligible; VI whole-record; VII pending-charge freeze; II-a automatic since Jan 1 2019; IX/X(d) fees)', url: 'https://gc.nh.gov/rsa/html/LXII/651/651-5.htm', retrievedOn: '2026-07-16' },
      { id: 'N.H. Rev. Stat. Ann. § 631:2-b (domestic-violence misdemeanor — 10-yr wait (h) with DV stacking)', url: null, retrievedOn: null },
      { id: 'N.H. Rev. Stat. Ann. § 632-A:4 (sexual assault — 10-yr wait (f))', url: null, retrievedOn: null },
      { id: 'N.H. Rev. Stat. Ann. § 318-B:26, II (drug offenses, misdemeanor or felony — 2-year annulment wait, 651:5(III)(i))', url: null, retrievedOn: null },
      { id: 'N.H. Rev. Stat. Ann. §§ 651:5-b, 651:5-c (cannabis annulment — anytime paths)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_nh' },
            { label: 'Dismissed', value: 'dismissed', next: 'auto_annul_nh' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'auto_annul_nh' },
            { label: 'Diversion / deferred completed and dismissed', value: 'deferred', next: 'auto_annul_nh' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        auto_annul_nh: {
          type: 'boolean',
          text: 'Did the case end (the dismissal or acquittal) on or after January 1, 2019?',
          yes: 'check_autoannul_nh',
          no: 'petition_nonconv_nh'
        },
        excluded_nh: {
          type: 'boolean',
          text: 'Was the offense any of these never-eligible crimes — murder, first-degree assault, aggravated or felonious sexual assault, kidnapping, robbery, Class A arson, incest, a felony child-sexual-abuse-image offense, or felony obstruction of justice — or did you receive an extended-term sentence?',
          yes: 'ineligible_excluded_nh',
          no: 'multi_nh'
        },
        multi_nh: {
          type: 'boolean',
          text: 'Do you have more than one conviction on your record — including any new conviction (such as a DWI) since this offense?',
          yes: 'complex_multi_nh',
          no: 'level_nh'
        },
        level_nh: {
          type: 'choice',
          text: 'How would you describe the offense?',
          options: [
            { label: 'A violation', value: 'violation', next: 'mv_predicate_nh' },
            { label: 'A Class B misdemeanor', value: 'misdB', next: 'date2b_nh' },
            { label: 'A Class A misdemeanor', value: 'misdA', next: 'misd_dv_nh' },
            { label: 'A Class B felony', value: 'felonyB', next: 'felonyB_drug_nh' },
            { label: 'A Class A felony', value: 'felonyA', next: 'felonyA_drug_nh' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_nh' }
          ]
        },
        mv_predicate_nh: {
          type: 'boolean',
          text: 'Is this a motor-vehicle offense that counts as a habitual-offender predicate?',
          yes: 'date7_nh',
          no: 'date1_nh'
        },
        misd_dv_nh: {
          type: 'boolean',
          text: 'Was this a domestic-violence misdemeanor (RSA 631:2-b)?',
          yes: 'date10_nh',
          no: 'misdA_drug_nh'
        },
        misdA_drug_nh: {
          type: 'boolean',
          text: 'Was this a drug offense under RSA 318-B:26, II?',
          yes: 'date2_nh',
          no: 'date3_nh'
        },
        felonyB_drug_nh: {
          type: 'boolean',
          text: 'Was this a drug offense under RSA 318-B:26, II?',
          yes: 'date2_nh',
          no: 'felonyB_sexual_nh'
        },
        felonyB_sexual_nh: {
          type: 'boolean',
          text: 'Was this a sexual assault under RSA 632-A:4, or felony indecent exposure?',
          yes: 'date10_nh',
          no: 'date5_nh'
        },
        felonyA_drug_nh: {
          type: 'boolean',
          text: 'Was this a drug offense under RSA 318-B:26, II?',
          yes: 'date2_nh',
          no: 'date10_nh'
        },
        date1_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III)(a) — violation)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date2b_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III)(b) — Class B misdemeanor)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date2_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 2, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III)(i) / RSA 318-B:26, II — drug offense, misdemeanor or felony)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date3_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III)(c) — Class A misdemeanor)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date5_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III)(d) — Class B felony)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date7_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III) — motor-vehicle habitual-offender predicate)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        },
        date10_nh: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete ALL terms of your sentence, including fines and fees?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from completion of all sentence terms, conviction-free during the wait (RSA 651:5(III) (e) Class A felony / (f) sexual assault 632-A:4 / (g) felony indecent exposure / (h) DV misdemeanor 631:2-b, with DV stacking)' },
            nextPass: 'eligible_nh',
            nextFail: 'waiting_nh'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'New Hampshire handles convictions and non-convictions very differently — non-convictions since 2019 are automatic, while convictions require a petition and a waiting period, with a costly trap for filing early. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a State Police record check will show the disposition; New Hampshire Legal Assistance can help you read it.',
          remedy: 'Get Your Record First (court paperwork / State Police)',
          citation: 'N.H. Rev. Stat. Ann. § 651:5 (the route depends on the disposition)'
        },
        check_autoannul_nh: {
          status: 'eligible',
          title: 'Likely Already Auto-Annulled — Check Your Record',
          message: 'Because your case was a dismissal or acquittal that ended on or after January 1, 2019, New Hampshire annuls it AUTOMATICALLY — 30 days after disposition, with no petition. So the honest first step is not to file anything but to CHECK whether it has already come off: request your State Police record and look. If it is still showing well past 30 days, New Hampshire Legal Assistance or the court can help you follow up.',
          remedy: 'Check your record — it should already be auto-annulled (§ 651:5)',
          citation: 'N.H. Rev. Stat. Ann. § 651:5'
        },
        petition_nonconv_nh: {
          status: 'eligible',
          title: 'No Conviction — Annullable by Petition',
          message: 'Because your case ended without a conviction but before the 2019 automatic-annulment date, you can petition to annul it. For non-convictions the $100 State Police record-correction fee is waived (a court filing fee still applies). You file in the court that handled the case. New Hampshire Legal Assistance can help with the petition and forms.',
          remedy: 'Non-conviction annulment petition (§ 651:5) — State Police fee waived',
          citation: 'N.H. Rev. Stat. Ann. § 651:5'
        },
        eligible_nh: {
          status: 'eligible',
          title: 'Waiting Period Met — Annulment Available',
          message: 'Based on your dates, the waiting period for your offense has passed, measured from when you completed ALL terms and conditions of your sentence and stayed conviction-free during the wait. You petition the court that handled the case (a separate petition per charge). Budget for the fee stack: a $100 Department of Corrections investigation fee, a $100 State Police record-correction fee, and up to $100 for the removal fee — each of which is waived if you are indigent, or the case ended in acquittal or dismissal — plus a court filing fee (amount set by the court, not the statute). It typically takes 3-6 months. If your offense was a drug offense under RSA 318-B:26, the wait is only 2 years — unusually short, whether it was a misdemeanor or a felony. New Hampshire Legal Assistance can help.',
          remedy: 'Annulment petition (§ 651:5)',
          citation: 'N.H. Rev. Stat. Ann. § 651:5'
        },
        waiting_nh: {
          status: 'waiting',
          title: 'Not Yet — And Do NOT File Early',
          message: 'This is the most important warning in New Hampshire: DO NOT FILE YET. Your waiting period has not passed, and New Hampshire is one of the very few states that punishes filing early — under RSA 651:5(IV), after a denial you cannot file another petition more often than once every THREE YEARS. So even if you are eager, wait until your date has clearly passed. The period runs from when you completed all terms and conditions of your sentence, and it requires staying conviction-free in the meantime — a new conviction, and a DWI in particular, resets the clean record (minor motor-vehicle violations do not). If you are unsure exactly when your date lands, New Hampshire Legal Assistance can help you calculate it before you file. (Cannabis possession has its own anytime paths and is not subject to this.)',
          remedy: 'WAIT — filing before your date bars you for 3 years (§ 651:5(IV))',
          citation: 'N.H. Rev. Stat. Ann. § 651:5(IV)'
        },
        ineligible_excluded_nh: {
          status: 'ineligible',
          title: 'This Offense Cannot Be Annulled',
          message: 'New Hampshire never annuls a set of serious crimes: murder, first-degree assault, aggravated or felonious sexual assault, kidnapping, robbery, Class A arson, incest, felony child-sexual-abuse-image offenses, and felony obstruction of justice — and extended-term sentences are also excluded. No waiting period changes that. For an offense like this, executive clemency is the remaining route. New Hampshire Legal Assistance can help you confirm where yours falls.',
          remedy: 'None (Never-Eligible Offense) — clemency is the remaining route',
          citation: 'N.H. Rev. Stat. Ann. § 651:5'
        },
        complex_multi_nh: {
          status: 'complex',
          title: 'Multiple Convictions — Sequence Matters, Get Help',
          message: 'New Hampshire has several rules that interact when you have more than one conviction. Annulment is barred until the waiting period is met for ALL of your offenses (VI), and barred entirely if any one of them is in a never-eligible class. You also have to have stayed conviction-free during your wait — a new conviction, and a DWI specifically, breaks that clean record (III). And there is a domestic-violence stacking rule: an earlier DV conviction cannot be annulled until your most recent DV conviction is itself eligible (631:2-b). A 2020 case (State v. Williams) lets you petition the latest-occurring offense first and work backwards, and a pending charge freezes any petition (VII). Because getting this sequence right matters and a wrong early filing carries a 3-year penalty, this is a situation to handle with help. New Hampshire Legal Assistance can map out the order for your specific record.',
          remedy: 'Get Multi-Conviction Sequencing Help (NH Legal Assistance)',
          citation: 'N.H. Rev. Stat. Ann. § 651:5; State v. Williams (2020)'
        },
        complex_level_nh: {
          status: 'complex',
          title: 'We Need the Offense Level',
          message: 'New Hampshire\'s waiting period depends closely on the exact level — anywhere from 1 year for a violation to 10 years for a Class A felony or a DV misdemeanor. Because filing early carries a 3-year penalty, we will not guess at which applies. Your court paperwork states the level, and a State Police record check will show it. New Hampshire Legal Assistance can help you read it.',
          remedy: 'Get the Offense Level First (court paperwork / State Police)',
          citation: 'N.H. Rev. Stat. Ann. § 651:5'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Annulment (N.H. Rev. Stat. Ann. § 651:5)',
          formName: 'NHJB-2202 / NHJB-3057 annulment forms',
          formUrl: 'https://www.courts.nh.gov/self-help/annulments',
          steps: [
            'Confirm your waiting period has FULLY passed before filing — filing early bars a new petition for 3 years (RSA 651:5(IV)).',
            'For a non-conviction since January 1, 2019, do not file — it should already be auto-annulled; check your State Police record.',
            'File a separate petition per charge in the court that handled the case. The three statutory fees ($100 DOC, $100 DPS, up-to-$100 removal) are each waived if you are indigent, acquitted, or dismissed; a court filing fee (amount set by the court) also applies.',
            'Expect 3-6 months and a DOC investigation for most conviction annulments. New Hampshire Legal Assistance can help.'
          ],
          // NOT null: Diana verified the statutory fees (RSA 651:5 IX / X(d), 7/16):
          // $100 DOC + $100 DPS + up-to-$100 removal, each waivable. Only the court
          // filing fee amount (not set by statute) remains an open question.
          fees: 'Three statutory fees: a $100 Department of Corrections investigation fee (IX), a $100 State Police (DPS) record-correction fee, and up to $100 for the removal fee (X(d)) — each waived if you are indigent, or the case ended in acquittal or dismissal. A court filing fee also applies, per court location; its amount is not set by statute (a waiver form exists).',
          feeWaiver: 'Each of the three statutory fees ($100 DOC, $100 DPS, up-to-$100 removal) is waived if you are indigent, or if the case ended in a not-guilty verdict or dismissal. A waiver form exists for the court filing fee.',
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'New Hampshire Legal Assistance', url: 'https://www.nhla.org' },
        { name: 'New Hampshire Judicial Branch — Annulments Self-Help', url: 'https://www.courts.nh.gov/self-help/annulments' }
      ]
    }
  },
  HI: {
    code: 'HI',
    name: 'Hawaii',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Hawaii\'s expungement is ADMINISTRATIVE — you apply to the Attorney General\'s Hawaii Criminal Justice '
      + 'Data Center (HCJDC), not a court (HRS § 831-3.2). The Center "shall issue" for arrests and charges '
      + 'that did not end in a conviction, which is most of what it does. Convictions almost never qualify — '
      + 'only a few narrow categories (under-21 DUI, first-time drug offenders, first-time property offenders), '
      + 'and even a PARDON does not make a conviction expungeable (it stays on the record with a pardon '
      + 'notation). Since July 1, 2025 (Act 003), an expungement order is auto-transmitted to the courts to '
      + 'seal the court record too — but for older certificates that court step is separate, so it is worth '
      + 'thinking of it as two systems: the state criminal history, and the court record.',
    keyDates: [
      {
        label: 'Act 003 auto-transmit for court-record sealing begins (HRS ch. 831)',
        date: '2025-07-01',
        kind: 'operative',
        note: 'HCJDC now auto-transmits expungement orders to the Judiciary to seal the court record on eCourt Kokua. Certificates issued before July 2025 still require a separate request to the court; sealing can be denied if co-defendants or non-expunged charges share the case.',
      },
    ],
    openQuestions: [
      {
        question:
          'Resolve the prostitution-deferral waiting period. Wave 7 flags a one-digit conflict: the HCJDC application PDF says 3 years, while HCJDC\'s current web page says 4 years, for expunging a prostitution (HRS 712-1200) deferred plea. The tree uses the general 1-year deferred-plea wait and notes prostitution deferrals are a special longer case; resolve the 3-vs-4 by phone.',
        blocksFields: [],
      },
      {
        question:
          'Confirm Act 003 auto-transmit is working in practice. Wave 7 says that since July 1, 2025 HCJDC auto-transmits expungement orders to the Judiciary for court-record sealing, but flags whether this is actually operational. The tree tells post-July-2025 applicants the court step is automatic and pre-July-2025 certificate-holders to make a separate court request; confirm the handoff works.',
        blocksFields: [],
      },
      {
        question:
          'Confirm whether HCJDC offers any fee reduction or waiver for the $35 (first-time) / $50 (repeat) administrative fee. Wave 7 gives the fee amounts but says nothing about a waiver; the feeWaiver field is null pending confirmation with the Expungement Section ((808) 587-3348).',
        blocksFields: ['resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Haw. Rev. Stat. § 831-3.2 (administrative expungement via HCJDC)', url: null, retrievedOn: null },
      { id: 'Haw. Rev. Stat. ch. 853 (deferred acceptance pleas — DAG/DANC; 1-year expungement)', url: null, retrievedOn: null },
      { id: 'Haw. Rev. Stat. §§ 706-622.5, 706-622.9, 291E-64 (narrow conviction-expungement categories)', url: null, retrievedOn: null },
      { id: 'Act 003 (2025) (auto-transmit of expungement orders for court-record sealing, eff. Jul 1, 2025)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'already_expunged_hi',
      nodes: {
        already_expunged_hi: {
          type: 'boolean',
          text: 'Have you ALREADY received an expungement from the Attorney General (HCJDC), but the case still shows up on the court\'s online system (eCourt Kokua)?',
          yes: 'sealing_request_hi',
          no: 'disposition'
        },
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'conv_type_hi' },
            { label: 'Dismissed / Charges dropped', value: 'dismissed', next: 'eligible_nonconv_hi' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_nonconv_hi' },
            { label: 'Deferred plea (DAG/DANC) completed and dismissed', value: 'deferred', next: 'deferred_date_hi' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        conv_type_hi: {
          type: 'choice',
          text: 'Convictions can be expunged in Hawaii only in a few narrow situations. Which describes yours?',
          options: [
            { label: 'An under-21 DUI (§ 291E-64)', value: 'dui21', next: 'eligible_conv_hi' },
            { label: 'A first-time drug offender sentence (§§ 706-622.5/.8)', value: 'drug', next: 'eligible_conv_hi' },
            { label: 'A first-time property offender sentence (§ 706-622.9)', value: 'property', next: 'eligible_conv_hi' },
            { label: 'None of these / an ordinary conviction', value: 'ordinary', next: 'ineligible_conviction_hi' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_convtype_hi' }
          ]
        },
        deferred_date_hi: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the deferred plea discharged and the case dismissed?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'after discharge and dismissal of a DAG/DANC deferred plea (Haw. Rev. Stat. ch. 853; prostitution deferrals are a longer special case)' },
            nextPass: 'eligible_deferred_hi',
            nextFail: 'waiting_deferred_hi'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Hawaii expunges non-convictions readily but convictions almost never, so the outcome decides everything. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or an HCJDC record request will show the disposition; the HCJDC Expungement Section ((808) 587-3348) can help.',
          remedy: 'Get Your Record First (court paperwork / HCJDC)',
          citation: 'Haw. Rev. Stat. § 831-3.2 (the route depends on the disposition)'
        },
        sealing_request_hi: {
          status: 'complex',
          title: 'Ask the Court to Seal — the Second Step',
          message: 'This is Hawaii\'s two-system quirk. You already have an HCJDC expungement (the state criminal history is cleared), but the case still shows on the court\'s eCourt Kokua system — because your certificate predates July 1, 2025, when the auto-transmit to the courts began. For older certificates, sealing the COURT record is a separate request you make to the court. One caution: the court can decline if co-defendants or non-expunged charges share the same case. The HCJDC Expungement Section ((808) 587-3348) can point you to the right court request.',
          remedy: 'Make a separate court-record sealing request (pre-Act-003 certificate)',
          citation: 'Act 003 (2025); Haw. Rev. Stat. § 831-3.2'
        },
        eligible_nonconv_hi: {
          status: 'eligible',
          title: 'No Conviction — Apply Now, It Is Administrative',
          message: 'Because your case ended without a conviction, Hawaii "shall issue" an expungement — and it is administrative, so you apply directly to the Attorney General\'s HCJDC, not a court. The fee is $35 (first-time) or $50 (repeat), paid by cashier\'s check or money order, and it takes about 120 days with no expediting. A few non-convictions are excluded (bail forfeitures, absconders, and chapter 704 mental-disease acquittals), so if yours was one of those, check first. Since July 2025 the court record is sealed automatically too. The HCJDC Expungement Section ((808) 587-3348) can help.',
          remedy: 'HCJDC administrative expungement (§ 831-3.2)',
          citation: 'Haw. Rev. Stat. § 831-3.2'
        },
        eligible_deferred_hi: {
          status: 'eligible',
          title: 'Deferred Plea, 1+ Year — Expungeable',
          message: 'Because you completed a deferred plea (DAG or DANC) and the case was dismissed at least a year ago, it is expungeable through the HCJDC. The fee is $35 (first-time) or $50 (repeat), and processing takes about 120 days. One thing to confirm if yours was a prostitution-related deferral: the waiting period there is longer (the sources say 3 or 4 years — worth a call to pin down). The HCJDC Expungement Section ((808) 587-3348) can help.',
          remedy: 'HCJDC expungement of a deferred plea (ch. 853)',
          citation: 'Haw. Rev. Stat. ch. 853'
        },
        waiting_deferred_hi: {
          status: 'waiting',
          title: 'Not Yet One Year Since Dismissal',
          message: 'A deferred plea (DAG/DANC) becomes expungeable one year after it is discharged and dismissed. Based on your date, that year has not passed yet. Once it does, you apply administratively to the HCJDC. (If yours was a prostitution-related deferral, the wait is longer — 3 or 4 years, worth confirming by phone.) The HCJDC Expungement Section ((808) 587-3348) can help you time it.',
          remedy: 'Wait until 1 year after dismissal, then apply (ch. 853)',
          citation: 'Haw. Rev. Stat. ch. 853'
        },
        eligible_conv_hi: {
          status: 'eligible',
          title: 'A Qualifying Conviction — Court Order First, Then HCJDC',
          message: 'Yours is one of the few conviction types Hawaii will expunge (under-21 DUI, first-time drug offender, or first-time property offender). The process has two steps: you first get a court ORDER, then apply to the HCJDC to carry out the expungement. The fee is $35 (first-time) or $50 (repeat), about 120 days to process. The HCJDC Expungement Section ((808) 587-3348) can explain the court-order step for your specific category.',
          remedy: 'Court order, then HCJDC expungement (§§ 706-622.5/.9, 291E-64)',
          citation: 'Haw. Rev. Stat. §§ 706-622.5, 706-622.9, 291E-64'
        },
        ineligible_conviction_hi: {
          status: 'ineligible',
          title: 'This Conviction Cannot Be Expunged',
          message: 'Hawaii expunges convictions only in a few narrow categories (under-21 DUI, first-time drug offender, first-time property offender), and yours is not one of them, so there is no expungement route. One counterintuitive thing worth knowing: even a PARDON does not make a Hawaii conviction expungeable — a pardoned conviction stays on the record with a pardon notation. So the honest answer here is that the record remains. If any part of your case ended without a conviction, that piece may still be expungeable separately. The HCJDC Expungement Section ((808) 587-3348) can confirm.',
          remedy: 'None (conviction outside the narrow categories) — a pardon does not expunge it here',
          citation: 'Haw. Rev. Stat. § 831-3.2'
        },
        complex_convtype_hi: {
          status: 'complex',
          title: 'We Need to Match Your Conviction to the Categories',
          message: 'Hawaii will expunge a conviction only if it fits one of three narrow categories: under-21 DUI, first-time drug offender (§§ 706-622.5/.8), or first-time property offender (§ 706-622.9). Whether yours qualifies depends on exactly how you were sentenced, which we will not guess at. Your court paperwork shows the sentencing statute. The HCJDC Expungement Section ((808) 587-3348) can help you check it against the categories.',
          remedy: 'Match Your Sentence to the Categories (court paperwork / HCJDC)',
          citation: 'Haw. Rev. Stat. §§ 706-622.5, 706-622.9, 291E-64'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Administrative Expungement (Haw. Rev. Stat. § 831-3.2)',
          formName: 'HCJDC expungement application',
          formUrl: 'https://ag.hawaii.gov/hcjdc/expungement/',
          steps: [
            'Apply to the Attorney General\'s HCJDC (not a court) — it "shall issue" for non-convictions and completed deferred pleas.',
            'For a qualifying conviction (under-21 DUI, first-time drug, first-time property), get a court order first, then apply to HCJDC.',
            'Pay $35 (first-time) or $50 (repeat) by cashier\'s check or money order; expect about 120 days, with no expediting.',
            'Since July 2025 the court record is sealed automatically; for a certificate issued before then, make a separate court request to seal on eCourt Kokua.'
          ],
          // NOT null: Wave 7 gives the fee ($35 first-time / $50 repeat, incl. $10 nonrefundable).
          fees: '$35 first-time / $50 repeat administrative fee (includes a $10 nonrefundable portion), by cashier\'s check or money order only.',
          // null: Wave 7 gives no waiver information for the HCJDC fee.
          feeWaiver: null,
          courtContact: 'HCJDC Expungement Section, (808) 587-3348, 465 S. King St. Rm 102, Honolulu (and the sentencing court for a conviction order)'
        }
      },
      legalAid: [
        { name: 'HCJDC Expungement Section — (808) 587-3348', url: 'https://ag.hawaii.gov/hcjdc/expungement/' },
        { name: 'Legal Aid Society of Hawaii', url: 'https://www.legalaidhawaii.org' }
      ]
    }
  },
  ME: {
    code: 'ME',
    name: 'Maine',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Maine has NO expungement. The remedy is a post-judgment MOTION TO SEAL (15 M.R.S. ch. 310-A, '
      + '§§ 2261-2265). Two things make Maine distinctive. First, a structural quirk: most non-conviction '
      + 'information is already confidential by law (16 M.R.S. § 703), so dismissals and acquittals are '
      + 'generally non-public WITHOUT any petition — you often do not need to file. Second, a 2024 change '
      + 'that most guides have not caught up to: the old rule limiting sealing to convictions from ages 18-27 '
      + 'was REMOVED, so now ALL Class E convictions (the lowest level) except sexual assault can be sealed, '
      + 'at any age, four years after the sentence is satisfied. Filing is about $5 — among the cheapest in '
      + 'the country.',
    keyDates: [
      {
        label: 'Age cap (18-27) for Class E sealing removed (HP1435)',
        date: '2024',
        kind: 'effective',
        note: 'Wave 7 gives the year only. The old 18-to-27 age limitation was removed in 2024; ALL Class E convictions except sexual assault are now sealable regardless of age. Most online guides still state the age cap — encode from the current statute.',
      },
      {
        label: 'Sealing for sex-trafficking/exploitation-related convictions (LD 1871)',
        date: '2026-01-11',
        kind: 'effective',
        note: 'Enacted Jan 11, 2026. Any conviction substantially resulting from sex trafficking or sexual exploitation is sealable anytime, no waiting period; documentation creates a presumption. Two weeks old in legislative terms — confirm operative status.',
      },
      {
        label: 'Marijuana-sealing cutoff (Class D/E convictions before this date)',
        date: '2017-01-30',
        kind: 'effective',
        note: 'Class D and E marijuana convictions from BEFORE January 30, 2017 are sealable.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the 2024 removal of the age cap for Class E sealing (HP1435) against the current 15 M.R.S. § 2261 text. Wave 7 calls this "discrepancy gold" — most online guides and both major court-records sites still state the old 18-to-27 age limitation. The tree encodes the repeal (no age question); confirm it against the statute.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the ~$5 filing fee is current. Wave 7 gives it as the cheapest in the nation (Motion CR-218) but flags it for confirmation. The fees field encodes ~$5 and flags this; courts.maine.gov is the check.',
        blocksFields: [],
      },
      {
        question:
          'Confirm LD 1871 (sex-trafficking/exploitation sealing, enacted Jan 11, 2026) is operative, and confirm whether any indigency fee waiver applies to the sealing motion. Wave 7 gives LD 1871 as two weeks old and gives no waiver information; the feeWaiver field is null pending confirmation.',
        blocksFields: ['resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Me. Rev. Stat. tit. 15, §§ 2261-2265 (motion to seal; 4-year prerequisite)', url: null, retrievedOn: null },
      { id: 'Me. Rev. Stat. tit. 16, § 703 (records classification — non-conviction confidentiality)', url: null, retrievedOn: null },
      { id: 'HP1435 (2024) (removed the 18-27 age cap for Class E sealing)', url: null, retrievedOn: null },
      { id: 'LD 1871 (2026) (sealing for sex-trafficking/exploitation-related convictions)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'conv_type_me' },
            { label: 'Dismissed', value: 'dismissed', next: 'already_confidential_me' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'already_confidential_me' },
            { label: 'Deferred disposition dismissed', value: 'deferred', next: 'already_confidential_me' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        conv_type_me: {
          type: 'choice',
          text: 'What kind of conviction is it?',
          options: [
            { label: 'A Class E offense (the lowest level — max 6 months / $1,000)', value: 'classE', next: 'classE_sexual_me' },
            { label: 'A Class D or E marijuana conviction from before January 30, 2017', value: 'marijuana', next: 'eligible_marijuana_me' },
            { label: 'A conviction resulting from sex trafficking or sexual exploitation', value: 'trafficking', next: 'eligible_trafficking_me' },
            { label: 'An OUI (operating under the influence)', value: 'oui', next: 'ineligible_oui_me' },
            { label: 'Another Class A, B, C, or D conviction', value: 'other', next: 'ineligible_conviction_me' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_convtype_me' }
          ]
        },
        classE_sexual_me: {
          type: 'boolean',
          text: 'Was the offense a sexual assault?',
          yes: 'ineligible_conviction_me',
          no: 'classE_date_me'
        },
        classE_date_me: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was your sentence satisfied, including all fines and fees?',
          validation: {
            period: { amount: 4, unit: 'years', anchor: 'since sentence satisfied incl. LFOs, no other convictions (15 M.R.S. § 2262 — Class E sealing)' },
            nextPass: 'eligible_classE_me',
            nextFail: 'waiting_me'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Maine seals a narrow set of convictions, but most non-convictions are already confidential by law without any filing — so the outcome matters a lot. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a Maine State Bureau of Identification record request will show the disposition; Pine Tree Legal Assistance can help you read it.',
          remedy: 'Get Your Record First (court paperwork / SBI)',
          citation: '15 M.R.S. ch. 310-A (the route depends on the disposition)'
        },
        already_confidential_me: {
          status: 'eligible',
          title: 'Likely Already Confidential — You May Not Need to File',
          message: 'Here is a Maine-specific piece of good news: because your case ended without a conviction, the information is generally CONFIDENTIAL by law already (16 M.R.S. § 703) — non-public without you filing anything. So in most cases you do not need a sealing motion for a dismissal or acquittal; it should already be off public view. If you find it is still appearing somewhere it should not, Pine Tree Legal Assistance can help you address that specific record. But the default answer is reassuring: you likely do not need to do anything.',
          remedy: 'Usually nothing to file — non-convictions are confidential by classification (§ 703)',
          citation: 'Me. Rev. Stat. tit. 16, § 703'
        },
        eligible_classE_me: {
          status: 'eligible',
          title: 'Class E Conviction, 4+ Years — Sealable (Age No Longer Matters)',
          message: 'Based on your dates — 4 years since your sentence was satisfied, with no other convictions — this Class E conviction is sealable under 15 M.R.S. § 2262. The important update: Maine REMOVED the old rule that limited this to ages 18-27, so your age does not matter anymore — most guides still show the old age cap, but it is gone as of 2024. You file a Motion to Seal (CR-218); the fee is about $5, among the lowest anywhere. Once sealed, the record is deniable except to criminal-justice agencies and a few listed entities. Pine Tree Legal Assistance can help.',
          remedy: 'Motion to seal a Class E conviction (§ 2262)',
          citation: 'Me. Rev. Stat. tit. 15, § 2262'
        },
        waiting_me: {
          status: 'waiting',
          title: 'Not Yet Four Years',
          message: 'Maine lets you seal a Class E conviction 4 years after the sentence is satisfied (including all fines and fees), with no other convictions in the window. Based on your dates, that has not passed yet. When it does, the motion (CR-218) costs about $5 to file. Pine Tree Legal Assistance can help you time it.',
          remedy: 'Wait for the 4-year period (§ 2262)',
          citation: 'Me. Rev. Stat. tit. 15, § 2262'
        },
        eligible_marijuana_me: {
          status: 'eligible',
          title: 'Pre-2017 Marijuana Conviction — Sealable',
          message: 'Because this is a Class D or E marijuana conviction from before January 30, 2017, Maine allows it to be sealed. You file a Motion to Seal (CR-218) — filing is about $5. Pine Tree Legal Assistance can help you prepare it.',
          remedy: 'Motion to seal a pre-2017 marijuana conviction',
          citation: 'Me. Rev. Stat. tit. 15, ch. 310-A'
        },
        eligible_trafficking_me: {
          status: 'eligible',
          title: 'Trafficking-Related Conviction — Sealable Anytime (New Law)',
          message: 'Because your conviction substantially resulted from sex trafficking or sexual exploitation, Maine\'s new law (LD 1871, enacted January 2026) lets you seal it ANYTIME — no waiting period — and documentation of the trafficking creates a presumption in your favor. This law is very new, so it is worth filing with help. Pine Tree Legal Assistance can guide the motion and the documentation.',
          remedy: 'Motion to seal a trafficking-related conviction (LD 1871) — no wait',
          citation: 'LD 1871 (2026)'
        },
        ineligible_conviction_me: {
          status: 'ineligible',
          title: 'This Conviction Cannot Be Sealed',
          message: 'Maine seals only Class E convictions (except sexual assault), pre-2017 marijuana convictions, and trafficking-related convictions. A Class A, B, C, or D conviction (or a Class E sexual assault) is not sealable. No waiting period changes that. The remaining route is a pardon: eligible 5 years after your sentence, and a full-and-free pardon makes the record confidential. Pine Tree Legal Assistance can explain the pardon process.',
          remedy: 'None (not a sealable class) — a pardon (5 yrs) is the remaining route',
          citation: 'Me. Rev. Stat. tit. 15, § 2261'
        },
        ineligible_oui_me: {
          status: 'ineligible',
          title: 'OUI — No Sealing, and the Pardon Board Will Not Take It',
          message: 'This one is a double no, and it is better to know it up front. An OUI (operating under the influence) is not a sealable class in Maine — and unlike other convictions, it does not even have a pardon fallback, because the Board of Pardons will not consider OUI applications (nor registry-removal or firearms-motivated ones). So there is no record-clearing route for an OUI here. If you have OTHER, sealable convictions on your record, those may still qualify separately. Pine Tree Legal Assistance can help you check the rest of your record.',
          remedy: 'None — OUI is neither sealable nor pardonable in Maine',
          citation: 'Me. Rev. Stat. tit. 15, § 2261'
        },
        complex_convtype_me: {
          status: 'complex',
          title: 'We Need the Conviction Class',
          message: 'Maine seals only Class E convictions (except sexual assault), pre-2017 marijuana, and trafficking-related convictions — so the class matters. Since you are not sure which yours is, we are not going to guess. Your court paperwork states the class, and a Maine SBI record request will show it. Pine Tree Legal Assistance can help you read it.',
          remedy: 'Get the Conviction Class First (court paperwork / SBI)',
          citation: 'Me. Rev. Stat. tit. 15, § 2262'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Motion to Seal (15 M.R.S. ch. 310-A, §§ 2261-2265)',
          formName: 'Motion to Seal (CR-218)',
          formUrl: 'https://www.courts.maine.gov/fees-forms/forms.html',
          steps: [
            'For a dismissal or acquittal, you likely do not need to file — the information is confidential by classification (16 M.R.S. § 703).',
            'For a Class E conviction (except sexual assault), confirm 4 years have passed since your sentence was satisfied, with no other convictions — the old age cap no longer applies.',
            'File a Motion to Seal (CR-218) in the court of conviction; the fee is about $5.',
            'For a pre-2017 marijuana or a trafficking-related conviction, the same motion applies (trafficking-related has no waiting period). Pine Tree Legal Assistance can help.'
          ],
          // NOT null: Wave 7 gives ~$5 (flagged to confirm current).
          fees: 'About $5 to file the Motion to Seal (CR-218) — among the lowest in the nation (confirm current).',
          // null: Wave 7 gives no indigency-waiver information for the sealing motion.
          feeWaiver: null,
          courtContact: 'The court of conviction'
        }
      },
      legalAid: [
        { name: 'Pine Tree Legal Assistance', url: 'https://www.ptla.org' },
        { name: 'Maine Judicial Branch — Fees & Forms', url: 'https://www.courts.maine.gov/fees-forms/forms.html' }
      ]
    }
  },
  MT: {
    code: 'MT',
    name: 'Montana',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Montana offers TRUE expungement of MISDEMEANORS — permanent destruction from the state criminal-history '
      + 'system — filed in district court (§§ 46-18-1102 to -1111). It is presumed ("shall grant") after 5 '
      + 'conviction-free years since you completed your sentence, or immediately for a military applicant '
      + 'whose record is blocking enlistment. But it is ONCE PER LIFETIME: a single order, though that one '
      + 'order can cover several misdemeanors, so bundle everything into it. Felonies cannot be expunged at '
      + 'all (only a deferred-imposition dismissal or a rare pardon). Note the statute was renumbered in 2019 '
      + '(HB 543 repealed the old § 46-18-1101), and many sources still cite the dead section.',
    keyDates: [
      {
        label: 'Misdemeanor Expungement Clarification Act renumbers the statute (HB 543)',
        date: '2019',
        kind: 'effective',
        note: 'Wave 7 gives the year. HB 543 repealed § 46-18-1101 and recodified the misdemeanor-expungement law into §§ 46-18-1102 through -1111. The DOJ page and most attorneys still cite 1101 — cite the live sections.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the live statutory sections. Wave 7 flags that the 2019 Misdemeanor Expungement Clarification Act (HB 543) repealed § 46-18-1101 and recodified into §§ 46-18-1102 to -1111, but sources (including the DOJ\'s own page and most attorneys) still cite the dead 1101 section. The tree cites the live sections with a "recodified 2019" note; confirm against current MCA text.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the multiple-misdemeanor bundling practice. Wave 7 says a single lifetime order may cover multiple misdemeanors (the court may grant all, some, or none per § 46-18-1110), but flags practitioner-reported inconsistency between jurisdictions on whether bundling is allowed — a call question. The tree tells people to bundle everything into the one petition; confirm the practice with a district clerk.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the district court filing fee. Wave 7 flags it as a phone target (a Yellowstone or Missoula clerk). The fees and feeWaiver fields are null pending this; courts.mt.gov publishes the self-help forms packet.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Mont. Code Ann. §§ 46-18-1102 to -1111 (misdemeanor expungement; recodified 2019 by HB 543)', url: null, retrievedOn: null },
      { id: 'Mont. Code Ann. § 46-18-1110 (one order may cover multiple misdemeanors)', url: null, retrievedOn: null },
      { id: '2019 HB 47 (non-conviction return/expungement of prints and photos)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_mt' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_mt' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_mt' },
            { label: 'Deferred imposition completed and dismissed', value: 'deferred', next: 'eligible_deferred_mt' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        level_mt: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_prioruse_mt' },
            { label: 'Felony', value: 'felony', next: 'ineligible_felony_mt' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_mt' }
          ]
        },
        misd_prioruse_mt: {
          type: 'boolean',
          text: 'Have you already used Montana\'s once-in-a-lifetime misdemeanor expungement?',
          yes: 'ineligible_prioruse_mt',
          no: 'misd_military_mt'
        },
        misd_military_mt: {
          type: 'boolean',
          text: 'Are you a military applicant or enlistee, and this conviction is blocking your service?',
          yes: 'eligible_military_mt',
          no: 'misd_discretionary_mt'
        },
        misd_discretionary_mt: {
          type: 'boolean',
          text: 'Was the offense any of these: assault, partner or family-member assault, stalking, sexual assault, a protective-order violation, or DUI?',
          yes: 'misd_disc_date_mt',
          no: 'misd_presumed_date_mt'
        },
        misd_presumed_date_mt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including all fines, fees, and any court-ordered treatment?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction-free since sentence completion incl. LFOs and treatment (Mont. Code Ann. § 46-18-1104 — presumed misdemeanor expungement)' },
            nextPass: 'eligible_presumed_mt',
            nextFail: 'waiting_mt'
          }
        },
        misd_disc_date_mt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including all fines, fees, and any court-ordered treatment?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction-free since sentence completion incl. LFOs and treatment (Mont. Code Ann. § 46-18-1104 — discretionary misdemeanor expungement)' },
            nextPass: 'eligible_discretionary_mt',
            nextFail: 'waiting_mt'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Montana expunges misdemeanors (a true, permanent destruction) but not felonies, and non-convictions have their own path — so the outcome decides everything. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a Montana DOJ criminal-history request will show the disposition; the Montana Legal Services Association can help you read it.',
          remedy: 'Get Your Record First (court paperwork / Montana DOJ)',
          citation: 'Mont. Code Ann. §§ 46-18-1102 to -1111 (the route depends on the disposition)'
        },
        nonconv_mt: {
          status: 'eligible',
          title: 'No Conviction — Records Returned/Expunged',
          message: 'Because your case ended without a conviction, Montana\'s process (2019 HB 47) provides for the return or expungement of your fingerprints and photos through the state repository — a semi-automatic step for no-charge releases and invalidated convictions. The Montana Legal Services Association can help you make sure it happens for your record.',
          remedy: 'Non-conviction record return/expungement (2019 HB 47)',
          citation: '2019 HB 47'
        },
        eligible_deferred_mt: {
          status: 'eligible',
          title: 'Deferred Imposition Completed — Dismissed',
          message: 'Because you completed a deferred imposition of sentence, the charge is dismissed — the standard Montana path for a case handled that way at sentencing. If it was a felony handled by deferred imposition, this dismissal is the relief available (felonies cannot otherwise be expunged). The Montana Legal Services Association can confirm your record reflects the dismissal and explain any remaining steps.',
          remedy: 'Deferred-imposition dismissal',
          citation: 'Mont. Code Ann. § 46-18-1102'
        },
        eligible_presumed_mt: {
          status: 'eligible',
          title: 'Misdemeanor, 5+ Years — Presumed Eligible (Bundle Them)',
          message: 'Based on your dates — 5 conviction-free years since completing your sentence, including fines, fees, and any treatment — your misdemeanor expungement is PRESUMED, meaning the court "shall grant" it. And this is a true expungement: permanent destruction from the state criminal-history system. One important thing to plan around: it is ONCE PER LIFETIME, but a single order can cover several misdemeanors, so bundle everything you want cleared into this one petition. After the grant, you mail the order plus a fingerprint card and a DOJ form to CRISS in Helena. The Montana Legal Services Association can help.',
          remedy: 'Presumed misdemeanor expungement (§ 46-18-1104) — bundle all misdemeanors',
          citation: 'Mont. Code Ann. § 46-18-1104'
        },
        eligible_discretionary_mt: {
          status: 'eligible',
          title: 'Eligible, But Discretionary — Come Prepared',
          message: 'Based on your dates, 5 conviction-free years have passed, so you can petition — but for your offense type (assault, partner/family-member assault, stalking, sexual assault, protective-order violation, or DUI) the grant is NOT presumed. It is discretionary: the court balances factors, with victim notification and a prosecutor response. That means it is possible, just uphill, so it helps to come prepared. Remember it is once per lifetime, and one order can bundle multiple misdemeanors. The Montana Legal Services Association can help you make the strongest case.',
          remedy: 'Discretionary misdemeanor expungement (§ 46-18-1104) — possible but uphill',
          citation: 'Mont. Code Ann. § 46-18-1104'
        },
        waiting_mt: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Montana requires 5 conviction-free years since you completed your sentence (including fines, fees, and any court-ordered treatment) before a misdemeanor expungement. Based on your dates, that has not passed yet. When it does, remember it is once per lifetime — so bundle every misdemeanor you want cleared into the single petition. The Montana Legal Services Association can help you plan. (A military applicant blocked by a record can petition immediately, without the wait.)',
          remedy: 'Wait for the 5-year period (§ 46-18-1104)',
          citation: 'Mont. Code Ann. § 46-18-1104'
        },
        eligible_military_mt: {
          status: 'eligible',
          title: 'Military Applicant — Petition Now, No Wait',
          message: 'Because you are a military applicant or enlistee and a misdemeanor conviction is blocking your service, Montana lets you petition for expungement IMMEDIATELY — no 5-year wait. This is a specific, unusual provision worth using. It is still once per lifetime, and one order can cover multiple misdemeanors, so include everything relevant. The Montana Legal Services Association can help you file quickly.',
          remedy: 'Immediate misdemeanor expungement for military applicants (§ 46-18-1104)',
          citation: 'Mont. Code Ann. § 46-18-1104'
        },
        ineligible_felony_mt: {
          status: 'ineligible',
          title: 'Felony — No Expungement in Montana',
          message: 'Montana does not expunge felonies at all. Two things can still help, depending on your case: if the felony was handled with a deferred imposition of sentence, completing it results in a dismissal; and a pardon remains theoretically available, though it is rare (only a handful of recommendations a year). For marijuana convictions there is a separate legalization-era path with resources through the Office of Court Administrator. The Montana Legal Services Association can explain which applies to you.',
          remedy: 'None (no felony expungement) — deferred-imposition dismissal or a rare pardon',
          citation: 'Mont. Code Ann. § 46-18-1102'
        },
        ineligible_prioruse_mt: {
          status: 'ineligible',
          title: 'Your One Lifetime Expungement Has Been Used',
          message: 'Montana allows only one misdemeanor expungement in a lifetime, and because you have already used it, another is not available — no waiting period changes that. If any NON-conviction is on your record, that has its own return/expungement path; and a pardon, though rare, remains theoretically possible. The Montana Legal Services Association can help you look at what is left.',
          remedy: 'None (one-time expungement used) — check non-convictions or a rare pardon',
          citation: 'Mont. Code Ann. § 46-18-1104'
        },
        complex_level_mt: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'It matters a great deal in Montana: a misdemeanor can be expunged (once per lifetime), but a felony cannot be expunged at all. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a Montana DOJ criminal-history request will show it. The Montana Legal Services Association can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / Montana DOJ)',
          citation: 'Mont. Code Ann. § 46-18-1104'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Misdemeanor Expungement (Mont. Code Ann. §§ 46-18-1102 to -1111; recodified 2019)',
          formName: 'Montana Judicial Branch self-help expungement forms packet',
          formUrl: 'https://courts.mt.gov/selfhelp/',
          steps: [
            'Confirm it is a misdemeanor — felonies cannot be expunged (deferred-imposition dismissal or a rare pardon are the only felony routes).',
            'Wait until 5 conviction-free years after completing your sentence (or petition immediately if a military applicant blocked by the record).',
            'File one petition in district court, bundling every misdemeanor you want cleared — it is once per lifetime.',
            'After the grant, mail the order plus an FD-258 fingerprint card and the DOJ form to CRISS in Helena. Montana Legal Services Association offers free help.'
          ],
          // null: Wave 7 flags the district court filing fee as a phone target — the
          // amount and any waiver are unknown.
          fees: null,
          feeWaiver: null,
          courtContact: 'The district court where the case was handled'
        }
      },
      legalAid: [
        { name: 'Montana Legal Services Association', url: 'https://www.mtlsa.org' },
        { name: 'Montana Judicial Branch — Self-Help', url: 'https://courts.mt.gov/selfhelp/' }
      ]
    }
  },
  RI: {
    code: 'RI',
    name: 'Rhode Island',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Rhode Island uses EXPUNGEMENT for convictions (§ 12-1.3) and SEALING for non-convictions (§ 12-1-12). '
      + 'It is discretionary — even when your timing is met, a judge must find good moral character and '
      + 'rehabilitation. The core is a first-offender rule (a single conviction, nothing else ever): 5 years '
      + 'for a misdemeanor, 10 for a felony. A 2017 reform added a multi-misdemeanor lane (more than one but '
      + 'fewer than six misdemeanors, no felony) at 10 years from the last. One practical thing to remember: '
      + 'the record is not really gone until, after the grant, certified orders are delivered to the state '
      + 'Bureau of Criminal Identification and the arresting agency.',
    keyDates: [
      {
        label: 'Multi-misdemeanor expungement lane created (2017 reform, § 12-1.3-2)',
        date: '2017',
        kind: 'effective',
        note: 'Wave 7 gives the year. Allows expunging more than one but fewer than six misdemeanors (no felony) at 10 years from the last sentence; excludes DV, DUI, and chemical-test refusal.',
      },
      {
        label: 'Rule 48(a) dismissals auto-seal (§ 12-1-12.1(a)(1))',
        date: '2023-01-01',
        kind: 'operative',
        note: 'Rule 48(a) dismissals on or after this date are sealed automatically; older dismissals are sealed on petition.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the multi-misdemeanor exclusion nuance. Wave 7 says the multi-misdemeanor lane excludes DV (ch. 12-29), DUI, and chemical-test refusal, but that per practitioners those offenses remain INDIVIDUALLY expungable on the single-misdemeanor path if the person otherwise qualifies. The tree routes a multi-misdemeanor record containing one of those to a "get help — this is nuanced" result; confirm the individual-path availability.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the status of marijuana auto-expungement (§ 12-1.3-5). Wave 7 flags its operational status. The tree does not assert automatic marijuana clearing; confirm whether the automation is running and how someone checks.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'R.I. Gen. Laws § 12-1.3-2 (expungement; first-offender and multi-misdemeanor paths)', url: null, retrievedOn: null },
      { id: 'R.I. Gen. Laws §§ 12-1-12, 12-1-12.1 (non-conviction sealing; Rule 48(a) auto-seal)', url: null, retrievedOn: null },
      { id: 'R.I. Gen. Laws § 12-1.3-5 (marijuana auto-expungement)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'conv_count_ri' },
            { label: 'Dismissed', value: 'dismissed', next: 'dismissal_ri' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'dismissal_ri' },
            { label: 'Deferred sentence completed', value: 'deferred', next: 'eligible_deferred_ri' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        dismissal_ri: {
          type: 'boolean',
          text: 'Was the case a dismissal (Rule 48(a)) on or after January 1, 2023?',
          yes: 'check_autoseal_ri',
          no: 'petition_seal_ri'
        },
        conv_count_ri: {
          type: 'choice',
          text: 'How would you describe your record?',
          options: [
            { label: 'A single conviction, and nothing else on my record ever', value: 'first', next: 'firstoffender_level_ri' },
            { label: 'More than one but fewer than six misdemeanors, and no felony', value: 'multimisd', next: 'multimisd_dv_ri' },
            { label: 'Multiple felony convictions', value: 'multifelony', next: 'ineligible_multifelony_ri' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_count_ri' }
          ]
        },
        firstoffender_level_ri: {
          type: 'choice',
          text: 'Was that single conviction a misdemeanor or a felony?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'fo_violence_misd_ri' },
            { label: 'Felony', value: 'felony', next: 'fo_violence_felony_ri' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_count_ri' }
          ]
        },
        fo_violence_misd_ri: {
          type: 'boolean',
          text: 'Was the offense a crime of violence? (Rhode Island\'s list of crimes of violence includes burglary.)',
          yes: 'ineligible_violence_ri',
          no: 'fo_misd_date_ri'
        },
        fo_violence_felony_ri: {
          type: 'boolean',
          text: 'Was the offense a crime of violence? (Rhode Island\'s list of crimes of violence includes burglary.)',
          yes: 'ineligible_violence_ri',
          no: 'fo_felony_date_ri'
        },
        multimisd_dv_ri: {
          type: 'boolean',
          text: 'Do any of these misdemeanors involve domestic violence, DUI, or chemical-test refusal? (Those are excluded from the multi-misdemeanor lane, though they may qualify individually.)',
          yes: 'complex_multimisd_excluded_ri',
          no: 'multimisd_date_ri'
        },
        fo_misd_date_ri: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including all court fines and fees?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'from sentence completion with LFOs paid (R.I. Gen. Laws § 12-1.3-2 — first-offender misdemeanor)' },
            nextPass: 'eligible_firstoffender_ri',
            nextFail: 'waiting_ri'
          }
        },
        fo_felony_date_ri: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, including all court fines and fees?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from sentence completion with LFOs paid (R.I. Gen. Laws § 12-1.3-2 — first-offender felony)' },
            nextPass: 'eligible_firstoffender_ri',
            nextFail: 'waiting_ri'
          }
        },
        multimisd_date_ri: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete the LAST of the sentences?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from completion of the last sentence (R.I. Gen. Laws § 12-1.3-2 — multi-misdemeanor lane)' },
            nextPass: 'eligible_multimisd_ri',
            nextFail: 'waiting_ri'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Rhode Island expunges convictions and seals non-convictions on different tracks, and the conviction rules depend on how many convictions you have. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a BCI record from the Attorney General ($5, 4 Howard Ave, Cranston) will show the disposition; the Rhode Island Public Defender resource guide can help you read it.',
          remedy: 'Get Your Record First (court paperwork / BCI)',
          citation: 'R.I. Gen. Laws §§ 12-1.3-2, 12-1-12 (the route depends on the disposition)'
        },
        check_autoseal_ri: {
          status: 'eligible',
          title: 'Likely Already Auto-Sealed — Check',
          message: 'Because your case was a Rule 48(a) dismissal on or after January 1, 2023, Rhode Island seals it AUTOMATICALLY. So the honest first step is to CHECK whether it is already sealed — pull a BCI record from the Attorney General ($5) and look. If it is still showing, the courts.ri.gov expungement information or the Public Defender can help you follow up. Sealing non-convictions is free.',
          remedy: 'Check your record — a post-2023 Rule 48(a) dismissal should be auto-sealed (§ 12-1-12.1)',
          citation: 'R.I. Gen. Laws § 12-1-12.1'
        },
        petition_seal_ri: {
          status: 'eligible',
          title: 'No Conviction — Sealable, Free',
          message: 'Because your case ended without a conviction and before the 2023 auto-seal date, you can petition to seal it — sealing non-convictions is free. You file in the court of the case; the Attorney General and police are served. A BCI record from the AG ($5) helps you confirm what is on file. The Rhode Island Public Defender resource guide can help.',
          remedy: 'Non-conviction sealing petition (§ 12-1-12) — free',
          citation: 'R.I. Gen. Laws § 12-1-12'
        },
        eligible_deferred_ri: {
          status: 'eligible',
          title: 'Deferred Sentence Completed — Expungeable',
          message: 'Because you completed a deferred sentence, Rhode Island allows expungement on completion (§ 12-1.3-2(e)). It is still discretionary — a judge weighs good moral character and rehabilitation — and the $100 fee applies on grant (waivable for indigency). After the grant, make sure certified orders reach the BCI and the arresting agency, or the record is not fully cleared. The Rhode Island Public Defender resource guide can help.',
          remedy: 'Expungement of a completed deferred sentence (§ 12-1.3-2(e))',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        eligible_firstoffender_ri: {
          status: 'eligible',
          title: 'First Offender, Waiting Period Met — Expungeable',
          message: 'Based on your dates, you meet the first-offender waiting period (5 years for a misdemeanor, 10 for a felony) from completing your sentence with all court fines and fees paid. One honest caveat: it is discretionary, so even with the timing met a judge must find good moral character and rehabilitation. The fee is $100, payable on grant and waivable for indigency. After the grant, deliver certified orders to the BCI and the arresting agency — the record is not truly gone until that is done. The Rhode Island Public Defender resource guide can help.',
          remedy: 'First-offender expungement (§ 12-1.3-2)',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        eligible_multimisd_ri: {
          status: 'eligible',
          title: 'Multiple Misdemeanors, 10+ Years — Expungeable',
          message: 'Because you have more than one but fewer than six misdemeanors (and no felony), Rhode Island\'s 2017 multi-misdemeanor lane lets you expunge any or all of them 10 years after your last sentence — and based on your dates, that has passed. It is still discretionary (good moral character and rehabilitation), and the $100 fee applies on grant (waivable for indigency). After the grant, deliver certified orders to the BCI and the arresting agency. The Rhode Island Public Defender resource guide can help.',
          remedy: 'Multi-misdemeanor expungement (§ 12-1.3-2) — 10 years from the last',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        waiting_ri: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Rhode Island\'s waiting periods run from sentence completion with all court fines and fees paid: 5 years for a first-offender misdemeanor, 10 for a first-offender felony, and 10 years from the last for the multi-misdemeanor lane. Based on your dates, yours has not passed yet. When it does, remember it is discretionary and the $100 fee (waivable) is due on grant. The Rhode Island Public Defender resource guide can help you plan.',
          remedy: 'Wait for the period (§ 12-1.3-2)',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        ineligible_violence_ri: {
          status: 'ineligible',
          title: 'Crime of Violence — Not Expungeable',
          message: 'Rhode Island never expunges a crime of violence, and its list is broader than you might expect — it includes burglary. No waiting period changes that. For an offense on that list, a pardon is the remaining route. The Rhode Island Public Defender resource guide can help you confirm whether yours is classified as a crime of violence and explain the pardon process.',
          remedy: 'None (Crime of Violence) — a pardon is the remaining route',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        complex_multimisd_excluded_ri: {
          status: 'complex',
          title: 'DV, DUI, or Refusal in the Mix — Get Help',
          message: 'Here is a Rhode Island nuance worth getting right. The multi-misdemeanor lane specifically excludes domestic violence, DUI, and chemical-test refusal — so those cannot ride along in a multi-misdemeanor expungement. BUT practitioners note they may still be expungable INDIVIDUALLY on the single-misdemeanor path, if you otherwise qualify. Because sorting out which of your offenses can go which way is exactly the kind of thing worth doing with help, we are routing you to it rather than guessing. The Rhode Island Public Defender resource guide and a District Court clerk can map it out.',
          remedy: 'Get Help Sorting the Excluded Offenses (RI Public Defender)',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        ineligible_multifelony_ri: {
          status: 'ineligible',
          title: 'Multiple Felonies — Not Expungeable',
          message: 'Rhode Island\'s expungement is built around first offenders: you can expunge one first-offender felony, but multiple felony convictions cannot be expunged. No waiting period changes that. A pardon remains the route for felony convictions beyond the first. If any part of your record was a non-conviction, that can still be sealed separately. The Rhode Island Public Defender resource guide can help you check.',
          remedy: 'None (multiple felonies) — a pardon is the remaining route',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        },
        complex_count_ri: {
          status: 'complex',
          title: 'We Need to Know Your Record',
          message: 'Rhode Island\'s expungement rules turn on exactly how many convictions you have and whether any are felonies — a single first offense, a handful of misdemeanors, or multiple felonies all lead different places. Since you are not sure, we are not going to guess. A BCI record from the Attorney General ($5) will show your full record. The Rhode Island Public Defender resource guide can help you read it.',
          remedy: 'Get Your Full Record First (BCI)',
          citation: 'R.I. Gen. Laws § 12-1.3-2'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement / Sealing (R.I. Gen. Laws §§ 12-1.3-2, 12-1-12)',
          formName: 'Rhode Island courts expungement/sealing motion',
          formUrl: 'https://www.courts.ri.gov',
          steps: [
            'Figure out your path: first offender (single conviction), the multi-misdemeanor lane (2-5 misdemeanors, no felony), or non-conviction sealing.',
            'Confirm your waiting period is met and all court fines and fees are paid; note the grant is discretionary (good moral character + rehabilitation).',
            'File the motion in the court of conviction; the Attorney General and police are served. Get a BCI record from the AG ($5) to confirm your record.',
            'The $100 fee is payable on grant (waivable for indigency); after the grant, deliver certified orders to the BCI and the arresting agency to complete it.'
          ],
          // NOT null: Wave 7 gives $100 on grant (waivable) plus the $5 BCI record.
          fees: '$100 fee payable on grant (waivable for indigency), plus a $5 BCI record from the Attorney General. Non-conviction sealing is free.',
          feeWaiver: 'The $100 fee is waivable for indigency.',
          courtContact: 'The court of conviction (AG BCI at 4 Howard Ave, Cranston for records)'
        }
      },
      legalAid: [
        { name: 'Rhode Island Public Defender — Expungement Resource Guide', url: 'https://ripd.org' },
        { name: 'Rhode Island Judiciary — Expungement Information', url: 'https://www.courts.ri.gov' }
      ]
    }
  },
  SD: {
    code: 'SD',
    name: 'South Dakota',
    lastReviewed: '2026-07-16',
    verificationStatus: 'statute_cited',
    verifiedDate: '2026-07-16',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'South Dakota is restrictive, and it is best to be plain about it: expungement (§§ 23A-3-26 to -37) is '
      + 'for NON-CONVICTIONS — arrests without a charge (1 year), dismissed cases (1 year, or sooner on '
      + '"compelling necessity"), and acquittals (anytime). For CONVICTIONS there is no general path; the '
      + 'exceptions are the whole story: petty offenses, municipal violations, and Class 2 misdemeanors come '
      + 'off the public record automatically after conditions are met; a suspended imposition of sentence is '
      + 'sealed on successful completion; and diversion completions are auto-expunged. DUI and other '
      + 'motor-vehicle convictions are excluded entirely. The state\'s online self-help (Guide & File) is '
      + 'unusually friendly for such a narrow law.',
    keyDates: [
      {
        label: 'Diversion completions auto-expunged (§§ 23A-3-35 to -37)',
        date: '2018',
        kind: 'effective',
        note: 'Wave 7 gives the year. Completed diversions are expunged automatically — no motion needed.',
      },
      {
        label: 'Early dismissal expungement on "compelling necessity"',
        date: '2022',
        kind: 'effective',
        note: 'Wave 7 gives the year. A dismissed case can be expunged sooner than the usual 1 year on a showing of compelling necessity.',
      },
      {
        label: 'Automatic-removal amended (§ 23A-3-34, SL 2016 ch 134)',
        date: '2016',
        kind: 'effective',
        note: 'Amendment history for the § 23A-3-34 automatic-removal section (Diana, statute pass 2026-07-16).',
      },
      {
        label: 'Automatic-removal amended (§ 23A-3-34, SL 2021 ch 106)',
        date: '2021',
        kind: 'effective',
        note: 'Amendment history for the § 23A-3-34 automatic-removal section (Diana, statute pass 2026-07-16).',
      },
    ],
    openQuestions: [
      {
        question:
          'check_deferred_sd status. The SIS cluster is verified (§§ 23A-27-13/-13.1/-13.3/-14, linked 7/16): a completed SIS is discharged and dismissed without adjudication and is NOT a conviction (§ 14). Still HELD: whether the record is SEALED traces to § 23A-27-17, not yet read — the copy says "not a conviction" (cited) + "sealing status: confirm" until Diana reads 17. Also unread: §§ 23A-27-14.1/14.2 (licensing, cited in copy) and the diversion sections §§ 23A-3-35 to -37. check_deferred_sd is a check-your-record hedge, not a computed-eligibility claim.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the circuit court filing fee, and whether any fee waiver applies. Wave 7 gives the DCI record check as $24 (Pierre, (605) 773-3331) but flags the circuit court filing fee as a per-clerk phone target and gives no waiver information. The fees and feeWaiver fields are null pending both.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'S.D. Codified Laws §§ 23A-3-26 to -37 (non-conviction expungement — framework)', url: null, retrievedOn: null },
      { id: 'S.D. Codified Laws § 23A-3-27 (who/when: (1) no-charge arrest 1 yr from arrest; (2) dismissal 1 yr from the formal dismissal on the record; (3) acquittal anytime; (4) earlier on a showing of compelling necessity)', url: 'https://sdlegislature.gov/Statutes/23A-3-27', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-3-30 (grant standard: discretionary; the PETITIONER bears the burden by clear and convincing evidence that the ends of justice AND the best interest of the public AND of the petitioner are served)', url: 'https://sdlegislature.gov/Statutes/23A-3-30', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-3-31 (effect: SEALING, not destruction — a nonpublic DCI record is retained for law enforcement, prosecutors, and courts, usable for a later sentencing enhancement)', url: 'https://sdlegislature.gov/Statutes/23A-3-31', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-3-32 (restores the person to pre-arrest status in contemplation of law, with perjury protection for denying the arrest/indictment/trial — speaks to the ARREST and proceedings; pair with -31\'s retained nonpublic record)', url: 'https://sdlegislature.gov/Statutes/23A-3-32', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-3-33 (no statute of limitations on applying; pre-July-2010 arrests qualify)', url: 'https://sdlegislature.gov/Statutes/23A-3-33', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-3-34 (automatic removal from the PUBLIC record — highest-charged petty offense / municipal ordinance violation / Class 2 misdemeanor; 5-year wait after all court-ordered conditions satisfied and no further convictions in 5 yrs; record stays available to court personnel and usable as a later-prosecution enhancement)', url: 'https://sdlegislature.gov/Statutes/23A-3-34', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-27-13 (felony SIS: first-ever felony only; excludes death/life-imprisonment felonies; once per lifetime)', url: 'https://sdlegislature.gov/Statutes/23A-27-13', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-27-13.1 (a nonpublic DCI record exists during the SIS, retained until discharge)', url: 'https://sdlegislature.gov/Statutes/23A-27-13.1', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-27-13.3 (since 2025, excludes rape under SDCL 22-22-1(2)-(3) from felony SIS)', url: 'https://sdlegislature.gov/Statutes/23A-27-13.3', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-27-14 (completed SIS -> discharge and dismissal WITHOUT adjudication, not deemed a conviction; discharge is NOT automatic — the court services officer OR the defendant must raise it; once for the § 23A-27-12.2 track, counting out-of-state SIS)', url: 'https://sdlegislature.gov/Statutes/23A-27-14', retrievedOn: '2026-07-16' },
      { id: 'S.D. Codified Laws § 23A-27-17 (record sealing on SIS discharge — referenced by §§ 14.1/14.2; NOT yet read: the SIS "sealed" claim is HELD pending this section)', url: null, retrievedOn: null },
      { id: 'S.D. Codified Laws §§ 23A-27-14.1, 14.2 (teacher/education and gaming/racing licensing may still see and act on an SIS record; cited in copy, link pending)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'conv_type_sd' },
            { label: 'Dismissed / Arrested but never charged', value: 'dismissed', next: 'dismissal_date_sd' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_acquittal_sd' },
            { label: 'Suspended imposition or diversion completed', value: 'deferred', next: 'check_deferred_sd' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        dismissal_date_sd: {
          type: 'date',
          field: 'disposition_date',
          text: 'When was the case dismissed (or the arrest made, if no charge was ever filed)?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: '1 year from the formal dismissal on the record (§ 23A-3-27(2)); for a no-charge arrest, 1 year from the arrest (§ 23A-3-27(1)); earlier on a showing of compelling necessity (§ 23A-3-27(4))' },
            nextPass: 'eligible_dismissal_sd',
            nextFail: 'waiting_sd'
          }
        },
        conv_type_sd: {
          type: 'choice',
          text: 'What kind of conviction is it?',
          options: [
            { label: 'A case where a petty offense, municipal ordinance violation, or Class 2 misdemeanor was the HIGHEST offense charged (whether or not it ended in a conviction)', value: 'auto', next: 'check_autoremoval_sd' },
            { label: 'A DUI or other motor-vehicle conviction', value: 'dui', next: 'ineligible_dui_sd' },
            { label: 'Any other conviction (Class 1 misdemeanor or higher)', value: 'other', next: 'ineligible_conviction_sd' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_convtype_sd' }
          ]
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'South Dakota expunges non-convictions but almost no convictions, so the outcome decides nearly everything. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. A DCI record check ($24, Pierre, (605) 773-3331) or your court paperwork will show the disposition; the ujs.sd.gov expungement self-help (Guide & File) can help you read it.',
          remedy: 'Get Your Record First (DCI / court paperwork)',
          citation: 'S.D. Codified Laws §§ 23A-3-26 to -37 (the route depends on the disposition)'
        },
        eligible_dismissal_sd: {
          status: 'eligible',
          title: 'No Conviction, 1+ Year — Expungeable',
          message: 'Because your case ended without a conviction, you can petition to expunge it — a dismissal 1 year from the formal dismissal on the record, or a no-charge arrest 1 year from the arrest. Be clear-eyed about the standard: this is not automatic. It is discretionary, and YOU carry the burden — by clear and convincing evidence — of showing the court that expungement serves the ends of justice and the best interest of both the public and you (§ 23A-3-30). If granted, "expungement" here means SEALING, not destruction: a nonpublic record is kept at the DCI for law enforcement, prosecutors, and the courts, and it can be used to enhance a sentence in a later case (§ 23A-3-31). Within those limits it is real relief — the law restores you to your pre-arrest status and lets you lawfully deny the arrest, with perjury protection (§ 23A-3-32), though that protection speaks to the arrest and proceedings, not to that retained law-enforcement record. Two reassurances: there is NO deadline to apply, and even pre-July-2010 arrests qualify (§ 23A-3-33). The ujs.sd.gov Guide & File interview walks you through forms UJS-391/-394.',
          remedy: 'Non-conviction expungement petition (§ 23A-3-27)',
          citation: 'S.D. Codified Laws § 23A-3-27'
        },
        waiting_sd: {
          status: 'waiting',
          title: 'Not Yet One Year',
          message: 'For a dismissal, South Dakota measures the 1-year wait from the formal dismissal on the record; for a no-charge arrest, from the arrest date (§ 23A-3-27). Based on your date, the year has not passed yet. One early door worth knowing: earlier filing is possible if you can show COMPELLING NECESSITY (§ 23A-3-27(4)). When the year runs (or if you can show that necessity), the ujs.sd.gov Guide & File self-help will walk you through it.',
          remedy: 'Wait until 1 year (or show compelling necessity) — § 23A-3-27',
          citation: 'S.D. Codified Laws § 23A-3-27'
        },
        eligible_acquittal_sd: {
          status: 'eligible',
          title: 'Acquitted — Expungeable Anytime',
          message: 'Because you were acquitted (found not guilty), South Dakota lets you petition to expunge the record ANYTIME, with no waiting period (§ 23A-3-27(3)). One honest note on the standard: it is discretionary and YOU carry the burden — by clear and convincing evidence — of showing that expungement serves the ends of justice and the best interest of the public and you (§ 23A-3-30); it is not automatic. If granted, expungement means SEALING: a nonpublic DCI record is retained for law enforcement, prosecutors, and courts and can enhance a later sentence (§ 23A-3-31), though the law otherwise restores you to pre-arrest status and lets you deny the arrest with perjury protection (§ 23A-3-32). There is no deadline to apply, and pre-July-2010 arrests qualify (§ 23A-3-33). The ujs.sd.gov Guide & File interview walks you through the forms; a DCI record check ($24) helps confirm what is on file.',
          remedy: 'Non-conviction expungement after acquittal (§ 23A-3-27) — no wait',
          citation: 'S.D. Codified Laws § 23A-3-27'
        },
        check_deferred_sd: {
          status: 'eligible',
          title: 'Suspended Imposition — Not a Conviction; Confirm Your Discharge',
          message: 'Here is what is confirmed and what to check. If you successfully completed a suspended imposition of sentence (SIS), you are discharged and the case is dismissed WITHOUT a judgment of guilt — so it is NOT a conviction (§ 23A-27-14). Whether the record is also SEALED is something we are still confirming (that turns on § 23A-27-17, which we have not yet read), so treat sealing as "confirm," not "done." An important practical point: the discharge is NOT automatic — your court services officer OR YOU must bring the completed probation to the court\'s attention (§ 23A-27-14). So if your probation ended and no discharge and dismissal was entered, raise it with the court; that is the difference between "should be cleared" and "is cleared." Two honesty notes: during the SIS a nonpublic DCI record exists and is retained until discharge (§ 23A-27-13.1), and teacher/education and gaming/racing licensing boards can still see and act on an SIS record (§§ 23A-27-14.1, 14.2). A few eligibility facts, if it helps: a felony SIS must be your first-ever felony and excludes death- or life-imprisonment felonies (§ 23A-27-13) and, since 2025, rape under SDCL 22-22-1(2)-(3) (§ 23A-27-13.3); and it is available once per lifetime for a felony SIS, and once for the § 23A-27-12.2 track (§ 23A-27-14) — counting SIS granted in other states too. The honest first step is to CHECK: pull a DCI record ($24) or look at your court record to confirm the discharge and dismissal were entered, and confirm the sealing status. (A completed diversion may likewise clear, though those sections are still being confirmed.)',
          remedy: 'Confirm your SIS discharge/dismissal was entered (§ 23A-27-14) — sealing status pending (§ 23A-27-17)',
          citation: 'S.D. Codified Laws §§ 23A-27-13, 23A-27-13.1, 23A-27-13.3, 23A-27-14 (sealing per § 23A-27-17, not yet read)'
        },
        check_autoremoval_sd: {
          status: 'eligible',
          title: 'Minor Conviction — May Be Auto-Removed, Check',
          message: 'Because a petty offense, municipal ordinance violation, or Class 2 misdemeanor was the HIGHEST offense charged in your case, South Dakota removes that charge or conviction from the PUBLIC record AUTOMATICALLY (§ 23A-3-34) — the state\'s quiet automation. It comes off 5 years after all court-ordered conditions on the case are satisfied, as long as you have no further convictions during those 5 years. Because it is automatic, the honest first step is to CHECK whether it has already come off rather than assume you must file — a DCI record check ($24) or the ujs.sd.gov self-help will show your current status. One caveat to be clear about: this removes the case from PUBLIC view only. It stays available to court personnel, and it can still be used as an enhancement if you are prosecuted for something later.',
          remedy: 'Check your record — a highest-minor-charge case auto-removes from public view 5 years after conditions are met (§ 23A-3-34)',
          citation: 'S.D. Codified Laws § 23A-3-34'
        },
        ineligible_dui_sd: {
          status: 'ineligible',
          title: 'DUI Conviction — No Clearing Path in South Dakota',
          message: 'South Dakota has no clause that names DUI as excluded; the answer follows from how the two clearing paths are scoped. A DUI conviction is a Class 1 misdemeanor, which sits ABOVE the automatic-removal ceiling — that program reaches only Class 2 misdemeanors and below (§ 23A-3-34). And petition expungement reaches only cases that did NOT end in a conviction — a no-charge arrest, a dismissal, or an acquittal (§ 23A-3-27). A DUI conviction falls outside both, so there is no expungement route for it. A pardon from the Governor remains a path (a pardoned conviction is then sealed), with an exceptional-pardon path 5 years out. The ujs.sd.gov self-help and the Board of Pardons and Paroles are where to look next.',
          remedy: 'None (a DUI conviction is outside both § 23A-3-34 and § 23A-3-27) — a pardon is the route',
          citation: 'S.D. Codified Laws §§ 23A-3-34, 23A-3-27'
        },
        ineligible_conviction_sd: {
          status: 'ineligible',
          title: 'This Conviction Has No General Expungement Path',
          message: 'South Dakota has no general expungement for convictions above the minor level (petty offenses, municipal violations, and Class 2 misdemeanors auto-remove; a Class 1 misdemeanor or any felony does not). So for this conviction, the honest answer is that there is no expungement route. A pardon from the Governor remains available (a pardoned conviction is then sealed), with an exceptional-pardon path 5 years out. The ujs.sd.gov self-help can point you toward the pardon process.',
          remedy: 'None (no general conviction expungement) — a pardon is the route',
          citation: 'S.D. Codified Laws §§ 23A-3-26 to -37'
        },
        complex_convtype_sd: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'South Dakota\'s conviction rules turn on the exact level — petty offenses, municipal violations, and Class 2 misdemeanors auto-remove, but a Class 1 misdemeanor or a felony has no general path, and DUI is excluded. Since you are not sure which yours is, we are not going to guess. A DCI record check ($24) or your court paperwork will show it. The ujs.sd.gov self-help can help you read it.',
          remedy: 'Get the Conviction Level First (DCI / court paperwork)',
          citation: 'S.D. Codified Laws § 23A-3-34'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (S.D. Codified Laws §§ 23A-3-26 to -37)',
          formName: 'UJS-391 / UJS-394 (Guide & File online interview)',
          formUrl: 'https://ujs.sd.gov/Forms/',
          steps: [
            'For a non-conviction, petition after 1 year (dismissal/no-charge arrest) or anytime (acquittal); use the ujs.sd.gov Guide & File interview.',
            'For a case whose highest charge was a petty offense, municipal violation, or Class 2 misdemeanor, check whether it has already auto-removed from the PUBLIC record — 5 years after conditions are met, no further convictions — under § 23A-3-34.',
            'For a suspended imposition or completed diversion, check your record — it should already be sealed/expunged.',
            'Get a DCI record check ($24, Pierre, (605) 773-3331) to confirm your status. DUI/motor-vehicle convictions are excluded; a pardon is the route there.'
          ],
          // null: Wave 7 gives the $24 DCI record fee (in steps) but flags the circuit
          // court filing fee as a per-clerk unknown and gives no waiver information.
          fees: null,
          feeWaiver: null,
          courtContact: 'The circuit court where the case was handled (DCI in Pierre for records, (605) 773-3331)'
        }
      },
      legalAid: [
        { name: 'South Dakota Unified Judicial System — Expungement Self-Help', url: 'https://ujs.sd.gov' },
        { name: 'East River Legal Services', url: 'https://www.erlservices.org' }
      ]
    }
  },
  ND: {
    code: 'ND',
    name: 'North Dakota',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'North Dakota is quietly one of the friendlier small states. It SEALS convictions (ch. 12-60.1, 2019): '
      + 'misdemeanors 3 years, felonies 5 years, conviction-free from completing incarceration, probation, or '
      + 'parole — and there is NO FILING FEE, because the statute forbids charging one. DUI is sealable here, '
      + 'which is rare. A 2025 law (HB 1166) added automatic closure of non-conviction court records 61 days '
      + 'after the order, for non-convictions entered on or after August 1, 2025; older non-convictions are '
      + 'petitioned with a mandatory 10-day grant if the requirements are met. Deferred impositions are '
      + 'auto-sealed 61 days after probation ends.',
    keyDates: [
      {
        label: 'Sealing law enacted (N.D. Cent. Code ch. 12-60.1)',
        date: '2019',
        kind: 'effective',
        note: 'Wave 7 gives the year. Misdemeanors 3 years / felonies 5 years, conviction-free from completion; no filing fee (the statute forbids charging one).',
      },
      {
        label: 'Non-conviction court records auto-close (HB 1166)',
        date: '2025-08-01',
        kind: 'operative',
        note: 'Non-conviction court records auto-close 61 days after a non-conviction order entered on or after this date; older non-convictions are petitioned with a mandatory 10-day grant if requirements are met (§ 12-60.1-05).',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm HB 1166 (2025) operative details. Wave 7 says non-conviction court records auto-close 61 days after a non-conviction order entered on or after August 1, 2025, and that older non-convictions are petitioned with a mandatory 10-day grant. The tree routes post-Aug-2025 non-convictions to an auto-close "wait, do not file" result and older ones to a petition result; confirm the mechanics against ndcourts.gov.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the no-fee statutory line (ch. 12-60.1 forbids charging a filing fee) and the 61-day auto-seal of completed deferred impositions (§ 12.1-32-07.1). Wave 7 says the ndlegis.gov PDF confirms the no-fee line; confirm both against current text.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: 'N.D. Cent. Code ch. 12-60.1 (sealing of convictions; 3/5-year waits; no filing fee)', url: null, retrievedOn: null },
      { id: 'N.D. Cent. Code § 12.1-32-07.1 (deferred imposition; 61-day auto-seal)', url: null, retrievedOn: null },
      { id: 'HB 1166 (2025) (non-conviction court-record auto-close; mandatory 10-day grant for older non-convictions)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'excluded_nd' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_cutoff_nd' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_cutoff_nd' },
            { label: 'Deferred imposition completed', value: 'deferred', next: 'check_deferred_nd' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        nonconv_cutoff_nd: {
          type: 'boolean',
          text: 'Did the case end (the non-conviction order) on or after August 1, 2025?',
          yes: 'check_autoclose_nd',
          no: 'petition_nonconv_nd'
        },
        excluded_nd: {
          type: 'boolean',
          text: 'Are you a registrable sex offender or offender against children, or was this a violent or intimidation felony still within its 10-year firearm-prohibition window?',
          yes: 'ineligible_excluded_nd',
          no: 'level_nd'
        },
        level_nd: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_date_nd' },
            { label: 'Felony', value: 'felony', next: 'felony_date_nd' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_nd' }
          ]
        },
        misd_date_nd: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete incarceration, probation, or parole for this case?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'conviction-free from completion of incarceration/probation/parole (N.D. Cent. Code ch. 12-60.1 — misdemeanor)' },
            nextPass: 'eligible_nd',
            nextFail: 'waiting_nd'
          }
        },
        felony_date_nd: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete incarceration, probation, or parole for this case?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'conviction-free from completion of incarceration/probation/parole (N.D. Cent. Code ch. 12-60.1 — felony)' },
            nextPass: 'eligible_nd',
            nextFail: 'waiting_nd'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'North Dakota seals convictions and (since 2025) auto-closes many non-conviction records, so the outcome decides the route. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a BCI record check will show the disposition; the ndcourts.gov sealing instructions can help you read it.',
          remedy: 'Get Your Record First (court paperwork / BCI)',
          citation: 'N.D. Cent. Code ch. 12-60.1 (the route depends on the disposition)'
        },
        check_autoclose_nd: {
          status: 'eligible',
          title: 'Non-Conviction Since Aug 2025 — Auto-Closes, Do Not File',
          message: 'Good news, and it means you should NOT file. Because your non-conviction order was entered on or after August 1, 2025, North Dakota\'s new law (HB 1166) closes the court record AUTOMATICALLY — 61 days after the order. So you do not need to petition; you just wait for the 61 days to run, then confirm it closed. If it is still showing well after that, the ndcourts.gov instructions or a clerk can help you follow up. Filing a petition you do not need would only cost you effort.',
          remedy: 'Wait — the record auto-closes 61 days after the order (HB 1166)',
          citation: 'HB 1166 (2025)'
        },
        petition_nonconv_nd: {
          status: 'eligible',
          title: 'Older Non-Conviction — Petition, Mandatory 10-Day Grant',
          message: 'Because your non-conviction ended before the August 1, 2025 auto-close date, you petition to seal it — but with a nice feature: if you meet the requirements, the grant is MANDATORY within 10 days (§ 12-60.1-05). And filing is FREE — North Dakota law forbids charging a fee. You name the arresting agency and prosecutor as respondents. The ndcourts.gov sealing instructions walk you through it.',
          remedy: 'Non-conviction sealing petition — mandatory 10-day grant, free (§ 12-60.1-05)',
          citation: 'N.D. Cent. Code § 12-60.1-05'
        },
        check_deferred_nd: {
          status: 'eligible',
          title: 'Deferred Imposition Completed — Auto-Sealed, Check',
          message: 'Because you completed a deferred imposition of sentence, it results in a set-aside and dismissal, and the record is auto-sealed 61 days after probation ends (for misdemeanors and infractions, by court rule). So the honest first step is to CHECK — confirm it sealed rather than assume you must file. If it did not, the ndcourts.gov instructions or a clerk can help you follow up. Filing is free either way.',
          remedy: 'Check your record — a completed deferred imposition auto-seals (§ 12.1-32-07.1)',
          citation: 'N.D. Cent. Code § 12.1-32-07.1'
        },
        eligible_nd: {
          status: 'eligible',
          title: 'Waiting Period Met — Sealable, Free',
          message: 'Based on your dates, the waiting period has passed — 3 years for a misdemeanor, 5 for a felony, conviction-free from completing incarceration, probation, or parole. You petition to seal, naming the arresting agency and prosecutor as respondents; it is discretionary (the court balances risk, rehabilitation, and any victim input). And here is North Dakota\'s standout feature: there is NO FILING FEE — the statute forbids charging one. DUI is sealable here, which is unusual. The ndcourts.gov sealing instructions can help.',
          remedy: 'Sealing petition (ch. 12-60.1) — no filing fee',
          citation: 'N.D. Cent. Code ch. 12-60.1'
        },
        waiting_nd: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'North Dakota\'s sealing waiting periods run conviction-free from when you complete incarceration, probation, or parole: 3 years for a misdemeanor, 5 for a felony. Based on your dates, yours has not passed yet. When it does, the good news is that filing is free (the statute forbids a fee), and DUI is sealable here. The ndcourts.gov sealing instructions can help you plan. (A denial carries a 3-year re-petition bar, so it is worth waiting until you clearly qualify.)',
          remedy: 'Wait for the period, then seal for free (ch. 12-60.1)',
          citation: 'N.D. Cent. Code ch. 12-60.1'
        },
        ineligible_excluded_nd: {
          status: 'ineligible',
          title: 'This Offense Is Not Yet Sealable',
          message: 'North Dakota does not seal for registrable sex offenders or offenders against children, and a violent or intimidation felony cannot be sealed until it clears its 10-year firearm-prohibition window. If a registration requirement or that firearm window is the barrier, this may become a "not yet" once it ends; for a permanently ineligible offense, a pardon is the remaining route. The ndcourts.gov instructions and North Dakota Legal Self Help Center can help you check.',
          remedy: 'None for now (registration / firearm window) — reassess when it ends, or a pardon',
          citation: 'N.D. Cent. Code ch. 12-60.1'
        },
        complex_level_nd: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'North Dakota\'s waiting period is 3 years for a misdemeanor and 5 for a felony, so the level matters. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a BCI record check will show it. The ndcourts.gov instructions can help you read it — and remember, sealing here is free.',
          remedy: 'Get the Conviction Level First (court paperwork / BCI)',
          citation: 'N.D. Cent. Code ch. 12-60.1'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Sealing (N.D. Cent. Code ch. 12-60.1)',
          formName: 'North Dakota Courts sealing petition',
          formUrl: 'https://www.ndcourts.gov/legal-self-help',
          steps: [
            'For a non-conviction entered on or after August 1, 2025, do not file — it auto-closes 61 days after the order (HB 1166).',
            'For an older non-conviction, petition — the grant is mandatory within 10 days if you meet the requirements.',
            'For a conviction, wait 3 years (misdemeanor) or 5 years (felony) conviction-free from completing incarceration/probation/parole, then petition, naming the arresting agency and prosecutor.',
            'There is no filing fee — the statute forbids one. The ndcourts.gov self-help has the petition instructions.'
          ],
          // NOT null: Wave 7 states the statute forbids charging a filing fee.
          fees: 'No filing fee — North Dakota law (ch. 12-60.1) forbids charging one to petition for sealing.',
          feeWaiver: 'Not needed — the statute prohibits any filing fee.',
          courtContact: 'The court where the case was handled'
        }
      },
      legalAid: [
        { name: 'North Dakota Legal Self Help Center', url: 'https://www.ndcourts.gov/legal-self-help' },
        { name: 'Legal Services of North Dakota', url: 'https://www.legalassist.org' }
      ]
    }
  },
  AK: {
    code: 'AK',
    name: 'Alaska',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Alaska requires the most honest answer of any state: there is NO expungement law. Sealing (§ 12.62.180) '
      + 'exists only for records proven to result from mistaken identity or a false accusation. For a valid '
      + 'conviction, Alaska law makes essentially no provision to seal or expunge it. What Alaska CAN offer is '
      + 'narrower and worth knowing precisely: if your ENTIRE case ended in dismissal or acquittal, you can '
      + 'remove it from the public online court index (CourtView); a suspended imposition of sentence can be '
      + 'set aside on completion, though the public record still shows the conviction and the set-aside; and a '
      + 'newer tool avoids a conviction entering at all. Pardons are effectively unavailable — about 188 in '
      + 'the state\'s history, and none since 2006.',
    keyDates: [
      {
        label: 'Marijuana decriminalized-possession non-publication (2024)',
        date: '2024',
        kind: 'effective',
        note: 'Wave 7 gives the year. Decriminalized marijuana-possession convictions are barred from release/publication; scope and mechanics flagged for verification.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the 2024 marijuana provision\'s scope and mechanics. Wave 7 says decriminalized marijuana-possession convictions are barred from release/publication but flags scope/mechanics for verification. The tree routes an old marijuana-possession conviction to a "non-publication may apply" result; confirm what it covers and how it works.',
        blocksFields: [],
      },
      {
        question:
          'Confirm any fees for the CourtView removal (Form TF-810 / Admin Rule 40) and the § 12.62.180 sealing request, and whether waivers apply. Wave 7 gives the forms/processes but no fee information; the fees and feeWaiver fields are null pending confirmation with courts.alaska.gov and the DPS record-sealing process.',
        blocksFields: ['resources.remedies.expungement.fees', 'resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Alaska Stat. § 12.62.180 (sealing — mistaken identity / false accusation only)', url: null, retrievedOn: null },
      { id: 'Alaska Stat. § 12.55.085 (suspended imposition of sentence — set-aside)', url: null, retrievedOn: null },
      { id: 'Alaska Stat. § 12.55.078 (suspended entry of judgment)', url: null, retrievedOn: null },
      { id: 'Alaska R. Admin. P. 40 / Alaska Stat. § 22.35.030 (CourtView removal; Form TF-810)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'conv_marijuana_ak' },
            { label: 'Dismissed', value: 'dismissed', next: 'mistaken_ak' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'mistaken_ak' },
            { label: 'Suspended imposition / suspended entry of judgment completed', value: 'deferred', next: 'sis_setaside_ak' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        mistaken_ak: {
          type: 'boolean',
          text: 'Was the arrest or charge the result of mistaken identity or a false accusation — something you could prove to the state?',
          yes: 'eligible_sealing_ak',
          no: 'courtview_ak'
        },
        courtview_ak: {
          type: 'boolean',
          text: 'Did the ENTIRE case end without any conviction (every charge in it dismissed or acquitted)?',
          yes: 'eligible_courtview_ak',
          no: 'complex_partial_ak'
        },
        conv_marijuana_ak: {
          type: 'boolean',
          text: 'Was this a marijuana-possession conviction that has since been decriminalized?',
          yes: 'marijuana_ak',
          no: 'conv_sis_ak'
        },
        conv_sis_ak: {
          type: 'boolean',
          text: 'Was this a suspended imposition of sentence (SIS) that you completed, or a suspended entry of judgment?',
          yes: 'sis_setaside_ak',
          no: 'ineligible_conviction_ak'
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Alaska\'s options are narrow and depend entirely on the outcome — a fully dismissed case can come off the online index, but a conviction almost never can. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork (CourtView) or a DPS record will show the disposition; the Alaska Court System self-help and Alaska Legal Services can help you read it.',
          remedy: 'Get Your Record First (CourtView / DPS)',
          citation: 'Alaska Stat. §§ 12.62.180, 22.35.030 (the route depends on the disposition)'
        },
        eligible_sealing_ak: {
          status: 'eligible',
          title: 'Mistaken Identity / False Accusation — Sealing Available',
          message: 'This is the one situation Alaska allows sealing: if the record resulted from mistaken identity or a false accusation, you can apply to have it sealed (§ 12.62.180). The catch is the standard — you have to prove it to the agency, essentially beyond a reasonable doubt — so documentation matters. The Department of Public Safety has a record-sealing request process. Alaska Legal Services can help you put the strongest showing together.',
          remedy: 'Sealing for mistaken identity / false accusation (§ 12.62.180)',
          citation: 'Alaska Stat. § 12.62.180'
        },
        eligible_courtview_ak: {
          status: 'eligible',
          title: 'Entire Case Dismissed/Acquitted — Remove It From CourtView',
          message: 'Because your ENTIRE case ended without a conviction, you can have it removed from the public online court index (CourtView) 60 days after disposition, using Form TF-810 (Admin Rule 40). This is the one clean win Alaska offers — the case stops showing up in the online search. Note it removes the online listing; it is not a full sealing of every record. The Alaska Court System self-help pages have the form and instructions.',
          remedy: 'CourtView removal (Form TF-810 / Admin Rule 40) — 60 days after disposition',
          citation: 'Alaska Stat. § 22.35.030'
        },
        complex_partial_ak: {
          status: 'complex',
          title: 'A Partial Win Does Not Qualify — Let\'s Confirm',
          message: 'Here is an Alaska limitation worth being precise about: CourtView removal only works if the ENTIRE case ended without a conviction. If your case had any conviction in it, a dismissed or acquitted charge WITHIN that case stays visible online — a partial win does not qualify. Because the details of what was and was not convicted matter here, it is worth confirming exactly how your case is recorded before assuming anything. The Alaska Court System self-help and Alaska Legal Services can check it against the Rule 40 requirements.',
          remedy: 'Confirm the full case disposition (a partial dismissal does not qualify for removal)',
          citation: 'Alaska Stat. § 22.35.030'
        },
        marijuana_ak: {
          status: 'eligible',
          title: 'Old Marijuana Possession — Non-Publication May Apply',
          message: 'Because this was a marijuana-possession conviction that has since been decriminalized, Alaska\'s 2024 law bars it from being released or published — a meaningful protection in a state that otherwise does not clear convictions. Because the law is new, the exact scope and how you invoke it are things worth confirming rather than assuming. Alaska Legal Services can help you check whether and how it applies to your specific conviction.',
          remedy: 'Marijuana non-publication (2024 law) — confirm scope/mechanics',
          citation: 'Alaska Stat. § 12.62.180'
        },
        sis_setaside_ak: {
          status: 'eligible',
          title: 'Set Aside — But Know It Stays Visible',
          message: 'Because you completed a suspended imposition of sentence (SIS), the conviction can be set aside as a matter of right, absent good cause (§ 12.55.085) — and a suspended entry of judgment means no conviction entered in the first place. Worth doing, but here is the honest caveat for SIS: per the Alaska courts (Journey v. State), the public record REMAINS and shows both the conviction and the set-aside. So it clears the legal effect, not the visibility. (SIS excludes DUI/refusal, sex offenses, felony crimes against a person, firearm use, and prior DV.) Alaska Legal Services can confirm which applies to you.',
          remedy: 'SIS set-aside (§ 12.55.085) — nullifies the conviction, but it stays visible',
          citation: 'Alaska Stat. § 12.55.085'
        },
        ineligible_conviction_ak: {
          status: 'ineligible',
          title: 'No Path to Clear This Conviction',
          message: 'This is the hardest honest answer in the country, and you deserve it straight: Alaska has no expungement law, and for an ordinary valid conviction there is essentially no way to seal or remove it. A pardon is technically the only route, but it is effectively unavailable — there have been about 188 pardons in Alaska\'s entire history, and none since 2006. So we are not going to point you toward a door that does not really open. What CAN sometimes help: if any charge in your history ended without a conviction, that piece may be removable; and if a record ever resulted from mistaken identity, that can be sealed. Alaska Legal Services can review your full record for anything that qualifies.',
          remedy: 'None realistically (no expungement; pardons effectively unavailable) — check non-convictions',
          citation: 'Alaska Stat. § 12.62.180'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Record relief in Alaska (CourtView removal; SIS set-aside; § 12.62.180 sealing)',
          formName: 'CourtView removal request (Form TF-810)',
          formUrl: 'https://courts.alaska.gov/shc/records/records-removal.htm',
          steps: [
            'If your ENTIRE case ended without a conviction, file Form TF-810 (Admin Rule 40) to remove it from the online CourtView index 60 days after disposition.',
            'If a record resulted from mistaken identity or a false accusation, apply for sealing under § 12.62.180 (a high proof standard).',
            'If you completed a suspended imposition of sentence, seek a set-aside (§ 12.55.085) — but know the public record still shows the conviction and set-aside.',
            'For an ordinary conviction, be aware there is no expungement and pardons are effectively unavailable. Alaska Legal Services can review your record for anything that qualifies.'
          ],
          // null: Wave 7 gives no fee information for the TF-810 removal or § 12.62.180
          // sealing — the fee and any waiver are unknown.
          fees: null,
          feeWaiver: null,
          courtContact: 'The Alaska Court System (CourtView removal) and Department of Public Safety (sealing)'
        }
      },
      legalAid: [
        { name: 'Alaska Legal Services Corporation', url: 'https://www.alsc-law.org' },
        { name: 'Alaska Court System — Self-Help / Records Removal', url: 'https://courts.alaska.gov/shc/' }
      ]
    }
  },
  VT: {
    code: 'VT',
    name: 'Vermont',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Vermont rewrote its entire record-clearing system with Act 60 (2025), effective July 1, 2025 — so any '
      + 'guide older than that is wrong. Under the new architecture (13 V.S.A. ch. 230), EXPUNGEMENT (record '
      + 'destroyed, "no criminal record exists") is now reserved for conduct that is no longer a crime. '
      + 'SEALING is the primary remedy: most qualifying misdemeanors after 3 years, most qualifying '
      + 'non-violent felonies after 7 years, and a misdemeanor DUI after 10 years. Two features are unusually '
      + 'favorable: the court "shall grant" without a hearing unless the state objects and shows sealing is '
      + 'against the interests of justice (the burden is on the STATE), and people who were 18-21 at the time '
      + 'of the offense can petition after just 30 days.',
    keyDates: [
      {
        label: 'Act 60 restructures record-clearing (13 V.S.A. ch. 230)',
        date: '2025-07-01',
        kind: 'effective',
        note: 'Total rewrite. Sealing is now primary: misdemeanors 3 yrs (down from 5), non-violent felonies 7 yrs, misdemeanor DUI 10 yrs; the burden to oppose sits on the state; the old no-new-convictions-during-the-wait rule was removed; ages 18-21 petition after 30 days. Any pre-July-2025 source is wrong.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the post-Act-60 statute against the current text. Wave 7 stresses that Act 60 (eff. July 1, 2025) rewrote everything and nearly every online guide predates it. Confirm the 3/7/10-year waits, the burden-flip (state must show sealing is contrary to the interests of justice), the removal of the no-new-convictions-during-the-wait rule, and the 18-21 30-day petition, against legislature.vermont.gov and vtcourts.gov/criminal/expungement.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the qualifying-crimes list in 13 V.S.A. § 7601(4). Wave 7 says qualifying felonies include non-violent offenses such as burglary of unoccupied dwellings, listed property crimes, drug offenses (including trafficking), and pardoned convictions, while listed violent crimes and sexual misconduct are excluded. The tree asks these; confirm the exact list.',
        blocksFields: [],
      },
    ],
    sources: [
      { id: '13 V.S.A. §§ 7601, 7602 (expungement/sealing; Act 60 of 2025 architecture)', url: null, retrievedOn: null },
      { id: '13 V.S.A. § 7603 (non-conviction sealing)', url: null, retrievedOn: null },
      { id: 'Act 60 (2025) (restructure of record-clearing, eff. Jul 1, 2025)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'nolonger_crime_vt' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_vt' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_vt' },
            { label: 'Diversion / deferred completed', value: 'deferred', next: 'nonconv_vt' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        nolonger_crime_vt: {
          type: 'boolean',
          text: 'Is the conduct you were convicted of no longer a crime in Vermont (for example, since decriminalized)?',
          yes: 'eligible_expunge_vt',
          no: 'age_vt'
        },
        age_vt: {
          type: 'boolean',
          text: 'Were you between 18 and 21 years old at the time of the offense?',
          yes: 'age_date_vt',
          no: 'level_vt'
        },
        age_date_vt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 30, unit: 'days', anchor: 'from sentence completion for an offense committed at age 18-21 (13 V.S.A. ch. 230 — 30-day petition)' },
            nextPass: 'eligible_seal_vt',
            nextFail: 'waiting_vt'
          }
        },
        level_vt: {
          type: 'choice',
          text: 'How would you describe the conviction?',
          options: [
            { label: 'A qualifying misdemeanor (most, except listed violent crimes and sexual misconduct)', value: 'misd', next: 'misd_dui_vt' },
            { label: 'A qualifying non-violent felony (incl. burglary of an unoccupied dwelling, listed property crimes, or drug offenses including trafficking)', value: 'felony', next: 'felony_date_vt' },
            { label: 'A listed violent crime or a sexual-misconduct offense', value: 'excluded', next: 'ineligible_excluded_vt' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_vt' }
          ]
        },
        misd_dui_vt: {
          type: 'boolean',
          text: 'Was this a misdemeanor DUI?',
          yes: 'dui_date_vt',
          no: 'misd_date_vt'
        },
        misd_date_vt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 3, unit: 'years', anchor: 'from sentence completion (13 V.S.A. ch. 230 — qualifying misdemeanor; down from 5 under Act 60)' },
            nextPass: 'eligible_seal_vt',
            nextFail: 'waiting_vt'
          }
        },
        felony_date_vt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 7, unit: 'years', anchor: 'from sentence completion (13 V.S.A. ch. 230 — qualifying non-violent felony)' },
            nextPass: 'eligible_seal_vt',
            nextFail: 'waiting_vt'
          }
        },
        dui_date_vt: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'from sentence completion (13 V.S.A. ch. 230 — misdemeanor DUI, excluding injury/death, school-bus, CDL)' },
            nextPass: 'eligible_seal_vt',
            nextFail: 'waiting_vt'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Vermont\'s Act 60 (2025) rewrite handles convictions and non-convictions differently, and even the conviction rules depend on the offense. Because the outcome is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a VCIC record check will show the disposition; Vermont Legal Aid (1-800-917-7787, vtlawhelp.org/expungement) runs free clinics and can help you read it.',
          remedy: 'Get Your Record First (court paperwork / VCIC)',
          citation: '13 V.S.A. ch. 230 (the route depends on the disposition)'
        },
        nonconv_vt: {
          status: 'eligible',
          title: 'No Conviction — Sealable',
          message: 'Because your case ended without a conviction, Vermont lets you seal it under 13 V.S.A. § 7603. Under the Act 60 framework the court "shall grant" absent a government objection showing it is against the interests of justice — a favorable posture. Vermont Legal Aid (1-800-917-7787) runs free clinics and can help you file. The fees are $90 per docket plus a $30 VCIC record check, with waivers available.',
          remedy: 'Non-conviction sealing (§ 7603)',
          citation: '13 V.S.A. § 7603'
        },
        eligible_expunge_vt: {
          status: 'eligible',
          title: 'Conduct No Longer a Crime — Immediate Expungement',
          message: 'Because you were convicted of conduct that is no longer a crime in Vermont, you qualify for full EXPUNGEMENT under Act 60 — immediate once your sentence and any restitution and surcharges are paid, with the record destroyed so that, in the law\'s words, "no criminal record exists." This is the strongest relief Vermont offers. Vermont Legal Aid (1-800-917-7787) runs free clinics and can help you file.',
          remedy: 'Expungement for conduct no longer criminal (13 V.S.A. ch. 230) — record destroyed',
          citation: '13 V.S.A. § 7601'
        },
        eligible_seal_vt: {
          status: 'eligible',
          title: 'Waiting Period Met — Sealable',
          message: 'Based on your dates, your Act 60 waiting period has passed — 3 years for a qualifying misdemeanor, 7 for a qualifying non-violent felony, 10 for a misdemeanor DUI, or just 30 days if you were 18-21 at the time of the offense. Two things work in your favor: the court "shall grant" without a hearing unless the state objects and shows sealing is against the interests of justice (the burden is on the state), and the old rule barring you for new convictions during the wait was removed in 2025. A pending charge would pause the petition. Fees are $90 per docket plus a $30 VCIC record check (waivers available). Vermont Legal Aid (1-800-917-7787) runs free clinics.',
          remedy: 'Sealing petition (13 V.S.A. ch. 230)',
          citation: '13 V.S.A. § 7602'
        },
        waiting_vt: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Vermont\'s Act 60 sealing waits run from sentence completion: 3 years for a qualifying misdemeanor, 7 for a qualifying non-violent felony, 10 for a misdemeanor DUI — or just 30 days if you were 18-21 at the time of the offense. Based on your dates, yours has not passed yet. When it does, the process is favorable: the state bears the burden to oppose. Vermont Legal Aid (1-800-917-7787) runs free clinics and can help you plan.',
          remedy: 'Wait for the Act 60 period (13 V.S.A. ch. 230)',
          citation: '13 V.S.A. § 7602'
        },
        ineligible_excluded_vt: {
          status: 'ineligible',
          title: 'A Listed Violent or Sexual-Misconduct Offense — Not Sealable',
          message: 'Even under Act 60\'s broadened rules, Vermont excludes listed violent crimes and sexual-misconduct offenses from sealing. No waiting period changes that. A pardon remains a route for an otherwise-excluded offense (and a pardoned conviction can then be sealed). Vermont Legal Aid (1-800-917-7787) can help you confirm whether yours is on the excluded list and explain the pardon process.',
          remedy: 'None (listed violent / sexual-misconduct offense) — a pardon is the remaining route',
          citation: '13 V.S.A. § 7601'
        },
        complex_level_vt: {
          status: 'complex',
          title: 'We Need the Offense Details',
          message: 'Under Act 60 the wait depends on whether your offense is a qualifying misdemeanor (3 years), a qualifying non-violent felony (7 years), or a misdemeanor DUI (10 years) — and some violent and sexual-misconduct offenses are excluded entirely. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a VCIC record check will show it. Vermont Legal Aid (1-800-917-7787) can help you read it.',
          remedy: 'Get the Offense Details First (court paperwork / VCIC)',
          citation: '13 V.S.A. § 7601'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement / Sealing (13 V.S.A. ch. 230; Act 60 of 2025)',
          formName: 'Vermont Judiciary expungement/sealing forms',
          formUrl: 'https://www.vermontjudiciary.org/criminal/expungement',
          steps: [
            'Note Act 60 (July 1, 2025) rewrote everything — use only current forms and statute, not older guides.',
            'If the conduct is no longer a crime, seek expungement (record destroyed) — immediate once your sentence and restitution/surcharges are paid.',
            'Otherwise seek sealing: 3 years (qualifying misdemeanor), 7 (qualifying non-violent felony), 10 (misdemeanor DUI), or 30 days if you were 18-21 at the offense.',
            'File with the $90-per-docket fee plus a $30 VCIC record check (waivers available). Vermont Legal Aid (1-800-917-7787) runs free clinics.'
          ],
          // NOT null: Wave 7 gives $90 per docket + $30 VCIC record check.
          fees: '$90 per docket plus a $30 VCIC record check.',
          feeWaiver: 'Fee waivers are available.',
          courtContact: 'The court where the case was decided'
        }
      },
      legalAid: [
        { name: 'Vermont Legal Aid — Expungement Clinics (1-800-917-7787)', url: 'https://vtlawhelp.org/expungement' },
        { name: 'Vermont Judiciary — Expungement', url: 'https://www.vermontjudiciary.org/criminal/expungement' }
      ]
    }
  },
  WY: {
    code: 'WY',
    name: 'Wyoming',
    lastReviewed: '2026-07-16',
    verificationStatus: 'draft',
    sourcePackage: 'research/waves/Turnleaf_Wave7_Draft_Package.md',
    terminology:
      'Wyoming expunges MISDEMEANORS (§ 7-13-1501) 5 years after sentence and FELONIES (§ 7-13-1502) 10 years '
      + 'after sentence, and both are ONCE PER LIFETIME under their sections — so bundle everything you can '
      + 'into the single petition. The fee is priced by tier: $100 for a misdemeanor, $300 for a felony. Two '
      + 'Wyoming-specific points matter: domestic-violence misdemeanors ARE expungeable, and expungement lifts '
      + 'the federal firearm bar (for felonies, § (m) restores the rights the conviction removed, including '
      + 'firearms). The felony path is narrow — only felonies from a SINGLE occurrence, with no other felony '
      + 'history. Non-convictions can be expunged 180 days after arrest or dismissal.',
    keyDates: [
      {
        label: 'Under-21 nicotine offenses auto-expunged',
        date: '2020',
        kind: 'effective',
        note: 'Wave 7 gives the year. Under-21 nicotine offenses are auto-expunged 6 months after the fine is paid.',
      },
    ],
    openQuestions: [
      {
        question:
          'Confirm the full felony exclusion list under § 7-13-1502. Wave 7 gives violent felonies (§ 6-1-104(a)(xii)), firearm felonies (except wildlife-code), sex crimes, child endangerment, felony DUI, and drug-distribution, and flags the full list for the statute. The tree asks these as exclusions; confirm the complete set.',
        blocksFields: [],
      },
      {
        question:
          'Confirm the non-conviction expungement fee (§ 7-13-1401). Wave 7 gives the 180-day non-conviction path but flags the fee for confirmation. The tree routes non-convictions to a 180-day result; confirm the fee with a circuit clerk (Laramie or Natrona).',
        blocksFields: [],
      },
      {
        question:
          'Confirm whether an indigency fee waiver applies to the $100 (misdemeanor) / $300 (felony) filing fees. Wave 7 gives the fee amounts but no waiver information; the feeWaiver field is null pending confirmation with a circuit clerk.',
        blocksFields: ['resources.remedies.expungement.feeWaiver'],
      },
    ],
    sources: [
      { id: 'Wyo. Stat. § 7-13-1501 (misdemeanor expungement; 5-yr / 1-yr status; once per lifetime; DV + firearm restoration)', url: null, retrievedOn: null },
      { id: 'Wyo. Stat. § 7-13-1502 (felony expungement; 10-yr; same-occurrence only; rights restoration incl. firearms)', url: null, retrievedOn: null },
      { id: 'Wyo. Stat. § 7-13-1401 (non-conviction expungement; 180 days)', url: null, retrievedOn: null },
    ],
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          field: 'disposition',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty)', value: 'convicted', next: 'level_wy' },
            { label: 'Dismissed', value: 'dismissed', next: 'nonconv_date_wy' },
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'nonconv_date_wy' },
            { label: 'First-offender deferral (§ 7-13-301) completed', value: 'deferred', next: 'eligible_deferral_wy' },
            { label: 'I don\'t know / Not sure', value: 'unknown', next: 'unknown_disposition' }
          ]
        },
        level_wy: {
          type: 'choice',
          text: 'What was the level of the conviction?',
          options: [
            { label: 'Misdemeanor', value: 'misd', next: 'misd_prioruse_wy' },
            { label: 'Felony', value: 'felony', next: 'felony_excluded_wy' },
            { label: 'I\'m not sure', value: 'unsure', next: 'complex_level_wy' }
          ]
        },
        misd_prioruse_wy: {
          type: 'boolean',
          text: 'Have you already used Wyoming\'s once-in-a-lifetime misdemeanor expungement?',
          yes: 'ineligible_prioruse_wy',
          no: 'misd_status_wy'
        },
        misd_status_wy: {
          type: 'boolean',
          text: 'Was this a "status offense" — something illegal only because of your age, like underage possession (MIP)?',
          yes: 'misd_status_date_wy',
          no: 'misd_excluded_wy'
        },
        misd_excluded_wy: {
          type: 'boolean',
          text: 'Did the offense involve use of a firearm, or was it a healthcare provider\'s patient-care offense?',
          yes: 'ineligible_excluded_misd_wy',
          no: 'misd_date_wy'
        },
        misd_status_date_wy: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 1, unit: 'years', anchor: 'post-sentence (Wyo. Stat. § 7-13-1501 — status offense)' },
            nextPass: 'eligible_misd_wy',
            nextFail: 'waiting_wy'
          }
        },
        misd_date_wy: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence?',
          validation: {
            period: { amount: 5, unit: 'years', anchor: 'post-sentence (Wyo. Stat. § 7-13-1501 — misdemeanor)' },
            nextPass: 'eligible_misd_wy',
            nextFail: 'waiting_wy'
          }
        },
        felony_excluded_wy: {
          type: 'boolean',
          text: 'Was the offense any of these: a violent felony, a firearm felony (other than wildlife-code), a sex crime, child endangerment, felony DUI, or drug distribution?',
          yes: 'ineligible_excluded_felony_wy',
          no: 'felony_history_wy'
        },
        felony_history_wy: {
          type: 'boolean',
          text: 'Do you have any OTHER felony conviction, or felonies from a DIFFERENT occurrence? (Wyoming expunges only felonies from a single occurrence, with no other felony history.)',
          yes: 'ineligible_felonyhistory_wy',
          no: 'felony_date_wy'
        },
        felony_date_wy: {
          type: 'date',
          field: 'disposition_date',
          text: 'When did you complete your sentence, with restitution paid in full?',
          validation: {
            period: { amount: 10, unit: 'years', anchor: 'post-sentence with restitution paid in full (Wyo. Stat. § 7-13-1502 — felony, same occurrence, no other felony history)' },
            nextPass: 'eligible_felony_wy',
            nextFail: 'waiting_wy'
          }
        },
        nonconv_date_wy: {
          type: 'date',
          field: 'disposition_date',
          text: 'When were you arrested, or when was the case dismissed?',
          validation: {
            period: { amount: 180, unit: 'days', anchor: 'after arrest or dismissal, no charges pending (Wyo. Stat. § 7-13-1401 — non-conviction)' },
            nextPass: 'eligible_nonconv_wy',
            nextFail: 'waiting_wy'
          }
        }
      },
      results: {
        unknown_disposition: {
          status: 'complex',
          title: 'We Need the Case Outcome First',
          message: 'Wyoming expunges misdemeanors, felonies, and non-convictions on different timelines, and the conviction paths are once per lifetime — so the outcome matters. Because it is marked "I don\'t know," this screening cannot tell you anything reliable yet. Your court paperwork or a DCI record check will show the disposition; the wyocourts.gov expungement self-help can help you read it.',
          remedy: 'Get Your Record First (court paperwork / DCI)',
          citation: 'Wyo. Stat. §§ 7-13-1401/1501/1502 (the route depends on the disposition)'
        },
        eligible_nonconv_wy: {
          status: 'eligible',
          title: 'No Conviction — Expungeable After 180 Days',
          message: 'Because your case ended without a conviction, Wyoming lets you expunge it 180 days after the arrest or dismissal, as long as no charges are pending — and based on your date, that window has passed. You file in the court that handled the case. The wyocourts.gov expungement self-help has the forms; a circuit clerk can confirm the non-conviction fee.',
          remedy: 'Non-conviction expungement (§ 7-13-1401)',
          citation: 'Wyo. Stat. § 7-13-1401'
        },
        eligible_deferral_wy: {
          status: 'eligible',
          title: 'First-Offender Deferral Completed — No Conviction',
          message: 'Because you completed a first-offender deferral (§ 7-13-301), Wyoming treats the case as never resulting in a conviction — which is often the best outcome of all, since there is no conviction to expunge. Confirm your record reflects the dismissal; the wyocourts.gov self-help pages can help, and if any related non-conviction record remains, it can be expunged 180 days out.',
          remedy: 'First-offender deferral (§ 7-13-301) — avoids a conviction',
          citation: 'Wyo. Stat. § 7-13-301'
        },
        eligible_misd_wy: {
          status: 'eligible',
          title: 'Misdemeanor Waiting Period Met — Expungeable (One Shot)',
          message: 'Based on your dates, your misdemeanor waiting period has passed (5 years post-sentence, or 1 year for an age-based status offense). The fee is $100, with a 30-day prosecutor-objection window and then a possible summary grant. Two Wyoming points worth knowing: domestic-violence misdemeanors ARE expungeable here, and expungement lifts the federal firearm bar. One important caveat: this is ONCE PER LIFETIME under this section, so bundle every misdemeanor you want cleared into the single petition. The wyocourts.gov expungement self-help can help.',
          remedy: 'Misdemeanor expungement (§ 7-13-1501) — once per lifetime, bundle everything',
          citation: 'Wyo. Stat. § 7-13-1501'
        },
        eligible_felony_wy: {
          status: 'eligible',
          title: 'Felony Waiting Period Met — Expungeable (One Shot)',
          message: 'Based on your dates — 10 years post-sentence with restitution paid in full — your felony appears expungeable under § 7-13-1502, provided these are felonies from a single occurrence and you have no other felony history. The fee is $300, with a 90-day objection window. A meaningful benefit: expungement restores the rights the conviction removed, including firearms (§ (m)). This is once per lifetime, so include everything from that occurrence. The wyocourts.gov expungement self-help can help.',
          remedy: 'Felony expungement (§ 7-13-1502) — once per lifetime, restores rights',
          citation: 'Wyo. Stat. § 7-13-1502'
        },
        waiting_wy: {
          status: 'waiting',
          title: 'Waiting Period Not Yet Met',
          message: 'Wyoming\'s waiting periods run post-sentence: 5 years for a misdemeanor (1 year for an age-based status offense), 10 years for a felony (with restitution paid), and 180 days for a non-conviction. Based on your dates, yours has not passed yet. When it does, remember the conviction paths are once per lifetime, so it is worth bundling everything. The wyocourts.gov expungement self-help can help you plan.',
          remedy: 'Wait for the period (§§ 7-13-1401/1501/1502)',
          citation: 'Wyo. Stat. §§ 7-13-1501, 7-13-1502'
        },
        ineligible_prioruse_wy: {
          status: 'ineligible',
          title: 'Your One Lifetime Misdemeanor Expungement Has Been Used',
          message: 'Wyoming\'s misdemeanor expungement is once per lifetime, and because you have already used it, another is not available under this section — no waiting period changes that. If you have a felony from a single occurrence that qualifies, that is a separate once-per-lifetime path (§ 7-13-1502); and any non-conviction can still be expunged. The wyocourts.gov self-help can help you check what remains.',
          remedy: 'None (misdemeanor one-shot used) — check the felony path or non-convictions',
          citation: 'Wyo. Stat. § 7-13-1501'
        },
        ineligible_excluded_misd_wy: {
          status: 'ineligible',
          title: 'This Misdemeanor Is Excluded',
          message: 'Wyoming does not expunge misdemeanors that involved the use of a firearm, and there are patient-care exclusions for healthcare providers. No waiting period changes that. If this is the only barrier and you have other, eligible offenses, those can still be bundled and expunged; otherwise a pardon is the remaining route. The wyocourts.gov self-help can help you confirm.',
          remedy: 'None (firearm-use / patient-care exclusion) — a pardon is the remaining route',
          citation: 'Wyo. Stat. § 7-13-1501'
        },
        ineligible_excluded_felony_wy: {
          status: 'ineligible',
          title: 'This Felony Is Excluded',
          message: 'Wyoming excludes a set of felonies from expungement: violent felonies, firearm felonies (other than wildlife-code), sex crimes, child endangerment, felony DUI, and drug distribution. No waiting period changes that. A pardon from the Governor remains a route for an otherwise-excluded felony. The wyocourts.gov self-help can help you confirm the category and explain the pardon process.',
          remedy: 'None (Excluded Felony) — a pardon is the remaining route',
          citation: 'Wyo. Stat. § 7-13-1502'
        },
        ineligible_felonyhistory_wy: {
          status: 'ineligible',
          title: 'Other Felony History — Not Expungeable',
          message: 'Wyoming\'s felony expungement is narrow: it reaches only felonies from a SINGLE occurrence, and only if you have no other felony history. Because you have another felony conviction or felonies from a different occurrence, this path is not available — no waiting period changes that. A pardon from the Governor remains the route for felony convictions here. If any part of your record was a non-conviction, that can still be expunged separately. The wyocourts.gov self-help can help you check.',
          remedy: 'None (other felony history) — a pardon is the remaining route',
          citation: 'Wyo. Stat. § 7-13-1502'
        },
        complex_level_wy: {
          status: 'complex',
          title: 'We Need the Conviction Level',
          message: 'Wyoming\'s waiting period and fee depend on whether it is a misdemeanor (5 years, $100) or a felony (10 years, $300), and both are once per lifetime. Since you are not sure which yours is, we are not going to guess. Your court paperwork states it, and a DCI record check will show it. The wyocourts.gov expungement self-help can help you read it.',
          remedy: 'Get the Conviction Level First (court paperwork / DCI)',
          citation: 'Wyo. Stat. §§ 7-13-1501, 7-13-1502'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Expungement (Wyo. Stat. §§ 7-13-1401, 7-13-1501, 7-13-1502)',
          formName: 'Wyoming Judicial Branch expungement forms',
          formUrl: 'https://www.courts.state.wy.us/expungement/',
          steps: [
            'Confirm your path: misdemeanor (5 years, $100), felony (10 years, $300, single occurrence, no other felony history), or non-conviction (180 days).',
            'Bundle everything into the single petition — the conviction paths are once per lifetime.',
            'For a felony, confirm restitution is paid in full and the offense is not excluded (violent, firearm, sex, child-endangerment, felony DUI, drug-distribution).',
            'File in the court that handled the case; expungement can restore firearm rights (and lifts the federal bar for a DV misdemeanor). The wyocourts.gov self-help has the forms.'
          ],
          // NOT null: Wave 7 gives $100 (misdemeanor) / $300 (felony). The non-conviction
          // fee and any waiver are open questions.
          fees: '$100 filing fee for a misdemeanor expungement (§ 7-13-1501); $300 for a felony (§ 7-13-1502). The non-conviction (§ 7-13-1401) fee is being confirmed.',
          // null: Wave 7 gives no indigency-waiver information for the filing fees.
          feeWaiver: null,
          courtContact: 'The court that handled the case'
        }
      },
      legalAid: [
        { name: 'Wyoming Judicial Branch — Expungement Self-Help', url: 'https://www.courts.state.wy.us/expungement/' },
        { name: 'Legal Aid of Wyoming', url: 'https://www.lawyoming.org' }
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

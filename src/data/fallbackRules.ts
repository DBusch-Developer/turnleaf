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

export interface RuleNode {
  type: 'choice' | 'boolean' | 'date' | 'checkpoint';
  text: string;
  options?: Array<{ label: string; value: string; next: string }>;
  yes?: string;
  no?: string;
  validation?: {
    yearsRequired: number;
    nextPass: string;
    nextFail: string;
  };
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
  verificationStatus: 'statute_cited' | 'phone_verified' | 'pending';
  rules: {
    startNode: string;
    nodes: Record<string, RuleNode>;
    results: Record<string, RuleResult>;
  };
  resources: {
    remedies: Record<string, {
      name: string;
      formName: string;
      formUrl: string;
      steps: string[];
      fees: string;
      feeWaiver: string;
      courtContact: string;
    }>;
    legalAid: Array<{ name: string; url: string }>;
  };
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
    lastReviewed: '2026-07-14',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'sex_registration' },
            { label: 'Dismissed / Acquitted / Diversion Completed / Never Charged', value: 'dismissed', next: 'eligible_dismissed' }
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
          text: 'Did your sentence include time in a California state prison (as opposed to county jail or probation)?',
          yes: 'complex_prison',
          no: 'probation_status'
        },
        probation_status: {
          type: 'choice',
          text: 'What is your current probation status?',
          options: [
            { label: 'Successfully completed probation', value: 'completed', next: 'eligible_expungement' },
            { label: 'Did not complete probation successfully', value: 'failed', next: 'complex_probation' },
            { label: 'Currently still on probation or supervision', value: 'active', next: 'ineligible_active_probation' },
            { label: 'No probation was sentenced', value: 'none', next: 'judgment_date' }
          ]
        },
        // PC 1203.4a: the 1-year wait applies ONLY when probation was NOT
        // granted. If probation was completed, PC 1203.4 relief is available
        // upon completion with no additional waiting period.
        judgment_date: {
          type: 'date',
          text: 'When was judgment pronounced (your sentencing date)?',
          validation: {
            yearsRequired: 1,
            nextPass: 'eligible_expungement_no_probation',
            nextFail: 'waiting_period_ca'
          }
        }
      },
      results: {
        eligible_dismissed: {
          status: 'eligible',
          title: 'Potential Arrest Record Sealing',
          message: 'Since your charge was dismissed, acquitted, resolved by completed diversion, or never filed, you appear potentially eligible to seal your arrest record — as a matter of right in many cases under Penal Code § 851.91 (and § 851.87 for completed diversion). Note: many arrests that did not lead to conviction are also cleared automatically by the CA Department of Justice under § 851.93, so check your record first — the work may already be done.',
          remedy: 'Arrest Record Sealing (PC 851.91 / 851.87)',
          citation: 'California Penal Code §§ 851.91, 851.87, 851.93'
        },
        eligible_expungement: {
          status: 'eligible',
          title: 'Potential Dismissal Eligible',
          message: 'You appear potentially eligible for a dismissal of conviction under Penal Code § 1203.4, available upon successful completion of probation. Also note: under the state\'s automatic record relief program (PC § 1203.425), many misdemeanors (1 year after judgment) and eligible non-serious, non-violent felonies (4 years after sentence completion) are dismissed automatically by the DOJ — your conviction may already have relief. Filing the petition can still add benefits, such as felony reduction under PC § 17(b).',
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
          message: 'State prison sentences are not eligible under PC § 1203.4, but since SB 731 (effective July 1, 2023), the court may grant discretionary dismissal under PC § 1203.41 for many felonies even where state prison time was served — generally after a waiting period (2 years after sentence completion for prison sentences) and if no sex-offender registration is required. Automatic relief under PC § 1203.425 may also apply to eligible non-serious, non-violent felonies 4 years after sentence completion. A Certificate of Rehabilitation (PC § 4852.01) is another path. Consult legal aid — this area is fact-specific.',
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
          // TODO(phone-verify): fee practice varies by county; current
          // self-help guidance indicates no filing fee for CR-180 itself.
          fees: 'No statewide filing fee for Form CR-180; some counties may charge related costs. Verify with your county clerk.',
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
          fees: '$0 (no filing fee under state law for arrest sealing)',
          feeWaiver: 'Not required',
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
  // ARIZONA
  // Three distinct remedies, all encoded:
  //   1. Set-aside (ARS § 13-905) — NO waiting period after absolute
  //      discharge; conviction stays public but is annotated. Comes with a
  //      Certificate of Second Chance in many cases.
  //   2. Record sealing (ARS § 13-911, effective Jan 1, 2023) — hides the
  //      record from public view. Class-based waiting periods after
  //      completing the entire sentence (incl. restitution):
  //      Class 2/3 felony: 10 yrs · Class 4/5/6 felony: 5 yrs ·
  //      Class 1 misdemeanor: 3 yrs · Class 2/3 misdemeanor: 2 yrs.
  //      Dismissals/acquittals/not-charged: sealable immediately.
  //   3. Marijuana expungement (ARS § 36-2862) — narrow, Prop 207 offenses,
  //      no waiting period. Surfaced in messaging, not a full branch.
  // ==========================================================================
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    lastReviewed: '2026-07-14',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'excluded_offense' },
            { label: 'Dismissed / Acquitted / Arrested but never charged', value: 'dismissed', next: 'eligible_seal_dismissed_az' }
          ]
        },
        excluded_offense: {
          type: 'boolean',
          text: 'Was the offense a dangerous offense (involving a deadly weapon, dangerous instrument, or serious physical injury), an offense requiring sex offender registration, an offense with a sexual motivation finding, or a crime against a victim under 15?',
          yes: 'ineligible_serious',
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
        discharge_date_f23: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: { yearsRequired: 10, nextPass: 'eligible_both_az', nextFail: 'waiting_seal_az' }
        },
        discharge_date_f456: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: { yearsRequired: 5, nextPass: 'eligible_both_az', nextFail: 'waiting_seal_az' }
        },
        discharge_date_m1: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: { yearsRequired: 3, nextPass: 'eligible_both_az', nextFail: 'waiting_seal_az' }
        },
        discharge_date_m23: {
          type: 'date',
          text: 'When did you complete your sentence and receive your absolute discharge?',
          validation: { yearsRequired: 2, nextPass: 'eligible_both_az', nextFail: 'waiting_seal_az' }
        }
      },
      results: {
        eligible_seal_dismissed_az: {
          status: 'eligible',
          title: 'Potential Immediate Sealing',
          message: 'Charges that were dismissed, resulted in a not-guilty verdict, or never led to charges can be sealed under ARS § 13-911 with no waiting period. Once sealed, you can generally state the arrest never happened in most situations.',
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
          fees: '$0 (no filing fee to request a Set-Aside)',
          feeWaiver: 'Not required',
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
            'The court must wait 60 days before ruling unless the prosecutor and any victims waive objection; attend a hearing if one is set.'
          ],
          fees: '$0 (the legislature removed filing fees for § 13-911 petitions)',
          feeWaiver: 'Not required',
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
    lastReviewed: '2026-07-14',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'disposition',
      nodes: {
        disposition: {
          type: 'choice',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted of a misdemeanor or felony', value: 'convicted', next: 'excluded_offense_ny' },
            { label: 'Dismissed / Acquitted / Non-criminal violation or infraction', value: 'dismissed', next: 'eligible_seal_dismissed' }
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
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'clean_slate_date_misd' },
            { label: 'Felony', value: 'felony', next: 'clean_slate_date_felony' }
          ]
        },
        clean_slate_date_misd: {
          type: 'date',
          text: 'When were you sentenced, or released from incarceration for this conviction (whichever is later)? Note: a new conviction during the waiting period resets the clock.',
          validation: { yearsRequired: 3, nextPass: 'eligible_clean_slate', nextFail: 'waiting_clean_slate_misd' }
        },
        clean_slate_date_felony: {
          type: 'date',
          text: 'When were you sentenced, or released from incarceration for this conviction (whichever is later)? Note: a new conviction during the waiting period resets the clock.',
          validation: { yearsRequired: 8, nextPass: 'eligible_clean_slate', nextFail: 'waiting_clean_slate_felony' }
        }
      },
      results: {
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
          message: 'Under New York\'s Clean Slate Act (CPL § 160.57, effective Nov 16, 2024), eligible misdemeanors are sealed automatically 3 years — and felonies 8 years — after sentencing or release from incarceration, whichever is later. Based on your entries, your conviction appears eligible. Important: courts have until November 16, 2027 to finish sealing pre-existing records, so an eligible conviction may not be physically sealed yet. If you also have no more than 2 lifetime convictions (max 1 felony) and 10+ years have passed, you can alternatively petition for sealing now under CPL § 160.59 rather than wait.',
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
            'Serve the District Attorney in each county of conviction, complete the Affidavit of Service, and file everything with the sentencing court.'
          ],
          fees: '$0 to file the motion. Certificate of Disposition costs $5 (outside NYC) or $10 (within NYC) per case.',
          feeWaiver: 'Not required for the motion itself',
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
    lastReviewed: '2026-07-14',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'disposition_type',
      nodes: {
        disposition_type: {
          type: 'choice',
          text: 'What was the outcome of your Texas case?',
          options: [
            { label: 'Acquitted (Found Not Guilty)', value: 'acquitted', next: 'eligible_expunction' },
            { label: 'Dismissed / Never charged / No-billed by grand jury', value: 'dropped', next: 'dismissal_offense_level' },
            { label: 'Deferred Adjudication (Completed)', value: 'deferred', next: 'offense_level' },
            { label: 'Convicted (Jail / Prison / Standard Probation)', value: 'convicted', next: 'ineligible_conviction' }
          ]
        },
        dismissal_offense_level: {
          type: 'choice',
          text: 'What was the level of the offense that was dismissed or never charged?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'arrest_date_tx_misd' },
            { label: 'Felony', value: 'felony', next: 'arrest_date_tx_felony' }
          ]
        },
        arrest_date_tx_misd: {
          type: 'date',
          text: 'When was the arrest date?',
          validation: {
            yearsRequired: 1, // Class A/B: 1 yr. Class C is only 180 days — see waiting message. Immediate if prosecutor certifies no charges.
            nextPass: 'eligible_expunction',
            nextFail: 'waiting_period_tx_dismissal'
          }
        },
        arrest_date_tx_felony: {
          type: 'date',
          text: 'When was the arrest date?',
          validation: {
            yearsRequired: 3,
            nextPass: 'eligible_expunction',
            nextFail: 'waiting_period_tx_dismissal'
          }
        },
        offense_level: {
          type: 'choice',
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
            yearsRequired: 5,
            nextPass: 'eligible_nondisclosure_felony',
            nextFail: 'waiting_period_tx_felony'
          }
        }
      },
      results: {
        eligible_expunction: {
          status: 'eligible',
          title: 'Potential Expunction Eligible',
          message: 'Since your case ended in acquittal, dismissal, or was never charged, you appear potentially eligible for a complete Expunction under Texas Code of Criminal Procedure Chapter 55A (which replaced Chapter 55 effective January 1, 2025). An expunction destroys the records, and you can generally deny the arrest ever occurred.',
          remedy: 'Petition for Expunction (CCP Ch. 55A)',
          citation: 'Texas Code of Criminal Procedure Chapter 55A (e.g., Art. 55A.002 for acquittals)'
        },
        eligible_nondisclosure_misdemeanor: {
          status: 'eligible',
          title: 'Potential Nondisclosure Eligible',
          message: 'Since you completed Deferred Adjudication for a misdemeanor, you appear potentially eligible to petition for an Order of Nondisclosure — immediately upon discharge and dismissal for many misdemeanors, or after a 2-year wait for certain offenses (e.g., under Penal Code chapters covering assaultive, weapons, and public-order offenses). Some offense types (like family violence) are excluded.',
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
          message: 'In Texas, standard convictions (found guilty and sentenced to jail, prison, or regular community supervision) are generally not eligible for expunction. Limited nondisclosure paths exist for certain first-time misdemeanor convictions with completed sentences (e.g., Gov\'t Code §§ 411.073, 411.0735) and certain first-time DWI convictions (§§ 411.0731, 411.0736) — these are narrow, so consult legal aid. Otherwise, a pardon is the remaining remedy.',
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
          // TODO(phone-verify): fees vary significantly by county.
          fees: 'Typically $300 to $450 (filing fee plus agency notification costs); varies by county — verify with the district clerk.',
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
          // TODO(phone-verify): fee varies by county.
          fees: 'Approximately $280 to $350 in court fees; varies by county — verify with the clerk.',
          feeWaiver: 'Available using the Statement of Inability to Afford Payment of Court Costs.',
          courtContact: 'Sentencing Court Clerk'
        }
      },
      legalAid: [
        { name: 'TexasLawHelp', url: 'https://texaslawhelp.org' },
        { name: 'Lone Star Legal Aid', url: 'https://www.lonestarlegal.org' }
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

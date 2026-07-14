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
  CA: {
    code: 'CA',
    name: 'California',
    lastReviewed: '2026-07-01',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'offense_level',
      nodes: {
        offense_level: {
          type: 'choice',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Infraction', value: 'infraction', next: 'disposition' },
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'disposition' },
            { label: 'Felony', value: 'felony', next: 'prison_sentence' }
          ]
        },
        prison_sentence: {
          type: 'boolean',
          text: 'Did your sentence include time in a California state prison (as opposed to county jail or probation)?',
          yes: 'complex_prison',
          no: 'disposition'
        },
        disposition: {
          type: 'choice',
          text: 'What was the outcome of the case?',
          options: [
            { label: 'Convicted (Guilty / No Contest)', value: 'convicted', next: 'probation_status' },
            { label: 'Dismissed / Acquitted / Diversion Completed', value: 'dismissed', next: 'eligible_dismissed' }
          ]
        },
        probation_status: {
          type: 'choice',
          text: 'What is your current probation status?',
          options: [
            { label: 'Successfully completed probation', value: 'completed', next: 'sentence_completion_date' },
            { label: 'Did not complete probation successfully', value: 'failed', next: 'complex_probation' },
            { label: 'Currently still on probation', value: 'active', next: 'ineligible_active_probation' },
            { label: 'No probation was sentenced', value: 'none', next: 'sentence_completion_date' }
          ]
        },
        sentence_completion_date: {
          type: 'date',
          text: 'When did you complete your sentence (probation completed, or fines/restitution finished)?',
          validation: {
            yearsRequired: 1,
            nextPass: 'eligible_expungement',
            nextFail: 'waiting_period_ca'
          }
        }
      },
      results: {
        eligible_dismissed: {
          status: 'eligible',
          title: 'Potential Sealing Eligible',
          message: 'Since your charge was dismissed, acquitted, or you completed diversion, you appear potentially eligible to seal your arrest records immediately under California Penal Code § 851.87.',
          remedy: 'Arrest Record Sealing (PC 851.87)',
          citation: 'California Penal Code § 851.87'
        },
        eligible_expungement: {
          status: 'eligible',
          title: 'Potential Expungement Eligible',
          message: 'Based on your entries, you appear potentially eligible for a dismissal of conviction under Penal Code § 1203.4. This will set aside your conviction and release you from most penalties.',
          remedy: 'Petition for Dismissal (PC 1203.4)',
          citation: 'California Penal Code § 1203.4'
        },
        waiting_period_ca: {
          status: 'waiting',
          title: 'Waiting Period Not Met',
          message: 'California law requires at least 1 year to elapse from the date of conviction or sentence completion before filing for a PC 1203.4 dismissal (if probation was not ordered).',
          remedy: 'Petition for Dismissal (PC 1203.4)',
          citation: 'California Penal Code § 1203.4'
        },
        complex_prison: {
          status: 'complex',
          title: 'Complex Situation (State Prison)',
          message: 'Convictions that resulted in state prison sentences are not eligible for standard expungement under PC 1203.4. However, you may be eligible under PC 1203.41 (realignment) or a Certificate of Rehabilitation. Please consult with legal aid.',
          remedy: 'Realignment Sealing / Certificate of Rehabilitation',
          citation: 'California Penal Code § 1203.41 & 4852.01'
        },
        complex_probation: {
          status: 'complex',
          title: 'Discretionary Expungement',
          message: 'If you did not successfully complete probation, a PC 1203.4 dismissal is not automatic. However, the court has discretion to grant it "in the interest of justice." You will need to show rehabilitation.',
          remedy: 'Discretionary Dismissal (PC 1203.4)',
          citation: 'California Penal Code § 1203.4(a)(1)'
        },
        ineligible_active_probation: {
          status: 'ineligible',
          title: 'Currently on Probation',
          message: 'You cannot seal or expunge a conviction while currently on active probation. Once probation ends or if you file for early termination of probation, you can apply.',
          remedy: 'None (Active Probation)',
          citation: 'California Penal Code § 1203.4'
        }
      }
    },
    resources: {
      remedies: {
        expungement: {
          name: 'Petition for Dismissal (PC 1203.4)',
          formName: 'Form CR-180 (Petition) & Form CR-181 (Order)',
          formUrl: 'https://www.courts.ca.gov/documents/cr180.pdf',
          steps: [
            'Obtain your official RAP sheet / criminal history report.',
            'Fill out form CR-180 and CR-181.',
            'File the forms with the clerk of the court where you were convicted.',
            'Serve a copy of the petition on the District Attorney at least 15 days before the hearing.',
            'Attend the court hearing if required by the judge.'
          ],
          fees: 'Varies by county (typically $0 to $150). Many counties have eliminated this fee.',
          feeWaiver: 'Available using Form FW-001 (Request to Waive Court Fees).',
          courtContact: 'County Superior Court Clerk'
        },
        sealing: {
          name: 'Arrest Record Sealing (PC 851.87)',
          formName: 'Form CR-409 (Petition to Seal Arrest Records)',
          formUrl: 'https://www.courts.ca.gov/documents/cr409.pdf',
          steps: [
            'Complete Form CR-409.',
            'File the petition with the court in the county where the arrest occurred.',
            'Serve the law enforcement agency that arrested you and the District Attorney.'
          ],
          fees: '$0 (No filing fee under state law for arrest sealing)',
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
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    lastReviewed: '2026-07-08',
    verificationStatus: 'phone_verified',
    rules: {
      startNode: 'offense_level',
      nodes: {
        offense_level: {
          type: 'choice',
          text: 'What was the level of the offense?',
          options: [
            { label: 'Misdemeanor', value: 'misdemeanor', next: 'dangerous_offense' },
            { label: 'Felony', value: 'felony', next: 'dangerous_offense' }
          ]
        },
        dangerous_offense: {
          type: 'boolean',
          text: 'Was the offense a serious violent crime, sexual offense, or did it involve a child victim under ARS § 13-905(K)?',
          yes: 'ineligible_serious',
          no: 'sentence_completed'
        },
        sentence_completed: {
          type: 'boolean',
          text: 'Have you completed all terms of your sentence (including probation, jail/prison time, and paid all court fines and victim restitution)?',
          yes: 'completion_date',
          no: 'ineligible_restitution'
        },
        completion_date: {
          type: 'date',
          text: 'When did you receive your absolute discharge from your sentence?',
          validation: {
            yearsRequired: 2, // 2 years is the standard wait for non-dangerous felony set-asides, misdemeanor is 0. We evaluate felony wait time conservatively.
            nextPass: 'eligible_set_aside',
            nextFail: 'waiting_period_az'
          }
        }
      },
      results: {
        eligible_set_aside: {
          status: 'eligible',
          title: 'Potential Set-Aside Eligible',
          message: 'In Arizona, convictions cannot be erased, but you can apply to have the conviction "Set Aside" and receive a Certificate of Second Chance under ARS § 13-905. You appear eligible to file.',
          remedy: 'Application for Set-Aside (ARS § 13-905)',
          citation: 'Arizona Revised Statutes § 13-905'
        },
        waiting_period_az: {
          status: 'waiting',
          title: 'Waiting Period / Discharge Warning',
          message: 'While misdemeanors can be set aside immediately upon discharge, felonies require 2 years (Class 4, 5, 6) or 5 years (Class 2, 3) from absolute discharge before applying.',
          remedy: 'Application for Set-Aside (ARS § 13-905)',
          citation: 'Arizona Revised Statutes § 13-905'
        },
        ineligible_serious: {
          status: 'ineligible',
          title: 'Ineligible Offense',
          message: 'Under ARS § 13-905(K), certain offenses cannot be set aside. This includes crimes involving dangerous physical injury, weapons, sexual offenses, or crimes against children.',
          remedy: 'None (Statutorily Excluded)',
          citation: 'Arizona Revised Statutes § 13-905(K)'
        },
        ineligible_restitution: {
          status: 'ineligible',
          title: 'Restitution Unpaid',
          message: 'Arizona courts will deny any Set-Aside application if victim restitution or court fines are unpaid. You must obtain an absolute discharge from your sentence.',
          remedy: 'Pay Off Court Restitution First',
          citation: 'Arizona Revised Statutes § 13-905(C)'
        }
      }
    },
    resources: {
      remedies: {
        set_aside: {
          name: 'Application to Set Aside Conviction',
          formName: 'Application to Set Aside & Certificate of Second Chance',
          formUrl: 'https://www.azcourthelp.org/images/forms/SetAsideApplication.pdf',
          steps: [
            'Verify that you have received your Absolute Discharge Certificate from the Department of Corrections or Probation Office.',
            'Ensure all fines, fees, and victim restitution are paid in full.',
            'Complete the Application to Set Aside Conviction form.',
            'File the completed form with the Clerk of the Court in the county where you were sentenced.'
          ],
          fees: '$0 (There is no filing fee in Arizona to request a Set-Aside)',
          feeWaiver: 'Not required',
          courtContact: 'Clerk of the Superior Court / Municipal Court Clerk'
        }
      },
      legalAid: [
        { name: 'Arizona Legal Services', url: 'https://www.azlawhelp.org' },
        { name: 'Community Legal Services (Phoenix)', url: 'https://www.clsaz.org' }
      ]
    }
  },
  NY: {
    code: 'NY',
    name: 'New York',
    lastReviewed: '2026-07-01',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'conviction_count',
      nodes: {
        conviction_count: {
          type: 'choice',
          text: 'How many total criminal convictions do you have in New York (lifetime)?',
          options: [
            { label: '1 or 2 total convictions (max 1 felony)', value: 'eligible_count', next: 'offense_type' },
            { label: '3 or more convictions, or more than 1 felony', value: 'ineligible_count', next: 'check_dismissal' }
          ]
        },
        check_dismissal: {
          type: 'boolean',
          text: 'Was this specific charge dismissed, acquitted, or resolved by non-criminal adjudication (violation/infraction)?',
          yes: 'eligible_seal_dismissed',
          no: 'ineligible_limit'
        },
        offense_type: {
          type: 'boolean',
          text: 'Is the conviction a sex offense, violent felony, or Class A felony?',
          yes: 'ineligible_offense',
          no: 'sentence_date'
        },
        sentence_date: {
          type: 'date',
          text: 'When were you sentenced, or when were you released from state prison (whichever is later)?',
          validation: {
            yearsRequired: 10,
            nextPass: 'eligible_sealing',
            nextFail: 'waiting_period_ny'
          }
        }
      },
      results: {
        eligible_sealing: {
          status: 'eligible',
          title: 'Potential Sealing Eligible',
          message: 'Based on NY CPL § 160.59, you appear eligible to petition the court to seal your conviction. This will hide the conviction from public record searches.',
          remedy: 'CPL 160.59 Sealing Application',
          citation: 'New York Criminal Procedure Law § 160.59'
        },
        eligible_seal_dismissed: {
          status: 'eligible',
          title: 'Automatic Arrest Sealing',
          message: 'If your case was dismissed, acquitted, or ended in a non-criminal violation, it is eligible for automatic sealing under CPL 160.50.',
          remedy: 'Automatic Sealing (CPL 160.50)',
          citation: 'New York Criminal Procedure Law § 160.50'
        },
        waiting_period_ny: {
          status: 'waiting',
          title: '10-Year Waiting Period Unmet',
          message: 'New York requires a strict 10-year waiting period from the date of sentence or release from incarceration before you can apply to seal a conviction.',
          remedy: 'CPL 160.59 Sealing Application',
          citation: 'New York Criminal Procedure Law § 160.59'
        },
        ineligible_limit: {
          status: 'ineligible',
          title: 'Ineligible - Conviction Limit Exceeded',
          message: 'Under NY CPL § 160.59, sealing is restricted to individuals with no more than 2 total convictions in their lifetime, of which only 1 can be a felony.',
          remedy: 'None (Statutorily Excluded)',
          citation: 'New York Criminal Procedure Law § 160.59(2)(a)'
        },
        ineligible_offense: {
          status: 'ineligible',
          title: 'Ineligible Offense Type',
          message: 'Violent felonies, sex offenses, and Class A felonies are strictly excluded from sealing under CPL § 160.59.',
          remedy: 'None (Statutorily Excluded)',
          citation: 'New York Criminal Procedure Law § 160.59(1)(a)'
        }
      }
    },
    resources: {
      remedies: {
        sealing: {
          name: 'CPL 160.59 Sealing Motion',
          formName: 'Sealing Application Pack / Notice of Motion',
          formUrl: 'https://ww2.nycourts.gov/forms/pdfs/Sealing_Application.pdf',
          steps: [
            'Request your official New York State criminal history (RAP sheet) from DCJS.',
            'Obtain a Certificate of Disposition from the court where you were sentenced.',
            'Complete the CPL 160.59 Sealing Application form.',
            'Serve the District Attorney in the county of conviction and file the motion with the court.'
          ],
          fees: '$0 (No fee for filing a sealing motion in NY state courts)',
          feeWaiver: 'Not required',
          courtContact: 'Sentencing Court Clerk (Supreme / County / City / Town Court)'
        }
      },
      legalAid: [
        { name: 'LawHelpNY', url: 'https://www.lawhelpny.org' },
        { name: 'Legal Aid Society of NYC', url: 'https://www.legalaidnyc.org' }
      ]
    }
  },
  TX: {
    code: 'TX',
    name: 'Texas',
    lastReviewed: '2026-07-01',
    verificationStatus: 'statute_cited',
    rules: {
      startNode: 'disposition_type',
      nodes: {
        disposition_type: {
          type: 'choice',
          text: 'What was the outcome of your Texas case?',
          options: [
            { label: 'Dismissed / Acquitted / No Bill', value: 'dismissed', next: 'dismissal_type' },
            { label: 'Deferred Adjudication (Completed)', value: 'deferred', next: 'offense_level' },
            { label: 'Convicted (Jail / Prison / Standard Probation)', value: 'convicted', next: 'ineligible_conviction' }
          ]
        },
        dismissal_type: {
          type: 'choice',
          text: 'Why was the case dismissed?',
          options: [
            { label: 'Found Not Guilty / Acquitted', value: 'acquitted', next: 'eligible_expunction' },
            { label: 'Dismissed without probation (No probable cause / charges dropped)', value: 'dropped', next: 'sentence_date_tx_dismissal' },
            { label: 'Completed standard probation (not deferred)', value: 'probation_done', next: 'ineligible_conviction' }
          ]
        },
        sentence_date_tx_dismissal: {
          type: 'date',
          text: 'When was the arrest or charge date?',
          validation: {
            yearsRequired: 3, // Standard felony limitation is 3 years, misdemeanor is 1 year. We evaluate conservatively.
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
          message: 'Since your charge ended in acquittal or dismissal without probation, you appear eligible for a complete Expunction under Texas Code of Criminal Procedure Chapter 55.',
          remedy: 'Petition for Expunction',
          citation: 'Texas Code of Criminal Procedure Chapter 55'
        },
        eligible_nondisclosure_misdemeanor: {
          status: 'eligible',
          title: 'Potential Nondisclosure Eligible',
          message: 'Since you completed Deferred Adjudication for a misdemeanor, you appear eligible to petition the court for an Order of Nondisclosure immediately, or after a short waiting period.',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.072'
        },
        eligible_nondisclosure_felony: {
          status: 'eligible',
          title: 'Potential Nondisclosure Eligible',
          message: 'Since you completed Deferred Adjudication for a felony and 5 years have elapsed, you appear eligible for an Order of Nondisclosure under Section 411.0725.',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.0725'
        },
        waiting_period_tx_dismissal: {
          status: 'waiting',
          title: 'Waiting Period (Statute of Limitations)',
          message: 'Texas requires waiting for the statute of limitations to expire before expunging a dismissed arrest. Misdemeanors require 1 year, and Felonies require 3 years from the arrest date.',
          remedy: 'Petition for Expunction',
          citation: 'Texas Code of Criminal Procedure Art. 55.01(a)(2)'
        },
        waiting_period_tx_felony: {
          status: 'waiting',
          title: '5-Year Waiting Period Unmet',
          message: 'Texas requires a 5-year waiting period after completing deferred adjudication for a felony before you can petition for nondisclosure.',
          remedy: 'Order of Nondisclosure',
          citation: 'Texas Government Code § 411.0725'
        },
        ineligible_conviction: {
          status: 'ineligible',
          title: 'Conviction Ineligible',
          message: 'In Texas, standard convictions (where you were found guilty and sentenced to jail, prison, or regular community supervision) are not eligible for expungement or nondisclosure.',
          remedy: 'Governor\'s Pardon (Only Remedy)',
          citation: 'Texas Code of Criminal Procedure Art. 55.01'
        }
      }
    },
    resources: {
      remedies: {
        expunction: {
          name: 'Petition for Expunction',
          formName: 'Petition for Expunction (Varies by county)',
          formUrl: 'https://texaslawhelp.org/sites/default/files/txt-ex-101-petition_for_expunction_0.pdf',
          steps: [
            'Acquire your certified copy of the case disposition showing dismissal.',
            'Fill out the Petition for Expunction listing all law enforcement agencies with records of your arrest.',
            'File the petition in the District Court in the county where the arrest occurred.',
            'Attend the scheduled hearing to obtain the Expunction Order.'
          ],
          fees: 'Typically $300 to $450 (includes filing fee + agency notification fees).',
          feeWaiver: 'Available using the Statement of Inability to Afford Payment of Court Costs.',
          courtContact: 'County District Court Clerk'
        },
        nondisclosure: {
          name: 'Order of Nondisclosure',
          formName: 'Petition for Order of Nondisclosure',
          formUrl: 'https://www.txcourts.gov/rules-forms/forms/',
          steps: [
            'Confirm you completed deferred adjudication and received a discharge order.',
            'Ensure the waiting period has elapsed.',
            'Fill out the specific Nondisclosure form for your offense category.',
            'File with the court that placed you on deferred adjudication.'
          ],
          fees: '$280 to $350 court fee.',
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

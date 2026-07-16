import { neon } from '@neondatabase/serverless';
import { fallbackRules, stateDirectory, StateRuleConfig, VerificationStatus } from '../data/fallbackRules';

/**
 * Is this state's research finished enough to screen someone with?
 *
 * 'draft' means the rules were read out of a research package but nobody has
 * confirmed them with a court yet. A draft state is NOT screenable: it routes
 * to the in-research panel like any unresearched state, and comes back only
 * when a human flips its status after a verification call. This is why every
 * state can go dark at once — the seeder writes 'draft' and nothing else.
 */
export const isScreenable = (status: VerificationStatus | null | undefined): boolean =>
  status === 'statute_cited' || status === 'phone_verified';

const getDb = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  try {
    return neon(connectionString);
  } catch (error) {
    console.error('Failed to initialize Neon client:', error);
    return null;
  }
};

export interface StateListEntry {
  code: string;
  name: string;
  /** Screenable: researched AND verified. Draft states are false. */
  available: boolean;
  /** True when rules exist but are still draft — researched, not yet verified. */
  draft: boolean;
  lastReviewed: string | null;
  verificationStatus: VerificationStatus | null;
}

/**
 * Where the rules being served actually came from.
 *
 * The fallback path is silent by design — if the database is unreachable or its
 * schema is behind, getState/getStatesList quietly serve fallbackRules and the
 * site looks identical. That is the right runtime behaviour and a terrible
 * property for a person trying to verify a migration: on 2026-07-15 the live
 * database was missing five columns for hours and the only evidence was a stack
 * trace in a terminal. This makes the difference legible.
 */
export type DataSource = 'database' | 'fallback';

export interface StatesListResponse {
  dataSource: DataSource;
  states: StateListEntry[];
}

/**
 * Returns ALL 50 states for the selector, and says where they came from.
 *
 * `available` is true only for states whose rules are researched AND verified.
 * States with no rules, and states whose rules are still 'draft', are both
 * listed as not available — they never receive generic/template rules, and they
 * are never screened against research nobody has confirmed. `draft`
 * distinguishes the two so the UI can say which is which honestly.
 */
export async function getStatesList(): Promise<StatesListResponse> {
  let dataSource: DataSource = 'fallback';
  const researched = new Map<string, { lastReviewed: string; verificationStatus: VerificationStatus }>();

  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT code, last_reviewed as "lastReviewed", verification_status as "verificationStatus"
        FROM states
      `;
      if (rows) dataSource = 'database';
      for (const r of rows) {
        researched.set(String(r.code), {
          lastReviewed: r.lastReviewed instanceof Date
            ? r.lastReviewed.toISOString().split('T')[0]
            : String(r.lastReviewed),
          verificationStatus: r.verificationStatus as VerificationStatus,
        });
      }
    } catch (error) {
      dataSource = 'fallback';
      console.error('Error fetching states from Neon, using local rules only:', error);
    }
  }

  // Local researched rules (also the dev-mode source when no DB is configured)
  if (researched.size === 0) {
    for (const s of Object.values(fallbackRules)) {
      researched.set(s.code, { lastReviewed: s.lastReviewed, verificationStatus: s.verificationStatus });
    }
  }

  const states = stateDirectory.map(({ code, name }) => ({
    code,
    name,
    available: isScreenable(researched.get(code)?.verificationStatus),
    draft: Boolean(researched.get(code)) && !isScreenable(researched.get(code)?.verificationStatus),
    lastReviewed: researched.get(code)?.lastReviewed ?? null,
    verificationStatus: researched.get(code)?.verificationStatus ?? null,
  }));

  return { dataSource, states };
}

/**
 * Returns researched rules for a state, or null when the state has not been
 * researched yet. There is deliberately NO generic fallback: a state either
 * has real, cited rules or the caller must render the in-research panel.
 */
export async function getState(code: string): Promise<StateRuleConfig | null> {
  const cleanCode = code.toUpperCase();
  const sql = getDb();

  if (sql) {
    try {
      const rows = await sql`
        SELECT code, name, rules, resources,
               last_reviewed as "lastReviewed", verified_date as "verifiedDate",
               verification_status as "verificationStatus",
               source_package as "sourcePackage", terminology,
               key_dates as "keyDates", open_questions as "openQuestions", sources
        FROM states
        WHERE code = ${cleanCode}
        LIMIT 1
      `;
      if (rows && rows.length > 0) {
        const row = rows[0];
        const json = <T>(v: unknown, fallback: T): T =>
          v == null ? fallback : (typeof v === 'string' ? JSON.parse(v) : v) as T;
        return {
          code: row.code as string,
          name: row.name as string,
          lastReviewed: row.lastReviewed instanceof Date
            ? row.lastReviewed.toISOString().split('T')[0]
            : String(row.lastReviewed),
          verifiedDate: row.verifiedDate == null
            ? null
            : (row.verifiedDate instanceof Date
                ? row.verifiedDate.toISOString().split('T')[0]
                : String(row.verifiedDate)),
          verificationStatus: row.verificationStatus as VerificationStatus,
          sourcePackage: (row.sourcePackage as string) ?? '',
          terminology: (row.terminology as string) ?? '',
          keyDates: json(row.keyDates, []),
          openQuestions: json(row.openQuestions, []),
          sources: json(row.sources, []),
          rules: json(row.rules, { startNode: '', nodes: {}, results: {} }),
          resources: json(row.resources, { remedies: {}, legalAid: [] }),
        } as StateRuleConfig;
      }
      return fallbackRules[cleanCode] || null;
    } catch (error) {
      console.error(`Error fetching state ${cleanCode} from Neon, using local rules:`, error);
    }
  }

  return fallbackRules[cleanCode] || null;
}

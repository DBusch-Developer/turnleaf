import { neon } from '@neondatabase/serverless';
import { fallbackRules, stateDirectory, StateRuleConfig } from '../data/fallbackRules';

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
  available: boolean; // true only when researched, cited rules exist
  lastReviewed: string | null;
  verificationStatus: 'statute_cited' | 'phone_verified' | 'pending' | null;
}

/**
 * Returns ALL 50 states for the selector. `available` is true only for states
 * with researched rules (in the database, or in local fallbackRules when no
 * DATABASE_URL is configured). States without rules are listed honestly as
 * in-research; they never receive generic/template rules.
 */
export async function getStatesList(): Promise<StateListEntry[]> {
  const researched = new Map<string, { lastReviewed: string; verificationStatus: StateListEntry['verificationStatus'] }>();

  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT code, last_reviewed as "lastReviewed", verification_status as "verificationStatus"
        FROM states
      `;
      for (const r of rows) {
        researched.set(String(r.code), {
          lastReviewed: r.lastReviewed instanceof Date
            ? r.lastReviewed.toISOString().split('T')[0]
            : String(r.lastReviewed),
          verificationStatus: r.verificationStatus as StateListEntry['verificationStatus'],
        });
      }
    } catch (error) {
      console.error('Error fetching states from Neon, using local rules only:', error);
    }
  }

  // Local researched rules (also the dev-mode source when no DB is configured)
  if (researched.size === 0) {
    for (const s of Object.values(fallbackRules)) {
      researched.set(s.code, { lastReviewed: s.lastReviewed, verificationStatus: s.verificationStatus });
    }
  }

  return stateDirectory.map(({ code, name }) => {
    const r = researched.get(code);
    return {
      code,
      name,
      available: Boolean(r),
      lastReviewed: r?.lastReviewed ?? null,
      verificationStatus: r?.verificationStatus ?? null,
    };
  });
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
        SELECT code, name, rules, resources, last_reviewed as "lastReviewed", verification_status as "verificationStatus"
        FROM states
        WHERE code = ${cleanCode}
        LIMIT 1
      `;
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          code: row.code as string,
          name: row.name as string,
          lastReviewed: row.lastReviewed instanceof Date
            ? row.lastReviewed.toISOString().split('T')[0]
            : String(row.lastReviewed),
          verificationStatus: row.verificationStatus as StateRuleConfig['verificationStatus'],
          rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules,
          resources: typeof row.resources === 'string' ? JSON.parse(row.resources) : row.resources,
        } as StateRuleConfig;
      }
      return fallbackRules[cleanCode] || null;
    } catch (error) {
      console.error(`Error fetching state ${cleanCode} from Neon, using local rules:`, error);
    }
  }

  return fallbackRules[cleanCode] || null;
}

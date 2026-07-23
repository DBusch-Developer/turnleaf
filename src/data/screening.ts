// ============================================================================
// SCREENING VOCABULARY — the contract between what a person tells us and what
// the rule trees read.
//
// A tree node either READS its answer from the record (it declares a `field`)
// or ASKS the person (it declares none, and the wizard renders the node's own
// text and options). That split is the whole contract:
//
//   - Record-backed nodes are cheap (we already know the answer) but bounded:
//     an option value must be something the record can actually hold. The
//     validator enforces that (`unproducible-value`). Arizona once encoded
//     'felony_high' against a field that only ever holds 'felony' — the option
//     could never match, so its entire sealing ladder was unreachable.
//   - Asked nodes are unbounded: the tree names its own answers, so a state
//     can ask about class 2/3 felonies, indictable offences, or anything else
//     its statutes turn on, without the form growing a field per state.
//
// This is why the questions live in the data and nowhere else. A second,
// hand-maintained copy of them in a form is how they drift.
// ============================================================================

/** What a person tells us about one charge. Held in browser state; never persisted. */
export interface ConvictionRecord {
  id: string;
  /** Which state's law screens this record. A 2-letter code, e.g. 'CA'.
   *  Record metadata, NOT a rule field — the engine never reads it and it is
   *  absent from RecordField/FIELD_DOMAINS. It only groups and routes records. */
  state: string;
  title: string;
  charge_type: 'misdemeanor' | 'felony' | 'infraction' | 'unknown';
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted' | 'unknown';
  disposition_date: string;
  probation_status: 'completed' | 'failed' | 'active' | 'none';
  prison_sentenced: boolean;
  restitution_paid?: boolean;
  fines_paid?: boolean;
}

/** The record fields a node may read. */
export type RecordField =
  | 'charge_type'
  | 'disposition'
  | 'probation_status'
  | 'prison_sentenced'
  | 'restitution_paid'
  | 'fines_paid'
  | 'disposition_date';

/**
 * Every value each field can actually hold — i.e. everything the screening form
 * can produce. An option value outside its field's domain is unreachable, and
 * the validator rejects it.
 *
 * Booleans are listed as their string forms because option values are strings.
 */
export const FIELD_DOMAINS: Record<RecordField, readonly string[]> = {
  charge_type: ['misdemeanor', 'felony', 'infraction', 'unknown'],
  disposition: ['convicted', 'dismissed', 'deferred', 'acquitted', 'unknown'],
  probation_status: ['completed', 'failed', 'active', 'none'],
  prison_sentenced: ['true', 'false'],
  restitution_paid: ['true', 'false'],
  fines_paid: ['true', 'false'],
  // A date has no enumerable domain; it is checked by type, not by value.
  disposition_date: [],
};

/** Which fields hold a yes/no, and so back a `boolean` node rather than a `choice`. */
export const BOOLEAN_FIELDS: readonly RecordField[] = ['prison_sentenced', 'restitution_paid', 'fines_paid'];

/**
 * Which fields hold a date, and so may back a `date` node.
 *
 * The form collects exactly ONE date, labelled "Disposition / Sentence Date".
 * That is the ONLY date any node may read — and most waiting periods do not run
 * from it. Arizona's runs from absolute discharge, which for a probation case
 * lands years after sentencing; New York's from sentencing-or-release whichever
 * is later; Texas expunction from the date of arrest, which precedes everything.
 *
 * A date node whose clock runs from anything other than the disposition date
 * MUST ask for its own date. It used to silently read this field regardless of
 * its declared anchor, which told Arizona and New York users they were eligible
 * years before they were. The validator now refuses that.
 */
export const DATE_FIELDS: readonly RecordField[] = ['disposition_date'];

/**
 * Read a field off a record as the string a node matches against.
 * Returns null when the record cannot answer — which is not a failure, just an
 * unknown, and unknowns route to a hedge rather than a guess.
 */
export function readField(record: ConvictionRecord, field: RecordField): string | null {
  const value = record[field];
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return String(value);
  if (value === 'unknown') return 'unknown';
  return String(value);
}

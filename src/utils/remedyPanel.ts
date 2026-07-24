// ============================================================================
// REMEDY PANEL VISIBILITY — who gets shown the form, and how it is framed.
//
// One decision, two consumers: the on-screen panel (StateResultSection) and the
// printed report (pdfGenerator). It lives here because it was previously written
// out twice, and both copies carried the same bug: the filing panel rendered
// only when some record came back 'eligible'.
//
// That withheld the form from the two statuses that most need it:
//
//   - 'complex' exists to say "a human has to settle this, here is your lead" —
//     and the lead IS the form. Arizona surfaced it: a DUI lands on
//     `complex_dui_az`, whose own copy says the § 13-905 set-aside "is worth
//     pursuing either way", and the panel then hid the set-aside form, its
//     steps, and the fact that the clerk may not charge a filing fee for it
//     (§ 13-905(B)). The app told someone to pursue a remedy and then withheld
//     the paperwork for it.
//   - 'waiting' tells someone to come back later. They should know what they
//     are coming back to file.
//
// 'ineligible' stays suppressed: that record has nothing to file.
//
// The old gate was also computed across the whole state section, so the same
// DUI showed a form or not depending on what ELSE the person entered for that
// state. Callers now pass only the records the panel is actually speaking for.
// ============================================================================

/** The four statuses a screening result can carry. */
export type ResultStatus = 'eligible' | 'waiting' | 'ineligible' | 'complex';

/** Statuses that earn the filing panel. Order is display order, not priority. */
export const ACTIONABLE_STATUSES: ResultStatus[] = ['eligible', 'waiting', 'complex'];

export function isActionable(status: string): boolean {
  return (ACTIONABLE_STATUSES as string[]).includes(status);
}

/** The records a filing panel is for — everything but 'ineligible'. */
export function actionableRecords<T extends { resultStatus: string }>(records: T[]): T[] {
  return records.filter(r => isActionable(r.resultStatus));
}

export interface RemedyPanelCopy {
  /** Whether to render the panel at all. */
  show: boolean;
  /** Heading, matched to the statuses actually present. */
  heading: string;
  /**
   * The caveat above the forms. null ONLY when something is genuinely eligible —
   * every other case must say out loud that these forms are not a clearance to
   * file, or the panel reads as a green light the screening never gave.
   */
  note: string | null;
}

/**
 * Heading + framing for a set of results. Never lets the panel read as "you are
 * cleared to file" for records that are waiting or unsettled.
 */
export function remedyPanelCopy(records: Array<{ resultStatus: string }>): RemedyPanelCopy {
  const actionable = actionableRecords(records);
  if (actionable.length === 0) {
    return { show: false, heading: '', note: null };
  }

  const hasEligible = actionable.some(r => r.resultStatus === 'eligible');
  const hasWaiting = actionable.some(r => r.resultStatus === 'waiting');
  const hasComplex = actionable.some(r => r.resultStatus === 'complex');

  if (hasEligible) {
    return { show: true, heading: 'The Form & Instructions to File Next', note: null };
  }

  if (hasComplex && !hasWaiting) {
    return {
      show: true,
      heading: 'The Form Behind the Open Question',
      note: 'Nothing above says you are cleared to file. It says the answer is not settled — so here is the paperwork the open question is about, to take to a clerk or legal aid rather than to guess at. Confirm you qualify before you file.',
    };
  }

  if (hasWaiting && !hasComplex) {
    return {
      show: true,
      heading: "What You'll File When the Wait Is Over",
      note: 'You are not eligible to file yet. This is what the filing will involve when your wait is over, so you know what you are working toward — check the requirements again before you file.',
    };
  }

  return {
    show: true,
    heading: 'The Forms These Records Point To',
    note: 'These records are either waiting on time or unsettled — none of them is a green light. This is the paperwork they point to, so you can take it to a clerk or legal aid. Confirm you qualify before you file.',
  };
}

/**
 * Which remedy keys the panel should render, given the records it speaks for.
 *
 * A record with no `remedyKeys` reaches every remedy the state has — the
 * long-standing default, and correct for the ~32 states with a single remedy.
 * A record that names keys narrows to those, because showing a form is a soft
 * endorsement and some results deliberately withhold one: `complex_dui_az`
 * tells an Arizona DUI that § 13-911 sealing is unresolved, so it must not also
 * hand over the sealing petition.
 *
 * Union across records, so a mixed screening still sees everything its records
 * reached between them. Narrowing NEVER adds a remedy — the result is always a
 * subset of what the state actually has, in the state's own key order.
 */
export function visibleRemedyKeys(
  records: Array<{ resultStatus: string; remedyKeys?: string[] }>,
  availableKeys: string[],
): string[] {
  const actionable = actionableRecords(records);
  if (actionable.length === 0) return [];

  // Any record without an explicit narrowing opens the panel to everything.
  if (actionable.some(r => r.remedyKeys === undefined)) return availableKeys;

  const named = new Set(actionable.flatMap(r => r.remedyKeys ?? []));
  return availableKeys.filter(k => named.has(k));
}

/** Short per-record label for the "Shown for:" line. */
export function statusLabel(status: string): string {
  switch (status) {
    case 'eligible': return 'appears eligible';
    case 'waiting': return 'not yet';
    case 'complex': return 'needs a person';
    default: return status;
  }
}

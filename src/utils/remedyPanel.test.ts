import { describe, test, expect } from 'vitest';
import { actionableRecords, isActionable, remedyPanelCopy, statusLabel } from './remedyPanel';
import { fallbackRules } from '../data/fallbackRules';
import { evaluate } from '../data/rulesEngine';
import { intakeMaps, answersForState } from '../data/intakeMaps';
import type { ConvictionRecord } from '../data/screening';

// ============================================================================
// The filing panel used to render only when a record came back 'eligible', in
// two independently-written copies (StateResultSection + pdfGenerator). That
// hid the form from 'complex' and 'waiting' results — the two statuses whose
// whole point is to hand someone a next step. These tests hold the corrected
// rule and the live case that surfaced it.
// ============================================================================

const r = (resultStatus: string) => ({ resultStatus });

describe('remedy panel visibility', () => {
  test('ineligible alone shows nothing — that record has nothing to file', () => {
    const panel = remedyPanelCopy([r('ineligible')]);
    expect(panel.show).toBe(false);
    expect(actionableRecords([r('ineligible')])).toEqual([]);
  });

  test('complex shows the panel — the lead IS the form', () => {
    const panel = remedyPanelCopy([r('complex')]);
    expect(panel.show).toBe(true);
    expect(panel.heading).toBe('The Form Behind the Open Question');
    expect(panel.note).toMatch(/not settled/i);
  });

  test('waiting shows the panel, framed as what you will file later', () => {
    const panel = remedyPanelCopy([r('waiting')]);
    expect(panel.show).toBe(true);
    expect(panel.heading).toBe("What You'll File When the Wait Is Over");
    expect(panel.note).toMatch(/not eligible to file yet/i);
  });

  test('eligible gets the plain heading and NO caveat', () => {
    const panel = remedyPanelCopy([r('eligible')]);
    expect(panel.show).toBe(true);
    expect(panel.heading).toBe('The Form & Instructions to File Next');
    expect(panel.note).toBeNull();
  });

  test('mixed waiting + complex, nothing eligible, still carries a caveat', () => {
    const panel = remedyPanelCopy([r('waiting'), r('complex')]);
    expect(panel.show).toBe(true);
    expect(panel.heading).toBe('The Forms These Records Point To');
    expect(panel.note).toMatch(/none of them is a green light/i);
  });

  test('any non-eligible mix never reads as a clearance to file', () => {
    for (const combo of [['waiting'], ['complex'], ['waiting', 'complex'], ['ineligible', 'complex']]) {
      const panel = remedyPanelCopy(combo.map(r));
      expect(panel.note, `combo ${combo.join('+')} must caveat`).not.toBeNull();
    }
  });

  test('ineligible records are dropped from the "Shown for" list', () => {
    const records = [r('ineligible'), r('complex'), r('eligible')];
    expect(actionableRecords(records).map(x => x.resultStatus)).toEqual(['complex', 'eligible']);
  });

  test('isActionable / statusLabel cover all four statuses', () => {
    expect(['eligible', 'waiting', 'complex'].every(isActionable)).toBe(true);
    expect(isActionable('ineligible')).toBe(false);
    expect(statusLabel('eligible')).toBe('appears eligible');
    expect(statusLabel('waiting')).toBe('not yet');
    expect(statusLabel('complex')).toBe('needs a person');
  });
});

describe('AZ DUI — the live case that surfaced the bug', () => {
  // A DUI walks the AZ tree to complex_dui_az, whose own copy says the § 13-905
  // set-aside "is worth pursuing either way". Under the old 'eligible'-only gate
  // the set-aside form, its steps, and its $0 filing fee were all suppressed.
  //
  // Traced from startNode 'disposition', not copied from a run:
  //   disposition (field:disposition='convicted') -> excluded_setaside_az
  //   excluded_setaside_az (asked, false: not on the § 13-905(P) list) -> marijuana_offense
  //   marijuana_offense (asked, false) -> dui_offense
  //   dui_offense (asked, TRUE) -> complex_dui_az
  //
  // Asserting the result KEY, not just the status: AZ has several 'complex'
  // results (unknown_disposition, unknown_deferred), so a status-only assertion
  // would pass on a tree that never reached the DUI branch at all.
  const NOW = new Date('2026-07-23');

  const keyOf = (result: unknown): string =>
    Object.entries(fallbackRules['AZ'].rules.results).find(([, r]) => r === result)?.[0]
    ?? '(hardcoded fallback — the tree could not classify this)';

  const duiResult = () => {
    const record: ConvictionRecord = {
      id: 'dui', state: 'AZ', title: 'DUI', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-01-01',
      probation_status: 'completed', prison_sentenced: false,
      restitution_paid: true, fines_paid: true,
    };
    const answers = { excluded_setaside_az: false, marijuana_offense: false, dui_offense: true };
    return evaluate(fallbackRules['AZ'], answers, record, NOW);
  };

  test('a DUI reaches complex_dui_az specifically', () => {
    expect(keyOf(duiResult())).toBe('complex_dui_az');
    expect(duiResult().status).toBe('complex');
  });

  test('the DUI result copy points at the set-aside — the form must not be hidden', () => {
    expect(duiResult().message).toMatch(/set-aside/i);
  });

  test('a DUI alone now gets the set-aside form panel', () => {
    const panel = remedyPanelCopy([{ resultStatus: duiResult().status }]);
    expect(panel.show).toBe(true);
    expect(panel.note).not.toBeNull();   // shown, but never as a green light
  });

  test('the live intake map can actually reach the DUI branch', () => {
    // Guards the other half of "no form for a DUI": if intake never supplies
    // dui_offense, the branch is unreachable no matter what the panel does.
    expect(intakeMaps['AZ'].derived?.dui_offense).toBeTruthy();
    const answers = answersForState('AZ', { offenseCategory: 'dui' } as never, {});
    expect(answers['dui_offense']).toBe(true);
  });

  test('the AZ set-aside form the panel reveals is actually populated', () => {
    const setAside = fallbackRules['AZ'].resources.remedies['set_aside'];
    expect(setAside.formName).toBeTruthy();
    expect(setAside.formUrl).toBeTruthy();
    expect(setAside.steps.length).toBeGreaterThan(0);
    expect(setAside.fees).toMatch(/\$0/);   // § 13-905(B) — no filing fee
  });
});

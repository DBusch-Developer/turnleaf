"use client";

import React, { useState, useEffect } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import { currentNode, isAsked, type Answers } from '../data/rulesEngine';
import { groupByState, screenAll, type ScreeningResultItem } from '../data/multiState';
import type { ConvictionRecord } from '../data/screening';
import type { IntakeProfile, OffenseCategory, Disposition } from '../data/intake';
import { answersForState } from '../data/intakeMaps';
import { sharedFieldsFor, stateFieldsFor, CHARGE_TYPE_OPTIONS, DISPOSITION_OPTIONS, type SharedFieldKey } from '../data/intakeForm';
import { Trash2, AlertTriangle, Plus, ClipboardList, HelpCircle } from 'lucide-react';
import { useScrollToTop } from '../utils/useScrollToTop';

// ConvictionRecord now lives in the data layer, alongside the field domains the
// validator checks against. Re-exported because half the app imports it here.
export type { ConvictionRecord };

interface EligibilityWizardProps {
  configs: Record<string, StateRuleConfig>;
  prepopulatedRecords: ConvictionRecord[];
  onScreeningComplete: (results: ScreeningResultItem[], records: ConvictionRecord[]) => void;
  onReset: () => void;
}

// Factored out of the record constructors below: inlining Math.random() into
// an object literal built inside a closure that captures a render-scoped
// value (e.g. a groupByState `group.state`) trips the React Compiler's
// purity check, which otherwise doesn't fire for a no-arg closure. Same call,
// same behavior — just named, so the checker doesn't flag it.
const makeRecordId = () => Math.random().toString(36).substr(2, 9);

// The profile is the facts about ONE charge, asked once. Its defaults describe
// the commonest case (a completed conviction) so an untouched field is a stated
// value, not a guess the person never made — the checkpoint still lets them fix
// it before anything is screened.
const emptyProfile: IntakeProfile = {
  offenseCategory: 'other', disposition: 'convicted', chargeType: 'misdemeanor',
  sentenceCompleted: true, dischargeDate: null, priorFelony: false, restitutionPaid: true,
};

const OFFENSE_CATEGORY_OPTIONS: { label: string; value: OffenseCategory }[] = [
  { label: 'DUI / impaired driving', value: 'dui' },
  { label: 'Marijuana', value: 'marijuana' },
  { label: 'Other drug offense', value: 'drug' },
  { label: 'Sex offense', value: 'sex_offense' },
  { label: 'Violent offense', value: 'violent' },
  { label: 'Property offense', value: 'property' },
  { label: 'Other', value: 'other' },
];
const SHARED_FIELD_LABELS: Record<SharedFieldKey, string> = {
  offenseCategory: 'Type of offense',
  disposition: 'Outcome / Disposition',
  chargeType: 'Misdemeanor or felony?',
  sentenceCompleted: 'Sentence fully completed (probation, jail, fines)?',
  dischargeDate: 'Date sentence fully completed / discharged',
  priorFelony: 'Any prior felony conviction?',
  restitutionPaid: 'All fines & restitution paid?',
};

const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' };

export default function EligibilityWizard({
  configs,
  prepopulatedRecords,
  onScreeningComplete,
  onReset
}: EligibilityWizardProps) {
  const configFor = (r: ConvictionRecord) => configs[r.state];
  const states = Object.values(configs);

  const [records, setRecords] = useState<ConvictionRecord[]>([]);

  // Per-charge intake, keyed by record id — never one profile shared across a
  // state or a session. A charge lives in one state; a person can have several.
  const [profiles, setProfiles] = useState<Record<string, IntakeProfile>>({});           // recordId -> profile
  const [stateFieldValues, setStateFieldValues] = useState<Record<string, Record<string, string>>>({}); // recordId -> {fieldKey: value}
  const profileOf = (id: string): IntakeProfile => profiles[id] ?? emptyProfile;
  const setProfileField = <K extends keyof IntakeProfile>(id: string, k: K, v: IntakeProfile[K]) =>
    setProfiles(p => ({ ...p, [id]: { ...profileOf(id), [k]: v } }));
  const setStateFieldValue = (id: string, key: string, value: string) =>
    setStateFieldValues(s => ({ ...s, [id]: { ...(s[id] ?? {}), [key]: value } }));

  // California reads probation_status and prison_sentenced as FIELD-BACKED nodes
  // (fallbackRules CA `prison_sentence` / `probation_status`): field-backed nodes
  // are auto-read from the record and never asked, and CA has no intake map to
  // prefill them. So they must be collected on the record directly, or a CA charge
  // sentenced to prison / on active probation would be read from frozen defaults
  // and silently mis-screened. These are NOT profile facts (not on IntakeProfile) —
  // they are record fields only California consumes; kept per record id, CA-only.
  const [caFields, setCaFields] = useState<Record<string, { probation_status: ConvictionRecord['probation_status']; prison_sentenced: boolean }>>({});
  const caFieldsOf = (id: string) => caFields[id] ?? { probation_status: 'completed' as const, prison_sentenced: false };
  const setCaField = <K extends 'probation_status' | 'prison_sentenced'>(id: string, k: K, v: { probation_status: ConvictionRecord['probation_status']; prison_sentenced: boolean }[K]) =>
    setCaFields(s => ({ ...s, [id]: { ...caFieldsOf(id), [k]: v } }));

  /** Answers to ASKED nodes, per record id: { [recordId]: { [nodeId]: answer } }.
   *  Declared before the prepopulated-records effect that seeds it. */
  const [answers, setAnswers] = useState<Record<string, Answers>>({});

  const [checkpointVerified, setCheckpointVerified] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [showRapSheetInstructions, setShowRapSheetInstructions] = useState(false);

  // The checkpoint replaces the whole record form, so it is a screen change in
  // everything but routing — start it at the top like any other.
  useScrollToTop(showCheckpoint);

  // An empty charge for a given state. Every seeded/added record is built here
  // so a record always carries the state whose group it sits in.
  const makeEmptyRecord = (stateCode: string): ConvictionRecord => ({
    id: makeRecordId(),
    state: stateCode,
    title: '',
    charge_type: 'misdemeanor',
    disposition: 'convicted',
    disposition_date: new Date().toISOString().split('T')[0],
    probation_status: 'completed',
    prison_sentenced: false,
    restitution_paid: true
  });

  // Sync prepopulated records (from Checkr panel), else seed ONE empty charge
  // per selected state so every state opens with its own group (and its own
  // "Add charge in {state}" button). A single-state session seeds one record,
  // exactly as before; a CA+TX session seeds a CA group and a TX group.
  useEffect(() => {
    if (prepopulatedRecords.length > 0) {
      // Only seed records whose state is actually screenable here. A record for
      // an in-research state has no config in `configs` (configFor → undefined,
      // which would crash screenRecord / configs[group.state].name); that state
      // is represented by its in-research note on the page, not screened here.
      const screenable = prepopulatedRecords.filter(r => configs[r.state]);
      setRecords(screenable);
      // Seed each Checkr charge from the facts the report carries (disposition,
      // class, date, restitution). What the report does NOT carry — offense
      // category, fine class, prior felony, sentence-complete — is simply not
      // prefilled, so it falls to that charge's short tail and gets asked at the
      // checkpoint, the same graceful path an unmapped state uses.
      const seeded: Record<string, Answers> = {};
      for (const r of screenable) {
        const p: IntakeProfile = {
          ...emptyProfile,
          disposition: r.disposition as Disposition,
          chargeType: r.charge_type === 'felony' ? 'felony' : 'misdemeanor',
          dischargeDate: r.disposition_date,
          restitutionPaid: r.restitution_paid,
        };
        seeded[r.id] = answersForState(r.state, p, {});
      }
      setAnswers(seeded);
      setShowCheckpoint(true); // Auto-advance to checkpoint for quick demo
    } else if (records.length === 0) {
      setRecords(states.map(s => makeEmptyRecord(s.code)));
    }
  }, [prepopulatedRecords]);

  const addRecordForState = (stateCode: string) => {
    setRecords([...records, makeEmptyRecord(stateCode)]);
  };

  const removeRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const updateRecord = (id: string, field: keyof ConvictionRecord, value: any) => {
    setRecords(records.map(r => {
      if (r.id === id) {
        // If they select "unknown", trigger instructions toggle
        if ((field === 'charge_type' || field === 'disposition') && value === 'unknown') {
          setShowRapSheetInstructions(true);
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  // The engine lives in src/data/rulesEngine.ts and is tested there. This
  // component asks questions and shows answers; it does not decide anything.

  /** The question a record is currently sitting on, if any. */
  const pendingFor = (record: ConvictionRecord) =>
    currentNode(configFor(record), answers[record.id] ?? {}, record);

  /** Every record that still needs a person to answer something. */
  const pending = records
    .map(r => ({ record: r, step: pendingFor(r) }))
    .filter((x): x is { record: ConvictionRecord; step: NonNullable<ReturnType<typeof pendingFor>> } =>
      x.step !== null && isAsked(x.step.node));

  const answerNode = (recordId: string, nodeId: string, value: string | boolean) => {
    setAnswers(prev => ({ ...prev, [recordId]: { ...(prev[recordId] ?? {}), [nodeId]: value } }));
  };

  const handleScreening = () => {
    const results = screenAll(configs, answers, records);
    onScreeningComplete(results, records);
  };

  // Review & Submit: fold each CHARGE's profile onto its record and pre-seed
  // that charge's answers. Iterate records (charges), not states — a state may
  // hold several charges, each with its own profile. Pre-seeding means each
  // charge's `pending` naturally contains only its unmapped tail nodes.
  const onSubmitIntake = () => {
    const seeded: Record<string, Answers> = {};
    const updated = records.map(r => {
      const p = profileOf(r.id);
      seeded[r.id] = answersForState(r.state, p, stateFieldValues[r.id] ?? {});
      return {
        ...r,
        disposition: p.disposition,
        charge_type: p.chargeType,
        disposition_date: p.dischargeDate ?? r.disposition_date,
        restitution_paid: p.restitutionPaid,
        // California-only field-backed nodes (see caFields note above). For
        // every other state these keep their existing values, unchanged.
        probation_status: caFields[r.id]?.probation_status ?? r.probation_status,
        prison_sentenced: caFields[r.id]?.prison_sentenced ?? r.prison_sentenced,
      };
    });
    setRecords(updated);
    setAnswers(seeded);
    setShowCheckpoint(true);
  };

  // One labeled control for a shared profile field on a given charge: a select
  // for the enumerated facts, Yes/No pills for the booleans, a date input for
  // the discharge date. Wired to that record's profile via profileOf/setProfileField.
  const renderSharedField = (record: ConvictionRecord, key: SharedFieldKey) => {
    const p = profileOf(record.id);
    const label = <label style={labelStyle}>{SHARED_FIELD_LABELS[key]}</label>;

    if (key === 'offenseCategory') {
      return (
        <div key={key}>
          {label}
          <select className="input-field" value={p.offenseCategory}
            onChange={e => setProfileField(record.id, 'offenseCategory', e.target.value as OffenseCategory)}>
            {OFFENSE_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (key === 'disposition') {
      return (
        <div key={key}>
          {label}
          <select className="input-field" value={p.disposition}
            onChange={e => {
              const v = e.target.value as IntakeProfile['disposition'];
              // "unknown" is the honest not-sure path — surface the RAP-sheet
              // helper, exactly as the old form did via updateRecord.
              if (v === 'unknown') setShowRapSheetInstructions(true);
              setProfileField(record.id, 'disposition', v);
            }}>
            {DISPOSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (key === 'chargeType') {
      return (
        <div key={key}>
          {label}
          <select className="input-field" value={p.chargeType}
            onChange={e => {
              const v = e.target.value as IntakeProfile['chargeType'];
              if (v === 'unknown') setShowRapSheetInstructions(true);
              setProfileField(record.id, 'chargeType', v);
            }}>
            {CHARGE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (key === 'dischargeDate') {
      return (
        <div key={key}>
          {label}
          <input type="date" className="input-field" value={p.dischargeDate ?? ''}
            onChange={e => setProfileField(record.id, 'dischargeDate', e.target.value || null)} />
        </div>
      );
    }
    // The three booleans: sentenceCompleted / priorFelony / restitutionPaid.
    const boolKey = key as 'sentenceCompleted' | 'priorFelony' | 'restitutionPaid';
    const current = p[boolKey];
    return (
      <div key={key}>
        {label}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.5rem 1.1rem', fontSize: '0.9rem',
                opacity: current === opt.value ? 1 : 0.55,
                fontWeight: current === opt.value ? 700 : 400,
              }}
              onClick={() => setProfileField(record.id, boolKey, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>STATE SELECTED</span>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-text)' }}>{states.length === 1 ? `${states[0].name} Eligibility Wizard` : 'Multi-State Eligibility Wizard'}</h2>
        </div>
        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onReset}>
          Change State
        </button>
      </div>

      {!showCheckpoint ? (
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
            Enter your conviction details:
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {groupByState(records, r => r.state).map(group => (
              <div key={group.state} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {states.length > 1 && (
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', margin: '0.5rem 0' }}>
                    {configs[group.state].name}
                  </h4>
                )}
                {group.items.map((record) => {
                  const index = records.indexOf(record);
                  return (
              <div
                key={record.id}
                style={{
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  background: 'rgba(255,255,255,0.4)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    RECORD #{index + 1}
                  </span>
                  {records.length > 1 && (
                    <button 
                      onClick={() => removeRecord(record.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>

                {/* Per-CHARGE profile form: shared facts (asked once) plus any
                    per-state dropdown (e.g. Arizona's offense class), all wired
                    to this record's own profile. On submit these seed the tree
                    walk so a prefilled node's card never shows at the checkpoint. */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>
                      Charge Name <span style={{ fontWeight: 400, color: 'var(--color-text-light)' }}>(optional label)</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Petty Theft, Possession"
                      value={record.title}
                      onChange={(e) => updateRecord(record.id, 'title', e.target.value)}
                    />
                  </div>

                  {sharedFieldsFor([record.state]).map(key => renderSharedField(record, key))}

                  {stateFieldsFor([record.state]).map(({ spec, options }) => (
                    <div key={spec.key}>
                      <label style={labelStyle}>{spec.label}</label>
                      <select
                        className="input-field"
                        value={stateFieldValues[record.id]?.[spec.key] ?? ''}
                        onChange={(e) => setStateFieldValue(record.id, spec.key, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}

                  {/* California-only: probation_status and prison_sentenced are
                      field-backed CA nodes with no intake map to prefill them, so
                      they must be collected on the record or the CA tree reads
                      frozen defaults and mis-screens. Shown only for CA — no other
                      state reads these fields. */}
                  {record.state === 'CA' && (
                    <>
                      <div>
                        <label style={labelStyle}>Probation Status</label>
                        <select
                          className="input-field"
                          value={caFieldsOf(record.id).probation_status}
                          onChange={(e) => setCaField(record.id, 'probation_status', e.target.value as ConvictionRecord['probation_status'])}
                        >
                          <option value="completed">Completed Successfully</option>
                          <option value="none">No Probation Sentenced</option>
                          <option value="failed">Did Not Complete Successfully</option>
                          <option value="active">Active (Still on Probation)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input
                          type="checkbox"
                          id={`prison-${record.id}`}
                          checked={caFieldsOf(record.id).prison_sentenced}
                          onChange={(e) => setCaField(record.id, 'prison_sentenced', e.target.checked)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <label htmlFor={`prison-${record.id}`} style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                          Sentenced to state prison?
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
                  );
                })}
                <button className="btn btn-outline" onClick={() => addRecordForState(group.state)}>
                  <Plus size={16} /> Add charge in {configs[group.state].name}
                </button>
              </div>
            ))}
          </div>

          {/* RAP Sheet retrieval instructions panel (FR-4) */}
          {showRapSheetInstructions && (
            <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '0.2rem' }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Need to request your official records?
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
                    Eligibility relies on exact dates, charge types, and outcomes. If you do not have your records:
                  </p>
                  {/* State-NEUTRAL guidance: a multi-state session must never
                      name one state's repository as if it were the person's.
                      The referral is listed once PER screened state, so a TX
                      charge never sees California's legal-aid link. */}
                  <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li><strong>In your state:</strong> Request your official criminal history report (RAP Sheet) from the state repository.</li>
                    {/* Only offer the fee-waiver referral when a screened state
                        actually has a legal-aid link — otherwise "contact:"
                        dangles over an empty list. */}
                    {states.some(s => s.resources.legalAid[0]) && (
                      <li>
                        For help obtaining fee waivers to get your records, contact:
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {states
                            .filter(s => s.resources.legalAid[0])
                            .map(s => (
                              <li key={s.code}>
                                {states.length > 1 && <strong>{s.name}: </strong>}
                                <a href={s.resources.legalAid[0].url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 600 }}>{s.resources.legalAid[0].name}</a>
                              </li>
                            ))}
                        </ul>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Adding a charge is per-group ("Add charge in {state}") so it lands
              in the right state. A global add button here duplicated that and,
              multi-state, always added to the first state — removed. */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onSubmitIntake}>
              Review & Submit
            </button>
          </div>
        </div>
      ) : (
        /* Pre-result Checkpoint Verification (FR-5 / R8 Safety Layer) */
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-primary-light)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-primary-border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
              <ClipboardList size={20} /> Pre-Screening Review Checkpoint
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Please review the details below. Expungement screenings are highly sensitive to charges, dates, and sentences. Check this against your official court papers.
            </p>
          </div>

          {/* The tree's own questions.
             *
             * These come from the rule data — node.text and node.options,
             * verbatim. There is no second list of questions in this file, and
             * that is deliberate: a hand-maintained copy of the legal questions
             * is what drifts from the law. Whatever a state's statutes turn on
             * (Arizona's offence classes, New Jersey's indictable offences),
             * the tree asks it and this renders it, with no code per state.
             *
             * A node is asked ONLY when the record cannot already answer it. */}
          {pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pending.map(({ record, step }) => (
                <div
                  key={record.id}
                  style={{
                    border: '1px solid var(--color-primary-border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: 'var(--color-card-bg)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <HelpCircle size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        {record.title || 'Unnamed charge'}
                      </p>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {step.node.text}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {/* A date node asks for ITS OWN anchor date. The form's one
                        date is the disposition date, and most waiting periods do
                        not run from it — Arizona's runs from absolute discharge,
                        New York's from sentencing-or-release whichever is later.
                        The node's text says which date it wants, in the state's
                        own language. */}
                    {step.node.type === 'date' ? (
                      <input
                        type="date"
                        className="input-field"
                        style={{ maxWidth: '220px' }}
                        value={typeof answers[record.id]?.[step.id] === 'string' ? String(answers[record.id][step.id]) : ''}
                        onChange={(e) => answerNode(record.id, step.id, e.target.value)}
                      />
                    ) : step.node.type === 'boolean' ? (
                      [{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                        <button
                          key={String(opt.value)}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}
                          onClick={() => answerNode(record.id, step.id, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))
                    ) : (
                      (step.node.options ?? []).map(opt => (
                        <button
                          key={opt.value}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 1.1rem', fontSize: '0.9rem', textAlign: 'left' }}
                          onClick={() => answerNode(record.id, step.id, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-card-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Charge</th>
                <th style={{ padding: '0.5rem' }}>Class</th>
                <th style={{ padding: '0.5rem' }}>Disposition</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.title || 'Unnamed Charge'}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{r.charge_type}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{r.disposition}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{r.disposition_date}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            background: 'var(--color-error-bg)',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--color-error)'
          }}>
            <input 
              type="checkbox" 
              id="confirm-records"
              checked={checkpointVerified}
              onChange={(e) => setCheckpointVerified(e.target.checked)}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', marginTop: '0.1rem' }}
            />
            <label htmlFor="confirm-records" style={{ fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500 }}>
              I confirm that these details match my official records (like a court disposition sheet or criminal history report). I understand that incorrect entries will yield incorrect results.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setShowCheckpoint(false)}>
              Back to Edit
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleScreening}
              disabled={!checkpointVerified || pending.length > 0}
              style={{ opacity: checkpointVerified && pending.length === 0 ? 1 : 0.6 }}
            >
              Generate Eligibility Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

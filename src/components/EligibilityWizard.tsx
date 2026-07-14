"use client";

import React, { useState, useEffect } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import { Trash2, AlertTriangle, Plus, ClipboardList } from 'lucide-react';

export interface ConvictionRecord {
  id: string;
  title: string;
  charge_type: 'misdemeanor' | 'felony' | 'infraction' | 'unknown';
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted' | 'unknown';
  disposition_date: string;
  probation_status: 'completed' | 'failed' | 'active' | 'none';
  prison_sentenced: boolean;
  restitution_paid: boolean;
}

interface EligibilityWizardProps {
  stateConfig: StateRuleConfig;
  prepopulatedRecords: ConvictionRecord[];
  onScreeningComplete: (results: any[], records: ConvictionRecord[]) => void;
  onReset: () => void;
}

export default function EligibilityWizard({
  stateConfig,
  prepopulatedRecords,
  onScreeningComplete,
  onReset
}: EligibilityWizardProps) {
  const [records, setRecords] = useState<ConvictionRecord[]>([]);
  const [checkpointVerified, setCheckpointVerified] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [showRapSheetInstructions, setShowRapSheetInstructions] = useState(false);

  // Sync prepopulated records (from Checkr panel)
  useEffect(() => {
    if (prepopulatedRecords.length > 0) {
      setRecords(prepopulatedRecords);
      setShowCheckpoint(true); // Auto-advance to checkpoint for quick demo
    } else if (records.length === 0) {
      addEmptyRecord();
    }
  }, [prepopulatedRecords]);

  const addEmptyRecord = () => {
    const newRecord: ConvictionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      charge_type: 'misdemeanor',
      disposition: 'convicted',
      disposition_date: new Date().toISOString().split('T')[0],
      probation_status: 'completed',
      prison_sentenced: false,
      restitution_paid: true
    };
    setRecords([...records, newRecord]);
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

  // The Deterministic Rules Engine (FR-6)
  const evaluateRecord = (record: ConvictionRecord) => {
    let currentNodeId = stateConfig.rules.startNode;
    const nodes = stateConfig.rules.nodes;
    const results = stateConfig.rules.results;
    let steps = 0;

    while (steps < 30) {
      steps++;
      
      // If we land directly on a result key
      if (results[currentNodeId]) {
        return results[currentNodeId];
      }

      const node = nodes[currentNodeId];
      if (!node) {
        break;
      }

      if (currentNodeId === 'offense_level') {
        const match = node.options?.find(o => o.value === record.charge_type);
        currentNodeId = match ? match.next : 'complex';
        continue;
      }

      if (currentNodeId === 'prison_sentence' || currentNodeId === 'offense_type') {
        currentNodeId = record.prison_sentenced ? (node.yes || 'complex') : (node.no || 'complex');
        continue;
      }

      if (currentNodeId === 'disposition') {
        const val = record.disposition === 'convicted' ? 'convicted' : 'dismissed';
        const match = node.options?.find(o => o.value === val);
        currentNodeId = match ? match.next : 'complex';
        continue;
      }

      if (currentNodeId === 'probation_status') {
        const match = node.options?.find(o => o.value === record.probation_status);
        currentNodeId = match ? match.next : 'complex';
        continue;
      }

      if (
        currentNodeId === 'completion_date' ||
        currentNodeId === 'sentence_completion_date' ||
        currentNodeId === 'sentence_date' ||
        currentNodeId === 'sentence_date_tx_felony_deferred' ||
        currentNodeId === 'sentence_date_tx_dismissal'
      ) {
        const yearsRequired = node.validation?.yearsRequired || 1;
        const dispDate = new Date(record.disposition_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - dispDate.getTime());
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        if (isNaN(diffYears)) {
          currentNodeId = node.validation?.nextFail || 'complex';
        } else if (diffYears >= yearsRequired) {
          currentNodeId = node.validation?.nextPass || 'complex';
        } else {
          currentNodeId = node.validation?.nextFail || 'complex';
        }
        continue;
      }

      if (currentNodeId === 'dangerous_offense') {
        const isDangerous = record.title.toLowerCase().includes('assault') ||
                            record.title.toLowerCase().includes('violent') ||
                            record.title.toLowerCase().includes('sexual') ||
                            record.title.toLowerCase().includes('robbery');
        currentNodeId = isDangerous ? (node.yes || 'complex') : (node.no || 'complex');
        continue;
      }

      if (currentNodeId === 'sentence_completed') {
        currentNodeId = (record.probation_status === 'completed' || record.probation_status === 'none') 
          ? (node.yes || 'complex') 
          : (node.no || 'complex');
        continue;
      }

      if (currentNodeId === 'conviction_count') {
        // Evaluate based on total conviction count in records list
        const totalConvictions = records.filter(r => r.disposition === 'convicted').length;
        if (totalConvictions <= 2) {
          currentNodeId = node.options?.[0].next || 'complex';
        } else {
          currentNodeId = node.options?.[1].next || 'complex';
        }
        continue;
      }

      if (currentNodeId === 'check_dismissal') {
        currentNodeId = (record.disposition === 'dismissed' || record.disposition === 'acquitted') 
          ? (node.yes || 'complex') 
          : (node.no || 'complex');
        continue;
      }

      if (currentNodeId === 'disposition_type') {
        const match = node.options?.find(o => o.value === record.disposition);
        currentNodeId = match ? match.next : 'ineligible_conviction';
        continue;
      }

      if (currentNodeId === 'dismissal_type') {
        const val = record.disposition === 'acquitted' ? 'acquitted' : 'dropped';
        const match = node.options?.find(o => o.value === val);
        currentNodeId = match ? match.next : 'ineligible_conviction';
        continue;
      }

      // Default safety break
      break;
    }

    // Default Fallback Result
    return {
      status: 'complex',
      title: 'Complex Analysis Required',
      message: 'Based on the legal rules for this state, your conviction has attributes requiring individual manual review by a legal aid attorney.',
      remedy: 'Legal Aid Intake Evaluation',
      citation: 'General State Sealing Statutes'
    };
  };

  const handleScreening = () => {
    const results = records.map(r => {
      const evaluation = evaluateRecord(r);
      return {
        recordId: r.id,
        title: r.title || 'Unnamed Offense',
        charge_type: r.charge_type,
        disposition: r.disposition,
        resultStatus: evaluation.status,
        resultTitle: evaluation.title,
        resultMessage: evaluation.message,
        remedy: evaluation.remedy,
        citation: evaluation.citation
      };
    });
    onScreeningComplete(results, records);
  };

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>STATE SELECTED</span>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-text)' }}>{stateConfig.name} Eligibility Wizard</h2>
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
            {records.map((record, index) => (
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Charge Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Petty Theft, Possession" 
                      value={record.title}
                      onChange={(e) => updateRecord(record.id, 'title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Offense Class</label>
                    <select 
                      className="input-field"
                      value={record.charge_type}
                      onChange={(e) => updateRecord(record.id, 'charge_type', e.target.value)}
                    >
                      <option value="misdemeanor">Misdemeanor</option>
                      <option value="felony">Felony</option>
                      <option value="infraction">Infraction</option>
                      <option value="unknown">I Don't Know / Not Sure</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Outcome / Disposition</label>
                    <select 
                      className="input-field"
                      value={record.disposition}
                      onChange={(e) => updateRecord(record.id, 'disposition', e.target.value)}
                    >
                      <option value="convicted">Convicted (Guilty / No Contest)</option>
                      <option value="dismissed">Dismissed / Charges Dropped</option>
                      <option value="deferred">Deferred Adjudication / Diversion</option>
                      <option value="acquitted">Acquitted (Not Guilty)</option>
                      <option value="unknown">I Don't Know / Not Sure</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Disposition / Sentence Date</label>
                    <input 
                      type="date" 
                      className="input-field"
                      value={record.disposition_date}
                      onChange={(e) => updateRecord(record.id, 'disposition_date', e.target.value)}
                    />
                  </div>
                </div>

                {/* Conditional Fields based on State selection */}
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-card-border)' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Probation Status</label>
                    <select 
                      className="input-field"
                      value={record.probation_status}
                      onChange={(e) => updateRecord(record.id, 'probation_status', e.target.value)}
                    >
                      <option value="completed">Completed Successfully</option>
                      <option value="none">No Probation Sentenced</option>
                      <option value="failed">Did Not Complete Successfully</option>
                      <option value="active">Active (Still on Probation)</option>
                    </select>
                  </div>

                  {stateConfig.code === 'CA' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input 
                        type="checkbox" 
                        id={`prison-${record.id}`}
                        checked={record.prison_sentenced}
                        onChange={(e) => updateRecord(record.id, 'prison_sentenced', e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                      <label htmlFor={`prison-${record.id}`} style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                        Sentenced to state prison?
                      </label>
                    </div>
                  )}

                  {stateConfig.code === 'AZ' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input 
                        type="checkbox" 
                        id={`restitution-${record.id}`}
                        checked={record.restitution_paid}
                        onChange={(e) => updateRecord(record.id, 'restitution_paid', e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                      <label htmlFor={`restitution-${record.id}`} style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                        All fines & restitution paid?
                      </label>
                    </div>
                  )}
                </div>
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
                  <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li><strong>In {stateConfig.name}:</strong> Request your official criminal history report (RAP Sheet) from the state repository.</li>
                    <li>For help obtaining fee waivers to get your records, contact: <a href={stateConfig.resources.legalAid[0].url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 600 }}>{stateConfig.resources.legalAid[0].name}</a>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={addEmptyRecord}>
              <Plus size={16} /> Add Another Charge
            </button>
            <button className="btn btn-primary" onClick={() => setShowCheckpoint(true)}>
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
              disabled={!checkpointVerified}
              style={{ opacity: checkpointVerified ? 1 : 0.6 }}
            >
              Generate Eligibility Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { ConvictionRecord } from './EligibilityWizard';
import { X, ChevronDown, CheckCircle2, AlertTriangle, ArrowRight, Fingerprint, Search, ShieldCheck, Landmark } from 'lucide-react';

interface CheckrReportDemoProps {
  /** Hand the report's records to Turnleaf's screening engine. */
  onRunScreening: (records: ConvictionRecord[], stateCode: string) => void;
  onClose: () => void;
}

interface PersonaItem {
  id: string;
  name: string;
  description: string;
}

interface CheckrRecord {
  id: string;
  title: string;
  charge_type: 'misdemeanor' | 'felony' | 'infraction';
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted';
  disposition_date: string;
  state: string;
  probation_status?: 'completed' | 'failed' | 'active' | 'none';
  prison_sentenced?: boolean;
  restitution_paid?: boolean;
}

interface CheckrReport {
  id: string;
  status: 'clear' | 'consider';
  completed_at: string;
  candidate: { first_name: string; last_name: string; dob: string };
  records: CheckrRecord[];
}

// Coral is Checkr's own brand register; used only to evoke the source product in
// this clearly-labelled simulation. Not their logo, not their real data.
const CHECKR = '#EB5A3C';

const STATE_NAMES: Record<string, string> = {
  CA: 'California', TX: 'Texas', AZ: 'Arizona', NY: 'New York', FL: 'Florida',
  IL: 'Illinois', OH: 'Ohio', NH: 'New Hampshire', SD: 'South Dakota',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso: string): string => {
  const p = iso.slice(0, 10).split('-');
  if (p.length !== 3) return iso;
  return `${MONTHS[parseInt(p[1], 10) - 1]} ${parseInt(p[2], 10)}, ${p[0]}`;
};
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export default function CheckrReportDemo({ onRunScreening, onClose }: CheckrReportDemoProps) {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loaded, setLoaded] = useState<{ id: string; report: CheckrReport } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/mock-checkr/reports');
        if (res.ok) {
          const list: PersonaItem[] = await res.json();
          setPersonas(list);
          if (list.length) setSelectedId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load Checkr personas:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mock-checkr/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId: selectedId }),
        });
        if (res.ok && !cancelled) setLoaded({ id: selectedId, report: await res.json() });
      } catch (err) {
        console.error('Failed to load Checkr report:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // Derived (not stored) so we never setState synchronously in an effect: a
  // report counts as current only when it matches the selected persona.
  const report = loaded && loaded.id === selectedId ? loaded.report : null;
  const loading = !report;

  const runScreening = () => {
    if (!report) return;
    const records: ConvictionRecord[] = report.records.map((r, i) => ({
      id: r.id || `rec_${i}`,
      title: r.title,
      charge_type: r.charge_type,
      disposition: r.disposition,
      disposition_date: r.disposition_date,
      probation_status: r.probation_status || 'none',
      prison_sentenced: r.prison_sentenced || false,
      restitution_paid: r.restitution_paid !== undefined ? r.restitution_paid : true,
    }));
    onRunScreening(records, report.records[0]?.state || 'CA');
  };

  const consider = report?.status === 'consider';
  const screenings = [
    { label: 'SSN Trace', Icon: Fingerprint, clear: true },
    { label: 'Sex Offender Registry', Icon: ShieldCheck, clear: true },
    { label: 'National Criminal Search', Icon: Search, clear: !consider },
    { label: 'County Criminal Search', Icon: Landmark, clear: !consider },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto',
      background: 'var(--color-bg)',
    }}>
      {/* Product top bar — reads as "a different product than Turnleaf" */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.85rem 1.25rem', background: '#fff',
        borderBottom: '1px solid var(--color-card-border)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.35rem',
          color: CHECKR, letterSpacing: '-0.03em',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 8, background: CHECKR, color: '#fff',
          }}>
            <CheckCircle2 size={17} strokeWidth={2.5} />
          </span>
          Checkr
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Background Check
        </span>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)',
          border: '1px solid var(--color-card-border)', borderRadius: 9999, padding: '0.2rem 0.55rem',
        }}>
          Simulated demo
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'transparent', border: '1px solid var(--color-card-border)', borderRadius: 10,
            padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem',
          }}>
          <X size={16} /> Back to Turnleaf
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
        {/* Candidate switcher */}
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-light)', marginBottom: '0.4rem' }}>
          Candidate report
        </label>
        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 420 }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              width: '100%', appearance: 'none', fontSize: '0.95rem', fontFamily: 'var(--font-body)',
              padding: '0.6rem 2.2rem 0.6rem 0.85rem', borderRadius: 12,
              border: '1px solid var(--color-card-border)', background: '#fff', color: 'var(--color-text)', cursor: 'pointer',
            }}>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', pointerEvents: 'none' }} />
        </div>

        {loading || !report ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '3rem 0', textAlign: 'center' }}>Pulling report…</p>
        ) : (
          <>
            {/* Report header card */}
            <div style={{ background: '#fff', border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '1.25rem 1.4rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)' }}>
                    {report.candidate.first_name} {report.candidate.last_name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    DOB {fmtDate(report.candidate.dob)} · Report #{report.id.toUpperCase()} · Completed {fmtDate(report.completed_at)}
                  </div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.03em', textTransform: 'uppercase',
                  color: consider ? '#B45309' : 'var(--color-success)',
                  background: consider ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                  border: `1px solid ${consider ? 'rgba(180,83,9,0.25)' : 'rgba(30,130,76,0.25)'}`,
                  borderRadius: 9999, padding: '0.35rem 0.8rem',
                }}>
                  {consider ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  {consider ? 'Consider' : 'Clear'}
                </span>
              </div>

              {/* Screening checklist */}
              <div style={{ marginTop: '1.1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.5rem' }}>
                {screenings.map(({ label, Icon, clear }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.82rem', color: 'var(--color-text)', padding: '0.5rem 0.65rem', border: '1px solid var(--color-card-border)', borderRadius: 10, background: 'var(--color-bg)' }}>
                    <Icon size={16} style={{ color: 'var(--color-text-light)', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {clear
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-success)', fontWeight: 700, fontSize: '0.72rem' }}><CheckCircle2 size={13} /> Clear</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#B45309', fontWeight: 700, fontSize: '0.72rem' }}><AlertTriangle size={13} /> Consider</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Records */}
            <div style={{ margin: '1.5rem 0 0.6rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-light)' }}>
              Records found ({report.records.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {report.records.map((r) => {
                const isConviction = r.disposition === 'convicted' || r.disposition === 'deferred';
                return (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid var(--color-card-border)', borderLeft: `4px solid ${isConviction ? CHECKR : 'var(--color-success)'}`, borderRadius: 12, padding: '0.9rem 1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.98rem' }}>{r.title}</div>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        color: isConviction ? '#B45309' : 'var(--color-success)',
                        background: isConviction ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                        borderRadius: 9999, padding: '0.15rem 0.5rem',
                      }}>{isConviction ? 'Consider' : 'Clear'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      <span><strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{cap(r.charge_type)}</strong></span>
                      <span>Disposition: {cap(r.disposition)}</span>
                      <span>{fmtDate(r.disposition_date)}</span>
                      <span>{STATE_NAMES[r.state] || r.state} jurisdiction</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Turnleaf handoff — the pitch: barrier -> path forward */}
            <div style={{
              marginTop: '1.75rem', background: 'var(--color-primary-light)',
              border: '1px solid var(--color-card-border)', borderRadius: 16, padding: '1.4rem 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 260, flex: 1 }}>
                <img src="/logo-leaf.png" alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '1.05rem' }}>
                    A record isn&rsquo;t always permanent.
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    Turnleaf can screen {report.candidate.first_name}&rsquo;s record for clearing eligibility — using this same report.
                  </div>
                </div>
              </div>
              <button
                onClick={runScreening}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.2rem', borderRadius: 12, whiteSpace: 'nowrap' }}>
                See how Turnleaf can help <ArrowRight size={18} />
              </button>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--color-text-light)', textAlign: 'center', lineHeight: 1.5 }}>
              Simulated demonstration for illustrative purposes. Not real background-check data, and not affiliated with, sponsored by, or endorsed by Checkr, Inc.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

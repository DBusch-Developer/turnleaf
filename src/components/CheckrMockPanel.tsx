"use client";

import React, { useState, useEffect } from 'react';
import { ConvictionRecord } from './EligibilityWizard';
import { AlertCircle, UserCheck, X, ChevronRight, Settings } from 'lucide-react';

interface CheckrMockPanelProps {
  onLoadReport: (records: ConvictionRecord[], stateCode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface PersonaItem {
  id: string;
  name: string;
  description: string;
}

export default function CheckrMockPanel({
  onLoadReport,
  isOpen,
  onClose
}: CheckrMockPanelProps) {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await fetch('/api/mock-checkr/reports');
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);
        }
      } catch (err) {
        console.error('Failed to load personas:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersonas();
  }, []);

  const handleSelectPersona = async (id: string) => {
    setLoadingReportId(id);
    try {
      const res = await fetch('/api/mock-checkr/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: id })
      });
      if (res.ok) {
        const report = await res.json();
        
        // Map Checkr report data fields to Wizard fields (FR-22)
        const mappedRecords: ConvictionRecord[] = report.records.map((r: any) => ({
          id: r.id || Math.random().toString(36).substr(2, 9),
          title: r.title,
          charge_type: r.charge_type,
          disposition: r.disposition,
          disposition_date: r.disposition_date,
          probation_status: r.probation_status || 'none',
          prison_sentenced: r.prison_sentenced || false,
          restitution_paid: r.restitution_paid !== undefined ? r.restitution_paid : true
        }));

        // Determine dominant state from the records to auto-select state
        const primaryState = report.records[0]?.state || 'CA';
        onLoadReport(mappedRecords, primaryState);
        onClose();
      }
    } catch (err) {
      console.error('Failed to load mock report:', err);
    } finally {
      setLoadingReportId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '400px',
      background: 'var(--color-card-bg)',
      backdropFilter: 'blur(20px)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
      borderLeft: '1px solid var(--color-card-border)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '0.75rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--color-primary-dark)' }}>
          <Settings size={20} /> Developer Demo Center
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--color-card-border)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
          <UserCheck size={16} /> Simulate Checkr Background Check
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
          Select a test persona below to simulate fetching a real, structured background check report from Checkr. The mapper will auto-populate the eligibility engine and route you to the verification screen.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading test cases...</p>
        ) : (
          personas.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPersona(p.id)}
              disabled={loadingReportId !== null}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: '1rem',
                border: '1px solid var(--color-card-border)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.4)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-card-border)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                  {p.name}
                </span>
                {loadingReportId === p.id ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Loading...</span>
                ) : (
                  <ChevronRight size={16} style={{ color: 'var(--color-text-light)' }} />
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {p.description}
              </span>
            </button>
          ))
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-card-border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: 'var(--color-primary-dark)', flexShrink: 0, marginTop: '0.1rem' }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
          This panel is for Capstone judges and evaluators to quickly review state engine configurations without typing out criminal details manually.
        </span>
      </div>
    </div>
  );
}

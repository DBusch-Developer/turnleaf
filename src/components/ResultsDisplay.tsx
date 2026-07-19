"use client";

import React, { useState, useCallback } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import type { ScreeningResultItem } from '../data/multiState';
import StateResultSection from './StateResultSection';
import { generateReportPDF } from '../utils/pdfGenerator';
import { FileDown } from 'lucide-react';

export interface ResultsSection {
  stateConfig: StateRuleConfig;
  results: ScreeningResultItem[];
}

interface ResultsDisplayProps {
  sections: ResultsSection[];
  onReset: () => void;
}

export default function ResultsDisplay({ sections, onReset }: ResultsDisplayProps) {
  const [candidateName, setCandidateName] = useState<string>('');
  // Summaries fetched by each section, kept here so the PDF can include them.
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const handleSummary = useCallback(
    (stateCode: string, summary: string) =>
      setSummaries(prev => (prev[stateCode] === summary ? prev : { ...prev, [stateCode]: summary })),
    []
  );

  const triggerDownload = () => {
    generateReportPDF(
      candidateName,
      sections.map(s => ({
        name: s.stateConfig.name,
        lastReviewed: s.stateConfig.lastReviewed,
        verificationStatus: s.stateConfig.verificationStatus,
        legalAid: s.stateConfig.resources.legalAid,
        remedies: s.stateConfig.resources.remedies,
        records: s.results,
        summary: summaries[s.stateConfig.code],
      }))
    );
  };

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '850px', width: '100%', margin: '0 auto' }}>

      {/* Verification / Review Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-text)' }}>Screening Results</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {sections.length === 1 ? sections[0].stateConfig.name : `${sections.length} states`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={onReset}>
            New Screening
          </button>
        </div>
      </div>

      {/* Candidate Name Input (for PDF personalization) */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Candidate Name (Optional - for PDF generation)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Marcus Miller (processed locally)"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end', height: '44px' }}
          onClick={triggerDownload}
        >
          <FileDown size={18} /> Download PDF Report
        </button>
      </div>

      {sections.map(s => (
        <StateResultSection
          key={s.stateConfig.code}
          stateConfig={s.stateConfig}
          results={s.results}
          onSummaryLoaded={handleSummary}
        />
      ))}

    </div>
  );
}

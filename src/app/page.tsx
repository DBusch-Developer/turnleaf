"use client";

import React, { useState, useEffect } from 'react';
import StateSelector from '../components/StateSelector';
import EligibilityWizard, { ConvictionRecord } from '../components/EligibilityWizard';
import ResultsDisplay from '../components/ResultsDisplay';
import CheckrMockPanel from '../components/CheckrMockPanel';
import { StateRuleConfig } from '../data/fallbackRules';
import ComingSoonPanel, { ComingSoonConfig } from '../components/ComingSoonPanel';
import { Settings, ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [stateConfig, setStateConfig] = useState<StateRuleConfig | null>(null);
  const [comingSoon, setComingSoon] = useState<ComingSoonConfig | null>(null);
  const [records, setRecords] = useState<ConvictionRecord[]>([]);
  const [prepopulatedRecords, setPrepopulatedRecords] = useState<ConvictionRecord[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [loadingState, setLoadingState] = useState(false);

  // Fetch state config when selected
  useEffect(() => {
    if (!selectedStateCode) {
      setStateConfig(null);
      setComingSoon(null);
      return;
    }
    
    async function fetchStateConfig() {
      setLoadingState(true);
      try {
        const res = await fetch(`/api/states/${selectedStateCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.comingSoon) {
            setComingSoon(data as ComingSoonConfig);
            setStateConfig(null);
          } else {
            setStateConfig(data);
            setComingSoon(null);
          }
        }
      } catch (err) {
        console.error('Failed to load state config:', err);
      } finally {
        setLoadingState(false);
      }
    }
    fetchStateConfig();
  }, [selectedStateCode]);

  // Load a Checkr mock report (FR-22)
  const handleLoadMockReport = (mockRecords: ConvictionRecord[], stateCode: string) => {
    setPrepopulatedRecords(mockRecords);
    setRecords(mockRecords);
    setSelectedStateCode(stateCode);
    setResults(null); // Clear previous results
  };

  const handleScreeningComplete = (screeningResults: any[], finalRecords: ConvictionRecord[]) => {
    setRecords(finalRecords);
    setResults(screeningResults);
  };

  const handleReset = () => {
    setSelectedStateCode(null);
    setStateConfig(null);
    setComingSoon(null);
    setRecords([]);
    setPrepopulatedRecords([]);
    setResults(null);
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Floating Developer Panel Toggle */}
      <button 
        onClick={() => setShowDemoPanel(true)}
        className="btn btn-primary"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          borderRadius: '50px',
          padding: '0.75rem 1.5rem',
          boxShadow: '0 8px 32px rgba(77, 124, 89, 0.3)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Settings size={20} />
        <span>Demo Panel</span>
      </button>

      {/* Slide-out mock Checkr drawer */}
      <CheckrMockPanel
        isOpen={showDemoPanel}
        onClose={() => setShowDemoPanel(false)}
        onLoadReport={handleLoadMockReport}
      />

      <div className="container">
        
        {/* Step-based Workspace rendering */}
        {!selectedStateCode ? (
          /* Landing Screen (Hero + Selector) */
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div className="animate-slide-up hero-copy" style={{ marginBottom: '2.5rem' }}>
              <h1 style={{
                fontSize: '3rem',
                fontFamily: 'var(--font-title)',
                fontWeight: 800,
                color: 'var(--color-text)',
                lineHeight: '1.15',
                marginBottom: '1.25rem',
                letterSpacing: '-0.03em'
              }}>
                Fifty states of record-clearing law.<br />
                <span style={{ color: 'var(--color-primary)' }}>One plain answer</span>, and the form to file next.
              </h1>
              
              <p style={{
                fontSize: '1.15rem',
                color: 'var(--color-text-muted)',
                maxWidth: '620px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                Turnleaf is an anonymous expungement screening tool. Answer a few questions about your record to see where it may stand under your state's sealing, expungement, or set-aside laws.
              </p>
            </div>

            {/* State Search and List Grid */}
            <StateSelector onSelectState={setSelectedStateCode} />

            {/* Reentry / Next Chapter Info Details */}
            <div className="animate-fade-in" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginTop: '3rem',
              textAlign: 'left'
            }}>
              <div className="info-card">
                <h4 style={{ fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>⚖️</span> 50-State Statutory Rules
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Unlike templates or partial coverage tools, Turnleaf maps core record clearance guidelines for all 50 states, citing code numbers and dates.
                </p>
              </div>
              <div className="info-card">
                <h4 style={{ fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🔒</span> Privacy & Minimisation
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  We do not collect names, Social Security Numbers, or store charge files. PDF summaries are compiled inside your browser.
                </p>
              </div>
              <div className="info-card">
                <h4 style={{ fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>📋</span> Form Filing Packets
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Eligible results compile direct links to state self-help petition forms, estimated filing fees, and local clinic assistance registries.
                </p>
              </div>
            </div>
          </div>
        ) : loadingState ? (
          /* Loading indicator when state config fetches */
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <RefreshCw className="animate-spin" size={40} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading state rules engine...</p>
          </div>
        ) : comingSoon ? (
          /* State not yet researched: honest in-research panel with real referrals */
          <ComingSoonPanel config={comingSoon} onReset={handleReset} />
        ) : stateConfig ? (
          /* Eligibility check flow */
          <div>
            {!results ? (
              <EligibilityWizard
                stateConfig={stateConfig}
                prepopulatedRecords={prepopulatedRecords}
                onScreeningComplete={handleScreeningComplete}
                onReset={handleReset}
              />
            ) : (
              <ResultsDisplay
                stateConfig={stateConfig}
                results={results}
                records={records}
                onReset={handleReset}
              />
            )}
          </div>
        ) : (
          /* Error Fallback state */
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <AlertTriangle size={48} style={{ color: 'var(--color-error)', margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Failed to Load Rules</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              We encountered an issue downloading the rules configuration for this state.
            </p>
            <button className="btn btn-primary" onClick={handleReset}>
              <ArrowLeft size={16} /> Return to Home
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

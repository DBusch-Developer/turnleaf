"use client";

import React, { useState, useEffect } from 'react';
import StateSelector from '../components/StateSelector';
import EligibilityWizard, { ConvictionRecord } from '../components/EligibilityWizard';
import ResultsDisplay from '../components/ResultsDisplay';
import CheckrMockPanel from '../components/CheckrMockPanel';
import { StateRuleConfig } from '../data/fallbackRules';
import ComingSoonPanel, { ComingSoonConfig } from '../components/ComingSoonPanel';
import { Settings, ArrowLeft, RefreshCw, AlertTriangle, MapPin, FileText, Check, Download, ArrowRight } from 'lucide-react';

// The four steps of the screening, in order. The number is not decoration —
// it is the sequence the CTA refers back to ("Start Step 1").
const STEPS = [
  { n: 1, Icon: MapPin, name: 'Choose your state', desc: 'We’ll apply your state’s laws.' },
  { n: 2, Icon: FileText, name: 'Answer questions', desc: 'A few yes/no questions about your record.' },
  { n: 3, Icon: Check, name: 'See your results', desc: 'Instantly see if you may qualify.', solid: true },
  { n: 4, Icon: Download, name: 'Download forms', desc: 'Get the right court forms to file.' },
];

export default function Home() {
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [stateConfig, setStateConfig] = useState<StateRuleConfig | null>(null);
  const [comingSoon, setComingSoon] = useState<ComingSoonConfig | null>(null);
  const [records, setRecords] = useState<ConvictionRecord[]>([]);
  const [prepopulatedRecords, setPrepopulatedRecords] = useState<ConvictionRecord[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

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
    setShowSelector(false);
  };

  // The landing page: hero, then the four steps, then the way in.
  const onLanding = !selectedStateCode && !showSelector;

  // The landing shows the oak in its own hero band. Every screen past it —
  // states, wizard, results — sits directly on the full-page photo instead, so
  // the content floats on the tree with no white band above it. Only ever one
  // tree on screen: a fixed page photo plus a scrolling hero photo reads as two.
  useEffect(() => {
    document.body.classList.toggle('has-photo-bg', !onLanding);
    return () => document.body.classList.remove('has-photo-bg');
  }, [onLanding]);

  return (
    <div style={{
      padding: onLanding ? 0 : '3rem 0',
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: onLanding ? 'flex-start' : 'center'
    }}>
      
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

      {onLanding ? (
        <>
          {/* Hero — the oak carries the message; the copy stays out of its way. */}
          <section className="hero-band">
            <div className="container">
              <div className="hero-band__copy animate-slide-up">
                <h1 className="hero-band__title">
                  Record clearing<br />can open doors.
                </h1>
                <p className="hero-band__sub">
                  We make it simple. Anonymous screening.<br />
                  Plain-language answers. Court forms ready to file.
                </p>
              </div>
            </div>
          </section>

          {/* The four steps, then the way in. */}
          <section className="guide">

            <div className="container">
              <div className="guide__head">
                <h2 className="guide__title">{'We’ll guide you in 4 simple steps.'}</h2>
                <p className="guide__sub">{'It’s fast, free, and anonymous.'}</p>
              </div>

              <div className="guide__steps">
                {STEPS.map((step, i) => (
                  <React.Fragment key={step.n}>
                    <div className="step">
                      <div className="step__badge">
                        <div className="step__disc">
                          {step.solid ? (
                            // Step 3 is the payoff: a filled check, but sized to
                            // sit in the same footprint as the other icons.
                            <span className="step__check">
                              <Check size={22} strokeWidth={3.5} />
                            </span>
                          ) : (
                            <step.Icon size={34} strokeWidth={2} />
                          )}
                        </div>
                        <span className="step__num">{step.n}</span>
                      </div>
                      <h3 className="step__name">{step.name}</h3>
                      <p className="step__desc">{step.desc}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="step__arrow" size={22} aria-hidden="true" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="guide__cta-wrap">
                <button className="cta-start" onClick={() => setShowSelector(true)}>
                  Start Step 1: Choose Your State
                  <ArrowRight className="cta-start__arrow" size={20} aria-hidden="true" />
                </button>
                <p className="guide__note">{'Takes about 2 minutes • No account needed'}</p>
              </div>
            </div>
          </section>
        </>
      ) : (
      <div className="container">

        {/* Step-based Workspace rendering — every screen past the landing sits
            directly on the full-page oak, no band, no white gap above it. */}
        {!selectedStateCode ? (
          /* Step 1: choose a state */
          <div style={{ maxWidth: '800px', margin: '0 auto' }} className="animate-fade-in">
            <button
              className="btn btn-secondary"
              onClick={() => setShowSelector(false)}
              style={{ marginBottom: '1.5rem' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <StateSelector onSelectState={setSelectedStateCode} />
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
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import StateSelector, { StateSummary } from '../components/StateSelector';
import EligibilityWizard, { ConvictionRecord } from '../components/EligibilityWizard';
import ResultsDisplay from '../components/ResultsDisplay';
import CheckrReportDemo from '../components/CheckrReportDemo';
import { StateRuleConfig } from '../data/fallbackRules';
import type { ScreeningResultItem } from '../data/multiState';
import ComingSoonPanel, { ComingSoonConfig } from '../components/ComingSoonPanel';
import { ArrowLeft, AlertTriangle, MapPin, FileText, Check, Download, ArrowRight } from 'lucide-react';
import { usePublishScreen, type WillowScreen } from '../components/AssistantContext';

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
  // NOTE: the screened `records` state was removed with ResultsDisplay's
  // hardcoded waiting-period table — nothing reads it now. When the engine
  // starts reporting which period decided a result, the display will need the
  // record's date again and this comes back.
  const [prepopulatedRecords, setPrepopulatedRecords] = useState<ConvictionRecord[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [showCheckr, setShowCheckr] = useState(false);
  // Not 'is it loading' — that is derived (see isOpeningState). This is the
  // one thing the render cannot infer: whether the fetch came back empty.
  const [loadFailed, setLoadFailed] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // The state list lives HERE, not in StateSelector, and is fetched once.
  // The selector used to fetch on mount, so every "Change State" tore the list
  // down and rebuilt it from a round trip that returned identical data.
  const [states, setStates] = useState<StateSummary[]>([]);
  const [dataSource, setDataSource] = useState<'database' | 'fallback' | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/states');
        if (res.ok) {
          const data = await res.json();
          setStates(data.states ?? []);
          setDataSource(data.dataSource ?? null);
          console.info(
            `[turnleaf] state rules served from: ${data.dataSource ?? 'unknown'}` +
            (data.dataSource === 'fallback'
              ? ' — the DATABASE was not used. If you expected DB rows, the query failed or the schema is behind.'
              : '')
          );
        }
      } catch (err) {
        console.error('Failed to fetch states:', err);
      } finally {
        setLoadingStates(false);
      }
    })();
  }, []);

  // The Checkr integration demo opens via the footer link (?demo=checkr). Read on
  // mount (not a lazy initial state) so SSR and first client render agree.
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'checkr') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot mount read
      setShowCheckr(true);
    }
  }, []);

  /**
   * Is a state still opening?
   *
   * DERIVED, not stored. It used to be a useState set inside the effect below,
   * which runs AFTER the click has already painted — so for exactly one frame
   * the render saw a selected state with nothing loaded and no loading flag,
   * fell through every branch, and painted the "Failed to Load Rules" screen.
   * People saw a red error flash on every single state they clicked. The
   * spinner used to cover it, which is the only reason it went unnoticed.
   *
   * A state is loading when it has been chosen and nothing has come back for it
   * yet. That is true on the very first render after the click, so there is no
   * frame for the hole to open in. `loadFailed` is what distinguishes "still
   * waiting" from "the fetch came back empty", so a real failure still reaches
   * the error screen instead of spinning forever.
   */
  const isOpeningState = Boolean(selectedStateCode) && !stateConfig && !comingSoon && !loadFailed;

  // Fetch state config when selected
  useEffect(() => {
    if (!selectedStateCode) {
      setStateConfig(null);
      setComingSoon(null);
      setLoadFailed(false);
      return;
    }
    
    let cancelled = false;
    async function fetchStateConfig() {
      setLoadFailed(false);
      try {
        const res = await fetch(`/api/states/${selectedStateCode}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data && data.comingSoon) {
            setComingSoon(data as ComingSoonConfig);
            setStateConfig(null);
          } else {
            setStateConfig(data);
            setComingSoon(null);
          }
        } else {
          setLoadFailed(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load state config:', err);
        setLoadFailed(true);
      }
    }
    fetchStateConfig();
    // A second choice while the first is in flight must not have its response
    // land on top of the newer one.
    return () => { cancelled = true; };
  }, [selectedStateCode]);

  // Load a Checkr mock report (FR-22)
  const closeCheckr = () => {
    setShowCheckr(false);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleLoadMockReport = (mockRecords: ConvictionRecord[], stateCode: string) => {
    setPrepopulatedRecords(mockRecords);
    setSelectedStateCode(stateCode);
    setResults(null); // Clear previous results
    closeCheckr();
  };

  const handleScreeningComplete = (screeningResults: any[]) => {
    setResults(screeningResults);
  };

  /**
   * Back to the state list — NOT to the landing page.
   *
   * This is what "Change State", "Choose another state" and "New Screening" all
   * mean: the person has already decided to screen something, they just want a
   * different state. Dropping them back to the hero made them click through
   * "Start Step 1" again to get to a list they were looking at a second ago.
   * `showSelector` stays true so the list is what they land on.
   */
  const handleReset = () => {
    setSelectedStateCode(null);
    setStateConfig(null);
    setComingSoon(null);
    setPrepopulatedRecords([]);
    setResults(null);
    setShowSelector(true);
  };

  /** All the way out to the landing page. Only the error fallback wants this. */
  const handleReturnHome = () => {
    handleReset();
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

  // Tell Willow what the person is looking at, so it can default each
  // question to the state on screen instead of asking "which state?" first.
  const publishScreen = usePublishScreen();
  useEffect(() => {
    const screen: WillowScreen = onLanding
      ? 'landing'
      : isOpeningState
        ? 'loading'
        : comingSoon
          ? 'coming-soon'
          : stateConfig
            ? (results ? 'results' : 'wizard')
            : 'selector';
    const stateName =
      stateConfig?.name ?? states.find(s => s.code === selectedStateCode)?.name ?? null;
    publishScreen({ selectedStateCode, stateName, screen });
  }, [onLanding, isOpeningState, comingSoon, stateConfig, results, selectedStateCode, states, publishScreen]);

  return (
    <div style={{
      padding: onLanding ? 0 : '3rem 0',
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: onLanding ? 'flex-start' : 'center'
    }}>
      
      {/* Checkr integration demo — full-screen mock report, opened from the footer link */}
      {showCheckr && (
        <CheckrReportDemo
          onRunScreening={handleLoadMockReport}
          onClose={closeCheckr}
        />
      )}

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
        {/* The list stays up while a state loads.
           *
           * Opening a state used to blow the whole layout away and put a
           * centred spinner in its place — "Loading state rules engine..." —
           * then build a third layout for the wizard. Three screens for one
           * click, and the middle one lasted about 150ms: too fast to read,
           * too slow to miss. The list holds its ground instead, and the state
           * you clicked shows that it is opening. One layout, then the next.
           *
           * The outer animate-fade-in went with it: the card already has its
           * own entrance, and two animations on the same element stacking is
           * what read as choppy. */}
        {!selectedStateCode || isOpeningState ? (
          /* Step 1: choose a state */
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSelector(false)}
              style={{ marginBottom: '1.5rem' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <StateSelector
              states={states}
              dataSource={dataSource}
              loading={loadingStates}
              pendingCode={isOpeningState ? selectedStateCode : null}
              onSelectState={setSelectedStateCode}
            />
          </div>
        ) : comingSoon ? (
          /* State not yet researched: honest in-research panel with real referrals */
          <ComingSoonPanel config={comingSoon} onReset={handleReset} />
        ) : stateConfig ? (
          /* Eligibility check flow */
          <div>
            {!results ? (
              <EligibilityWizard
                configs={{ [stateConfig.code]: stateConfig }}
                prepopulatedRecords={prepopulatedRecords}
                onScreeningComplete={handleScreeningComplete}
                onReset={handleReset}
              />
            ) : (
              <ResultsDisplay
                sections={[{ stateConfig, results: results as ScreeningResultItem[] }]}
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
            <button className="btn btn-primary" onClick={handleReturnHome}>
              <ArrowLeft size={16} /> Return to Home
            </button>
          </div>
        )}

      </div>
      )}
    </div>
  );
}

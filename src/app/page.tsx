"use client";

import React, { useState, useEffect } from 'react';
import StateSelector, { StateSummary } from '../components/StateSelector';
import EligibilityWizard, { ConvictionRecord } from '../components/EligibilityWizard';
import ResultsDisplay from '../components/ResultsDisplay';
import CheckrReportDemo from '../components/CheckrReportDemo';
import { StateRuleConfig } from '../data/fallbackRules';
import { groupByState, type ScreeningResultItem } from '../data/multiState';
import ComingSoonPanel, { ComingSoonConfig } from '../components/ComingSoonPanel';
import { ArrowLeft, AlertTriangle, MapPin, FileText, Check, Download, ArrowRight, BookOpen, ExternalLink } from 'lucide-react';
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
  // A screening session holds a SET of states, not one. Each resolves into
  // exactly one of the two maps below: a screenable StateRuleConfig, or an
  // in-research ComingSoonConfig. Everything downstream (wizard, results,
  // Willow) is derived by filtering these against selectedStateCodes.
  const [selectedStateCodes, setSelectedStateCodes] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, StateRuleConfig>>({});
  const [comingSoonByState, setComingSoonByState] = useState<Record<string, ComingSoonConfig>>({});
  // NOTE: the screened `records` state was removed with ResultsDisplay's
  // hardcoded waiting-period table — nothing reads it now. When the engine
  // starts reporting which period decided a result, the display will need the
  // record's date again and this comes back.
  const [prepopulatedRecords, setPrepopulatedRecords] = useState<ConvictionRecord[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [showCheckr, setShowCheckr] = useState(false);
  // Which selected states' config fetch FAILED, tracked per-state so one state
  // going down never sinks the others. A code lands here only after its own
  // fetch rejects; the render infers "opening" vs "empty" from this plus the
  // two maps above (see isOpeningState). This is the one thing the render can't
  // otherwise tell: a state stuck loading vs. one whose fetch came back empty.
  const [failedByState, setFailedByState] = useState<Record<string, true>>({});
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
   * yet — no config, no coming-soon entry, and no recorded failure. That is true
   * on the very first render after the click, so there is no frame for the hole
   * to open in. `failedByState` is what distinguishes "still waiting" from "the
   * fetch failed", so a state that failed drops out of "opening" (and its peers
   * screen on) instead of the whole session spinning forever.
   */
  const isOpeningState =
    selectedStateCodes.length > 0 &&
    selectedStateCodes.some(c => !configs[c] && !comingSoonByState[c] && !failedByState[c]);

  // Fetch every selected state's config that we don't already hold. Runs
  // whenever the selection or either map changes; it only fetches the codes
  // still unresolved, so once all are in the maps it settles (no loop).
  useEffect(() => {
    if (selectedStateCodes.length === 0) {
      setFailedByState({});
      return;
    }
    // Only fetch codes still unresolved AND not already failed — a failed code
    // stays failed (it doesn't re-enter the fetch set), so the effect settles.
    const toFetch = selectedStateCodes.filter(c => !configs[c] && !comingSoonByState[c] && !failedByState[c]);
    if (toFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      // allSettled, not all: each state resolves independently, so one failed
      // fetch no longer discards the configs that DID load. Successes commit to
      // the maps; failures are recorded per-state and the good states screen on.
      const settled = await Promise.allSettled(
        toFetch.map(async (code) => {
          const res = await fetch(`/api/states/${code}`);
          if (!res.ok) throw new Error(`Failed to load ${code}`);
          return { code, data: await res.json() };
        })
      );
      if (cancelled) return;
      const nextConfigs: Record<string, StateRuleConfig> = {};
      const nextComingSoon: Record<string, ComingSoonConfig> = {};
      const nextFailed: Record<string, true> = {};
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const { code, data } = r.value;
          if (data && data.comingSoon) nextComingSoon[code] = data as ComingSoonConfig;
          else nextConfigs[code] = data as StateRuleConfig;
        } else {
          console.error('Failed to load state config:', r.reason);
          nextFailed[toFetch[i]] = true;
        }
      });
      if (Object.keys(nextConfigs).length) setConfigs(prev => ({ ...prev, ...nextConfigs }));
      if (Object.keys(nextComingSoon).length) setComingSoonByState(prev => ({ ...prev, ...nextComingSoon }));
      if (Object.keys(nextFailed).length) setFailedByState(prev => ({ ...prev, ...nextFailed }));
    })();
    // A newer selection while a fetch is in flight must not have its response
    // land on top of the newer one.
    return () => { cancelled = true; };
  }, [selectedStateCodes, configs, comingSoonByState, failedByState]);

  // Load a Checkr mock report (FR-22)
  const closeCheckr = () => {
    setShowCheckr(false);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // The Checkr handoff derives which states to screen from the records
  // themselves — a CA+TX report opens a CA+TX session, so each charge is
  // screened under its own state's law (the headline multi-state fix).
  const handleLoadMockReport = (mockRecords: ConvictionRecord[]) => {
    const codes = groupByState(mockRecords, r => r.state).map(g => g.state);
    setPrepopulatedRecords(mockRecords);
    setFailedByState({}); // A fresh selection deserves a fresh fetch attempt.
    setSelectedStateCodes(codes);
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
    setSelectedStateCodes([]);
    setConfigs({});
    setComingSoonByState({});
    setPrepopulatedRecords([]);
    setResults(null);
    setFailedByState({});
    setShowSelector(true);
  };

  /** All the way out to the landing page. Only the error fallback wants this. */
  const handleReturnHome = () => {
    handleReset();
    setShowSelector(false);
  };

  // The landing page: hero, then the four steps, then the way in.
  const onLanding = selectedStateCodes.length === 0 && !showSelector;

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
    const hasScreenable = selectedStateCodes.some(c => configs[c]);
    const hasResearching = selectedStateCodes.some(c => comingSoonByState[c]);
    const screen: WillowScreen = onLanding
      ? 'landing'
      : isOpeningState
        ? 'loading'
        : results
          ? 'results'
          : hasScreenable
            ? 'wizard'
            : hasResearching
              ? 'coming-soon'
              : 'selector';
    const stateNames = selectedStateCodes.map(
      c => configs[c]?.name ?? comingSoonByState[c]?.name ?? states.find(s => s.code === c)?.name ?? c
    );
    // Singular fields carry a value ONLY when exactly one state is selected;
    // with several, Willow falls back to asking which state — that's intended.
    const single = selectedStateCodes.length === 1;
    publishScreen({
      selectedStateCode: single ? selectedStateCodes[0] : null,
      stateName: single ? stateNames[0] : null,
      selectedStateCodes,
      stateNames,
      screen,
    });
  }, [onLanding, isOpeningState, results, selectedStateCodes, configs, comingSoonByState, states, publishScreen]);

  // Partition the session: which selected states are screenable (have a config)
  // vs. still in research (coming-soon). The wizard screens the screenable ones;
  // the in-research ones get a compact inline note.
  const screenableCodes = selectedStateCodes.filter(c => configs[c]);
  const researchingCodes = selectedStateCodes.filter(c => comingSoonByState[c]);
  // Did any selected state's fetch fail? Only meaningful once nothing else is
  // renderable — see the error-fallback branch below.
  const anyFailed = selectedStateCodes.some(c => failedByState[c]);
  const screenableConfigs = Object.fromEntries(screenableCodes.map(c => [c, configs[c]]));
  // One in-research state and nothing else must look exactly like today: the
  // full-screen honest panel, not the compact inline note.
  const soloComingSoon =
    selectedStateCodes.length === 1 ? comingSoonByState[selectedStateCodes[0]] : undefined;
  // Results are grouped by state, each section carrying its own state's config.
  const sections = results
    ? groupByState(results as ScreeningResultItem[], r => r.state)
        .map(g => ({ stateConfig: configs[g.state], results: g.items }))
    : [];

  // The state picker — shown as the entry step AND as the final safety net if
  // every content branch below falls through. One definition, so the two can't
  // drift. `pendingCodes` lights up the states currently opening.
  const selectorView = (
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
        pendingCodes={isOpeningState ? selectedStateCodes : []}
        onContinue={(codes) => { setFailedByState({}); setSelectedStateCodes(codes); }}
      />
    </div>
  );

  // The compact per-state "still in research" note. Rendered alongside the
  // wizard when a session mixes screenable + in-research states, AND on its own
  // when EVERY selected state is in research (so ≥2 in-research states no longer
  // fall through to the error fallback). Single in-research still gets the full
  // ComingSoonPanel — see soloComingSoon below.
  const researchingNotes = (
    <div style={{ maxWidth: '800px', margin: '0 auto 1rem' }}>
      {researchingCodes.map(c => {
        const cs = comingSoonByState[c];
        const ref = cs.referrals[0];
        return (
          <div
            key={c}
            className="glass-card"
            style={{ padding: '0.9rem 1.1rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}
          >
            <BookOpen size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)' }}>{cs.name}</strong> is still in research — we won&apos;t screen it.
            </span>
            {ref && (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
              >
                {ref.name} <ExternalLink size={14} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );

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
        {selectedStateCodes.length === 0 || isOpeningState ? (
          /* Step 1: choose states (multi-select). Holds while a session opens. */
          selectorView
        ) : results ? (
          /* Results: one stacked section per state, each under its own law */
          <ResultsDisplay sections={sections} onReset={handleReset} />
        ) : screenableCodes.length > 0 ? (
          /* Eligibility check flow — screens each screenable state; any
             in-research states in the same session get a compact inline note. */
          <div>
            {researchingCodes.length > 0 && researchingNotes}
            <EligibilityWizard
              configs={screenableConfigs}
              prepopulatedRecords={prepopulatedRecords}
              onScreeningComplete={handleScreeningComplete}
              onReset={handleReset}
            />
          </div>
        ) : soloComingSoon ? (
          /* Single in-research state, nothing else: full-screen honest panel,
             identical to before multi-state. */
          <ComingSoonPanel config={soloComingSoon} onReset={handleReset} />
        ) : researchingCodes.length > 0 ? (
          /* Two or more selected states, all in research: the compact notes
             list (not the error fallback, and not a screening). */
          <div>
            {researchingNotes}
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <button className="btn btn-secondary" onClick={handleReset}>
                <ArrowLeft size={16} /> Choose different states
              </button>
            </div>
          </div>
        ) : anyFailed ? (
          /* Error fallback — LAST resort: reached only when there are selected
             codes but NONE is screenable, none in research, none still opening,
             and at least one fetch failed. A partial failure never lands here:
             the states that loaded are screened by the wizard branch above, and
             any in-research ones show their notes — this shows only when every
             selected state failed to load and there is nothing else to render. */
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
        ) : (
          /* Safety net: nothing to show and nothing failed — back to the picker. */
          selectorView
        )}

      </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';

export interface StateSummary {
  code: string;
  name: string;
  /** Screenable: researched AND verified by a person. */
  available: boolean;
  /** Rules exist but are still draft — researched, not yet confirmed. */
  draft?: boolean;
  lastReviewed: string | null;
  verificationStatus: 'draft' | 'statute_cited' | 'phone_verified' | null;
}

interface StateSelectorProps {
  /** The 50 states. Owned by the page, so returning here costs no round trip. */
  states: StateSummary[];
  dataSource: 'database' | 'fallback' | null;
  loading: boolean;
  /** The states being opened right now, if any — they get the waiting treatment. */
  pendingCodes: string[];
  onContinue: (codes: string[]) => void;
}

/**
 * The list does NOT fetch.
 *
 * It used to fetch on mount, which meant every "Change State" threw the list
 * away and rebuilt it: the person watched fifty states blink out, "Loading
 * states..." appear, and the same fifty come back, for a round trip that
 * returned identical data. The page owns the list now and hands it down, so
 * coming back is instant and the list is simply there.
 */
export default function StateSelector({
  states,
  dataSource,
  loading,
  pendingCodes,
  onContinue,
}: StateSelectorProps) {
  const [search, setSearch] = useState('');
  // Local multi-select. A row (or quick-select button) toggles its code in and
  // out of `picked`; the footer Continue hands the whole set to the page at
  // once, so a session opens with several states rather than one per click.
  const [picked, setPicked] = useState<string[]>([]);
  const opening = pendingCodes.length > 0;
  const togglePicked = (code: string) =>
    setPicked(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));

  const filteredStates = states.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const availableCount = states.filter(s => s.available).length;

  const getStatusLabel = (state: StateSummary) => {
    if (!state.available) {
      // Draft and not-researched are both unscreenable, but they are different
      // claims: draft means the research exists and is cited but nobody has
      // confirmed it with a court yet. Badging a draft state "In Research"
      // would understate what we have; badging it as ready would overstate it.
      return state.draft
        ? { text: '📝 Drafted — Not Confirmed', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' }
        : { text: '🔬 In Research', bg: 'var(--color-bg-alt)', color: 'var(--color-text-muted)' };
    }
    switch (state.verificationStatus) {
      case 'phone_verified':
        return { text: '📞 Phone Verified', bg: 'var(--color-success-bg)', color: 'var(--color-success)' };
      case 'statute_cited':
        return { text: '⚖️ Statute Cited', bg: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' };
      default:
        return { text: '🔬 In Research', bg: 'var(--color-bg-alt)', color: 'var(--color-text-muted)' };
    }
  };

  // Quick-select: the first researched states (kept in sync with real coverage)
  const quickSelect = states.filter(s => s.available).slice(0, 4);

  return (
    // 800px, matching the wizard and the results card. It was 650, so choosing
    // a state resized the card by 150px and slid it 75px sideways — the layout
    // visibly re-centring under the cursor. One width across the workspace, so
    // the card stays put and only its contents change.
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)', textAlign: 'center' }}>
        Start Your Screening
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        Select your state to load its researched eligibility rules and forms.
        {!loading && availableCount > 0 && availableCount < states.length && (
          <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {availableCount} of {states.length} states live — more added daily as research completes.
          </span>
        )}
      </p>

      {/* Data-source indicator.
         *
         * Small on purpose: this is for whoever is verifying a migration, not
         * for the person screening their record. It exists because the fallback
         * path is SILENT — when the database is unreachable or its schema is
         * behind, the site serves in-code rules and looks exactly the same. On
         * 2026-07-15 that happened for hours and the only evidence was a stack
         * trace in a terminal. 'fallback' is amber rather than red because it
         * is correct behaviour, not an outage — it just must never be mistaken
         * for the database. */}
      {!loading && dataSource && (
        <p
          title={
            dataSource === 'database'
              ? 'These rules were read from the Neon database.'
              : 'The database was NOT used. These rules came from src/data/fallbackRules.ts — either DATABASE_URL is unset, the query failed, or the schema is behind.'
          }
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            marginTop: '-0.75rem',
            marginBottom: '1.25rem',
            letterSpacing: '0.02em',
            color: dataSource === 'database' ? 'var(--color-text-light)' : 'var(--color-warning)',
            fontWeight: dataSource === 'database' ? 400 : 600,
          }}
        >
          {dataSource === 'database' ? '● rules: database' : '▲ rules: fallback (database not used)'}
        </p>
      )}

      {/* Quick select: researched states */}
      {quickSelect.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            QUICK SELECT
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {quickSelect.map(s => {
              const isPicked = picked.includes(s.code);
              return (
                <button
                  key={s.code}
                  className={isPicked ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ flex: 1, minWidth: '100px', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  onClick={() => togglePicked(s.code)}
                  disabled={loading || opening}
                  aria-pressed={isPicked}
                >
                  {isPicked && <Check size={14} />}
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search states..."
          className="input-field"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
          style={{ paddingLeft: '2.5rem' }}
        />
        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }}>
          🔍
        </span>
      </div>

      {/* State List */}
      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>Loading states...</p>
        ) : filteredStates.length > 0 ? (
          filteredStates.map(state => {
            const status = getStatusLabel(state);
            // The states being opened. The click toggles selection in place
            // rather than replacing the page with a spinner, so the feedback is
            // attached to the thing that was clicked. While a session is opening
            // the rows dim, which also stops a click starting a second load.
            const isPending = pendingCodes.includes(state.code);
            const isDimmed = opening && !isPending;
            const isPicked = picked.includes(state.code);
            // Picked and pending both read as "chosen" — highlight either.
            const isChosen = isPicked || isPending;
            const baseBg = isChosen ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.4)';
            return (
              <button
                key={state.code}
                onClick={() => togglePicked(state.code)}
                disabled={opening}
                aria-busy={isPending}
                aria-pressed={isPicked}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  border: `1px solid ${isChosen ? 'var(--color-primary)' : 'var(--color-card-border)'}`,
                  borderRadius: '12px',
                  background: baseBg,
                  cursor: opening ? 'default' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  opacity: isDimmed ? 0.4 : state.available ? 1 : 0.75,
                  transition: 'background var(--transition-fast), opacity var(--transition-fast), border-color var(--transition-fast)'
                }}
                onMouseOver={(e) => {
                  if (!opening && !isPicked) e.currentTarget.style.background = 'var(--color-primary-light)';
                }}
                onMouseOut={(e) => {
                  if (!opening && !isPicked) e.currentTarget.style.background = baseBg;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Check marks the row as picked. Reserve the slot even when
                      unpicked so the label doesn't jump as rows toggle. */}
                  <span style={{
                    width: '18px',
                    height: '18px',
                    flexShrink: 0,
                    borderRadius: '5px',
                    border: `1.5px solid ${isPicked ? 'var(--color-primary)' : 'var(--color-card-border)'}`,
                    background: isPicked ? 'var(--color-primary)' : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isPicked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <div>
                    {/* The space is a real character, not just margin. Margin
                        gives the eye a gap but leaves the text content as
                        "Alabama(AL)" — which is what a screen reader announces
                        and what you get if you copy the row. */}
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{state.name}</span>{' '}
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>({state.code})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    background: isPending ? 'var(--color-primary)' : status.bg,
                    color: isPending ? '#fff' : status.color,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    {isPending && <RefreshCw className="animate-spin" size={12} />}
                    {isPending ? 'Opening' : status.text}
                  </span>

                  {state.available && state.lastReviewed && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                      Reviewed: {state.lastReviewed}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>No states match your search.</p>
        )}
      </div>

      {/* Continue — hands the whole picked set to the page at once. A session
          opens with every chosen state, each screened under its own law. */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          style={{ minWidth: '220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          onClick={() => onContinue(picked)}
          disabled={picked.length === 0 || opening}
          aria-busy={opening}
        >
          {opening && <RefreshCw className="animate-spin" size={16} />}
          Continue with {picked.length} state{picked.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}

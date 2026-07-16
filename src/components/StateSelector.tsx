"use client";

import React, { useState, useEffect } from 'react';

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
  onSelectState: (code: string) => void;
}

export default function StateSelector({ onSelectState }: StateSelectorProps) {
  const [states, setStates] = useState<StateSummary[]>([]);
  const [dataSource, setDataSource] = useState<'database' | 'fallback' | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStates() {
      try {
        const res = await fetch('/api/states');
        if (res.ok) {
          const data = await res.json();
          setStates(data.states ?? []);
          setDataSource(data.dataSource ?? null);
          // Also on the console, so it is visible without scrolling anywhere.
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
        setLoading(false);
      }
    }
    fetchStates();
  }, []);

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
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '650px', width: '100%', margin: '0 auto' }}>
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
            {quickSelect.map(s => (
              <button
                key={s.code}
                className="btn btn-secondary"
                style={{ flex: 1, minWidth: '100px', padding: '0.5rem 1rem' }}
                onClick={() => onSelectState(s.code)}
                disabled={loading}
              >
                {s.name}
              </button>
            ))}
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
            return (
              <button
                key={state.code}
                onClick={() => onSelectState(state.code)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  opacity: state.available ? 1 : 0.75,
                  transition: 'background var(--transition-fast)'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-light)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{state.name}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>({state.code})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    background: status.bg,
                    color: status.color,
                    fontWeight: 600
                  }}>
                    {status.text}
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
    </div>
  );
}

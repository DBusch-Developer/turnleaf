"use client";

import React, { useState, useEffect } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import type { ScreeningResultItem } from '../data/multiState';
import SourcesList from './SourcesList';
import { FileText, Landmark, ShieldCheck, RefreshCw } from 'lucide-react';

/**
 * What a null resource field says out loud.
 *
 * null means we have not verified it — not that it is zero, not that it is
 * free. Rendering it as "null", or silently as nothing, would turn "we didn't
 * check" into "there's nothing to pay". Say the true thing instead.
 */
const NOT_VERIFIED = 'Not yet verified — ask the court clerk';

interface StateResultSectionProps {
  stateConfig: StateRuleConfig;
  results: ScreeningResultItem[];
  /** Report the fetched summary up so the shell can put it in the PDF. */
  onSummaryLoaded?: (stateCode: string, summary: string) => void;
}

export default function StateResultSection({ stateConfig, results, onSummaryLoaded }: StateResultSectionProps) {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stateName: stateConfig.name,
            records: results
          })
        });
        if (res.ok) {
          const data = await res.json();
          setAiSummary(data.summary);
          onSummaryLoaded?.(stateConfig.code, data.summary);
        }
      } catch (err) {
        console.error('Failed to load AI summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    }
    fetchSummary();
    // onSummaryLoaded is intentionally excluded — the shell passes a stable
    // useCallback; including it would refetch on every render.
  }, [results, stateConfig]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible':
        return { bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'var(--color-success)' };
      case 'waiting':
        return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
      case 'ineligible':
        return { bg: 'var(--color-error-bg)', text: 'var(--color-error)', border: 'var(--color-error)' };
      default:
        return { bg: 'var(--color-primary-light)', text: 'var(--color-primary-dark)', border: 'var(--color-primary)' };
    }
  };

  const hasEligible = results.some(r => r.resultStatus === 'eligible');

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {stateConfig.name}
        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.75rem' }}>
          Data verified: {stateConfig.lastReviewed} ({stateConfig.verificationStatus})
        </span>
      </h3>

      {/* AI Plain Language Summary (FR-12) */}
      <div style={{
        background: 'rgba(77, 124, 89, 0.05)',
        border: '1px solid var(--color-card-border)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
          <ShieldCheck size={20} /> Plain-Language Summary
        </h3>
        {loadingSummary ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw className="animate-spin" size={16} /> Generating plain-language overview...
          </p>
        ) : (
          <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--color-text)' }}>
            {aiSummary}
          </p>
        )}
      </div>

      {/* Per-Conviction Screenings (FR-3) */}
      {/* NO computed "earliest eligibility date" here — deliberately.
       *
       * This block once lived in ResultsDisplay beside a getWaitingDetails()
       * helper that computed the date from a hardcoded table of waiting periods
       * keyed on state code (with `let yearsRequired = 3` as a default). That was
       * a second, competing copy of the law: it disagreed with fallbackRules on
       * three of four states — AZ felonies (2 yrs here vs 5/10 in the rules), NY
       * (10 yrs flat vs Clean Slate's 3/8), and TX deferred misdemeanours (2 yrs
       * vs no wait at all) — and invented a 3-year answer for any state it had
       * never heard of.
       *
       * Legal rules live in data (AGENTS.md), and a waiting period the user sees
       * must come from the node that applied. The engine does not yet surface
       * WHICH period decided a result, so the date is gone rather than wrong;
       * res.resultMessage still states the period in prose. Restoring a real
       * date is tracked with the engine extraction. Do not reintroduce a table. */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Records Breakdown</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {results.map((res) => {
          const style = getStatusColor(res.resultStatus);

          return (
            <div
              key={res.recordId}
              style={{
                border: `1px solid ${style.border}33`,
                borderRadius: '16px',
                padding: '1.5rem',
                background: `${style.bg}22`,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--color-text)' }}>
                  {res.title}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-light)', marginLeft: '0.5rem' }}>
                    ({res.charge_type.toUpperCase()})
                  </span>
                </h4>

                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  background: style.bg,
                  color: style.text,
                  border: `1px solid ${style.text}44`
                }}>
                  {res.resultTitle}
                </span>
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
                {res.resultMessage}
              </p>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                Rule applied: {res.citation}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filing Actions Checklist (FR-15 / FR-16) */}
      {hasEligible && Object.keys(stateConfig.resources.remedies).length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={22} style={{ color: 'var(--color-primary)' }} /> The Form & Instructions to File Next
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(stateConfig.resources.remedies).map(([key, remedy]) => (
              <div
                key={key}
                style={{
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  background: 'var(--color-bg-alt)'
                }}
              >
                <h4 style={{ fontSize: '1.1rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
                  {remedy.name}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Required Form:</strong>{' '}
                    {/* No link when the URL is unverified: href="null" is a
                        broken promise, and a link is itself a claim. */}
                    {remedy.formUrl && remedy.formName ? (
                      <a href={remedy.formUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{remedy.formName}</a>
                    ) : (
                      <span style={{ color: 'var(--color-text-light)' }}>{remedy.formName ?? NOT_VERIFIED}</span>
                    )}
                  </div>
                  <div>
                    <strong>Fees:</strong>{' '}
                    <span style={remedy.fees ? undefined : { color: 'var(--color-text-light)' }}>
                      {remedy.fees ?? NOT_VERIFIED}
                    </span>
                  </div>
                  <div>
                    <strong>Fee Waiver:</strong>{' '}
                    <span style={remedy.feeWaiver ? undefined : { color: 'var(--color-text-light)' }}>
                      {remedy.feeWaiver ?? NOT_VERIFIED}
                    </span>
                  </div>
                  <div>
                    <strong>Where to File:</strong>{' '}
                    <span style={remedy.courtContact ? undefined : { color: 'var(--color-text-light)' }}>
                      {remedy.courtContact ?? NOT_VERIFIED}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--color-card-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-card-border)' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    STEP-BY-STEP FILING GUIDE:
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: 0 }}>
                    {remedy.steps.map((step, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        <input type="checkbox" style={{ marginTop: '0.2rem', cursor: 'pointer' }} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Aid Referral (FR-17 / R9) */}
      <div style={{ borderTop: '1px solid var(--color-card-border)', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Landmark size={22} style={{ color: 'var(--color-primary)' }} /> Local Legal Aid Referrals
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          We highly recommend having an attorney review your completed packet before you file. These organizations provide free legal help to qualifying low-income individuals in {stateConfig.name}:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stateConfig.resources.legalAid.map((aid, idx) => (
            <a
              key={idx}
              href={aid.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                border: '1px solid var(--color-card-border)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                color: 'var(--color-primary-dark)',
                fontSize: '0.9rem'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-light)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
            >
              <span>{aid.name}</span>
              <span>Open Website ↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* The statutes behind the rules — linked where a human read the official
          text, plain citation where not. */}
      <SourcesList sources={stateConfig.sources} stateName={stateConfig.name} />

    </section>
  );
}

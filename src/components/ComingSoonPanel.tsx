"use client";

import React from 'react';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import SourcesList, { SourceItem } from './SourcesList';

export interface ComingSoonConfig {
  comingSoon: true;
  /**
   * Why this state is not screenable. These are different claims and the panel
   * must not blur them: 'not_researched' means we have nothing, 'draft' means
   * we have cited research that no human has confirmed yet. Telling a draft
   * state's user "we're still researching this" would be untrue.
   */
  reason?: 'draft' | 'not_researched';
  code: string;
  name: string;
  openQuestionCount?: number;
  referrals: Array<{ name: string; url: string }>;
  /** The state's cited statutes. On a draft state these are all unlinked (the
   *  validator forbids a verified url on unverified rules), so they render as
   *  plain citations — showing what was read without claiming it was confirmed. */
  sources?: SourceItem[];
}

interface ComingSoonPanelProps {
  config: ComingSoonConfig;
  onReset: () => void;
}

export default function ComingSoonPanel({ config, onReset }: ComingSoonPanelProps) {
  const isDraft = config.reason === 'draft';

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '2.5rem', maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
      <BookOpen size={44} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />

      <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
        {isDraft
          ? `${config.name} is drafted, but not confirmed yet`
          : `${config.name} is being researched`}
      </h2>

      {isDraft ? (
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          We have read {config.name}&apos;s statutes and written its rules down, with citations.
          What we haven&apos;t done is pick up the phone and confirm them with the courts —
          the filing fees, the waiting periods, the forms that actually get accepted at the
          counter. Until someone has done that, we won&apos;t screen you against these rules.
          A screening that is probably right is not good enough when it is your record.
          {typeof config.openQuestionCount === 'number' && config.openQuestionCount > 0 && (
            <> There {config.openQuestionCount === 1 ? 'is' : 'are'} still{' '}
              <strong>{config.openQuestionCount}</strong>{' '}
              open question{config.openQuestionCount === 1 ? '' : 's'} on {config.name}.</>
          )}
        </p>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Every state in Turnleaf is researched from its actual statutes and encoded by hand
          — we don&apos;t publish rules we haven&apos;t verified. {config.name}{' '}
          isn&apos;t ready yet, and we&apos;d rather tell you that than guess.
        </p>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
        In the meantime, these are real places to learn where your record stands in {config.name} today:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
        {config.referrals.map(r => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.8rem 1rem' }}
          >
            <span>{r.name}</span>
            <ExternalLink size={15} />
          </a>
        ))}
      </div>

      {config.sources && config.sources.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <SourcesList sources={config.sources} stateName={config.name} />
        </div>
      )}

      <button className="btn btn-primary" onClick={onReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={16} /> Choose another state
      </button>
    </div>
  );
}

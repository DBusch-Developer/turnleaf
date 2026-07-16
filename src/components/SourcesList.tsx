"use client";

import React from 'react';
import { ScrollText, ExternalLink, CheckCircle2 } from 'lucide-react';

export interface SourceItem {
  id: string;
  url: string | null;
  retrievedOn: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Render 'YYYY-MM-DD' as 'Jul 16, 2026'; anything less precise, as given. */
function formatRetrieved(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/**
 * The sources behind a state's rules. A link is a verification claim: it means a
 * person opened the official statute text and recorded the date they read it. A
 * plain citation means the rule is written down but not yet linked to the source.
 * The difference between a link and plain text IS the verification status made
 * visible — so the two are rendered deliberately differently, never uniformly.
 */
export default function SourcesList({ sources, stateName }: { sources: SourceItem[]; stateName: string }) {
  if (!sources?.length) return null;

  const anyVerified = sources.some((s) => s.url);

  return (
    <div style={{ borderTop: '1px solid var(--color-card-border)', paddingTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ScrollText size={22} style={{ color: 'var(--color-primary)' }} /> The statutes behind {stateName}&apos;s rules
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        Every rule traces to a cited statute. Where you see a link, a person opened the official legislature
        text and read it{anyVerified ? '' : ''} — the date says when. A plain citation is one we have written down
        but not yet linked to the official source.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sources.map((s, idx) => (
          <li key={idx}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  padding: '0.7rem 1rem',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.4)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: '0.88rem', lineHeight: 1.4 }}>
                  {s.id} <ExternalLink size={13} style={{ flexShrink: 0 }} />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> verified against official text · {formatRetrieved(s.retrievedOn)}
                </span>
              </a>
            ) : (
              <span
                style={{
                  display: 'block',
                  padding: '0.7rem 1rem',
                  borderLeft: '2px solid var(--color-card-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                }}
              >
                {s.id}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

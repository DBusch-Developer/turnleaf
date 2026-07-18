// src/components/AssistantWidget.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ShieldCheck, Info, Scale, ExternalLink } from 'lucide-react';
import { useAssistantScreen } from './AssistantContext';

type Tier = 'VERIFIED' | 'GENERAL' | 'BEYOND';
interface Citation { label: string; url: string | null }
interface LegalAid { name: string; url: string }

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  tier?: Tier;
  citations?: Citation[];
  legalAid?: LegalAid[];
}

type WidgetState = 'welcoming' | 'thinking' | 'explaining' | 'empathetic';

const FACE: Record<WidgetState, string> = {
  welcoming: '/willow/welcoming.png',
  thinking: '/willow/thinking.png',
  explaining: '/willow/explaining.png',
  empathetic: '/willow/empathetic.png',
};

const TIER_BADGE: Record<Tier, { label: string; sub: string; Icon: typeof ShieldCheck; color: string; bg: string }> = {
  VERIFIED: { label: 'Verified law', sub: 'Grounded in verified statute data', Icon: ShieldCheck, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  GENERAL: { label: 'General info', sub: 'General process or terminology', Icon: Info, color: '#2563EB', bg: '#EAF1FE' },
  BEYOND: { label: "Beyond what's verified", sub: 'Needs legal help or outside our scope', Icon: Scale, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
};

const GREETING: AssistantMessage = {
  role: 'assistant',
  tier: 'GENERAL',
  content:
    "Hi, I'm Willow. I can explain Turnleaf's verified rules for the states we've checked, in plain language. I share information, not legal advice — and I'll point you to a real person for anything I can't confirm.",
};

export default function AssistantWidget() {
  const { selectedStateCode, stateName } = useAssistantScreen();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const face: WidgetState = loading
    ? 'thinking'
    : lastAssistant?.tier === 'BEYOND'
      ? 'empathetic'
      : lastAssistant && messages.length > 1
        ? 'explaining'
        : 'welcoming';

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, stateCode: selectedStateCode, history }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? "Sorry — something went wrong. Please try again, or reach out to legal aid.",
          tier: (data.tier as Tier) ?? 'GENERAL',
          citations: data.citations ?? [],
          legalAid: data.legalAid ?? [],
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          tier: 'BEYOND',
          content: "I couldn't reach the server just now. For anything time-sensitive, please contact a legal aid office directly.",
          legalAid: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        aria-label="Open Willow, the Turnleaf assistant"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
          borderRadius: '50px', padding: '0.6rem 1.1rem 0.6rem 0.6rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 32px rgba(77, 124, 89, 0.35)',
        }}
      >
        <img src="/willow/welcoming.png" alt="" width={36} height={36}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-primary-light)' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MessageCircle size={16} /> Ask Willow
        </span>
      </button>
    );
  }

  return (
    <div
      className="glass-card animate-slide-up"
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
        width: 'min(370px, calc(100vw - 2rem))', maxHeight: '70vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-card-border)' }}>
        <img src={FACE[face]} alt="Willow" width={40} height={40}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-primary-light)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 600, color: 'var(--color-text)' }}>Willow</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>Turnleaf Assistant</div>
        </div>
        <button aria-label="Close assistant" onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      {/* Persistent, non-dismissible disclaimer */}
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-card-border)' }}>
        General information, not legal advice. Confirm with a legal aid attorney or court clerk before filing.
      </div>

      {/* Context chip */}
      {stateName && (
        <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'var(--color-primary-dark)' }}>
          Answering for <strong>{stateName}</strong>
        </div>
      )}

      {/* Message list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-primary)', color: '#FAF9F5', borderRadius: '14px 14px 2px 14px', padding: '0.55rem 0.8rem', fontSize: '0.9rem' }}>
              {m.content}
            </div>
          ) : (
            <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {m.tier && (() => {
                const b = TIER_BADGE[m.tier] ?? TIER_BADGE.GENERAL;
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'flex-start', background: b.bg, color: b.color, borderRadius: '9999px', padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700 }}>
                    <b.Icon size={13} /> {b.label}
                  </span>
                );
              })()}
              <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: '2px 14px 14px 14px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                {m.content}
                {m.citations && m.citations.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {m.citations.map((c, j) => c.url ? (
                      <a key={j} href={c.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        {c.label} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span key={j} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{c.label}</span>
                    ))}
                  </div>
                )}
                {m.legalAid && m.legalAid.length > 0 && m.tier === 'BEYOND' && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {m.legalAid.map((la, j) => (
                      <a key={j} href={la.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <ExternalLink size={12} /> {la.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Willow is thinking…</div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-card-border)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask about the verified rules…"
          className="input-field"
          style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem 0.7rem', borderRadius: '10px', border: '1px solid var(--color-card-border)', background: 'var(--color-card-bg)', color: 'var(--color-text)' }}
        />
        <button aria-label="Send" onClick={send} disabled={loading || !input.trim()} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', borderRadius: '10px' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

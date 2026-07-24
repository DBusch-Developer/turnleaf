import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AssistantProvider } from '../components/AssistantContext';

export const metadata: Metadata = {
  title: 'Turnleaf | 50-State Criminal Record Expungement Eligibility Checker',
  description: 'Check your eligibility for expungement, record sealing, and set-asides across all 50 states. 100% confidential, free, and anonymous.',
  keywords: 'expungement, record sealing, criminal record, set aside, certificate of second chance, legal aid, reentry, fair chance, justice impacted',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Persistent App Header */}
        <header className="site-header">
          <div className="container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span style={{
                fontSize: '1.7rem',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                color: 'var(--color-primary)',
                letterSpacing: '-0.025em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <img
                  src="/logo-leaf.png"
                  alt="Turnleaf logo"
                  width="52"
                  height="52"
                  style={{ width: '3.25rem', height: '3.25rem', objectFit: 'contain', flexShrink: 0, marginRight: '-0.9rem' }}
                /> Turnleaf
              </span>
              <span style={{
                fontSize: '0.7rem',
                padding: '0.28rem 0.65rem',
                borderRadius: '9999px',
                background: 'var(--color-primary)',
                color: '#FAF9F5',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                50-State
              </span>
            </div>

            <div className="header-badge">
              <span style={{ fontSize: '0.95rem' }}>🔒</span>
              <span>Private &amp; confidential — no account needed</span>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AssistantProvider>{children}</AssistantProvider>
        </main>

        {/* Persistent Legal Disclaimer Footer (NFR-1 / R1) */}
        <footer className="site-footer" style={{
          background: 'var(--color-bg-alt)',
          borderTop: '1px solid var(--color-card-border)',
          padding: '2rem 0',
          marginTop: 'auto',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)'
        }}>
          {/* Decorative sprigs, hidden from assistive tech. The disclaimer is the
              only place they appear, so they read as a deliberate flourish rather
              than scattered ornament. */}
          <img src="/leaves-left.png" alt="" aria-hidden="true" className="footer-leaf footer-leaf--left" />
          <img src="/leaves-right.png" alt="" aria-hidden="true" className="footer-leaf footer-leaf--right" />

          <div className="container">
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                LEGAL INFORMATION DISCLAIMER
              </p>
              <p style={{ lineHeight: '1.6' }}>
                Turnleaf is a screening tool built to reference published legal rules. It displays potential eligibility and references state statutes, but does not provide legal advice or definitive filing determinations. A legal aid attorney, public defender, or court clerk should verify all details before filing any petition. Use of this application does not establish an attorney-client relationship.
              </p>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.75rem' }}>
                &copy; {new Date().getFullYear()} Turnleaf.
              </p>
              <p style={{ fontSize: '0.72rem' }}>
                <a href="/?demo=checkr" style={{ color: 'var(--color-text-light)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Checkr integration demo
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

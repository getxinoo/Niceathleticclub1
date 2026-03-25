/**
 * AccessDenied.tsx – Access State Components
 * ─────────────────────────────────────────────────────────────────────────────
 * Three states: AccessDenied (403), SessionExpired (401), MissingPermission
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldX, Clock, Lock, ArrowLeft, LogIn, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router';

// ── Access Denied (403) ───────────────────────────────────────────────────────
export function AccessDenied({ message, backTo }: { message?: string; backTo?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
        style={{ maxWidth: '420px' }}
      >
        <div
          className="w-16 h-16 mx-auto flex items-center justify-center mb-5"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <ShieldX size={28} style={{ color: '#EF4444' }} />
        </div>

        <h2
          className="text-white mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Zugriff verweigert
        </h2>

        <p
          className="mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6,
          }}
        >
          {message ?? 'Du hast nicht die erforderlichen Berechtigungen, um auf diesen Bereich zuzugreifen. Wende dich an einen Administrator.'}
        </p>

        <div className="flex items-center justify-center gap-3">
          {backTo && (
            <Link
              to={backTo}
              className="flex items-center gap-2 px-4 text-white/50 hover:text-white/80 transition-colors"
              style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                minHeight: '44px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ArrowLeft size={14} /> Zurück
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Session Expired (401) ─────────────────────────────────────────────────────
export function SessionExpired() {
  return (
    <div
      className="flex items-center justify-center p-6"
      style={{ minHeight: '100vh', background: '#050505' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
        style={{ maxWidth: '420px' }}
      >
        <div
          className="w-16 h-16 mx-auto flex items-center justify-center mb-5"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <Clock size={28} style={{ color: '#F59E0B' }} />
        </div>

        <h2
          className="text-white mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Sitzung abgelaufen
        </h2>

        <p
          className="mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6,
          }}
        >
          Deine Sitzung ist abgelaufen. Bitte melde dich erneut an, um fortzufahren.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 text-white"
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            minHeight: '48px',
            background: 'var(--brand)',
            boxShadow: '0 0 20px rgba(202,12,133,0.3)',
          }}
        >
          <LogIn size={15} /> Erneut anmelden
        </Link>
      </motion.div>
    </div>
  );
}

// ── Missing Permission (inline, softer) ───────────────────────────────────────
export function MissingPermission({
  permission,
  compact = false,
}: {
  permission?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 p-3"
        style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.12)',
          borderRadius: '2px',
        }}
      >
        <Lock size={12} style={{ color: 'rgba(239,68,68,0.5)', flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: 'rgba(239,68,68,0.6)',
            textTransform: 'uppercase',
          }}
        >
          Berechtigung fehlt{permission ? `: ${permission}` : ''}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(239,68,68,0.04)',
        border: '1px solid rgba(239,68,68,0.1)',
      }}
    >
      <Lock size={14} style={{ color: 'rgba(239,68,68,0.4)', flexShrink: 0 }} />
      <div>
        <p
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'rgba(239,68,68,0.6)',
            textTransform: 'uppercase',
          }}
        >
          Fehlende Berechtigung
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
          Für diese Aktion benötigst du{permission ? ` die Berechtigung "${permission}"` : ' zusätzliche Rechte'}.
          Wende dich an einen Administrator.
        </p>
      </div>
    </div>
  );
}

// ── Dev Mock Session Warning ──────────────────────────────────────────────────
const DEV_WARN_DISMISSED_KEY = 'nac_devwarn_dismissed';

export function DevMockWarning() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DEV_WARN_DISMISSED_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DEV_WARN_DISMISSED_KEY, '1'); } catch { /* noop */ }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.15)',
        borderRadius: '2px',
      }}
    >
      <RefreshCw size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />
      <span
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'rgba(245,158,11,0.6)',
          textTransform: 'uppercase',
          flex: 1,
        }}
      >
        Dev-Modus – API nicht verbunden
      </span>
      <button
        onClick={handleDismiss}
        title="Schließen"
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: 'rgba(245,158,11,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#F59E0B')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,158,11,0.4)')}
      >
        <X size={11} />
      </button>
    </div>
  );
}
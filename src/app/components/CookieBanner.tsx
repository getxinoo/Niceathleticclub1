/**
 * DSGVO-compliant Cookie Consent Banner
 *
 * Stores consent in localStorage under "nice_cookie_consent".
 * Dispatches a custom event "cookie-consent-changed" so analytics
 * scripts can react.
 *
 * Three categories:
 *   - necessary   (always on, cannot be disabled)
 *   - analytics   (Google Analytics / GA4)
 *   - marketing   (future use)
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { Cookie, Settings, ShieldCheck, X, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CookieConsent {
  necessary: boolean;  // always true
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "nice_cookie_consent";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeConsent(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: consent }));
}

/** Public helper: other components can import this to check consent. */
export function getCookieConsent(): CookieConsent | null {
  return getStoredConsent();
}

/** Public helper: lets other components open the banner settings. */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent("open-cookie-settings"));
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "necessary" as const,
    label: "Technisch notwendig",
    desc: "Diese Cookies sind für den Betrieb der Website unerlässlich (z. B. Session-Management, Login-Token). Sie können nicht deaktiviert werden.",
    locked: true,
  },
  {
    key: "analytics" as const,
    label: "Analyse & Statistik",
    desc: "Google Analytics (GA4) hilft uns, die Nutzung unserer Website zu verstehen und zu verbessern. IP-Adressen werden anonymisiert.",
    locked: false,
  },
  {
    key: "marketing" as const,
    label: "Marketing",
    desc: "Diese Cookies werden verwendet, um Ihnen relevante Werbung und Inhalte anzuzeigen (z. B. Google Ads, Remarketing). Derzeit nicht aktiv.",
    locked: false,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function CookieBanner() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: "",
  });

  // Show banner if no stored consent
  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so the page loads first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for "open-cookie-settings" events (from footer link / datenschutz page)
  useEffect(() => {
    const handler = () => {
      const stored = getStoredConsent();
      if (stored) {
        setConsent(stored);
      }
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, []);

  const save = useCallback((c: CookieConsent) => {
    const final = { ...c, timestamp: new Date().toISOString() };
    storeConsent(final);
    setVisible(false);
    setShowDetails(false);
  }, []);

  const acceptAll = () => save({ ...consent, analytics: true, marketing: true });
  const acceptNecessary = () => save({ ...consent, analytics: false, marketing: false });
  const saveSelection = () => save(consent);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => {}}
            aria-hidden="true"
          />

          {/* Banner */}
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
            role="dialog"
            aria-label="Cookie-Einstellungen"
          >
            <div
              className="max-w-3xl mx-auto overflow-hidden"
              style={{
                background: "rgba(18,18,18,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(202,12,133,0.06)",
              }}
            >
              {/* Header */}
              <div className="p-5 md:p-6 pb-0">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 flex items-center justify-center shrink-0"
                    style={{ background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)" }}
                  >
                    <Cookie size={16} style={{ color: "var(--brand)" }} />
                  </div>
                  <div>
                    <h3
                      className="text-white"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.15rem",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Cookie-Einstellungen
                    </h3>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  Wir nutzen Cookies und ähnliche Technologien, um unsere Website zu betreiben und
                  zu verbessern. Einige sind technisch notwendig, andere helfen uns, die Nutzung
                  zu analysieren. Mehr dazu in unserer{" "}
                  <Link
                    to="/datenschutz"
                    className="transition-colors duration-200"
                    style={{ color: "var(--brand)" }}
                    onClick={() => { setVisible(false); setShowDetails(false); }}
                  >
                    Datenschutzerklärung
                  </Link>.
                </p>
              </div>

              {/* Details toggle */}
              <div className="px-5 md:px-6 pt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="inline-flex items-center gap-2 transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 0",
                    minHeight: "44px",
                    minWidth: "44px",
                  }}
                >
                  <Settings size={12} />
                  Einstellungen anpassen
                  {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Category toggles */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 md:px-6 py-3 space-y-2">
                      {CATEGORIES.map(({ key, label, desc, locked }) => (
                        <div
                          key={key}
                          className="flex items-start gap-3 p-3"
                          style={{
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {/* Toggle */}
                          <button
                            onClick={() => {
                              if (locked) return;
                              setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
                            }}
                            disabled={locked}
                            className="mt-0.5 shrink-0 relative"
                            style={{
                              width: "36px",
                              height: "20px",
                              borderRadius: "10px",
                              background: (locked || consent[key])
                                ? "var(--brand)"
                                : "rgba(255,255,255,0.12)",
                              border: "none",
                              cursor: locked ? "not-allowed" : "pointer",
                              transition: "background 0.2s",
                              opacity: locked ? 0.6 : 1,
                              minHeight: "20px",
                            }}
                            aria-label={`${label} ${consent[key] ? "deaktivieren" : "aktivieren"}`}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: "2px",
                                left: (locked || consent[key]) ? "18px" : "2px",
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                background: "white",
                                transition: "left 0.2s",
                              }}
                            />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-white/80"
                                style={{
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {label}
                              </span>
                              {locked && (
                                <span
                                  className="px-1.5 py-0.5"
                                  style={{
                                    fontFamily: "var(--font-condensed)",
                                    fontSize: "8px",
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    color: "rgba(255,255,255,0.4)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Erforderlich
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5, marginTop: "2px" }}>
                              {desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="p-5 md:p-6 pt-4 flex flex-wrap gap-3">
                <button
                  onClick={acceptAll}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-white transition-all duration-200 active:scale-[0.98]"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "12px 24px",
                    background: "var(--brand)",
                    border: "none",
                    cursor: "pointer",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <ShieldCheck size={14} />
                  Alle akzeptieren
                </button>

                {showDetails ? (
                  <button
                    onClick={saveSelection}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "12px 24px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      minHeight: "48px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--brand)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }}
                  >
                    Auswahl speichern
                  </button>
                ) : (
                  <button
                    onClick={acceptNecessary}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "12px 24px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      minHeight: "48px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--brand)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }}
                  >
                    Nur notwendige
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

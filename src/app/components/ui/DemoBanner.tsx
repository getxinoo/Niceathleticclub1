/**
 * DemoBanner.tsx
 * Zeigt einen Banner nur wenn der User tatsächlich mit einem Dev-Mock-Token
 * eingeloggt ist (kein echter JWT vom Backend).
 *
 * Logik ist identisch zum Admin-Bereich (isMockSession aus AuthContext),
 * damit beide Portale konsistent reagieren.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ── Storage key (sessionStorage – reset bei Tab-Schließen) ───────────────────
const DISMISSED_KEY = "nac_demo_banner_dismissed";

export function DemoBanner() {
  const { isMockSession } = useAuth();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Banner nur anzeigen wenn wirklich Mock-Session (Token = dev-mock-*)
  const show = isMockSession && !dismissed;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* noop */ }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center gap-3 px-4 py-2.5"
          style={{
            background: "rgba(251,191,36,0.08)",
            borderBottom: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: "4px",
            }}
          >
            <WifiOff size={13} style={{ color: "#fbbf24" }} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#fbbf24",
              }}
            >
              DEV-MODUS
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(251,191,36,0.7)",
                lineHeight: 1.4,
              }}
            >
              API nicht verbunden – es werden lokale Beispieldaten angezeigt.
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer"
            style={{
              width: "32px",
              height: "32px",
              background: "none",
              border: "1px solid rgba(251,191,36,0.15)",
              borderRadius: "4px",
              color: "rgba(251,191,36,0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fbbf24")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(251,191,36,0.5)")}
            title="Banner schliessen"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

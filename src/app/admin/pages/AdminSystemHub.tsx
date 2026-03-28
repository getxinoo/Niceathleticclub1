/**
 * AdminSystemHub.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified System-Hub: System-Check, Integrationen & Audit-Log in einem
 * tab-basierten Interface.
 *
 * Features:
 *  • URL-basiertes Tab-State (?tab=…) – Deep-Linking & Browser-Back
 *  • Permission-Filter – Tabs werden ausgeblendet wenn keine Permission
 *  • Automatischer Redirect auf ersten erlaubten Tab
 *  • "Kein Zugang"-State wenn alle Tabs verboten sind
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Server, Cable, ShieldAlert, ChevronRight, Lock } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { P, type PermissionKey } from "../../../lib/permissions";

import AdminDiagnostics  from "./AdminDiagnostics";
import AdminIntegrations from "./AdminIntegrations";
import AdminAudit        from "./AdminAudit";

// ── Tab Definitions ───────────────────────────────────────────────────────────

type TabId = "systemcheck" | "integrationen" | "audit";

interface TabDef {
  id:          TabId;
  label:       string;
  labelShort:  string;
  icon:        React.ElementType;
  description: string;
  color:       string;
  colorBg:     string;
  colorBorder: string;
  permission:  PermissionKey;
}

const TABS: TabDef[] = [
  {
    id:          "systemcheck",
    label:       "System-Check",
    labelShort:  "Check",
    icon:        Server,
    description: "API-Endpunkte & Verbindungsstatus in Echtzeit überwachen",
    color:       "#6366F1",
    colorBg:     "rgba(99,102,241,0.10)",
    colorBorder: "rgba(99,102,241,0.28)",
    permission:  P.DIAGNOSTICS_VIEW,
  },
  {
    id:          "integrationen",
    label:       "Integrationen",
    labelShort:  "Integr.",
    icon:        Cable,
    description: "Magicline Connect, SMTP & externe Dienste konfigurieren",
    color:       "#22C55E",
    colorBg:     "rgba(34,197,94,0.10)",
    colorBorder: "rgba(34,197,94,0.28)",
    permission:  P.INTEGRATIONS_MANAGE,
  },
  {
    id:          "audit",
    label:       "Audit-Log",
    labelShort:  "Audit",
    icon:        ShieldAlert,
    description: "DSGVO-konformes System-Protokoll aller Ereignisse",
    color:       "#A855F7",
    colorBg:     "rgba(168,85,247,0.10)",
    colorBorder: "rgba(168,85,247,0.28)",
    permission:  P.AUDIT_READ,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSystemHub() {
  const [params, setParams] = useSearchParams();
  const { hasPermission } = useAuth();

  // Only show tabs the current user has permission for
  const allowedTabs = TABS.filter((t) => hasPermission(t.permission));

  const requestedId = params.get("tab") as TabId | null;
  const activeTab =
    allowedTabs.find((t) => t.id === requestedId) ?? allowedTabs[0] ?? null;

  // Auto-redirect: if the requested tab is not allowed (or undefined), switch to
  // the first allowed one without adding a history entry.
  useEffect(() => {
    if (!activeTab) return;
    if (requestedId !== activeTab.id) {
      setParams({ tab: activeTab.id }, { replace: true });
    }
  }, [activeTab, requestedId, setParams]);

  const switchTab = (id: TabId) =>
    setParams({ tab: id }, { replace: true });

  // ── No access at all ──────────────────────────────────────────────────────
  if (allowedTabs.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-4"
        style={{ minHeight: "40vh" }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Lock size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
        </div>
        <div className="text-center">
          <p
            className="text-white"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            KEIN ZUGANG
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Du hast keine Berechtigung für System &amp; Tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Hub Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 mb-5"
        style={{ flexWrap: "wrap" }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
            <span
              className="text-white"
              style={{
                fontFamily:    "var(--font-condensed)",
                fontSize:      "20px",
                fontWeight:    700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                lineHeight:    1.2,
              }}
            >
              System &amp; Tools
            </span>
            {activeTab && (
              <>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                <span
                  style={{
                    fontFamily:    "var(--font-condensed)",
                    fontSize:      "13px",
                    fontWeight:    600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:         activeTab.color,
                  }}
                >
                  {activeTab.label}
                </span>
              </>
            )}
          </div>
          {activeTab && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", lineHeight: 1.4 }}>
              {activeTab.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 mb-6 overflow-x-auto"
        role="tablist"
        aria-label="System-Hub Navigation"
        style={{
          background:     "rgba(255,255,255,0.015)",
          border:         "1px solid rgba(255,255,255,0.07)",
          borderRadius:   "8px",
          padding:        "5px",
          flexShrink:     0,
          scrollbarWidth: "none",
        }}
      >
        {allowedTabs.map((tab) => {
          const Icon     = tab.icon;
          const isActive = activeTab?.id === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(tab.id)}
              className="relative flex items-center gap-2 flex-1 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#CA0C85]"
              style={{
                fontFamily:     "var(--font-condensed)",
                fontSize:       "12px",
                fontWeight:     isActive ? 700 : 500,
                letterSpacing:  "0.1em",
                textTransform:  "uppercase",
                color:          isActive ? "#ffffff" : "rgba(255,255,255,0.38)",
                background:     isActive ? tab.colorBg : "transparent",
                border:         isActive ? `1px solid ${tab.colorBorder}` : "1px solid transparent",
                borderRadius:   "5px",
                padding:        "9px 16px",
                minHeight:      "44px",
                minWidth:       "110px",
                justifyContent: "center",
                whiteSpace:     "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.38)";
              }}
            >
              <span className="relative flex items-center gap-2">
                <Icon
                  size={14}
                  style={{ color: isActive ? tab.color : "inherit", flexShrink: 0 }}
                />
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden">{tab.labelShort}</span>
              </span>

              {/* Active indicator line */}
              {isActive && (
                <motion.span
                  layoutId="hub-tab-line"
                  className="absolute"
                  style={{
                    bottom:        "5px",
                    left:          "50%",
                    transform:     "translateX(-50%)",
                    width:         "28px",
                    height:        "2px",
                    background:    tab.color,
                    borderRadius:  "999px",
                    pointerEvents: "none",
                  }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab && (
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab.id === "systemcheck"   && <AdminDiagnostics />}
            {activeTab.id === "integrationen" && <AdminIntegrations />}
            {activeTab.id === "audit"         && <AdminAudit />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

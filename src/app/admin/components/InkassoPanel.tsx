/**
 * InkassoPanel – Inkasso-Wall & Forderungsmanagement
 * Zeigt alle Faelle mit dunning_level 3 (Inkasso), Status-Tracking und Notizen.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gavel, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  RefreshCw, Euro, Clock, Ban, FileText,
} from "lucide-react";
import { api } from "../../../lib/api-service";
import type { InkassoCase } from "../../../lib/api-service";
import { toast } from "sonner";

type InkassoStatus = InkassoCase["status"];

const STATUS_CFG: Record<InkassoStatus, { label: string; color: string; bg: string }> = {
  offen:           { label: "Offen",          color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  uebergeben:      { label: "An Inkasso",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  bezahlt:         { label: "Bezahlt",        color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  abgeschrieben:   { label: "Abgeschrieben",  color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const LABEL = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

export default function InkassoPanel() {
  const [cases, setCases]     = useState<InkassoCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.finances.inkassoList();
      setCases(data);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalOpen  = cases.filter(c => c.status === "offen" || c.status === "uebergeben").reduce((s, c) => s + c.amount, 0);
  const openCount  = cases.filter(c => c.status === "offen").length;
  const passedCount = cases.filter(c => c.status === "uebergeben").length;

  const handleStatusChange = async (c: InkassoCase, newStatus: InkassoStatus) => {
    try {
      await api.admin.finances.updateInkasso(c.id, { status: newStatus });
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
      toast.success(`Inkasso-Fall ${c.invoice_number ?? c.id} auf "${STATUS_CFG[newStatus].label}" gesetzt.`);
    } catch {
      toast.error("Fehler beim Aktualisieren.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Warning Banner */}
      <div style={{
        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
        padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: "12px",
      }}>
        <AlertTriangle size={20} style={{ color: "#f87171", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f87171", fontWeight: 700, lineHeight: 1.5 }}>
            Inkasso-Wall – Forderungsmanagement
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: "4px" }}>
            Hier werden alle Faelle mit <strong style={{ color: "white" }}>Mahnstufe 3</strong> aufgelistet.
            Diese Forderungen koennen an einen externen Inkasso-Partner uebergeben oder als uneinbringlich abgeschrieben werden.
            Alle Aktionen werden im Audit-Log protokolliert.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "Offene Forderungen", value: `${totalOpen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} \u20AC`, accent: "#f87171", icon: Euro },
          { label: "Offen (unbearbeitet)", value: String(openCount), accent: "#f87171", icon: Clock },
          { label: "An Inkasso uebergeben", value: String(passedCount), accent: "#f59e0b", icon: ExternalLink },
          { label: "Faelle gesamt", value: String(cases.length), accent: "rgba(255,255,255,0.4)", icon: Gavel },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderTop: `2px solid ${s.accent}`, padding: "16px 20px",
            }}
          >
            <p style={{ ...LABEL, marginBottom: "6px" }}>{s.label}</p>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: loading ? "rgba(255,255,255,0.15)" : s.accent, lineHeight: 1 }}>
                {loading ? "\u2014" : s.value}
              </span>
              <s.icon size={16} style={{ color: s.accent, opacity: 0.5 }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          Faelle mit Mahnstufe 3 – Inkasso / Abschreibung
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Aktualisieren
        </button>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--brand)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Inkasso-Faelle…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <CheckCircle2 size={28} style={{ color: "rgba(74,222,128,0.3)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Keine Inkasso-Faelle – alle Forderungen im gruenen Bereich.</span>
            </div>
          ) : cases.map((c) => {
            const cfg = STATUS_CFG[c.status];
            const isExpanded = expanded === c.id;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${cfg.color}`, overflow: "hidden",
                }}
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer transition-all"
                  style={{ background: "none", border: "none", minHeight: "56px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div className="flex-1 min-w-0" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "center" }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.08em" }}>
                        {c.invoice_number ?? c.id}
                      </p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                        {c.member_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, color: "#f87171" }}>
                        {c.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {"\u20AC"}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                        Eskaliert am {new Date(c.escalated_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "3px 10px", background: cfg.bg,
                        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </button>

                {/* Expandable Detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div>
                            <p style={LABEL}>Externe Referenz</p>
                            <p style={{ fontSize: "13px", color: c.external_ref ? "white" : "rgba(255,255,255,0.2)", marginTop: "4px" }}>
                              {c.external_ref ?? "Noch nicht zugewiesen"}
                            </p>
                          </div>
                          <div>
                            <p style={LABEL}>Rechnungs-ID</p>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px", fontFamily: "monospace" }}>
                              {c.invoice_id}
                            </p>
                          </div>
                        </div>
                        {c.notes && (
                          <div style={{ marginBottom: "14px" }}>
                            <p style={LABEL}>Notizen</p>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginTop: "4px" }}>
                              {c.notes}
                            </p>
                          </div>
                        )}
                        {/* Status Actions */}
                        <div className="flex flex-wrap gap-2">
                          {c.status === "offen" && (
                            <button
                              onClick={() => handleStatusChange(c, "uebergeben")}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "5px",
                                padding: "6px 14px", background: "rgba(245,158,11,0.1)",
                                border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b",
                                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                              }}
                            >
                              <ExternalLink size={11} /> An Inkasso uebergeben
                            </button>
                          )}
                          {(c.status === "offen" || c.status === "uebergeben") && (
                            <>
                              <button
                                onClick={() => handleStatusChange(c, "bezahlt")}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "5px",
                                  padding: "6px 14px", background: "rgba(74,222,128,0.08)",
                                  border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80",
                                  fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                  letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                                }}
                              >
                                <CheckCircle2 size={11} /> Als bezahlt markieren
                              </button>
                              <button
                                onClick={() => handleStatusChange(c, "abgeschrieben")}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "5px",
                                  padding: "6px 14px", background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)",
                                  fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                  letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                                }}
                              >
                                <Ban size={11} /> Abschreiben
                              </button>
                            </>
                          )}
                          {c.status === "bezahlt" && (
                            <span style={{ fontSize: "11px", color: "rgba(74,222,128,0.5)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 0" }}>
                              <CheckCircle2 size={11} style={{ display: "inline", marginRight: "4px" }} /> Forderung beglichen
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

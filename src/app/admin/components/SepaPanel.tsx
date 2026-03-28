/**
 * SepaPanel – SEPA-Mandatsverwaltung
 * Features:
 * - Desktop-Tabelle + Mobile Card View
 * - Status-Pills, Revoke-Aktion
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Landmark, Loader2, Shield, XCircle, Clock, CheckCircle2, RefreshCw, Hash,
} from "lucide-react";
import { api } from "../../../lib/api-service";
import type { SepaMandate, MandateStatus } from "../../../lib/api-service";
import { toast } from "sonner";

const STATUS_CFG: Record<MandateStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:  { label: "Aktiv",      color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: CheckCircle2 },
  pending: { label: "Ausstehend", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   icon: Clock },
  revoked: { label: "Widerrufen", color: "#9ca3af", bg: "rgba(156,163,175,0.08)", icon: XCircle },
  failed:  { label: "Fehlerhaft", color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: XCircle },
};

const LABEL = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

export default function SepaPanel() {
  const [mandates, setMandates]   = useState<SepaMandate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [revokingId, setRevoking] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.finances.mandates();
      setMandates(data);
    } catch { /* mock fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (m: SepaMandate) => {
    setRevoking(m.id);
    try {
      await api.admin.finances.revokeMandate(m.id);
      toast.success(`Mandat ${m.mandate_reference} widerrufen`, {
        description: `SEPA-Mandat für ${m.member_name} wurde widerrufen.`,
      });
      setMandates(prev => prev.map(x => x.id === m.id ? { ...x, status: "revoked" as MandateStatus, revoked_at: new Date().toISOString() } : x));
    } catch {
      toast.error("Fehler beim Widerruf.");
    } finally {
      setRevoking(null);
    }
  };

  const active  = mandates.filter(m => m.status === "active").length;
  const pending = mandates.filter(m => m.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* CSS: Mobile Card View */}
      <style>{`
        .sepa-table-wrap { display: block; }
        .sepa-cards-wrap { display: none; }
        @media (max-width: 768px) {
          .sepa-table-wrap { display: none !important; }
          .sepa-cards-wrap { display: block !important; }
          .sepa-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .sepa-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Stats */}
      <div className="sepa-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        {[
          { label: "Aktive Mandate", value: String(active),           accent: "#4ade80",      icon: Shield },
          { label: "Ausstehend",     value: String(pending),          accent: "#fbbf24",      icon: Clock },
          { label: "Gesamt",         value: String(mandates.length),  accent: "var(--brand)", icon: Landmark },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderTop: `2px solid ${s.accent}`, padding: "16px 18px" }}
          >
            <p style={{ ...LABEL, marginBottom: "6px" }}>{s.label}</p>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: loading ? "rgba(255,255,255,0.15)" : s.accent, lineHeight: 1 }}>
                {loading ? "—" : s.value}
              </span>
              <s.icon size={16} style={{ color: s.accent, opacity: 0.5 }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          SEPA-Lastschriftmandate aller Mitglieder
        </p>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Aktualisieren
        </button>
      </div>

      {/* ── Desktop: Tabelle ── */}
      <div className="sepa-table-wrap">
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "780px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Mandatsreferenz", "Mitglied", "IBAN (maskiert)", "BIC", "Erteilt am", "Nächster Einzug", "Status", "Aktion"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", background: "rgba(255,255,255,0.015)", ...LABEL, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {loading ? (
                    <tr key="ld"><td colSpan={8}>
                      <div className="flex items-center justify-center gap-3 py-14">
                        <Loader2 size={16} className="animate-spin" style={{ color: "var(--brand)" }} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Mandate…</span>
                      </div>
                    </td></tr>
                  ) : mandates.length === 0 ? (
                    <tr key="empty"><td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <Landmark size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Keine SEPA-Mandate vorhanden.</span>
                      </div>
                    </td></tr>
                  ) : mandates.map((m, idx) => {
                    const cfg = STATUS_CFG[m.status] ?? STATUS_CFG.pending;
                    const isRevoked = m.status === "revoked";
                    return (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: isRevoked ? 0.5 : 1 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <div className="flex items-center gap-2">
                            <Hash size={10} style={{ color: "rgba(255,255,255,0.2)" }} />
                            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}>
                              {m.mandate_reference}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>
                          {m.member_name}
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
                          {m.iban_masked}
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                          {m.bic ?? "–"}
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                          {new Date(m.signed_at).toLocaleDateString("de-DE")}
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "var(--font-body)", fontSize: "12px", color: m.next_collection_date ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                          {m.next_collection_date ? new Date(m.next_collection_date).toLocaleDateString("de-DE") : "–"}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="inline-flex items-center gap-1.5" style={{ padding: "3px 8px", background: cfg.bg, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.color }}>
                            <cfg.icon size={9} /> {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {m.status === "active" && (
                            <button
                              disabled={revokingId === m.id}
                              onClick={() => handleRevoke(m)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "5px 10px", background: "rgba(239,68,68,0.06)",
                                border: "1px solid rgba(239,68,68,0.15)", color: "#f87171",
                                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                cursor: revokingId === m.id ? "not-allowed" : "pointer",
                                opacity: revokingId === m.id ? 0.5 : 1, transition: "all 0.15s",
                              }}
                            >
                              {revokingId === m.id ? <Loader2 size={9} className="animate-spin" /> : <XCircle size={9} />}
                              Widerrufen
                            </button>
                          )}
                          {m.status === "revoked" && (
                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                              {m.revoked_at ? `am ${new Date(m.revoked_at).toLocaleDateString("de-DE")}` : "Widerrufen"}
                            </span>
                          )}
                          {m.status === "pending" && (
                            <span style={{ fontSize: "10px", color: "rgba(251,191,36,0.5)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                              Ausstehend
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {/* Footer */}
          {!loading && mandates.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                {mandates.length} Mandate · {active} aktiv · {pending} ausstehend
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: Cards ── */}
      <div className="sepa-cards-wrap">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--brand)" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Mandate…</span>
          </div>
        ) : mandates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Landmark size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Keine SEPA-Mandate.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {mandates.map((m, idx) => {
              const cfg = STATUS_CFG[m.status] ?? STATUS_CFG.pending;
              const isRevoked = m.status === "revoked";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.02 }}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: `3px solid ${cfg.color}`, padding: "14px 16px",
                    opacity: isRevoked ? 0.55 : 1,
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                        #{m.mandate_reference}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "white", marginTop: "2px" }}>
                        {m.member_name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5" style={{ padding: "3px 10px", background: cfg.bg, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.color, flexShrink: 0 }}>
                      <cfg.icon size={9} /> {cfg.label}
                    </span>
                  </div>

                  {/* IBAN + BIC */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div>
                      <p style={LABEL}>IBAN</p>
                      <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>{m.iban_masked}</p>
                    </div>
                    <div>
                      <p style={LABEL}>BIC</p>
                      <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>{m.bic ?? "–"}</p>
                    </div>
                    <div>
                      <p style={LABEL}>Erteilt am</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>
                        {new Date(m.signed_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div>
                      <p style={LABEL}>Nächster Einzug</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: m.next_collection_date ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)", marginTop: "3px" }}>
                        {m.next_collection_date ? new Date(m.next_collection_date).toLocaleDateString("de-DE") : "–"}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  {m.status === "active" && (
                    <button
                      disabled={revokingId === m.id}
                      onClick={() => handleRevoke(m)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: "7px 14px", background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.18)", color: "#f87171",
                        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        cursor: revokingId === m.id ? "not-allowed" : "pointer",
                        opacity: revokingId === m.id ? 0.5 : 1, transition: "all 0.15s",
                        minHeight: "44px",
                      }}
                    >
                      {revokingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                      Widerrufen
                    </button>
                  )}
                  {m.status === "revoked" && m.revoked_at && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                      Widerrufen am {new Date(m.revoked_at).toLocaleDateString("de-DE")}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

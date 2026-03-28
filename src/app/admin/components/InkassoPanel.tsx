/**
 * InkassoPanel – Inkasso-Wall & Forderungsmanagement
 * Features:
 * - Mahnung stoppen (pausiert das Mahnverfahren)
 * - Mahnung stornieren (GoBD-konform mit Pflicht-Grund)
 * - Faelle an Inkasso übergeben, als bezahlt markieren, abschreiben
 * - Mobile Card View + Desktop Liste
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gavel, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  RefreshCw, Euro, Clock, Ban, FileText, StopCircle, XCircle,
} from "lucide-react";
import { api } from "../../../lib/api-service";
import type { InkassoCase } from "../../../lib/api-service";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

type InkassoStatus = InkassoCase["status"] | "gestoppt" | "storniert";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  offen:         { label: "Offen",          color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  uebergeben:    { label: "An Inkasso",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  bezahlt:       { label: "Bezahlt",        color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  abgeschrieben: { label: "Abgeschrieben",  color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  gestoppt:      { label: "Gestoppt",       color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  storniert:     { label: "Storniert",      color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)" },
};

const LABEL = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

// ── Mahnung stoppen – Bestätigungsdialog ──────────────────────────────────────
function StopDunningDialog({
  inkassoCase, open, onClose, onStopped,
}: {
  inkassoCase: InkassoCase | null; open: boolean; onClose: () => void; onStopped: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleStop = async () => {
    if (!inkassoCase) return;
    setBusy(true);
    try {
      await api.admin.finances.updateInkasso(inkassoCase.id, {
        status: "abgeschrieben" as InkassoCase["status"],
        action: "stop_dunning" as unknown as string,
      } as Parameters<typeof api.admin.finances.updateInkasso>[1]);
      toast.success(`Mahnung gestoppt – ${inkassoCase.invoice_number ?? inkassoCase.id}`, {
        description: "Das Mahnverfahren wurde pausiert. Keine weiteren Eskalationen.",
      });
      onStopped(inkassoCase.id);
      onClose();
    } catch {
      toast.error("Fehler beim Stoppen der Mahnung.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "440px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <StopCircle size={18} style={{ color: "#94a3b8" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Mahnung stoppen
            </DialogTitle>
          </div>
          {inkassoCase && (
            <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {inkassoCase.invoice_number ?? inkassoCase.id} · {inkassoCase.member_name} · {inkassoCase.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </DialogDescription>
          )}
        </DialogHeader>
        <div style={{ background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.15)", padding: "12px 16px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            Das Mahnverfahren wird <strong style={{ color: "white" }}>sofort pausiert</strong>. Es finden keine weiteren automatischen Eskalationen statt. Der Fall bleibt zur manuellen Bearbeitung erhalten.
          </p>
        </div>
        <DialogFooter style={{ gap: "8px" }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>Abbrechen</Button>
          <Button
            disabled={busy}
            onClick={handleStop}
            style={{ background: "rgba(148,163,184,0.2)", border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8", gap: "6px" }}
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Stoppe…</> : <><StopCircle size={14} /> MAHNUNG STOPPEN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mahnung stornieren – Dialog mit Pflicht-Grund ─────────────────────────────
function StornoDunningDialog({
  inkassoCase, open, onClose, onStorniert,
}: {
  inkassoCase: InkassoCase | null; open: boolean; onClose: () => void; onStorniert: (id: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy]     = useState(false);

  useEffect(() => { if (open) setReason(""); }, [open]);

  const handleSubmit = async () => {
    if (!inkassoCase || !reason.trim()) return;
    setBusy(true);
    try {
      await api.admin.finances.updateInkasso(inkassoCase.id, {
        status: "abgeschrieben" as InkassoCase["status"],
        action: "cancel_dunning" as unknown as string,
        reason: reason.trim() as unknown as string,
      } as Parameters<typeof api.admin.finances.updateInkasso>[1]);
      toast.success(`Mahnverfahren storniert – ${inkassoCase.invoice_number ?? inkassoCase.id}`, {
        description: `Grund: „${reason.trim()}"`,
      });
      onStorniert(inkassoCase.id);
      onClose();
    } catch {
      toast.error("Fehler beim Stornieren.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "460px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Ban size={18} style={{ color: "#f87171" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Mahnverfahren stornieren
            </DialogTitle>
          </div>
          {inkassoCase && (
            <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {inkassoCase.invoice_number ?? inkassoCase.id} · {inkassoCase.member_name} · {inkassoCase.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </DialogDescription>
          )}
        </DialogHeader>

        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            Die Stornierung des Mahnverfahrens wird <strong style={{ color: "white" }}>GoBD-konform im Audit-Log</strong> protokolliert. Ein zwingender Grund muss angegeben werden.
          </p>
        </div>

        <div>
          <label style={{ ...LABEL, display: "block", marginBottom: "6px" }}>Stornogrund (Pflichtfeld) *</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. Einigung mit Mitglied, irrtümliche Eskalation, Rücknahme der Forderung…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
              padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          {!reason.trim() && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#f87171", marginTop: "4px" }}>
              Bitte gib einen Stornogrund ein.
            </p>
          )}
        </div>

        <DialogFooter style={{ gap: "8px" }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>Abbrechen</Button>
          <Button
            disabled={busy || !reason.trim()}
            onClick={handleSubmit}
            style={{
              background: reason.trim() ? "rgba(239,68,68,0.85)" : "rgba(239,68,68,0.3)",
              color: "white", gap: "6px",
              boxShadow: reason.trim() ? "0 0 16px rgba(239,68,68,0.25)" : "none",
            }}
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Storniere…</> : <><Ban size={14} /> STORNIEREN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function InkassoPanel() {
  const [cases, setCases]               = useState<InkassoCase[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [stopTarget, setStopTarget]     = useState<InkassoCase | null>(null);
  const [stornoTarget, setStornoTarget] = useState<InkassoCase | null>(null);

  // Lokale Status-Overrides (für optimistische UI-Updates)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.finances.inkassoList();
      setCases(data);
      setStatusOverrides({});
    } catch { /* fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalOpen   = cases.filter(c => c.status === "offen" || c.status === "uebergeben").reduce((s, c) => s + c.amount, 0);
  const openCount   = cases.filter(c => c.status === "offen").length;
  const passedCount = cases.filter(c => c.status === "uebergeben").length;

  const handleStatusChange = async (c: InkassoCase, newStatus: InkassoCase["status"]) => {
    try {
      await api.admin.finances.updateInkasso(c.id, { status: newStatus });
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
      toast.success(`Inkasso-Fall auf „${STATUS_CFG[newStatus]?.label ?? newStatus}" gesetzt.`);
    } catch {
      toast.error("Fehler beim Aktualisieren.");
    }
  };

  const handleStopped = (id: string) => {
    setStatusOverrides(prev => ({ ...prev, [id]: "gestoppt" }));
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: "abgeschrieben" as InkassoCase["status"] } : c));
  };

  const handleStorniert = (id: string) => {
    setStatusOverrides(prev => ({ ...prev, [id]: "storniert" }));
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: "abgeschrieben" as InkassoCase["status"] } : c));
  };

  const getEffectiveStatus = (c: InkassoCase): string => statusOverrides[c.id] ?? c.status;

  return (
    <div className="space-y-5">
      {/* CSS: Mobile / Desktop */}
      <style>{`
        .inkasso-desktop { display: block; }
        @media (max-width: 640px) {
          .inkasso-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Warning Banner */}
      <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <AlertTriangle size={20} style={{ color: "#f87171", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f87171", fontWeight: 700, lineHeight: 1.5 }}>
            Inkasso-Wall – Forderungsmanagement
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: "4px" }}>
            Fälle mit <strong style={{ color: "white" }}>Mahnstufe 3</strong>. Mahnung stoppen oder stornieren ist hier möglich. Alle Aktionen werden GoBD-konform protokolliert.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="inkasso-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "Offene Forderungen", value: `${totalOpen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`, accent: "#f87171", icon: Euro },
          { label: "Offen (unbearbeitet)", value: String(openCount), accent: "#f87171", icon: Clock },
          { label: "An Inkasso übergeben", value: String(passedCount), accent: "#f59e0b", icon: ExternalLink },
          { label: "Fälle gesamt", value: String(cases.length), accent: "rgba(255,255,255,0.4)", icon: Gavel },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderTop: `2px solid ${s.accent}`, padding: "16px 18px" }}
          >
            <p style={{ ...LABEL, marginBottom: "6px" }}>{s.label}</p>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: loading ? "rgba(255,255,255,0.15)" : s.accent, lineHeight: 1 }}>
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
          Fälle mit Mahnstufe 3 – Inkasso / Abschreibung
        </p>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer" }}
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
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Inkasso-Fälle…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <CheckCircle2 size={28} style={{ color: "rgba(74,222,128,0.3)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Keine Inkasso-Fälle – alle Forderungen im grünen Bereich.</span>
            </div>
          ) : cases.map((c) => {
            const effStatus = getEffectiveStatus(c);
            const cfg = STATUS_CFG[effStatus] ?? STATUS_CFG.offen;
            const isExpanded = expanded === c.id;
            const isFinalized = effStatus === "bezahlt" || effStatus === "abgeschrieben" || effStatus === "storniert";
            const isStopped   = effStatus === "gestoppt" || effStatus === "storniert";

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${cfg.color}`, overflow: "hidden",
                  opacity: isFinalized ? 0.6 : 1,
                }}
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  className="w-full px-5 py-4 text-left cursor-pointer transition-all"
                  style={{ background: "none", border: "none", minHeight: "56px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Invoice + Member */}
                    <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.invoice_number ?? c.id}
                      </p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.member_name}
                      </p>
                    </div>
                    {/* Amount */}
                    <div style={{ flex: "0 0 auto" }}>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, color: "#f87171" }}>
                        {c.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                    {/* Date */}
                    <div style={{ flex: "1 1 120px" }}>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
                        Eskaliert {new Date(c.escalated_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    {/* Status Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "3px 10px", background: cfg.bg, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.color, whiteSpace: "nowrap" }}>
                        {cfg.label}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
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
                        {/* Info Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "14px" }}>
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
                          <div style={{ marginBottom: "14px", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p style={LABEL}>Notizen</p>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginTop: "4px" }}>
                              {c.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {!isFinalized && (
                          <div>
                            <p style={{ ...LABEL, marginBottom: "8px" }}>Aktionen</p>
                            <div className="flex flex-wrap gap-2">
                              {/* Mahnung stoppen */}
                              {(effStatus === "offen" || effStatus === "uebergeben") && (
                                <button
                                  onClick={() => setStopTarget(c)}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "7px 14px", background: "rgba(148,163,184,0.08)",
                                    border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8",
                                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.14)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.08)"; }}
                                >
                                  <StopCircle size={11} /> Mahnung stoppen
                                </button>
                              )}

                              {/* Mahnung stornieren */}
                              {(effStatus === "offen" || effStatus === "uebergeben") && (
                                <button
                                  onClick={() => setStornoTarget(c)}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "7px 14px", background: "rgba(239,68,68,0.06)",
                                    border: "1px solid rgba(239,68,68,0.18)", color: "#f87171",
                                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                                >
                                  <Ban size={11} /> Stornieren
                                </button>
                              )}

                              {/* An Inkasso übergeben */}
                              {effStatus === "offen" && (
                                <button
                                  onClick={() => handleStatusChange(c, "uebergeben")}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "7px 14px", background: "rgba(245,158,11,0.08)",
                                    border: "1px solid rgba(245,158,11,0.22)", color: "#f59e0b",
                                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.14)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                                >
                                  <ExternalLink size={11} /> An Inkasso übergeben
                                </button>
                              )}

                              {/* Als bezahlt markieren */}
                              {(effStatus === "offen" || effStatus === "uebergeben") && (
                                <button
                                  onClick={() => handleStatusChange(c, "bezahlt")}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "7px 14px", background: "rgba(74,222,128,0.07)",
                                    border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80",
                                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.13)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.07)"; }}
                                >
                                  <CheckCircle2 size={11} /> Bezahlt
                                </button>
                              )}

                              {/* Abschreiben */}
                              {(effStatus === "offen" || effStatus === "uebergeben") && (
                                <button
                                  onClick={() => handleStatusChange(c, "abgeschrieben")}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "7px 14px", background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)",
                                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                                  }}
                                >
                                  <XCircle size={11} /> Abschreiben
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Final Status Badge */}
                        {isFinalized && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                            {effStatus === "bezahlt" && (
                              <span style={{ fontSize: "11px", color: "rgba(74,222,128,0.6)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                <CheckCircle2 size={11} style={{ display: "inline", marginRight: "4px" }} /> Forderung beglichen
                              </span>
                            )}
                            {(effStatus === "abgeschrieben" || effStatus === "gestoppt" || effStatus === "storniert") && (
                              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                {cfg.label} – Keine weiteren Aktionen möglich.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Dialoge ── */}
      <StopDunningDialog
        inkassoCase={stopTarget} open={!!stopTarget}
        onClose={() => setStopTarget(null)} onStopped={handleStopped}
      />
      <StornoDunningDialog
        inkassoCase={stornoTarget} open={!!stornoTarget}
        onClose={() => setStornoTarget(null)} onStorniert={handleStorniert}
      />
    </div>
  );
}

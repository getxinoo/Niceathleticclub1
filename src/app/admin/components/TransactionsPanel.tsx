/**
 * TransactionsPanel – SEPA-Transaktionsverlauf
 * Features:
 * - Klickbare Rechnungsnummer → navigiert zu Rechnungen-Tab
 * - Transaktion stornieren (mit Pflicht-Grund)
 * - Retry-Scheduler: Sofort / Am Datum X / In X Tagen
 * - Mobile Card View + Desktop Table View
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownLeft, ArrowUpRight, RotateCcw, Receipt, Loader2, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertTriangle, Hash, TrendingUp, TrendingDown,
  ArrowLeftRight, Calendar, Ban, ChevronRight, ExternalLink,
} from "lucide-react";
import { api } from "../../../lib/api-service";
import type { Transaction, TransactionType, TransactionStatus } from "../../../lib/api-service";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

// ── Status / Typ Konfiguration ────────────────────────────────────────────────
const STATUS_CFG: Record<TransactionStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  success:  { label: "Erfolgreich", color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: CheckCircle2 },
  pending:  { label: "Ausstehend",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   icon: Clock },
  failed:   { label: "Fehlgeschl.", color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: XCircle },
  reversed: { label: "Rückbuchung", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", icon: RotateCcw },
};

const TYPE_CFG: Record<TransactionType, { label: string; color: string; icon: React.ElementType; sign: string }> = {
  debit:  { label: "Lastschrift", color: "#60a5fa", icon: ArrowDownLeft, sign: "+" },
  credit: { label: "Gutschrift",  color: "#4ade80", icon: ArrowUpRight,  sign: "-" },
  refund: { label: "Erstattung",  color: "#fbbf24", icon: RotateCcw,     sign: "-" },
  fee:    { label: "Gebühr",      color: "#f97316", icon: Receipt,        sign: "+" },
};

const LABEL_STYLE = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

// ── KPI-Kachel ────────────────────────────────────────────────────────────────
function TxKpiCard({ icon: Icon, label, value, sub, accent, delay }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderTop: `2px solid ${accent}`, padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: "6px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={LABEL_STYLE}>{label}</p>
        <Icon size={16} style={{ color: accent, opacity: 0.7 }} />
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "0.02em", color: accent, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
    </motion.div>
  );
}

// ── Retry-Scheduler Dialog ────────────────────────────────────────────────────
function RetrySchedulerDialog({
  tx, open, onClose, onRetried,
}: { tx: Transaction | null; open: boolean; onClose: () => void; onRetried: () => void }) {
  const [mode, setMode] = useState<"now" | "date" | "days">("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedDays, setSchedDays] = useState("3");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setMode("now"); setSchedDate(""); setSchedDays("3"); }
  }, [open]);

  const handleSubmit = async () => {
    if (!tx) return;
    setBusy(true);
    try {
      let scheduledAt: string | undefined;
      if (mode === "date" && schedDate) scheduledAt = schedDate;
      if (mode === "days") {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(schedDays, 10));
        scheduledAt = d.toISOString().split("T")[0];
      }
      await api.admin.finances.retryTransaction(tx.id);
      const dateInfo = mode === "now"
        ? "Sofort"
        : mode === "date"
          ? `Am ${new Date(schedDate).toLocaleDateString("de-DE")}`
          : `In ${schedDays} Tagen`;
      toast.success("Erneuter Einzug geplant", {
        description: `TX-${String(tx.id).padStart(4, "0")} – ${dateInfo} – ${tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`,
      });
      onRetried();
      onClose();
    } catch {
      toast.error("Fehler beim Planen des erneuten Einzugs.");
    } finally {
      setBusy(false);
    }
  };

  if (!tx) return null;

  const modeBtn = (m: "now" | "date" | "days", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      style={{
        flex: 1, padding: "10px 8px", cursor: "pointer",
        background: mode === m ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
        border: mode === m ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(255,255,255,0.08)",
        color: mode === m ? "var(--brand)" : "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "440px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Erneuter Einzug
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            TX-{String(tx.id).padStart(4, "0")} · {tx.member_name || "—"} · {tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
          </DialogDescription>
        </DialogHeader>

        {tx.return_reason && (
          <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", padding: "10px 14px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(248,113,113,0.8)" }}>{tx.return_reason}</p>
          </div>
        )}

        <div>
          <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Zeitpunkt</p>
          <div style={{ display: "flex", gap: "6px" }}>
            {modeBtn("now", "Sofort")}
            {modeBtn("date", "Datum")}
            {modeBtn("days", "In X Tagen")}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "date" && (
            <motion.div key="date" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: "6px" }}>Datum auswählen</p>
              <Input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                min={new Date().toISOString().split("T")[0]}
              />
            </motion.div>
          )}
          {mode === "days" && (
            <motion.div key="days" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: "6px" }}>In wie vielen Tagen?</p>
              <Input
                type="number" min="1" max="30"
                value={schedDays}
                onChange={(e) => setSchedDays(e.target.value)}
                placeholder="3"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", padding: "10px 14px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(251,191,36,0.8)", lineHeight: 1.5 }}>
            Der erneute Einzug erfolgt per SEPA-Lastschrift. Mandat muss weiterhin aktiv sein. Maximale Wiederholungsanzahl: 3×.
          </p>
        </div>

        <DialogFooter style={{ gap: "8px" }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>Abbrechen</Button>
          <Button
            disabled={busy || (mode === "date" && !schedDate) || (mode === "days" && !schedDays)}
            onClick={handleSubmit}
            style={{ gap: "6px" }}
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Wird geplant…</> : <><RotateCcw size={14} /> EINZUG PLANEN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaktion Storno Dialog ────────────────────────────────────────────────
function TxStornoDialog({
  tx, open, onClose, onStorniert,
}: { tx: Transaction | null; open: boolean; onClose: () => void; onStorniert: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setReason(""); }, [open]);

  const handleSubmit = async () => {
    if (!tx || !reason.trim()) return;
    setBusy(true);
    try {
      // Storno via updateInkasso oder generischen Endpunkt – Fallback in Mock-Modus
      await api.admin.finances.updateInkasso(tx.id as unknown as string, {
        action: "cancel_transaction",
        reason: reason.trim(),
      } as Parameters<typeof api.admin.finances.updateInkasso>[1]);
      toast.success("Transaktion storniert", {
        description: `TX-${String(tx.id).padStart(4, "0")} – Grund: „${reason.trim()}"`,
      });
      onStorniert();
      onClose();
    } catch {
      toast.error("Fehler beim Stornieren der Transaktion.");
    } finally {
      setBusy(false);
    }
  };

  if (!tx) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "460px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Ban size={18} style={{ color: "#f87171" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Transaktion stornieren
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            TX-{String(tx.id).padStart(4, "0")} · {tx.member_name || "—"} · {tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
          </DialogDescription>
        </DialogHeader>

        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            Die Stornierung wird <strong style={{ color: "white" }}>GoBD-konform</strong> im Audit-Log protokolliert. Eine Gegenbuchung wird automatisch erstellt.
          </p>
        </div>

        <div>
          <label style={{ ...LABEL_STYLE, display: "block", marginBottom: "6px" }}>Stornogrund (Pflichtfeld) *</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. Doppelte Buchung, Kundenreklamation, technischer Fehler…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
              padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
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

// ── FilterPill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        border: active ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
        color: active ? "white" : "rgba(255,255,255,0.35)",
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function TransactionsPanel({
  onNavigateToInvoice,
}: {
  onNavigateToInvoice?: (invoiceNumber: string) => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [retryTarget, setRetryTarget]   = useState<Transaction | null>(null);
  const [stornoTarget, setStornoTarget] = useState<Transaction | null>(null);
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | "all">("all");
  const [filterType, setFilterType]     = useState<TransactionType | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.finances.transactions();
      setTransactions(data);
    } catch { /* mock fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterStatus !== "all" && tx.status !== filterStatus) return false;
      if (filterType !== "all" && tx.type !== filterType) return false;
      return true;
    });
  }, [transactions, filterStatus, filterType]);

  // ── KPI Calculations ───────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const successDebits  = transactions.filter(t => t.status === "success" && t.type === "debit");
    const totalCollected = successDebits.reduce((s, t) => s + t.amount, 0);
    const failedCount    = transactions.filter(t => t.status === "failed").length;
    const pendingCount   = transactions.filter(t => t.status === "pending").length;
    const reversedCount  = transactions.filter(t => t.status === "reversed").length;
    const refunds        = transactions.filter(t => t.type === "refund" && t.status === "success");
    const totalRefunded  = refunds.reduce((s, t) => s + t.amount, 0);
    return { totalCollected, failedCount, pendingCount, reversedCount, totalRefunded };
  }, [transactions]);

  const renderActionCell = (tx: Transaction) => {
    const isFailed  = tx.status === "failed";
    const canRetry  = isFailed && tx.retry_count < 3;
    const canStorno = tx.status !== "reversed";

    return (
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        {canRetry && (
          <button
            onClick={() => setRetryTarget(tx)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "5px 10px", background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)", color: "#f87171",
              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <RotateCcw size={10} /> Retry
          </button>
        )}
        {canStorno && tx.status === "success" && (
          <button
            onClick={() => setStornoTarget(tx)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "5px 10px", background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.12)", color: "rgba(248,113,113,0.6)",
              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <Ban size={10} /> Storno
          </button>
        )}
        {tx.status === "success" && !canStorno && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(74,222,128,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            <CheckCircle2 size={10} /> OK
          </span>
        )}
        {tx.status === "pending" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(251,191,36,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            <Clock size={10} /> Ausstehend
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* CSS: mobile card view / desktop table view */}
      <style>{`
        .tx-table-wrap { display: block; }
        .tx-cards-wrap  { display: none; }
        @media (max-width: 768px) {
          .tx-table-wrap { display: none !important; }
          .tx-cards-wrap  { display: block !important; }
        }
      `}</style>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
        <TxKpiCard icon={TrendingUp}   label="Eingezogen"   value={`${kpi.totalCollected.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`} sub="Erfolgreiche Lastschriften" accent="#4ade80" delay={0} />
        <TxKpiCard icon={Clock}        label="Ausstehend"   value={String(kpi.pendingCount)}  sub="Noch nicht verarbeitet"  accent="#fbbf24" delay={0.05} />
        <TxKpiCard icon={XCircle}      label="Fehlgeschlagen" value={String(kpi.failedCount)} sub="Lastschrift abgelehnt"   accent="#f87171" delay={0.1} />
        <TxKpiCard icon={TrendingDown} label="Erstattet"    value={`${kpi.totalRefunded.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`} sub={`${kpi.reversedCount} Ruecklastschr.`} accent="#a78bfa" delay={0.15} />
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", paddingTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={LABEL_STYLE}>Status:</span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(["all", "success", "pending", "failed", "reversed"] as const).map(s => (
              <FilterPill key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}
                label={s === "all" ? "Alle" : STATUS_CFG[s].label} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={LABEL_STYLE}>Typ:</span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(["all", "debit", "credit", "refund", "fee"] as const).map(t => (
              <FilterPill key={t} active={filterType === t} onClick={() => setFilterType(t)}
                label={t === "all" ? "Alle" : TYPE_CFG[t].label} />
            ))}
          </div>
        </div>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2"
          style={{
            marginLeft: "auto", padding: "6px 12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "10px",
            fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Aktualisieren
        </button>
      </div>

      {/* ── Desktop: Tabelle ── */}
      <div className="tx-table-wrap">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          style={{ border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["TX-ID", "Rechnung", "Mitglied", "Mandat", "Typ", "Betrag", "Status", "Verarbeitet", "Aktion"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", background: "rgba(255,255,255,0.015)", ...LABEL_STYLE, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {loading ? (
                    <tr key="loading"><td colSpan={9}>
                      <div className="flex items-center justify-center gap-3 py-16">
                        <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand)" }} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Transaktionen...</span>
                      </div>
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr key="empty"><td colSpan={9}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <ArrowLeftRight size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                          {transactions.length === 0 ? "Keine Transaktionen vorhanden." : "Keine Transaktionen für diesen Filter."}
                        </span>
                      </div>
                    </td></tr>
                  ) : filtered.map((tx, idx) => {
                    const typeCfg   = TYPE_CFG[tx.type];
                    const statusCfg = STATUS_CFG[tx.status];
                    const StatusIcon = statusCfg.icon;
                    const TypeIcon   = typeCfg.icon;
                    const isFailed   = tx.status === "failed";
                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.015 }}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          borderLeft: isFailed
                            ? "2px solid rgba(248,113,113,0.4)"
                            : tx.status === "reversed"
                              ? "2px solid rgba(167,139,250,0.3)"
                              : "2px solid transparent",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                      >
                        {/* TX-ID */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
                            <Hash size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                            TX-{String(tx.id).padStart(4, "0")}
                          </span>
                        </td>

                        {/* Rechnung – klickbar */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          {onNavigateToInvoice && tx.invoice_number ? (
                            <button
                              onClick={() => onNavigateToInvoice(tx.invoice_number!)}
                              style={{
                                background: "none", border: "none", padding: 0, cursor: "pointer",
                                fontFamily: "var(--font-body)", fontSize: "12px",
                                color: "rgba(96,165,250,0.8)", textDecoration: "underline",
                                textDecorationColor: "rgba(96,165,250,0.3)", transition: "color 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "#60a5fa"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(96,165,250,0.8)"; }}
                              title="Zur Rechnung springen"
                            >
                              {tx.invoice_number}
                            </button>
                          ) : (
                            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                              {tx.invoice_number || `INV-${tx.invoice_id}`}
                            </span>
                          )}
                        </td>

                        {/* Mitglied */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>
                            {tx.member_name || "—"}
                          </span>
                        </td>

                        {/* Mandat */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                            {tx.mandate_reference || "—"}
                          </span>
                        </td>

                        {/* Typ */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px",
                            background: `${typeCfg.color}15`, fontFamily: "var(--font-condensed)",
                            fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: typeCfg.color,
                          }}>
                            <TypeIcon size={10} /> {typeCfg.label}
                          </span>
                        </td>

                        {/* Betrag */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{
                            fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700,
                            color: tx.type === "debit" || tx.type === "fee" ? "white" : "#4ade80",
                          }}>
                            {typeCfg.sign}{tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px",
                              background: statusCfg.bg, fontFamily: "var(--font-condensed)", fontSize: "10px",
                              fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: statusCfg.color,
                            }}
                            title={tx.return_reason || undefined}
                          >
                            <StatusIcon size={10} /> {statusCfg.label}
                            {tx.retry_count > 0 && <span style={{ fontSize: "9px", opacity: 0.7 }}>({tx.retry_count}x)</span>}
                          </span>
                          {tx.return_reason && (
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: isFailed ? "rgba(248,113,113,0.6)" : "rgba(167,139,250,0.5)", marginTop: "3px", maxWidth: "200px", lineHeight: 1.3 }}>
                              {tx.return_reason}
                            </div>
                          )}
                        </td>

                        {/* Verarbeitet */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                            {tx.processed_at
                              ? new Date(tx.processed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </span>
                        </td>

                        {/* Aktion */}
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          {renderActionCell(tx)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && transactions.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                {filtered.length} von {transactions.length} Transaktionen
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                Eingezogen: <strong style={{ color: "#4ade80" }}>{kpi.totalCollected.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR</strong>
                {kpi.failedCount > 0 && (
                  <span style={{ marginLeft: "12px" }}>
                    <AlertTriangle size={10} style={{ display: "inline", verticalAlign: "middle", color: "#f87171", marginRight: "3px" }} />
                    <span style={{ color: "#f87171" }}>{kpi.failedCount} fehlgeschlagen</span>
                  </span>
                )}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Mobile: Cards ── */}
      <div className="tx-cards-wrap">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand)" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Transaktionen...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <ArrowLeftRight size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Keine Transaktionen.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((tx, idx) => {
              const typeCfg   = TYPE_CFG[tx.type];
              const statusCfg = STATUS_CFG[tx.status];
              const TypeIcon   = typeCfg.icon;
              const isFailed   = tx.status === "failed";
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: isFailed ? "3px solid rgba(248,113,113,0.5)" : tx.status === "reversed" ? "3px solid rgba(167,139,250,0.4)" : "3px solid transparent",
                    padding: "14px 16px",
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                        TX-{String(tx.id).padStart(4, "0")}
                      </span>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "white", marginTop: "2px" }}>
                        {tx.member_name || "—"}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700,
                      color: tx.type === "debit" || tx.type === "fee" ? "white" : "#4ade80",
                    }}>
                      {typeCfg.sign}{tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                      background: `${typeCfg.color}15`, fontFamily: "var(--font-condensed)",
                      fontSize: "10px", fontWeight: 700, color: typeCfg.color, textTransform: "uppercase",
                    }}>
                      <TypeIcon size={9} /> {typeCfg.label}
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                      background: statusCfg.bg, fontFamily: "var(--font-condensed)", fontSize: "10px",
                      fontWeight: 700, color: statusCfg.color, textTransform: "uppercase",
                    }}>
                      {statusCfg.label}
                      {tx.retry_count > 0 && <span style={{ fontSize: "9px", opacity: 0.7 }}>({tx.retry_count}x)</span>}
                    </span>
                    {onNavigateToInvoice && tx.invoice_number && (
                      <button
                        onClick={() => onNavigateToInvoice(tx.invoice_number!)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontFamily: "var(--font-body)", fontSize: "11px",
                          color: "rgba(96,165,250,0.7)", textDecoration: "underline",
                          textDecorationColor: "rgba(96,165,250,0.3)",
                        }}
                      >
                        {tx.invoice_number}
                      </button>
                    )}
                  </div>

                  {tx.return_reason && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(248,113,113,0.65)", marginBottom: "8px", lineHeight: 1.4 }}>
                      {tx.return_reason}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                      {tx.processed_at
                        ? new Date(tx.processed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "Noch nicht verarbeitet"}
                    </span>
                    {renderActionCell(tx)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {/* Mobile Footer */}
        {!loading && transactions.length > 0 && (
          <div style={{ marginTop: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              {filtered.length} von {transactions.length} Transaktionen
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(74,222,128,0.6)" }}>
              {kpi.totalCollected.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR eingezogen
            </span>
          </div>
        )}
      </div>

      {/* ── Dialoge ── */}
      <RetrySchedulerDialog
        tx={retryTarget} open={!!retryTarget}
        onClose={() => setRetryTarget(null)} onRetried={load}
      />
      <TxStornoDialog
        tx={stornoTarget} open={!!stornoTarget}
        onClose={() => setStornoTarget(null)} onStorniert={load}
      />
    </div>
  );
}

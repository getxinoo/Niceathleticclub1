/**
 * TransactionsPanel – SEPA-Transaktionsverlauf
 * Zeigt alle Zahlungstransaktionen (Lastschriften, Gutschriften, Rückbuchungen, Gebühren)
 * mit Status-Pills, Retry-Funktion und KPI-Übersicht.
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Hash,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from "lucide-react";
import { api } from "../../../lib/api-service";
import type { Transaction, TransactionType, TransactionStatus } from "../../../lib/api-service";
import { toast } from "sonner";

// ── Status-Konfiguration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<TransactionStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  success:  { label: "Erfolgreich", color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: CheckCircle2 },
  pending:  { label: "Ausstehend", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   icon: Clock },
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
function TxKpiCard({
  icon: Icon, label, value, sub, accent, delay,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderTop: `2px solid ${accent}`,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={LABEL_STYLE}>{label}</p>
        <Icon size={16} style={{ color: accent, opacity: 0.7 }} />
      </div>
      <p style={{
        fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "0.02em",
        color: accent, lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

export default function TransactionsPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | "all">("all");
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.finances.transactions();
      setTransactions(data);
    } catch { /* mock fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (tx: Transaction) => {
    setRetryingId(tx.id);
    try {
      await api.admin.finances.retryTransaction(tx.id);
      toast.success("Transaktion wird erneut verarbeitet", {
        description: `TX-${String(tx.id).padStart(4, "0")} – ${tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`,
      });
      await load();
    } catch { /* api-service toasts */ }
    finally { setRetryingId(null); }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterStatus !== "all" && tx.status !== filterStatus) return false;
      if (filterType !== "all" && tx.type !== filterType) return false;
      return true;
    });
  }, [transactions, filterStatus, filterType]);

  // ── KPI Calculations ───────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const successDebits = transactions.filter(t => t.status === "success" && t.type === "debit");
    const totalCollected = successDebits.reduce((s, t) => s + t.amount, 0);
    const failedTx = transactions.filter(t => t.status === "failed");
    const pendingTx = transactions.filter(t => t.status === "pending");
    const reversedTx = transactions.filter(t => t.status === "reversed");
    const refunds = transactions.filter(t => t.type === "refund" && t.status === "success");
    const totalRefunded = refunds.reduce((s, t) => s + t.amount, 0);
    return {
      totalCollected,
      failedCount: failedTx.length,
      pendingCount: pendingTx.length,
      reversedCount: reversedTx.length,
      totalRefunded,
      total: transactions.length,
    };
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <TxKpiCard
          icon={TrendingUp}
          label="Eingezogen"
          value={`${kpi.totalCollected.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`}
          sub="Erfolgreiche Lastschriften"
          accent="#4ade80"
          delay={0}
        />
        <TxKpiCard
          icon={Clock}
          label="Ausstehend"
          value={String(kpi.pendingCount)}
          sub="Noch nicht verarbeitet"
          accent="#fbbf24"
          delay={0.05}
        />
        <TxKpiCard
          icon={XCircle}
          label="Fehlgeschlagen"
          value={String(kpi.failedCount)}
          sub="Lastschrift abgelehnt"
          accent="#f87171"
          delay={0.1}
        />
        <TxKpiCard
          icon={TrendingDown}
          label="Erstattet"
          value={`${kpi.totalRefunded.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`}
          sub={`${kpi.reversedCount} Ruecklastschr.`}
          accent="#a78bfa"
          delay={0.15}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3" style={{ paddingTop: "4px" }}>
        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>Status:</span>
          <div className="flex gap-1">
            {(["all", "success", "pending", "failed", "reversed"] as const).map(s => {
              const isActive = filterStatus === s;
              const label = s === "all" ? "Alle" : STATUS_CFG[s].label;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: "4px 10px",
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>Typ:</span>
          <div className="flex gap-1">
            {(["all", "debit", "credit", "refund", "fee"] as const).map(t => {
              const isActive = filterType === t;
              const label = t === "all" ? "Alle" : TYPE_CFG[t].label;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: "4px 10px",
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-2"
          style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Aktualisieren
        </button>
      </div>

      {/* ── Tabelle ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["TX-ID", "Rechnung", "Mitglied", "Mandat", "Typ", "Betrag", "Status", "Verarbeitet", "Aktion"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 14px",
                      textAlign: "left",
                      background: "rgba(255,255,255,0.015)",
                      ...LABEL_STYLE,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {loading ? (
                  <tr key="loading">
                    <td colSpan={9}>
                      <div className="flex items-center justify-center gap-3 py-16">
                        <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand)" }} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Transaktionen...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={9}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <ArrowLeftRight size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                          {transactions.length === 0 ? "Keine Transaktionen vorhanden." : "Keine Transaktionen fuer diesen Filter."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((tx, idx) => {
                  const typeCfg = TYPE_CFG[tx.type];
                  const statusCfg = STATUS_CFG[tx.status];
                  const StatusIcon = statusCfg.icon;
                  const TypeIcon = typeCfg.icon;
                  const isFailed = tx.status === "failed";
                  const canRetry = isFailed && tx.retry_count < 3;

                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
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
                        <span style={{
                          fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                          letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)",
                        }}>
                          <Hash size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                          TX-{String(tx.id).padStart(4, "0")}
                        </span>
                      </td>

                      {/* Rechnung */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                          {tx.invoice_number || `INV-${tx.invoice_id}`}
                        </span>
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
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "3px 8px",
                          background: `${typeCfg.color}15`,
                          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: typeCfg.color,
                        }}>
                          <TypeIcon size={10} />
                          {typeCfg.label}
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
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            padding: "4px 10px", background: statusCfg.bg,
                            fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                            letterSpacing: "0.1em", textTransform: "uppercase", color: statusCfg.color,
                          }}
                          title={tx.return_reason || undefined}
                        >
                          <StatusIcon size={10} />
                          {statusCfg.label}
                          {tx.retry_count > 0 && (
                            <span style={{ fontSize: "9px", opacity: 0.7 }}>
                              ({tx.retry_count}x)
                            </span>
                          )}
                        </span>
                        {/* Return Reason Tooltip-Zeile */}
                        {tx.return_reason && (
                          <div style={{
                            fontFamily: "var(--font-body)", fontSize: "10px",
                            color: isFailed ? "rgba(248,113,113,0.6)" : "rgba(167,139,250,0.5)",
                            marginTop: "3px", maxWidth: "220px", lineHeight: 1.3,
                          }}>
                            {tx.return_reason}
                          </div>
                        )}
                      </td>

                      {/* Verarbeitet */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                          {tx.processed_at
                            ? new Date(tx.processed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                            : "—"
                          }
                        </span>
                      </td>

                      {/* Aktion */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {canRetry && (
                          <button
                            onClick={() => handleRetry(tx)}
                            disabled={retryingId === tx.id}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "5px 10px",
                              background: "rgba(248,113,113,0.08)",
                              border: "1px solid rgba(248,113,113,0.2)",
                              color: "#f87171",
                              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                              letterSpacing: "0.1em", textTransform: "uppercase",
                              cursor: retryingId === tx.id ? "not-allowed" : "pointer",
                              opacity: retryingId === tx.id ? 0.5 : 1,
                              transition: "all 0.15s",
                            }}
                          >
                            {retryingId === tx.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <RotateCcw size={10} />
                            }
                            Retry
                          </button>
                        )}
                        {tx.status === "success" && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                            letterSpacing: "0.1em", color: "rgba(74,222,128,0.4)", textTransform: "uppercase",
                          }}>
                            <CheckCircle2 size={10} /> OK
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
        {!loading && transactions.length > 0 && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
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
  );
}

/**
 * AdminFinances.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GoBD-konformes Rechnungs-Dashboard
 *
 * Features:
 *  - KPI-Kacheln: Offene Posten, Überfällig, Zahlungsquote, Storniert
 *  - Rechnungs-Tabelle mit pulsierenden roten Rändern bei Überfälligkeit
 *  - "Rechnung erstellen" Dialog
 *  - Per-Row-Aktionen: Als bezahlt markieren, Stornieren (mit Pflicht-Grund)
 *  - "Mahnlauf starten" mit BGB-Warnung
 *  - Rechnungs-Vorschau mit PDF/Print-Funktion
 *  - Kein Delete – GoBD konform!
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Euro,
  Bell,
  Plus,
  Ban,
  Check,
  XCircle,
  ChevronDown,
  FileText,
  Printer,
  Shield,
  Landmark,
  Gavel,
  ExternalLink,
  Hash,
  ArrowLeftRight,
} from "lucide-react";
import { api, Invoice, Member } from "@/lib/api-service";
import type { SepaMandate, InkassoCase } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";
import SepaPanel from "../components/SepaPanel";
import InkassoPanel from "../components/InkassoPanel";
import TransactionsPanel from "../components/TransactionsPanel";

// ── Konstanten ────────────────────────────────────────────────────────────────
const DUNNING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Kein Mahnv.",  color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" },
  1: { label: "1. Mahnung",   color: "#f59e0b",              bg: "rgba(245,158,11,0.1)"   },
  2: { label: "2. Mahnung",   color: "#f97316",              bg: "rgba(249,115,22,0.1)"   },
  3: { label: "Inkasso",      color: "#f87171",              bg: "rgba(239,68,68,0.12)"   },
};

const STATUS_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  paid:      { color: "#4ade80", bg: "rgba(34,197,94,0.1)",   dot: "#4ade80" },
  open:      { color: "#60a5fa", bg: "rgba(59,130,246,0.1)",  dot: "#60a5fa" },
  overdue:   { color: "#f87171", bg: "rgba(239,68,68,0.1)",   dot: "#f87171" },
  cancelled: { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", dot: "rgba(255,255,255,0.25)" },
};
const STATUS_DE: Record<string, string> = {
  paid: "Bezahlt", open: "Offen", overdue: "Überfällig", cancelled: "Storniert",
};

// ─ Hilfs-UI ──────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px",
      fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase", marginBottom: "6px",
    }}>
      {children}
    </label>
  );
}

function NacSelect({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", appearance: "none", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: "white",
          fontFamily: "var(--font-body)", fontSize: "14px", padding: "10px 36px 10px 12px",
          outline: "none", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1, transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.4)",
      }} />
    </div>
  );
}

// ── Inline-Action-Button (Tabelle) ────────────────────────────────────────────
function ActionBtn({ children, color, bgBase, borderColor, disabled, onClick }: {
  children: React.ReactNode; color: string; bgBase: string; borderColor: string;
  disabled?: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "5px 10px", background: bgBase,
        border: `1px solid ${borderColor}`, color,
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 0.18s", whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = bgBase.replace(/[\d.]+\)$/, (m) => `${Math.min(parseFloat(m) * 2, 0.25)})`); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bgBase; }}
    >
      {children}
    </button>
  );
}

// ── KPI-Kachel ────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, accent, loading, delay,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent: string; loading: boolean; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background:    "rgba(255,255,255,0.03)",
        border:        "1px solid rgba(255,255,255,0.07)",
        borderTop:     `2px solid ${accent}`,
        padding:       "20px 22px",
        display:       "flex",
        flexDirection: "column",
        gap:           "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{
          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
        }}>
          {label}
        </p>
        <Icon size={16} style={{ color: accent, opacity: 0.7 }} />
      </div>
      <p style={{
        fontFamily: "var(--font-display)", fontSize: "32px", letterSpacing: "0.02em",
        color: loading ? "rgba(255,255,255,0.15)" : accent, lineHeight: 1,
      }}>
        {loading ? "\u2014" : value}
      </p>
      {sub && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ── Dialog: Rechnung erstellen ────────────────────────────────────────────────
function CreateInvoiceDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [members, setMembers]       = useState<Member[]>([]);
  const [membersLoading, setML]     = useState(false);
  const [memberId, setMemberId]     = useState("");
  const [amount, setAmount]         = useState("");
  const [dueDate, setDueDate]       = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setMemberId(""); setAmount(""); setDueDate("");
    setML(true);
    api.admin.members.list()
      .then((data) => {
        const active = data.filter(m => m.status === "active" && !m.is_blocked);
        setMembers(active);
        if (active.length > 0) setMemberId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setML(false));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount || !dueDate) return;
    setSaving(true);
    try {
      const parsedAmount = parseFloat(amount);
      const result = await api.admin.finances.create({
        member_id: memberId,
        amount:    parsedAmount,
        due_date:  dueDate,
      });
      const member = members.find(m => m.id === memberId);
      toast.success("Rechnung erfolgreich erstellt", {
        description: `Nr. ${result.id} \u2013 ${member?.first_name ?? ""} ${member?.last_name ?? ""} \u2013 ${parsedAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} \u20AC`,
      });
      // Reset Formular-Inputs
      setMemberId(""); setAmount(""); setDueDate("");
      // Tabelle aktualisieren & Dialog schließen
      onCreated();
      onClose();
    } catch {
      // Fehler-Toast kommt via api-service
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "460px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Plus size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{
              fontFamily: "var(--font-display)", fontSize: "22px",
              letterSpacing: "0.04em", textTransform: "uppercase", color: "white",
            }}>
              Rechnung erstellen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            Neue Rechnung manuell anlegen. Die Rechnung kann nachträglich nicht gelöscht werden (GoBD).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
          <div>
            <FieldLabel>Mitglied *</FieldLabel>
            {membersLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--brand)" }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Mitglieder…</span>
              </div>
            ) : (
              <NacSelect value={memberId} onChange={setMemberId}>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} – {m.email}
                  </option>
                ))}
              </NacSelect>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <FieldLabel>Betrag (€) *</FieldLabel>
              <Input
                type="number" step="0.01" min="0.01" required
                placeholder="39.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Fälligkeitsdatum *</FieldLabel>
              <Input
                type="date" required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <DialogFooter style={{ gap: "8px" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !memberId || !amount || !dueDate} style={{ gap: "6px" }}>
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Wird erstellt…</>
                : <><Plus size={14} /> RECHNUNG ERSTELLEN</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Storno (GoBD – Grund pflicht!) ───────────────────────────────────
function StornoDialog({ invoice, onClose, onStorniert }: {
  invoice: Invoice | null; onClose: () => void; onStorniert: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset bei neuem Invoice
  useEffect(() => { if (invoice) setReason(""); }, [invoice]);

  const handleStorno = async () => {
    if (!invoice || !reason.trim()) return;
    setSaving(true);
    try {
      await api.admin.finances.storno(invoice.id, reason.trim());
      toast.success("Rechnung erfolgreich storniert", {
        description: `Nr. ${invoice.id} wurde GoBD-konform storniert. Grund: „${reason.trim()}"`,
      });
      // Reset
      setReason("");
      // Tabelle aktualisieren & Dialog schließen
      onStorniert();
      onClose();
    } catch {
      // Fehler-Toast kommt via api-service
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Ban size={18} style={{ color: "#f87171" }} />
            <DialogTitle style={{
              fontFamily: "var(--font-display)", fontSize: "22px",
              letterSpacing: "0.04em", textTransform: "uppercase", color: "white",
            }}>
              Rechnung stornieren
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {invoice && (
              <>
                Rechnung <strong style={{ color: "white" }}>#{invoice.id}</strong>
                {invoice.member_name && <> – {invoice.member_name}</>}
                {" "}– {invoice.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ── Achtung: Explizite Storno-Warnung (Punkt 2) ── */}
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "4px",
        }}>
          <AlertTriangle size={18} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "13px", color: "#f87171",
              fontWeight: 700, lineHeight: 1.5, marginBottom: "6px",
            }}>
              Achtung: Möchtest du diese Rechnung wirklich unwiderruflich stornieren?
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              Nach GoBD-Vorgaben muss ein <strong style={{ color: "white" }}>zwingender Grund</strong> angegeben werden.
              Die Stornierung wird im Audit-Log protokolliert. Die Originalrechnung bleibt erhalten und kann nicht gelöscht werden.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "8px" }}>
          <FieldLabel>Stornogrund (Pflichtfeld) *</FieldLabel>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. Fehlerhafte Rechnungsstellung, doppelte Buchung…"
            required
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
              padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          {!reason.trim() && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#f87171", marginTop: "4px" }}>
              Bitte gib einen Stornogrund ein, um fortzufahren.
            </p>
          )}
        </div>

        <DialogFooter style={{ gap: "8px", marginTop: "8px" }}>
          <Button
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            disabled={saving || !reason.trim()}
            onClick={handleStorno}
            style={{
              background: saving || !reason.trim() ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.85)",
              color: "white",
              boxShadow: reason.trim() ? "0 0 16px rgba(239,68,68,0.25)" : "none",
              gap: "6px",
            }}
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Storniere…</>
              : <><Ban size={14} /> UNWIDERRUFLICH STORNIEREN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Rechnungs-Vorschau (PDF/Print) ────────────────────────��──────────
function InvoicePreviewDialog({ invoice, onClose }: {
  invoice: Invoice | null; onClose: () => void;
}) {
  if (!invoice) return null;

  // ── Snapshot auflösen (Fallbacks für alte Rechnungen ohne Snapshot) ─────────
  const snap = invoice.snapshot ?? {};
  const companyName    = snap.company_name    ?? "Nice Athletic Club GmbH";
  const companyAddress = snap.company_address ?? "Musterstraße 42, 10115 Berlin";
  const companyEmail   = snap.company_email   ?? "info@nice-athletic-club.de";
  const vatId          = snap.vat_id          ?? "DE320247039";
  const courtInfo      = snap.court_info      ?? "Amtsgericht Berlin HRB 123456";
  const ceo            = snap.ceo             ?? "Max Mustermann";
  const bankDetails    = snap.bank_details    ?? "IBAN DE89 3704 0044 0532 0130 00 · BIC COBADEFFXXX · Commerzbank AG";
  const logoUrl        = snap.logo_url        ?? null;

  // Dynamischer MwSt-Satz aus Snapshot (z. B. "19" → 19)
  const vatRate    = parseFloat(snap.vat_rate ?? "19");
  const vatDivisor = 1 + vatRate / 100;
  const netAmount  = invoice.amount / vatDivisor;
  const taxAmount  = invoice.amount - netAmount;

  // Angezeigte Rechnungsnummer: bevorzuge invoice_number, Fallback auf id
  const displayNumber = invoice.invoice_number ?? invoice.id;

  const createdDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString("de-DE")
    : new Date().toLocaleDateString("de-DE");
  const dueDate = new Date(invoice.due_date).toLocaleDateString("de-DE");
  const isCancelled = invoice.status === "cancelled";

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        id="print-area"
        aria-describedby={undefined}
        style={{
          background: "white", color: "black", maxWidth: "620px",
          border: "none", boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          padding: 0, overflow: "hidden",
        }}
      >
        {/* Visually hidden title for screen readers */}
        <DialogTitle className="sr-only">
          Rechnungsvorschau {displayNumber}
        </DialogTitle>
        {/* ── Papier-Inhalt ── */}
        <div style={{ padding: "40px 36px 32px", fontFamily: "Arial, Helvetica, sans-serif" }}>

          {/* Storniert-Wasserzeichen */}
          {isCancelled && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%) rotate(-30deg)",
              fontSize: "72px", fontWeight: 900, color: "rgba(239,68,68,0.12)",
              textTransform: "uppercase", letterSpacing: "0.1em", pointerEvents: "none",
              whiteSpace: "nowrap", zIndex: 0,
            }}>
              STORNIERT
            </div>
          )}

          {/* Absender & Rechnungsnummer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            {/* Links: Logo (optional) + Absender */}
            <div>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={companyName}
                  style={{ maxHeight: "48px", maxWidth: "160px", objectFit: "contain", marginBottom: "10px", display: "block" }}
                />
              )}
              <h1 style={{
                fontFamily: "'Bebas Neue', Arial, sans-serif", fontSize: "28px",
                letterSpacing: "0.06em", color: "#CA0C85", margin: 0, lineHeight: 1,
              }}>
                {companyName.toUpperCase()}
              </h1>
              <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.7, marginTop: "8px" }}>
                <div>{companyAddress}</div>
                <div>USt-IdNr.: {vatId}</div>
                <div>{companyEmail}</div>
              </div>
            </div>

            {/* Rechts: Rechnungsnr. & Datum */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>
                Rechnungsnummer
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginTop: "2px" }}>
                {displayNumber}
              </div>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginTop: "12px" }}>
                Datum
              </div>
              <div style={{ fontSize: "13px", color: "#333", marginTop: "2px" }}>
                {createdDate}
              </div>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginTop: "12px" }}>
                Fällig am
              </div>
              <div style={{ fontSize: "13px", color: invoice.status === "overdue" ? "#dc2626" : "#333", marginTop: "2px" }}>
                {dueDate}
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <hr style={{ border: "none", borderTop: "2px solid #CA0C85", margin: "24px 0 20px", position: "relative", zIndex: 1 }} />

          {/* Empfänger */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "4px" }}>
              Rechnungsempfänger
            </div>
            <div style={{ fontSize: "14px", color: "#111", fontWeight: 600 }}>
              {invoice.member_name || `Mitglied ${String(invoice.member_id).slice(0, 8)}`}
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Mitglieds-Nr.: {invoice.member_id}
            </div>
          </div>

          {/* Positions-Tabelle */}
          <table style={{
            width: "100%", borderCollapse: "collapse", marginTop: "24px",
            position: "relative", zIndex: 1,
          }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                <th style={{ textAlign: "left", padding: "8px 0", fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>
                  Beschreibung
                </th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>
                  Betrag
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "14px 0", fontSize: "14px", color: "#111" }}>
                  Mitgliedschaftsbeitrag
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                    {companyName} – Monatlicher Beitrag
                  </div>
                </td>
                <td style={{ padding: "14px 0", textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#111" }}>
                  {invoice.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid #e5e5e5" }}>
                <td style={{ padding: "8px 0 4px", fontSize: "12px", color: "#666" }}>
                  Netto
                </td>
                <td style={{ padding: "8px 0 4px", textAlign: "right", fontSize: "12px", color: "#666" }}>
                  {netAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0 8px", fontSize: "12px", color: "#666", borderBottom: "1px solid #e5e5e5" }}>
                  zzgl. {vatRate % 1 === 0 ? vatRate.toFixed(0) : vatRate}% USt.
                </td>
                <td style={{ padding: "4px 0 8px", textAlign: "right", fontSize: "12px", color: "#666", borderBottom: "1px solid #e5e5e5" }}>
                  {taxAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #222" }}>
                <td style={{ padding: "12px 0", fontSize: "12px", fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Gesamtbetrag (Brutto)
                </td>
                <td style={{ padding: "12px 0", textAlign: "right", fontSize: "18px", fontWeight: 900, color: "#CA0C85" }}>
                  {invoice.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Status-Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", position: "relative", zIndex: 1 }}>
            <span style={{
              display: "inline-block", padding: "4px 12px",
              background: isCancelled ? "#fef2f2" : invoice.status === "paid" ? "#f0fdf4" : invoice.status === "overdue" ? "#fef2f2" : "#eff6ff",
              color: isCancelled ? "#dc2626" : invoice.status === "paid" ? "#16a34a" : invoice.status === "overdue" ? "#dc2626" : "#2563eb",
              fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
              borderRadius: "2px",
            }}>
              {STATUS_DE[invoice.status] ?? invoice.status}
            </span>
            {invoice.dunning_level > 0 && !isCancelled && (
              <span style={{
                fontSize: "11px", color: "#f59e0b", fontWeight: 600,
              }}>
                Mahnstufe {invoice.dunning_level}
              </span>
            )}
          </div>

          {/* ── Fußzeile (vollständig aus Snapshot) ── */}
          <div style={{
            marginTop: "28px", paddingTop: "14px", borderTop: "1px solid #e5e5e5",
            fontSize: "10px", color: "#aaa", lineHeight: 1.7, textAlign: "center",
            position: "relative", zIndex: 1,
          }}>
            {companyName} · {companyAddress} · USt-IdNr.: {vatId}
            <br />
            {courtInfo} · GF: {ceo}
            <br />
            {bankDetails}
          </div>
        </div>

        {/* ── Drucken-Button (wird beim Drucken ausgeblendet) ── */}
        <div
          className="no-print"
          style={{
            padding: "12px 36px 24px", display: "flex", justifyContent: "flex-end", gap: "8px",
            background: "white",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd",
              color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#eee"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
          >
            Schließen
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 20px", background: "#CA0C85", border: "none",
              color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "6px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#a80a6f"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#CA0C85"; }}
          >
            <Printer size={14} /> Als PDF speichern / Drucken
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function AdminFinances() {
  const location = useLocation();
  const [invoices, setInvoices]             = useState<Invoice[]>([]);
  const [loading, setLoading]               = useState(true);
  const [dunningOpen, setDunning]           = useState(false);
  const [dunningBusy, setDunBusy]           = useState(false);
  const [createOpen, setCreateOpen]         = useState(false);
  const [stornoTarget, setStornoTarget]     = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [payingId, setPayingId]             = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<"rechnungen" | "sepa" | "transaktionen" | "inkasso">("rechnungen");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.admin.finances.invoices();
      setInvoices(data);
    } catch {
      // Toast via api-service
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [location.key]);

  // ── KPI-Berechnungen ────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const nonCancelled = invoices.filter(i => i.status !== "cancelled");
    const total        = nonCancelled.length;
    const paid         = nonCancelled.filter(i => i.status === "paid").length;
    const openSum      = nonCancelled
      .filter(i => i.status === "open" || i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    const overdueCount = nonCancelled.filter(i => i.status === "overdue").length;
    const payRate      = total > 0 ? Math.round((paid / total) * 100) : 0;
    const dunnable     = nonCancelled.filter(i => (i.status === "open" || i.status === "overdue") && i.dunning_level < 3).length;
    const cancelledCount = invoices.filter(i => i.status === "cancelled").length;
    return { openSum, overdueCount, payRate, dunnable, cancelledCount, total };
  }, [invoices]);

  // ── Mark as Paid (Punkt 1: toast + loadData + reset) ───────────────────────
  const handleMarkPaid = async (inv: Invoice) => {
    setPayingId(inv.id);
    try {
      await api.admin.finances.markAsPaid(inv.id);
      toast.success("Zahlung erfolgreich verbucht", {
        description: `Nr. ${inv.id}${inv.member_name ? ` – ${inv.member_name}` : ""} – ${inv.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € als bezahlt markiert.`,
      });
      // Tabelle sofort aktualisieren
      await loadData();
    } catch {
      // Fehler-Toast kommt via api-service
    } finally {
      setPayingId(null);
    }
  };

  // ── Mahnlauf ────────────────────────────────────────────────────────────────
  const handleDunningRun = async () => {
    setDunBusy(true);
    try {
      const result = await api.admin.finances.triggerDunningRun();
      toast.success("Mahnlauf erfolgreich durchgeführt", {
        description: `${result.affected} Rechnung(en) wurden angemahnt.`,
      });
      setDunning(false);
      await loadData();
    } catch {
      // Fehler-Toast kommt via api-service
    } finally {
      setDunBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">

      {/* CSS: pulsierender Rand + Print-Styles */}
      <style>{`
        @keyframes nac-pulse-red {
          0%, 100% { border-left-color: rgba(239,68,68,0.25); }
          50%       { border-left-color: rgba(239,68,68,0.85); }
        }
        .invoice-danger { animation: nac-pulse-red 2s ease-in-out infinite; }

        @media print {
          @page { margin: 0; size: A4; }
          html, body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Verstecke das Dashboard */
          #root { display: none !important; }
          
          /* Radix Overlay (den abgedunkelten Modal-Hintergrund) restlos entfernen */
          [data-state="open"][class*="fixed inset-0"] { display: none !important; }
          
          /* Radix Portal Container zwingen, den Fluss freizugeben */
          [data-radix-portal] { position: static !important; display: block !important; }
          
          /* Den Druckbereich (#print-area) als alleiniges A4-Dokument auslegen */
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 2cm !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            animation: none !important;
          }
          /* Farb-Override: Drucker braucht immer schwarze Schrift! */
          #print-area * {
            color: black !important;
            border-color: #ddd !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2
            className="text-white"
            style={{
              fontFamily:    "var(--font-display)",
              fontSize:      "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "0.04em",
              lineHeight:    1,
              textTransform: "uppercase",
            }}
          >
            FINANZ<span style={{ color: "var(--brand)" }}>ÜBERSICHT</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            GoBD-konformes Rechnungswesen – Rechnungen, Mahnwesen &amp; Stornos
          </p>
        </div>

        <div className="flex gap-3 shrink-0 flex-wrap">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            style={{ gap: "6px" }}
            title="Daten neu laden"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button variant="outline" onClick={() => setDunning(true)} style={{ gap: "8px" }}>
            <Bell size={15} /> MAHNLAUF
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ gap: "8px" }}>
            <Plus size={15} /> RECHNUNG ERSTELLEN
          </Button>
        </div>
      </div>

      {/* ── Tab-Navigation ── */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0" }}>
        {([
          { key: "rechnungen" as const, label: "Rechnungen", icon: CreditCard },
          { key: "sepa" as const, label: "SEPA-Mandate", icon: Landmark },
          { key: "transaktionen" as const, label: "Transaktionen", icon: ArrowLeftRight },
          { key: "inkasso" as const, label: "Inkasso-Wall", icon: Gavel },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                color: isActive ? "white" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                border: "none",
                borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: isActive ? "var(--brand)" : "transparent",
                marginBottom: "-1px",
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content: Rechnungen ── */}
      {activeTab === "rechnungen" && (
        <>

      {/* ── KPI-Kacheln ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <KpiCard
          icon={Euro}
          label="Offene Posten"
          value={`${kpi.openSum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`}
          sub="Offen + Überfällig"
          accent="#f59e0b"
          loading={loading}
          delay={0}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Überfällig"
          value={String(kpi.overdueCount)}
          sub="Rechnungen mit Status Overdue"
          accent="#f87171"
          loading={loading}
          delay={0.05}
        />
        <KpiCard
          icon={TrendingUp}
          label="Zahlungsquote"
          value={`${kpi.payRate} %`}
          sub={`${invoices.filter(i => i.status === "paid").length} von ${kpi.total} bezahlt`}
          accent="#4ade80"
          loading={loading}
          delay={0.1}
        />
        <KpiCard
          icon={XCircle}
          label="Storniert"
          value={String(kpi.cancelledCount)}
          sub="GoBD-konform storniert"
          accent="rgba(255,255,255,0.35)"
          loading={loading}
          delay={0.15}
        />
      </div>

      {/* ── Tabelle ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        style={{ border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "860px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Rechnungs-Nr.", "Mitglied", "Betrag", "Fälligkeit", "Mahnstufe", "Status", "Aktion"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding:       "12px 16px",
                      textAlign:     "left",
                      background:    "rgba(255,255,255,0.015)",
                      fontFamily:    "var(--font-condensed)",
                      fontSize:      "10px",
                      fontWeight:    700,
                      letterSpacing: "0.18em",
                      color:         "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      whiteSpace:    "nowrap",
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
                    <td colSpan={7}>
                      <div className="flex items-center justify-center gap-3 py-16">
                        <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand)" }} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Lade Rechnungen…</span>
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <CreditCard size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Keine Rechnungen vorhanden.</span>
                      </div>
                    </td>
                  </tr>
                ) : invoices.map((inv, idx) => {
                  const isCancelled = inv.status === "cancelled";
                  const isOverdue   = inv.status === "overdue";
                  const isPaid      = inv.status === "paid";
                  const isOpen      = inv.status === "open";
                  const hasDunning  = inv.dunning_level > 0;
                  const danger      = isOverdue && hasDunning;
                  const dunStyle    = DUNNING_LABELS[inv.dunning_level] ?? DUNNING_LABELS[0];
                  const statStyle   = STATUS_STYLES[inv.status] ?? STATUS_STYLES.open;
                  const canPay      = isOpen || isOverdue;
                  const canStorno   = !isCancelled;

                  return (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className={danger ? "invoice-danger" : ""}
                      style={{
                        borderBottom:   "1px solid rgba(255,255,255,0.04)",
                        borderLeft:     danger ? "2px solid rgba(239,68,68,0.4)" : "2px solid transparent",
                        transition:     "background 0.15s",
                        opacity:        isCancelled ? 0.5 : 1,
                        textDecoration: isCancelled ? "line-through" : "none",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      {/* Rechnungsnr. */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                          letterSpacing: "0.1em", color: isCancelled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)",
                          textTransform: "uppercase",
                        }}>
                          {inv.id}
                        </span>
                      </td>

                      {/* Mitglied */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: isCancelled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)" }}>
                          {inv.member_name || `MBR-${String(inv.member_id).slice(0, 6)}`}
                        </span>
                      </td>

                      {/* Betrag */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700,
                          color: isCancelled ? "rgba(255,255,255,0.25)" : isOverdue ? "#f87171" : "white",
                        }}>
                          {inv.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                        </span>
                      </td>

                      {/* Fälligkeit */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "12px",
                          color: isCancelled ? "rgba(255,255,255,0.2)" : isOverdue ? "#f87171" : "rgba(255,255,255,0.4)",
                        }}>
                          {new Date(inv.due_date).toLocaleDateString("de-DE")}
                        </span>
                      </td>

                      {/* Mahnstufe */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 8px",
                          background: isCancelled ? "rgba(255,255,255,0.03)" : dunStyle.bg,
                          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                          letterSpacing: "0.12em", textTransform: "uppercase",
                          color: isCancelled ? "rgba(255,255,255,0.2)" : dunStyle.color,
                        }}>
                          {dunStyle.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "4px 10px", background: statStyle.bg,
                          fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase", color: statStyle.color,
                        }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statStyle.dot, flexShrink: 0 }} />
                          {STATUS_DE[inv.status] ?? inv.status}
                        </span>
                      </td>

                      {/* Aktionen */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>

                          {/* Ansehen (Punkt 3) */}
                          <ActionBtn
                            color="rgba(255,255,255,0.5)"
                            bgBase="rgba(255,255,255,0.04)"
                            borderColor="rgba(255,255,255,0.1)"
                            onClick={() => setPreviewInvoice(inv)}
                          >
                            <FileText size={10} /> Ansehen
                          </ActionBtn>

                          {/* Als bezahlt markieren */}
                          {canPay && (
                            <ActionBtn
                              color="#4ade80"
                              bgBase="rgba(34,197,94,0.08)"
                              borderColor="rgba(34,197,94,0.2)"
                              disabled={payingId === inv.id}
                              onClick={() => handleMarkPaid(inv)}
                            >
                              {payingId === inv.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <Check size={10} />}
                              Bezahlt
                            </ActionBtn>
                          )}

                          {/* Stornieren */}
                          {canStorno && (
                            <ActionBtn
                              color="#f87171"
                              bgBase="rgba(239,68,68,0.06)"
                              borderColor="rgba(239,68,68,0.15)"
                              onClick={() => setStornoTarget(inv)}
                            >
                              <Ban size={10} /> Storno
                            </ActionBtn>
                          )}

                          {/* Bezahlt-Badge */}
                          {isPaid && !isCancelled && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                              letterSpacing: "0.1em", color: "rgba(34,197,94,0.5)", textTransform: "uppercase",
                            }}>
                              <CheckCircle2 size={10} /> Bezahlt
                            </span>
                          )}

                          {/* Storniert-Badge */}
                          {isCancelled && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                              letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                            }}>
                              <XCircle size={10} /> Storniert
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && invoices.length > 0 && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              {invoices.length} Rechnungen gesamt
              {kpi.cancelledCount > 0 && (
                <span style={{ color: "rgba(255,255,255,0.15)" }}> ({kpi.cancelledCount} storniert)</span>
              )}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              Gesamt offen: <strong style={{ color: "#f59e0b" }}>{kpi.openSum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</strong>
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Dialog: Rechnung erstellen ── */}
      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadData}
      />

      {/* ── Dialog: Storno ── */}
      <StornoDialog
        invoice={stornoTarget}
        onClose={() => setStornoTarget(null)}
        onStorniert={loadData}
      />

      {/* ── Dialog: Rechnungs-Vorschau (Punkt 3) ── */}
      <InvoicePreviewDialog
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />

      {/* ── Mahnlauf-Dialog (BGB-Warnung) ── */}
      <Dialog open={dunningOpen} onOpenChange={(o) => !o && setDunning(false)}>
        <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px" }}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Bell size={18} style={{ color: "var(--brand)" }} />
              <DialogTitle style={{
                fontFamily: "var(--font-display)", fontSize: "22px",
                letterSpacing: "0.04em", textTransform: "uppercase", color: "white",
              }}>
                Mahnlauf starten
              </DialogTitle>
            </div>
            <DialogDescription style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", fontSize: "13px" }}>
              Automatischer Mahnlauf gem. § 286 BGB
            </DialogDescription>
          </DialogHeader>

          {/* BGB-Warnung */}
          <div style={{
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
            padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "8px",
          }}>
            <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                <strong style={{ color: "white" }}>Automatischer Mahnlauf (gem. § 286 BGB).</strong><br />
                Dies erhöht die Mahnstufe aller überfälligen Rechnungen <strong style={{ color: "#f59e0b" }}>unwiderruflich</strong>.
                Rechnungen auf Stufe 3 werden ans Inkasso überwiesen.
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "8px" }}>
                <strong style={{ color: "white" }}>{kpi.dunnable} Rechnung(en)</strong> sind für den Mahnlauf vorgemerkt (Mahnstufe &lt; 3, Status offen/überfällig).
              </p>
            </div>
          </div>

          <DialogFooter style={{ gap: "8px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setDunning(false)} disabled={dunningBusy}>
              Abbrechen
            </Button>
            <Button
              onClick={handleDunningRun}
              disabled={dunningBusy || kpi.dunnable === 0}
              style={{
                gap: "6px",
                background: dunningBusy || kpi.dunnable === 0 ? undefined : "rgba(245,158,11,0.85)",
                boxShadow: kpi.dunnable > 0 ? "0 0 16px rgba(245,158,11,0.25)" : "none",
              }}
            >
              {dunningBusy
                ? <><Loader2 size={14} className="animate-spin" /> Wird ausgeführt…</>
                : <><CheckCircle2 size={14} /> MAHNLAUF BESTÄTIGEN</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* ── Tab Content: SEPA-Mandate ── */}
      {activeTab === "sepa" && <SepaPanel />}

      {/* ── Tab Content: Transaktionen ── */}
      {activeTab === "transaktionen" && <TransactionsPanel />}

      {/* ── Tab Content: Inkasso-Wall ── */}
      {activeTab === "inkasso" && <InkassoPanel />}

    </div>
  );
}
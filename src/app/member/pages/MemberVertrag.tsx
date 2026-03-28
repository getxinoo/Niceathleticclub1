/**
 * MemberVertrag – "Mein Vertrag" Self-Service Dashboard
 *
 * Sections:
 *   1. Mein Paket       – Current plan + Upgrade Dialog
 *   2. Ruhezeit         – Pause request form with attestUpload
 *   3. Rechnungen       – Invoice list with download CTA
 *   4. Kündigung        – Termination dialog (danger zone)
 *
 * Design: NAC Dark-Mode Vibe — glassmorphism cards, magenta accent, Bebas Neue titles.
 * Uses Dialog (not AlertDialog) per project guidelines.
 * Respects prefers-reduced-motion.
 */

import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Shield,
  TrendingUp,
  Crown,
  PauseCircle,
  Receipt,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  FileText,
  Loader2,
  X,
  Zap,
  Printer,
  History,
  Landmark,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import { api, Invoice, Member, BASE_URL } from "../../../lib/api-service";

// ── Plan data ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "39",
    color: "rgba(255,255,255,0.5)",
    icon: Shield,
    features: ["3x pro Woche", "Grundgeräte", "Umkleiden"],
  },
  {
    id: "performance",
    name: "Performance",
    price: "69",
    color: "#CA0C85",
    icon: TrendingUp,
    popular: true,
    features: ["Unbegrenzt Training", "Alle Kurse", "Ernährungsberatung"],
  },
  {
    id: "elite",
    name: "Elite",
    price: "99",
    color: "#f59e0b",
    icon: Crown,
    features: ["Alles in Performance", "Personal Training 2x/Mo.", "Exklusive Events"],
  },
] as const;

type PlanId = "starter" | "performance" | "elite";

const PAUSE_REASONS = [
  { value: "krankheit",       label: "Krankheit" },
  { value: "urlaub",          label: "Urlaub" },
  { value: "schwangerschaft", label: "Schwangerschaft" },
  { value: "sonstiges",       label: "Sonstiges" },
] as const;

const TERMINATE_REASONS = [
  { value: "umzug",        label: "Umzug / zu weit entfernt" },
  { value: "finanziell",   label: "Finanzielle Gründe" },
  { value: "gesundheit",   label: "Gesundheitliche Gründe" },
  { value: "zufriedenheit", label: "Unzufriedenheit" },
  { value: "sonstiges",    label: "Sonstiges" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const LABEL_STYLE = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

const SECTION_TITLE_STYLE = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(1.4rem, 5vw, 1.8rem)",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "white",
  lineHeight: 1,
};

const GLASS_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "4px",
  padding: "10px 14px",
  color: "white",
  fontFamily: "var(--font-body, Poppins, sans-serif)",
  fontSize: "14px",
  outline: "none",
};

function statusBadge(status: Invoice["status"]) {
  const map: Record<Invoice["status"], { label: string; color: string; bg: string }> = {
    paid:      { label: "Bezahlt",   color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
    open:      { label: "Offen",     color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
    overdue:   { label: "Überfällig",color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    cancelled: { label: "Storniert", color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" },
  };
  const s = map[status] ?? map.open;
  return (
    <span
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}30`,
        padding: "2px 8px",
        borderRadius: "3px",
      }}
    >
      {s.label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={LABEL_STYLE} className="mb-3">
      {children}
    </p>
  );
}

// ── Accordion Section wrapper ─────────────────────────────────────────────────
interface SectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accentColor?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  reduced: boolean;
}

function Section({
  icon: Icon, title, subtitle, accentColor = "var(--brand)",
  open, onToggle, children, reduced,
}: SectionProps) {
  return (
    <div style={{ ...GLASS_CARD, borderRadius: "6px", overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer transition-all duration-200"
        style={{ minHeight: "72px", background: "none", border: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        aria-expanded={open}
      >
        {/* Icon bubble */}
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0"
          style={{
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}30`,
            borderRadius: "4px",
          }}
        >
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-white"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            {title}
          </p>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              {subtitle}
            </p>
          )}
        </div>
        {/* Chevron */}
        <div style={{ color: "rgba(255,255,255,0.25)", transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronDown size={18} />
        </div>
      </button>

      {/* Divider */}
      {open && <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />}

      {/* Animated body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced
              ? { duration: 0 }
              : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 py-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── File Upload Field ──────────────────────────────────────────────────────────
interface FileUploadFieldProps {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}

function FileUploadField({ label, file, onChange, accept = ".pdf,image/*" }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>{label}</p>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200"
        style={{
          background: file ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px dashed ${file ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: "4px",
        }}
        onClick={() => inputRef.current?.click()}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = file ? "rgba(202,12,133,0.6)" : "rgba(255,255,255,0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = file ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.12)")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{
            background: file ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${file ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "4px",
          }}
        >
          {file ? (
            <CheckCircle2 size={15} style={{ color: "#CA0C85" }} />
          ) : (
            <Upload size={15} style={{ color: "rgba(255,255,255,0.4)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {file ? (
            <p className="text-white truncate" style={{ fontSize: "13px" }}>{file.name}</p>
          ) : (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
              PDF oder Bild auswählen
            </p>
          )}
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
            {file ? `${(file.size / 1024).toFixed(0)} KB` : "Klicken zum Hochladen"}
          </p>
        </div>
        {file && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="shrink-0 flex items-center justify-center"
            style={{
              width: "32px",
              height: "32px",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Primary Button ─────────────────────────────────────────────────────────────
function PrimaryBtn({
  children,
  onClick,
  loading = false,
  disabled = false,
  danger = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  fullWidth?: boolean;
}) {
  const bg = danger ? "#c0392b" : "var(--brand)";
  const bgHover = danger ? "#e74c3c" : "var(--brand-light, #e0148f)";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 text-white transition-all duration-200 active:scale-[0.98] ${fullWidth ? "w-full" : ""}`}
      style={{
        background: disabled ? "rgba(255,255,255,0.08)" : bg,
        border: "none",
        minHeight: "48px",
        padding: "0 24px",
        borderRadius: "4px",
        fontFamily: "var(--font-condensed)",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        color: disabled ? "rgba(255,255,255,0.3)" : "white",
        boxShadow: disabled ? "none" : danger
          ? "0 0 16px rgba(192,57,43,0.3)"
          : "0 0 16px rgba(202,12,133,0.3)",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading)
          e.currentTarget.style.background = bgHover;
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading)
          e.currentTarget.style.background = bg;
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 text-white/60 hover:text-white/90 transition-all duration-200 active:scale-[0.98]"
      style={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        minHeight: "48px",
        padding: "0 20px",
        borderRadius: "4px",
        fontFamily: "var(--font-condensed)",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
    >
      {children}
    </button>
  );
}

// ── Invoice Preview & Print Dialog ────────────────────────────────────────────
function InvoicePreviewDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  if (!invoice) return null;

  const snap           = invoice.snapshot ?? {};
  const companyName    = snap.company_name    ?? "Nice Athletic Club GmbH";
  const companyAddress = snap.company_address ?? "Musterstraße 42, 10115 Berlin";
  const companyEmail   = snap.company_email   ?? "info@nice-athletic-club.de";
  const vatId          = snap.vat_id          ?? "DE320247039";
  const courtInfo      = snap.court_info      ?? "Amtsgericht Berlin HRB 123456";
  const ceo            = snap.ceo             ?? "Max Mustermann";
  const bankDetails    = snap.bank_details    ?? "IBAN DE89 3704 0044 0532 0130 00 · Commerzbank AG";
  const logoUrl        = snap.logo_url        ?? null;
  const vatRate        = parseFloat(snap.vat_rate ?? "19");
  const vatDivisor     = 1 + vatRate / 100;
  const netAmount      = invoice.amount / vatDivisor;
  const taxAmount      = invoice.amount - netAmount;
  const displayNumber  = invoice.invoice_number ?? invoice.id;
  const createdDate    = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString("de-DE")
    : new Date().toLocaleDateString("de-DE");
  const dueDate        = new Date(invoice.due_date).toLocaleDateString("de-DE");
  const isCancelled    = invoice.status === "cancelled";
  const STATUS_DE: Record<string, string> = {
    paid: "Bezahlt", open: "Offen", overdue: "Überfällig", cancelled: "Storniert",
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        id="member-print-area"
        aria-describedby={undefined}
        style={{ background: "white", color: "black", maxWidth: "620px", border: "none", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", padding: 0, overflow: "hidden" }}
      >
        <DialogTitle className="sr-only">Rechnungsvorschau {displayNumber}</DialogTitle>
        <div style={{ padding: "40px 36px 32px", fontFamily: "Arial, Helvetica, sans-serif" }}>
          {isCancelled && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-30deg)", fontSize: "72px", fontWeight: 900, color: "rgba(239,68,68,0.12)", textTransform: "uppercase", letterSpacing: "0.1em", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 0 }}>
              STORNIERT
            </div>
          )}
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              {logoUrl && <img src={logoUrl} alt={companyName} style={{ maxHeight: "48px", maxWidth: "160px", objectFit: "contain", marginBottom: "10px", display: "block" }} />}
              <h1 style={{ fontFamily: "'Bebas Neue', Arial, sans-serif", fontSize: "28px", letterSpacing: "0.06em", color: "#CA0C85", margin: 0, lineHeight: 1 }}>{companyName.toUpperCase()}</h1>
              <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.7, marginTop: "8px" }}>
                <div>{companyAddress}</div><div>USt-IdNr.: {vatId}</div><div>{companyEmail}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>Rechnungsnummer</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginTop: "2px" }}>{displayNumber}</div>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginTop: "12px" }}>Datum</div>
              <div style={{ fontSize: "13px", color: "#333", marginTop: "2px" }}>{createdDate}</div>
              <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginTop: "12px" }}>Fällig am</div>
              <div style={{ fontSize: "13px", color: invoice.status === "overdue" ? "#dc2626" : "#333", marginTop: "2px" }}>{dueDate}</div>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "2px solid #CA0C85", margin: "24px 0 20px", position: "relative", zIndex: 1 }} />
          {/* Recipient */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "4px" }}>Rechnungsempfänger</div>
            <div style={{ fontSize: "14px", color: "#111", fontWeight: 600 }}>{invoice.member_name || `Mitglied ${String(invoice.member_id).slice(0, 8)}`}</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>Mitglieds-Nr.: {invoice.member_id}</div>
          </div>
          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "24px", position: "relative", zIndex: 1 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                <th style={{ textAlign: "left", padding: "8px 0", fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>Beschreibung</th>
                <th style={{ textAlign: "right", padding: "8px 0", fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "14px 0", fontSize: "14px", color: "#111" }}>
                  Mitgliedschaftsbeitrag
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{companyName} – Monatlicher Beitrag</div>
                </td>
                <td style={{ padding: "14px 0", textAlign: "right", fontSize: "16px", fontWeight: 700, color: "#111" }}>{invoice.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid #e5e5e5" }}>
                <td style={{ padding: "8px 0 4px", fontSize: "12px", color: "#666" }}>Netto</td>
                <td style={{ padding: "8px 0 4px", textAlign: "right", fontSize: "12px", color: "#666" }}>{netAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0 8px", fontSize: "12px", color: "#666", borderBottom: "1px solid #e5e5e5" }}>zzgl. {vatRate % 1 === 0 ? vatRate.toFixed(0) : vatRate}% USt.</td>
                <td style={{ padding: "4px 0 8px", textAlign: "right", fontSize: "12px", color: "#666", borderBottom: "1px solid #e5e5e5" }}>{taxAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
              </tr>
              <tr style={{ borderTop: "2px solid #222" }}>
                <td style={{ padding: "12px 0", fontSize: "12px", fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: "0.1em" }}>Gesamtbetrag (Brutto)</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontSize: "18px", fontWeight: 900, color: "#CA0C85" }}>{invoice.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
              </tr>
            </tfoot>
          </table>
          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", position: "relative", zIndex: 1 }}>
            <span style={{ display: "inline-block", padding: "4px 12px", background: isCancelled ? "#fef2f2" : invoice.status === "paid" ? "#f0fdf4" : invoice.status === "overdue" ? "#fef2f2" : "#eff6ff", color: isCancelled ? "#dc2626" : invoice.status === "paid" ? "#16a34a" : invoice.status === "overdue" ? "#dc2626" : "#2563eb", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", borderRadius: "2px" }}>
              {STATUS_DE[invoice.status] ?? invoice.status}
            </span>
          </div>
          {/* Footer */}
          <div style={{ marginTop: "28px", paddingTop: "14px", borderTop: "1px solid #e5e5e5", fontSize: "10px", color: "#aaa", lineHeight: 1.7, textAlign: "center", position: "relative", zIndex: 1 }}>
            {companyName} · {companyAddress} · USt-IdNr.: {vatId}<br />
            {courtInfo} · GF: {ceo}<br />
            {bankDetails}
          </div>
        </div>
        {/* Buttons (hidden during print) */}
        <div className="no-print" style={{ padding: "12px 36px 24px", display: "flex", justifyContent: "flex-end", gap: "8px", background: "white" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#eee"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}>
            Schließen
          </button>
          <button onClick={() => window.print()} style={{ padding: "8px 20px", background: "#CA0C85", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#a80a6f"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#CA0C85"; }}>
            <Printer size={14} /> Als PDF speichern / Drucken
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MemberVertrag() {
  const reduced = useReducedMotion() ?? false;

  // Which accordion section is open
  const [openSection, setOpenSection] = useState<string>("paket");

  const toggleSection = (id: string) =>
    setOpenSection((prev) => (prev === id ? "" : id));

  // ── Member profile & contract data ───────────────────────────────────────────
  const [member, setMember]         = useState<Member | null>(null);
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [pauses, setPauses]         = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const currentPlan = (member?.contract_type ?? "performance") as PlanId;

  useEffect(() => {
    // Load profile + contracts in parallel
    Promise.all([
      api.member.profile.get().then(setMember).catch(() => {}),
      api.member.contracts
        .getData()
        .then((d) => {
          setInvoices(d.invoices ?? []);
          setPauses(d.pauses ?? []);
        })
        .catch(() => {
          // Fallback mock data so UI is never empty
          setInvoices([
            {
              id: "inv-001",
              invoice_number: "NAC-2025-0047",
              member_id: "m1",
              amount: 69,
              due_date: "2025-03-01",
              status: "paid",
              dunning_level: 0,
              created_at: "2025-02-01",
            },
            {
              id: "inv-002",
              invoice_number: "NAC-2025-0031",
              member_id: "m1",
              amount: 69,
              due_date: "2025-02-01",
              status: "paid",
              dunning_level: 0,
              created_at: "2025-01-01",
            },
            {
              id: "inv-003",
              invoice_number: "NAC-2025-0015",
              member_id: "m1",
              amount: 69,
              due_date: "2025-01-01",
              status: "open",
              dunning_level: 0,
              created_at: "2024-12-01",
            },
          ]);
          setPauses([
            { id: "p1", start_date: "2025-01-10", end_date: "2025-01-24", reason: "urlaub",    status: "approved", created_at: "2025-01-05" },
            { id: "p2", start_date: "2025-03-01", end_date: "2025-03-14", reason: "krankheit", status: "pending",  created_at: "2025-02-28" },
          ]);
        }),
    ]).finally(() => setDataLoading(false));
  }, []);

  // ── Upgrade Dialog ────────────────────────────────────────────────────────────
  const [upgradeOpen, setUpgradeOpen]       = useState(false);
  const [selectedPlan, setSelectedPlan]     = useState<PlanId | null>(null);
  const [agbAccepted, setAgbAccepted]       = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!selectedPlan || !agbAccepted) return;
    setUpgradeLoading(true);
    try {
      await api.member.contracts.upgrade(selectedPlan);
      toast.success("Upgrade erfolgreich!", {
        description: `Dein Paket wird auf ${PLANS.find((p) => p.id === selectedPlan)?.name} umgestellt.`,
      });
      setUpgradeOpen(false);
      setSelectedPlan(null);
      setAgbAccepted(false);
    } catch {
      toast.error("Upgrade momentan nicht verfügbar.", {
        description: "Bitte wende dich direkt an unser Team im Studio.",
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  // ── Pause Form ───────────────────────────────────────────────────────────────
  const [pauseReason, setPauseReason] = useState("");
  const [pauseStart, setPauseStart]   = useState("");
  const [pauseEnd, setPauseEnd]       = useState("");
  const [pauseFile, setPauseFile]     = useState<File | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);

  const needsDocument = pauseReason === "krankheit" || pauseReason === "sonstiges";

  const handlePause = async () => {
    if (!pauseReason || !pauseStart || !pauseEnd) {
      toast.error("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    setPauseLoading(true);
    try {
      let documentUrl: string | undefined;
      if (pauseFile) {
        const res = await api.member.uploadDocument(pauseFile);
        documentUrl = res.url;
      }
      await api.member.contracts.requestPause({
        reason: pauseReason,
        start_date: pauseStart,
        end_date: pauseEnd,
        document_url: documentUrl,
      });
      toast.success("Ruhezeit beantragt!", {
        description: "Dein Antrag wird innerhalb von 24 Stunden bearbeitet.",
      });
      setPauseReason("");
      setPauseStart("");
      setPauseEnd("");
      setPauseFile(null);
    } catch {
      toast.error("Antrag momentan nicht verfügbar.", {
        description: "Bitte wende dich direkt an unser Team im Studio.",
      });
    } finally {
      setPauseLoading(false);
    }
  };

  // ── Termination Dialog ────────────────────────────────────────────────────────
  const [terminateOpen, setTerminateOpen]       = useState(false);
  const [terminateReason, setTerminateReason]   = useState("");
  const [terminateNote, setTerminateNote]       = useState("");
  const [terminateFile, setTerminateFile]       = useState<File | null>(null);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [terminateConfirm, setTerminateConfirm] = useState(false);

  const handleTerminate = async () => {
    if (!terminateReason || !terminateConfirm) return;
    setTerminateLoading(true);
    try {
      let documentUrl: string | undefined;
      if (terminateFile) {
        const res = await api.member.uploadDocument(terminateFile);
        documentUrl = res.url;
      }
      await api.member.contracts.terminate({
        reason: terminateReason,
        note: terminateNote,
        document_url: documentUrl,
      });
      toast.success("Kündigungsantrag eingereicht.", {
        description: "Du erhältst eine Bestätigung per E-Mail.",
      });
      setTerminateOpen(false);
    } catch {
      toast.error("Kündigung momentan nicht verfügbar.", {
        description: "Bitte wende dich direkt an unser Team im Studio.",
      });
    } finally {
      setTerminateLoading(false);
    }
  };

  // ── SEPA / IBAN State ──────────────────────────────────────────────────────────
  const [sepaStatus, setSepaStatus] = useState<{
    iban_masked: string; mandate_reference: string; status: string;
    signed_at: string; next_collection_date?: string; cancellation_limit_hours?: number;
  } | null>(null);
  const [sepaLoading, setSepaLoading] = useState(true);
  const [ibanEdit, setIbanEdit] = useState(false);
  const [ibanValue, setIbanValue] = useState("");
  const [ibanSaving, setIbanSaving] = useState(false);

  useEffect(() => {
    api.member.contracts.getSepaStatus()
      .then(setSepaStatus)
      .catch(() => setSepaStatus({
        iban_masked: "DE89 **** **** **** **** 30",
        mandate_reference: "NAC-SEPA-2025-001",
        status: "active",
        signed_at: "2025-01-15",
        next_collection_date: "2026-04-01",
        cancellation_limit_hours: 24,
      }))
      .finally(() => setSepaLoading(false));
  }, []);

  const handleIbanUpdate = async () => {
    const cleaned = ibanValue.replace(/\s/g, "");
    if (!/^DE\d{20}$/.test(cleaned)) {
      toast.error("Ungueltige IBAN", { description: "Bitte gib eine gueltige deutsche IBAN ein (DE + 20 Ziffern)." });
      return;
    }
    setIbanSaving(true);
    try {
      await api.member.contracts.updateIban(cleaned);
      toast.success("IBAN aktualisiert", { description: "Deine neue Bankverbindung wurde gespeichert." });
      setIbanEdit(false);
      setIbanValue("");
      // Refresh
      api.member.contracts.getSepaStatus().then(setSepaStatus).catch(() => {});
    } catch {
      toast.error("IBAN-Aenderung fehlgeschlagen", { description: "Bitte wende dich an unser Team." });
    } finally {
      setIbanSaving(false);
    }
  };

  // ── Invoice Print Dialog ──────────────────────────────────────────────────────
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const handlePrintInvoice = (inv: Invoice) => {
    setPrintInvoice(inv);
  };

  // ── Animation variants ────────────────────────────────────────────────────────
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--surface-0)" }}>
      {/* Print CSS — same approach as AdminFinances */}
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          html, body {
            background: white !important;
            margin: 0 !important; padding: 0 !important;
            height: auto !important; overflow: visible !important;
          }
          #root { display: none !important; }
          [data-state="open"][class*="fixed inset-0"] { display: none !important; }
          [data-radix-portal] { position: static !important; display: block !important; }
          #member-print-area {
            position: absolute !important; left: 0 !important; top: 0 !important;
            transform: none !important; width: 100% !important;
            max-width: 100% !important; height: auto !important;
            margin: 0 !important; padding: 2cm !important;
            background: white !important; border: none !important;
            box-shadow: none !important; animation: none !important;
          }
          #member-print-area * { color: black !important; border-color: #ddd !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto px-5 pt-10 md:pt-14 pb-10 space-y-4"
      >
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <motion.div variants={item} className="mb-6">
          <p style={LABEL_STYLE}>Mein Bereich</p>
          <h1 style={SECTION_TITLE_STYLE}>
            Mein{" "}
            <span style={{ color: "var(--brand)" }}>Vertrag</span>
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "6px" }}>
            Verwalte dein Paket, Pausen, Rechnungen und mehr.
          </p>
        </motion.div>

        {/* ── 1. MEIN PAKET ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Section
            id="paket"
            icon={Shield}
            title="Mein Paket"
            subtitle={`Aktuell: ${PLANS.find((p) => p.id === currentPlan)?.name ?? "–"} – ${PLANS.find((p) => p.id === currentPlan)?.price ?? "–"} €/Monat`}
            accentColor="var(--brand)"
            open={openSection === "paket"}
            onToggle={() => toggleSection("paket")}
            reduced={reduced}
          >
            {/* Current plan card */}
            {(() => {
              const plan = PLANS.find((p) => p.id === currentPlan)!;
              const PlanIcon = plan.icon;
              return (
                <div
                  className="flex items-center gap-4 p-4 mb-5"
                  style={{
                    background: "rgba(202,12,133,0.06)",
                    border: "1px solid rgba(202,12,133,0.2)",
                    borderRadius: "6px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(to right, transparent, #CA0C85, transparent)" }} />
                  <div
                    className="w-12 h-12 flex items-center justify-center shrink-0"
                    style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)", borderRadius: "6px" }}
                  >
                    <PlanIcon size={22} style={{ color: "#CA0C85" }} />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-white"
                      style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.04em", textTransform: "uppercase" }}
                    >
                      {plan.name}
                    </p>
                    <div className="flex gap-3 flex-wrap mt-1">
                      {plan.features.map((f) => (
                        <span key={f} style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p
                    className="shrink-0 text-white"
                    style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "0.02em" }}
                  >
                    {plan.price}€
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.3)", display: "block", letterSpacing: "0.1em" }}>
                      / MONAT
                    </span>
                  </p>
                </div>
              );
            })()}

            {/* Upgrade CTA */}
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
              Du möchtest mehr aus deinem Training herausholen? Upgrade jetzt auf ein höheres Paket.
            </p>
            <PrimaryBtn onClick={() => setUpgradeOpen(true)}>
              <TrendingUp size={13} />
              Paket upgraden
            </PrimaryBtn>
          </Section>
        </motion.div>

        {/* ── 2. RUHEZEIT ────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Section
            id="pause"
            icon={PauseCircle}
            title="Ruhezeit beantragen"
            subtitle="Max. 3 Pausen pro Jahr möglich"
            accentColor="#60a5fa"
            open={openSection === "pause"}
            onToggle={() => toggleSection("pause")}
            reduced={reduced}
          >
            {/* Info badge */}
            <div
              className="flex items-start gap-3 p-3 mb-5"
              style={{
                background: "rgba(96,165,250,0.06)",
                border: "1px solid rgba(96,165,250,0.2)",
                borderRadius: "4px",
              }}
            >
              <Clock size={15} style={{ color: "#60a5fa", marginTop: "2px", flexShrink: 0 }} />
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Ruhepausen können für Krankheit, Urlaub oder Schwangerschaft beantragt werden. Pro Jahr sind maximal <strong className="text-white/70">3 Pausen</strong> möglich. Bei Krankheit ist ein Attest erforderlich.
              </p>
            </div>

            <div className="space-y-4">
              {/* Reason */}
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Grund *</p>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  style={{ ...INPUT_STYLE, cursor: "pointer" }}
                >
                  <option value="" disabled style={{ background: "#1a1a1a" }}>Bitte wählen…</option>
                  {PAUSE_REASONS.map((r) => (
                    <option key={r.value} value={r.value} style={{ background: "#1a1a1a" }}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Startdatum *</p>
                  <input
                    type="date"
                    value={pauseStart}
                    onChange={(e) => setPauseStart(e.target.value)}
                    style={{ ...INPUT_STYLE }}
                    className="[color-scheme:dark]"
                  />
                </div>
                <div>
                  <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Enddatum *</p>
                  <input
                    type="date"
                    value={pauseEnd}
                    onChange={(e) => setPauseEnd(e.target.value)}
                    style={{ ...INPUT_STYLE }}
                    className="[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Conditional file upload */}
              <AnimatePresence>
                {needsDocument && (
                  <motion.div
                    key="pause-upload"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                  >
                    <FileUploadField
                      label="Attest / Dokument hochladen *"
                      file={pauseFile}
                      onChange={setPauseFile}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <PrimaryBtn
                onClick={handlePause}
                loading={pauseLoading}
                disabled={!pauseReason || !pauseStart || !pauseEnd || (needsDocument && !pauseFile)}
                fullWidth
              >
                <PauseCircle size={13} />
                Pause beantragen
              </PrimaryBtn>
            </div>

            {/* ── Bisherige Anträge ── */}
            {pauses.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <History size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p style={LABEL_STYLE}>Bisherige Anträge</p>
                </div>
                <div className="space-y-2">
                  {pauses.map((p: any) => {
                    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                      pending:  { label: "Ausstehend", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
                      approved: { label: "Genehmigt",  color: "#34d399", bg: "rgba(52,211,153,0.1)" },
                      rejected: { label: "Abgelehnt",  color: "#f87171", bg: "rgba(248,113,113,0.1)" },
                    };
                    const s = statusMap[p.status] ?? statusMap.pending;
                    const reasonLabel = PAUSE_REASONS.find((r) => r.value === p.reason)?.label ?? p.reason;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "4px" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white" style={{ fontSize: "12px", fontWeight: 500 }}>
                            {reasonLabel}
                          </p>
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                            {new Date(p.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                            {" – "}
                            {new Date(p.end_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: s.color, background: s.bg, border: `1px solid ${s.color}30`, padding: "2px 8px", borderRadius: "3px", textTransform: "uppercase" }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── 3. RECHNUNGEN ──────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Section
            id="rechnungen"
            icon={Receipt}
            title="Rechnungen"
            subtitle={`${invoices.length} Rechnungen vorhanden`}
            accentColor="#a78bfa"
            open={openSection === "rechnungen"}
            onToggle={() => toggleSection("rechnungen")}
            reduced={reduced}
          >
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Keine Rechnungen vorhanden.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 p-3 transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "4px" }}
                    >
                      <Receipt size={14} style={{ color: "#a78bfa" }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white" style={{ fontSize: "13px", fontWeight: 500 }}>
                        {inv.invoice_number ?? `Rechnung ${inv.id.slice(0, 6)}`}
                      </p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                        Fällig:{" "}
                        {new Date(inv.due_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <p
                      className="shrink-0 text-white"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.1rem",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {inv.amount.toFixed(2).replace(".", ",")} €
                    </p>

                    {/* Status */}
                    <div className="shrink-0 hidden sm:block">
                      {statusBadge(inv.status)}
                    </div>

                    {/* Download */}
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="shrink-0 flex items-center justify-center transition-all duration-150 cursor-pointer"
                      style={{
                        width: "36px",
                        height: "36px",
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "4px",
                        color: "rgba(255,255,255,0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
                        e.currentTarget.style.color = "#a78bfa";
                        e.currentTarget.style.background = "rgba(167,139,250,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                        e.currentTarget.style.background = "none";
                      }}
                      title="Herunterladen"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── 4. SEPA & BANKVERBINDUNG ────────────────────────────────── */}
        <motion.div variants={item}>
          <Section
            id="sepa"
            icon={Landmark}
            title="SEPA & Bankverbindung"
            subtitle={sepaStatus ? `Mandat: ${sepaStatus.mandate_reference}` : "Wird geladen…"}
            accentColor="#60a5fa"
            open={openSection === "sepa"}
            onToggle={() => toggleSection("sepa")}
            reduced={reduced}
          >
            {sepaLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            ) : sepaStatus ? (
              <div className="space-y-5">
                {/* Status Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div
                    className="p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}
                  >
                    <p style={{ ...LABEL_STYLE, marginBottom: "6px" }}>IBAN (maskiert)</p>
                    <p style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
                      {sepaStatus.iban_masked}
                    </p>
                  </div>
                  <div
                    className="p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}
                  >
                    <p style={{ ...LABEL_STYLE, marginBottom: "6px" }}>Mandatsstatus</p>
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{
                        padding: "2px 8px",
                        background: sepaStatus.status === "active" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)",
                        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        color: sepaStatus.status === "active" ? "#4ade80" : "#fbbf24",
                        borderRadius: "3px",
                      }}
                    >
                      <CheckCircle2 size={9} />
                      {sepaStatus.status === "active" ? "Aktiv" : sepaStatus.status === "pending" ? "Ausstehend" : sepaStatus.status}
                    </span>
                  </div>
                </div>

                {/* Mandate Info */}
                <div
                  className="p-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div>
                      <p style={{ ...LABEL_STYLE, marginBottom: "4px" }}>Mandatsreferenz</p>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{sepaStatus.mandate_reference}</p>
                    </div>
                    <div>
                      <p style={{ ...LABEL_STYLE, marginBottom: "4px" }}>Erteilt am</p>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                        {new Date(sepaStatus.signed_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div>
                      <p style={{ ...LABEL_STYLE, marginBottom: "4px" }}>Naechster Einzug</p>
                      <p style={{ fontSize: "12px", color: sepaStatus.next_collection_date ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                        {sepaStatus.next_collection_date
                          ? new Date(sepaStatus.next_collection_date).toLocaleDateString("de-DE")
                          : "–"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* IBAN Change */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ ...LABEL_STYLE }}>
                      <CreditCard size={10} style={{ display: "inline", marginRight: "4px" }} />
                      IBAN aendern
                    </p>
                    {!ibanEdit && (
                      <button
                        onClick={() => setIbanEdit(true)}
                        className="transition-all"
                        style={{
                          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: "#60a5fa", background: "none", border: "none", cursor: "pointer",
                        }}
                      >
                        Aendern
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {ibanEdit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                        className="space-y-3"
                      >
                        <div
                          className="flex items-start gap-3 p-3"
                          style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "4px" }}
                        >
                          <AlertTriangle size={14} style={{ color: "#60a5fa", marginTop: "2px", flexShrink: 0 }} />
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                            Bitte gib deine neue IBAN ein. Die Aenderung tritt ab dem naechsten Einzugstermin in Kraft.
                            Format: <strong className="text-white/70">DE + 20 Ziffern</strong>
                          </p>
                        </div>
                        <input
                          type="text"
                          value={ibanValue}
                          onChange={(e) => setIbanValue(e.target.value.toUpperCase())}
                          placeholder="DE89 3704 0044 0532 0130 00"
                          maxLength={27}
                          style={{
                            ...INPUT_STYLE,
                            fontFamily: "monospace",
                            letterSpacing: "0.1em",
                          }}
                        />
                        <div className="flex gap-2">
                          <PrimaryBtn
                            onClick={handleIbanUpdate}
                            loading={ibanSaving}
                            disabled={!ibanValue.replace(/\s/g, "").match(/^DE\d{20}$/)}
                          >
                            <Landmark size={13} />
                            IBAN speichern
                          </PrimaryBtn>
                          <SecondaryBtn onClick={() => { setIbanEdit(false); setIbanValue(""); }}>
                            Abbrechen
                          </SecondaryBtn>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!ibanEdit && (
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>
                      Deine IBAN ist aus Sicherheitsgruenden nur maskiert sichtbar. Klicke auf "Aendern", um eine neue IBAN zu hinterlegen.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Landmark size={28} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Kein SEPA-Mandat vorhanden.</p>
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── 5. KÜNDIGUNG ───────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Section
            id="kuendigung"
            icon={AlertTriangle}
            title="Kündigung"
            subtitle="Mitgliedschaft beenden"
            accentColor="#f87171"
            open={openSection === "kuendigung"}
            onToggle={() => toggleSection("kuendigung")}
            reduced={reduced}
          >
            <div
              className="flex items-start gap-3 p-3 mb-5"
              style={{
                background: "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "4px",
              }}
            >
              <AlertTriangle size={15} style={{ color: "#f87171", marginTop: "2px", flexShrink: 0 }} />
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Die Kündigung ist zum Ende der aktuellen Vertragslaufzeit möglich. Eine Bestätigung erhältst du per E-Mail. Dieser Schritt kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <button
              onClick={() => setTerminateOpen(true)}
              className="flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "4px",
                padding: "12px 20px",
                minHeight: "48px",
                color: "#f87171",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(248,113,113,0.15)";
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(248,113,113,0.08)";
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
              }}
            >
              <XCircle size={15} />
              Vertrag kündigen
            </button>
          </Section>
        </motion.div>
      </motion.div>

      {/* ────────────────────────────────────────────────────────────────────
          UPGRADE DIALOG
      ──────────────────────────────────────────────────────────────────── */}
      <Dialog open={upgradeOpen} onOpenChange={(o) => { setUpgradeOpen(o); if (!o) { setSelectedPlan(null); setAgbAccepted(false); } }}>
        <DialogContent className="max-w-lg" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              Paket <span style={{ color: "var(--brand)" }}>Upgraden</span>
            </DialogTitle>
            <DialogDescription>
              Wähle dein neues Paket. Die neue Laufzeit startet sofort nach dem Upgrade.
            </DialogDescription>
          </DialogHeader>

          {/* Plan cards */}
          <div className="space-y-3 my-2">
            {PLANS.filter((p) => p.id !== currentPlan).map((plan) => {
              const PlanIcon = plan.icon;
              const sel = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as PlanId)}
                  className="w-full flex items-center gap-4 p-4 text-left transition-all duration-200 active:scale-[0.99] cursor-pointer"
                  style={{
                    background: sel ? `${plan.color}12` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${sel ? plan.color + "50" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "6px",
                    boxShadow: sel ? `0 0 20px ${plan.color}18` : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {sel && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, transparent, ${plan.color}, transparent)` }} />
                  )}
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0"
                    style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}30`, borderRadius: "6px" }}
                  >
                    <PlanIcon size={18} style={{ color: plan.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-white"
                        style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", letterSpacing: "0.04em", textTransform: "uppercase" }}
                      >
                        {plan.name}
                      </p>
                      {plan.popular && (
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "#CA0C85", background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)", padding: "1px 6px", borderRadius: "3px" }}>
                          BELIEBT
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                      {plan.features.join(" · ")}
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-white"
                    style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em" }}
                  >
                    {plan.price}€
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.3)", display: "block", letterSpacing: "0.1em" }}>
                      /MO
                    </span>
                  </p>
                  {/* Checkmark */}
                  {sel && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center"
                      style={{ background: "var(--brand)", borderRadius: "50%" }}
                    >
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* AGB Checkbox */}
          <label
            className="flex items-start gap-3 cursor-pointer"
            style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px" }}
          >
            <div
              className="flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150"
              style={{
                width: "20px",
                height: "20px",
                background: agbAccepted ? "var(--brand)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${agbAccepted ? "var(--brand)" : "rgba(255,255,255,0.15)"}`,
                borderRadius: "3px",
                cursor: "pointer",
              }}
              onClick={() => setAgbAccepted(!agbAccepted)}
            >
              {agbAccepted && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={agbAccepted} onChange={() => setAgbAccepted(!agbAccepted)} />
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              Ich akzeptiere die{" "}
              <span style={{ color: "var(--brand)", textDecoration: "underline" }}>AGBs</span>{" "}
              und bestätige den Neustart der Laufzeit (12 Monate) ab dem heutigen Datum.
            </p>
          </label>

          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <SecondaryBtn>Abbrechen</SecondaryBtn>
            </DialogClose>
            <PrimaryBtn
              onClick={handleUpgrade}
              loading={upgradeLoading}
              disabled={!selectedPlan || !agbAccepted}
            >
              <Zap size={13} />
              Jetzt upgraden
            </PrimaryBtn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────
          TERMINATION DIALOG
      ──────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={terminateOpen}
        onOpenChange={(o) => {
          setTerminateOpen(o);
          if (!o) {
            setTerminateReason("");
            setTerminateNote("");
            setTerminateFile(null);
            setTerminateConfirm(false);
          }
        }}
      >
        <DialogContent className="max-w-lg" style={{ background: "#0a0a0a", border: "1px solid rgba(248,113,113,0.2)" }}>
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              Mitgliedschaft{" "}
              <span style={{ color: "#f87171" }}>Kündigen</span>
            </DialogTitle>
            <DialogDescription>
              Wir sind traurig, dass du gehst. Bitte teile uns kurz mit, warum du kündigst.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning */}
            <div
              className="flex items-start gap-3 p-3"
              style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "4px" }}
            >
              <AlertTriangle size={15} style={{ color: "#f87171", marginTop: "2px", flexShrink: 0 }} />
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Die Kündigung wird zum Ende der aktuellen Vertragslaufzeit wirksam. Du erhältst eine Bestätigung per E-Mail.
              </p>
            </div>

            {/* Reason */}
            <div>
              <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Kündigungsgrund *</p>
              <select
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                style={{ ...INPUT_STYLE, cursor: "pointer" }}
              >
                <option value="" disabled style={{ background: "#1a1a1a" }}>Bitte wählen…</option>
                {TERMINATE_REASONS.map((r) => (
                  <option key={r.value} value={r.value} style={{ background: "#1a1a1a" }}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Anmerkung (optional)</p>
              <textarea
                value={terminateNote}
                onChange={(e) => setTerminateNote(e.target.value)}
                rows={3}
                placeholder="Was können wir verbessern?"
                style={{
                  ...INPUT_STYLE,
                  resize: "vertical",
                  minHeight: "80px",
                }}
              />
            </div>

            {/* Optional document */}
            <FileUploadField
              label="Dokument hochladen (optional)"
              file={terminateFile}
              onChange={setTerminateFile}
            />

            {/* Confirm checkbox */}
            <label
              className="flex items-start gap-3 cursor-pointer"
              style={{ padding: "12px", background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "4px" }}
            >
              <div
                className="flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150"
                style={{
                  width: "20px",
                  height: "20px",
                  background: terminateConfirm ? "#f87171" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${terminateConfirm ? "#f87171" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
                onClick={() => setTerminateConfirm(!terminateConfirm)}
              >
                {terminateConfirm && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <input type="checkbox" className="sr-only" checked={terminateConfirm} onChange={() => setTerminateConfirm(!terminateConfirm)} />
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Ich bestätige, dass ich meine Mitgliedschaft beim Nice Athletic Club kündigen möchte.
              </p>
            </label>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <SecondaryBtn>Abbrechen</SecondaryBtn>
            </DialogClose>
            <PrimaryBtn
              onClick={handleTerminate}
              loading={terminateLoading}
              disabled={!terminateReason || !terminateConfirm}
              danger
            >
              <XCircle size={13} />
              Kündigung bestätigen
            </PrimaryBtn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Invoice Print Dialog ─────────────────────────────────────────── */}
      <InvoicePreviewDialog
        invoice={printInvoice}
        onClose={() => setPrintInvoice(null)}
      />
    </div>
  );
}
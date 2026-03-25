/**
 * AdminIntegrations.tsx
 * Integration Engine – Magicline Connect API + DATEV/SEPA Platzhalter
 */
import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence, useAnimation } from "motion/react";
import {
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Cable,
  ExternalLink,
  KeyRound,
  ChevronRight,
  XCircle,
  X,
  Users,
  Database,
  Globe,
  ArrowUpDown,
  FileCheck2,
  HardDrive,
  Terminal,
  RotateCcw,
  Download,
  UserPlus,
  ShieldCheck,
  GitMerge,
  Slash,
  Mail,
  Hash,
  FlaskConical,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../../../lib/api-service";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const BRAND          = "#CA0C85";
const SURFACE_1      = "rgba(255,255,255,0.03)";
const SURFACE_2      = "rgba(255,255,255,0.055)";
const SURFACE_3      = "rgba(255,255,255,0.07)";
const BORDER         = "rgba(255,255,255,0.09)";
const BORDER_FOCUS   = "rgba(202,12,133,0.55)";
const TEXT_PRIMARY   = "#ffffff";
const TEXT_MUTED     = "rgba(255,255,255,0.38)";
const TEXT_BODY      = "rgba(255,255,255,0.62)";
const WARN_BG        = "rgba(251,191,36,0.07)";
const WARN_BORDER    = "rgba(251,191,36,0.22)";
const SUCCESS_BG     = "rgba(52,211,153,0.07)";
const SUCCESS_BORDER = "rgba(52,211,153,0.25)";
const SUCCESS_COLOR  = "#34D399";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface AuditData {
  total_fetched: number;
  inserted_new: number;
  ignored_nac_is_master: number;
  sent_to_merge_queue: number;
  errors?: number;
}

interface MergeCandidate {
  id: number;
  magicline_id: string;
  nac_local_id: number;
  score: number;
  reasons: string[];
  nac?: { first_name: string; last_name: string; email: string; member_since?: string; status?: string };
  ml?: { first_name: string; last_name: string; email: string; customer_status?: string };
}

type SyncPhase = null | "connecting" | "loading";
type SaveMsgType = "success" | "warn" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────────────────────────────────
const FieldLabel = ({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) => (
  <label
    htmlFor={htmlFor}
    style={{
      display: "block",
      fontFamily: "var(--font-condensed)",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: TEXT_MUTED,
      marginBottom: "7px",
    }}
  >
    {children}
    {required && <span style={{ color: BRAND, marginLeft: "3px" }}>*</span>}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: SURFACE_2,
  border: `1px solid ${BORDER}`,
  borderRadius: "5px",
  color: TEXT_PRIMARY,
  fontFamily: "var(--font-body)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  suffix,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  suffix?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...inputStyle, paddingRight: suffix ? "42px" : "14px" }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = BORDER_FOCUS;
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(202,12,133,0.1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = BORDER;
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {suffix && (
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: SURFACE_1,
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        padding: "28px 28px 24px",
        backdropFilter: "blur(8px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardSection({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: TEXT_MUTED,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  loading,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 22px",
        height: "44px",
        background: loading || disabled ? "rgba(202,12,133,0.45)" : BRAND,
        border: "none",
        borderRadius: "5px",
        color: "#fff",
        fontFamily: "var(--font-condensed)",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        transition: "transform 0.15s, box-shadow 0.15s, background 0.2s",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!loading && !disabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 24px rgba(202,12,133,0.4)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        if (!loading && !disabled)
          e.currentTarget.style.transform = "translateY(-1px)";
      }}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sync Audit Dialog – Master-Logik Protokoll
// ─────────────────────────────────────────────────────────────────────────────
function SyncAuditDialog({
  audit,
  message,
  onClose,
  onOpenMergeQueue,
}: {
  audit: AuditData;
  message: string;
  onClose: () => void;
  onOpenMergeQueue: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const hasMergeConflicts = (audit.sent_to_merge_queue ?? 0) > 0;

  // 4 Master-Sync Stats
  const statsGrid: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    accent?: string;
    description: string;
  }[] = [
    {
      icon: <Download size={14} style={{ color: "#60A5FA" }} />,
      label: "Von Magicline abgerufen",
      value: audit.total_fetched,
      description: "Datensaetze abgerufen (MEMBER + PROSPECT + FORMER)",
    },
    {
      icon: <UserPlus size={14} style={{ color: SUCCESS_COLOR }} />,
      label: "Neu importiert",
      value: audit.inserted_new,
      accent: audit.inserted_new > 0 ? SUCCESS_COLOR : undefined,
      description: "Komplett neue Mitglieder wurden angelegt",
    },
    {
      icon: <ShieldCheck size={14} style={{ color: "#60A5FA" }} />,
      label: "NAC ist Master",
      value: audit.ignored_nac_is_master,
      accent: audit.ignored_nac_is_master > 0 ? "#60A5FA" : undefined,
      description: "Ignoriert – bestehende NAC-Daten geschuetzt",
    },
    {
      icon: <AlertTriangle size={14} style={{ color: "#F59E0B" }} />,
      label: "Konflikte",
      value: audit.sent_to_merge_queue,
      accent: hasMergeConflicts ? "#F59E0B" : undefined,
      description: "In der Merge-Warteschlange (gleiche E-Mail)",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-dialog-title"
        className="w-full overflow-y-auto"
        style={{
          maxWidth: "640px",
          maxHeight: "92dvh",
          background: "#0e0e0e",
          border: `1px solid ${BORDER}`,
          borderRadius: "14px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-start gap-3 p-4 sm:p-6"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: SUCCESS_BG,
              border: `1.5px solid ${SUCCESS_BORDER}`,
            }}
          >
            <CheckCircle2 size={19} style={{ color: SUCCESS_COLOR }} />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="audit-dialog-title"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(17px, 4vw, 22px)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: TEXT_PRIMARY,
                lineHeight: 1.1,
                marginBottom: "5px",
              }}
            >
              Master-Sync: Abgeschlossen
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                color: TEXT_BODY,
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Dialog schliessen"
            className="shrink-0 flex items-center justify-center"
            style={{
              background: "none",
              border: "none",
              color: TEXT_MUTED,
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
              minWidth: "32px",
              minHeight: "32px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── NAC-Master Badge ─────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5">
          <div
            className="flex items-center gap-3"
            style={{
              padding: "9px 14px",
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.2)",
              borderRadius: "8px",
            }}
          >
            <ShieldCheck size={14} style={{ color: "#60A5FA", flexShrink: 0 }} />
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "#60A5FA", fontWeight: 600 }}>NAC ist Master:</span>{" "}
              Bereits verknuepfte Mitglieder wurden nicht ueberschrieben. Nur echte Neuzugaenge wurden importiert.
            </p>
          </div>
        </div>

        {/* ── Stats Grid: 2x2 ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 px-4 sm:px-6 pt-3">
          {statsGrid.map((s) => (
            <div
              key={s.label}
              className="flex items-start gap-3"
              style={{
                padding: "12px 14px",
                background: s.accent
                  ? `rgba(${s.label === "Konflikte" ? "245,158,11" : s.label === "NAC ist Master" ? "96,165,250" : "52,211,153"},0.06)`
                  : SURFACE_3,
                border: `1px solid ${
                  s.accent
                    ? s.label === "Konflikte"
                      ? "rgba(245,158,11,0.22)"
                      : s.label === "NAC ist Master"
                      ? "rgba(96,165,250,0.22)"
                      : "rgba(52,211,153,0.22)"
                    : BORDER
                }`,
                borderRadius: "8px",
              }}
            >
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: TEXT_MUTED,
                    marginBottom: "3px",
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "24px",
                    letterSpacing: "0.04em",
                    color: s.accent ?? TEXT_PRIMARY,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "10px",
                    color: TEXT_MUTED,
                    marginTop: "4px",
                    lineHeight: 1.4,
                  }}
                >
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Konflikt-Banner wenn nötig ─────────────────────────────────── */}
        {hasMergeConflicts && (
          <div className="px-4 sm:px-6 pt-3">
            <div
              className="flex items-start gap-3"
              style={{
                padding: "12px 14px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "8px",
              }}
            >
              <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                <span style={{ color: "#F59E0B", fontWeight: 600 }}>
                  {audit.sent_to_merge_queue} Duplikate erkannt:
                </span>{" "}
                Diese Kunden existieren bereits in NAC (gleiche E-Mail), sind aber noch nicht mit Magicline verknuepft.
                Bitte manuell pruefen und zusammenfuehren.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col-reverse sm:flex-row gap-3 justify-end px-4 sm:px-6 pb-5 sm:pb-6 mt-4 sm:mt-5"
          style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "16px" }}
        >
          {/* Ghost: Schliessen */}
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              height: "44px",
              padding: "0 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px",
              color: TEXT_MUTED,
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              e.currentTarget.style.color = TEXT_PRIMARY;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = TEXT_MUTED;
            }}
          >
            Schliessen
          </button>

          {/* CTA: bedingt */}
          {hasMergeConflicts ? (
            /* Pulsierender Konflikt-Button */
            <motion.button
              animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 18px rgba(245,158,11,0.45)", "0 0 0px rgba(245,158,11,0)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              onClick={() => { onClose(); onOpenMergeQueue(); }}
              className="flex items-center justify-center gap-2"
              style={{
                height: "44px",
                padding: "0 20px",
                background: "#D97706",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontFamily: "var(--font-condensed)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "transform 0.15s, background 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.background = "#F59E0B";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.background = "#D97706";
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(0.98)";
              }}
            >
              <GitMerge size={13} />
              Konflikte aufloesen ({audit.sent_to_merge_queue})
            </motion.button>
          ) : (
            /* Normal: Mitglieder ansehen */
            <button
              onClick={() => { onClose(); navigate("/admin/mitglieder"); }}
              className="flex items-center justify-center gap-2"
              style={{
                height: "44px",
                padding: "0 20px",
                background: BRAND,
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontFamily: "var(--font-condensed)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(202,12,133,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
            >
              <Users size={13} />
              Mitglieder ansehen
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge Queue Modal – Duplikat-Aufloesung
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CANDIDATES: MergeCandidate[] = [
  {
    id: 1,
    magicline_id: "ML-10042",
    nac_local_id: 17,
    score: 100,
    reasons: ["Exact Email Match"],
    nac: { first_name: "Thomas", last_name: "Bergmann", email: "thomas.bergmann@email.de", member_since: "2022-03-15", status: "active" },
    ml:  { first_name: "Thomas", last_name: "Bergmann", email: "thomas.bergmann@email.de", customer_status: "MEMBER" },
  },
  {
    id: 2,
    magicline_id: "ML-10089",
    nac_local_id: 43,
    score: 100,
    reasons: ["Exact Email Match"],
    nac: { first_name: "Sabrina", last_name: "Kuhn", email: "sabrina.kuhn@gmail.com", member_since: "2023-07-01", status: "active" },
    ml:  { first_name: "Sabrina", last_name: "Kuhn", email: "sabrina.kuhn@gmail.com", customer_status: "MEMBER" },
  },
];

function MergeQueueModal({
  candidates,
  loading,
  onClose,
  onResolve,
}: {
  candidates: MergeCandidate[];
  loading: boolean;
  onClose: () => void;
  onResolve: (id: number, resolution: "link" | "ignore") => void;
}) {
  const [resolvingId, setResolvingId] = React.useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleResolve = async (id: number, resolution: "link" | "ignore") => {
    setResolvingId(id);
    await onResolve(id, resolution);
    setResolvingId(null);
  };

  const DataCell = ({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) => (
    <div>
      <p style={{
        fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: "2px",
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: mono ? "monospace" : "var(--font-body)", fontSize: mono ? "11px" : "12px",
        color: value ? TEXT_PRIMARY : TEXT_MUTED, lineHeight: 1.4,
      }}>
        {value || "—"}
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9100] flex items-start justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", overflowY: "auto" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-dialog-title"
        className="w-full"
        style={{
          maxWidth: "860px",
          background: "#0e0e0e",
          border: `1px solid ${BORDER}`,
          borderRadius: "16px",
          boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
          marginTop: "16px",
          marginBottom: "32px",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-start gap-4 p-5 sm:p-7"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: "44px", height: "44px", borderRadius: "10px",
              background: "rgba(245,158,11,0.1)", border: "1.5px solid rgba(245,158,11,0.3)",
            }}
          >
            <GitMerge size={20} style={{ color: "#F59E0B" }} />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="merge-dialog-title"
              style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(18px, 4vw, 24px)",
                letterSpacing: "0.06em", textTransform: "uppercase", color: TEXT_PRIMARY,
                lineHeight: 1.1, marginBottom: "6px",
              }}
            >
              Duplikate &amp; Konflikte aufloesen
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, lineHeight: 1.55 }}>
              Diese Kunden existieren bereits in NAC (gleiche E-Mail), sind aber noch nicht mit Magicline verknuepft.
              Entscheide pro Eintrag: Zusammenfuehren oder ignorieren.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Modal schliessen"
            className="shrink-0 flex items-center justify-center"
            style={{
              background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer",
              padding: "6px", borderRadius: "4px", minWidth: "32px", minHeight: "32px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Fortschritts-Info ───────────────────────────────────────────── */}
        <div className="px-5 sm:px-7 pt-5">
          <div
            className="flex items-center justify-between"
            style={{
              padding: "10px 14px", background: SURFACE_2,
              border: `1px solid ${BORDER}`, borderRadius: "8px",
            }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: TEXT_BODY }}>
              {candidates.length} {candidates.length === 1 ? "Konflikt" : "Konflikte"} zur Aufloesung
            </span>
            <span
              style={{
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#F59E0B", background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)", padding: "3px 10px", borderRadius: "20px",
              }}
            >
              Aktion erforderlich
            </span>
          </div>
        </div>

        {/* ── Kandidaten-Liste ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 p-5 sm:p-7">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                border: "2px solid rgba(202,12,133,0.25)", borderTopColor: BRAND,
                animation: "nac-spin 0.7s linear infinite",
              }} />
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={36} style={{ color: SUCCESS_COLOR, marginBottom: "12px" }} />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: TEXT_PRIMARY, letterSpacing: "0.06em" }}>
                Alle Konflikte geloest!
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_MUTED, marginTop: "8px" }}>
                Keine weiteren Duplikate in der Warteschlange.
              </p>
            </div>
          ) : (
            candidates.map((candidate) => {
              const isResolving = resolvingId === candidate.id;
              return (
                <motion.div
                  key={candidate.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    background: SURFACE_1, border: `1px solid ${BORDER}`,
                    borderRadius: "12px", overflow: "hidden",
                    opacity: isResolving ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Score-Badge oben */}
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE_2 }}
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={12} style={{ color: TEXT_MUTED }} />
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: TEXT_MUTED }}>
                        ML: {candidate.magicline_id} &nbsp;|&nbsp; NAC ID: {candidate.nac_local_id}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      style={{
                        padding: "3px 10px", borderRadius: "20px",
                        background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                      }}
                    >
                      <CheckCircle2 size={10} style={{ color: SUCCESS_COLOR }} />
                      <span style={{
                        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.14em", color: SUCCESS_COLOR,
                      }}>
                        Score: {candidate.score}% &mdash; {candidate.reasons[0] ?? "Treffer"}
                      </span>
                    </div>
                  </div>

                  {/* ── Split View: NAC links / ML rechts ────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {/* NAC-Seite */}
                    <div
                      className="flex flex-col gap-4 p-5"
                      style={{ borderRight: `1px solid ${BORDER}` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div style={{
                          padding: "2px 8px", borderRadius: "4px",
                          background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)",
                        }}>
                          <span style={{
                            fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.18em", textTransform: "uppercase", color: "#60A5FA",
                          }}>
                            NAC (Master)
                          </span>
                        </div>
                        <ShieldCheck size={12} style={{ color: "#60A5FA" }} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <DataCell label="Vorname" value={candidate.nac?.first_name} />
                        <DataCell label="Nachname" value={candidate.nac?.last_name} />
                        <div className="col-span-2">
                          <DataCell label="E-Mail" value={candidate.nac?.email} mono />
                        </div>
                        <DataCell label="Mitglied seit" value={candidate.nac?.member_since} />
                        <DataCell
                          label="Status"
                          value={candidate.nac?.status === "active" ? "Aktiv" : candidate.nac?.status}
                        />
                      </div>
                    </div>

                    {/* Magicline-Seite */}
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div style={{
                          padding: "2px 8px", borderRadius: "4px",
                          background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.25)",
                        }}>
                          <span style={{
                            fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.18em", textTransform: "uppercase", color: BRAND,
                          }}>
                            Magicline
                          </span>
                        </div>
                        <Cable size={12} style={{ color: BRAND }} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <DataCell label="Vorname" value={candidate.ml?.first_name} />
                        <DataCell label="Nachname" value={candidate.ml?.last_name} />
                        <div className="col-span-2">
                          <DataCell label="E-Mail" value={candidate.ml?.email} mono />
                        </div>
                        <DataCell label="ML-ID" value={candidate.magicline_id} mono />
                        <DataCell label="Kunde-Status" value={candidate.ml?.customer_status} />
                      </div>
                    </div>
                  </div>

                  {/* ── Aktions-Buttons ───────────────────────────────────── */}
                  <div
                    className="flex flex-col sm:flex-row gap-3 justify-end px-5 py-4"
                    style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.01)" }}
                  >
                    {/* Ghost: Ignorieren */}
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(candidate.id, "ignore")}
                      className="flex items-center justify-center gap-2"
                      style={{
                        height: "40px", padding: "0 18px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "6px", color: TEXT_MUTED,
                        fontFamily: "var(--font-condensed)", fontSize: "11px",
                        fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: isResolving ? "not-allowed" : "pointer",
                        transition: "border-color 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isResolving) {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
                          e.currentTarget.style.color = TEXT_PRIMARY;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.color = TEXT_MUTED;
                      }}
                    >
                      {isResolving ? <Loader2 size={12} className="animate-spin" /> : <Slash size={12} />}
                      Ignorieren (nicht verknuepfen)
                    </button>

                    {/* Primary: Zusammenfuehren */}
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(candidate.id, "link")}
                      className="flex items-center justify-center gap-2"
                      style={{
                        height: "40px", padding: "0 20px",
                        background: isResolving ? "rgba(202,12,133,0.45)" : BRAND,
                        border: "none", borderRadius: "6px", color: "#fff",
                        fontFamily: "var(--font-condensed)", fontSize: "11px",
                        fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: isResolving ? "not-allowed" : "pointer",
                        transition: "transform 0.15s, box-shadow 0.15s, background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isResolving) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 20px rgba(202,12,133,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                    >
                      {isResolving ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                      Zusammenfuehren (ML-ID an NAC anhaengen)
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          className="flex justify-between items-center px-5 sm:px-7 py-4"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, lineHeight: 1.5 }}>
            Zusammenfuehren schreibt nur die Magicline-ID an den NAC-Datensatz.
            NAC-Stammdaten bleiben unveraendert.
          </p>
          <button
            onClick={onClose}
            style={{
              height: "36px", padding: "0 16px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px",
              color: TEXT_MUTED, fontFamily: "var(--font-condensed)", fontSize: "10px",
              fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = TEXT_PRIMARY;
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = TEXT_MUTED;
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            Schliessen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "magicline", label: "Magicline" },
  { id: "datev",     label: "DATEV / SEPA" },
  { id: "smtp",      label: "E-Mail / SMTP" },
  { id: "debuglog",  label: "Debug Log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Integration-Tabs"
      style={{
        display: "inline-flex",
        background: SURFACE_1,
        border: `1px solid ${BORDER}`,
        borderRadius: "7px",
        padding: "4px",
        gap: "2px",
        marginBottom: "28px",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              padding: "8px 20px",
              border: `1px solid ${isActive ? "rgba(202,12,133,0.35)" : "transparent"}`,
              borderRadius: "5px",
              background: isActive ? "rgba(202,12,133,0.14)" : "transparent",
              color: isActive ? TEXT_PRIMARY : TEXT_MUTED,
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.18s",
              outline: "none",
              minWidth: "130px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = `0 0 0 2px ${BORDER_FOCUS}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = TEXT_MUTED;
            }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                style={{
                  position: "absolute",
                  bottom: "-1px",
                  left: "20%",
                  right: "20%",
                  height: "2px",
                  background: BRAND,
                  borderRadius: "2px",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 – Magicline
// ─────────────────────────────────────────────────────────────────────────────
function MagiclineTab() {
  // ── API-Config Form ──────────────────────────────────────────────────────────
  const [mode, setMode]         = useState<"live" | "sandbox">("live");
  const [baseUrl, setBaseUrl]   = useState("");
  const [tenantId, setTenantId] = useState("");   // client_id / Subdomain-Prefix
  const [studioId, setStudioId] = useState("");   // studio_id (numerische ML-Studio-ID)
  const [apiKey, setApiKey]     = useState("");   // x-api-key
  const [showKey, setShowKey]   = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState<{ type: SaveMsgType; text: string } | null>(null);

  // ── Connection Test ──────────────────────────────────────────────────────────
  const [connTesting, setConnTesting] = useState(false);
  const [connResult, setConnResult]   = useState<{ success: boolean; message: string; environment?: string } | null>(null);

  // ── Sync Profile ─────────────────────────────────────────────────────────────
  const [customerStatuses, setCustomerStatuses] = useState<string[]>(["MEMBER", "PROSPECT", "FORMER_MEMBER"]);
  const [syncPolicy, setSyncPolicy]             = useState<"nac_master" | "prefer_magicline">("nac_master");

  // ── Dry Run ───────────────────────────────────────────────────────────────────
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{
    total_fetched: number; would_insert: number; would_update: number;
    would_merge: number; total_by_status: Record<string, number>;
  } | null>(null);
  const [dryRunError, setDryRunError] = useState<string | null>(null);

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const [syncPhase, setSyncPhase]     = useState<SyncPhase>(null);
  const [auditDialog, setAuditDialog] = useState<{ audit: AuditData; message: string } | null>(null);
  const [syncError, setSyncError]     = useState<string | null>(null);
  const syncControls                  = useAnimation();

  // Merge Queue
  const [showMergeQueue, setShowMergeQueue]       = useState(false);
  const [mergeCandidates, setMergeCandidates]     = useState<MergeCandidate[]>([]);
  const [mergeLoading, setMergeLoading]           = useState(false);

  // ── Load settings ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await api.integrations.getSettings() as any;
        const s = data?.settings ?? data ?? {};
        setBaseUrl(s.base_url ?? "");
        setTenantId(s.client_id ?? "");
        setStudioId(s.studio_id ?? "");
        setMode((s.mode as "live" | "sandbox") || "live");
        // api_key / client_secret – Backend gibt maskierten Wert zurueck
        setApiKey(s.api_key ?? s.client_secret ?? "");
      } catch {
        /* silent */
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // ── Mode Toggle: URL auto-rewrite ───────────────────────────────────────────
  const handleModeChange = (newMode: "live" | "sandbox") => {
    setMode(newMode);
    setBaseUrl((prev) => {
      if (newMode === "sandbox") {
        if (prev && prev.includes(".open-api.magicline.com") && !prev.includes(".sandbox."))
          return prev.replace(".open-api.magicline.com", ".open-api.sandbox.magicline.com");
      } else {
        if (prev && prev.includes(".open-api.sandbox.magicline.com"))
          return prev.replace(".open-api.sandbox.magicline.com", ".open-api.magicline.com");
      }
      return prev;
    });
  };

  // ── Save Settings ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!baseUrl.trim()) { toast.error("Base URL ist erforderlich."); return; }
    setSaving(true);
    setSaveMsg(null);
    setConnResult(null);

    const payload: Record<string, string> = {
      mode:      mode,
      base_url:  baseUrl.trim(),
      client_id: tenantId.trim(),
      studio_id: studioId.trim(),
    };
    // API Key nur mitsenden wenn wirklich geaendert (kein Masken-Wert)
    const keyIsUnchanged = !apiKey || apiKey.includes("*") || apiKey.includes("\u2022");
    if (!keyIsUnchanged) {
      payload.api_key       = apiKey.trim();
      payload.client_secret = apiKey.trim(); // Abwaertskompatibilitaet
    }

    try {
      const res = await api.integrations.saveSettings(payload) as any;
      const msg = res?.message ?? "Einstellungen gespeichert.";
      setSaveMsg({ type: "success", text: msg });
      toast.success(msg);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Unbekannter Fehler beim Speichern.";
      if (err instanceof ApiError && err.status === 400) {
        setSaveMsg({ type: "warn", text: msg });
        toast.error("Gespeichert, aber Verbindungstest fehlgeschlagen", { description: msg });
      } else {
        setSaveMsg({ type: "error", text: msg });
        toast.error("Fehler beim Speichern", { description: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Verbindungstest ─────────────────────────────────────────────────────────
  const handleConnectionTest = async () => {
    setConnTesting(true);
    setConnResult(null);
    try {
      const res = await api.integrations.connectionTest();
      setConnResult(res);
      if (res.success) toast.success("Verbindung erfolgreich!", { description: res.environment ? `Umgebung: ${res.environment}` : undefined });
      else toast.error("Verbindung fehlgeschlagen", { description: res.message });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Verbindungstest fehlgeschlagen.";
      setConnResult({ success: false, message: msg });
      toast.error("Verbindungstest fehlgeschlagen", { description: msg });
    } finally {
      setConnTesting(false);
    }
  };

  // ── Dry Run (Test-Sync) ──────────────────────────────────────────────────────
  const handleDryRun = async () => {
    if (customerStatuses.length === 0) { toast.error("Bitte mindestens einen Kundenstatus waehlen."); return; }
    setIsDryRunning(true);
    setDryRunResult(null);
    setDryRunError(null);
    try {
      const res = await api.integrations.syncPreview({ customer_statuses: customerStatuses, policy: syncPolicy });
      setDryRunResult(res.preview);
      toast.success("Dry Run abgeschlossen.", { description: `${res.preview.total_fetched} Datensaetze simuliert.` });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Dry Run fehlgeschlagen.";
      setDryRunError(msg);
      toast.error("Dry Run fehlgeschlagen", { description: msg });
    } finally {
      setIsDryRunning(false);
    }
  };

  // ── Master-Sync ──────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (customerStatuses.length === 0) { toast.error("Bitte mindestens einen Kundenstatus waehlen."); return; }
    setSyncPhase("connecting");
    setSyncError(null);
    setAuditDialog(null);
    setDryRunResult(null);

    syncControls.start({ rotate: 360, transition: { duration: 0.7, ease: "linear", repeat: Infinity } });
    const phaseTimer = setTimeout(() => setSyncPhase("loading"), 700);

    try {
      const res = await api.integrations.syncRun({ customer_statuses: customerStatuses, policy: syncPolicy });
      clearTimeout(phaseTimer);
      syncControls.stop();
      await syncControls.start({ rotate: 0, transition: { duration: 0.15 } });
      setSyncPhase(null);
      setAuditDialog({ audit: res.audit, message: res.message ?? "Synchronisation abgeschlossen." });
    } catch (err) {
      clearTimeout(phaseTimer);
      syncControls.stop();
      await syncControls.start({ rotate: 0, transition: { duration: 0.15 } });
      setSyncPhase(null);
      const msg = err instanceof ApiError ? err.message : "Sync fehlgeschlagen. Verbindung und Konfiguration pruefen.";
      setSyncError(msg);
    }
  };

  const closeSyncDialog = useCallback(() => setAuditDialog(null), []);

  const openMergeQueue = useCallback(async () => {
    setShowMergeQueue(true);
    setMergeLoading(true);
    try {
      const res = await api.integrations.getMergeCandidates();
      setMergeCandidates(res.candidates ?? MOCK_CANDIDATES);
    } catch {
      // Backend-Endpoint noch nicht deployed: Mock-Daten verwenden
      setMergeCandidates(MOCK_CANDIDATES);
    } finally {
      setMergeLoading(false);
    }
  }, []);

  const handleMergeResolve = useCallback(async (id: number, resolution: "link" | "ignore") => {
    try {
      await api.integrations.resolveMerge(id, resolution);
      toast.success(
        resolution === "link"
          ? "Zusammengefuehrt! Magicline-ID wurde an den NAC-Datensatz angehaengt."
          : "Ignoriert. Eintrag aus der Merge-Queue entfernt."
      );
    } catch {
      // Fallback: trotzdem aus der UI entfernen (optimistic update)
      toast.info(
        resolution === "link"
          ? "Zusammengefuehrt (lokal – Backend-Endpoint folgt)."
          : "Ignoriert (lokal)."
      );
    }
    // Optimistisch aus der Liste entfernen
    setMergeCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  if (loadingInit) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 0",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "2px solid rgba(202,12,133,0.25)",
            borderTopColor: BRAND,
            animation: "nac-spin 0.7s linear infinite",
          }}
        />
      </div>
    );
  }

  // Save banner color map
  const saveBannerMap: Record<SaveMsgType, { bg: string; border: string; iconEl: React.ReactNode; labelColor: string; label: string }> = {
    success: {
      bg: SUCCESS_BG,
      border: SUCCESS_BORDER,
      iconEl: <CheckCircle2 size={16} style={{ color: SUCCESS_COLOR, flexShrink: 0, marginTop: "1px" }} />,
      labelColor: SUCCESS_COLOR,
      label: "Verbindung erfolgreich",
    },
    warn: {
      bg: WARN_BG,
      border: WARN_BORDER,
      iconEl: <AlertTriangle size={16} style={{ color: "#FBBF24", flexShrink: 0, marginTop: "1px" }} />,
      labelColor: "#FBBF24",
      label: "Gespeichert – Verbindung fehlgeschlagen",
    },
    error: {
      bg: "rgba(248,113,113,0.07)",
      border: "rgba(248,113,113,0.25)",
      iconEl: <XCircle size={16} style={{ color: "#F87171", flexShrink: 0, marginTop: "1px" }} />,
      labelColor: "#F87171",
      label: "Fehler",
    },
  };

  const isSandbox = mode === "sandbox";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── Card 1: API-Konfiguration ──────────────────────────────────────── */}
        <GlassCard>
          <CardSection label="API-Konfiguration" />

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: TEXT_BODY,
              lineHeight: 1.65,
              marginBottom: "24px",
            }}
          >
            Trage hier deine Zugangsdaten aus dem{" "}
            <a
              href="https://developer.magicline.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: BRAND,
                textDecoration: "none",
                borderBottom: "1px solid rgba(202,12,133,0.35)",
                paddingBottom: "1px",
              }}
            >
              Magicline Developer Portal
              <ExternalLink
                size={10}
                style={{ display: "inline", marginLeft: "3px", verticalAlign: "middle" }}
              />
            </a>{" "}
            ein. Beim Speichern wird automatisch ein Live-Verbindungstest gegen{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.06)",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              HEAD /customers
            </code>{" "}
            durchgefuehrt. Authentifizierung ausschliesslich ueber{" "}
            <code style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px" }}>
              x-api-key
            </code>
            {" "}(kein OAuth, kein Bearer). Die Base URL muss auf{" "}
            <code style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px" }}>
              /v1
            </code>
            {" "}enden.
          </p>

          {/* ── Umgebungs-Toggle: Live vs. Sandbox ─────────────────────── */}
          <div style={{ marginBottom: "22px" }}>
            <FieldLabel>Umgebung</FieldLabel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: "7px",
                padding: "4px",
                width: "fit-content",
              }}
            >
              {/* Live Button */}
              <button
                type="button"
                onClick={() => handleModeChange("live")}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "8px 18px", borderRadius: "5px", border: "none",
                  cursor: "pointer", transition: "all 0.18s",
                  background: mode === "live" ? "rgba(52,211,153,0.12)" : "transparent",
                  boxShadow: mode === "live" ? "0 0 0 1px rgba(52,211,153,0.35)" : "none",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: mode === "live" ? "#34D399" : TEXT_MUTED,
                }}
              >
                <span
                  style={{
                    width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                    background: mode === "live" ? "#34D399" : "rgba(255,255,255,0.2)",
                    boxShadow: mode === "live" ? "0 0 8px rgba(52,211,153,0.7)" : "none",
                    transition: "all 0.18s",
                  }}
                />
                Live Modus
              </button>

              {/* Sandbox Button */}
              <button
                type="button"
                onClick={() => handleModeChange("sandbox")}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "8px 18px", borderRadius: "5px", border: "none",
                  cursor: "pointer", transition: "all 0.18s",
                  background: mode === "sandbox" ? "rgba(217,119,6,0.12)" : "transparent",
                  boxShadow: mode === "sandbox" ? "0 0 0 1px rgba(217,119,6,0.4)" : "none",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: mode === "sandbox" ? "#F59E0B" : TEXT_MUTED,
                }}
              >
                <FlaskConical size={12} style={{ flexShrink: 0 }} />
                Sandbox (Entwicklung)
              </button>
            </div>
          </div>

          {/* ── Sandbox Warning Banner ──────────────────────────────────── */}
          <AnimatePresence>
            {mode === "sandbox" && (
              <motion.div
                key="sandbox-banner"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "13px 16px",
                    background: "rgba(217,119,6,0.08)",
                    border: "1px solid rgba(217,119,6,0.32)",
                    borderRadius: "6px",
                    borderLeft: "3px solid #D97706",
                  }}
                >
                  <FlaskConical size={15} style={{ color: "#F59E0B", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p style={{
                      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B",
                      marginBottom: "4px",
                    }}>
                      Sandbox-Modus ist aktiv
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "12px",
                      color: "rgba(255,255,255,0.65)", lineHeight: 1.6,
                    }}>
                      Alle Verbindungen gehen an die Testumgebung von Magicline.
                      Es werden <strong style={{ color: "rgba(255,255,255,0.9)" }}>keine realen Live-Daten</strong>{" "}
                      abgerufen oder modifiziert. Die Base URL wurde automatisch auf{" "}
                      <code style={{
                        fontFamily: "monospace", fontSize: "11px",
                        color: "#F59E0B", background: "rgba(217,119,6,0.12)",
                        padding: "1px 5px", borderRadius: "3px",
                      }}>
                        .open-api.sandbox.magicline.com
                      </code>{" "}
                      umgeschrieben.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Base URL – full width */}
          <div style={{ marginBottom: "18px" }}>
            <FieldLabel htmlFor="base-url" required>
              Base URL
            </FieldLabel>
            <TextInput
              id="base-url"
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder="https://tobias-tkotz.open-api.magicline.com"
            />
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                color: TEXT_MUTED,
                marginTop: "6px",
              }}
            >
              Deine eindeutige Open-API-Base-URL aus dem Magicline-Portal.
            </p>
          </div>

          {/* Tenant ID + Studio ID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
            <div>
              <FieldLabel htmlFor="tenant-id">
                <KeyRound size={10} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
                Tenant ID
              </FieldLabel>
              <TextInput id="tenant-id" value={tenantId} onChange={setTenantId} placeholder="tobias-tkotz" />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "6px" }}>
                Subdomain-Prefix aus der Base URL (optional).
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="studio-id">Studio ID</FieldLabel>
              <TextInput id="studio-id" value={studioId} onChange={setStudioId} placeholder="1210004670" />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "6px" }}>
                Numerische Magicline Studio-ID (optional).
              </p>
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: "24px" }}>
            <FieldLabel htmlFor="api-key" required>
              <Lock size={10} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
              API Key (x-api-key)
            </FieldLabel>
            <TextInput
              id="api-key"
              value={apiKey}
              onChange={setApiKey}
              type={showKey ? "text" : "password"}
              placeholder="530d7013-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              suffix={
                <button
                  type="button"
                  aria-label={showKey ? "Key verbergen" : "Key anzeigen"}
                  onClick={() => setShowKey((s) => !s)}
                  style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "6px", lineHeight: 1.55 }}>
              Dein API Key aus dem Magicline Developer Portal. Authentifizierung laeuft ausschliesslich ueber den Header{" "}
              <code style={{ fontFamily: "monospace", fontSize: "11px", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>
                x-api-key
              </code>
              . Wird maskiert angezeigt – Wert unveraendert lassen wenn nicht geaendert.
            </p>
          </div>

          {/* Save + Connection Test Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <PrimaryBtn onClick={handleSave} loading={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Speichern..." : "Einstellungen speichern"}
            </PrimaryBtn>
            <button
              onClick={handleConnectionTest}
              disabled={connTesting}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "0 20px", height: "44px",
                background: connTesting ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.3)",
                borderRadius: "5px", color: connTesting ? TEXT_MUTED : "#60A5FA",
                fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: connTesting ? "not-allowed" : "pointer", transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { if (!connTesting) { e.currentTarget.style.background = "rgba(96,165,250,0.18)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.5)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(96,165,250,0.1)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.3)"; }}
            >
              {connTesting ? <Loader2 size={13} className="animate-spin" /> : <Cable size={13} />}
              {connTesting ? "Teste..." : "Verbindung testen"}
            </button>
          </div>

          {/* Connection Test Result */}
          <AnimatePresence>
            {connResult && (
              <motion.div
                key="conn-result"
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "12px", padding: "13px 16px",
                  background: connResult.success ? SUCCESS_BG : "rgba(248,113,113,0.07)",
                  border: `1px solid ${connResult.success ? SUCCESS_BORDER : "rgba(248,113,113,0.25)"}`,
                  borderRadius: "6px", marginTop: "14px",
                }}
              >
                {connResult.success
                  ? <CheckCircle2 size={15} style={{ color: SUCCESS_COLOR, flexShrink: 0, marginTop: "2px" }} />
                  : <XCircle size={15} style={{ color: "#F87171", flexShrink: 0, marginTop: "2px" }} />
                }
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: connResult.success ? SUCCESS_COLOR : "#F87171" }}>
                    {connResult.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}
                    {connResult.environment && ` — ${connResult.environment}`}
                  </p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, marginTop: "3px" }}>{connResult.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save result banner */}
          <AnimatePresence>
            {saveMsg && (() => {
              const c = saveBannerMap[saveMsg.type];
              return (
                <motion.div
                  key="save-banner"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "13px 16px",
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: "6px",
                    marginTop: "16px",
                  }}
                >
                  {c.iconEl}
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: c.labelColor,
                      }}
                    >
                      {c.label}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        color: TEXT_BODY,
                        marginTop: "3px",
                      }}
                    >
                      {saveMsg.text}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </GlassCard>

        {/* ── Card 2: Sync-Profil ─────────────────────────────────────────────── */}
        <GlassCard style={isSandbox ? { border: "1px solid rgba(217,119,6,0.22)", boxShadow: "0 0 0 1px rgba(217,119,6,0.06) inset" } : {}}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <CardSection label={isSandbox ? "Sync-Profil (Sandbox)" : "Sync-Profil"} />
            {isSandbox && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", flexShrink: 0, marginTop: "-2px", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#F59E0B" }}>
                <FlaskConical size={9} /> SANDBOX
              </span>
            )}
          </div>

          {/* ── Kundenstatus-Auswahl ─────────────────────────────────────────── */}
          <div style={{ marginBottom: "22px" }}>
            <FieldLabel>Kundenstatus importieren</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
              {(["MEMBER", "PROSPECT", "FORMER_MEMBER"] as const).map((status) => {
                const active = customerStatuses.includes(status);
                const colors: Record<string, { bg: string; border: string; text: string }> = {
                  MEMBER:        { bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.3)",  text: "#34D399" },
                  PROSPECT:      { bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.3)",  text: "#60A5FA" },
                  FORMER_MEMBER: { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.25)", text: "#9CA3AF" },
                };
                const c = colors[status];
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCustomerStatuses((prev) =>
                      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
                    )}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      padding: "9px 16px",
                      background: active ? c.bg : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? c.border : BORDER}`,
                      borderRadius: "6px", cursor: "pointer", transition: "all 0.18s",
                      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: active ? c.text : TEXT_MUTED,
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: active ? c.text : "rgba(255,255,255,0.2)", transition: "background 0.18s" }} />
                    {status.replace("_", " ")}
                  </button>
                );
              })}
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "8px" }}>
              Welche Magicline-Kundenstatus sollen beim Sync beruecksichtigt werden?
            </p>
          </div>

          {/* ── Sync-Policy ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "28px" }}>
            <FieldLabel htmlFor="sync-policy">Sync-Strategie</FieldLabel>
            <div style={{ position: "relative", maxWidth: "440px" }}>
              <select
                id="sync-policy"
                value={syncPolicy}
                onChange={(e) => setSyncPolicy(e.target.value as "nac_master" | "prefer_magicline")}
                style={{
                  width: "100%", appearance: "none",
                  background: SURFACE_2, border: `1px solid ${BORDER}`,
                  color: TEXT_PRIMARY, fontFamily: "var(--font-body)", fontSize: "13px",
                  padding: "11px 40px 11px 14px", outline: "none",
                  cursor: "pointer", transition: "border-color 0.18s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = BORDER_FOCUS; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
              >
                <option value="nac_master">NAC Master (Fill empty only) – Empfohlen</option>
                <option value="prefer_magicline">Prefer Magicline (Override allowed)</option>
              </select>
              <ChevronRight size={13} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%) rotate(90deg)", color: TEXT_MUTED, pointerEvents: "none" }} />
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "8px" }}>
              <strong style={{ color: "#60A5FA" }}>NAC Master:</strong> Bestehende NAC-Daten werden nie ueberschrieben – nur leere Felder werden befuellt.
            </p>
          </div>

          {/* ── NAC-Master Hinweis ────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "6px", marginBottom: "24px" }}>
            <Database size={14} style={{ color: "#60A5FA", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
              <span style={{ color: "#60A5FA", fontWeight: 600 }}>NAC ist Master:</span>{" "}
              Neue Kunden werden als Members angelegt. Bei Duplikaten (gleiche E-Mail oder Name) wird ein Merge-Kandidat erstellt – kein automatisches Ueberschreiben.
            </p>
          </div>

          {/* ── Sync-Buttons ──────────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            {/* Dry Run */}
            <button
              onClick={handleDryRun}
              disabled={isDryRunning || syncPhase !== null}
              style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                padding: "0 24px", height: "48px",
                background: isDryRunning ? "rgba(96,165,250,0.25)" : "rgba(96,165,250,0.12)",
                border: "1px solid rgba(96,165,250,0.35)", borderRadius: "6px",
                color: isDryRunning ? TEXT_MUTED : "#60A5FA",
                fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: isDryRunning || syncPhase !== null ? "not-allowed" : "pointer",
                transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { if (!isDryRunning && syncPhase === null) { e.currentTarget.style.background = "rgba(96,165,250,0.2)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.55)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.background = isDryRunning ? "rgba(96,165,250,0.25)" : "rgba(96,165,250,0.12)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.35)"; }}
            >
              {isDryRunning ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
              {isDryRunning ? "Dry Run laeuft..." : "Test-Sync (Dry Run)"}
            </button>

            {/* Master Sync */}
            <button
              onClick={handleSync}
              disabled={syncPhase !== null || isDryRunning}
              style={{
                display: "inline-flex", alignItems: "center", gap: "12px",
                padding: "0 32px", height: "48px",
                background: syncPhase !== null ? (isSandbox ? "rgba(217,119,6,0.45)" : "rgba(202,12,133,0.45)") : isSandbox ? "#D97706" : BRAND,
                border: isSandbox && syncPhase === null ? "1px solid rgba(217,119,6,0.35)" : "none",
                borderRadius: "6px", color: "#fff",
                fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                cursor: syncPhase !== null || isDryRunning ? "not-allowed" : "pointer",
                transition: "transform 0.15s, box-shadow 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { if (syncPhase === null && !isDryRunning) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isSandbox ? "0 4px 24px rgba(217,119,6,0.45)" : "0 4px 24px rgba(202,12,133,0.4)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              onMouseDown={(e) => { if (syncPhase === null) e.currentTarget.style.transform = "scale(0.98)"; }}
            >
              <motion.div animate={syncControls} style={{ display: "flex" }}>
                {syncPhase !== null ? <Loader2 size={18} /> : <ArrowUpDown size={18} />}
              </motion.div>
              {syncPhase === "connecting" ? "Verbindung..." : syncPhase === "loading" ? "Synchronisiere..." : isSandbox ? "Test-Sync starten (Sandbox)" : "Master-Sync starten"}
            </button>
          </div>

          {/* ── Dry Run Ergebnis ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {dryRunResult && (
              <motion.div key="dry-run-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                style={{ marginTop: "20px", padding: "16px 18px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "8px" }}
              >
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#60A5FA", marginBottom: "12px" }}>
                  Dry Run Vorschau
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "10px" }}>
                  {[
                    { label: "Abgerufen",      value: dryRunResult.total_fetched, color: TEXT_PRIMARY },
                    { label: "Wuerde import.", value: dryRunResult.would_insert,  color: SUCCESS_COLOR },
                    { label: "Wuerde update", value: dryRunResult.would_update,   color: "#60A5FA" },
                    { label: "Konflikte",      value: dryRunResult.would_merge,   color: dryRunResult.would_merge > 0 ? "#F59E0B" : TEXT_MUTED },
                  ].map((s) => (
                    <div key={s.label} style={{ padding: "10px 12px", background: SURFACE_2, borderRadius: "6px" }}>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: "4px" }}>{s.label}</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", color: s.color, lineHeight: 1 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {Object.keys(dryRunResult.total_by_status ?? {}).length > 0 && (
                  <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {Object.entries(dryRunResult.total_by_status).map(([status, count]) => (
                      <span key={status} style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TEXT_MUTED, background: SURFACE_3, padding: "3px 10px", borderRadius: "4px" }}>
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {dryRunError && (
              <motion.div key="dry-run-error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ marginTop: "16px", display: "flex", alignItems: "flex-start", gap: "12px", padding: "13px 16px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "6px" }}
              >
                <XCircle size={15} style={{ color: "#F87171", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F87171" }}>Dry Run fehlgeschlagen</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, marginTop: "3px" }}>{dryRunError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Sync Error ────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {syncError && (
              <motion.div key="sync-error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ marginTop: "16px", display: "flex", alignItems: "flex-start", gap: "12px", padding: "13px 16px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "6px" }}
              >
                <XCircle size={15} style={{ color: "#F87171", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F87171" }}>Sync fehlgeschlagen</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, marginTop: "3px" }}>{syncError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* ── Audit Dialog ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {auditDialog && (
          <SyncAuditDialog
            audit={auditDialog.audit}
            message={auditDialog.message}
            onClose={closeSyncDialog}
            onOpenMergeQueue={openMergeQueue}
          />
        )}
      </AnimatePresence>

      {/* ── Merge Queue Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showMergeQueue && (
          <MergeQueueModal
            candidates={mergeCandidates}
            loading={mergeLoading}
            onClose={() => setShowMergeQueue(false)}
            onResolve={handleMergeResolve}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 – DATEV / SEPA
// ─────────────────────────────────────────────────────────────────────────────
function DatevSepaTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <GlassCard
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 40px",
          minHeight: "360px",
        }}
      >
        <div
          style={{
            width: "76px",
            height: "76px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
          }}
        >
          <Lock size={30} style={{ color: TEXT_MUTED }} />
        </div>

        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
            marginBottom: "16px",
            lineHeight: 1,
          }}
        >
          DATEV &amp; SEPA
        </h3>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: TEXT_MUTED,
            lineHeight: 1.7,
            maxWidth: "440px",
            marginBottom: "32px",
          }}
        >
          Diese Schnittstellen sind in der aktuellen Entwicklungsphase gesperrt
          und folgen in Kuerze.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            textAlign: "left",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          {[
            "SEPA-XML (pain.008) fuer automatischen Bankeinzug",
            "Monatlicher Lastschrift-Run per Knopfdruck",
            "DATEV LODAS-Export fuer Steuerberater",
            "Jahresabschluss-Report mit allen Umsaetzen",
          ].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ChevronRight size={13} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: TEXT_MUTED,
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 – Debug Log
// ─────────────────────────────────────────────────────────────────────────────
function DebugLogTab() {
  const [lines, setLines]           = useState<string[]>([]);
  const [meta, setMeta]             = useState<{ total: number; showing: number; log_path: string } | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fetched, setFetched]       = useState(false);
  const scrollRef                   = React.useRef<HTMLDivElement>(null);

  // Diagnose-State
  const [diagLoading, setDiagLoading]   = useState(false);
  const [diagResult, setDiagResult]     = useState<{ success: boolean; message: string; diagnosis: Record<string, unknown> } | null>(null);
  const [diagError, setDiagError]       = useState<string | null>(null);

  const fetchLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.integrations.getDebugLog();
      setLines(res.lines ?? []);
      setMeta({ total: res.total, showing: res.showing, log_path: res.log_path });
      setFetched(true);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 60);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Log konnte nicht geladen werden.";
      setError(msg);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnose = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    setDiagError(null);
    try {
      const res = await api.integrations.testLog();
      setDiagResult(res);
    } catch (err) {
      setDiagError(err instanceof ApiError ? err.message : "Diagnose fehlgeschlagen.");
    } finally {
      setDiagLoading(false);
    }
  };

  // Zeile kolorieren je nach Level
  const colorLine = (line: string): string => {
    if (line.includes("[ERROR]")) return "#F87171";
    if (line.includes("[WARN]"))  return "#FBBF24";
    if (line.includes("[INFO]"))  return "#34D399";
    return "rgba(255,255,255,0.55)";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/* ── Diagnose-Card ─────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <CardSection label="Logging-Diagnose" />
          <button
            onClick={runDiagnose}
            disabled={diagLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "0 16px",
              height: "36px",
              background: diagLoading ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: "5px",
              color: diagLoading ? "rgba(255,255,255,0.4)" : TEXT_PRIMARY,
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: diagLoading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              flexShrink: 0,
              marginBottom: "16px",
            }}
          >
            {diagLoading
              ? <Loader2 size={13} style={{ animation: "nac-spin 0.7s linear infinite" }} />
              : <Terminal size={13} />
            }
            {diagLoading ? "Teste..." : "Diagnose starten"}
          </button>
        </div>

        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, lineHeight: 1.55, marginBottom: diagResult || diagError ? "16px" : "0" }}>
          Prueft ob PHP in{" "}
          <code style={{ fontFamily: "monospace", fontSize: "12px", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>
            api/logs/
          </code>
          {" "}schreiben kann. Zeigt exakt warum Logs fehlen (Verzeichnis, Rechte, PHP-User).
        </p>

        {diagError && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "6px" }}>
            <XCircle size={14} style={{ color: "#F87171", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY }}>{diagError}</p>
          </div>
        )}

        {diagResult && (
          <div style={{
            background: diagResult.success ? SUCCESS_BG : "rgba(248,113,113,0.07)",
            border: `1px solid ${diagResult.success ? SUCCESS_BORDER : "rgba(248,113,113,0.25)"}`,
            borderRadius: "6px",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {diagResult.success
                ? <CheckCircle2 size={15} style={{ color: SUCCESS_COLOR, flexShrink: 0 }} />
                : <XCircle size={15} style={{ color: "#F87171", flexShrink: 0 }} />
              }
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: diagResult.success ? SUCCESS_COLOR : "#F87171" }}>
                {diagResult.success ? "Logging funktioniert" : "Logging fehlgeschlagen"}
              </p>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {Object.entries(diagResult.diagnosis ?? {}).map(([key, val]) => {
                const isOk = val === true || (typeof val === "string" && val.startsWith("OK"));
                const isFail = val === false || (typeof val === "string" && val.includes("FEHLGESCHLAGEN"));
                const valColor = isFail ? "#F87171" : isOk ? SUCCESS_COLOR : "rgba(255,255,255,0.55)";
                return (
                  <div key={key} style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: TEXT_MUTED, minWidth: "200px", flexShrink: 0 }}>{key}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: valColor, wordBreak: "break-all" }}>
                      {val === null ? "null" : val === true ? "true" : val === false ? "false" : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Log-Card ───────────────────────────────────────────────────────── */}
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <CardSection label="Server Debug Log" />
          <button
            onClick={fetchLog}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "0 16px",
              height: "36px",
              background: loading ? "rgba(202,12,133,0.3)" : "rgba(202,12,133,0.15)",
              border: `1px solid rgba(202,12,133,0.35)`,
              borderRadius: "5px",
              color: loading ? "rgba(255,255,255,0.4)" : TEXT_PRIMARY,
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              flexShrink: 0,
              marginBottom: "20px",
            }}
          >
            {loading
              ? <Loader2 size={13} style={{ animation: "nac-spin 0.7s linear infinite" }} />
              : <RotateCcw size={13} />
            }
            {fetched ? "Aktualisieren" : "Log laden"}
          </button>
        </div>

        {/* Info Box */}
        {!fetched && !loading && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px 16px",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            <Terminal size={15} style={{ color: "#818CF8", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#818CF8" }}>
                Server-seitiges Log
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, marginTop: "3px", lineHeight: 1.5 }}>
                Jeder API-Request (Verbindungstest, Sync) wird serverseitig in{" "}
                <code style={{ fontFamily: "monospace", fontSize: "12px", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>
                  api/logs/magicline_debug.log
                </code>{" "}
                protokolliert. Klicke auf "Log laden" um die letzten 100 Zeilen zu sehen.
                Die Datei ist auch direkt per FTP abrufbar.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "13px 16px",
              background: "rgba(248,113,113,0.07)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            <XCircle size={15} style={{ color: "#F87171", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F87171" }}>
                Log nicht verfuegbar
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: TEXT_BODY, marginTop: "3px" }}>
                {error}
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginTop: "6px" }}>
                Hinweis: Das Log wird erst nach dem ersten Verbindungstest erstellt.
                Stelle sicher, dass das Verzeichnis{" "}
                <code style={{ fontFamily: "monospace", fontSize: "11px" }}>api/logs/</code>{" "}
                auf dem Server existiert und beschreibbar ist.
              </p>
            </div>
          </div>
        )}

        {/* Meta-Info */}
        {meta && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "10px",
            }}
          >
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: TEXT_MUTED }}>
              {meta.showing} von {meta.total} Zeilen
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
              {meta.log_path}
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(52,211,153,0.6)" }}>
              LIVE
            </span>
          </div>
        )}

        {/* Terminal */}
        {fetched && (
          <div
            ref={scrollRef}
            style={{
              background: "#070707",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "7px",
              padding: "16px",
              maxHeight: "520px",
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "11.5px",
              lineHeight: 1.65,
            }}
          >
            {lines.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.2)", margin: 0 }}>
                -- Noch keine Log-Eintraege vorhanden --
              </p>
            ) : (
              lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: colorLine(line),
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    borderBottom: i < lines.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    paddingBottom: "2px",
                    marginBottom: "2px",
                  }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
          {[
            { color: "#34D399", label: "INFO" },
            { color: "#FBBF24", label: "WARN" },
            { color: "#F87171", label: "ERROR" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, opacity: 0.8 }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: TEXT_MUTED }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ────────────────────────────────────��────────────────────────────────────────
// Tab: SMTP / E-Mail
// ─────────────────────────────────────────────────────────────────────────────
interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_encryption: "tls" | "ssl" | "none";
  from_email: string;
  from_name: string;
  reply_to_email: string;
  is_active: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  has_password?: boolean;
}

const DEFAULT_SMTP: SmtpConfig = {
  smtp_host: "host271.checkdomain.de",
  smtp_port: 465,
  smtp_user: "",
  smtp_pass: "",
  smtp_encryption: "ssl",
  from_email: "",
  from_name: "Nice Athletic Club",
  reply_to_email: "",
  is_active: false,
  last_test_at: null,
  last_test_ok: null,
};

function SmtpTab() {
  const [cfg, setCfg] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; log?: string } | null>(null);
  const [testMailTo, setTestMailTo] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const isMockMode = false;

  // Load SMTP settings (quiet = no full-screen spinner, e.g. after save)
  const loadSettings = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api.smtp.getSettings() as SmtpConfig;
      setCfg(data);
      setPasswordChanged(false);
    } catch {
      // Fallback – table may not exist yet
      setCfg(DEFAULT_SMTP);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const update = (key: keyof SmtpConfig, value: string | number | boolean) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    if (key === "smtp_pass") setPasswordChanged(true);
    setDirty(true);
  };

  // Build save payload – strip masked password if user didn't change it
  const buildPayload = (overrides: Partial<SmtpConfig> = {}): Record<string, unknown> => {
    const payload: Record<string, unknown> = { ...cfg, ...overrides };
    // If password wasn't changed by user, send null so backend keeps old password
    if (!passwordChanged) {
      payload.smtp_pass = null;
    }
    return payload;
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.smtp.save(buildPayload());
      toast.success("SMTP-Einstellungen gespeichert.");
      setDirty(false);
      await loadSettings(true); // quiet reload – no spinner flash
    } catch (err) {
      toast.error(err instanceof ApiError ? err.body : "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle is_active – auto-save immediately
  const handleToggleActive = async () => {
    const newActive = !cfg.is_active;
    setCfg((prev) => ({ ...prev, is_active: newActive }));
    setTogglingActive(true);
    try {
      await api.smtp.save(buildPayload({ is_active: newActive }));
      toast.success(newActive ? "SMTP aktiviert." : "SMTP deaktiviert.");
      setDirty(false);
      await loadSettings(true);
    } catch (err) {
      // Revert on error
      setCfg((prev) => ({ ...prev, is_active: !newActive }));
      toast.error(err instanceof ApiError ? err.body : "Fehler beim Umschalten.");
    } finally {
      setTogglingActive(false);
    }
  };

  // Connection Test
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.smtp.test(buildPayload());
      setTestResult(result);
      if (result.success) {
        toast.success("SMTP-Verbindung erfolgreich!");
        await loadSettings(true);
      } else {
        toast.error(result.message || "Verbindungstest fehlgeschlagen.");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.body : "Verbindungstest fehlgeschlagen.";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  // Send Test Mail
  const handleSendTest = async () => {
    if (!testMailTo.trim()) {
      toast.error("Bitte E-Mail-Adresse eingeben.");
      return;
    }
    setSendingTest(true);
    try {
      const result = await api.smtp.sendTest(testMailTo.trim());
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.body : "Fehler beim Versand.");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <Loader2 size={24} style={{ color: BRAND, animation: "nac-spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
    >
      {/* Status Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 18px",
          background: cfg.is_active ? SUCCESS_BG : WARN_BG,
          border: `1px solid ${cfg.is_active ? SUCCESS_BORDER : WARN_BORDER}`,
          borderRadius: "8px",
        }}
      >
        {cfg.is_active ? (
          <CheckCircle2 size={16} style={{ color: SUCCESS_COLOR, flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: cfg.is_active ? SUCCESS_COLOR : "#F59E0B" }}>
            {cfg.is_active ? "SMTP Aktiv" : "SMTP Inaktiv"}
          </span>
          {cfg.last_test_at && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: TEXT_MUTED, marginLeft: "12px" }}>
              Letzter Test: {new Date(cfg.last_test_at).toLocaleString("de-DE")}
              {cfg.last_test_ok !== null && (
                <span style={{ color: cfg.last_test_ok ? SUCCESS_COLOR : "#EF4444", marginLeft: "6px" }}>
                  {cfg.last_test_ok ? "OK" : "Fehler"}
                </span>
              )}
            </span>
          )}
        </div>
        {/* Toggle Active – auto-saves immediately */}
        <button
          onClick={handleToggleActive}
          disabled={togglingActive || !cfg.smtp_host || (!cfg.is_active && !cfg.from_email)}
          title={!cfg.smtp_host ? "SMTP-Host erforderlich" : (!cfg.is_active && !cfg.from_email) ? "Absender-E-Mail erforderlich" : ""}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: cfg.is_active ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
            border: `1px solid ${cfg.is_active ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
            borderRadius: "5px",
            color: cfg.is_active ? "#EF4444" : SUCCESS_COLOR,
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: togglingActive || !cfg.smtp_host || (!cfg.is_active && !cfg.from_email) ? "not-allowed" : "pointer",
            opacity: togglingActive ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {togglingActive ? (
            <Loader2 size={11} style={{ animation: "nac-spin 1s linear infinite" }} />
          ) : null}
          {cfg.is_active ? "Deaktivieren" : "Aktivieren"}
        </button>
      </div>

      {/* Mock-Mode Inline Notice */}
      {isMockMode && (
        <div
          style={{
            display: "flex",
            alignItems: "start",
            gap: "12px",
            padding: "14px 18px",
            background: "rgba(96,165,250,0.06)",
            border: "1px solid rgba(96,165,250,0.15)",
            borderRadius: "8px",
          }}
        >
          <Info size={16} style={{ color: "#60A5FA", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.65 }}>
            <strong style={{ color: "#60A5FA" }}>Demo-Modus:</strong>{" "}
            Die PHP-API ist in dieser Vorschau nicht erreichbar – alle Aktionen (Speichern, Testen, Testmail) werden lokal simuliert.
            Auf dem Live-Server (<code style={{ color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>nicefitness.de</code>) funktioniert SMTP vollständig, sobald
            {" "}<code style={{ color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>/api/admin/smtp.php</code> deployed und die DB-Tabelle{" "}
            <code style={{ color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>smtp_settings</code> angelegt ist.
          </div>
        </div>
      )}

      {/* Server Settings */}
      <GlassCard>
        <CardSection label="SMTP Server" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel htmlFor="smtp_host" required>SMTP Host</FieldLabel>
            <TextInput
              id="smtp_host"
              value={cfg.smtp_host}
              onChange={(v) => update("smtp_host", v)}
              placeholder="z.B. smtp.checkdomain.de"
            />
          </div>
          <div>
            <FieldLabel htmlFor="smtp_port" required>Port</FieldLabel>
            <TextInput
              id="smtp_port"
              value={String(cfg.smtp_port)}
              onChange={(v) => update("smtp_port", parseInt(v) || 587)}
              placeholder="587"
            />
          </div>
          <div>
            <FieldLabel htmlFor="smtp_encryption" required>Verschlüsselung</FieldLabel>
            <select
              id="smtp_encryption"
              value={cfg.smtp_encryption}
              onChange={(e) => update("smtp_encryption", e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: "34px",
              }}
            >
              <option value="tls" style={{ background: "#1a1a1a" }}>STARTTLS (Port 587)</option>
              <option value="ssl" style={{ background: "#1a1a1a" }}>SSL/TLS (Port 465)</option>
              <option value="none" style={{ background: "#1a1a1a" }}>Keine (Port 25)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <CardSection label="Authentifizierung" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <FieldLabel htmlFor="smtp_user" required>Benutzername</FieldLabel>
              <TextInput
                id="smtp_user"
                value={cfg.smtp_user}
                onChange={(v) => update("smtp_user", v)}
                placeholder="z.B. info@niceathleticclub.de"
              />
            </div>
            <div>
              <FieldLabel htmlFor="smtp_pass" required>Passwort</FieldLabel>
              <TextInput
                id="smtp_pass"
                value={passwordChanged ? cfg.smtp_pass : ""}
                onChange={(v) => update("smtp_pass", v)}
                placeholder={cfg.has_password ? "Gespeichert – zum Ändern neu eingeben" : "SMTP-Passwort"}
                type={showPass ? "text" : "password"}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", padding: "4px" }}
                    aria-label={showPass ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              {cfg.has_password && !passwordChanged && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: SUCCESS_COLOR, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle2 size={10} /> Passwort ist gespeichert
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Absender Settings */}
      <GlassCard>
        <CardSection label="Absender-Einstellungen" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <FieldLabel htmlFor="from_email" required>Absender E-Mail</FieldLabel>
            <TextInput
              id="from_email"
              value={cfg.from_email}
              onChange={(v) => update("from_email", v)}
              placeholder="info@niceathleticclub.de"
            />
          </div>
          <div>
            <FieldLabel htmlFor="from_name">Absender Name</FieldLabel>
            <TextInput
              id="from_name"
              value={cfg.from_name}
              onChange={(v) => update("from_name", v)}
              placeholder="Nice Athletic Club"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel htmlFor="reply_to_email">Reply-To E-Mail</FieldLabel>
            <TextInput
              id="reply_to_email"
              value={cfg.reply_to_email}
              onChange={(v) => update("reply_to_email", v)}
              placeholder="Optional – wenn leer, wird Absender-E-Mail verwendet"
            />
          </div>
        </div>

        {/* Checkdomain Hint */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "rgba(96,165,250,0.06)",
            border: "1px solid rgba(96,165,250,0.15)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "start",
            gap: "10px",
          }}
        >
          <Info size={14} style={{ color: "#60A5FA", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            <strong style={{ color: "#60A5FA" }}>Checkdomain SMTP:</strong>{" "}
            Host: <code style={{ color: TEXT_PRIMARY, background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>host271.checkdomain.de</code>
            {" "}| Port: <code style={{ color: TEXT_PRIMARY, background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>465</code> (SSL/TLS)
            {" "}| Benutzername = deine E-Mail-Adresse, Passwort = E-Mail-Passwort aus dem Checkdomain-Panel.
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      <GlassCard>
        <CardSection label="Verbindungstest" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Save */}
          <PrimaryBtn onClick={handleSave} loading={saving} disabled={!dirty}>
            <Save size={13} />
            {saving ? "Speichern..." : "Einstellungen speichern"}
          </PrimaryBtn>

          {/* Test Connection */}
          <button
            onClick={handleTest}
            disabled={testing || !cfg.smtp_host}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 20px",
              height: "44px",
              background: "transparent",
              border: `1px solid ${BORDER}`,
              borderRadius: "5px",
              color: testing ? TEXT_MUTED : TEXT_BODY,
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: testing || !cfg.smtp_host ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, color 0.15s",
              opacity: !cfg.smtp_host ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!testing && cfg.smtp_host) {
                e.currentTarget.style.borderColor = BRAND;
                e.currentTarget.style.color = TEXT_PRIMARY;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.color = TEXT_BODY;
            }}
          >
            {testing ? (
              <Loader2 size={13} style={{ animation: "nac-spin 1s linear infinite" }} />
            ) : (
              <RefreshCw size={13} />
            )}
            {testing ? "Teste..." : "Verbindung testen"}
          </button>
        </div>

        {/* Test Result */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px 16px",
                  background: testResult.success ? SUCCESS_BG : "rgba(239,68,68,0.07)",
                  border: `1px solid ${testResult.success ? SUCCESS_BORDER : "rgba(239,68,68,0.25)"}`,
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: testResult.log ? "8px" : "0" }}>
                  {testResult.success ? (
                    <CheckCircle2 size={16} style={{ color: SUCCESS_COLOR, flexShrink: 0 }} />
                  ) : (
                    <XCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: testResult.success ? SUCCESS_COLOR : "#EF4444",
                    flex: 1,
                  }}>
                    {testResult.message}
                  </span>
                  {testResult.log && (
                    <button
                      onClick={() => setShowLog(!showLog)}
                      style={{
                        background: "none",
                        border: "none",
                        color: TEXT_MUTED,
                        cursor: "pointer",
                        fontFamily: "var(--font-condensed)",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      <Terminal size={12} /> {showLog ? "Log ausblenden" : "Log anzeigen"}
                    </button>
                  )}
                </div>
                {showLog && testResult.log && (
                  <pre
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: TEXT_MUTED,
                      background: "rgba(0,0,0,0.3)",
                      padding: "12px",
                      borderRadius: "4px",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      margin: "8px 0 0",
                    }}
                  >
                    {testResult.log}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Test Mail */}
      <GlassCard>
        <CardSection label="Test-E-Mail senden" />
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: TEXT_MUTED, marginBottom: "14px", lineHeight: 1.6 }}>
          Sende eine formatierte Test-E-Mail um den vollstaendigen Versandweg zu pruefen (SMTP + Zustellung).
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <TextInput
              id="test_mail_to"
              value={testMailTo}
              onChange={setTestMailTo}
              placeholder="empfaenger@email.de"
            />
          </div>
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !testMailTo.trim() || !cfg.smtp_host}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 20px",
              height: "44px",
              background: "transparent",
              border: `1px solid ${BORDER}`,
              borderRadius: "5px",
              color: sendingTest ? TEXT_MUTED : TEXT_BODY,
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: sendingTest || !testMailTo.trim() ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, color 0.15s",
              opacity: !testMailTo.trim() || !cfg.smtp_host ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!sendingTest && testMailTo.trim()) {
                e.currentTarget.style.borderColor = BRAND;
                e.currentTarget.style.color = TEXT_PRIMARY;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.color = TEXT_BODY;
            }}
          >
            {sendingTest ? (
              <Loader2 size={13} style={{ animation: "nac-spin 1s linear infinite" }} />
            ) : (
              <Mail size={13} />
            )}
            {sendingTest ? "Sende..." : "Test senden"}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminIntegrations() {
  const [activeTab, setActiveTab] = useState<TabId>("magicline");

  return (
    <div style={{ maxWidth: "860px" }}>
      <style>{`@keyframes nac-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}
        >
          <Cable size={20} style={{ color: BRAND }} />
          <h2
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: TEXT_PRIMARY,
              lineHeight: 1,
            }}
          >
            Integrationen
          </h2>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: TEXT_MUTED,
            paddingLeft: "30px",
          }}
        >
          Verbinde NAC mit externen Systemen und steuere Datensynchronisationen.
        </p>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "magicline" ? (
          <motion.div
            key="magicline"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <MagiclineTab />
          </motion.div>
        ) : activeTab === "datev" ? (
          <motion.div
            key="datev"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <DatevSepaTab />
          </motion.div>
        ) : activeTab === "smtp" ? (
          <motion.div
            key="smtp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <SmtpTab />
          </motion.div>
        ) : (
          <motion.div
            key="debuglog"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <DebugLogTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
/**
 * AdminAntraege.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-Dashboard zur Prüfung von Pausen-Anträgen und Kündigungen.
 *
 * Features:
 *  - Zwei Tabs: „Pausen-Anträge" / „Kündigungen"
 *  - Klickbare Zeilen öffnen Detail-Modals
 *  - Pausen-Modal: Genehmigen / Ablehnen + Anhang
 *  - Kündigungs-Modal: DatePicker für effective_date + Bestätigung
 *  - "Neuen Antrag erfassen" – manueller Anlage-Dialog
 */

import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Loader2,
  Inbox,
  CheckCircle2,
  XCircle,
  Paperclip,
  Check,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Plus,
  X,
} from "lucide-react";
import { api, BASE_URL, Member } from "../../../lib/api-service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PauseRequest {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  start_date: string;
  end_date: string;
  reason: string;
  reason_details?: string;
  document_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface TerminationRequest {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  requested_date: string;
  reason: string;
  reason_details?: string;
  document_url?: string;
  status: "pending" | "processed";
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LABEL_STYLE = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

const REASON_DE: Record<string, string> = {
  krankheit:       "Krankheit",
  urlaub:          "Urlaub",
  schwangerschaft: "Schwangerschaft",
  sonstiges:       "Sonstiges",
  umzug:           "Umzug / zu weit entfernt",
  finanziell:      "Finanzielle Gründe",
  gesundheit:      "Gesundheitliche Gründe",
  zufriedenheit:   "Unzufriedenheit",
};

function pauseStatusBadge(status: PauseRequest["status"]) {
  const map = {
    pending:  { label: "Ausstehend", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
    approved: { label: "Genehmigt",  color: "#34d399", bg: "rgba(52,211,153,0.1)" },
    rejected: { label: "Abgelehnt",  color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}30`,
        padding: "2px 8px",
        borderRadius: "3px",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function terminationStatusBadge(status: TerminationRequest["status"]) {
  const map = {
    pending:   { label: "Ausstehend", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
    processed: { label: "Bearbeitet", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}30`,
        padding: "2px 8px",
        borderRadius: "3px",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// Inline action button
function ActionBtn({
  children,
  color,
  bgBase,
  borderColor,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  bgBase: string;
  borderColor: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "5px 12px",
        background: bgBase,
        border: `1px solid ${borderColor}`,
        color,
        fontFamily: "var(--font-condensed)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.18s",
        whiteSpace: "nowrap",
        borderRadius: "3px",
        minHeight: "32px",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(1.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "none";
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "var(--font-condensed)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}
    >
      {children}
    </label>
  );
}

// Empty state
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Inbox size={36} style={{ color: "rgba(255,255,255,0.08)", marginBottom: "12px" }} />
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>{message}</p>
    </div>
  );
}

// ── Detail Info Row ──────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <Icon size={13} style={{ color: "rgba(255,255,255,0.25)", marginTop: "2px", flexShrink: 0 }} />
      <div>
        <p style={{ ...LABEL_STYLE, marginBottom: "2px" }}>{label}</p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Pause Detail Modal ────────────────────────────────────────────────────────
function PauseDetailModal({
  pause,
  onClose,
  onApprove,
  onReject,
  busy,
}: {
  pause: PauseRequest | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  if (!pause) return null;
  const docUrl = pause.document_url ? BASE_URL.replace("/api", "") + pause.document_url : null;

  return (
    <Dialog open={!!pause} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "520px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} style={{ color: "#f59e0b" }} />
            <DialogTitle
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              Pause-Antrag
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {pause.first_name} {pause.last_name} ({pause.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1" style={{ paddingTop: "4px" }}>
          <DetailRow icon={User} label="Mitglied" value={`${pause.first_name} ${pause.last_name}`} />
          <DetailRow
            icon={Calendar}
            label="Zeitraum"
            value={`${new Date(pause.start_date).toLocaleDateString("de-DE")} – ${new Date(pause.end_date).toLocaleDateString("de-DE")}`}
          />
          <DetailRow icon={FileText} label="Grund" value={REASON_DE[pause.reason] ?? pause.reason} />
          {pause.reason_details && (
            <DetailRow icon={AlertTriangle} label="Details / Freitext" value={pause.reason_details} />
          )}
          <DetailRow
            icon={Calendar}
            label="Eingereicht am"
            value={new Date(pause.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          />

          <div className="flex items-center gap-2 pt-2">
            <span style={LABEL_STYLE}>Status:</span>
            {pauseStatusBadge(pause.status)}
          </div>
        </div>

        <DialogFooter style={{ gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "8px" }}>
          {docUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(docUrl, "_blank")}
              style={{ gap: "6px" }}
            >
              <Paperclip size={14} /> Anhang ansehen
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {pause.status === "pending" && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onReject(pause.id)}
                style={{ borderColor: "rgba(248,113,113,0.3)", color: "#f87171", gap: "6px" }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Ablehnen
              </Button>
              <Button
                disabled={busy}
                onClick={() => onApprove(pause.id)}
                style={{ background: "rgba(52,211,153,0.85)", color: "white", gap: "6px" }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Genehmigen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Termination Detail Modal ──────────────────────────────────────────────────
function TerminationDetailModal({
  term,
  onClose,
  onProcess,
  busy,
}: {
  term: TerminationRequest | null;
  onClose: () => void;
  onProcess: (id: string, effectiveDate: string) => void;
  busy: boolean;
}) {
  const [effectiveDate, setEffectiveDate] = useState("");

  useEffect(() => {
    if (term) setEffectiveDate(term.requested_date);
  }, [term]);

  if (!term) return null;
  const docUrl = term.document_url ? BASE_URL.replace("/api", "") + term.document_url : null;

  return (
    <Dialog open={!!term} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "520px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} style={{ color: "#f87171" }} />
            <DialogTitle
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              Kündigung prüfen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {term.first_name} {term.last_name} ({term.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1" style={{ paddingTop: "4px" }}>
          <DetailRow icon={User} label="Mitglied" value={`${term.first_name} ${term.last_name}`} />
          <DetailRow
            icon={Calendar}
            label="Gewünschtes Datum"
            value={new Date(term.requested_date).toLocaleDateString("de-DE")}
          />
          <DetailRow icon={FileText} label="Grund" value={REASON_DE[term.reason] ?? term.reason} />
          {term.reason_details && (
            <DetailRow icon={AlertTriangle} label="Details / Freitext" value={term.reason_details} />
          )}
          <DetailRow
            icon={Calendar}
            label="Eingereicht am"
            value={new Date(term.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          />

          <div className="flex items-center gap-2 pt-2">
            <span style={LABEL_STYLE}>Status:</span>
            {terminationStatusBadge(term.status)}
          </div>

          {term.status === "pending" && (
            <div style={{ marginTop: "16px", padding: "14px", background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: "4px" }}>
              <FieldLabel>Bestätigtes Vertragsende (überschreibbar)</FieldLabel>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{ colorScheme: "dark", maxWidth: "220px" }}
              />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
                Du kannst das Wunschdatum des Kunden auf den korrekten Laufzeit-Endtermin anpassen.
              </p>
            </div>
          )}
        </div>

        <DialogFooter style={{ gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "8px" }}>
          {docUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(docUrl, "_blank")}
              style={{ gap: "6px" }}
            >
              <Paperclip size={14} /> Anhang ansehen
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {term.status === "pending" && (
            <Button
              disabled={busy || !effectiveDate}
              onClick={() => onProcess(term.id, effectiveDate)}
              style={{ background: "rgba(52,211,153,0.85)", color: "white", gap: "6px" }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Kündigung bestätigen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Manual Create Dialog ──────────────────────────────────────────────────────
function CreateManualDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<"pause" | "termination">("pause");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [reason, setReason] = useState("sonstiges");
  const [reasonDetails, setReasonDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    setMemberId("");
    setType("pause");
    setStartDate("");
    setEndDate("");
    setRequestedDate("");
    setReason("sonstiges");
    setReasonDetails("");
    setLoadingMembers(true);
    api.admin.members
      .list()
      .then((data) => {
        const active = data.filter((m) => m.status === "active");
        setMembers(active);
        if (active.length > 0) setMemberId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    setSaving(true);
    try {
      const payload: any = { member_id: memberId, type, reason, reason_details: reasonDetails.trim() || undefined };
      if (type === "pause") {
        payload.start_date = startDate;
        payload.end_date = endDate;
      } else {
        payload.requested_date = requestedDate;
      }
      await api.admin.requests.createManual(payload);
      toast.success("Antrag erfolgreich angelegt");
      onSuccess();
      onClose();
    } catch {
      /* api-service shows toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "520px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Plus size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              Neuen Antrag erfassen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            Manuell einen Pausen- oder Kündigungsantrag für ein Mitglied anlegen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" style={{ paddingTop: "4px" }}>
          {/* Member select */}
          <div>
            <FieldLabel>Mitglied auswählen *</FieldLabel>
            {loadingMembers ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Lade Mitglieder…</span>
              </div>
            ) : (
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                style={{
                  width: "100%",
                  appearance: "none",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  padding: "10px 12px",
                  outline: "none",
                }}
              >
                <option value="" disabled>
                  Mitglied wählen…
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} — {m.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Type */}
          <div>
            <FieldLabel>Antragstyp *</FieldLabel>
            <div className="flex gap-2">
              {(["pause", "termination"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: type === t ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                    border: type === t ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    color: type === t ? "white" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderRadius: "3px",
                  }}
                >
                  {t === "pause" ? "Pause" : "Kündigung"}
                </button>
              ))}
            </div>
          </div>

          {/* Date fields */}
          {type === "pause" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <FieldLabel>Start-Datum *</FieldLabel>
                <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <FieldLabel>End-Datum *</FieldLabel>
                <Input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ colorScheme: "dark" }} />
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>Gewünschtes Kündigungsdatum *</FieldLabel>
              <Input type="date" required value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} style={{ colorScheme: "dark", maxWidth: "220px" }} />
            </div>
          )}

          {/* Reason */}
          <div>
            <FieldLabel>Grund *</FieldLabel>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                appearance: "none",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                padding: "10px 12px",
                outline: "none",
              }}
            >
              {Object.entries(REASON_DE).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div>
            <FieldLabel>Bemerkungen (optional)</FieldLabel>
            <textarea
              rows={3}
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Zusätzliche Details zum Antrag…"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                padding: "10px 12px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <DialogFooter style={{ gap: "8px" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !memberId}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Speichern…
                </>
              ) : (
                <>
                  <Check size={14} /> Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Pause Row ─────────────────────────────────────────────────────────────────
function PauseRow({
  pause,
  onClick,
}: {
  pause: PauseRequest;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "4px",
        transition: "all 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(202,12,133,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 flex items-center justify-center shrink-0 text-white"
        style={{
          background: "rgba(202,12,133,0.15)",
          border: "1px solid rgba(202,12,133,0.25)",
          borderRadius: "4px",
          fontFamily: "var(--font-display)",
          fontSize: "13px",
        }}
      >
        {pause.first_name?.[0]}{pause.last_name?.[0]}
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-white" style={{ fontSize: "13px", fontWeight: 500 }}>
            {pause.first_name} {pause.last_name}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            {pause.email}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            <Calendar size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
            {new Date(pause.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            {" – "}
            {new Date(pause.end_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            <FileText size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
            {REASON_DE[pause.reason] ?? pause.reason}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        {pauseStatusBadge(pause.status)}
      </div>
    </motion.div>
  );
}

// ── Termination Row ───────────────────────────────────────────────────────────
function TerminationRow({
  term,
  onClick,
}: {
  term: TerminationRequest;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 cursor-pointer"
      style={{
        background: "rgba(248,113,113,0.02)",
        border: "1px solid rgba(248,113,113,0.1)",
        borderRadius: "4px",
        transition: "all 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(248,113,113,0.05)";
        e.currentTarget.style.borderColor = "rgba(248,113,113,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(248,113,113,0.02)";
        e.currentTarget.style.borderColor = "rgba(248,113,113,0.1)";
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 flex items-center justify-center shrink-0 text-white"
        style={{
          background: "rgba(248,113,113,0.12)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "4px",
          fontFamily: "var(--font-display)",
          fontSize: "13px",
        }}
      >
        {term.first_name?.[0]}{term.last_name?.[0]}
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-white" style={{ fontSize: "13px", fontWeight: 500 }}>
            {term.first_name} {term.last_name}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            {term.email}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            <Calendar size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
            Zum: {new Date(term.requested_date).toLocaleDateString("de-DE")}
          </span>
          <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            <FileText size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
            {REASON_DE[term.reason] ?? term.reason}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        {terminationStatusBadge(term.status)}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminAntraege() {
  const location = useLocation();
  const [activeTab, setActiveTab]         = useState<"pauses" | "terminations">("pauses");
  const [pauses, setPauses]               = useState<PauseRequest[]>([]);
  const [terminations, setTerminations]   = useState<TerminationRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busyId, setBusyId]               = useState<string | null>(null);

  // Modal states
  const [selectedPause, setSelectedPause]         = useState<PauseRequest | null>(null);
  const [selectedTerm, setSelectedTerm]           = useState<TerminationRequest | null>(null);
  const [createOpen, setCreateOpen]               = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.admin.requests.getAll();
      setPauses(data.pauses as PauseRequest[]);
      setTerminations(data.terminations as TerminationRequest[]);
    } catch {
      setPauses([
        { id: "p1", member_id: "m1", first_name: "Jonas", last_name: "Weber", email: "jonas@demo.de", start_date: "2025-03-01", end_date: "2025-03-14", reason: "krankheit", document_url: undefined, status: "pending", created_at: "2025-02-28" },
        { id: "p2", member_id: "m2", first_name: "Anna",  last_name: "Müller", email: "anna@demo.de",  start_date: "2025-04-10", end_date: "2025-04-20", reason: "urlaub",    document_url: undefined, status: "approved", created_at: "2025-04-01" },
      ]);
      setTerminations([
        { id: "t1", member_id: "m3", first_name: "Klaus", last_name: "Bauer", email: "klaus@demo.de", requested_date: "2025-03-31", reason: "umzug", document_url: undefined, status: "pending", created_at: "2025-02-20" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handlePauseUpdate = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      await api.admin.requests.updatePause(id, status);
      toast.success(
        status === "approved" ? "Pause genehmigt" : "Pause abgelehnt",
        { description: `Antrag ${id} wurde ${status === "approved" ? "genehmigt" : "abgelehnt"}.` }
      );
      setPauses((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      setSelectedPause(null);
    } catch {
      // api-service shows toast
    } finally {
      setBusyId(null);
    }
  };

  const handleTerminationProcess = async (id: string, effectiveDate: string) => {
    setBusyId(id);
    try {
      await api.admin.requests.updateTermination(id, { status: "processed", effective_date: effectiveDate });
      toast.success("Kündigung bestätigt", { description: `Vertragsende festgelegt auf ${new Date(effectiveDate).toLocaleDateString("de-DE")}.` });
      setTerminations((prev) => prev.map((t) => (t.id === id ? { ...t, status: "processed" } : t)));
      setSelectedTerm(null);
    } catch {
      // api-service shows toast
    } finally {
      setBusyId(null);
    }
  };

  // ── KPI counters ─────────────────────────────────────────────────────────────
  const pendingPauses  = pauses.filter((p) => p.status === "pending").length;
  const pendingTerms   = terminations.filter((t) => t.status === "pending").length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">

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
            ANTRÄGE<span style={{ color: "var(--brand)" }}> &amp; DOKUMENTE</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Pausen-Anträge, Atteste und Kündigungen prüfen &amp; bearbeiten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
            style={{
              background: "var(--brand)",
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              minHeight: "44px",
              boxShadow: "0 0 16px rgba(202,12,133,0.25)",
            }}
          >
            <Plus size={14} />
            Neuen Antrag erfassen
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "8px 14px", borderRadius: "4px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "44px" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pausen gesamt",    value: pauses.length,      accent: "#60a5fa" },
          { label: "Pausen ausstehend", value: pendingPauses,     accent: "#f59e0b" },
          { label: "Kündigungen",       value: terminations.length, accent: "#f87171" },
          { label: "Kündgn. offen",    value: pendingTerms,       accent: "#f59e0b" },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            style={{
              background:    "rgba(255,255,255,0.03)",
              border:        "1px solid rgba(255,255,255,0.07)",
              borderTop:     `2px solid ${accent}`,
              padding:       "16px 18px",
            }}
          >
            <p style={LABEL_STYLE}>{label}</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.02em", color: loading ? "rgba(255,255,255,0.1)" : accent, lineHeight: 1, marginTop: "6px" }}>
              {loading ? "–" : value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        {(["pauses", "terminations"] as const).map((tab) => {
          const active = activeTab === tab;
          const label  = tab === "pauses" ? "Pausen-Anträge" : "Kündigungen";
          const count  = tab === "pauses" ? pauses.length : terminations.length;
          const pending = tab === "pauses" ? pendingPauses : pendingTerms;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex items-center gap-2 px-5 transition-all duration-200 cursor-pointer"
              style={{
                background: "none",
                border: "none",
                minHeight: "44px",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: active ? "var(--brand)" : "rgba(255,255,255,0.4)",
                borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {label}
              {count > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: active ? "var(--brand)" : "rgba(255,255,255,0.3)",
                    background: active ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${active ? "rgba(202,12,133,0.25)" : "rgba(255,255,255,0.08)"}`,
                    padding: "1px 6px",
                    borderRadius: "3px",
                  }}
                >
                  {count}
                  {pending > 0 && (
                    <span style={{ marginLeft: "4px", color: "#f59e0b" }}>({pending} offen)</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === "pauses" ? (
            <motion.div
              key="pauses"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-2"
            >
              {pauses.length === 0 ? (
                <EmptyState message="Keine Pausen-Anträge vorhanden." />
              ) : (
                pauses.map((p) => (
                  <PauseRow
                    key={p.id}
                    pause={p}
                    onClick={() => setSelectedPause(p)}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="terminations"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-2"
            >
              {terminations.length === 0 ? (
                <EmptyState message="Keine Kündigungsanträge vorhanden." />
              ) : (
                terminations.map((t) => (
                  <TerminationRow
                    key={t.id}
                    term={t}
                    onClick={() => setSelectedTerm(t)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Modals ── */}
      <PauseDetailModal
        pause={selectedPause}
        onClose={() => setSelectedPause(null)}
        onApprove={(id) => handlePauseUpdate(id, "approved")}
        onReject={(id) => handlePauseUpdate(id, "rejected")}
        busy={busyId === selectedPause?.id}
      />
      <TerminationDetailModal
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
        onProcess={handleTerminationProcess}
        busy={busyId === selectedTerm?.id}
      />
      <CreateManualDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}

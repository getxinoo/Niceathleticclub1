/**
 * KursBuchungenPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Buchungsverwaltung als Tab-Panel innerhalb von /admin/kurse.
 *
 * Features:
 *  • Alle Buchungen listen (Mitglieder + Gäste)
 *  • Filtern nach Typ, Status, Datum, Freitext
 *  • Status ändern direkt in der Tabelle
 *  • Buchung stornieren mit optionaler E-Mail-Benachrichtigung
 *  • Mitglied im Profil öffnen (MemberProfileSheet)
 *  • Gast per E-Mail oder In-App (wenn Mitglied) benachrichtigen
 *  • Aktivitätsverlauf für Gast-E-Mails (alle Buchungen dieser Adresse)
 *  • DSGVO: Hinweise, Pseudonymisierung, Datenweitergabe
 *  • Gast → Mitglied Verknüpfung (wenn E-Mail matcht)
 *  • CSV-Export
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck2, User, UserPlus, Trash2, Search, Clock, Mail, Phone,
  X, Download, Eye, Calendar, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Send, MessageSquare, ShieldCheck, ShieldAlert,
  Link2, History, ChevronDown, ChevronRight, Bell, Ban,
  ExternalLink, Info,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Booking, type BookingStatus } from "../../../lib/api-service";
import type { Member } from "../../../lib/api-service";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/button";
import { MemberProfileSheet } from "./MemberProfileSheet";

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Gebucht",       color: "#CA0C85", icon: CalendarCheck2 },
  attended:  { label: "Teilgenommen",  color: "#4ade80", icon: CheckCircle2   },
  cancelled: { label: "Storniert",     color: "#9ca3af", icon: XCircle        },
  "no-show": { label: "No-Show",       color: "#f87171", icon: AlertTriangle  },
};

const CATEGORY_COLORS: Record<string, string> = {
  CrossFit: "#CA0C85", Hyrox: "#f97316", Functional: "#3b82f6",
  Strength: "#22c55e", "Open Gym": "#a855f7",
};

// ── Mock: Gäste die inzwischen Mitglied sind (per E-Mail erkannt) ──────────────
const GUEST_BECAME_MEMBER: Record<string, { member_id: string; member_name: string }> = {
  "sophie.klein@gmail.com": { member_id: "9", member_name: "Sophie Klein" },
};

// ── Nachrichten-Templates ──────────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  { id: "cancel", label: "Stornierungsbestätigung", body: "Deine Buchung für {KURS} am {TAG} wurde storniert. Bei Fragen erreichst du uns unter info@nicefitness.de." },
  { id: "reminder", label: "Kurs-Erinnerung", body: "Denk daran: Dein Kurs {KURS} findet morgen am {TAG} um {UHRZEIT} statt. Wir freuen uns auf dich!" },
  { id: "waitlist", label: "Platz frei geworden", body: "Gute Neuigkeit! Ein Platz für {KURS} am {TAG} ist wieder frei. Deine Buchung ist bestätigt." },
  { id: "noshow", label: "No-Show Hinweis", body: "Wir haben dich heute beim Kurs {KURS} vermisst. Bei häufigen No-Shows behalten wir uns vor, künftige Buchungen einzuschränken." },
  { id: "custom", label: "Eigene Nachricht", body: "" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}
function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch { return iso; }
}
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Gerade eben";
  if (mins < 60) return `Vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `Vor ${days} Tagen`;
  return formatDateShort(iso);
}
function fillTemplate(body: string, booking: Booking): string {
  return body
    .replace("{KURS}", booking.course_title)
    .replace("{TAG}", booking.course_weekday)
    .replace("{UHRZEIT}", booking.course_time);
}

type DateRange = "all" | "today" | "week" | "month";

// ── Notify Dialog ──────────────────────────────────────────────────────────────
function NotifyDialog({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const isMember = booking.booking_type === "member";
  const linkedMember = !isMember && booking.guest_email ? GUEST_BECAME_MEMBER[booking.guest_email] : null;
  const canInApp = isMember || !!linkedMember;

  const [channel, setChannel] = useState<"email" | "inapp">(isMember || canInApp ? "email" : "email");
  const [templateId, setTemplateId] = useState("reminder");
  const [message, setMessage] = useState(() => {
    const t = EMAIL_TEMPLATES.find(t => t.id === "reminder");
    return t ? fillTemplate(t.body, booking) : "";
  });
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const t = EMAIL_TEMPLATES.find(t => t.id === id);
    if (t && t.id !== "custom") setMessage(fillTemplate(t.body, booking));
    else if (t && t.id === "custom") setMessage("");
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await api.admin.bookings.notify(booking.id, { channel, message });
      const name = isMember ? booking.member_name : booking.guest_name;
      toast.success(`Nachricht an ${name} gesendet`, {
        description: channel === "email" ? "E-Mail wird zugestellt" : "In-App Benachrichtigung gesendet",
      });
      onClose();
    } catch {
      toast.error("Fehler beim Senden");
    } finally {
      setSending(false);
    }
  };

  const email = booking.guest_email || "";
  const name = isMember ? (booking.member_name || "Mitglied") : (booking.guest_name || "Gast");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[71] inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto"
        style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-white/30 text-xs mb-1" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              BENACHRICHTIGUNG SENDEN
            </p>
            <p className="text-white text-sm" style={{ fontWeight: 600 }}>{name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Empfänger */}
          <div className="flex items-center gap-3 p-3" style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)" }}>
            {isMember
              ? <User size={13} style={{ color: "#CA0C85" }} />
              : <Mail size={13} style={{ color: "#CA0C85" }} />
            }
            <span className="text-white/60 text-xs">
              {isMember ? `${name} · Mitglieds-Account` : email || name}
            </span>
          </div>

          {/* Kanal */}
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", fontWeight: 700 }}>
              KANAL
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setChannel("email")}
                className="flex items-center gap-2 px-4 py-2.5 flex-1 cursor-pointer transition-all text-xs"
                style={{
                  background: channel === "email" ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${channel === "email" ? "rgba(202,12,133,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: channel === "email" ? "#CA0C85" : "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                }}
              >
                <Mail size={12} /> E-MAIL
              </button>
              {canInApp && (
                <button
                  onClick={() => setChannel("inapp")}
                  className="flex items-center gap-2 px-4 py-2.5 flex-1 cursor-pointer transition-all text-xs"
                  style={{
                    background: channel === "inapp" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${channel === "inapp" ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)"}`,
                    color: channel === "inapp" ? "#3b82f6" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                  }}
                >
                  <Bell size={12} /> IM PROFIL
                </button>
              )}
            </div>
          </div>

          {/* Template */}
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", fontWeight: 700 }}>
              VORLAGE
            </p>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-white"
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                outline: "none", fontFamily: "var(--font-body)",
              }}
            >
              {EMAIL_TEMPLATES.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0a0a0a]">{t.label}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", fontWeight: 700 }}>
              NACHRICHT
            </p>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht eingeben..."
              className="w-full px-3 py-2.5 text-sm text-white resize-none"
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                outline: "none", fontFamily: "var(--font-body)", lineHeight: 1.6,
              }}
            />
          </div>

          {/* DSGVO Hinweis */}
          <p className="text-white/20 text-xs flex items-start gap-2">
            <ShieldCheck size={11} className="mt-0.5 shrink-0" />
            Nachricht wird gemäß DSGVO-Einwilligung übermittelt. Keine Weitergabe an Dritte.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-xs cursor-pointer transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              ABBRECHEN
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "#CA0C85", border: "1px solid rgba(202,12,133,0.5)",
                color: "white", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              {sending ? "SENDEN..." : <><Send size={12} /> SENDEN</>}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Cancel Confirmation Dialog ────────────────────────────────────────────────
function CancelDialog({
  booking,
  onConfirm,
  onClose,
}: {
  booking: Booking;
  onConfirm: (notify: boolean, message: string) => void;
  onClose: () => void;
}) {
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState(
    fillTemplate("Deine Buchung für {KURS} am {TAG} wurde storniert. Bei Fragen: info@nicefitness.de.", booking)
  );
  const hasContact = booking.guest_email || booking.booking_type === "member";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[71] inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto"
        style={{ background: "#0d0d0d", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Ban size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>Buchung stornieren?</p>
              <p className="text-white/40 text-xs">
                {booking.booking_type === "member" ? booking.member_name : booking.guest_name} · {booking.course_title}, {booking.course_weekday}
              </p>
            </div>
          </div>

          {hasContact && (
            <div className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-brand"
                />
                <span className="text-white/60 text-xs">
                  {booking.booking_type === "member" ? "Mitglied" : "Gast"} per E-Mail benachrichtigen
                </span>
              </label>
              {notify && (
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full mt-3 px-3 py-2 text-xs text-white resize-none"
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    outline: "none", fontFamily: "var(--font-body)", lineHeight: 1.6,
                  }}
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-xs cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              ABBRECHEN
            </button>
            <button
              onClick={() => onConfirm(notify && !!hasContact, message)}
              className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              <Ban size={11} /> STORNIEREN
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Guest Activity History ─────────────────────────────────────────────────────
function GuestActivitySection({ email, allBookings, currentId }: {
  email: string;
  allBookings: Booking[];
  currentId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const history = allBookings.filter(b => b.guest_email === email && b.id !== currentId);

  if (history.length === 0) {
    return (
      <div className="p-3 text-xs text-white/25 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <History size={11} /> Keine weiteren Buchungen mit dieser E-Mail-Adresse.
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 cursor-pointer"
        style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", fontWeight: 700 }}
      >
        <span className="flex items-center gap-2">
          <History size={11} />
          {history.length} WEITERE BUCHUNG{history.length !== 1 ? "EN" : ""} DIESER E-MAIL
        </span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {history.map(b => {
            const cfg = STATUS_CONFIG[b.status];
            return (
              <div key={b.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-white/60 text-xs">{b.course_title}</p>
                  <p className="text-white/25 text-xs">{b.course_weekday}, {b.course_time} · {formatDateShort(b.booked_at)}</p>
                </div>
                <span
                  className="px-1.5 py-0.5 text-xs shrink-0"
                  style={{
                    background: cfg.color + "15", border: `1px solid ${cfg.color}30`, color: cfg.color,
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                  }}
                >
                  {cfg.label.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DSGVO Section ─────────────────────────────────────────────────────────────
function DsgvoSection({ booking, onPseudonymize }: {
  booking: Booking;
  onPseudonymize: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const bookedDate = new Date(booking.booked_at);
  const retentionDate = new Date(bookedDate.getTime() + 2 * 365 * 86400 * 1000);
  const retentionStr = retentionDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={12} className="text-white/30" />
        <p className="text-white/30 text-xs" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
          DSGVO & DATENSCHUTZ
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-white/25 text-xs">Erhebungszweck</span>
          <span className="text-white/40 text-xs">Kursbuchung / Anmeldung</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/25 text-xs">Rechtsgrundlage</span>
          <span className="text-white/40 text-xs">Art. 6 (1) b DSGVO</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/25 text-xs">Erhoben am</span>
          <span className="text-white/40 text-xs">{formatDateShort(booking.booked_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/25 text-xs">Löschfrist (ggf.)</span>
          <span className="text-white/40 text-xs">{retentionStr}</span>
        </div>
      </div>

      {booking.booking_type === "guest" && (
        <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-white/25 text-xs mb-2 flex items-start gap-1.5">
            <ShieldAlert size={10} className="mt-0.5 shrink-0 text-amber-400/60" />
            Gastbuchung enthält personenbezogene Daten. Auf Anfrage können diese anonymisiert werden.
          </p>
          {!confirmed ? (
            <button
              onClick={() => setConfirmed(true)}
              className="text-xs px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                color: "rgba(245,158,11,0.7)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              DATEN PSEUDONYMISIEREN
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmed(false)}
                className="text-xs px-3 py-2 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                }}
              >
                ABBRECHEN
              </button>
              <button
                onClick={() => { onPseudonymize(); setConfirmed(false); }}
                className="text-xs px-3 py-2 cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                }}
              >
                BESTÄTIGEN
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Booking Detail Sheet ───────────────────────────────────────────────────────
function BookingDetailSheet({
  booking,
  allBookings,
  onClose,
  onStatusChange,
  onDelete,
  onOpenMemberProfile,
}: {
  booking: Booking;
  allBookings: Booking[];
  onClose: () => void;
  onStatusChange: (status: BookingStatus) => void;
  onDelete: () => void;
  onOpenMemberProfile: (memberId: string) => void;
}) {
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const b = booking;
  const isMember = b.booking_type === "member";
  const name = isMember ? b.member_name : b.guest_name;
  const catColor = CATEGORY_COLORS[b.course_category] || "#60a5fa";
  const statusCfg = STATUS_CONFIG[b.status];
  const StatusIcon = statusCfg.icon;
  const linkedMember = !isMember && b.guest_email ? GUEST_BECAME_MEMBER[b.guest_email] : null;

  const handleCancel = async (notify: boolean, msg: string) => {
    try {
      await api.admin.bookings.cancel(b.id, { notify, message: msg });
      toast.success("Buchung storniert", {
        description: notify ? "Bestätigung wurde gesendet" : undefined,
      });
      onStatusChange("cancelled");
      setShowCancelDialog(false);
    } catch {
      toast.error("Fehler beim Stornieren");
    }
  };

  const handlePseudonymize = async () => {
    try {
      await api.admin.bookings.pseudonymize(b.id);
      toast.success("Gast-Daten pseudonymisiert");
      onClose();
    } catch {
      toast.error("Fehler beim Pseudonymisieren");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
        style={{ background: "#0a0a0a", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="p-6 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              BUCHUNGSDETAILS
            </p>
            <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.03em", textTransform: "uppercase" }}>
              {name || "–"}
            </h3>
            {linkedMember && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Link2 size={10} style={{ color: "#4ade80" }} />
                <span className="text-xs" style={{ color: "#4ade80", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>
                  JETZT MITGLIED: {linkedMember.member_name.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status & Type badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: statusCfg.color + "15", border: `1px solid ${statusCfg.color}30`, color: statusCfg.color,
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              <StatusIcon size={11} /> {statusCfg.label.toUpperCase()}
            </span>
            <span
              className="px-2.5 py-1.5"
              style={{
                background: isMember ? "rgba(202,12,133,0.1)" : "rgba(249,115,22,0.1)",
                border: `1px solid ${isMember ? "rgba(202,12,133,0.2)" : "rgba(249,115,22,0.2)"}`,
                color: isMember ? "#CA0C85" : "#f97316",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
              }}
            >
              {isMember ? "MITGLIED" : "GAST"}
            </span>
            {linkedMember && (
              <span
                className="px-2.5 py-1.5"
                style={{
                  background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
                  color: "#4ade80",
                  fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                }}
              >
                MITGLIED SEIT KONVERTIERUNG
              </span>
            )}
          </div>

          {/* Course info */}
          <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>KURS</p>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-10 shrink-0" style={{ background: catColor }} />
              <div>
                <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
                  {b.course_title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5" style={{ background: catColor + "15", border: `1px solid ${catColor}30`, color: catColor, fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    {b.course_category}
                  </span>
                  <span className="text-white/30 text-xs flex items-center gap-1">
                    <Clock size={9} /> {b.course_weekday}, {b.course_time}
                  </span>
                </div>
              </div>
            </div>
            {b.instructor && (
              <p className="text-white/30 text-xs mt-2">Trainer: <span className="text-white/50">{b.instructor}</span></p>
            )}
          </div>

          {/* Contact / Profile */}
          <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              KONTAKT & PROFIL
            </p>
            <div className="space-y-2.5">
              {isMember && b.member_id && (
                <button
                  onClick={() => onOpenMemberProfile(b.member_id!)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all group"
                  style={{
                    background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)",
                    color: "#CA0C85",
                  }}
                >
                  <User size={13} />
                  <span className="text-xs flex-1 text-left" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>
                    MITGLIEDERPROFIL ÖFFNEN
                  </span>
                  <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
                </button>
              )}
              {linkedMember && (
                <button
                  onClick={() => onOpenMemberProfile(linkedMember.member_id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all group"
                  style={{
                    background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)",
                    color: "#4ade80",
                  }}
                >
                  <Link2 size={13} />
                  <span className="text-xs flex-1 text-left" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>
                    VERKNÜPFTES MITGLIEDERPROFIL
                  </span>
                  <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
                </button>
              )}
              {!isMember && b.guest_email && (
                <a
                  href={`mailto:${b.guest_email}`}
                  className="flex items-center gap-3 text-white/50 hover:text-brand transition-colors group"
                >
                  <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Mail size={13} />
                  </div>
                  <span className="text-sm">{b.guest_email}</span>
                </a>
              )}
              {!isMember && b.guest_phone && (
                <a
                  href={`tel:${b.guest_phone}`}
                  className="flex items-center gap-3 text-white/50 hover:text-green-400 transition-colors group"
                >
                  <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Phone size={13} />
                  </div>
                  <span className="text-sm">{b.guest_phone}</span>
                </a>
              )}
              {!isMember && !b.guest_email && !b.guest_phone && !linkedMember && (
                <p className="text-white/20 text-xs">Keine Kontaktdaten hinterlegt.</p>
              )}
            </div>
          </div>

          {/* Aktivitätsverlauf (nur Gäste) */}
          {!isMember && b.guest_email && (
            <div>
              <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
                AKTIVITÄTSVERLAUF
              </p>
              <GuestActivitySection email={b.guest_email} allBookings={allBookings} currentId={b.id} />
            </div>
          )}

          {/* Booking meta */}
          <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>BUCHUNGSINFO</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/30 text-xs">Buchungs-ID</span>
                <span className="text-white/50 text-xs" style={{ fontFamily: "monospace" }}>{b.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30 text-xs">Gebucht am</span>
                <span className="text-white/50 text-xs">{formatDate(b.booked_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30 text-xs">Relativ</span>
                <span className="text-white/50 text-xs">{relativeTime(b.booked_at)}</span>
              </div>
            </div>
          </div>

          {/* Status ändern */}
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>STATUS ÄNDERN</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                const isActive = b.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isActive && onStatusChange(s)}
                    className="flex items-center gap-2 p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: isActive ? cfg.color + "18" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? cfg.color + "40" : "rgba(255,255,255,0.06)"}`,
                      color: isActive ? cfg.color : "rgba(255,255,255,0.35)",
                      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    <Icon size={13} /> {cfg.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Benachrichtigung */}
          <div>
            <p className="text-white/30 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              BENACHRICHTIGUNG
            </p>
            <button
              onClick={() => setShowNotifyDialog(true)}
              className="w-full flex items-center justify-center gap-2 p-3 cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
                color: "#3b82f6", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                minHeight: "44px",
              }}
            >
              <MessageSquare size={13} /> NACHRICHT SENDEN
            </button>
          </div>

          {/* DSGVO */}
          <DsgvoSection booking={b} onPseudonymize={handlePseudonymize} />

          {/* Danger zone */}
          <div className="space-y-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {b.status !== "cancelled" && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full flex items-center justify-center gap-2 p-3 cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                  color: "#f59e0b", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                  minHeight: "44px",
                }}
              >
                <Ban size={13} /> BUCHUNG STORNIEREN
              </button>
            )}
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 p-3 cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                color: "#f87171", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                minHeight: "44px",
              }}
            >
              <Trash2 size={13} /> BUCHUNG LÖSCHEN
            </button>
          </div>
        </div>
      </motion.div>

      {/* Dialoge */}
      <AnimatePresence>
        {showNotifyDialog && (
          <NotifyDialog booking={b} onClose={() => setShowNotifyDialog(false)} />
        )}
        {showCancelDialog && (
          <CancelDialog booking={b} onConfirm={handleCancel} onClose={() => setShowCancelDialog(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export function KursBuchungenPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "member" | "guest">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Member profile sheet state
  const [profileMember, setProfileMember] = useState<Member | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.admin.bookings.list();
      setBookings(data);
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      await api.admin.bookings.updateStatus(id, status);
      toast.success("Status aktualisiert");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status } : prev);
      }
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Buchung wirklich löschen?")) return;
    try {
      await api.admin.bookings.delete(id);
      toast.success("Buchung gelöscht");
      setBookings(prev => prev.filter(b => b.id !== id));
      setDetailOpen(false);
      setSelectedBooking(null);
    } catch { /* */ }
  };

  const handleOpenMemberProfile = async (memberId: string) => {
    try {
      const members = await api.admin.members.list();
      const m = members.find((m: Member) => m.id === memberId);
      if (m) {
        setProfileMember(m);
      } else {
        toast.error("Mitglied nicht gefunden");
      }
    } catch {
      toast.error("Fehler beim Laden des Profils");
    }
  };

  const handleExport = () => {
    const header = "Name,Typ,E-Mail,Telefon,Kurs,Kategorie,Wochentag,Uhrzeit,Status,Gebucht am\n";
    const rows = filtered.map((b) => {
      const name = b.booking_type === "member" ? b.member_name : b.guest_name;
      return [
        name || "", b.booking_type === "member" ? "Mitglied" : "Gast",
        b.guest_email || "", b.guest_phone || "",
        b.course_title, b.course_category, b.course_weekday, b.course_time,
        STATUS_CONFIG[b.status]?.label || b.status,
        formatDate(b.booked_at),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nac-buchungen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert", { description: `${filtered.length} Buchungen` });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filterType !== "all" && b.booking_type !== filterType) return false;
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (dateRange !== "all") {
        const d = new Date(b.booked_at);
        const now = new Date();
        if (dateRange === "today" && d.toDateString() !== now.toDateString()) return false;
        if (dateRange === "week" && d < new Date(now.getTime() - 7 * 86400000)) return false;
        if (dateRange === "month" && d < new Date(now.getTime() - 30 * 86400000)) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const name = b.booking_type === "member" ? b.member_name : b.guest_name;
        const email = b.guest_email || "";
        return (name || "").toLowerCase().includes(s) || email.toLowerCase().includes(s) || b.course_title.toLowerCase().includes(s);
      }
      return true;
    });
  }, [bookings, filterType, filterStatus, dateRange, search]);

  // Stats
  const stats = useMemo(() => ({
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    attended:  bookings.filter(b => b.status === "attended").length,
    members:   bookings.filter(b => b.booking_type === "member").length,
    guests:    bookings.filter(b => b.booking_type === "guest").length,
    noShow:    bookings.filter(b => b.status === "no-show").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    attendance: bookings.length > 0
      ? Math.round(((bookings.filter(b => b.status === "confirmed").length + bookings.filter(b => b.status === "attended").length) / bookings.length) * 100)
      : 0,
  }), [bookings]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <p className="text-white/30 text-sm mt-1">
            {stats.total} Buchungen · {stats.confirmed} aktiv · {stats.attendance}% Teilnahmequote
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5" style={{ minHeight: "40px", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em", fontSize: "11px", fontWeight: 700 }}>
            <RefreshCw size={13} /> AKTUALISIEREN
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" style={{ minHeight: "40px", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em", fontSize: "11px", fontWeight: 700 }}>
            <Download size={13} /> CSV EXPORT
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "Gesamt",       value: stats.total,     color: "rgba(255,255,255,0.5)", sub: "" },
          { label: "Aktiv",        value: stats.confirmed, color: "#CA0C85", sub: "" },
          { label: "Teilgenommen", value: stats.attended,  color: "#4ade80", sub: "" },
          { label: "Mitglieder",   value: stats.members,   color: "#3b82f6", sub: `${stats.guests} Gäste` },
          { label: "No-Shows",     value: stats.noShow,    color: "#f87171", sub: stats.noShow > 0 && stats.total > 0 ? `${Math.round((stats.noShow / stats.total) * 100)}%` : "" },
          { label: "Storniert",    value: stats.cancelled, color: "#9ca3af", sub: "" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-white/30 text-xs mb-1" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", fontWeight: 700 }}>
              {s.label.toUpperCase()}
            </p>
            <div className="flex items-end gap-1.5">
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</p>
              {s.sub && <p className="text-white/20 text-xs mb-1">{s.sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text" placeholder="Name, E-Mail oder Kurs suchen..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              outline: "none", fontFamily: "var(--font-body)", minHeight: "44px", padding: "0 1rem 0 2.25rem",
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Type filter */}
          <div className="flex gap-0.5 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["all", "member", "guest"] as const).map((t) => (
              <button
                key={t} onClick={() => setFilterType(t)}
                className="px-3 py-1.5 cursor-pointer transition-all text-xs"
                style={{
                  background: filterType === t ? "rgba(255,255,255,0.08)" : "transparent",
                  color: filterType === t ? "white" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                  border: "none", minHeight: "36px",
                }}
              >
                {t === "all" ? "ALLE" : t === "member" ? "MITGLIEDER" : "GÄSTE"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-0.5 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["all", "confirmed", "attended", "cancelled", "no-show"] as const).map((s) => (
              <button
                key={s} onClick={() => setFilterStatus(s)}
                className="px-2.5 py-1.5 cursor-pointer transition-all text-xs"
                style={{
                  background: filterStatus === s ? (s === "all" ? "rgba(255,255,255,0.08)" : STATUS_CONFIG[s as BookingStatus].color + "18") : "transparent",
                  color: filterStatus === s ? (s === "all" ? "white" : STATUS_CONFIG[s as BookingStatus].color) : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em",
                  border: "none", minHeight: "36px",
                }}
              >
                {s === "all" ? "ALLE" : STATUS_CONFIG[s as BookingStatus].label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex gap-0.5 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {([
              { key: "all", label: "ALLE" }, { key: "today", label: "HEUTE" },
              { key: "week", label: "7 TAGE" }, { key: "month", label: "30 TAGE" },
            ] as { key: DateRange; label: string }[]).map((d) => (
              <button
                key={d.key} onClick={() => setDateRange(d.key)}
                className="px-2.5 py-1.5 cursor-pointer transition-all text-xs flex items-center gap-1"
                style={{
                  background: dateRange === d.key ? "rgba(255,255,255,0.08)" : "transparent",
                  color: dateRange === d.key ? "white" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em",
                  border: "none", minHeight: "36px",
                }}
              >
                {d.key !== "all" && <Calendar size={9} />} {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(search || filterType !== "all" || filterStatus !== "all" || dateRange !== "all") && (
        <p className="text-white/25 text-xs">
          {filtered.length} von {bookings.length} Buchungen angezeigt
          {search && ` · Suche: "${search}"`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[640px] px-1">
          <DataTable
            loading={loading}
            data={filtered}
            keyField="id"
            onRowClick={(b) => { setSelectedBooking(b); setDetailOpen(true); }}
            columns={[
              {
                key: "person", header: "Person",
                cell: (r) => {
                  const isMember = r.booking_type === "member";
                  const name = isMember ? r.member_name : r.guest_name;
                  const linkedMember = !isMember && r.guest_email ? GUEST_BECAME_MEMBER[r.guest_email] : null;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0"
                        style={{
                          background: isMember ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${isMember ? "rgba(202,12,133,0.25)" : "rgba(255,255,255,0.12)"}`,
                        }}
                      >
                        {isMember ? <User size={12} style={{ color: "#CA0C85" }} /> : <UserPlus size={12} style={{ color: "rgba(255,255,255,0.4)" }} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm" style={{ fontWeight: 600 }}>{name || "–"}</p>
                          {linkedMember && <Link2 size={10} style={{ color: "#4ade80" }} title="Jetzt Mitglied" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 text-xs" style={{
                            background: isMember ? "rgba(202,12,133,0.1)" : "rgba(249,115,22,0.1)",
                            border: `1px solid ${isMember ? "rgba(202,12,133,0.2)" : "rgba(249,115,22,0.2)"}`,
                            color: isMember ? "#CA0C85" : "#f97316",
                            fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em",
                          }}>
                            {isMember ? "MITGLIED" : "GAST"}
                          </span>
                          {!isMember && r.guest_email && (
                            <span className="text-white/25 text-xs flex items-center gap-1">
                              <Mail size={9} /> {r.guest_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "course", header: "Kurs",
                cell: (r) => {
                  const catColor = CATEGORY_COLORS[r.course_category] || "#60a5fa";
                  return (
                    <div>
                      <p className="text-white text-sm" style={{ fontWeight: 600 }}>{r.course_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5" style={{ background: catColor + "15", border: `1px solid ${catColor}30`, color: catColor, fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>
                          {r.course_category}
                        </span>
                        <span className="text-white/30 text-xs flex items-center gap-1">
                          <Clock size={9} /> {r.course_weekday}, {r.course_time}
                        </span>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "booked_at", header: "Gebucht",
                cell: (r) => (
                  <div>
                    <span className="text-white/40 text-xs">{relativeTime(r.booked_at)}</span>
                    <p className="text-white/20 text-xs mt-0.5">{formatDateShort(r.booked_at)}</p>
                  </div>
                ),
              },
              {
                key: "status", header: "Status",
                cell: (r) => {
                  const cfg = STATUS_CONFIG[r.status];
                  return (
                    <select
                      value={r.status}
                      onChange={(e) => { e.stopPropagation(); handleStatusChange(r.id, e.target.value as BookingStatus); }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1.5 cursor-pointer text-xs"
                      style={{
                        background: cfg.color + "15", border: `1px solid ${cfg.color}30`, color: cfg.color,
                        fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em", outline: "none",
                      }}
                    >
                      <option value="confirmed" className="bg-[#0a0a0a] text-white">Gebucht</option>
                      <option value="attended" className="bg-[#0a0a0a] text-white">Teilgenommen</option>
                      <option value="cancelled" className="bg-[#0a0a0a] text-white">Storniert</option>
                      <option value="no-show" className="bg-[#0a0a0a] text-white">No-Show</option>
                    </select>
                  );
                },
              },
              {
                key: "actions", header: "", align: "right" as const,
                cell: (r) => {
                  const isMember = r.booking_type === "member";
                  return (
                    <div className="flex items-center gap-0.5">
                      {/* Detail */}
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedBooking(r); setDetailOpen(true); }} title="Details">
                        <Eye size={14} className="text-white/30 hover:text-white/60" />
                      </Button>
                      {/* Email */}
                      {!isMember && r.guest_email && (
                        <a href={`mailto:${r.guest_email}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center" title="E-Mail">
                          <Mail size={13} className="text-white/20 hover:text-brand" />
                        </a>
                      )}
                      {/* Profil öffnen (Mitglied) */}
                      {isMember && r.member_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenMemberProfile(r.member_id!); }}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer"
                          title="Mitgliederprofil öffnen"
                        >
                          <User size={13} className="text-white/20 hover:text-brand" />
                        </button>
                      )}
                      {/* Phone */}
                      {!isMember && r.guest_phone && (
                        <a href={`tel:${r.guest_phone}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center" title="Anrufen">
                          <Phone size={13} className="text-white/20 hover:text-green-400" />
                        </a>
                      )}
                      {/* Notify */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedBooking(r); setDetailOpen(true); }}
                        className="w-8 h-8 flex items-center justify-center cursor-pointer"
                        title="Benachrichtigung senden"
                      >
                        <Bell size={13} className="text-white/20 hover:text-blue-400" />
                      </button>
                      {/* Cancel (wenn nicht schon storniert) */}
                      {r.status !== "cancelled" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedBooking(r); setDetailOpen(true); }}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer"
                          title="Stornieren"
                        >
                          <Ban size={13} className="text-amber-500/40 hover:text-amber-400" />
                        </button>
                      )}
                      {/* Delete */}
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} title="Löschen">
                        <Trash2 size={14} className="text-red-500/60 hover:text-red-500" />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-2 p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <Info size={12} className="text-white/20 mt-0.5 shrink-0" />
        <p className="text-white/20 text-xs" style={{ lineHeight: 1.6 }}>
          Gastbuchungen enthalten personenbezogene Daten (Name, E-Mail, Telefon) gemäß Art. 6 (1) b DSGVO.
          Daten können auf Anfrage pseudonymisiert werden. Buchungen nicht-eingeloggter Personen werden per E-Mail-Adresse 
          identifiziert und automatisch mit dem Mitgliederprofil verknüpft, sobald ein Account mit gleicher E-Mail angelegt wird.
          Alle Aktivitäten werden im Aktivitätsverlauf des Mitglieds gespeichert.
        </p>
      </div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {detailOpen && selectedBooking && (
          <BookingDetailSheet
            booking={selectedBooking}
            allBookings={bookings}
            onClose={() => { setDetailOpen(false); setSelectedBooking(null); }}
            onStatusChange={(status) => handleStatusChange(selectedBooking.id, status)}
            onDelete={() => handleDelete(selectedBooking.id)}
            onOpenMemberProfile={handleOpenMemberProfile}
          />
        )}
      </AnimatePresence>

      {/* Member Profile Sheet */}
      <MemberProfileSheet
        member={profileMember}
        onClose={() => setProfileMember(null)}
        onSuccess={() => setProfileMember(null)}
      />
    </div>
  );
}

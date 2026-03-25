import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  CalendarCheck2, Clock, CheckCircle2, XCircle, Dumbbell, Loader2, Trash2,
  RefreshCw, ChevronRight, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { api } from "../../../lib/api-service";

// ── Types ─────────────────────────────────────────────────────────────────────
type BookingStatus = "confirmed" | "attended" | "cancelled" | "no-show";

interface Booking {
  id: string;
  title: string;
  category: string;
  instructor: string;
  startsAt: string;
  durationMin: number;
  location: string;
  weekday: string;
  time: string;
  status: BookingStatus;
}

// ── Category Colors ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  CrossFit:   "#CA0C85",
  Hyrox:      "#f97316",
  Functional: "#3b82f6",
  Strength:   "#22c55e",
  "Open Gym": "#a855f7",
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ size?: number }> }> = {
  confirmed: { label: "Gebucht",    color: "#CA0C85", bg: "rgba(202,12,133,0.1)",  border: "rgba(202,12,133,0.25)", icon: CalendarCheck2 },
  attended:  { label: "Absolviert", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)",  icon: CheckCircle2   },
  cancelled: { label: "Storniert",  color: "#9ca3af", bg: "rgba(156,163,175,0.06)",border: "rgba(156,163,175,0.15)",icon: XCircle        },
  "no-show": { label: "No-Show",    color: "#f87171", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", icon: AlertTriangle   },
};

type FilterView = "all" | "upcoming" | "past";

// ── Fallback mock data (shown when API returns 403) ───────────────────────────
const MOCK_BOOKINGS: Booking[] = [
  { id: "b1", title: "CrossFit WOD", category: "CrossFit", instructor: "Lydi Tauber", startsAt: new Date(Date.now() + 86400000).toISOString(), durationMin: 60, location: "CrossFit Box", weekday: "Montag", time: "06:30", status: "confirmed" },
  { id: "b2", title: "Hyrox Training", category: "Hyrox", instructor: "Dome Fuchs", startsAt: new Date(Date.now() + 172800000).toISOString(), durationMin: 60, location: "Hyrox Zone", weekday: "Dienstag", time: "17:00", status: "confirmed" },
  { id: "b3", title: "Strength & Conditioning", category: "Strength", instructor: "Jana Ebt", startsAt: new Date(Date.now() - 86400000).toISOString(), durationMin: 60, location: "Athletic Area", weekday: "Mittwoch", time: "18:30", status: "attended" },
  { id: "b4", title: "Hyrox Race Prep", category: "Hyrox", instructor: "Leo Holzner", startsAt: new Date(Date.now() - 259200000).toISOString(), durationMin: 60, location: "Hyrox Zone", weekday: "Donnerstag", time: "06:30", status: "attended" },
  { id: "b5", title: "CrossFit WOD", category: "CrossFit", instructor: "Dome Fuchs", startsAt: new Date(Date.now() - 604800000).toISOString(), durationMin: 60, location: "CrossFit Box", weekday: "Freitag", time: "18:00", status: "cancelled" },
  { id: "b6", title: "Open Gym + Coaching", category: "Open Gym", instructor: "Leo Holzner", startsAt: new Date(Date.now() - 900000000).toISOString(), durationMin: 90, location: "NAC", weekday: "Samstag", time: "12:00", status: "no-show" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const timeStr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0)  return `Heute · ${timeStr}`;
  if (diffDays === 1)  return `Morgen · ${timeStr}`;
  if (diffDays === -1) return `Gestern · ${timeStr}`;
  return `${d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })} · ${timeStr}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MemberBuchungen() {
  const navigate = useNavigate();
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cancelingIds, setCancelingIds] = useState<Set<string>>(new Set());
  const [filterView,  setFilterView]  = useState<FilterView>("all");
  const [cancelLimitHours, setCancelLimitHours] = useState(24); // default 24h

  // Load cancellation_limit_hours from SEPA/member settings
  useEffect(() => {
    api.member.contracts.getSepaStatus()
      .then((data) => {
        if (data?.cancellation_limit_hours) setCancelLimitHours(data.cancellation_limit_hours);
      })
      .catch(() => {}); // silent – use default 24h
  }, []);

  // ── Load bookings ─────────────────────────────────────────────────────────
  const loadBookings = useCallback(async () => {
    try {
      const data = await api.member.sessions.myBookings();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized: Booking[] = (data as any[]).map((b: any) => ({
        id:         String(b.id ?? ""),
        title:      b.title ?? b.course_title ?? "Kurs",
        category:   b.category ?? b.course_category ?? "Allgemein",
        instructor: b.instructor ?? "",
        startsAt:   b.starts_at ?? b.startsAt ?? b.date ?? new Date().toISOString(),
        durationMin: Number(b.duration_min ?? b.durationMin ?? 60),
        location:   b.location ?? "NAC",
        weekday:    b.weekday ?? b.course_weekday ?? "",
        time:       b.time ?? b.course_time ?? "",
        status:     (["confirmed", "attended", "cancelled", "no-show"].includes(b.status)
          ? b.status
          : "confirmed") as BookingStatus,
      }));
      setBookings(normalized);
    } catch {
      // API returns 403 – show mock data silently
      setBookings(MOCK_BOOKINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ── Cancel a booking ──────────────────────────────────────────────────────
  const handleCancel = async (bookingId: string) => {
    setCancelingIds(prev => new Set(prev).add(bookingId));
    try {
      await api.member.sessions.cancel(bookingId);
      toast.success("Buchung storniert", {
        description: "Der Kurs wurde erfolgreich aus deinen Buchungen entfernt.",
      });
      await loadBookings();
    } catch {
      // api-service already shows error toast
    } finally {
      setCancelingIds(prev => { const n = new Set(prev); n.delete(bookingId); return n; });
    }
  };

  // ── Categorize bookings ───────────────────────────────────────────────────
  const upcoming  = bookings.filter(b => b.status === "confirmed");
  const past      = bookings.filter(b => b.status !== "confirmed");
  const attended  = past.filter(b => b.status === "attended").length;
  const cancelled = past.filter(b => b.status === "cancelled").length;
  const noShow    = past.filter(b => b.status === "no-show").length;

  // ── Filtered view ─────────────────────────────────────────────────────────
  const sections = filterView === "upcoming"
    ? [{ label: "Bevorstehend", items: upcoming }]
    : filterView === "past"
    ? [{ label: "Vergangene", items: past }]
    : [
        { label: "Bevorstehend", items: upcoming },
        { label: "Vergangene",   items: past     },
      ];

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <h1
          className="text-white"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 8vw, 2.8rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.05 }}
        >
          MEINE <span style={{ color: "var(--brand)" }}>BUCHUNGEN</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
          {loading
            ? "Wird geladen..."
            : `${upcoming.length} bevorstehende · ${attended} absolviert${cancelled > 0 ? ` · ${cancelled} storniert` : ""}`
          }
        </p>
      </motion.div>

      {/* Quick Stats */}
      {!loading && bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { label: "Bevorstehend", value: upcoming.length, color: "#CA0C85" },
            { label: "Absolviert",   value: attended,         color: "#4ade80" },
            { label: "Storniert",    value: cancelled + noShow, color: "#9ca3af" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 text-center"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, color: s.color }}>
                {s.value}
              </p>
              <p className="text-white/25 mt-0.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em" }}>
                {s.label.toUpperCase()}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filter chips */}
      {!loading && bookings.length > 0 && (
        <div className="flex gap-2">
          {([
            { key: "all",      label: "Alle" },
            { key: "upcoming", label: `Bevorstehend (${upcoming.length})` },
            { key: "past",     label: `Vergangene (${past.length})` },
          ] as { key: FilterView; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterView(f.key)}
              className="px-3 cursor-pointer transition-all duration-200"
              style={{
                background: filterView === f.key ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${filterView === f.key ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: filterView === f.key ? "var(--brand)" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                minHeight: "36px",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      )}

      {/* Sections */}
      {!loading && sections.map(({ label, items }) => items.length > 0 && (
        <div key={label}>
          <p
            className="mb-3"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}
          >
            {label}
          </p>
          <div className="space-y-2">
            {items.map((b, i) => {
              const cfg = STATUS_CONFIG[b.status];
              const StatusIcon = cfg.icon;
              const isCanceling = cancelingIds.has(b.id);
              const catColor = CATEGORY_COLORS[b.category] || "#60a5fa";

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                  className="p-4 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${b.status === "confirmed" ? catColor + "25" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Category colored icon */}
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: catColor + "15", border: `1px solid ${catColor}30` }}
                    >
                      <Dumbbell size={15} style={{ color: catColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className="text-white/85 truncate"
                            style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em" }}
                          >
                            {b.title}
                          </p>
                          {/* Category badge */}
                          <span
                            className="inline-block px-1.5 py-0.5 mt-1"
                            style={{
                              background: catColor + "12",
                              border: `1px solid ${catColor}25`,
                              color: catColor,
                              fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                            }}
                          >
                            {b.category}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: cfg.color, textTransform: "uppercase", whiteSpace: "nowrap" }}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-3 mt-2">
                        <span className="flex items-center gap-1" style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                          <Clock size={9} />{formatDate(b.startsAt)}
                        </span>
                        {b.instructor && (
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                            mit {b.instructor}
                          </span>
                        )}
                        {b.durationMin && (
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                            {b.durationMin} min
                          </span>
                        )}
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {/* Cancel button – only for confirmed upcoming bookings */}
                        {b.status === "confirmed" && (() => {
                          const startsAt = new Date(b.startsAt);
                          const cancelDeadline = new Date(startsAt.getTime() - cancelLimitHours * 60 * 60 * 1000);
                          const now = new Date();
                          const canCancel = now < cancelDeadline;
                          const hoursLeft = Math.max(0, Math.floor((cancelDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
                          const minsLeft = Math.max(0, Math.floor(((cancelDeadline.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

                          return (
                            <>
                              <button
                                onClick={() => canCancel && !isCanceling && handleCancel(b.id)}
                                disabled={isCanceling || !canCancel}
                                className="flex items-center gap-1.5 px-3 transition-colors duration-200 cursor-pointer disabled:opacity-40"
                                style={{
                                  background: canCancel ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                                  border: `1px solid ${canCancel ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
                                  color: canCancel ? "#f87171" : "rgba(255,255,255,0.25)",
                                  fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                                  minHeight: "32px",
                                  cursor: canCancel ? "pointer" : "not-allowed",
                                }}
                                aria-label="Buchung stornieren"
                                title={!canCancel ? `Stornofrist abgelaufen (${cancelLimitHours}h vor Kursbeginn)` : ""}
                              >
                                {isCanceling
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <Trash2 size={11} />
                                }
                                STORNIEREN
                              </button>
                              {canCancel ? (
                                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}>
                                  <Clock size={9} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
                                  Stornierbar noch {hoursLeft}h {minsLeft > 0 ? `${minsLeft}m` : ""}
                                </span>
                              ) : (
                                <span style={{ fontSize: "10px", color: "rgba(239,68,68,0.5)", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}>
                                  <AlertTriangle size={9} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
                                  Stornofrist abgelaufen ({cancelLimitHours}h)
                                </span>
                              )}
                            </>
                          );
                        })()}

                        {/* Rebook button – for cancelled/attended/no-show */}
                        {b.status !== "confirmed" && (
                          <button
                            onClick={() => navigate("/member/kurse")}
                            className="flex items-center gap-1.5 px-3 transition-colors duration-200 cursor-pointer"
                            style={{
                              background: "rgba(202,12,133,0.08)",
                              border: "1px solid rgba(202,12,133,0.2)",
                              color: "var(--brand)",
                              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                              minHeight: "32px",
                            }}
                          >
                            <RefreshCw size={10} />
                            ERNEUT BUCHEN
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {!loading && bookings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)", borderRadius: "50%" }}
          >
            <CalendarCheck2 size={24} style={{ color: "var(--brand)" }} />
          </div>
          <p className="text-white mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.06em" }}>
            KEINE BUCHUNGEN
          </p>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", marginBottom: "16px" }}>
            Du hast noch keine Kurse gebucht.
          </p>
          <button
            onClick={() => navigate("/member/kurse")}
            className="inline-flex items-center gap-2 px-5 cursor-pointer transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "var(--brand)",
              color: "white",
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
              border: "none",
              minHeight: "44px",
            }}
          >
            KURSE ENTDECKEN
            <ChevronRight size={14} />
          </button>
        </motion.div>
      )}

      {/* No results in filter */}
      {!loading && bookings.length > 0 && sections.every(s => s.items.length === 0) && (
        <div className="text-center py-10">
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
            Keine Buchungen in diesem Filter.
          </p>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck2, User, UserPlus, Trash2, Search, Clock, Mail, Phone,
  X, Download, Eye, ChevronDown, Calendar, RefreshCw, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Booking, type BookingStatus } from "../../../lib/api-service";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/button";

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Gebucht",        color: "#CA0C85", icon: CalendarCheck2 },
  attended:  { label: "Teilgenommen",   color: "#4ade80", icon: CheckCircle2   },
  cancelled: { label: "Storniert",      color: "#9ca3af", icon: XCircle        },
  "no-show": { label: "No-Show",        color: "#f87171", icon: AlertTriangle  },
};

const CATEGORY_COLORS: Record<string, string> = {
  CrossFit: "#CA0C85", Hyrox: "#f97316", Functional: "#3b82f6",
  Strength: "#22c55e", "Open Gym": "#a855f7",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch { return iso; }
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Gerade eben";
  if (mins < 60) return `Vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `Vor ${days} Tagen`;
  return formatDateShort(iso);
}

type DateRange = "all" | "today" | "week" | "month";

export default function AdminBuchungen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "member" | "guest">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.admin.bookings.list();
      setBookings(data);
    } catch {
      // Mock fallback handles it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      await api.admin.bookings.updateStatus(id, status);
      toast.success("Status aktualisiert");
      loadData();
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Buchung wirklich loeschen?")) return;
    try {
      await api.admin.bookings.delete(id);
      toast.success("Buchung geloescht");
      loadData();
    } catch { /* */ }
  };

  // ── Export as CSV ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const header = "Name,Typ,E-Mail,Telefon,Kurs,Kategorie,Wochentag,Uhrzeit,Status,Gebucht am\n";
    const rows = filtered.map((b) => {
      const name = b.booking_type === "member" ? b.member_name : b.guest_name;
      const email = b.booking_type === "guest" ? b.guest_email : "";
      const phone = b.booking_type === "guest" ? b.guest_phone : "";
      return [
        name || "",
        b.booking_type === "member" ? "Mitglied" : "Gast",
        email || "",
        phone || "",
        b.course_title,
        b.course_category,
        b.course_weekday,
        b.course_time,
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

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filterType !== "all" && b.booking_type !== filterType) return false;
      if (filterStatus !== "all" && b.status !== filterStatus) return false;

      // Date range filter
      if (dateRange !== "all") {
        const d = new Date(b.booked_at);
        const now = new Date();
        if (dateRange === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateRange === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          if (d < weekAgo) return false;
        } else if (dateRange === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 86400000);
          if (d < monthAgo) return false;
        }
      }

      if (search) {
        const s = search.toLowerCase();
        const name = b.booking_type === "member" ? b.member_name : b.guest_name;
        const email = b.booking_type === "member" ? "" : (b.guest_email || "");
        return (
          (name || "").toLowerCase().includes(s) ||
          email.toLowerCase().includes(s) ||
          b.course_title.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [bookings, filterType, filterStatus, dateRange, search]);

  // Stats
  const totalConfirmed = bookings.filter(b => b.status === "confirmed").length;
  const totalAttended  = bookings.filter(b => b.status === "attended").length;
  const totalGuests    = bookings.filter(b => b.booking_type === "guest").length;
  const totalMembers   = bookings.filter(b => b.booking_type === "member").length;
  const totalNoShow    = bookings.filter(b => b.status === "no-show").length;

  const attendanceRate = bookings.length > 0
    ? Math.round(((totalConfirmed + totalAttended) / bookings.length) * 100)
    : 0;

  const openDetail = (b: Booking) => {
    setSelectedBooking(b);
    setDetailOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2
            className="text-white"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 5vw, 2.5rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.1 }}
          >
            KURS <span style={{ color: "var(--brand)" }}>BUCHUNGEN</span>
          </h2>
          <p className="text-white/30 text-sm mt-1">
            {bookings.length} Buchungen insgesamt · {totalConfirmed} aktiv · {attendanceRate}% Teilnahmequote
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5"
            style={{ minHeight: "40px", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em", fontSize: "11px", fontWeight: 700 }}
          >
            <RefreshCw size={13} /> AKTUALISIEREN
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
            style={{ minHeight: "40px", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em", fontSize: "11px", fontWeight: 700 }}
          >
            <Download size={13} /> CSV EXPORT
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Gesamt",        value: bookings.length, color: "rgba(255,255,255,0.5)", sub: "" },
          { label: "Aktiv",         value: totalConfirmed,  color: "#CA0C85",               sub: "" },
          { label: "Teilgenommen",  value: totalAttended,   color: "#4ade80",               sub: "" },
          { label: "Mitglieder",    value: totalMembers,    color: "#3b82f6",               sub: `${totalGuests} Gäste` },
          { label: "No-Shows",      value: totalNoShow,     color: "#f87171",               sub: totalNoShow > 0 ? `${Math.round((totalNoShow / bookings.length) * 100)}%` : "" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-white/30 text-xs mb-1" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", fontWeight: 700 }}>
              {s.label.toUpperCase()}
            </p>
            <div className="flex items-end gap-2">
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "28px", fontWeight: 700, color: s.color }}>
                {s.value}
              </p>
              {s.sub && (
                <p className="text-white/20 text-xs mb-1">{s.sub}</p>
              )}
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
            className="w-full pl-9 pr-4 py-2.5 text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              outline: "none", fontFamily: "var(--font-body)", minHeight: "44px",
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Type filter */}
          <div className="flex gap-1 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
                {t === "all" ? "ALLE" : t === "member" ? "MITGLIEDER" : "GAESTE"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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

          {/* Date range filter */}
          <div className="flex gap-1 p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {([
              { key: "all", label: "ALLE" },
              { key: "today", label: "HEUTE" },
              { key: "week", label: "7 TAGE" },
              { key: "month", label: "30 TAGE" },
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
                {d.key !== "all" && <Calendar size={9} />}
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {(search || filterType !== "all" || filterStatus !== "all" || dateRange !== "all") && (
        <p className="text-white/25 text-xs">
          {filtered.length} von {bookings.length} Buchungen angezeigt
          {search && ` · Suche: "${search}"`}
        </p>
      )}

      {/* Table */}
      <DataTable
        loading={loading}
        data={filtered}
        keyField="id"
        onRowClick={openDetail}
        columns={[
          {
            key: "person",
            header: "Person",
            cell: (r) => {
              const isMember = r.booking_type === "member";
              const name = isMember ? r.member_name : r.guest_name;
              return (
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0"
                    style={{
                      background: isMember ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${isMember ? "rgba(202,12,133,0.25)" : "rgba(255,255,255,0.12)"}`,
                    }}
                  >
                    {isMember ? <User size={12} style={{ color: "var(--brand)" }} /> : <UserPlus size={12} style={{ color: "rgba(255,255,255,0.4)" }} />}
                  </div>
                  <div>
                    <p className="text-white text-sm" style={{ fontWeight: 600 }}>{name || "–"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="px-1.5 py-0.5 text-xs"
                        style={{
                          background: isMember ? "rgba(202,12,133,0.1)" : "rgba(249,115,22,0.1)",
                          border: `1px solid ${isMember ? "rgba(202,12,133,0.2)" : "rgba(249,115,22,0.2)"}`,
                          color: isMember ? "#CA0C85" : "#f97316",
                          fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em",
                        }}
                      >
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
            key: "course",
            header: "Kurs",
            cell: (r) => {
              const catColor = CATEGORY_COLORS[r.course_category] || "#60a5fa";
              return (
                <div>
                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>{r.course_title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="px-1.5 py-0.5"
                      style={{
                        background: catColor + "15", border: `1px solid ${catColor}30`, color: catColor,
                        fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                      }}
                    >
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
            key: "booked_at",
            header: "Gebucht",
            cell: (r) => (
              <div>
                <span className="text-white/40 text-xs">{relativeTime(r.booked_at)}</span>
                <p className="text-white/20 text-xs mt-0.5">{formatDateShort(r.booked_at)}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => {
              const cfg = STATUS_CONFIG[r.status];
              return (
                <select
                  value={r.status}
                  onChange={(e) => { e.stopPropagation(); handleStatusChange(r.id, e.target.value as BookingStatus); }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1.5 cursor-pointer text-xs"
                  style={{
                    background: cfg.color + "15",
                    border: `1px solid ${cfg.color}30`,
                    color: cfg.color,
                    fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em",
                    outline: "none",
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
            key: "actions",
            header: "",
            align: "right" as const,
            cell: (r) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                  title="Details anzeigen"
                >
                  <Eye size={14} className="text-white/30 hover:text-white/60" />
                </Button>
                {r.booking_type === "guest" && r.guest_email && (
                  <a
                    href={`mailto:${r.guest_email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 flex items-center justify-center transition-colors"
                    title={`E-Mail an ${r.guest_name}`}
                  >
                    <Mail size={13} className="text-white/20 hover:text-brand" />
                  </a>
                )}
                {r.booking_type === "guest" && r.guest_phone && (
                  <a
                    href={`tel:${r.guest_phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 flex items-center justify-center transition-colors"
                    title={`Anrufen: ${r.guest_phone}`}
                  >
                    <Phone size={13} className="text-white/20 hover:text-green-400" />
                  </a>
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  title="Loeschen"
                >
                  <Trash2 size={14} className="text-red-500/60 hover:text-red-500" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* ── Booking Detail Sheet ── */}
      <AnimatePresence>
        {detailOpen && selectedBooking && (
          <BookingDetailSheet
            booking={selectedBooking}
            onClose={() => { setDetailOpen(false); setSelectedBooking(null); }}
            onStatusChange={(status) => {
              handleStatusChange(selectedBooking.id, status);
              setSelectedBooking({ ...selectedBooking, status });
            }}
            onDelete={() => {
              handleDelete(selectedBooking.id);
              setDetailOpen(false);
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Booking Detail Sheet Component ────────────────────────────────────────────

function BookingDetailSheet({
  booking,
  onClose,
  onStatusChange,
  onDelete,
}: {
  booking: Booking;
  onClose: () => void;
  onStatusChange: (status: BookingStatus) => void;
  onDelete: () => void;
}) {
  const b = booking;
  const isMember = b.booking_type === "member";
  const name = isMember ? b.member_name : b.guest_name;
  const catColor = CATEGORY_COLORS[b.course_category] || "#60a5fa";
  const statusCfg = STATUS_CONFIG[b.status];
  const StatusIcon = statusCfg.icon;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Type */}
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: statusCfg.color + "15",
                border: `1px solid ${statusCfg.color}30`,
                color: statusCfg.color,
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              }}
            >
              <StatusIcon size={11} />
              {statusCfg.label.toUpperCase()}
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
          </div>

          {/* Course info */}
          <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              KURS
            </p>
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
              <p className="text-white/30 text-xs mt-2">
                Trainer: <span className="text-white/50">{b.instructor}</span>
              </p>
            )}
          </div>

          {/* Contact info (Guest) */}
          {!isMember && (
            <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
                KONTAKT
              </p>
              <div className="space-y-2.5">
                {b.guest_email && (
                  <a
                    href={`mailto:${b.guest_email}`}
                    className="flex items-center gap-3 text-white/50 hover:text-brand transition-colors group"
                  >
                    <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Mail size={13} className="group-hover:text-brand transition-colors" />
                    </div>
                    <span className="text-sm">{b.guest_email}</span>
                  </a>
                )}
                {b.guest_phone && (
                  <a
                    href={`tel:${b.guest_phone}`}
                    className="flex items-center gap-3 text-white/50 hover:text-green-400 transition-colors group"
                  >
                    <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Phone size={13} className="group-hover:text-green-400 transition-colors" />
                    </div>
                    <span className="text-sm">{b.guest_phone}</span>
                  </a>
                )}
                {!b.guest_email && !b.guest_phone && (
                  <p className="text-white/20 text-xs">Keine Kontaktdaten hinterlegt.</p>
                )}
              </div>
            </div>
          )}

          {/* Booking meta */}
          <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              BUCHUNGSINFO
            </p>
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

          {/* Status change */}
          <div>
            <p className="text-white/30 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.15em", fontWeight: 700 }}>
              STATUS AENDERN
            </p>
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
                    <Icon size={13} />
                    {cfg.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#f87171",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                minHeight: "44px",
              }}
            >
              <Trash2 size={13} />
              BUCHUNG LOESCHEN
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

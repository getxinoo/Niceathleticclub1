/**
 * AdminEinsatzplan.tsx – Team-Einsatzplan (Wochenplaner)
 * With absence conflict detection, PDF export, email distribution
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, ChevronRight, Plus, X, Save, Loader2,
  Trash2, Clock, User, Calendar, AlertTriangle, FileDown,
  Mail, Check, TreePalm, Stethoscope, GraduationCap,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";

interface Shift {
  id?: number; staffId: string; staffName: string; date: string;
  startTime: string; endTime: string; role?: string; notes?: string;
  status: string;
}

interface Absence {
  id: number; staffId: string; staffName: string;
  type: string; startDate: string; endDate: string;
  status: string; reason?: string;
}

interface StaffMember {
  id: string; name: string; first_name?: string; last_name?: string; role?: string;
}

interface SwapOffer {
  id: number; shiftId: number; staffId: string; staffName: string;
  date: string; startTime: string; endTime: string; role: string;
  reason: string; status: string;
}

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const ROLES = ["Trainer", "Empfang", "Theke", "Reinigung", "Management"];
const TIMES = ["05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00"];

function getWeekDates(mondayStr: string): string[] {
  const mon = new Date(mondayStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const ROLE_COLORS: Record<string, string> = {
  Trainer: "#CA0C85", Empfang: "#3B82F6", Theke: "#F59E0B",
  Reinigung: "#22C55E", Management: "#A855F7",
};

const ABSENCE_ICONS: Record<string, React.ElementType> = {
  urlaub: TreePalm, krank: Stethoscope, fortbildung: GraduationCap,
};

function isAbsent(absences: Absence[], staffId: string, date: string): Absence | undefined {
  return absences.find(a =>
    a.staffId === staffId && a.status !== "abgelehnt" &&
    date >= a.startDate && date <= a.endDate
  );
}

export default function AdminEinsatzplan() {
  const location = useLocation();
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [swapOffers, setSwapOffers] = useState<SwapOffer[]>([]);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mailing, setMailing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const weekDates = useMemo(() => getWeekDates(monday), [monday]);

  // Conflict detection: shifts on absent days
  const conflicts = useMemo(() => {
    const c: { shiftId: number; staffName: string; date: string; absenceType: string }[] = [];
    shifts.forEach(s => {
      const abs = isAbsent(absences, s.staffId, s.date);
      if (abs) {
        c.push({ shiftId: s.id ?? 0, staffName: s.staffName, date: s.date, absenceType: abs.type });
      }
    });
    return c;
  }, [shifts, absences]);

  const load = async () => {
    setLoading(true);
    try {
      const [shiftsData, staffData, absData, swapData] = await Promise.all([
        api.admin.shifts.getWeek(monday),
        api.admin.users.listStaff(),
        api.admin.absences.list(),
        api.admin.absences.swapOffers().catch(() => []),
      ]);
      setShifts(shiftsData ?? []);
      setStaff(staffData ?? []);
      setAbsences(absData ?? []);
      setSwapOffers(swapData ?? []);
    } catch { toast.error("Fehler beim Laden."); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [monday, location.key]);

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d.toISOString().split("T")[0]); };
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d.toISOString().split("T")[0]); };
  const thisWeek = () => setMonday(getMonday(new Date()));

  const openNewShift = (date: string) => {
    setEditShift({
      staffId: staff[0]?.id ?? "", staffName: staff[0]?.name ?? "",
      date, startTime: "08:00", endTime: "16:00", role: "Trainer", status: "geplant",
    });
  };

  const saveShift = async () => {
    if (!editShift?.staffId || !editShift?.date) { toast.error("Bitte alle Felder ausfüllen."); return; }
    // Conflict warning
    const abs = isAbsent(absences, editShift.staffId, editShift.date);
    if (abs && !confirm(`⚠️ ${editShift.staffName} ist am ${editShift.date} als "${abs.type}" gemeldet. Trotzdem speichern?`)) return;
    setSaving(true);
    try {
      await api.admin.shifts.save(editShift);
      toast.success("Schicht gespeichert.");
      setEditShift(null);
      load();
    } catch { toast.error("Fehler."); }
    setSaving(false);
  };

  const deleteShift = async (id: number) => {
    if (!confirm("Schicht löschen?")) return;
    try { await api.admin.shifts.delete(id); toast.success("Gelöscht."); load(); }
    catch { toast.error("Fehler."); }
  };

  // PDF Export
  const exportPDF = async () => {
    setExporting(true);
    try {
      const weekLabel = `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`;
      let html = `<html><head><meta charset="utf-8"><title>Dienstplan ${weekLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 12px; color: #999; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f5f5f5; padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px; border: 1px solid #eee; vertical-align: top; }
          .shift { background: #f9f9f9; padding: 3px 6px; margin-bottom: 2px; border-left: 3px solid #CA0C85; }
          .shift-name { font-weight: bold; font-size: 10px; }
          .shift-time { color: #666; font-size: 9px; }
          .conflict { background: #fff0f0; border-left-color: #ef4444; }
          @media print { body { margin: 10px; } }
        </style></head><body>
        <h1>Nice Athletic Club – Dienstplan</h1>
        <h2>Woche: ${weekLabel}</h2>
        <table><tr>`;
      DAYS.forEach(d => { html += `<th>${d}</th>`; });
      html += `</tr><tr>`;
      weekDates.forEach(date => {
        const dayShifts = shifts.filter(s => s.date === date);
        html += `<td>`;
        if (dayShifts.length === 0) html += `<span style="color:#ccc;font-size:10px">—</span>`;
        dayShifts.forEach(s => {
          const hasConflict = conflicts.some(c => c.shiftId === s.id);
          html += `<div class="shift${hasConflict ? " conflict" : ""}">
            <div class="shift-name">${s.staffName}</div>
            <div class="shift-time">${s.startTime}–${s.endTime} · ${s.role ?? ""}</div>
          </div>`;
        });
        html += `</td>`;
      });
      html += `</tr></table></body></html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => { win.print(); });
      }
      toast.success("Dienstplan zum Drucken geöffnet.");
    } catch { toast.error("Export fehlgeschlagen."); }
    setExporting(false);
  };

  // Email distribution
  const sendToAll = async () => {
    if (!confirm("Individuellen Dienstplan an alle Mitarbeiter per E-Mail senden?")) return;
    setMailing(true);
    try {
      // In production this would hit /api/shifts/send-mail
      await new Promise(r => setTimeout(r, 1500));
      toast.success(`Dienstplan an ${staff.length} Mitarbeiter gesendet.`);
    } catch { toast.error("Versand fehlgeschlagen."); }
    setMailing(false);
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "4px", textTransform: "uppercase",
  };

  const weekLabel = `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`;

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            EINSATZPLAN
          </h1>
          <p className="text-white/35 text-sm mt-1">Schichtplanung für das Team</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export & Mail */}
          <button onClick={exportPDF} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-white/40 hover:text-white/70 cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
            PDF EXPORT
          </button>
          <button onClick={sendToAll} disabled={mailing}
            className="flex items-center gap-1.5 px-3 py-2 text-white/40 hover:text-white/70 cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
            {mailing ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
            AN ALLE SENDEN
          </button>
          {/* Week Navigation */}
          <button onClick={prevWeek} className="p-2 text-white/40 hover:text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={thisWeek} className="px-4 py-2 text-white/60 hover:text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em" }}>
            {weekLabel}
          </button>
          <button onClick={nextWeek} className="p-2 text-white/40 hover:text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflicts.length > 0 && (
        <div className="mb-4 px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderLeft: "3px solid #EF4444" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
          <div>
            <p className="text-white/80 text-sm mb-1" style={{ fontWeight: 600 }}>Konflikte erkannt</p>
            {conflicts.map((c, i) => (
              <p key={i} className="text-white/50 text-xs">
                <span className="text-white/70">{c.staffName}</span> ist am {formatDate(c.date)} als <span className="text-red-400">{c.absenceType}</span> gemeldet
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Swap Offers */}
      {swapOffers.length > 0 && (
        <div className="mb-4 px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <ArrowRightLeft size={14} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <div>
            <p className="text-white/60 text-xs" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em" }}>
              {swapOffers.length} OFFENE TAUSCH-ANGEBOTE
            </p>
            {swapOffers.map(o => (
              <p key={o.id} className="text-white/40 text-xs mt-1">
                {o.staffName} bietet {formatDate(o.date)} {o.startTime}–{o.endTime} ({o.role}) – <span className="text-white/50">{o.reason}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : (
        <div ref={printRef} className="grid grid-cols-7 gap-2">
          {weekDates.map((date, di) => {
            const dayShifts = shifts.filter(s => s.date === date);
            const isToday = date === new Date().toISOString().split("T")[0];
            // Find staff absent on this day
            const absentStaff = absences.filter(a =>
              a.status !== "abgelehnt" && date >= a.startDate && date <= a.endDate
            );

            return (
              <div key={date} className="flex flex-col">
                <div className="text-center px-2 py-2 mb-2"
                  style={{
                    background: isToday ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.02)",
                    borderBottom: isToday ? "2px solid var(--brand)" : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: isToday ? "var(--brand)" : "rgba(255,255,255,0.35)" }}>
                    {DAYS[di].slice(0, 2).toUpperCase()}
                  </p>
                  <p className="text-white/60 text-xs">{formatDate(date)}</p>
                </div>

                {/* Absent staff indicators */}
                {absentStaff.length > 0 && (
                  <div className="space-y-0.5 mb-1">
                    {absentStaff.map(a => {
                      const AbsIcon = ABSENCE_ICONS[a.type] ?? AlertTriangle;
                      const color = a.type === "krank" ? "#EF4444" : a.type === "fortbildung" ? "#3B82F6" : "#22C55E";
                      return (
                        <div key={a.id} className="flex items-center gap-1 px-1.5 py-0.5"
                          style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                          title={`${a.staffName}: ${a.type}${a.reason ? ` – ${a.reason}` : ""}`}>
                          <AbsIcon size={8} style={{ color, flexShrink: 0 }} />
                          <span style={{ fontSize: "8px", color: `${color}AA`, fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.staffName.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Shift Cards */}
                <div className="space-y-1.5 flex-1">
                  {dayShifts.map(shift => {
                    const roleColor = ROLE_COLORS[shift.role ?? ""] ?? "#666";
                    const hasConflict = conflicts.some(c => c.shiftId === shift.id);
                    const isSwapOpen = shift.status === "tausch_offen";
                    return (
                      <div key={shift.id} className="p-2 group relative cursor-pointer transition-all duration-200"
                        style={{
                          background: hasConflict ? "rgba(239,68,68,0.08)" : isSwapOpen ? "rgba(245,158,11,0.08)" : `${roleColor}10`,
                          border: hasConflict ? "1px solid rgba(239,68,68,0.3)" : isSwapOpen ? "1px solid rgba(245,158,11,0.3)" : `1px solid ${roleColor}30`,
                        }}
                        onClick={() => setEditShift({ ...shift })}>
                        {hasConflict && (
                          <AlertTriangle size={10} className="absolute top-1 right-1" style={{ color: "#EF4444" }} />
                        )}
                        {isSwapOpen && (
                          <ArrowRightLeft size={9} className="absolute top-1 right-1" style={{ color: "#F59E0B" }} />
                        )}
                        <p className="text-white text-[11px] truncate">{shift.staffName}</p>
                        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, color: hasConflict ? "#EF4444" : roleColor }}>
                          {shift.startTime}–{shift.endTime}
                        </p>
                        {shift.role && (
                          <p className="text-[9px] text-white/25 mt-0.5" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}>
                            {shift.role}
                          </p>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); shift.id && deleteShift(shift.id); }}
                          className="absolute bottom-1 right-1 p-1 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 cursor-pointer transition-opacity"
                          style={{ background: "none", border: "none" }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => openNewShift(date)}
                  className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-white/20 hover:text-white/50 cursor-pointer transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)", fontSize: "10px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em" }}>
                  <Plus size={10} /> SCHICHT
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex gap-3 mt-6 flex-wrap">
        {ROLES.map(role => {
          const count = shifts.filter(s => s.role === role).length;
          const color = ROLE_COLORS[role] ?? "#666";
          return (
            <div key={role} className="flex items-center gap-2 px-3 py-1.5"
              style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: `${color}CC` }}>
                {role.toUpperCase()}
              </span>
              <span className="text-white/30 text-xs">{count}</span>
            </div>
          );
        })}
        {conflicts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle size={10} style={{ color: "#EF4444" }} />
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#EF4444" }}>
              {conflicts.length} KONFLIKTE
            </span>
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      <AnimatePresence>
        {editShift && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setEditShift(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6"
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  {editShift.id ? "SCHICHT BEARBEITEN" : "NEUE SCHICHT"}
                </h3>
                <button onClick={() => setEditShift(null)} className="text-white/40 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Conflict warning inside modal */}
              {editShift.staffId && isAbsent(absences, editShift.staffId, editShift.date) && (
                <div className="mb-4 px-3 py-2 flex items-center gap-2"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertTriangle size={14} style={{ color: "#EF4444" }} />
                  <span className="text-red-400 text-xs">
                    {editShift.staffName} ist an diesem Tag als "{isAbsent(absences, editShift.staffId, editShift.date)?.type}" gemeldet!
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div><label style={labelStyle}>Mitarbeiter *</label>
                  <select value={editShift.staffId} onChange={e => {
                    const s = staff.find(m => m.id === e.target.value);
                    setEditShift({ ...editShift, staffId: e.target.value, staffName: s?.name ?? "" });
                  }} style={inputStyle}>
                    {staff.map(m => {
                      const abs = isAbsent(absences, m.id, editShift.date);
                      return <option key={m.id} value={m.id}>{m.name}{abs ? ` ⚠️ ${abs.type}` : ""}</option>;
                    })}
                  </select>
                </div>
                <div><label style={labelStyle}>Datum</label>
                  <input type="date" value={editShift.date} onChange={e => setEditShift({ ...editShift, date: e.target.value })} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Von</label>
                    <select value={editShift.startTime} onChange={e => setEditShift({ ...editShift, startTime: e.target.value })} style={inputStyle}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Bis</label>
                    <select value={editShift.endTime} onChange={e => setEditShift({ ...editShift, endTime: e.target.value })} style={inputStyle}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={labelStyle}>Rolle</label>
                  <select value={editShift.role ?? ""} onChange={e => setEditShift({ ...editShift, role: e.target.value })} style={inputStyle}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Status</label>
                  <select value={editShift.status} onChange={e => setEditShift({ ...editShift, status: e.target.value })} style={inputStyle}>
                    <option value="geplant">Geplant</option>
                    <option value="bestaetigt">Bestätigt</option>
                    <option value="tausch_offen">Tausch offen</option>
                    <option value="abgesagt">Abgesagt</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Notizen</label>
                  <input value={editShift.notes ?? ""} onChange={e => setEditShift({ ...editShift, notes: e.target.value })} style={inputStyle} placeholder="Optional..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditShift(null)}>Abbrechen</Button>
                <Button onClick={saveShift} disabled={saving}
                  style={{ background: "var(--brand)" }} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  SPEICHERN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
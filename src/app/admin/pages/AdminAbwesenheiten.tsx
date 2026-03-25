/**
 * AdminAbwesenheiten.tsx – Urlaubsplaner & Abwesenheitsverwaltung
 * Calendar timeline + approval system + vacation budgets
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, ChevronRight, Check, X, Loader2, Plus,
  TreePalm, Stethoscope, GraduationCap, HelpCircle,
  Bell, Calendar, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "../../context/AuthContext";

interface Absence {
  id: number; staffId: string; staffName: string;
  type: "urlaub" | "krank" | "fortbildung" | "sonstiges";
  startDate: string; endDate: string; reason?: string;
  status: "beantragt" | "genehmigt" | "abgelehnt";
  approvedBy?: string | null; createdAt: string;
}

interface Budget {
  staffId: string; staffName: string;
  totalDays: number; usedDays: number; carryOver: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  urlaub: { label: "Urlaub", color: "#22C55E", icon: TreePalm },
  krank: { label: "Krank", color: "#EF4444", icon: Stethoscope },
  fortbildung: { label: "Fortbildung", color: "#3B82F6", icon: GraduationCap },
  sonstiges: { label: "Sonstiges", color: "#A855F7", icon: HelpCircle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  beantragt: { label: "BEANTRAGT", color: "#F59E0B" },
  genehmigt: { label: "GENEHMIGT", color: "#22C55E" },
  abgelehnt: { label: "ABGELEHNT", color: "#EF4444" },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start); const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export default function AdminAbwesenheiten() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [tab, setTab] = useState<"timeline" | "antraege" | "budgets">("timeline");
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [showNew, setShowNew] = useState(false);
  const [newAbs, setNewAbs] = useState({ staffId: "", type: "urlaub", startDate: "", endDate: "", reason: "" });
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [absData, budgetData, staffData] = await Promise.all([
        api.admin.absences.list(),
        api.admin.absences.budgets(),
        api.admin.users.listStaff(),
      ]);
      setAbsences(absData ?? []);
      setBudgets(budgetData ?? []);
      setStaff((staffData ?? []).map((s: any) => ({ id: s.id, name: s.name ?? `${s.first_name} ${s.last_name}` })));
    } catch { toast.error("Fehler beim Laden."); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [location.key]);

  const daysInMonth = getDaysInMonth(year, month);
  const monthName = new Date(year, month).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const pendingCount = absences.filter(a => a.status === "beantragt").length;

  // Get unique staff with absences in current month
  const staffInMonth = useMemo(() => {
    const staffIds = new Set<string>();
    absences.forEach(a => staffIds.add(a.staffId));
    staff.forEach(s => staffIds.add(s.id));
    return Array.from(staffIds).map(id => {
      const s = staff.find(st => st.id === id);
      const a = absences.find(ab => ab.staffId === id);
      return { id, name: s?.name ?? a?.staffName ?? `MA #${id}` };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [absences, staff]);

  const approve = async (id: number) => {
    try {
      await api.admin.absences.review(id, { status: "genehmigt", approvedBy: user?.id ?? "1" });
      setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: "genehmigt" as const } : a));
      toast.success("Abwesenheit genehmigt.");
    } catch { toast.error("Fehler."); }
  };

  const reject = async (id: number) => {
    try {
      await api.admin.absences.review(id, { status: "abgelehnt", approvedBy: user?.id ?? "1" });
      setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: "abgelehnt" as const } : a));
      toast.success("Abwesenheit abgelehnt.");
    } catch { toast.error("Fehler."); }
  };

  const submitNew = async () => {
    if (!newAbs.staffId || !newAbs.startDate || !newAbs.endDate) {
      toast.error("Bitte alle Felder ausfüllen."); return;
    }
    setSaving(true);
    try {
      const s = staff.find(st => st.id === newAbs.staffId);
      await api.admin.absences.request({ ...newAbs, staffName: s?.name ?? "" });
      toast.success("Abwesenheit eingetragen.");
      setShowNew(false);
      setNewAbs({ staffId: "", type: "urlaub", startDate: "", endDate: "", reason: "" });
      load();
    } catch { toast.error("Fehler."); }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "4px", textTransform: "uppercase",
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            ABWESENHEITEN
          </h1>
          <p className="text-white/35 text-sm mt-1">Urlaub, Krankheit & Fortbildung</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 mr-2"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Bell size={13} style={{ color: "#F59E0B" }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#F59E0B" }}>
                {pendingCount} OFFENE ANTRÄGE
              </span>
            </div>
          )}
          <Button onClick={() => setShowNew(true)} className="gap-2"
            style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em" }}>
            <Plus size={14} /> EINTRAGEN
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {([
          { key: "timeline" as const, label: "TIMELINE" },
          { key: "antraege" as const, label: `ANTRÄGE (${pendingCount})` },
          { key: "budgets" as const, label: "URLAUBSKONTO" },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 cursor-pointer transition-all"
            style={{
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em",
              background: tab === t.key ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
              border: tab === t.key ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.06)",
              color: tab === t.key ? "white" : "rgba(255,255,255,0.4)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TIMELINE TAB ═══ */}
      {tab === "timeline" && (
        <>
          {/* Month Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={prevMonth} className="p-2 text-white/40 hover:text-white cursor-pointer"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 py-2 text-white/70" style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em" }}>
              {monthName.toUpperCase()}
            </span>
            <button onClick={nextMonth} className="p-2 text-white/40 hover:text-white cursor-pointer"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: cfg.color }} />
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
                  {cfg.label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ minWidth: `${120 + daysInMonth * 32}px` }}>
              {/* Day headers */}
              <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="shrink-0" style={{ width: "120px", padding: "8px 12px", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}>
                    MITARBEITER
                  </span>
                </div>
                <div className="flex flex-1">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayDate = new Date(year, month, i + 1);
                    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                    const isToday = dayDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                    return (
                      <div key={i} className="flex-1 text-center py-1.5" style={{
                        minWidth: "32px",
                        background: isToday ? "rgba(202,12,133,0.15)" : isWeekend ? "rgba(255,255,255,0.02)" : "transparent",
                        borderLeft: "1px solid rgba(255,255,255,0.03)",
                      }}>
                        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em", color: isToday ? "var(--brand)" : isWeekend ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)" }}>
                          {["SO","MO","DI","MI","DO","FR","SA"][dayDate.getDay()]}
                        </p>
                        <p style={{ fontSize: "10px", color: isToday ? "white" : "rgba(255,255,255,0.5)" }}>{i + 1}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff rows */}
              {staffInMonth.map(s => {
                const staffAbsences = absences.filter(a => a.staffId === s.id && a.status !== "abgelehnt");
                return (
                  <div key={s.id} className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="shrink-0 flex items-center" style={{ width: "120px", padding: "6px 12px", background: "rgba(255,255,255,0.01)" }}>
                      <span className="text-white/60 text-xs truncate">{s.name}</span>
                    </div>
                    <div className="flex flex-1 relative" style={{ minHeight: "36px" }}>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayDate = new Date(year, month, i + 1);
                        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                        return (
                          <div key={i} className="flex-1" style={{
                            minWidth: "32px",
                            background: isWeekend ? "rgba(255,255,255,0.01)" : "transparent",
                            borderLeft: "1px solid rgba(255,255,255,0.02)",
                          }} />
                        );
                      })}
                      {/* Absence bars */}
                      {staffAbsences.map(abs => {
                        const absStart = new Date(abs.startDate);
                        const absEnd = new Date(abs.endDate);
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month, daysInMonth);
                        if (absEnd < monthStart || absStart > monthEnd) return null;

                        const startDay = Math.max(0, Math.floor((absStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
                        const endDay = Math.min(daysInMonth - 1, Math.floor((absEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
                        const left = `${(startDay / daysInMonth) * 100}%`;
                        const width = `${((endDay - startDay + 1) / daysInMonth) * 100}%`;
                        const cfg = TYPE_CONFIG[abs.type] ?? TYPE_CONFIG.sonstiges;

                        return (
                          <div key={abs.id} className="absolute top-1.5" style={{
                            left, width, height: "22px",
                            background: `${cfg.color}25`,
                            border: `1px solid ${cfg.color}50`,
                            borderRadius: "2px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: abs.status === "beantragt" ? 0.6 : 1,
                          }}
                            title={`${abs.staffName}: ${cfg.label} (${abs.startDate} – ${abs.endDate}) – ${abs.reason ?? ""}`}
                          >
                            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", color: cfg.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px" }}>
                              {cfg.label.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ ANTRÄGE TAB ═══ */}
      {tab === "antraege" && (
        <div className="space-y-3">
          {absences.filter(a => a.status === "beantragt").length === 0 && (
            <div className="text-center py-16" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Check size={32} className="mx-auto mb-3 text-green-400/30" />
              <p className="text-white/40 text-sm">Keine offenen Anträge.</p>
            </div>
          )}
          {absences.sort((a, b) => {
            const order = { beantragt: 0, genehmigt: 1, abgelehnt: 2 };
            return (order[a.status] ?? 9) - (order[b.status] ?? 9);
          }).map(abs => {
            const cfg = TYPE_CONFIG[abs.type] ?? TYPE_CONFIG.sonstiges;
            const sCfg = STATUS_CONFIG[abs.status] ?? STATUS_CONFIG.beantragt;
            const Icon = cfg.icon;
            const days = daysBetween(abs.startDate, abs.endDate);
            return (
              <motion.div key={abs.id} layout className="p-4 flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${abs.status === "beantragt" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                <div className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm">{abs.staffName}</span>
                    <span className="px-1.5 py-0.5 text-[9px]"
                      style={{ background: `${sCfg.color}15`, border: `1px solid ${sCfg.color}30`, color: sCfg.color, fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em" }}>
                      {sCfg.label}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">
                    {cfg.label} · {new Date(abs.startDate).toLocaleDateString("de-DE")} – {new Date(abs.endDate).toLocaleDateString("de-DE")} · {days} {days === 1 ? "Tag" : "Tage"}
                  </p>
                  {abs.reason && <p className="text-white/25 text-xs mt-0.5">{abs.reason}</p>}
                </div>
                {abs.status === "beantragt" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approve(abs.id)}
                      className="p-2 text-green-400/60 hover:text-green-400 cursor-pointer transition-colors"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
                      title="Freigeben">
                      <Check size={16} />
                    </button>
                    <button onClick={() => reject(abs.id)}
                      className="p-2 text-red-400/60 hover:text-red-400 cursor-pointer transition-colors"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                      title="Ablehnen">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ BUDGETS TAB ═══ */}
      {tab === "budgets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const remaining = b.totalDays + b.carryOver - b.usedDays;
            const pct = Math.round((b.usedDays / (b.totalDays + b.carryOver)) * 100);
            return (
              <div key={b.staffId} className="p-5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 flex items-center justify-center text-white"
                    style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)", fontFamily: "var(--font-display)", fontSize: "12px" }}>
                    {b.staffName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-white text-sm">{b.staffName}</p>
                    <p className="text-white/30 text-xs">{remaining} Tage verbleibend</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Jahresanspruch</span>
                    <span className="text-white/60">{b.totalDays} Tage</span>
                  </div>
                  {b.carryOver > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Übertrag Vorjahr</span>
                      <span className="text-white/60">+{b.carryOver} Tage</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Genommen</span>
                    <span style={{ color: "var(--brand)" }}>{b.usedDays} Tage</span>
                  </div>
                  <div className="h-2 w-full mt-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "#EF4444" : "var(--brand)" }} />
                  </div>
                  <p className="text-right text-[10px]" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)" }}>
                    {pct}% VERBRAUCHT
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ NEW ABSENCE MODAL ═══ */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowNew(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6"
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  ABWESENHEIT EINTRAGEN
                </h3>
                <button onClick={() => setShowNew(false)} className="text-white/40 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div><label style={labelStyle}>Mitarbeiter *</label>
                  <select value={newAbs.staffId} onChange={e => setNewAbs({ ...newAbs, staffId: e.target.value })} style={inputStyle}>
                    <option value="">Auswählen...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Art</label>
                  <select value={newAbs.type} onChange={e => setNewAbs({ ...newAbs, type: e.target.value })} style={inputStyle}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Von *</label>
                    <input type="date" value={newAbs.startDate} onChange={e => setNewAbs({ ...newAbs, startDate: e.target.value })} style={inputStyle} />
                  </div>
                  <div><label style={labelStyle}>Bis *</label>
                    <input type="date" value={newAbs.endDate} onChange={e => setNewAbs({ ...newAbs, endDate: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div><label style={labelStyle}>Grund</label>
                  <input value={newAbs.reason} onChange={e => setNewAbs({ ...newAbs, reason: e.target.value })} style={inputStyle} placeholder="Optional..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
                <Button onClick={submitNew} disabled={saving} style={{ background: "var(--brand)" }} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  EINTRAGEN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
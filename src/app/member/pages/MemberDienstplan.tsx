/**
 * MemberDienstplan.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Eigener Dienstplan für eingeloggte Mitarbeiter (Rolle: trainer / frontdesk / hr / finance).
 * Zeigt NUR die eigenen Schichten + eigene Abwesenheitsanträge.
 *
 * Zugriffsrecht: shifts.own.read (SHIFTS_OWN_READ)
 * Nicht sichtbar für normale Mitglieder (role: 'member').
 *
 * Daten: In Produktion → GET /api/staff/shifts/me?week=YYYY-WW
 *                        GET /api/staff/absences/me
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Calendar, Clock, ChevronLeft, ChevronRight, TreePalm,
  Stethoscope, CheckCircle2, AlertTriangle, Plus, X,
  FileText, Send, Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ── Typen ─────────────────────────────────────────────────────────────────────
interface MyShift {
  id: string;
  day: number;         // 0=Mo … 6=So
  startHour: number;
  endHour: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

type AbsenceType   = "urlaub" | "krank" | "freizeit" | "sonderurlaub";
type AbsenceStatus = "pending" | "approved" | "rejected";

interface MyAbsence {
  id: string;
  type: AbsenceType;
  from: string;
  to: string;
  days: number;
  status: AbsenceStatus;
  note?: string;
}

// ── Mock-Daten (in Produktion: API /staff/shifts/me) ──────────────────────────
const MOCK_SHIFTS: MyShift[] = [
  { id: "ms1", day: 0, startHour: 8,  endHour: 14, label: "Theke",    color: "#93C5FD", bgColor: "rgba(59,130,246,0.14)",  borderColor: "rgba(59,130,246,0.45)"  },
  { id: "ms2", day: 2, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)", borderColor: "rgba(202,12,133,0.4)"  },
  { id: "ms3", day: 4, startHour: 8,  endHour: 14, label: "Theke",    color: "#93C5FD", bgColor: "rgba(59,130,246,0.14)",  borderColor: "rgba(59,130,246,0.45)"  },
];

const MOCK_ABSENCES: MyAbsence[] = [
  { id: "ma1", type: "urlaub", from: "30.06.2025", to: "04.07.2025", days: 5, status: "pending" },
  { id: "ma2", type: "krank",  from: "26.03.2026", to: "26.03.2026", days: 1, status: "approved" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}
function fmtFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function isToday(d: Date): boolean {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const WEEKDAYS     = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function absenceLabel(t: AbsenceType): { label: string; color: string; bg: string; border: string; icon: JSX.Element } {
  const map = {
    urlaub:       { label: "Urlaub",       color: "#60A5FA", bg: "rgba(96,165,250,0.12)",   border: "rgba(96,165,250,0.3)"   },
    krank:        { label: "Krankmeldung", color: "#F87171", bg: "rgba(239,68,68,0.12)",    border: "rgba(239,68,68,0.3)"    },
    freizeit:     { label: "Freizeit",     color: "#A78BFA", bg: "rgba(167,139,250,0.12)",  border: "rgba(167,139,250,0.3)"  },
    sonderurlaub: { label: "Sonderurlaub", color: "#FBBF24", bg: "rgba(251,191,36,0.12)",   border: "rgba(251,191,36,0.3)"   },
  };
  const icon = t === "krank"
    ? <Stethoscope size={10} />
    : t === "urlaub"
    ? <TreePalm size={10} />
    : <Clock size={10} />;
  return { ...map[t], icon };
}

function statusBadge(s: AbsenceStatus) {
  const map = {
    pending:  { label: "Ausstehend", color: "#FCD34D", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)" },
    approved: { label: "Genehmigt",  color: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.3)" },
    rejected: { label: "Abgelehnt",  color: "#F87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)"  },
  };
  const cfg = map[s];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "3px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase", color: cfg.color,
      whiteSpace: "nowrap",
    }}>
      {s === "approved" && <CheckCircle2 size={10} />}
      {s === "pending"  && <AlertTriangle size={10} />}
      {s === "rejected" && <X size={10} />}
      {cfg.label}
    </span>
  );
}

// ── Antrag-Formular-Modal ─────────────────────────────────────────────────────
const ABSENCE_TYPES: { value: AbsenceType; label: string; color: string }[] = [
  { value: "urlaub",       label: "Urlaub",       color: "#60A5FA" },
  { value: "krank",        label: "Krankmeldung", color: "#F87171" },
  { value: "freizeit",     label: "Freizeit",     color: "#A78BFA" },
  { value: "sonderurlaub", label: "Sonderurlaub", color: "#FBBF24" },
];

function AbsenceRequestModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (a: Omit<MyAbsence, "id">) => void;
}) {
  const [type, setType] = useState<AbsenceType>("urlaub");
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const computeDays = (f: string, t: string) => {
    if (!f || !t) return 0;
    const a = new Date(f), b = new Date(t);
    if (b < a) return 0;
    let count = 0; const cur = new Date(a);
    while (cur <= b) { if (cur.getDay() !== 0) count++; cur.setDate(cur.getDate() + 1); }
    return count;
  };
  const days = computeDays(from, to);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!from) e.from = "Startdatum fehlt";
    if (!to)   e.to   = "Enddatum fehlt";
    if (from && to && to < from) e.to = "Enddatum liegt vor Startdatum";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const fmt = (iso: string) => { const [y,m,d] = iso.split("-"); return `${d}.${m}.${y}`; };
    onSubmit({ type, from: fmt(from), to: fmt(to), days: days || 1, status: "pending", note });
    setFrom(""); setTo(""); setNote(""); setType("urlaub"); setErrors({});
    onClose();
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "6px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };
  const labelSt: React.CSSProperties = {
    display: "block", marginBottom: "5px",
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 200 }}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(480px, calc(100vw - 32px))",
              background: "#131313", border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "2px solid var(--brand)", borderRadius: "10px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)", zIndex: 201, overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <Send size={14} style={{ color: "var(--brand)" }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>
                  Abwesenheit beantragen
                </span>
              </div>
              <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}>
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Typ */}
              <div>
                <label style={labelSt}>Typ *</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {ABSENCE_TYPES.map(opt => {
                    const sel = type === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setType(opt.value)} style={{
                        flex: 1, minWidth: "90px", padding: "8px 8px", borderRadius: "6px", cursor: "pointer",
                        background: sel ? `${opt.color}18` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${sel ? opt.color + "55" : "rgba(255,255,255,0.09)"}`,
                        color: sel ? opt.color : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-condensed)", fontSize: "11px",
                        fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                        transition: "all 0.14s",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Datum */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelSt}>Von *</label>
                  <input type="date" value={from} onChange={e => { setFrom(e.target.value); setErrors(p => { const n={...p}; delete n.from; return n; }); }}
                    style={{ ...inputSt, colorScheme: "dark", borderColor: errors.from ? "#F87171" : "rgba(255,255,255,0.1)" }} />
                  {errors.from && <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#F87171", marginTop: "3px" }}>{errors.from}</div>}
                </div>
                <div>
                  <label style={labelSt}>Bis *</label>
                  <input type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setErrors(p => { const n={...p}; delete n.to; return n; }); }}
                    style={{ ...inputSt, colorScheme: "dark", borderColor: errors.to ? "#F87171" : "rgba(255,255,255,0.1)" }} />
                  {errors.to && <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#F87171", marginTop: "3px" }}>{errors.to}</div>}
                </div>
              </div>

              {/* Tage-Preview */}
              {from && to && !errors.to && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.18)" }}>
                  <Calendar size={11} style={{ color: "var(--brand)", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                    <strong style={{ color: "#fff" }}>{days} {days === 1 ? "Tag" : "Tage"}</strong>
                    {type === "urlaub" && <> · zieht <strong style={{ color: "#fff" }}>{days} Urlaubstag{days !== 1 ? "e" : ""}</strong> ab</>}
                  </span>
                </div>
              )}

              {/* Notiz */}
              <div>
                <label style={labelSt}>Anmerkung (optional)</label>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="z.B. Arzttermin, Familiäre Gründe…"
                  style={{ ...inputSt, resize: "vertical", minHeight: "52px", lineHeight: 1.5 }} />
              </div>

              {/* Info */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", padding: "8px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Info size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: "1px" }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  Dein Antrag wird dem Teamlead zur Genehmigung vorgelegt. Du erhältst eine Benachrichtigung sobald er bearbeitet wurde.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
              <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "6px", cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Abbrechen
              </button>
              <button onClick={handleSubmit} style={{ padding: "9px 20px", borderRadius: "6px", cursor: "pointer", background: "var(--brand)", border: "none", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 0 14px rgba(202,12,133,0.25)" }}>
                <Send size={11} /> Antrag einreichen
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function MemberDienstplan() {
  const { user } = useAuth();
  const [weekStart,     setWeekStart]     = useState(() => getMonday(new Date()));
  const [myShifts]                        = useState<MyShift[]>(MOCK_SHIFTS);
  const [myAbsences,    setMyAbsences]    = useState<MyAbsence[]>(MOCK_ABSENCES);
  const [activeTab,     setActiveTab]     = useState<"dienstplan" | "abwesenheiten">("dienstplan");
  const [showNewModal,  setShowNewModal]  = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const totalHours = useMemo(() => myShifts.reduce((s, sh) => s + sh.endHour - sh.startHour, 0), [myShifts]);
  const weekShifts = myShifts.filter(s => weekDays.some((_, i) => i === s.day));

  const handleNewAbsence = (a: Omit<MyAbsence, "id">) => {
    const newA: MyAbsence = { ...a, id: `ma_${Date.now()}` };
    setMyAbsences(prev => [newA, ...prev]);
    toast.success("Antrag eingereicht! Dein Teamlead wird benachrichtigt.", { duration: 4000 });
  };

  const pillSt = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px",
    padding: "9px 16px", background: "transparent", border: "none",
    borderBottom: `2px solid ${active ? "var(--brand)" : "transparent"}`,
    color: active ? "#fff" : "rgba(255,255,255,0.35)",
    fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
    transition: "all 0.15s", marginBottom: "-1px",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}
    >
      <AbsenceRequestModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleNewAbsence}
      />

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", marginBottom: "4px" }}>
          Mein Dienstplan
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          Hallo, {user?.name ?? "Mitarbeiter"} · Deine persönlichen Schichten und Abwesenheiten
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {[
          { label: "Schichten diese Woche", value: weekShifts.length, sub: "Eingeplante Schichten", color: "var(--brand)", Icon: Calendar },
          { label: "Stunden diese Woche",   value: `${totalHours}h`, sub: "Gesamt-Arbeitszeit", color: "#60A5FA", Icon: Clock },
          { label: "Offene Anträge",        value: myAbsences.filter(a => a.status === "pending").length, sub: "Warten auf Genehmigung", color: "#FCD34D", Icon: AlertTriangle },
        ].map(({ label, value, sub, color, Icon }) => (
          <div key={label} style={{ flex: 1, minWidth: "160px", padding: "18px 20px", borderRadius: "8px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderTop: `2px solid ${color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <Icon size={13} style={{ color }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{label}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", letterSpacing: "0.04em", color: "#fff", lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "5px" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex" }}>
          <button style={pillSt(activeTab === "dienstplan")} onClick={() => setActiveTab("dienstplan")}>
            <Calendar size={12} style={{ color: activeTab === "dienstplan" ? "var(--brand)" : "inherit" }} />
            Wochenplan
          </button>
          <button style={pillSt(activeTab === "abwesenheiten")} onClick={() => setActiveTab("abwesenheiten")}>
            <TreePalm size={12} style={{ color: activeTab === "abwesenheiten" ? "var(--brand)" : "inherit" }} />
            Abwesenheiten
            {myAbsences.filter(a => a.status === "pending").length > 0 && (
              <span style={{ background: "var(--brand)", color: "#fff", borderRadius: "9999px", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, padding: "1px 6px", lineHeight: "14px" }}>
                {myAbsences.filter(a => a.status === "pending").length}
              </span>
            )}
          </button>
        </div>
        {activeTab === "abwesenheiten" && (
          <button onClick={() => setShowNewModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", background: "var(--brand)", border: "none", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: "0 0 14px rgba(202,12,133,0.2)", transition: "filter 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
          >
            <Plus size={12} /> Antrag stellen
          </button>
        )}
      </div>

      {/* ── TAB 1: WOCHENPLAN ─────────────────────────────────────────────── */}
      {activeTab === "dienstplan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Week nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))} style={{ width: "32px", height: "32px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", color: "#fff" }}>
              KW {getISOWeek(weekStart)} · {fmtFull(weekStart)} – {fmtFull(addDays(weekStart, 6))}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))} style={{ width: "32px", height: "32px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Week grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {weekDays.map((date, di) => {
              const today    = isToday(date);
              const dayShift = myShifts.find(s => s.day === di);
              const weekend  = di >= 5;
              return (
                <div key={di} style={{
                  borderRadius: "8px", overflow: "hidden",
                  background: today ? "rgba(202,12,133,0.06)" : weekend ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${today ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.07)"}`,
                  minHeight: "120px",
                }}>
                  {/* Day header */}
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: today ? "rgba(202,12,133,0.08)" : "transparent" }}>
                    <div style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: today ? "var(--brand)" : "rgba(255,255,255,0.4)" }}>{WEEKDAYS[di]}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: today ? "rgba(202,12,133,0.8)" : "rgba(255,255,255,0.5)", marginTop: "1px" }}>{fmtDate(date)}</div>
                  </div>

                  {/* Shift */}
                  <div style={{ padding: "8px" }}>
                    {dayShift ? (
                      <div style={{
                        padding: "8px 10px", borderRadius: "5px",
                        background: dayShift.bgColor,
                        border: `1px solid ${dayShift.borderColor}`,
                      }}>
                        <div style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: dayShift.color }}>{dayShift.label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                          <Clock size={10} style={{ color: "rgba(255,255,255,0.4)" }} />
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                            {String(dayShift.startHour).padStart(2, "0")}:00 – {String(dayShift.endHour).padStart(2, "0")}:00
                          </span>
                        </div>
                        <div style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                          {dayShift.endHour - dayShift.startHour}h
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "64px" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.12)" }}>Frei</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 14px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Info size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
              Schichtänderungen oder Tauschgesuche bitte direkt mit dem Teamlead abstimmen. Dienstplan wird täglich um 00:00 Uhr aktualisiert.
            </span>
          </div>
        </div>
      )}

      {/* ── TAB 2: ABWESENHEITEN ──────────────────────────────────────────── */}
      {activeTab === "abwesenheiten" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {myAbsences.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <TreePalm size={28} style={{ color: "rgba(255,255,255,0.1)", marginBottom: "10px" }} />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
                Noch keine Abwesenheitsanträge. Klicke auf „Antrag stellen" um einen neuen einzureichen.
              </p>
            </div>
          )}

          {myAbsences.map(a => {
            const typeInfo = absenceLabel(a.type);
            return (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
                padding: "14px 16px", borderRadius: "8px",
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
              >
                {/* Typ-Badge */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "4px", background: typeInfo.bg, border: `1px solid ${typeInfo.border}`, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: typeInfo.color, whiteSpace: "nowrap" }}>
                  {typeInfo.icon} {typeInfo.label}
                </span>

                {/* Zeitraum */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                    {a.from === a.to ? a.from : `${a.from} – ${a.to}`}
                  </span>
                  <span style={{ padding: "1px 6px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)" }}>
                    {a.days} {a.days === 1 ? "Tag" : "Tage"}
                  </span>
                </div>

                {/* Status */}
                <div style={{ marginLeft: "auto" }}>
                  {statusBadge(a.status)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

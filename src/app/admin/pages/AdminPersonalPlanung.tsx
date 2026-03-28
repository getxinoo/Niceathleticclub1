/**
 * AdminPersonalPlanung.tsx
 * Kombinierter Hub: Wochen-Dienstplan + Abwesenheiten & Urlaubsanträge
 * – KPI Cards (Krank / Offene Anträge / Überstunden)
 * – Tab 1: Wochen-Dienstplan Grid mit HR-Logik & Drag-and-Drop
 * – Tab 2: Abwesenheiten & Urlaubsanträge Table
 */
import React, { useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2,
  Clock, Calendar, Users, Info, Check, Ban, Activity,
  Stethoscope, TreePalm, Plus, CalendarRange, FilePen, ChevronDown,
  Pencil, Trash2, LayoutGrid, CalendarDays, Palette,
} from "lucide-react";
import { SmartAssignSheet, type AssignPayload } from "../components/SmartAssignSheet";
import { TEAM_MEMBERS } from "../../../data/team";

// ── Types ──────────────────────────────────────────────────────────────────────
type ContractType  = "vollzeit" | "teilzeit" | "minijob" | "freelancer" | "werkstudent";
type AbsenceType   = "urlaub"   | "krank"   | "freizeit" | "sonderurlaub";
type AbsenceStatus = "pending"  | "approved" | "rejected";

interface Employee {
  id: string; name: string; initials: string; role: string;
  contractType: ContractType; sollStunden: number; color: string;
  // ── HR-Attribute (Sprint 20: SmartAssistant) ──────────────────────────────
  /** Vertragliche Wochenstunden (Minijob: Monatsstunden ≈ Wochenäquivalent) */
  contractHours: number;
  /** Erlaubte Schichtrollen – leer = alle erlaubt (PHP: staff.allowed_roles JSON) */
  allowedRoles: string[];
  /** Jährlicher Urlaubsanspruch in Tagen */
  urlaubsAnspruch: number;
  /** Bereits genommene Urlaubstage im laufenden Jahr */
  urlaubsGenommen: number;
}
interface Shift {
  id: string; employeeId: string; day: number;
  startHour: number; endHour: number; label: string;
  color: string; bgColor: string; borderColor: string;
}
interface DayAbsence { employeeId: string; day: number; type: "krank" | "urlaub"; }
interface AbsenceRequest {
  id: string; employeeName: string; initials: string;
  type: AbsenceType; from: string; to: string; days: number; status: AbsenceStatus;
}
interface ShiftTemplate {
  id: string; label: string; shortLabel: string;
  startHour: number; endHour: number;
  color: string; bgColor: string; borderColor: string;
}

interface ContractTypeDef {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  maxHoursWeek: number | null;
  color: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const EMPLOYEES: Employee[] = [
  {
    id: "e1", name: "Max Mustermann", initials: "MM", role: "Trainer",
    contractType: "vollzeit", sollStunden: 40, color: "#CA0C85",
    contractHours: 40, allowedRoles: ["Training", "Coaching", "Früh", "Spät"],
    urlaubsAnspruch: 28, urlaubsGenommen: 5,
  },
  {
    id: "e2", name: "Lisa Kraft", initials: "LK", role: "Frontdesk",
    contractType: "teilzeit", sollStunden: 20, color: "#60A5FA",
    contractHours: 20, allowedRoles: ["Theke", "Empfang", "Früh", "Spät"],
    urlaubsAnspruch: 20, urlaubsGenommen: 10,
  },
  {
    id: "e3", name: "Tom Berger", initials: "TB", role: "Trainer",
    contractType: "vollzeit", sollStunden: 40, color: "#34D399",
    contractHours: 40, allowedRoles: ["Training", "Coaching", "Spät"],
    urlaubsAnspruch: 30, urlaubsGenommen: 30,
  },
  {
    id: "e4", name: "Sara Klein", initials: "SK", role: "Frontdesk",
    contractType: "minijob", sollStunden: 10, color: "#FBBF24",
    contractHours: 10, allowedRoles: ["Theke", "Empfang", "Früh"],
    urlaubsAnspruch: 12, urlaubsGenommen: 2,
  },
  {
    id: "e5", name: "Jonas Weber", initials: "JW", role: "Trainer",
    contractType: "teilzeit", sollStunden: 25, color: "#A78BFA",
    contractHours: 25, allowedRoles: ["Training", "Coaching", "Empfang", "Spät"],
    urlaubsAnspruch: 24, urlaubsGenommen: 8,
  },
];

const INITIAL_SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: "t1", label: "Theke 08–14h",      shortLabel: "Theke",     startHour: 8,  endHour: 14, color: "#93C5FD", bgColor: "rgba(59,130,246,0.14)",   borderColor: "rgba(59,130,246,0.45)" },
  { id: "t2", label: "Training 10–18h",   shortLabel: "Training",  startHour: 10, endHour: 18, color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "t3", label: "Empfang 14–20h",    shortLabel: "Empfang",   startHour: 14, endHour: 20, color: "#C4B5FD", bgColor: "rgba(167,139,250,0.14)",  borderColor: "rgba(167,139,250,0.45)" },
  { id: "t4", label: "Frühdienst 06–12h", shortLabel: "Früh",      startHour: 6,  endHour: 12, color: "#6EE7B7", bgColor: "rgba(52,211,153,0.11)",   borderColor: "rgba(52,211,153,0.38)" },
  { id: "t5", label: "Spätdienst 14–22h", shortLabel: "Spät",      startHour: 14, endHour: 22, color: "#FCD34D", bgColor: "rgba(251,191,36,0.11)",   borderColor: "rgba(251,191,36,0.38)" },
];

const PRESET_COLORS = [
  { color: "#93C5FD", bg: "rgba(59,130,246,0.14)",   border: "rgba(59,130,246,0.45)"   },
  { color: "#F0ABFC", bg: "rgba(202,12,133,0.13)",   border: "rgba(202,12,133,0.4)"    },
  { color: "#C4B5FD", bg: "rgba(167,139,250,0.14)",  border: "rgba(167,139,250,0.45)"  },
  { color: "#6EE7B7", bg: "rgba(52,211,153,0.11)",   border: "rgba(52,211,153,0.38)"   },
  { color: "#FCD34D", bg: "rgba(251,191,36,0.11)",   border: "rgba(251,191,36,0.38)"   },
  { color: "#F87171", bg: "rgba(239,68,68,0.11)",    border: "rgba(239,68,68,0.35)"    },
  { color: "#34D399", bg: "rgba(52,211,153,0.13)",   border: "rgba(52,211,153,0.4)"    },
  { color: "#FBBF24", bg: "rgba(251,191,36,0.13)",   border: "rgba(251,191,36,0.4)"    },
  { color: "#60A5FA", bg: "rgba(96,165,250,0.13)",   border: "rgba(96,165,250,0.4)"    },
  { color: "#A78BFA", bg: "rgba(167,139,250,0.13)",  border: "rgba(167,139,250,0.4)"   },
];

const INITIAL_CONTRACT_TYPES: ContractTypeDef[] = [
  { id: "vollzeit",    label: "Vollzeit",    shortLabel: "VZ", description: "≥ 35 Std. / Woche",          maxHoursWeek: null, color: "#CA0C85" },
  { id: "teilzeit",    label: "Teilzeit",    shortLabel: "TZ", description: "< 35 Std. / Woche",          maxHoursWeek: 35,   color: "#60A5FA" },
  { id: "minijob",     label: "Minijob",     shortLabel: "MJ", description: "538€-Basis · geringfügig",   maxHoursWeek: 10,   color: "#FBBF24" },
  { id: "freelancer",  label: "Freelancer",  shortLabel: "FL", description: "Selbständig / Honorar",      maxHoursWeek: null, color: "#34D399" },
  { id: "werkstudent", label: "Werkstudent", shortLabel: "WS", description: "Max. 20 Std. im Semester",   maxHoursWeek: 20,   color: "#A78BFA" },
];

// Sara (minijob 10h soll) hat 2×6h = 12h → Überstunden für Demo
const INITIAL_SHIFTS: Shift[] = [
  { id: "s1",  employeeId: "e1", day: 0, startHour: 8,  endHour: 14, label: "Theke",    color: "#93C5FD", bgColor: "rgba(59,130,246,0.14)",   borderColor: "rgba(59,130,246,0.45)" },
  { id: "s2",  employeeId: "e1", day: 2, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "s3",  employeeId: "e1", day: 4, startHour: 8,  endHour: 14, label: "Theke",    color: "#93C5FD", bgColor: "rgba(59,130,246,0.14)",   borderColor: "rgba(59,130,246,0.45)" },
  { id: "s4",  employeeId: "e2", day: 1, startHour: 14, endHour: 20, label: "Empfang",  color: "#C4B5FD", bgColor: "rgba(167,139,250,0.14)",  borderColor: "rgba(167,139,250,0.45)" },
  { id: "s5",  employeeId: "e2", day: 3, startHour: 14, endHour: 20, label: "Empfang",  color: "#C4B5FD", bgColor: "rgba(167,139,250,0.14)",  borderColor: "rgba(167,139,250,0.45)" },
  { id: "s6",  employeeId: "e3", day: 0, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "s7",  employeeId: "e3", day: 1, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "s8",  employeeId: "e3", day: 3, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "s9",  employeeId: "e3", day: 4, startHour: 10, endHour: 18, label: "Training", color: "#F0ABFC", bgColor: "rgba(202,12,133,0.13)",   borderColor: "rgba(202,12,133,0.4)" },
  { id: "s10", employeeId: "e4", day: 2, startHour: 6,  endHour: 12, label: "Früh",     color: "#6EE7B7", bgColor: "rgba(52,211,153,0.11)",   borderColor: "rgba(52,211,153,0.38)" },
  { id: "s14", employeeId: "e4", day: 4, startHour: 6,  endHour: 12, label: "Früh",     color: "#6EE7B7", bgColor: "rgba(52,211,153,0.11)",   borderColor: "rgba(52,211,153,0.38)" },
  { id: "s11", employeeId: "e5", day: 0, startHour: 14, endHour: 22, label: "Spät",     color: "#FCD34D", bgColor: "rgba(251,191,36,0.11)",   borderColor: "rgba(251,191,36,0.38)" },
  { id: "s12", employeeId: "e5", day: 2, startHour: 14, endHour: 22, label: "Spät",     color: "#FCD34D", bgColor: "rgba(251,191,36,0.11)",   borderColor: "rgba(251,191,36,0.38)" },
  { id: "s13", employeeId: "e5", day: 4, startHour: 14, endHour: 22, label: "Spät",     color: "#FCD34D", bgColor: "rgba(251,191,36,0.11)",   borderColor: "rgba(251,191,36,0.38)" },
];

// Max ist Do krank; Lisa Mo + Mi Urlaub
const INITIAL_DAY_ABSENCES: DayAbsence[] = [
  { employeeId: "e1", day: 3, type: "krank" },
  { employeeId: "e2", day: 0, type: "urlaub" },
  { employeeId: "e2", day: 2, type: "urlaub" },
];

const INITIAL_REQUESTS: AbsenceRequest[] = [
  { id: "a1", employeeName: "Lisa Kraft",     initials: "LK", type: "urlaub",      from: "30.06.2025", to: "04.07.2025", days: 5, status: "pending"  },
  { id: "a2", employeeName: "Jonas Weber",    initials: "JW", type: "urlaub",      from: "14.07.2025", to: "18.07.2025", days: 5, status: "pending"  },
  { id: "a3", employeeName: "Max Mustermann", initials: "MM", type: "krank",       from: "26.03.2026", to: "26.03.2026", days: 1, status: "approved" },
  { id: "a4", employeeName: "Sara Klein",     initials: "SK", type: "urlaub",      from: "07.04.2026", to: "11.04.2026", days: 5, status: "rejected" },
  { id: "a5", employeeName: "Tom Berger",     initials: "TB", type: "freizeit",    from: "02.04.2026", to: "02.04.2026", days: 1, status: "pending"  },
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
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}
function fmtDateFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function getWeekRange(monday: Date): string {
  return `${fmtDateFull(monday)} – ${fmtDateFull(addDays(monday, 6))}`;
}
function isToday(d: Date): boolean {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function computeIst(empId: string, shifts: Shift[]): number {
  return shifts.filter(s => s.employeeId === empId).reduce((sum, s) => sum + s.endHour - s.startHour, 0);
}
function hoursStyle(ist: number, soll: number): { color: string; bg: string; border: string } {
  const ratio = ist / soll;
  if (ratio > 1.15) return { color: "#F87171", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)" };
  if (ratio > 1.0)  return { color: "#FCD34D", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)" };
  if (ratio >= 0.85) return { color: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.25)" };
  return { color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
}
function contractLabel(ct: ContractType): string {
  const map: Record<ContractType, string> = {
    vollzeit: "Vollzeit", teilzeit: "Teilzeit",
    minijob: "Minijob", freelancer: "Freelancer", werkstudent: "Werkstudent",
  };
  return map[ct];
}
function absenceTypeLabel(t: AbsenceType): { label: string; color: string; bg: string } {
  const m = {
    urlaub:       { label: "Urlaub",       color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
    krank:        { label: "Krankmeldung", color: "#F87171", bg: "rgba(239,68,68,0.12)"  },
    freizeit:     { label: "Freizeit",     color: "#A78BFA", bg: "rgba(167,139,250,0.12)"},
    sonderurlaub: { label: "Sonderurlaub", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  };
  return m[t];
}
function verrechnung(r: AbsenceRequest): string {
  if (r.type === "krank")        return "Krankmeldung – wird weiterbearbeitet";
  if (r.type === "freizeit")     return `Zieht ${r.days} Überstunde${r.days !== 1 ? "n" : ""} ab`;
  if (r.type === "sonderurlaub") return "Kein Urlaubsabzug";
  return `Zieht ${r.days} Urlaubstag${r.days !== 1 ? "e" : ""} ab`;
}

// ── Tooltip Helper ─────────────────────────────────────────────────────────────
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "5px", padding: "6px 10px", zIndex: 999,
          fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.8)",
          lineHeight: 1.4, maxWidth: "220px", whiteSpace: "normal",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>{text}</span>
      )}
    </span>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent }:
  { icon: React.ElementType; label: string; value: number | string; sub: string; accent: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: "20px 22px", borderRadius: "8px",
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
      borderTop: `2px solid ${accent}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <Icon size={14} style={{ color: accent }} />
        <span style={{
          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: "36px", letterSpacing: "0.04em",
        color: "#fff", lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)",
        marginTop: "6px",
      }}>{sub}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPersonalPlanung() {
  const [activeTab,        setActiveTab]        = useState<"dienstplan" | "abwesenheiten">("dienstplan");
  const [weekStart,        setWeekStart]        = useState(() => getMonday(new Date()));
  const [shifts,           setShifts]           = useState<Shift[]>(INITIAL_SHIFTS);
  const [dayAbsences]      = useState<DayAbsence[]>(INITIAL_DAY_ABSENCES);
  const [requests,         setRequests]         = useState<AbsenceRequest[]>(INITIAL_REQUESTS);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>("t1");
  const [showNewEntry,     setShowNewEntry]     = useState(false);
  // ── Template & Contract management state ────────────────────────────────────
  const [shiftTemplates,   setShiftTemplates]   = useState<ShiftTemplate[]>(INITIAL_SHIFT_TEMPLATES);
  // contractTypes kept for future Vertragsarten-Verwaltung feature
  const [_contractTypes]   = useState<ContractTypeDef[]>(INITIAL_CONTRACT_TYPES);
  // ── View mode: week | month ──────────────────────────────────────────────────
  const [viewMode,         setViewMode]         = useState<"week" | "month">("week");
  const [monthStart,       setMonthStart]       = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  // ── Template edit modal ──────────────────────────────────────────────────────
  /** null = closed, ShiftTemplate = edit existing, "new" = create new */
  const [tmplEditTarget,   setTmplEditTarget]   = useState<ShiftTemplate | "new" | null>(null);

  // ── SmartAssignSheet state ─────────────────────────────────────────────────
  const [smartSheet, setSmartSheet] = useState<{
    open: boolean; day: number | null; date: Date | null;
  }>({ open: false, day: null, date: null });

  const openSmartSheet = useCallback((day: number, date: Date) => {
    setSmartSheet({ open: true, day, date });
  }, []);

  const closeSmartSheet = useCallback(() => {
    setSmartSheet(prev => ({ ...prev, open: false }));
  }, []);

  // Drag state in refs – avoids render-per-drag-event
  const draggedShiftId = useRef<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ empId: string; day: number } | null>(null);

  // ── KPIs (derived) ────────────────────────────────────────────────────────
  const krankmeldungen = useMemo(() =>
    new Set(dayAbsences.filter(a => a.type === "krank").map(a => a.employeeId)).size, [dayAbsences]);
  const offeneAntraege = useMemo(() =>
    requests.filter(r => r.status === "pending").length, [requests]);
  const ueberstundenEmp = useMemo(() =>
    EMPLOYEES.filter(e => computeIst(e.id, shifts) > e.sollStunden).length, [shifts]);

  // ── Navigation (week & month) ─────────────────────────────────────────────
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const prevPeriod = () => {
    if (viewMode === "week") {
      setWeekStart(d => addDays(d, -7));
    } else {
      setMonthStart(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
    }
  };
  const nextPeriod = () => {
    if (viewMode === "week") {
      setWeekStart(d => addDays(d, 7));
    } else {
      setMonthStart(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });
    }
  };
  const periodLabel = viewMode === "week"
    ? `KW ${getISOWeek(weekStart)}`
    : monthStart.toLocaleString("de-DE", { month: "long", year: "numeric" });

  // ── Shift helpers ─────────────────────────────────────────────────────────
  const addShift = useCallback((empId: string, day: number) => {
    if (!selectedTemplate) return;
    const tmpl  = shiftTemplates.find(t => t.id === selectedTemplate)!;
    const emp   = EMPLOYEES.find(e => e.id === empId)!;
    const abs   = dayAbsences.find(a => a.employeeId === empId && a.day === day);
    const exist = shifts.find(s => s.employeeId === empId && s.day === day);
    if (exist) {
      toast.info("Dieser Tag hat bereits eine Schicht. Bitte zuerst die bestehende Schicht entfernen.");
      return;
    }
    const newShift: Shift = {
      id: `s_${Date.now()}`, employeeId: empId, day,
      startHour: tmpl.startHour, endHour: tmpl.endHour, label: tmpl.shortLabel,
      color: tmpl.color, bgColor: tmpl.bgColor, borderColor: tmpl.borderColor,
    };
    setShifts(prev => {
      const next = [...prev, newShift];
      const ist  = next.filter(s => s.employeeId === empId).reduce((sum, s) => sum + s.endHour - s.startHour, 0);
      if (ist > emp.sollStunden) {
        const ot = ist - emp.sollStunden;
        toast.warning(`Hinweis: ${emp.name} baut diese Woche ${ot}h Überstunden auf`, {
          description: "Das Arbeitszeitkonto wird am Ende der Woche automatisch aktualisiert.",
          duration: 5500,
        });
      }
      return next;
    });
    if (abs) {
      toast.error(
        `⚠️ Achtung: ${emp.name} ist ${abs.type === "krank" ? "krank gemeldet" : "im Urlaub"} an diesem Tag!`,
        { description: "Schicht wurde dennoch zugewiesen (Admin-Override). Bitte prüfen.", duration: 6000 }
      );
    }
  }, [selectedTemplate, dayAbsences, shifts]);

  const removeShift = useCallback((id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, shiftId: string) => {
    draggedShiftId.current = shiftId;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, empId: string, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(prev =>
      prev?.empId === empId && prev?.day === day ? prev : { empId, day }
    );
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetEmpId: string, targetDay: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const shiftId = draggedShiftId.current;
    draggedShiftId.current = null;
    if (!shiftId) return;

    const shift   = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    if (shift.employeeId === targetEmpId && shift.day === targetDay) return;

    const existing = shifts.find(s => s.employeeId === targetEmpId && s.day === targetDay && s.id !== shiftId);
    if (existing) {
      toast.warning(`${EMPLOYEES.find(e => e.id === targetEmpId)?.name} hat bereits eine Schicht an diesem Tag.`, {
        description: "Bestehende Schicht zuerst entfernen oder verschieben.",
      });
      return;
    }

    const targetEmp = EMPLOYEES.find(e => e.id === targetEmpId)!;
    const absOnTarget = dayAbsences.find(a => a.employeeId === targetEmpId && a.day === targetDay);

    setShifts(prev => {
      const next = prev.map(s => s.id === shiftId ? { ...s, employeeId: targetEmpId, day: targetDay } : s);
      const ist  = next.filter(s => s.employeeId === targetEmpId).reduce((sum, s) => sum + s.endHour - s.startHour, 0);
      if (ist > targetEmp.sollStunden) {
        const ot = ist - targetEmp.sollStunden;
        toast.warning(`Hinweis: ${targetEmp.name} baut diese Woche ${ot}h Überstunden auf`, {
          description: "Das Arbeitszeitkonto wird am Ende der Woche automatisch aktualisiert.",
          duration: 5500,
        });
      }
      return next;
    });

    if (absOnTarget) {
      toast.error(
        `⚠️ Achtung: ${targetEmp.name} ist ${absOnTarget.type === "krank" ? "krank gemeldet" : "im Urlaub"} an diesem Tag!`,
        { description: "Schicht wurde dennoch zugewiesen (Admin-Override). Bitte prüfen.", duration: 6000 }
      );
    }
  }, [shifts, dayAbsences]);

  const handleDragEnd = useCallback(() => {
    draggedShiftId.current = null;
    setDragOverCell(null);
  }, []);

  // ── Request actions ────────────────────────────────────────────────────────
  // ── SmartAssign: Schicht aus SmartAssignSheet übernehmen ──────────────────
  const handleSmartAssign = useCallback((payload: AssignPayload) => {
    const { employeeId, day, startHour, endHour, shiftRole, override } = payload;
    const emp = EMPLOYEES.find(e => e.id === employeeId)!;

    // Existierende Schicht am selben Tag prüfen (Nicht-überschneidend = ok)
    const overlaps = shifts.find(
      s => s.employeeId === employeeId && s.day === day
        && startHour < s.endHour && endHour > s.startHour,
    );
    if (overlaps && !override) {
      toast.warning(`${emp.name} hat bereits eine überlappende Schicht an diesem Tag.`);
      return;
    }

    // Abwesenheits-Warn-Toast (nur wenn override)
    const abs = dayAbsences.find(a => a.employeeId === employeeId && a.day === day);
    if (abs) {
      toast.error(
        `⚠️ Admin-Override: ${emp.name} ist ${abs.type === "krank" ? "krank" : "im Urlaub"} an diesem Tag!`,
        { description: "Schicht wurde dennoch eingetragen. Bitte dokumentieren.", duration: 6000 },
      );
    }

    // Vorlage-Farben ermitteln (passend zur gewählten Schicht-Rolle)
    const tmpl = shiftTemplates.find(t => t.shortLabel.toLowerCase() === shiftRole.toLowerCase())
      ?? shiftTemplates[0] ?? INITIAL_SHIFT_TEMPLATES[0];

    const newShift: Shift = {
      id: `s_${Date.now()}`,
      employeeId, day, startHour, endHour,
      label: shiftRole,
      color: tmpl.color, bgColor: tmpl.bgColor, borderColor: tmpl.borderColor,
    };

    setShifts(prev => {
      const next = [...prev, newShift];
      const ist  = next.filter(s => s.employeeId === employeeId)
        .reduce((sum, s) => sum + s.endHour - s.startHour, 0);
      if (ist > emp.sollStunden && !abs) {
        const ot = ist - emp.sollStunden;
        toast.warning(`${emp.name} baut diese Woche ${ot}h Überstunden auf`, {
          description: "Arbeitszeitkonto wird am Wochenende aktualisiert.",
          duration: 5000,
        });
      }
      return next;
    });
    if (!abs) {
      toast.success(`Schicht für ${emp.name} eingetragen (${String(startHour).padStart(2,"0")}:00–${String(endHour).padStart(2,"0")}:00 Uhr)`, { duration: 3000 });
    }
  }, [shifts, dayAbsences]);

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const saveTemplate = useCallback((data: Omit<ShiftTemplate, "id"> & { id?: string }) => {
    if (data.id) {
      setShiftTemplates(prev => prev.map(t => t.id === data.id ? { ...t, ...data, id: t.id } : t));
      toast.success(`Vorlage „${data.label}" aktualisiert`);
    } else {
      const newT: ShiftTemplate = { ...data, id: `t_${Date.now()}` };
      setShiftTemplates(prev => [...prev, newT]);
      setSelectedTemplate(newT.id);
      toast.success(`Vorlage „${data.label}" erstellt`);
    }
    setTmplEditTarget(null);
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    const t = shiftTemplates.find(x => x.id === id);
    setShiftTemplates(prev => prev.filter(x => x.id !== id));
    if (selectedTemplate === id) setSelectedTemplate(null);
    toast.info(`Vorlage „${t?.label}" gelöscht`);
  }, [shiftTemplates, selectedTemplate]);

  const addRequest = useCallback((entry: Omit<AbsenceRequest, "id">) => {
    const newReq: AbsenceRequest = { ...entry, id: `a_${Date.now()}` };
    setRequests(prev => [newReq, ...prev]);
    toast.success(`Eintrag für ${entry.employeeName} wurde gespeichert`, { duration: 3500 });
  }, []);

  const approveRequest = useCallback((id: string) => {
    const r = requests.find(x => x.id === id);
    setRequests(prev => prev.map(x => x.id === id ? { ...x, status: "approved" } : x));
    toast.success(`Antrag von ${r?.employeeName} genehmigt`, { duration: 3000 });
  }, [requests]);

  const rejectRequest = useCallback((id: string) => {
    const r = requests.find(x => x.id === id);
    setRequests(prev => prev.map(x => x.id === id ? { ...x, status: "rejected" } : x));
    toast.error(`Antrag von ${r?.employeeName} abgelehnt`, { duration: 3000 });
  }, [requests]);

  // ── Render ─────────────────────────────────────────────────────────────────
  // Prefill aus ausgewählter Template-Vorlage für den SmartAssignSheet
  const smartPrefill = useMemo(() => {
    if (!selectedTemplate) return null;
    const t = shiftTemplates.find(x => x.id === selectedTemplate);
    return t ? { startHour: t.startHour, endHour: t.endHour, label: t.shortLabel } : null;
  }, [selectedTemplate, shiftTemplates]);

  // Mitarbeiter-Format für SmartAssignSheet (EmployeeHR-Typ)
  const employeesHR = useMemo(() =>
    EMPLOYEES.map(e => ({
      id: e.id, name: e.name, initials: e.initials,
      role: e.role, contractType: e.contractType,
      contractHours: e.contractHours, color: e.color,
      allowedRoles: e.allowedRoles,
    })), []);

  return (
    <>
    {/* Portals – direkt an document.body, damit position:fixed vom vollen Viewport gilt */}
    {createPortal(
      <>
        {/* SmartAssignSheet */}
        <SmartAssignSheet
          open={smartSheet.open}
          onClose={closeSmartSheet}
          targetDay={smartSheet.day}
          targetDate={smartSheet.date}
          employees={employeesHR}
          shifts={shifts}
          dayAbsences={dayAbsences}
          onAssign={handleSmartAssign}
          prefill={smartPrefill}
        />
        {/* TemplateEditModal */}
        {tmplEditTarget !== null && (
          <TemplateEditModal
            template={tmplEditTarget === "new" ? null : tmplEditTarget}
            onClose={() => setTmplEditTarget(null)}
            onSave={saveTemplate}
          />
        )}
        {/* NewAbsenceModal */}
        <NewAbsenceModal
          open={showNewEntry}
          onClose={() => setShowNewEntry(false)}
          onSave={addRequest}
          teamMembers={TEAM_MEMBERS}
        />
      </>,
      document.body
    )}
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "0.06em",
          textTransform: "uppercase", color: "#fff",
        }}>Personal- & Dienstplan</h2>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)",
        }}>{viewMode === "week" ? getWeekRange(weekStart) : monthStart.toLocaleString("de-DE", { month: "long", year: "numeric" })}</span>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KpiCard
          icon={Stethoscope}  label="Krankmeldungen (Woche)"
          value={krankmeldungen} sub={`${krankmeldungen === 1 ? "Mitarbeiter" : "Mitarbeiter"} krank gemeldet`}
          accent="#F87171"
        />
        <KpiCard
          icon={CalendarRange} label="Offene Urlaubsanträge"
          value={offeneAntraege} sub="Warten auf Genehmigung"
          accent="#60A5FA"
        />
        <KpiCard
          icon={Activity} label="Mitarbeiter im Überstunden-Bereich"
          value={ueberstundenEmp} sub="Überschreiten ihre Soll-Stunden"
          accent="#FBBF24"
        />
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", gap: "0" }}>
          {([
            { key: "dienstplan",    label: "Wochen-Dienstplan",             icon: Calendar },
            { key: "abwesenheiten", label: "Abwesenheiten & Urlaubsanträge", icon: TreePalm },
          ] as const).map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "12px 20px", background: "transparent", border: "none",
                  borderBottom: `2px solid ${active ? "var(--brand)" : "transparent"}`,
                  color: active ? "#fff" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.15s", marginBottom: "-1px",
                }}>
                <Icon size={13} style={{ color: active ? "var(--brand)" : "inherit" }} />
                {label}
                {key === "abwesenheiten" && offeneAntraege > 0 && (
                  <span style={{
                    background: "var(--brand)", color: "#fff", borderRadius: "9999px",
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.04em", padding: "1px 6px", lineHeight: "14px",
                    minWidth: "18px", textAlign: "center",
                  }}>{offeneAntraege}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: WOCHEN-DIENSTPLAN ─────────────────────────────────────── */}
      {activeTab === "dienstplan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
            padding: "14px 16px", borderRadius: "8px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {/* Period navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginRight: "8px" }}>
              <button onClick={prevPeriod} style={{
                width: "32px", height: "32px", borderRadius: "4px", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
              }}><ChevronLeft size={15} /></button>
              <div style={{
                padding: "0 12px", fontFamily: "var(--font-condensed)", fontSize: "12px",
                fontWeight: 700, letterSpacing: "0.06em", color: "#fff", whiteSpace: "nowrap",
                minWidth: viewMode === "month" ? "130px" : "60px", textAlign: "center",
              }}>{periodLabel}</div>
              <button onClick={nextPeriod} style={{
                width: "32px", height: "32px", borderRadius: "4px", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
              }}><ChevronRight size={15} /></button>
            </div>

            <div style={{ width: "1px", height: "28px", background: "rgba(255,255,255,0.08)" }} />

            {/* Shift template palette */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
              <span style={{
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
                marginRight: "2px", whiteSpace: "nowrap",
              }}>VORLAGE:</span>
              {shiftTemplates.map(t => (
                <TemplateChip
                  key={t.id}
                  template={t}
                  selected={selectedTemplate === t.id}
                  onSelect={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  onEdit={() => setTmplEditTarget(t)}
                  onDelete={() => deleteTemplate(t.id)}
                />
              ))}
              {/* Neue Vorlage */}
              <button
                onClick={() => setTmplEditTarget("new")}
                title="Neue Vorlage erstellen"
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "5px 9px", borderRadius: "4px", cursor: "pointer",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)"; e.currentTarget.style.color = "var(--brand)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
              >
                <Plus size={11} /> Neu
              </button>
            </div>

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

            {/* View toggle: Woche / Monat */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {([
                { mode: "week",  label: "Woche", Icon: CalendarDays },
                { mode: "month", label: "Monat", Icon: LayoutGrid   },
              ] as const).map(({ mode, label, Icon }) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 10px", borderRadius: "4px", cursor: "pointer",
                  background: viewMode === mode ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${viewMode === mode ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: viewMode === mode ? "var(--brand)" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  transition: "all 0.15s",
                }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {selectedTemplate && (
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
              }}>
                <Plus size={11} />
                Auf Zelle klicken
              </span>
            )}
          </div>

          {/* Month view */}
          {viewMode === "month" && (
            <MonthCalendarView
              monthStart={monthStart}
              employees={EMPLOYEES}
              shifts={shifts}
              dayAbsences={dayAbsences}
            />
          )}

          {/* Week Grid */}
          {viewMode === "week" && <div style={{
            borderRadius: "8px", overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.015)",
          }}>
            {/* Grid container – single CSS Grid for both header and rows */}
            <div style={{ overflowX: "auto" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "200px repeat(7, minmax(110px, 1fr))",
                minWidth: "980px",
              }}>
                {/* Header row */}
                {/* Empty corner */}
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  borderRight: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center",
                }}>
                  <Users size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span style={{
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "rgba(255,255,255,0.2)", marginLeft: "6px",
                  }}>MITARBEITER</span>
                </div>

                {/* Day headers */}
                {weekDays.map((date, di) => {
                  const today = isToday(date);
                  return (
                    <div key={di} style={{
                      padding: "10px 12px", textAlign: "center",
                      background: today ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      borderRight: di < 6 ? "1px solid rgba(255,255,255,0.07)" : "none",
                      borderTop: today ? "2px solid rgba(202,12,133,0.5)" : "2px solid transparent",
                    }}>
                      <div style={{
                        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: today ? "var(--brand)" : "rgba(255,255,255,0.5)",
                      }}>{WEEKDAYS[di]}</div>
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: "11px",
                        color: today ? "rgba(202,12,133,0.7)" : "rgba(255,255,255,0.3)",
                        marginTop: "1px",
                      }}>{fmtDate(date)}</div>
                    </div>
                  );
                })}

                {/* Employee rows */}
                {EMPLOYEES.map((emp, ei) => {
                  const ist   = computeIst(emp.id, shifts);
                  const soll  = emp.sollStunden;
                  const hs    = hoursStyle(ist, soll);
                  const pct   = Math.min(100, (ist / soll) * 100);
                  const isLast = ei === EMPLOYEES.length - 1;

                  return (
                    <React.Fragment key={emp.id}>
                      {/* Employee info cell */}
                      <div style={{
                        padding: "12px 14px",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                        borderRight: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.01)",
                        display: "flex", flexDirection: "column", gap: "8px",
                        minHeight: "110px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          {/* Avatar */}
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                            background: `${emp.color}22`, border: `1.5px solid ${emp.color}55`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{
                              fontFamily: "var(--font-display)", fontSize: "11px",
                              letterSpacing: "0.04em", color: emp.color,
                            }}>{emp.initials}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                              letterSpacing: "0.06em", color: "#fff",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>{emp.name.split(" ")[0]} {emp.name.split(" ")[1]?.[0]}.</div>
                            <div style={{
                              fontFamily: "var(--font-body)", fontSize: "10px",
                              color: "rgba(255,255,255,0.3)",
                            }}>{emp.role}</div>
                          </div>

                          {/* Minijob info icon */}
                          {emp.contractType === "minijob" && (
                            <Tooltip text="Minijob: Maximal ca. 43 Stunden/Monat bei 538€-Basis beachten!">
                              <Info size={13} style={{ color: "#FBBF24", cursor: "help", flexShrink: 0 }} />
                            </Tooltip>
                          )}
                        </div>

                        {/* Hours badge + progress */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{
                              fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                              letterSpacing: "0.1em", textTransform: "uppercase",
                              color: "rgba(255,255,255,0.2)",
                            }}>{contractLabel(emp.contractType)}</span>
                            <span style={{
                              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                              letterSpacing: "0.04em",
                              padding: "1px 7px", borderRadius: "3px",
                              background: hs.bg, border: `1px solid ${hs.border}`,
                              color: hs.color,
                            }}>{ist}/{soll}h</span>
                          </div>
                          <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: "2px", transition: "width 0.3s ease",
                              width: `${pct}%`,
                              background: pct > 115 ? "#F87171" : pct > 100 ? "#FCD34D" : pct >= 85 ? "#34D399" : "rgba(255,255,255,0.2)",
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Day cells */}
                      {[0, 1, 2, 3, 4, 5, 6].map(day => {
                        const dayShifts  = shifts.filter(s => s.employeeId === emp.id && s.day === day);
                        const absence    = dayAbsences.find(a => a.employeeId === emp.id && a.day === day);
                        const isDropOver = dragOverCell?.empId === emp.id && dragOverCell?.day === day;
                        const weekend    = day >= 5;

                        return (
                          <div
                            key={day}
                            onClick={() => {
                              if (dayShifts.length === 0) {
                                const date = weekDays[day];
                                openSmartSheet(day, date);
                              }
                            }}
                            onDragOver={e => handleDragOver(e, emp.id, day)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, emp.id, day)}
                            style={{
                              position: "relative", minHeight: "110px",
                              borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                              borderRight: day < 6 ? "1px solid rgba(255,255,255,0.07)" : "none",
                              background: isDropOver
                                ? "rgba(202,12,133,0.08)"
                                : absence
                                  ? absence.type === "krank"
                                    ? "rgba(239,68,68,0.05)"
                                    : "rgba(96,165,250,0.04)"
                                  : weekend
                                    ? "rgba(255,255,255,0.008)"
                                    : "transparent",
                              outline: isDropOver ? "2px dashed rgba(202,12,133,0.4)" : "none",
                              outlineOffset: "-2px",
                              cursor: dayShifts.length === 0 ? "pointer" : "default",
                              padding: "6px",
                              display: "flex", flexDirection: "column", gap: "4px",
                              transition: "background 0.15s",
                            }}
                          >
                            {/* Absence overlay label */}
                            {absence && (
                              <div style={{
                                position: "absolute", top: "5px", right: "5px",
                                display: "flex", alignItems: "center", gap: "3px",
                                padding: "2px 6px", borderRadius: "3px",
                                background: absence.type === "krank"
                                  ? "rgba(239,68,68,0.15)"
                                  : "rgba(96,165,250,0.12)",
                                border: absence.type === "krank"
                                  ? "1px solid rgba(239,68,68,0.3)"
                                  : "1px solid rgba(96,165,250,0.25)",
                                zIndex: 1,
                              }}>
                                {absence.type === "krank"
                                  ? <Stethoscope size={9} style={{ color: "#F87171" }} />
                                  : <TreePalm size={9} style={{ color: "#60A5FA" }} />}
                                <span style={{
                                  fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                                  letterSpacing: "0.08em", textTransform: "uppercase",
                                  color: absence.type === "krank" ? "#F87171" : "#60A5FA",
                                }}>{absence.type === "krank" ? "Krank" : "Urlaub"}</span>
                              </div>
                            )}

                            {/* Diagonal stripes for absence background */}
                            {absence && (
                              <div style={{
                                position: "absolute", inset: 0, opacity: 0.06,
                                backgroundImage: `repeating-linear-gradient(
                                  -45deg,
                                  ${absence.type === "krank" ? "#F87171" : "#60A5FA"} 0px,
                                  ${absence.type === "krank" ? "#F87171" : "#60A5FA"} 1px,
                                  transparent 1px,
                                  transparent 8px
                                )`,
                                pointerEvents: "none",
                              }} />
                            )}

                            {/* Shift blocks */}
                            {dayShifts.map(shift => (
                              <ShiftBlock
                                key={shift.id}
                                shift={shift}
                                onRemove={() => removeShift(shift.id)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                              />
                            ))}

                            {/* Empty cell hint */}
                            {dayShifts.length === 0 && !absence && selectedTemplate && (
                              <div style={{
                                position: "absolute", inset: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: 0, transition: "opacity 0.15s",
                              }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                              >
                                <Plus size={16} style={{ color: "rgba(255,255,255,0.15)" }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{
              display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
              padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
            }}>
              <span style={{
                fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
              }}>LEGENDE:</span>
              {[
                { label: "Krank",  color: "#F87171", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)" },
                { label: "Urlaub", color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.25)" },
                { label: "Überstunden", color: "#FCD34D", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{
                    width: "10px", height: "10px", borderRadius: "2px",
                    background: item.bg, border: `1px solid ${item.border}`,
                  }} />
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "10px",
                    color: item.color,
                  }}>{item.label}</span>
                </div>
              ))}
              <span style={{
                fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)",
                marginLeft: "auto",
              }}>
                Schichten per Drag & Drop zwischen Zellen verschieben
              </span>
            </div>
          </div>}

        </div>
      )}

      {/* ── TAB 2: ABWESENHEITEN & URLAUBSANTRÄGE ──────────────────────── */}
      {activeTab === "abwesenheiten" && (
        <>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-4px" }}>
          <button
            onClick={() => setShowNewEntry(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "9px 18px", borderRadius: "6px", cursor: "pointer",
              background: "var(--brand)", border: "none", color: "#fff",
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              transition: "filter 0.15s, transform 0.1s",
              boxShadow: "0 0 16px rgba(202,12,133,0.25)",
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
          >
            <FilePen size={13} />
            Neuer Eintrag
          </button>
        </div>

        <div style={{
          borderRadius: "8px", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.015)",
        }}>
          {/* Table header */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "820px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.025)" }}>
                  {["Mitarbeiter", "Typ", "Zeitraum", "Verrechnung", "Status", "Aktionen"].map(col => (
                    <th key={col} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.07)",
                      whiteSpace: "nowrap",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, ri) => {
                  const typeInfo = absenceTypeLabel(r.type);
                  const isLast   = ri === requests.length - 1;
                  return (
                    <tr key={r.id}
                      style={{
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.018)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Mitarbeiter */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                            background: `${EMPLOYEES.find(e => e.initials === r.initials)?.color ?? "#fff"}22`,
                            border: `1.5px solid ${EMPLOYEES.find(e => e.initials === r.initials)?.color ?? "#fff"}55`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{
                              fontFamily: "var(--font-display)", fontSize: "10px", letterSpacing: "0.04em",
                              color: EMPLOYEES.find(e => e.initials === r.initials)?.color ?? "#fff",
                            }}>{r.initials}</span>
                          </div>
                          <span style={{
                            fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                            letterSpacing: "0.06em", color: "#fff", whiteSpace: "nowrap",
                          }}>{r.employeeName}</span>
                        </div>
                      </td>

                      {/* Typ */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "3px 9px", borderRadius: "4px",
                          background: typeInfo.bg, color: typeInfo.color,
                          fontFamily: "var(--font-condensed)", fontSize: "10px",
                          fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                          border: `1px solid ${typeInfo.color}33`,
                          whiteSpace: "nowrap",
                        }}>
                          {r.type === "krank"   && <Stethoscope size={10} />}
                          {r.type === "urlaub"  && <TreePalm size={10} />}
                          {r.type === "freizeit" && <Clock size={10} />}
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Zeitraum */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={12} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                          <span style={{
                            fontFamily: "var(--font-body)", fontSize: "12px",
                            color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap",
                          }}>
                            {r.from === r.to ? r.from : `${r.from} – ${r.to}`}
                          </span>
                          <span style={{
                            padding: "1px 6px", borderRadius: "3px",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                            fontFamily: "var(--font-condensed)", fontSize: "9px",
                            fontWeight: 700, letterSpacing: "0.08em",
                            color: "rgba(255,255,255,0.3)",
                          }}>{r.days}T</span>
                        </div>
                      </td>

                      {/* Verrechnung */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "11px",
                          color: "rgba(255,255,255,0.4)",
                        }}>{verrechnung(r)}</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Aktionen */}
                      <td style={{ padding: "14px 16px" }}>
                        {r.status === "pending" ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => approveRequest(r.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "6px 12px", borderRadius: "4px", cursor: "pointer",
                                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                                color: "#34D399", fontFamily: "var(--font-condensed)",
                                fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                                textTransform: "uppercase", transition: "all 0.15s", whiteSpace: "nowrap",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(52,211,153,0.18)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(52,211,153,0.1)"; }}
                            ><Check size={10} /> Genehmigen</button>
                            <button onClick={() => rejectRequest(r.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "6px 12px", borderRadius: "4px", cursor: "pointer",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                                color: "#F87171", fontFamily: "var(--font-condensed)",
                                fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                                textTransform: "uppercase", transition: "all 0.15s", whiteSpace: "nowrap",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                            ><Ban size={10} /> Ablehnen</button>
                          </div>
                        ) : (
                          <span style={{
                            fontFamily: "var(--font-body)", fontSize: "11px",
                            color: "rgba(255,255,255,0.2)",
                          }}>–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.01)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.2)",
            }}>{requests.length} Einträge · {offeneAntraege} offen</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["pending", "approved", "rejected"] as const).map(st => (
                <div key={st} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <StatusBadge status={st} small />
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "10px",
                    color: "rgba(255,255,255,0.25)",
                  }}>{requests.filter(r => r.status === st).length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </motion.div>
    </>
  );
}

// ── New Absence Modal ─────────────────────────────────────────────────────────
interface NewAbsenceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: Omit<AbsenceRequest, "id">) => void;
  /** Mitarbeiterliste aus Team & Rechte (TEAM_MEMBERS) */
  teamMembers: typeof TEAM_MEMBERS;
}

const EMPTY_FORM = {
  employeeId: "",
  type: "urlaub" as AbsenceType,
  from: "",
  to: "",
  status: "approved" as AbsenceStatus,
  notes: "",
};

function NewAbsenceModal({ open, onClose, onSave, teamMembers }: NewAbsenceModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof EMPTY_FORM, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  // Compute number of working days between two ISO date strings (Mon–Sat)
  const computeDays = (from: string, to: string): number => {
    if (!from || !to) return 0;
    const a = new Date(from); const b = new Date(to);
    if (b < a) return 0;
    let count = 0;
    const cur = new Date(a);
    while (cur <= b) {
      if (cur.getDay() !== 0) count++; // exclude Sundays
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const days = computeDays(form.from, form.to);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employeeId)       e.employeeId = "Bitte Mitarbeiter wählen";
    if (!form.from)             e.from       = "Bitte Startdatum wählen";
    if (!form.to)               e.to         = "Bitte Enddatum wählen";
    if (form.from && form.to && form.to < form.from) e.to = "Enddatum vor Startdatum";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const member = teamMembers.find(x => x.id === form.employeeId);
    const memberName = member?.name ?? form.employeeId;
    const memberInitials = memberName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${d}.${m}.${y}`;
    };
    onSave({
      employeeName: memberName,
      initials:     memberInitials,
      type:         form.type,
      from:         fmt(form.from),
      to:           fmt(form.to),
      days:         days || 1,
      status:       form.status,
    });
    setForm({ ...EMPTY_FORM });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "6px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: "5px",
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
  };
  const errStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)", fontSize: "11px", color: "#F87171", marginTop: "4px",
  };

  const typeOptions: { value: AbsenceType; label: string; color: string }[] = [
    { value: "urlaub",       label: "Urlaub",       color: "#60A5FA" },
    { value: "krank",        label: "Krankmeldung",  color: "#F87171" },
    { value: "freizeit",     label: "Freizeit",      color: "#A78BFA" },
    { value: "sonderurlaub", label: "Sonderurlaub",  color: "#FBBF24" },
  ];
  const statusOptions: { value: AbsenceStatus; label: string }[] = [
    { value: "approved", label: "Direkt genehmigt" },
    { value: "pending",  label: "Ausstehend (zur Prüfung)" },
    { value: "rejected", label: "Abgelehnt" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)", zIndex: 9998,
            }}
          />

          {/* Centering container – separate from Framer transforms */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "min(520px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 48px)",
              display: "flex", flexDirection: "column",
              background: "#131313",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "2px solid var(--brand)",
              borderRadius: "10px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(202,12,133,0.08)",
              overflow: "hidden", pointerEvents: "auto",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FilePen size={15} style={{ color: "var(--brand)" }} />
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "#fff",
                }}>Abwesenheit eintragen</span>
              </div>
              <button onClick={handleClose} style={{
                width: "30px", height: "30px", borderRadius: "6px", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.45)",
              }}><X size={14} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>

              {/* Mitarbeiter */}
              <div>
                <label style={labelStyle}>Mitarbeiter *</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.employeeId}
                    onChange={e => set("employeeId", e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: "none", paddingRight: "32px", cursor: "pointer",
                      borderColor: errors.employeeId ? "#F87171" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <option value="" style={{ background: "#1a1a1a" }}>— Mitarbeiter wählen —</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id} style={{ background: "#1a1a1a" }}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{
                    position: "absolute", right: "11px", top: "50%",
                    transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none",
                  }} />
                </div>
                {errors.employeeId && <div style={errStyle}>{errors.employeeId}</div>}
              </div>

              {/* Typ */}
              <div>
                <label style={labelStyle}>Abwesenheitstyp *</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {typeOptions.map(opt => {
                    const sel = form.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("type", opt.value)}
                        style={{
                          flex: 1, minWidth: "100px",
                          padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                          background: sel ? `${opt.color}18` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${sel ? opt.color + "55" : "rgba(255,255,255,0.09)"}`,
                          outline: sel ? `2px solid ${opt.color}44` : "none",
                          outlineOffset: "1px",
                          color: sel ? opt.color : "rgba(255,255,255,0.4)",
                          fontFamily: "var(--font-condensed)", fontSize: "11px",
                          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                          transition: "all 0.14s",
                        }}
                      >{opt.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Zeitraum */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Von *</label>
                  <input
                    type="date"
                    value={form.from}
                    onChange={e => set("from", e.target.value)}
                    style={{
                      ...inputStyle,
                      colorScheme: "dark",
                      borderColor: errors.from ? "#F87171" : "rgba(255,255,255,0.1)",
                    }}
                  />
                  {errors.from && <div style={errStyle}>{errors.from}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Bis *</label>
                  <input
                    type="date"
                    value={form.to}
                    min={form.from || undefined}
                    onChange={e => set("to", e.target.value)}
                    style={{
                      ...inputStyle,
                      colorScheme: "dark",
                      borderColor: errors.to ? "#F87171" : "rgba(255,255,255,0.1)",
                    }}
                  />
                  {errors.to && <div style={errStyle}>{errors.to}</div>}
                </div>
              </div>

              {/* Days preview */}
              {form.from && form.to && !errors.to && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 12px", borderRadius: "6px",
                  background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.18)",
                }}>
                  <Calendar size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)",
                  }}>
                    <strong style={{ color: "#fff" }}>{days} {days === 1 ? "Tag" : "Tage"}</strong>
                    {" "}(Montag–Samstag) ·{" "}
                    {absenceTypeLabel(form.type).label}
                    {form.type === "urlaub" && days > 0 && (
                      <> · zieht <strong style={{ color: "#fff" }}>{days} Urlaubstag{days !== 1 ? "e" : ""}</strong> ab</>
                    )}
                  </span>
                </div>
              )}

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.status}
                    onChange={e => set("status", e.target.value as AbsenceStatus)}
                    style={{ ...inputStyle, appearance: "none", paddingRight: "32px", cursor: "pointer" }}
                  >
                    {statusOptions.map(o => (
                      <option key={o.value} value={o.value} style={{ background: "#1a1a1a" }}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{
                    position: "absolute", right: "11px", top: "50%",
                    transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none",
                  }} />
                </div>
              </div>

              {/* Notiz */}
              <div>
                <label style={labelStyle}>Notiz (optional)</label>
                <textarea
                  rows={2}
                  placeholder="z.B. Arztbestätigung liegt vor, Admin-Eintrag…"
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  style={{
                    ...inputStyle, resize: "vertical", minHeight: "56px",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: "10px",
              padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.01)",
            }}>
              <button onClick={handleClose} style={{
                padding: "9px 18px", borderRadius: "6px", cursor: "pointer",
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                transition: "border-color 0.15s, color 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >Abbrechen</button>
              <button onClick={handleSave} style={{
                padding: "9px 20px", borderRadius: "6px", cursor: "pointer",
                background: "var(--brand)", border: "none", color: "#fff",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: "6px",
                transition: "filter 0.15s, transform 0.1s",
                boxShadow: "0 0 14px rgba(202,12,133,0.25)",
              }}
                onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
              ><Check size={12} /> Eintrag speichern</button>
            </div>
          </motion.div>
          </div>{/* /centering container */}
        </>
      )}
    </AnimatePresence>
  );
}

// ── Shift Block Sub-Component ──────────────────────────────────────────────────
function ShiftBlock({
  shift, onRemove, onDragStart, onDragEnd,
}: {
  shift: Shift;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hours = shift.endHour - shift.startHour;
  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(e, shift.id); }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: "5px", padding: "6px 8px",
        background: shift.bgColor, border: `1px solid ${shift.borderColor}`,
        cursor: "grab", userSelect: "none", zIndex: 2,
        transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: hovered
          ? `0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px ${shift.borderColor}`
          : "0 1px 4px rgba(0,0,0,0.2)",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          position: "absolute", top: "3px", right: "3px",
          width: "16px", height: "16px", borderRadius: "3px",
          background: "rgba(0,0,0,0.3)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.5)",
          opacity: hovered ? 1 : 0, transition: "opacity 0.12s, background 0.12s",
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(239,68,68,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(0,0,0,0.3)"; }}
      >
        <X size={9} />
      </button>
      <div style={{
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase", color: shift.color,
        paddingRight: "12px",
      }}>{shift.label}</div>
      <div style={{
        display: "flex", alignItems: "center", gap: "3px", marginTop: "2px",
      }}>
        <Clock size={9} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-body)", fontSize: "10px",
          color: "rgba(255,255,255,0.45)",
        }}>
          {String(shift.startHour).padStart(2, "0")}:00–{String(shift.endHour).padStart(2, "0")}:00
        </span>
        <span style={{
          fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          color: shift.color, opacity: 0.7, marginLeft: "2px",
        }}>{hours}h</span>
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, small = false }: { status: AbsenceStatus; small?: boolean }) {
  const cfg = {
    pending:  { label: "Ausstehend", color: "#FBBF24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)", icon: Clock },
    approved: { label: "Genehmigt", color: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)", icon: CheckCircle2 },
    rejected: { label: "Abgelehnt", color: "#F87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",  icon: AlertTriangle },
  }[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: small ? "3px" : "5px",
      padding: small ? "1px 6px" : "3px 9px", borderRadius: "4px",
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontFamily: "var(--font-condensed)", fontSize: small ? "9px" : "10px",
      fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      <Icon size={small ? 8 : 10} />
      {!small && cfg.label}
    </span>
  );
}

// ── ISO Week helper ────────────────────────────────────────────────────────────
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ── ArbZG Pausenregel (§4 ArbZG) ──────────────────────────────────────────────
function getArbZGInfo(hours: number): { pauseMin: number; netto: number; regel: string; color: string } {
  if (hours > 10) return {
    pauseMin: 45, netto: hours - 0.75,
    regel: `Achtung: Über 10h Arbeitszeit ist nur mit Ausnahmegenehmigung erlaubt (§3 ArbZG)`,
    color: "#F87171",
  };
  if (hours > 9) return {
    pauseMin: 45, netto: hours - 0.75,
    regel: `Über 9h → 45 Min. Pflichtpause (§4 ArbZG)`,
    color: "#FBBF24",
  };
  if (hours >= 6) return {
    pauseMin: 30, netto: hours - 0.5,
    regel: `6–9h → 30 Min. Pflichtpause (§4 ArbZG)`,
    color: "#60A5FA",
  };
  return {
    pauseMin: 0, netto: hours,
    regel: `Unter 6h → keine Pflichtpause erforderlich`,
    color: "#34D399",
  };
}

// ── Template Chip ──────────────────────────────────────────────────────────────
function TemplateChip({
  template, selected, onSelect, onEdit, onDelete,
}: {
  template: ShiftTemplate;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onSelect}
        title={`${template.label} – Klicke zum Auswählen`}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 10px",
          paddingRight: hovered ? "50px" : "10px",
          borderRadius: "4px", cursor: "pointer",
          background: selected ? template.bgColor : "rgba(255,255,255,0.03)",
          border: `1px solid ${selected ? template.borderColor : "rgba(255,255,255,0.08)"}`,
          outline: selected ? `2px solid ${template.borderColor}` : "none",
          outlineOffset: "1px", transition: "all 0.15s",
          fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.06em", color: selected ? template.color : "rgba(255,255,255,0.35)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{
          width: "8px", height: "8px", borderRadius: "2px", flexShrink: 0,
          background: template.color, opacity: selected ? 1 : 0.5,
        }} />
        {template.label}
      </button>
      {/* Edit / Delete icons – visible on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="chip-actions"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "absolute", right: "4px",
              display: "flex", gap: "3px", alignItems: "center",
            }}
          >
            <button
              title="Vorlage bearbeiten"
              onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{
                width: "20px", height: "20px", borderRadius: "3px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.6)", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            ><Pencil size={9} /></button>
            <button
              title="Vorlage löschen"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{
                width: "20px", height: "20px", borderRadius: "3px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#F87171", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            ><Trash2 size={9} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Template Edit Modal ────────────────────────────────────────────────────────
function TemplateEditModal({
  template, onClose, onSave,
}: {
  template: ShiftTemplate | null;
  onClose: () => void;
  onSave: (data: Omit<ShiftTemplate, "id"> & { id?: string }) => void;
}) {
  const isNew = !template;
  const [label,      setLabel]      = useState(template?.label      ?? "");
  const [shortLabel, setShortLabel] = useState(template?.shortLabel ?? "");
  const [startHour,  setStartHour]  = useState<number>(template?.startHour ?? 8);
  const [endHour,    setEndHour]    = useState<number>(template?.endHour   ?? 16);
  const [colorIdx,   setColorIdx]   = useState(() => {
    if (!template) return 0;
    const idx = PRESET_COLORS.findIndex(c => c.color === template.color);
    return idx >= 0 ? idx : 0;
  });

  const duration = Math.max(0, endHour - startHour);
  const arbzg = getArbZGInfo(duration);
  const selectedColor = PRESET_COLORS[colorIdx] ?? PRESET_COLORS[0];

  const hourOptions = Array.from({ length: 25 }, (_, i) => i);
  const pad = (n: number) => String(n).padStart(2, "0");

  const handleSave = () => {
    if (!label.trim()) { toast.error("Bitte einen Namen eingeben"); return; }
    if (endHour <= startHour) { toast.error("Endzeit muss nach Startzeit liegen"); return; }
    onSave({
      id: template?.id,
      label: label.trim(),
      shortLabel: (shortLabel.trim() || label.trim().split(" ")[0]).slice(0, 10),
      startHour, endHour,
      color:       selectedColor.color,
      bgColor:     selectedColor.bg,
      borderColor: selectedColor.border,
    });
  };

  const inputS: React.CSSProperties = {
    width: "100%", padding: "8px 11px", borderRadius: "6px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };
  const labelS: React.CSSProperties = {
    display: "block", marginBottom: "5px",
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
  };
  const selectS: React.CSSProperties = {
    ...inputS, appearance: "none", cursor: "pointer",
    paddingRight: "28px", colorScheme: "dark",
  };

  return (
    <AnimatePresence>
      <motion.div
        key="tmpl-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)", zIndex: 9998,
        }}
      />
      {/* Centering container */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
      <motion.div
        key="tmpl-panel"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "min(500px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          display: "flex", flexDirection: "column",
          background: "#131313",
          border: "1px solid rgba(255,255,255,0.1)",
          borderTop: "2px solid var(--brand)",
          borderRadius: "10px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(202,12,133,0.08)",
          overflow: "hidden", pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <Palette size={14} style={{ color: "var(--brand)" }} />
            <span style={{
              fontFamily: "var(--font-display)", fontSize: "15px", letterSpacing: "0.08em",
              textTransform: "uppercase", color: "#fff",
            }}>{isNew ? "Neue Vorlage" : "Vorlage bearbeiten"}</span>
          </div>
          <button onClick={onClose} style={{
            width: "28px", height: "28px", borderRadius: "5px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
          }}><X size={13} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>

          {/* Name */}
          <div>
            <label style={labelS}>Name *</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="z.B. Theke 08–14h"
              style={inputS}
            />
          </div>

          {/* Kurzname */}
          <div>
            <label style={labelS}>Kurzname (im Grid)</label>
            <input
              value={shortLabel}
              onChange={e => setShortLabel(e.target.value)}
              placeholder={label.split(" ")[0] || "Kurz"}
              maxLength={10}
              style={inputS}
            />
          </div>

          {/* Zeit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelS}>Von (Uhr)</label>
              <div style={{ position: "relative" }}>
                <select value={startHour} onChange={e => setStartHour(Number(e.target.value))} style={selectS}>
                  {hourOptions.map(h => (
                    <option key={h} value={h} style={{ background: "#1a1a1a" }}>{pad(h)}:00 Uhr</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
              </div>
            </div>
            <div>
              <label style={labelS}>Bis (Uhr)</label>
              <div style={{ position: "relative" }}>
                <select value={endHour} onChange={e => setEndHour(Number(e.target.value))} style={selectS}>
                  {hourOptions.filter(h => h > startHour).map(h => (
                    <option key={h} value={h} style={{ background: "#1a1a1a" }}>{pad(h)}:00 Uhr</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
              </div>
            </div>
          </div>

          {/* ArbZG Info */}
          {duration > 0 && (
            <div style={{
              borderRadius: "7px", padding: "12px 14px",
              background: `${arbzg.color}10`, border: `1px solid ${arbzg.color}30`,
              display: "flex", flexDirection: "column", gap: "8px",
            }}>
              <div style={{
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", color: arbzg.color,
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <Clock size={11} /> Arbeitszeitgesetz (§4 ArbZG)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Bruttozeit", value: `${duration}h` },
                  { label: "Pflichtpause", value: arbzg.pauseMin > 0 ? `${arbzg.pauseMin} Min.` : "Keine" },
                  { label: "Netto-Arbeitszeit", value: `${arbzg.netto % 1 === 0 ? arbzg.netto : arbzg.netto.toFixed(2)}h` },
                ].map(({ label: lbl, value }) => (
                  <div key={lbl} style={{
                    background: "rgba(0,0,0,0.2)", borderRadius: "5px", padding: "8px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "3px" }}>{lbl}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: arbzg.color, letterSpacing: "0.04em" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                {arbzg.regel}
              </div>
            </div>
          )}

          {/* Farbe */}
          <div>
            <label style={labelS}>Farbe</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  title={c.color}
                  style={{
                    width: "28px", height: "28px", borderRadius: "5px", cursor: "pointer",
                    background: c.bg, border: `2px solid ${i === colorIdx ? c.color : "transparent"}`,
                    outline: i === colorIdx ? `2px solid ${c.color}55` : "none",
                    outlineOffset: "2px", transition: "all 0.12s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: c.color, display: "block" }} />
                </button>
              ))}
            </div>
            {/* Preview */}
            <div style={{
              marginTop: "10px", padding: "8px 12px", borderRadius: "5px",
              background: selectedColor.bg, border: `1px solid ${selectedColor.border}`,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase", color: selectedColor.color,
              }}>{(shortLabel || label || "Vorschau").slice(0, 10)}</span>
              {duration > 0 && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                  {pad(startHour)}:00–{pad(endHour)}:00 · {duration}h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: "10px",
          padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.01)", flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: "6px", cursor: "pointer",
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>Abbrechen</button>
          <button onClick={handleSave} style={{
            padding: "8px 18px", borderRadius: "6px", cursor: "pointer",
            background: "var(--brand)", border: "none", color: "#fff",
            fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: "6px",
            boxShadow: "0 0 14px rgba(202,12,133,0.25)",
          }}>
            <Check size={12} /> {isNew ? "Erstellen" : "Speichern"}
          </button>
        </div>
      </motion.div>
      </div>{/* /centering container */}
    </AnimatePresence>
  );
}

// ── Month Calendar View ────────────────────────────────────────────────────────
function MonthCalendarView({
  monthStart, employees, shifts, dayAbsences,
}: {
  monthStart: Date;
  employees: Employee[];
  shifts: Shift[];
  dayAbsences: DayAbsence[];
}) {
  const weeks = useMemo(() => {
    const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const startMonday = getMonday(new Date(monthStart));
    const result: Date[][] = [];
    let curr = new Date(startMonday);
    while (curr <= lastDay) {
      result.push(Array.from({ length: 7 }, (_, i) => addDays(curr, i)));
      curr = addDays(curr, 7);
    }
    return result;
  }, [monthStart]);

  // Map JS weekday to our 0=Mon index
  const toWeekIdx = (d: Date) => (d.getDay() + 6) % 7;

  return (
    <div style={{
      borderRadius: "8px", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.015)",
    }}>
      {/* Employee legend */}
      <div style={{
        display: "flex", gap: "12px", flexWrap: "wrap",
        padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{
          fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
          alignSelf: "center", marginRight: "4px",
        }}>LEGENDE:</span>
        {employees.map(emp => (
          <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: emp.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              {emp.initials} – {emp.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: "640px" }}>
          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(255,255,255,0.02)" }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                padding: "8px 6px", textAlign: "center",
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: i >= 5 ? "rgba(202,12,133,0.5)" : "rgba(255,255,255,0.3)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                borderRight: i < 6 ? "1px solid rgba(255,255,255,0.07)" : "none",
              }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {week.map((date, di) => {
                const inMonth = date.getMonth() === monthStart.getMonth();
                const today = isToday(date);
                const wIdx = toWeekIdx(date);
                const dayShifts = shifts.filter(s => s.day === wIdx);
                const dayAbs = dayAbsences.filter(a => a.day === wIdx);
                const isLastWeek = wi === weeks.length - 1;
                const weekend = di >= 5;

                return (
                  <div key={di} style={{
                    minHeight: "88px", padding: "6px",
                    borderBottom: isLastWeek ? "none" : "1px solid rgba(255,255,255,0.05)",
                    borderRight: di < 6 ? "1px solid rgba(255,255,255,0.07)" : "none",
                    borderTop: today ? "2px solid rgba(202,12,133,0.45)" : "2px solid transparent",
                    background: today
                      ? "rgba(202,12,133,0.05)"
                      : weekend
                        ? "rgba(255,255,255,0.006)"
                        : "transparent",
                    opacity: inMonth ? 1 : 0.3,
                    transition: "background 0.15s",
                  }}>
                    {/* Day number */}
                    <div style={{
                      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: today ? "var(--brand)" : inMonth ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                      marginBottom: "4px",
                    }}>{date.getDate()}</div>

                    {/* Shift badges */}
                    {dayShifts.map(s => {
                      const emp = employees.find(e => e.id === s.employeeId);
                      if (!emp) return null;
                      const isAbsent = dayAbs.some(a => a.employeeId === s.employeeId);
                      return (
                        <div key={s.id} style={{
                          display: "flex", alignItems: "center", gap: "3px",
                          padding: "2px 5px", borderRadius: "3px", marginBottom: "2px",
                          background: isAbsent ? "rgba(239,68,68,0.08)" : s.bgColor,
                          border: `1px solid ${isAbsent ? "rgba(239,68,68,0.22)" : s.borderColor}`,
                          opacity: isAbsent ? 0.55 : 1,
                        }}>
                          <div style={{
                            width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                            background: emp.color,
                          }} />
                          <span style={{
                            fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                            letterSpacing: "0.03em",
                            color: isAbsent ? "#F87171" : s.color,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            maxWidth: "70px",
                          }}>{emp.initials} {s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.01)",
        fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)",
      }}>
        {monthStart.toLocaleString("de-DE", { month: "long", year: "numeric" })} · Muster-Wochenplan (wird für alle Wochen angezeigt)
      </div>
    </div>
  );
}

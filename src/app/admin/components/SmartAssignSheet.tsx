/**
 * SmartAssignSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-over Panel (von rechts) für die Schicht-Zuweisung mit Smart Assistant.
 *
 * Bereich A: Schicht-Konfiguration (Rolle, Datum, Von/Bis, Dauer)
 * Bereich B: KI-Vorschläge in 3 Gruppen:
 *   🟢 Empfohlen  – kein Konflikt, korrekte Rolle, Stunden im Rahmen
 *   🟡 Möglich    – kein Terminkonflikt, aber Überstunden
 *   🔴 Konflikte  – Urlaub/Krank, Doppelschicht, falsche Rolle + Override
 *
 * BACKEND-MIGRATION-KOMMENTAR:
 * Der Algorithmus (evaluateEmployee) spiegelt die PHP-Queries 1:1 wider:
 *   1. SELECT FROM staff_absences WHERE staff_id=? AND date=?  → hasAbsence
 *   2. SELECT FROM shifts WHERE staff_id=? AND day=? AND ((start<endNew AND end>startNew)) → hasOverlap
 *   3. Mitarbeiter-Rollen-Check: staff.allowed_roles LIKE '%role%'    → hasRoleMismatch
 *   4. SUM(end_hour - start_hour) FROM shifts WHERE week=? → currentHours
 *   5. currentHours + newDuration > contractHours                      → isOvertime
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  X, Sparkles, CheckCircle2, AlertTriangle, XCircle,
  Clock, Calendar, ChevronDown, ShieldAlert, UserCheck,
  Zap, ArrowRight,
} from 'lucide-react';

// ── Types (lokal – spiegeln die Typen aus AdminPersonalPlanung wider) ─────────
export type ContractType = 'vollzeit' | 'teilzeit' | 'minijob' | 'freelancer' | 'werkstudent';

export interface EmployeeHR {
  id: string;
  name: string;
  initials: string;
  role: string;                   // Primäre Job-Rolle (z.B. "Trainer")
  contractType: ContractType;
  contractHours: number;          // Vertragsst./Woche (bei Minijob: Monat)
  color: string;
  allowedRoles: string[];         // Erlaubte Schichtrollen: ["Theke", "Training"]
}

export interface ShiftEntry {
  id: string;
  employeeId: string;
  day: number;
  startHour: number;
  endHour: number;
}

export interface DayAbsenceEntry {
  employeeId: string;
  day: number;
  type: 'krank' | 'urlaub';
}

export interface AssignPayload {
  employeeId: string;
  day: number;
  startHour: number;
  endHour: number;
  shiftRole: string;
  override?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Ziel-Zelle (Wochentag 0–6) die der Admin angeklickt hat */
  targetDay: number | null;
  /** ISO-Datum des Ziel-Tags (nur zur Anzeige) */
  targetDate: Date | null;
  employees: EmployeeHR[];
  shifts: ShiftEntry[];
  dayAbsences: DayAbsenceEntry[];
  onAssign: (payload: AssignPayload) => void;
  /** Vorausgefüllte Schicht-Vorlage (optional, aus Template-Palette) */
  prefill?: { startHour: number; endHour: number; label: string } | null;
}

// ── Schichtrollen-Optionen ─────────────────────────────────────────────────────
const SHIFT_ROLES = [
  { value: 'Theke',    label: 'Theke / Empfang' },
  { value: 'Training', label: 'Training' },
  { value: 'Coaching', label: 'Coaching / PT' },
  { value: 'Empfang',  label: 'Empfang' },
  { value: 'Früh',     label: 'Frühdienst' },
  { value: 'Spät',     label: 'Spätdienst' },
  { value: 'Reinigung',label: 'Reinigung' },
];

// ── Stunden-Optionen für Dropdown ─────────────────────────────────────────────
const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const h = i + 5; // 05:00 – 23:00
  return { value: h, label: `${String(h).padStart(2, '0')}:00 Uhr` };
});

// ── Algorithmus: Mitarbeiter-Bewertung ────────────────────────────────────────
/**
 * Bewertet einen Mitarbeiter für die geplante Schicht.
 *
 * PHP-Backend-Entsprechung:
 *   1. SELECT * FROM staff_absences WHERE staff_id=:id AND week_day=:day AND week=:week
 *   2. SELECT * FROM shifts WHERE staff_id=:id AND week_day=:day AND week=:week
 *      AND start_hour < :endHour AND end_hour > :startHour
 *   3. JSON_CONTAINS(allowed_roles, :shiftRole)
 *   4. SUM(end_hour - start_hour) FROM shifts WHERE staff_id=:id AND week=:week
 */
function evaluateEmployee(
  emp: EmployeeHR,
  day: number,
  startHour: number,
  endHour: number,
  shiftRole: string,
  shifts: ShiftEntry[],
  dayAbsences: DayAbsenceEntry[],
): {
  group: 'recommended' | 'overtime' | 'conflict';
  reasons: string[];
  currentHours: number;
  afterHours: number;
  priority: number; // höher = weiter oben in Empfohlen-Liste
} {
  const newDuration = endHour - startHour;
  const reasons: string[] = [];

  // 1. Abwesenheits-Check (harter Ausschluss)
  const absence = dayAbsences.find(a => a.employeeId === emp.id && a.day === day);
  if (absence) {
    reasons.push(
      absence.type === 'krank'
        ? 'Ist krank gemeldet an diesem Tag'
        : 'Hat genehmigten Urlaub an diesem Tag',
    );
  }

  // 2. Überschneidungs-Check (harter Ausschluss)
  const shiftsOnDay = shifts.filter(s => s.employeeId === emp.id && s.day === day);
  const overlap = shiftsOnDay.find(
    s => startHour < s.endHour && endHour > s.startHour,
  );
  if (overlap) {
    reasons.push(
      `Doppelschicht: hat bereits Schicht ${String(overlap.startHour).padStart(2,'0')}:00–${String(overlap.endHour).padStart(2,'0')}:00 Uhr`,
    );
  }

  // 3. Rollen-Check (harter Ausschluss)
  const roleOk =
    emp.allowedRoles.length === 0 ||
    emp.allowedRoles.some(r => r.toLowerCase() === shiftRole.toLowerCase());
  if (!roleOk) {
    reasons.push(`Rolle "${shiftRole}" nicht zugelassen (hat: ${emp.allowedRoles.join(', ')})`);
  }

  // Harte Konflikte → Gruppe "conflict"
  if (reasons.length > 0) {
    const currentHours = shifts
      .filter(s => s.employeeId === emp.id)
      .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);
    return { group: 'conflict', reasons, currentHours, afterHours: currentHours + newDuration, priority: 0 };
  }

  // 4. Stunden-Check (weicher Warn-Hinweis)
  const currentHours = shifts
    .filter(s => s.employeeId === emp.id)
    .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);
  const afterHours = currentHours + newDuration;

  if (afterHours > emp.contractHours) {
    return { group: 'overtime', reasons: [], currentHours, afterHours, priority: 0 };
  }

  // 5. Empfohlen – Minijobber mit offenen Stunden bevorzugen
  const hoursLeft = emp.contractHours - currentHours;
  const priority = emp.contractType === 'minijob' ? hoursLeft * 2 : hoursLeft;
  return { group: 'recommended', reasons: [], currentHours, afterHours, priority };
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: '5px',
  fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '6px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box', appearance: 'none',
};

function SelectWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <ChevronDown size={12} style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Employee Card in Vorschlagsliste ──────────────────────────────────────────
function CandidateCard({
  emp, group, currentHours, afterHours, reasons, onAssign, onOverride,
}: {
  emp: EmployeeHR;
  group: 'recommended' | 'overtime' | 'conflict';
  currentHours: number;
  afterHours: number;
  reasons: string[];
  onAssign: () => void;
  onOverride: () => void;
}) {
  const contractLabel: Record<ContractType, string> = {
    vollzeit: 'VZ', teilzeit: 'TZ', minijob: 'MJ', freelancer: 'FL', werkstudent: 'WS',
  };

  const badgeColor =
    group === 'recommended'
      ? { text: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' }
      : group === 'overtime'
      ? { text: '#FCD34D', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' }
      : { text: '#F87171', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '12px',
      borderRadius: '8px',
      background: group === 'conflict' ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${group === 'conflict' ? 'rgba(255,255,255,0.05)' : badgeColor.border}`,
      opacity: group === 'conflict' ? 0.75 : 1,
      transition: 'all 0.15s',
    }}>
      {/* Status Icon */}
      <div style={{ flexShrink: 0, marginTop: '1px' }}>
        {group === 'recommended' && <CheckCircle2 size={16} style={{ color: '#34D399' }} />}
        {group === 'overtime'    && <AlertTriangle size={16} style={{ color: '#FCD34D' }} />}
        {group === 'conflict'    && <XCircle size={16} style={{ color: '#F87171' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: `${emp.color}22`, border: `1.5px solid ${emp.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '10px',
              letterSpacing: '0.04em', color: emp.color,
            }}>{emp.initials}</span>
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-condensed)', fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.04em', color: group === 'conflict' ? 'rgba(255,255,255,0.5)' : '#fff',
            }}>{emp.name}</div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.3)',
            }}>{emp.role} · {contractLabel[emp.contractType]}</div>
          </div>

          {/* Hours Badge */}
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '4px',
              background: badgeColor.bg, border: `1px solid ${badgeColor.border}`,
              fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.06em', color: badgeColor.text, whiteSpace: 'nowrap',
            }}>
              {currentHours}h
              <ArrowRight size={9} strokeWidth={2.5} />
              {afterHours}h
              <span style={{ opacity: 0.55 }}>/ {emp.contractHours}h</span>
              {group === 'overtime' && (
                <span style={{ color: '#F87171' }}>
                  (+{afterHours - emp.contractHours}h)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Conflict Reasons */}
        {reasons.length > 0 && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {reasons.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '5px',
                fontFamily: 'var(--font-body)', fontSize: '11px', color: '#F87171',
                lineHeight: 1.4,
              }}>
                <ShieldAlert size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>Grund: {r}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {group !== 'conflict' && (
            <button
              onClick={onAssign}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', borderRadius: '5px', cursor: 'pointer',
                background: group === 'recommended' ? 'var(--brand)' : 'rgba(251,191,36,0.12)',
                border: group === 'recommended'
                  ? '1px solid rgba(202,12,133,0.5)'
                  : '1px solid rgba(251,191,36,0.35)',
                color: '#fff',
                fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: group === 'recommended' ? '0 0 12px rgba(202,12,133,0.2)' : 'none',
                transition: 'all 0.14s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
            >
              <UserCheck size={11} />
              Zuweisen
            </button>
          )}
          {group === 'conflict' && (
            <button
              onClick={onOverride}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '5px', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(248,113,113,0.35)',
                color: '#F87171',
                fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'all 0.14s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title="Admin-Override: Schicht trotz Konflikt einplanen"
            >
              <Zap size={11} />
              Trotzdem einplanen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gruppen-Überschrift ────────────────────────────────────────────────────────
function GroupHeader({ icon, label, count, color }: {
  icon: React.ReactNode; label: string; count: number; color: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      marginBottom: '8px', paddingBottom: '6px',
      borderBottom: `1px solid ${color}22`,
    }}>
      {icon}
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase', color,
      }}>{label}</span>
      <span style={{
        marginLeft: 'auto',
        fontFamily: 'var(--font-condensed)', fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '1px 6px', borderRadius: '9999px',
        background: `${color}18`, border: `1px solid ${color}33`,
        color,
      }}>{count}</span>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export function SmartAssignSheet({
  open, onClose, targetDay, targetDate, employees,
  shifts, dayAbsences, onAssign, prefill,
}: Props) {
  const today = new Date();

  // ── Formular-State ─────────────────────────────────────────────────────────
  const [shiftRole, setShiftRole] = useState(
    prefill?.label || SHIFT_ROLES[0].value,
  );
  const [startHour, setStartHour] = useState(prefill?.startHour ?? 8);
  const [endHour,   setEndHour]   = useState(prefill?.endHour   ?? 14);

  // Synchronise wenn prefill sich ändert (z.B. andere Vorlage ausgewählt)
  React.useEffect(() => {
    if (prefill) {
      setStartHour(prefill.startHour);
      setEndHour(prefill.endHour);
      setShiftRole(prefill.label || SHIFT_ROLES[0].value);
    }
  }, [prefill]);

  const duration = endHour > startHour ? endHour - startHour : 0;

  // ── Algorithmus: alle Mitarbeiter bewerten ─────────────────────────────────
  const evaluated = useMemo(() => {
    if (targetDay === null || duration <= 0) return [];
    return employees.map(emp => ({
      emp,
      ...evaluateEmployee(emp, targetDay, startHour, endHour, shiftRole, shifts, dayAbsences),
    }));
  }, [targetDay, startHour, endHour, shiftRole, employees, shifts, dayAbsences, duration]);

  const recommended = evaluated.filter(e => e.group === 'recommended')
    .sort((a, b) => b.priority - a.priority);
  const overtime    = evaluated.filter(e => e.group === 'overtime');
  const conflict    = evaluated.filter(e => e.group === 'conflict');

  // ── Assign-Handler ─────────────────────────────────────────────────────────
  const handleAssign = (empId: string, override = false) => {
    if (targetDay === null || duration <= 0) return;
    onAssign({ employeeId: empId, day: targetDay, startHour, endHour, shiftRole, override });
    if (override) {
      toast.warning('Trotz Konflikt eingeplant', {
        description: 'Arbeitszeitkonto wird aktualisiert. Bitte Begründung dokumentieren.',
        duration: 5000,
      });
    }
    onClose();
  };

  // ── Date label ─────────────────────────────────────────────────────────────
  const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dateLine = targetDate
    ? `${WEEKDAYS_LONG[targetDay ?? 0]}, ${targetDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : '—';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 300,
            }}
          />

          {/* Sheet (Slide-over from right) */}
          <motion.div
            key="sheet"
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(500px, 100vw)',
              background: '#0e0e0e',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderTop: '3px solid var(--brand)',
              boxShadow: '-24px 0 60px rgba(0,0,0,0.6)',
              zIndex: 301,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <Calendar size={13} style={{ color: 'var(--brand)' }} />
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '16px',
                    letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff',
                  }}>Schicht zuweisen</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '11px',
                  color: 'rgba(255,255,255,0.3)',
                }}>{dateLine}</div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              ><X size={14} /></button>
            </div>

            {/* ── Scrollable Body ──────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

              {/* ── Bereich A: Schicht-Konfiguration ─────────────────────── */}
              <div style={{
                padding: '16px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                marginBottom: '20px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-condensed)', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)', marginBottom: '14px',
                }}>A · Schicht-Konfiguration</div>

                {/* Schicht-Rolle */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelSt}>Schicht-Rolle</label>
                  <SelectWrap label="">
                    <select
                      value={shiftRole}
                      onChange={e => setShiftRole(e.target.value)}
                      style={{ ...inputSt, paddingRight: '28px', cursor: 'pointer' }}
                    >
                      {SHIFT_ROLES.map(r => (
                        <option key={r.value} value={r.value} style={{ background: '#1a1a1a' }}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>

                {/* Von / Bis / Dauer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelSt}>Von</label>
                    <SelectWrap label="">
                      <select
                        value={startHour}
                        onChange={e => setStartHour(Number(e.target.value))}
                        style={{ ...inputSt, paddingRight: '28px', cursor: 'pointer' }}
                      >
                        {HOUR_OPTIONS.map(o => (
                          <option key={o.value} value={o.value} style={{ background: '#1a1a1a' }}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </div>
                  <div>
                    <label style={labelSt}>Bis</label>
                    <SelectWrap label="">
                      <select
                        value={endHour}
                        onChange={e => setEndHour(Number(e.target.value))}
                        style={{ ...inputSt, paddingRight: '28px', cursor: 'pointer' }}
                      >
                        {HOUR_OPTIONS.filter(o => o.value > startHour).map(o => (
                          <option key={o.value} value={o.value} style={{ background: '#1a1a1a' }}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </div>
                  <div>
                    <label style={labelSt}>Dauer</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: '36px', borderRadius: '6px',
                      background: duration > 0 ? 'rgba(202,12,133,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${duration > 0 ? 'rgba(202,12,133,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      gap: '4px',
                    }}>
                      <Clock size={12} style={{ color: duration > 0 ? 'var(--brand)' : 'rgba(255,255,255,0.2)' }} />
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: '13px', fontWeight: 700,
                        color: duration > 0 ? '#fff' : 'rgba(255,255,255,0.25)',
                      }}>
                        {duration > 0 ? `${duration}h` : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bereich B: Smart Assistant ────────────────────────────── */}
              <div>
                {/* Section title */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '14px',
                }}>
                  <Sparkles size={14} style={{ color: 'var(--brand)' }} />
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: '#fff',
                  }}>KI-Vorschläge & Verfügbarkeiten</span>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '10px',
                    color: 'rgba(255,255,255,0.2)', marginLeft: 'auto',
                  }}>B · Smart Assistant</span>
                </div>

                {duration <= 0 && (
                  <div style={{
                    padding: '20px', borderRadius: '8px', textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.2)',
                  }}>
                    Bitte Uhrzeit Von/Bis konfigurieren um Vorschläge zu sehen.
                  </div>
                )}

                {duration > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* 🟢 Empfohlen */}
                    {recommended.length > 0 && (
                      <div>
                        <GroupHeader
                          icon={<CheckCircle2 size={13} style={{ color: '#34D399' }} />}
                          label="Empfohlen (Puffer vorhanden)"
                          count={recommended.length}
                          color="#34D399"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {recommended.map(({ emp, currentHours, afterHours, reasons }) => (
                            <CandidateCard
                              key={emp.id}
                              emp={emp}
                              group="recommended"
                              currentHours={currentHours}
                              afterHours={afterHours}
                              reasons={reasons}
                              onAssign={() => handleAssign(emp.id)}
                              onOverride={() => handleAssign(emp.id, true)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 🟡 Möglich (Überstunden) */}
                    {overtime.length > 0 && (
                      <div>
                        <GroupHeader
                          icon={<AlertTriangle size={13} style={{ color: '#FCD34D' }} />}
                          label="Möglich (Überstunden-Warnung)"
                          count={overtime.length}
                          color="#FCD34D"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {overtime.map(({ emp, currentHours, afterHours, reasons }) => (
                            <CandidateCard
                              key={emp.id}
                              emp={emp}
                              group="overtime"
                              currentHours={currentHours}
                              afterHours={afterHours}
                              reasons={reasons}
                              onAssign={() => handleAssign(emp.id)}
                              onOverride={() => handleAssign(emp.id, true)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 🔴 Konflikte */}
                    {conflict.length > 0 && (
                      <div>
                        <GroupHeader
                          icon={<XCircle size={13} style={{ color: '#F87171' }} />}
                          label="Konflikte (mit Override-Möglichkeit)"
                          count={conflict.length}
                          color="#F87171"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {conflict.map(({ emp, currentHours, afterHours, reasons }) => (
                            <CandidateCard
                              key={emp.id}
                              emp={emp}
                              group="conflict"
                              currentHours={currentHours}
                              afterHours={afterHours}
                              reasons={reasons}
                              onAssign={() => handleAssign(emp.id)}
                              onOverride={() => handleAssign(emp.id, true)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {evaluated.length === 0 && (
                      <div style={{
                        padding: '20px', borderRadius: '8px', textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.2)',
                      }}>
                        Keine Mitarbeiter in der Datenbank.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.01)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.2)',
              }}>
                {recommended.length} empfohlen · {overtime.length} mit Überstunden · {conflict.length} Konflikte
              </span>
              <button onClick={onClose} style={{
                padding: '7px 16px', borderRadius: '5px', cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-condensed)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>Schließen</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

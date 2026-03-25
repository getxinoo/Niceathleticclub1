/**
 * AdminCoaching.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Coaching-Queue & Pipeline (Kanban-Style).
 *
 * Spalten: Offen → In Bearbeitung → Abgeschlossen
 * Features:
 *   - Claiming: Trainer weist sich selbst eine Anfrage zu
 *   - Plan erstellen: Slide-over mit Checklist-Editor
 *   - Uebersicht aller Coaching-Requests
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  User,
  Dumbbell,
  Apple,
  Target,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  X,
  Trash2,
  RefreshCw,
  Send,
  ClipboardList,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { api, StaffUser } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────
interface CoachingRequest {
  id: string;
  member_id: string;
  member_name: string;
  type: "training" | "nutrition" | "both";
  status: "open" | "in_progress" | "completed" | "cancelled";
  goal: string;
  notes?: string;
  created_at: string;
  assigned_to?: string;
  assigned_name?: string;
  plan_data?: {
    title: string;
    description: string;
    items: { label: string; done: boolean }[];
    created_at: string;
    coach_name: string;
  } | null;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_COACHING: CoachingRequest[] = [
  {
    id: "cr-1",
    member_id: "1",
    member_name: "Max Mustermann",
    type: "training",
    status: "in_progress",
    goal: "Muskelaufbau – Fokus Oberkörper",
    notes: "12-Wochen-Plan für Hypertrophie, 4 Trainingstage/Woche.",
    created_at: "2026-02-20T10:00:00Z",
    assigned_to: "2",
    assigned_name: "Dome Fuchs",
    plan_data: {
      title: "Hypertrophie 12-Wochen Plan",
      description: "Progressiver Oberkörper-Split mit Periodisierung.",
      items: [
        { label: "Woche 1-2: Eingewöhnung – 3x12 @ RPE 7", done: true },
        { label: "Woche 3-4: Volumen-Phase – 4x10 @ RPE 8", done: true },
        { label: "Woche 5-6: Intensität steigern – 4x8 @ RPE 8.5", done: false },
        { label: "Woche 7-8: Deload + Technikfokus", done: false },
      ],
      created_at: "2026-02-22T14:00:00Z",
      coach_name: "Dome Fuchs",
    },
  },
  {
    id: "cr-2",
    member_id: "2",
    member_name: "Lisa Bergmann",
    type: "nutrition",
    status: "open",
    goal: "Körperfettreduktion bei Muskelerhalt",
    notes: "Aktuell 87kg, Ziel 82kg in 3 Monaten.",
    created_at: "2026-03-08T16:00:00Z",
  },
  {
    id: "cr-3",
    member_id: "5",
    member_name: "Felix Wagner",
    type: "both",
    status: "open",
    goal: "HYROX Wettkampf-Vorbereitung",
    created_at: "2026-03-10T09:00:00Z",
  },
  {
    id: "cr-4",
    member_id: "6",
    member_name: "Laura Schneider",
    type: "training",
    status: "completed",
    goal: "Kraftsteigerung für Deadlift & Squat",
    created_at: "2026-01-15T11:00:00Z",
    assigned_to: "3",
    assigned_name: "Michael Kraus",
    plan_data: {
      title: "Strength Block – 6 Wochen",
      description: "Fokus auf die großen Lifts mit Periodisierung.",
      items: [
        { label: "Technik-Assessment durchführen", done: true },
        { label: "Woche 1-3: Volumen-Phase 5x5", done: true },
        { label: "Woche 4-6: Peaking 3x3/2x2", done: true },
        { label: "Re-Test Maximalkraft", done: true },
      ],
      created_at: "2026-01-17T08:00:00Z",
      coach_name: "Michael Kraus",
    },
  },
  {
    id: "cr-5",
    member_id: "8",
    member_name: "Nina Fischer",
    type: "nutrition",
    status: "in_progress",
    goal: "Ernährungsumstellung – vegetarisch + sportgerecht",
    notes: "Vegetarierin seit 2024, braucht Hilfe mit Proteinquellen.",
    created_at: "2026-03-05T14:00:00Z",
    assigned_to: "3",
    assigned_name: "Michael Kraus",
    plan_data: {
      title: "Vegetarischer Sport-Ernährungsplan",
      description: "Ausgewogene pflanzliche Ernährung mit 140g Protein/Tag.",
      items: [
        { label: "Ist-Analyse Ernährungstagebuch (3 Tage)", done: true },
        { label: "Basis-Mahlzeitenplan erstellen", done: true },
        { label: "Supplement-Empfehlung (B12, Kreatin)", done: false },
        { label: "2-Wochen Check-In", done: false },
      ],
      created_at: "2026-03-07T10:00:00Z",
      coach_name: "Michael Kraus",
    },
  },
];

// ── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  training:  { label: "Training",   icon: Dumbbell, color: "#CA0C85" },
  nutrition: { label: "Ernährung",  icon: Apple,    color: "#34d399" },
  both:      { label: "Kombi",      icon: Target,   color: "#f59e0b" },
};

const COLUMN_CONFIG = {
  open:        { label: "Offen",          color: "#60a5fa", bg: "rgba(96,165,250,0.06)"  },
  in_progress: { label: "In Bearbeitung", color: "#CA0C85", bg: "rgba(202,12,133,0.05)"  },
  completed:   { label: "Abgeschlossen",  color: "#4ade80", bg: "rgba(74,222,128,0.04)"  },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminCoaching() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);

  // Assign dialog
  const [assignTarget, setAssignTarget] = useState<CoachingRequest | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");

  // Plan editor dialog
  const [planTarget, setPlanTarget] = useState<CoachingRequest | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planItems, setPlanItems] = useState<string[]>([""]);
  const [planSaving, setPlanSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coachingData, staffData] = await Promise.all([
        api.admin.coaching.list(),
        api.admin.users.listStaff(),
      ]);
      setRequests(Array.isArray(coachingData) ? coachingData : MOCK_COACHING);
      setStaff(staffData);
    } catch {
      setRequests(MOCK_COACHING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, location.key]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleClaim = async (req: CoachingRequest, staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return;
    try {
      await api.admin.coaching.assign(req.id, staffId);
      toast.success("Coaching übernommen!", {
        description: `${staffMember.name} übernimmt: ${req.goal}`,
      });
      setAssignTarget(null);
      setAssignStaffId("");
      loadData();
    } catch {
      // api-service error
    }
  };

  const handleSavePlan = async () => {
    if (!planTarget || !planTitle.trim()) return;
    setPlanSaving(true);
    try {
      const items = planItems.filter(i => i.trim()).map(label => ({ label: label.trim(), done: false }));
      await api.admin.coaching.savePlan(planTarget.id, {
        title: planTitle.trim(),
        description: planDesc.trim(),
        items,
      });
      toast.success("Plan gespeichert & Mitglied benachrichtigt!");
      setPlanTarget(null);
      setPlanTitle("");
      setPlanDesc("");
      setPlanItems([""]);
      loadData();
    } catch {
      // handled
    } finally {
      setPlanSaving(false);
    }
  };

  const handleComplete = async (reqId: string) => {
    try {
      await api.admin.coaching.updateStatus(reqId, "completed");
      toast.success("Coaching als abgeschlossen markiert.");
      loadData();
    } catch {
      // handled
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = {
    open: requests.filter(r => r.status === "open"),
    in_progress: requests.filter(r => r.status === "in_progress"),
    completed: requests.filter(r => r.status === "completed"),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            COACHING<span style={{ color: "var(--brand)" }}> PIPELINE</span>
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
            {requests.length} Anfragen · {columns.open.length} offen · {columns.in_progress.length} aktiv
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            minHeight: "40px",
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          <RefreshCw size={13} /> Aktualisieren
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Offene Anfragen", value: columns.open.length, color: "#60a5fa" },
          { label: "In Bearbeitung", value: columns.in_progress.length, color: "#CA0C85" },
          { label: "Abgeschlossen", value: columns.completed.length, color: "#4ade80" },
          { label: "Gesamt", value: requests.length, color: "rgba(255,255,255,0.5)" },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="p-4 text-center"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                color: kpi.color,
                lineHeight: 1,
              }}
            >
              {kpi.value}
            </p>
            <p style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              marginTop: "4px",
            }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(["open", "in_progress", "completed"] as const).map(columnKey => {
          const col = COLUMN_CONFIG[columnKey];
          const items = columns[columnKey];

          return (
            <div key={columnKey}>
              {/* Column Header */}
              <div
                className="flex items-center gap-2 px-3 py-2 mb-3"
                style={{
                  background: col.bg,
                  borderLeft: `3px solid ${col.color}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: col.color, boxShadow: `0 0 6px ${col.color}80` }}
                />
                <span style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: col.color,
                }}>
                  {col.label}
                </span>
                <span style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {items.length === 0 && (
                  <div
                    className="text-center py-8"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px dashed rgba(255,255,255,0.06)",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
                      Keine Einträge
                    </p>
                  </div>
                )}
                {items.map((req, i) => {
                  const typeCfg = TYPE_CONFIG[req.type];
                  const TypeIcon = typeCfg.icon;
                  const doneCount = req.plan_data?.items.filter(it => it.done).length ?? 0;
                  const totalCount = req.plan_data?.items.length ?? 0;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="p-4"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {/* Type + Member */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-8 h-8 flex items-center justify-center shrink-0"
                          style={{ background: `${typeCfg.color}15`, border: `1px solid ${typeCfg.color}25` }}
                        >
                          <TypeIcon size={14} style={{ color: typeCfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 truncate" style={{ fontSize: "13px", fontWeight: 500 }}>
                            {req.member_name}
                          </p>
                          <span style={{
                            fontFamily: "var(--font-condensed)",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            color: typeCfg.color,
                            textTransform: "uppercase",
                          }}>
                            {typeCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Goal */}
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: "8px" }}>
                        {req.goal}
                      </p>

                      {/* Notes preview */}
                      {req.notes && (
                        <p className="mb-3" style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
                          „{req.notes.slice(0, 80)}{req.notes.length > 80 ? "…" : ""}"
                        </p>
                      )}

                      {/* Assigned Coach */}
                      {req.assigned_name && (
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-6 h-6 flex items-center justify-center text-white"
                            style={{
                              background: "rgba(202,12,133,0.2)",
                              border: "1px solid rgba(202,12,133,0.3)",
                              fontFamily: "var(--font-display)",
                              fontSize: "10px",
                              borderRadius: "50%",
                            }}
                          >
                            {req.assigned_name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                            {req.assigned_name}
                          </span>
                        </div>
                      )}

                      {/* Progress (if plan exists) */}
                      {totalCount > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
                              {doneCount}/{totalCount} erledigt
                            </span>
                          </div>
                          <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                                background: typeCfg.color,
                                borderRadius: "2px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <p className="mb-3" style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                        {new Date(req.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {columnKey === "open" && (
                          <button
                            onClick={() => { setAssignTarget(req); setAssignStaffId(""); }}
                            className="flex items-center gap-1.5 px-3 cursor-pointer transition-colors duration-200"
                            style={{
                              background: "rgba(202,12,133,0.08)",
                              border: "1px solid rgba(202,12,133,0.2)",
                              color: "var(--brand)",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              minHeight: "32px",
                            }}
                          >
                            <User size={10} /> ÜBERNEHMEN
                          </button>
                        )}
                        {columnKey === "in_progress" && !req.plan_data && (
                          <button
                            onClick={() => {
                              setPlanTarget(req);
                              setPlanTitle("");
                              setPlanDesc("");
                              setPlanItems([""]);
                            }}
                            className="flex items-center gap-1.5 px-3 cursor-pointer transition-colors duration-200"
                            style={{
                              background: "rgba(202,12,133,0.08)",
                              border: "1px solid rgba(202,12,133,0.2)",
                              color: "var(--brand)",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              minHeight: "32px",
                            }}
                          >
                            <ClipboardList size={10} /> PLAN ERSTELLEN
                          </button>
                        )}
                        {columnKey === "in_progress" && req.plan_data && (
                          <button
                            onClick={() => handleComplete(req.id)}
                            className="flex items-center gap-1.5 px-3 cursor-pointer transition-colors duration-200"
                            style={{
                              background: "rgba(74,222,128,0.06)",
                              border: "1px solid rgba(74,222,128,0.15)",
                              color: "#4ade80",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              minHeight: "32px",
                            }}
                          >
                            <CheckCircle2 size={10} /> ABSCHLIESSEN
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Assign Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "420px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Coaching übernehmen
            </DialogTitle>
            <DialogDescription>
              Wähle einen Trainer, der diese Anfrage bearbeitet.
            </DialogDescription>
          </DialogHeader>

          {assignTarget && (
            <div className="space-y-4 py-2">
              <div
                className="p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-white/70" style={{ fontSize: "13px" }}>
                  <strong>{assignTarget.member_name}</strong> – {assignTarget.goal}
                </p>
              </div>

              <div>
                <label style={{
                  display: "block",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}>
                  Trainer zuweisen
                </label>
                <select
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: assignStaffId ? "white" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    padding: "10px 14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>Trainer wählen...</option>
                  {staff.filter(s => s.role === "trainer" || s.role === "admin").map(s => (
                    <option key={s.id} value={s.id} style={{ background: "#111", color: "white" }}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAssignTarget(null)}
              style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}
            >
              Abbrechen
            </Button>
            <Button
              disabled={!assignStaffId}
              onClick={() => assignTarget && handleClaim(assignTarget, assignStaffId)}
              style={{
                background: "var(--brand)",
                fontFamily: "var(--font-condensed)",
                letterSpacing: "0.1em",
                gap: "6px",
              }}
            >
              <ArrowRight size={13} /> Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Plan Editor Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!planTarget} onOpenChange={(o) => !o && setPlanTarget(null)}>
        <DialogContent style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "520px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Plan erstellen
            </DialogTitle>
            <DialogDescription>
              Erstelle einen individuellen Plan für {planTarget?.member_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                Plan-Titel *
              </label>
              <Input
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="z.B. Hypertrophie 12-Wochen Plan"
              />
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                Beschreibung
              </label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Kurze Beschreibung des Plans..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  padding: "10px 14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Checklist Items */}
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                Aufgaben / Meilensteine
              </label>
              <div className="space-y-2">
                {planItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical size={12} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                    <input
                      value={item}
                      onChange={(e) => {
                        const updated = [...planItems];
                        updated[i] = e.target.value;
                        setPlanItems(updated);
                      }}
                      placeholder={`Aufgabe ${i + 1}...`}
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "white",
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        padding: "8px 12px",
                        outline: "none",
                      }}
                    />
                    {planItems.length > 1 && (
                      <button
                        onClick={() => setPlanItems(planItems.filter((_, idx) => idx !== i))}
                        className="shrink-0 flex items-center justify-center cursor-pointer"
                        style={{
                          width: "32px", height: "32px",
                          background: "none", border: "none",
                          color: "rgba(255,255,255,0.25)",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setPlanItems([...planItems, ""])}
                  className="flex items-center gap-1.5 px-3 py-2 cursor-pointer"
                  style={{
                    background: "none",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={12} /> Aufgabe hinzufügen
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPlanTarget(null)}
              style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}
            >
              Abbrechen
            </Button>
            <Button
              disabled={planSaving || !planTitle.trim()}
              onClick={handleSavePlan}
              style={{
                background: "var(--brand)",
                fontFamily: "var(--font-condensed)",
                letterSpacing: "0.1em",
                gap: "6px",
              }}
            >
              {planSaving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Plan speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
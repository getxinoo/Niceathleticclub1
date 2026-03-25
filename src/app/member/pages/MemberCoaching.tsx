/**
 * MemberCoaching.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Coaching Hub im Member Portal.
 *
 * Tabs:
 *   1. "Meine Plaene"  – Aktive/abgeschlossene Coaching-Plaene vom Trainer
 *   2. "Anfrage stellen" – Formular fuer neue Coaching-Anfrage
 *
 * Design: NAC Dark-Mode, glassmorphism cards, magenta accent.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  MessageSquare,
  ClipboardList,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  Dumbbell,
  Apple,
  Target,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api-service";

// ── Types ────────────────────────────────────────────────────────────────────
interface CoachingRequest {
  id: string;
  type: "training" | "nutrition" | "both";
  status: "open" | "in_progress" | "completed" | "cancelled";
  goal: string;
  notes?: string;
  created_at: string;
  assigned_to?: string;
  assigned_name?: string;
  plan_data?: CoachingPlan | null;
}

interface CoachingPlan {
  title: string;
  description: string;
  items: { label: string; done: boolean }[];
  created_at: string;
  coach_name: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_REQUESTS: CoachingRequest[] = [
  {
    id: "cr-1",
    type: "training",
    status: "in_progress",
    goal: "Muskelaufbau – Fokus Oberkörper",
    notes: "Ich möchte einen 12-Wochen-Plan für Hypertrophie mit 4 Trainingstagen pro Woche.",
    created_at: "2026-02-20T10:00:00Z",
    assigned_to: "2",
    assigned_name: "Dome Fuchs",
    plan_data: {
      title: "Hypertrophie 12-Wochen Plan",
      description: "Progressiver Oberkörper-Split mit Periodisierung. Woche 1-4: Grundlagen, Woche 5-8: Intensität, Woche 9-12: Peaking.",
      items: [
        { label: "Woche 1-2: Eingewöhnung – 3x12 @ RPE 7", done: true },
        { label: "Woche 3-4: Volumen-Phase – 4x10 @ RPE 8", done: true },
        { label: "Woche 5-6: Intensität steigern – 4x8 @ RPE 8.5", done: false },
        { label: "Woche 7-8: Deload + Technikfokus", done: false },
        { label: "Woche 9-10: Peak-Phase – 5x5 @ RPE 9", done: false },
        { label: "Woche 11-12: Taper + Re-Test", done: false },
      ],
      created_at: "2026-02-22T14:00:00Z",
      coach_name: "Dome Fuchs",
    },
  },
  {
    id: "cr-2",
    type: "nutrition",
    status: "open",
    goal: "Körperfettreduktion bei Muskelerhalt",
    notes: "Aktuell 87kg, Ziel 82kg in 3 Monaten. Brauche Ernährungsplan.",
    created_at: "2026-03-08T16:00:00Z",
  },
  {
    id: "cr-3",
    type: "both",
    status: "completed",
    goal: "Wettkampfvorbereitung HYROX",
    created_at: "2026-01-10T09:00:00Z",
    assigned_to: "3",
    assigned_name: "Michael Kraus",
    plan_data: {
      title: "HYROX Race Prep – 8 Wochen",
      description: "Kombinierter Trainings- und Ernährungsplan für optimale HYROX-Leistung.",
      items: [
        { label: "Grundlagenausdauer aufbauen (Zone 2)", done: true },
        { label: "Kraft-Ausdauer: Sled Push/Pull, Wall Balls", done: true },
        { label: "Intervall-Training 3x/Woche", done: true },
        { label: "Race-Pace Simulation", done: true },
        { label: "Wettkampf-Ernährung testen", done: true },
      ],
      created_at: "2026-01-12T10:00:00Z",
      coach_name: "Michael Kraus",
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  training:  { label: "Trainingsplan", icon: Dumbbell,  color: "#CA0C85" },
  nutrition: { label: "Ernährungsplan", icon: Apple,     color: "#34d399" },
  both:      { label: "Kombi-Plan",    icon: Target,    color: "#f59e0b" },
};

const STATUS_CONFIG = {
  open:        { label: "Offen",          color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.2)"  },
  in_progress: { label: "In Bearbeitung", color: "#CA0C85", bg: "rgba(202,12,133,0.1)",  border: "rgba(202,12,133,0.25)" },
  completed:   { label: "Abgeschlossen",  color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)"  },
  cancelled:   { label: "Abgebrochen",    color: "#9ca3af", bg: "rgba(156,163,175,0.06)",border: "rgba(156,163,175,0.15)"},
};

const LABEL_STYLE = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

const GOAL_OPTIONS = [
  "Muskelaufbau",
  "Fettabbau / Definition",
  "Kraftsteigerung",
  "Ausdauer verbessern",
  "HYROX Vorbereitung",
  "Wettkampfvorbereitung",
  "Rehabilitation / Prävention",
  "Allgemeine Fitness",
  "Sonstiges",
];

// ── Component ────────────────────────────────────────────────────────────────
export default function MemberCoaching() {
  const reduced = useReducedMotion() ?? false;
  const [activeTab, setActiveTab] = useState<"plans" | "request">("plans");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CoachingRequest[]>([]);

  // Request form state
  const [reqType, setReqType] = useState<"training" | "nutrition" | "both">("training");
  const [reqGoal, setReqGoal] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expanded plan view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.member.coaching.list();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests(MOCK_REQUESTS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqGoal.trim()) {
      toast.error("Bitte wähle ein Ziel aus.");
      return;
    }
    setSubmitting(true);
    try {
      await api.member.coaching.request({
        type: reqType,
        goal: reqGoal,
        notes: reqNotes.trim() || undefined,
      });
      toast.success("Coaching-Anfrage gesendet!", {
        description: "Ein Trainer wird sich bald bei dir melden.",
      });
      setReqGoal("");
      setReqNotes("");
      setActiveTab("plans");
      loadData();
    } catch {
      // api-service handles error toasts
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleItem = async (requestId: string, itemIndex: number) => {
    // Optimistic update
    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId || !r.plan_data) return r;
        const items = [...r.plan_data.items];
        items[itemIndex] = { ...items[itemIndex], done: !items[itemIndex].done };
        return { ...r, plan_data: { ...r.plan_data, items } };
      })
    );
    try {
      await api.member.coaching.toggleItem(requestId, itemIndex);
    } catch {
      loadData(); // revert on error
    }
  };

  const activeRequests = requests.filter(r => r.status === "in_progress");
  const openRequests = requests.filter(r => r.status === "open");
  const completedRequests = requests.filter(r => r.status === "completed" || r.status === "cancelled");

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-6 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <h1
          className="text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 8vw, 2.8rem)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          MEIN <span style={{ color: "var(--brand)" }}>COACHING</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "4px" }}>
          {activeRequests.length > 0
            ? `${activeRequests.length} aktive${activeRequests.length > 1 ? " Pläne" : "r Plan"}`
            : "Starte mit einer Coaching-Anfrage"}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {([
          { key: "plans" as const, icon: ClipboardList, label: "Meine Pläne" },
          { key: "request" as const, icon: MessageSquare, label: "Anfrage stellen" },
        ]).map(({ key, icon: Icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              style={{
                background: "none",
                border: "none",
                minHeight: "48px",
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: active ? "var(--brand)" : "rgba(255,255,255,0.4)",
                borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon size={16} />
              {label}
              {key === "plans" && requests.filter(r => r.status !== "cancelled").length > 0 && (
                <span
                  className="ml-1 px-1.5 py-0.5"
                  style={{
                    background: active ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.06)",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "2px",
                  }}
                >
                  {requests.filter(r => r.status !== "cancelled").length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "plans" ? (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            {/* Active Plans */}
            {activeRequests.length > 0 && (
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "10px" }}>Aktive Pläne</p>
                <div className="space-y-3">
                  {activeRequests.map((req) => (
                    <PlanCard
                      key={req.id}
                      request={req}
                      expanded={expandedId === req.id}
                      onToggleExpand={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      onToggleItem={(idx) => handleToggleItem(req.id, idx)}
                      reduced={reduced}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Open Requests */}
            {openRequests.length > 0 && (
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "10px" }}>Offene Anfragen</p>
                <div className="space-y-3">
                  {openRequests.map((req) => (
                    <RequestCard key={req.id} request={req} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedRequests.length > 0 && (
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "10px" }}>Abgeschlossen</p>
                <div className="space-y-3">
                  {completedRequests.map((req) => (
                    <PlanCard
                      key={req.id}
                      request={req}
                      expanded={expandedId === req.id}
                      onToggleExpand={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      onToggleItem={(idx) => handleToggleItem(req.id, idx)}
                      reduced={reduced}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {requests.length === 0 && (
              <div className="text-center py-14">
                <div
                  className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)", borderRadius: "50%" }}
                >
                  <Sparkles size={24} style={{ color: "var(--brand)" }} />
                </div>
                <p className="text-white mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.06em" }}>
                  NOCH KEIN COACHING
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", marginBottom: "16px" }}>
                  Starte jetzt mit einem personalisierten Plan.
                </p>
                <button
                  onClick={() => setActiveTab("request")}
                  className="inline-flex items-center gap-2 px-5 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: "var(--brand)",
                    color: "white",
                    fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
                    border: "none",
                    minHeight: "44px",
                  }}
                >
                  COACH ANFRAGEN
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Request Form ── */
          <motion.div
            key="request"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selection */}
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "10px" }}>Was brauchst du?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["training", "nutrition", "both"] as const).map((t) => {
                    const cfg = TYPE_CONFIG[t];
                    const Icon = cfg.icon;
                    const active = reqType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setReqType(t)}
                        className="flex flex-col items-center gap-2 py-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                        style={{
                          background: active ? `${cfg.color}15` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${active ? `${cfg.color}40` : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <div
                          className="w-10 h-10 flex items-center justify-center"
                          style={{
                            background: `${cfg.color}18`,
                            border: `1px solid ${cfg.color}30`,
                            borderRadius: "4px",
                          }}
                        >
                          <Icon size={18} style={{ color: cfg.color }} />
                        </div>
                        <span style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: active ? cfg.color : "rgba(255,255,255,0.5)",
                          textTransform: "uppercase",
                        }}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal */}
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Dein Ziel *</p>
                <select
                  value={reqGoal}
                  onChange={(e) => setReqGoal(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: reqGoal ? "white" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    padding: "12px 14px",
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>Ziel auswählen...</option>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g} value={g} style={{ background: "#111", color: "white" }}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <p style={{ ...LABEL_STYLE, marginBottom: "8px" }}>Zusätzliche Infos (optional)</p>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Erfahrung, Einschränkungen, Wunsch-Trainer, Zeitraum..."
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    padding: "12px 14px",
                    outline: "none",
                    resize: "vertical",
                    minHeight: "100px",
                  }}
                />
              </div>

              {/* Info banner */}
              <div
                className="flex items-start gap-3 p-4"
                style={{
                  background: "rgba(202,12,133,0.05)",
                  border: "1px solid rgba(202,12,133,0.12)",
                  borderRadius: "4px",
                }}
              >
                <AlertCircle size={16} style={{ color: "var(--brand)", marginTop: "1px", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                    Dein Trainer erstellt einen individuellen Plan basierend auf deiner Anfrage.
                    Du wirst benachrichtigt, sobald dein Plan bereit ist.
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                    Durchschnittliche Bearbeitungszeit: 2-3 Werktage
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !reqGoal}
                className="w-full flex items-center justify-center gap-2 text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: submitting || !reqGoal ? "rgba(255,255,255,0.08)" : "var(--brand)",
                  border: "none",
                  minHeight: "52px",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  boxShadow: submitting || !reqGoal ? "none" : "0 0 20px rgba(202,12,133,0.3)",
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                Coaching-Anfrage senden
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Request Card (waiting for assignment) ────────────────────────────────────
function RequestCard({ request: req }: { request: CoachingRequest }) {
  const typeCfg = TYPE_CONFIG[req.type];
  const statusCfg = STATUS_CONFIG[req.status];
  const TypeIcon = typeCfg.icon;

  return (
    <div
      className="p-4"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${statusCfg.border}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0"
          style={{ background: `${typeCfg.color}15`, border: `1px solid ${typeCfg.color}25` }}
        >
          <TypeIcon size={16} style={{ color: typeCfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white/80" style={{ fontSize: "13px", fontWeight: 500 }}>
              {req.goal}
            </p>
            <span
              className="shrink-0 flex items-center gap-1.5 px-2 py-0.5"
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: statusCfg.color,
                textTransform: "uppercase",
              }}
            >
              <Clock size={9} />
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: typeCfg.color, textTransform: "uppercase" }}>
              {typeCfg.label}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
              {new Date(req.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          {req.notes && (
            <p className="mt-2" style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
              {req.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan Card (with expandable checklist) ────────────────────────────────────
function PlanCard({
  request: req,
  expanded,
  onToggleExpand,
  onToggleItem,
  reduced,
}: {
  request: CoachingRequest;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (index: number) => void;
  reduced: boolean;
}) {
  const typeCfg = TYPE_CONFIG[req.type];
  const statusCfg = STATUS_CONFIG[req.status];
  const TypeIcon = typeCfg.icon;
  const plan = req.plan_data;

  const doneCount = plan?.items.filter(i => i.done).length ?? 0;
  const totalCount = plan?.items.length ?? 0;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${req.status === "in_progress" ? "rgba(202,12,133,0.2)" : "rgba(255,255,255,0.06)"}`,
        overflow: "hidden",
      }}
    >
      {/* Header – clickable */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-start gap-3 p-4 text-left cursor-pointer transition-all duration-200"
        style={{ background: "none", border: "none" }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0"
          style={{ background: `${typeCfg.color}15`, border: `1px solid ${typeCfg.color}25` }}
        >
          <TypeIcon size={16} style={{ color: typeCfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className="text-white truncate"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em" }}
              >
                {plan?.title || req.goal}
              </p>
              {req.assigned_name && (
                <span className="flex items-center gap-1 mt-1" style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                  <User size={10} /> Coach: {req.assigned_name}
                </span>
              )}
            </div>
            <span
              className="shrink-0 flex items-center gap-1.5 px-2 py-0.5"
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: statusCfg.color,
                textTransform: "uppercase",
              }}
            >
              {req.status === "completed" ? <CheckCircle2 size={9} /> : <Clock size={9} />}
              {statusCfg.label}
            </span>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
                  Fortschritt
                </span>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, color: typeCfg.color }}>
                  {doneCount}/{totalCount}
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={reduced ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${typeCfg.color}, ${typeCfg.color}cc)`,
                    borderRadius: "3px",
                    boxShadow: `0 0 8px ${typeCfg.color}40`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <ChevronRight
          size={14}
          style={{
            color: "rgba(255,255,255,0.2)",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginTop: "4px",
          }}
        />
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {expanded && plan && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <div className="p-4 space-y-3">
              {/* Description */}
              {plan.description && (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  {plan.description}
                </p>
              )}

              {/* Checklist */}
              <div className="space-y-1.5">
                {plan.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleItem(i);
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left cursor-pointer transition-all duration-150"
                    style={{
                      background: item.done ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${item.done ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 flex items-center justify-center shrink-0"
                      style={{
                        borderRadius: "3px",
                        background: item.done ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${item.done ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      {item.done && <CheckCircle2 size={12} style={{ color: "#4ade80" }} />}
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: item.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 pt-1">
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                  Plan erstellt: {new Date(plan.created_at).toLocaleDateString("de-DE")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
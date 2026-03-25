/**
 * MemberTracking.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile-first Tracking Dashboard für Mitglieder.
 * Tabs: "Mein Körper" und "Ernährung"
 *
 * Neu v2:
 *  - Trainer-Badge wenn Ziele vom Coach gesetzt wurden
 *  - Coaching-Notiz des Trainers sichtbar
 *  - Ziel-Typ (Cut/Maintain/Bulk) + Zielgewicht-Progress
 *  - Umfänge (Taille, Hüfte) in Messung
 *  - Muskelmasseanteil-Feld
 *  - Wasser-Tracking in Ernährungslog
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, Scale, Apple, Plus, Loader2,
  TrendingDown, TrendingUp, Target, Flame, Beef, Wheat,
  Droplets, RefreshCw, Dumbbell, MessageSquare, GlassWater,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { api } from "../../../lib/api-service";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────
interface Measurement {
  id: string;
  date: string;
  weight: number;
  body_fat?: number;
  muscle_mass?: number;
  waist_cm?: number;
  hip_cm?: number;
}

interface NutritionGoals {
  calories_goal: number;
  protein_goal:  number;
  carbs_goal:    number;
  fat_goal:      number;
  // Trainer-set extensions
  goal_type?:       "cut" | "bulk" | "maintain";
  target_weight?:   number | null;
  target_date?:     string | null;
  coaching_note?:   string | null;
  set_by_trainer?:  boolean;
}

interface NutritionLog {
  id: string;
  date: string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  water_ml?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GOAL_TYPE_CFG: Record<string, { label: string; color: string; emoji: string }> = {
  cut:      { label: "Abnehmen (Cut)",   color: "#34d399", emoji: "📉" },
  maintain: { label: "Halten",           color: "#60a5fa", emoji: "⚖️"  },
  bulk:     { label: "Aufbauen (Bulk)",  color: "#f59e0b", emoji: "📈" },
};

// ── Design helpers ─────────────────────────────────────────────────────────────
const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", ...LABEL_STYLE, marginBottom: "6px" }}>
      {children}
    </label>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)",
      padding: "8px 12px", borderRadius: "4px",
    }}>
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: p.color, marginTop: "2px" }}>
          {p.name}: <strong>{p.value}</strong> {p.dataKey === "weight" ? "kg" : p.dataKey === "body_fat" ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

// ── Macro Progress Bar ──────────────────────────────────────────────────────────
function MacroBar({ icon: Icon, label, current, goal, color, unit }: {
  icon: React.ElementType; label: string;
  current: number; goal: number; color: string; unit: string;
}) {
  const pct  = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const over = current > goal;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "14px 16px" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: "4px" }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: over ? "#f87171" : color }}>
          <span style={{ fontWeight: 600, color: "white" }}>{current}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}> / {goal} {unit}</span>
        </span>
      </div>
      <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%",
            background: over ? "linear-gradient(90deg, #f87171, #ef4444)" : `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: "4px", boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>{Math.round(pct)}%</span>
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
          {goal > 0 ? `${Math.max(0, goal - current)} ${unit} übrig` : "Kein Ziel"}
        </span>
      </div>
    </div>
  );
}

// ── Trainer Coach Banner ──────────────────────────────────────────────────────
function TrainerGoalBanner({ goals }: { goals: NutritionGoals }) {
  const [expanded, setExpanded] = useState(false);
  const gt = goals.goal_type ? GOAL_TYPE_CFG[goals.goal_type] : null;

  return (
    <div style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.2)", borderRadius: "6px", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{ padding: "12px 16px", background: "none", border: "none" }}
      >
        <div className="flex items-center gap-2">
          <Dumbbell size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)" }}>
            Von deinem Trainer
          </span>
          {gt && (
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: gt.color, background: `${gt.color}18`, padding: "2px 7px", borderRadius: "3px" }}>
              {gt.emoji} {gt.label}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={13} style={{ color: "rgba(202,12,133,0.6)" }} /> : <ChevronDown size={13} style={{ color: "rgba(202,12,133,0.6)" }} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Target weight + date */}
              {(goals.target_weight || goals.target_date) && (
                <div className="flex gap-3">
                  {goals.target_weight && (
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "8px 12px", borderRadius: "4px" }}>
                      <p style={{ ...LABEL_STYLE, marginBottom: "3px" }}>Zielgewicht</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--brand)", lineHeight: 1 }}>
                        {goals.target_weight}
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>kg</span>
                      </p>
                    </div>
                  )}
                  {goals.target_date && (
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "8px 12px", borderRadius: "4px" }}>
                      <p style={{ ...LABEL_STYLE, marginBottom: "3px" }}>Zieldatum</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "white", lineHeight: 1.2, marginTop: "3px" }}>
                        {new Date(goals.target_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Coaching note */}
              {goals.coaching_note && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: "4px" }}>
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span style={{ ...LABEL_STYLE, fontSize: "9px" }}>Notiz vom Trainer</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    {goals.coaching_note}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MemberTracking() {
  const [activeTab, setActiveTab] = useState<"body" | "nutrition">("body");
  const [loading,   setLoading]   = useState(true);

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [goals,        setGoals]        = useState<NutritionGoals | null>(null);
  const [logs,         setLogs]         = useState<NutritionLog[]>([]);

  // Body measurement form
  const [weight,      setWeight]      = useState("");
  const [bodyFat,     setBodyFat]     = useState("");
  const [muscleMass,  setMuscleMass]  = useState("");
  const [waistCm,     setWaistCm]     = useState("");
  const [hipCm,       setHipCm]       = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingBody,  setSavingBody]  = useState(false);

  // Nutrition form
  const [calories,       setCalories]       = useState("");
  const [protein,        setProtein]        = useState("");
  const [carbs,          setCarbs]          = useState("");
  const [fat,            setFat]            = useState("");
  const [waterMl,        setWaterMl]        = useState("");
  const [savingNutrition, setSavingNutrition] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.member.tracking.getData();
      setMeasurements(data.measurements ?? []);
      setGoals(data.goals ?? null);
      setLogs(data.logs ?? []);
    } catch {
      // Demo fallback
      setMeasurements([
        { id: "1", date: "2026-01-05", weight: 87.2, body_fat: 22.1, muscle_mass: 65.0 },
        { id: "2", date: "2026-01-19", weight: 86.0, body_fat: 21.4, muscle_mass: 65.3 },
        { id: "3", date: "2026-02-02", weight: 84.8, body_fat: 20.6, muscle_mass: 65.8 },
        { id: "4", date: "2026-02-16", weight: 83.9, body_fat: 19.9, muscle_mass: 66.1 },
        { id: "5", date: "2026-03-02", weight: 83.2, body_fat: 19.5, muscle_mass: 66.5, waist_cm: 88.0, hip_cm: 98.0 },
        { id: "6", date: "2026-03-16", weight: 82.7, body_fat: 18.8, muscle_mass: 66.9, waist_cm: 87.0, hip_cm: 97.5 },
      ]);
      setGoals({
        calories_goal: 2200, protein_goal: 160, carbs_goal: 220, fat_goal: 70,
        goal_type: "cut", target_weight: 80, target_date: "2026-06-01",
        coaching_note: "Fokus auf Proteinzufuhr – mindestens 150g täglich. Kein Alkohol in den ersten 4 Wochen.",
        set_by_trainer: true,
      });
      setLogs([
        { id: "l1", date: today, calories: 1850, protein: 142, carbs: 180, fat: 55, water_ml: 1800 },
        { id: "l2", date: "2026-03-16", calories: 2100, protein: 158, carbs: 210, fat: 68, water_ml: 2200 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Chart data
  const chartData = useMemo(() => {
    return [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date:     new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
        weight:   m.weight,
        body_fat: m.body_fat,
      }));
  }, [measurements]);

  const sortedM      = useMemo(() =>
    [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  , [measurements]);
  const lastM        = sortedM.at(-1);
  const prevM        = sortedM.at(-2);
  const weightDiff   = lastM && prevM ? lastM.weight - prevM.weight : null;

  const todayLog = logs.find(l => l.date === today) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 };

  // Target weight progress
  const startW     = sortedM[0]?.weight;
  const currentW   = lastM?.weight;
  const targetW    = goals?.target_weight ?? null;
  const goalProgress = (startW && currentW && targetW && startW !== targetW)
    ? Math.min(Math.max(((startW - currentW) / (startW - targetW)) * 100, 0), 100)
    : null;

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    setSavingBody(true);
    try {
      await api.member.tracking.addMeasurement({
        weight:      parseFloat(weight),
        body_fat:    bodyFat    ? parseFloat(bodyFat)    : undefined,
        muscle_mass: muscleMass ? parseFloat(muscleMass) : undefined,
        waist_cm:    waistCm   ? parseFloat(waistCm)    : undefined,
        hip_cm:      hipCm     ? parseFloat(hipCm)      : undefined,
        date:        today,
      });
      toast.success("Messung gespeichert");
      setWeight(""); setBodyFat(""); setMuscleMass(""); setWaistCm(""); setHipCm("");
      setShowAdvanced(false);
      loadData();
    } catch { /* api-service */ } finally { setSavingBody(false); }
  };

  const handleLogNutrition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calories && !protein && !carbs && !fat && !waterMl) return;
    setSavingNutrition(true);
    try {
      await api.member.tracking.logNutrition({
        calories: parseInt(calories) || 0,
        protein:  parseInt(protein)  || 0,
        carbs:    parseInt(carbs)    || 0,
        fat:      parseInt(fat)      || 0,
        water_ml: parseInt(waterMl)  || 0,
        date:     today,
      });
      toast.success("Ernährung & Wasser gespeichert");
      setCalories(""); setProtein(""); setCarbs(""); setFat(""); setWaterMl("");
      loadData();
    } catch { /* api-service */ } finally { setSavingNutrition(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  const gtCfg = goals?.goal_type ? GOAL_TYPE_CFG[goals.goal_type] : null;

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "0.04em", lineHeight: 1, textTransform: "uppercase" }}>
            MEIN<span style={{ color: "var(--brand)" }}> TRACKING</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Körper & Ernährung im Blick
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          style={{ width: "44px", height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px" }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {([
          { key: "body"      as const, icon: Scale,  label: "Mein Körper"  },
          { key: "nutrition" as const, icon: Apple,  label: "Ernährung"    },
        ]).map(({ key, icon: Icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              style={{
                background: "none", border: "none", minHeight: "48px",
                fontFamily: "var(--font-condensed)", fontSize: "12px",
                fontWeight: active ? 700 : 500, letterSpacing: "0.1em", textTransform: "uppercase",
                color: active ? "var(--brand)" : "rgba(255,255,255,0.4)",
                borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon size={16} />{label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ══ BODY TAB ════════════════════════════════════════════════════════ */}
        {activeTab === "body" && (
          <motion.div
            key="body"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "14px 14px", borderRadius: "6px", gridColumn: "span 1" }}>
                <p style={LABEL_STYLE}>Gewicht</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "white", lineHeight: 1, marginTop: "6px" }}>
                  {lastM?.weight ?? "–"}
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>kg</span>
                </p>
                {weightDiff !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    {weightDiff < 0
                      ? <TrendingDown size={11} style={{ color: "#34d399" }} />
                      : <TrendingUp size={11}   style={{ color: "#f59e0b" }} />}
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: weightDiff < 0 ? "#34d399" : "#f59e0b" }}>
                      {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "14px 14px", borderRadius: "6px" }}>
                <p style={LABEL_STYLE}>KFA</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#60a5fa", lineHeight: 1, marginTop: "6px" }}>
                  {lastM?.body_fat ?? "–"}
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>%</span>
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "14px 14px", borderRadius: "6px" }}>
                <p style={LABEL_STYLE}>Muskeln</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#34d399", lineHeight: 1, marginTop: "6px" }}>
                  {lastM?.muscle_mass ?? "–"}
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>kg</span>
                </p>
              </div>
            </div>

            {/* Umfänge */}
            {lastM && (lastM.waist_cm || lastM.hip_cm) && (
              <div className="grid grid-cols-2 gap-3">
                {lastM.waist_cm && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px", borderRadius: "6px" }}>
                    <p style={LABEL_STYLE}>Taille</p>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#a78bfa", lineHeight: 1, marginTop: "5px" }}>
                      {lastM.waist_cm}
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>cm</span>
                    </p>
                  </div>
                )}
                {lastM.hip_cm && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px", borderRadius: "6px" }}>
                    <p style={LABEL_STYLE}>Hüfte</p>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#fb923c", lineHeight: 1, marginTop: "5px" }}>
                      {lastM.hip_cm}
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginLeft: "2px" }}>cm</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Zielgewicht Progress (wenn vom Trainer gesetzt) */}
            {goalProgress !== null && targetW !== null && (
              <div style={{ background: "rgba(202,12,133,0.05)", border: "1px solid rgba(202,12,133,0.15)", padding: "14px 16px", borderRadius: "6px" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target size={13} style={{ color: "var(--brand)" }} />
                    <span style={{ ...LABEL_STYLE, color: "rgba(202,12,133,0.75)" }}>Zielgewicht</span>
                    {gtCfg && (
                      <span style={{ fontSize: "11px" }}>{gtCfg.emoji}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--brand)", lineHeight: 1 }}>
                    {Math.round(goalProgress)}%
                  </span>
                </div>
                <div style={{ height: "7px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goalProgress}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: "100%", background: "linear-gradient(90deg, #CA0C85, #ff4da6)", borderRadius: "4px", boxShadow: "0 0 8px rgba(202,12,133,0.4)" }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>Start: {startW} kg</span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>Ziel: {targetW} kg · {goals?.target_date ? new Date(goals.target_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) : ""}</span>
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 1 && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "16px 8px 8px 0" }}>
                <div className="flex items-center gap-4" style={{ paddingLeft: "16px", marginBottom: "12px" }}>
                  <p style={LABEL_STYLE}>Gewichtsverlauf</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" style={{ fontSize: "9px", fontFamily: "var(--font-condensed)", color: "#CA0C85", letterSpacing: "0.08em" }}>
                      <span style={{ width: "10px", height: "2px", background: "#CA0C85", borderRadius: "1px", display: "inline-block" }} /> Gewicht
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: "9px", fontFamily: "var(--font-condensed)", color: "#60a5fa", letterSpacing: "0.08em" }}>
                      <span style={{ width: "10px", height: "2px", background: "#60a5fa", borderRadius: "1px", display: "inline-block" }} /> KFA
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="memberWeightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#CA0C85" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#CA0C85" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid key="mt-grid" strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis key="mt-xaxis" dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} />
                    <YAxis key="mt-yaxis-w" yAxisId="weight" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={40} />
                    <YAxis key="mt-yaxis-bf" yAxisId="bf" orientation="right" domain={["auto", "auto"]} hide />
                    <Tooltip key="mt-tooltip" content={<ChartTooltip />} />
                    <Area key="mt-area-weight" yAxisId="weight" type="monotone" dataKey="weight" name="Gewicht" stroke="#CA0C85" strokeWidth={2} fill="url(#memberWeightGrad)" dot={{ r: 3, fill: "#CA0C85", stroke: "#CA0C85" }} activeDot={{ r: 5, fill: "#CA0C85", stroke: "white", strokeWidth: 2 }} />
                    <Area key="mt-area-bf" yAxisId="bf" type="monotone" dataKey="body_fat" name="KFA" stroke="#60a5fa" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={{ r: 2, fill: "#60a5fa" }} activeDot={{ r: 4, fill: "#60a5fa", stroke: "white", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Add measurement form */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "16px" }}>
              <p style={{ ...LABEL_STYLE, marginBottom: "12px" }}>Heutige Messung eintragen</p>
              <form onSubmit={handleAddMeasurement} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Gewicht (kg) *</FieldLabel>
                    <Input type="number" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="83.5" />
                  </div>
                  <div>
                    <FieldLabel>Körperfett (%)</FieldLabel>
                    <Input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="19.5" />
                  </div>
                </div>

                {/* Advanced toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(a => !a)}
                  className="flex items-center gap-1 cursor-pointer"
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "2px 0" }}
                >
                  {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Umfänge & Muskelmasse {showAdvanced ? "ausblenden" : "eingeben"}
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div>
                          <FieldLabel>Muskeln (kg)</FieldLabel>
                          <Input type="number" step="0.1" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} placeholder="66.5" />
                        </div>
                        <div>
                          <FieldLabel>Taille (cm)</FieldLabel>
                          <Input type="number" step="0.5" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} placeholder="88.0" />
                        </div>
                        <div>
                          <FieldLabel>Hüfte (cm)</FieldLabel>
                          <Input type="number" step="0.5" value={hipCm} onChange={(e) => setHipCm(e.target.value)} placeholder="97.5" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={savingBody || !weight}
                  className="w-full"
                  style={{ minHeight: "48px", gap: "8px", background: "var(--brand)", boxShadow: "0 0 16px rgba(202,12,133,0.25)" }}
                >
                  {savingBody ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Messung speichern
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ══ NUTRITION TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "nutrition" && (
          <motion.div
            key="nutrition"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* Today header */}
            <div style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)", borderRadius: "6px", padding: "12px 16px" }}>
              <div className="flex items-center gap-2">
                <Target size={14} style={{ color: "var(--brand)" }} />
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)" }}>
                  Tagesübersicht – {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
                </span>
              </div>
            </div>

            {/* Trainer Goals Banner */}
            {goals?.set_by_trainer && <TrainerGoalBanner goals={goals} />}

            {/* No goals message */}
            {!goals && (
              <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "6px", padding: "12px 16px" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(245,158,11,0.8)" }}>
                  Noch keine Ziele gesetzt. Bitte deinen Trainer, deine Ernährungsziele festzulegen.
                </p>
              </div>
            )}

            {/* Calorie Ring + Water */}
            {goals && (
              <div className="flex items-center gap-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "18px 20px" }}>
                {/* SVG Ring */}
                <div className="shrink-0" style={{ position: "relative", width: "80px", height: "80px" }}>
                  <svg viewBox="0 0 36 36" style={{ width: "80px", height: "80px", transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <motion.circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${Math.min((todayLog.calories / (goals.calories_goal || 1)) * 97.4, 97.4)} 97.4`}
                      initial={{ strokeDasharray: "0 97.4" }}
                      animate={{ strokeDasharray: `${Math.min((todayLog.calories / (goals.calories_goal || 1)) * 97.4, 97.4)} 97.4` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.4))" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "white", lineHeight: 1 }}>{todayLog.calories}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "7px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>kcal</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Kalorien heute</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "#f59e0b", lineHeight: 1, marginTop: "2px" }}>
                    {Math.round((todayLog.calories / (goals.calories_goal || 1)) * 100)}%
                  </p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>
                    {todayLog.calories} von {goals.calories_goal} kcal
                  </p>
                  {/* Water */}
                  {todayLog.water_ml != null && todayLog.water_ml > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <GlassWater size={11} style={{ color: "#60a5fa" }} />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#60a5fa" }}>
                        {(todayLog.water_ml / 1000).toFixed(1)} L Wasser
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Macro bars */}
            <div className="space-y-3">
              <MacroBar icon={Flame}    label="Kalorien" current={todayLog.calories} goal={goals?.calories_goal ?? 0} color="#f59e0b" unit="kcal" />
              <MacroBar icon={Beef}     label="Protein"  current={todayLog.protein}  goal={goals?.protein_goal  ?? 0} color="#34d399" unit="g" />
              <MacroBar icon={Wheat}    label="Carbs"    current={todayLog.carbs}    goal={goals?.carbs_goal   ?? 0} color="#60a5fa" unit="g" />
              <MacroBar icon={Droplets} label="Fett"     current={todayLog.fat}      goal={goals?.fat_goal     ?? 0} color="#a78bfa" unit="g" />
            </div>

            {/* Log form */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "16px" }}>
              <p style={{ ...LABEL_STYLE, marginBottom: "12px" }}>Makros & Wasser für heute eintragen</p>
              <form onSubmit={handleLogNutrition} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Kalorien (kcal)</FieldLabel>
                    <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="2200" />
                  </div>
                  <div>
                    <FieldLabel>Protein (g)</FieldLabel>
                    <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="160" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Kohlenhydrate (g)</FieldLabel>
                    <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="220" />
                  </div>
                  <div>
                    <FieldLabel>Fett (g)</FieldLabel>
                    <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="70" />
                  </div>
                </div>
                {/* Water */}
                <div>
                  <FieldLabel>Wasser (ml)</FieldLabel>
                  <div className="flex items-center gap-2">
                    <GlassWater size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
                    <Input type="number" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} placeholder="2000" />
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", flexShrink: 0 }}>ml</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", marginTop: "4px" }}>
                    Empfohlen: mind. 2000 ml täglich
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={savingNutrition || (!calories && !protein && !carbs && !fat && !waterMl)}
                  className="w-full"
                  style={{ minHeight: "48px", gap: "8px", background: "var(--brand)", boxShadow: "0 0 16px rgba(202,12,133,0.25)" }}
                >
                  {savingNutrition ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Eintrag speichern
                </Button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
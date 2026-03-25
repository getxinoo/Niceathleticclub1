/**
 * AdminMemberTrackingTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Trainer-Ansicht für Mitglied-Tracking im Admin MemberProfileSheet.
 * Tab "Tracking": Fortschritts-Charts, Check-in-Frequenz,
 * Makroziele setzen, Coaching-Ziel (Typ / Zielgewicht / Datum) + Coaching-Notiz.
 */

import { useState, useEffect, useMemo } from "react";
import type { ReactNode, CSSProperties } from "react";
import { motion } from "motion/react";
import {
  Loader2, Save, Activity, Target, TrendingDown, TrendingUp,
  Flame, Beef, Wheat, Droplets, MessageSquare,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api-service";
import { ApiError } from "@/lib/api-service";
import { toast } from "sonner";
import type { Member } from "@/lib/api-service";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrackingMeasurement {
  date: string;
  weight: number;
  body_fat?: number;
}

interface TrackingGoals {
  calories_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  goal_type?: "cut" | "bulk" | "maintain";
  target_weight?: number | null;
  target_date?: string | null;
  coaching_note?: string | null;
  set_by_user_id?: number | null;
}

interface TrackingData {
  measurements: TrackingMeasurement[];
  goals: TrackingGoals | null;
  checkins?: Array<{ week: string; count: number }>;
}

// ── Constants ────────────────────────────────────────────────────────────────
const GOAL_TYPES = [
  { value: "cut"      as const, label: "Abnehmen",  emoji: "📉", color: "#34d399" },
  { value: "maintain" as const, label: "Halten",     emoji: "⚖️",  color: "#60a5fa" },
  { value: "bulk"     as const, label: "Aufbauen",  emoji: "📈", color: "#f59e0b" },
];

const MACROS = [
  { key: "calories", label: "Kalorien",        unit: "kcal", color: "#f59e0b", icon: Flame    },
  { key: "protein",  label: "Protein",          unit: "g",    color: "#34d399", icon: Beef     },
  { key: "carbs",    label: "Kohlenhydrate",    unit: "g",    color: "#60a5fa", icon: Wheat    },
  { key: "fat",      label: "Fett",             unit: "g",    color: "#a78bfa", icon: Droplets },
] as const;

// ── Design helpers ────────────────────────────────────────────────────────────
const LS: CSSProperties = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.32)",
  textTransform: "uppercase" as const,
};

function SectionHead({ icon: Icon, children }: {
  icon: (props: { size: number; style?: object }) => JSX.Element;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)", marginLeft: "4px" }} />
    </div>
  );
}

function NacNumInput({ value, onChange, unit, placeholder, min = "0", step = "1" }: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "white",
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          padding: "9px 12px",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
        onBlur={(e) =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      />
      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", flexShrink: 0, minWidth: "30px" }}>
        {unit}
      </span>
    </div>
  );
}

function NacDateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        colorScheme: "dark",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: value ? "white" : "rgba(255,255,255,0.3)",
        fontFamily: "var(--font-body)",
        fontSize: "13px",
        padding: "9px 12px",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
      onBlur={(e) =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminMemberTrackingTab({ member }: { member: Member }) {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [data,     setData]     = useState<TrackingData | null>(null);

  const [macros, setMacros] = useState({ calories: "2000", protein: "120", carbs: "200", fat: "70" });
  const [goalType,     setGoalType]     = useState<"cut" | "bulk" | "maintain">("maintain");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate,   setTargetDate]   = useState("");
  const [coachingNote, setCoachingNote] = useState("");

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    if (!member?.id) return;
    setLoading(true);
    try {
      const result = await api.admin.tracking.getMemberData(member.id);
      setData(result);
      if (result?.goals) {
        const g = result.goals;
        setMacros({
          calories: String(g.calories_goal ?? 2000),
          protein:  String(g.protein_goal  ?? 120),
          carbs:    String(g.carbs_goal    ?? 200),
          fat:      String(g.fat_goal      ?? 70),
        });
        setGoalType((g.goal_type as "cut" | "bulk" | "maintain") ?? "maintain");
        setTargetWeight(g.target_weight ? String(g.target_weight) : "");
        setTargetDate(g.target_date ?? "");
        setCoachingNote(g.coaching_note ?? "");
      }
    } catch {
      // Demo fallback
      const demo: TrackingData = {
        measurements: [
          { date: "2026-01-05", weight: 87.2, body_fat: 22.1 },
          { date: "2026-01-19", weight: 86.0, body_fat: 21.4 },
          { date: "2026-02-02", weight: 84.8, body_fat: 20.6 },
          { date: "2026-02-16", weight: 83.9, body_fat: 19.9 },
          { date: "2026-03-02", weight: 83.2, body_fat: 19.2 },
          { date: "2026-03-16", weight: 82.7, body_fat: 18.8 },
        ],
        goals: {
          calories_goal: 2200, protein_goal: 160, carbs_goal: 220, fat_goal: 70,
          goal_type: "cut", target_weight: 80, target_date: "2026-06-01",
          coaching_note: "Fokus auf Proteinzufuhr – mind. 150g/Tag. Kein Alkohol in Woche 1–4.",
          set_by_user_id: 1,
        },
        checkins: [
          { week: "KW 8",  count: 4 },
          { week: "KW 9",  count: 3 },
          { week: "KW 10", count: 4 },
          { week: "KW 11", count: 2 },
        ],
      };
      setData(demo);
      setMacros({ calories: "2200", protein: "160", carbs: "220", fat: "70" });
      setGoalType("cut");
      setTargetWeight("80");
      setTargetDate("2026-06-01");
      setCoachingNote("Fokus auf Proteinzufuhr – mind. 150g/Tag. Kein Alkohol in Woche 1–4.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member?.id) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.admin.tracking.setGoals(member.id, {
        calories_goal: parseInt(macros.calories, 10) || 0,
        protein_goal:  parseInt(macros.protein, 10)  || 0,
        carbs_goal:    parseInt(macros.carbs, 10)     || 0,
        fat_goal:      parseInt(macros.fat, 10)       || 0,
        goal_type:     goalType,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        target_date:   targetDate   || null,
        coaching_note: coachingNote.trim() || null,
      });
      toast.success("Tracking-Ziele gespeichert", {
        description: `${member.first_name} ${member.last_name} · ${GOAL_TYPES.find(g => g.value === goalType)?.label}`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        toast.error("Datenbank-Migration fehlt!", {
          description: "Bitte api/migrations/tracking_v2.sql in phpMyAdmin ausführen (jeden ALTER TABLE Schritt einzeln). Fehler #1060 dabei ignorieren.",
          duration: 10000,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data?.measurements) return [];
    return [...data.measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date:    new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
        Gewicht: m.weight,
        "KFA %": m.body_fat,
      }));
  }, [data]);

  const sorted = useMemo(() => {
    if (!data?.measurements) return [];
    return [...data.measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const lastM      = sorted.at(-1);
  const prevM      = sorted.at(-2);
  const weightDiff = lastM && prevM ? lastM.weight - prevM.weight : null;

  const startW   = sorted[0]?.weight;
  const currentW = lastM?.weight;
  const targetW  = targetWeight ? parseFloat(targetWeight) : null;
  const goalProgress =
    startW && currentW && targetW && startW !== targetW
      ? Math.min(Math.max(((startW - currentW) / (startW - targetW)) * 100, 0), 100)
      : null;

  const avgCheckins = data?.checkins?.length
    ? (data.checkins.reduce((s, c) => s + c.count, 0) / data.checkins.length).toFixed(1)
    : "–";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── FORTSCHRITT ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHead icon={Activity}>Fortschritt & Messungen</SectionHead>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {
              label: "Gewicht",
              value: lastM?.weight ?? "–",
              unit: "kg",
              color: "white",
              sub: weightDiff !== null
                ? {
                    icon: weightDiff < 0 ? TrendingDown : TrendingUp,
                    c: weightDiff < 0 ? "#34d399" : "#f59e0b",
                    txt: `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)} kg`,
                  }
                : null,
            },
            { label: "KFA",           value: lastM?.body_fat ?? "–", unit: "%",  color: "#60a5fa", sub: null },
            { label: "Check-ins Ø/Wo", value: avgCheckins,            unit: "",   color: "#f59e0b", sub: null },
          ].map(({ label, value, unit, color, sub }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 14px",
              }}
            >
              <p style={LS}>{label}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color, lineHeight: 1, marginTop: "5px" }}>
                {value}
                {unit && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginLeft: "2px" }}>
                    {unit}
                  </span>
                )}
              </p>
              {sub && (
                <div className="flex items-center gap-1 mt-1">
                  <sub.icon size={10} style={{ color: sub.c }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: sub.c }}>{sub.txt}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Weight Chart */}
        {chartData.length > 1 && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "14px 8px 8px 0",
              marginBottom: "12px",
            }}
          >
            <p style={{ ...LS, paddingLeft: "16px", marginBottom: "10px" }}>Gewichtsverlauf</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="adminTrkGradW" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#CA0C85" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#CA0C85" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.28)", fontFamily: "var(--font-condensed)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.28)", fontFamily: "var(--font-condensed)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,10,10,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    borderRadius: "4px",
                  }}
                  labelStyle={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "10px",
                    fontFamily: "var(--font-condensed)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Gewicht"
                  stroke="#CA0C85"
                  strokeWidth={2}
                  fill="url(#adminTrkGradW)"
                  dot={{ r: 3, fill: "#CA0C85", stroke: "#CA0C85" }}
                  activeDot={{ r: 5, fill: "#CA0C85", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Check-in Bars */}
        {(data?.checkins ?? []).length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "14px 8px 10px 0",
            }}
          >
            <p style={{ ...LS, paddingLeft: "16px", marginBottom: "10px" }}>Check-ins letzte Wochen</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={data!.checkins} barSize={24}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.28)", fontFamily: "var(--font-condensed)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 7]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,10,10,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    borderRadius: "4px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="count" name="Check-ins" radius={[2, 2, 0, 0]}>
                  {(data!.checkins ?? []).map((entry, i) => (
                    <Cell
                      key={`ci-cell-${i}`}
                      fill={entry.count >= 3 ? "#CA0C85" : "rgba(255,255,255,0.1)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── ZIELGEWICHT PROGRESS ─────────────────────────────────────────────── */}
      {goalProgress !== null && targetW !== null && (
        <div
          style={{
            background: "rgba(202,12,133,0.05)",
            border: "1px solid rgba(202,12,133,0.15)",
            padding: "14px 16px",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={12} style={{ color: "var(--brand)" }} />
              <span style={{ ...LS, color: "rgba(202,12,133,0.75)" }}>Zielgewicht-Fortschritt</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--brand)", lineHeight: 1 }}>
              {Math.round(goalProgress)}%
            </span>
          </div>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalProgress}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #CA0C85, #ff4da6)",
                borderRadius: "3px",
                boxShadow: "0 0 8px rgba(202,12,133,0.45)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
              Start: {startW} kg
            </span>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
              Ziel: {targetW} kg
            </span>
          </div>
        </div>
      )}

      {/* ── ERNÄHRUNGSZIELE ──────────────────────────────────────────────────── */}
      <div>
        <SectionHead icon={Flame}>Ernährungsziele setzen</SectionHead>
        <div className="space-y-3">
          {MACROS.map(({ key, label, unit, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div style={{ width: "4px", height: "42px", background: color, borderRadius: "2px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ ...LS, marginBottom: "4px" }}>{label}</p>
                <NacNumInput
                  value={macros[key as keyof typeof macros]}
                  onChange={(v) => setMacros((prev) => ({ ...prev, [key]: v }))}
                  unit={unit}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COACHING-ZIEL ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHead icon={Target}>Coaching-Ziel</SectionHead>

        {/* Goal Type */}
        <div className="mb-4">
          <p style={{ ...LS, marginBottom: "8px" }}>Ziel-Typ</p>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_TYPES.map((gt) => {
              const active = goalType === gt.value;
              return (
                <button
                  key={gt.value}
                  type="button"
                  onClick={() => setGoalType(gt.value)}
                  style={{
                    padding: "12px 8px",
                    cursor: "pointer",
                    border: active ? `1px solid ${gt.color}` : "1px solid rgba(255,255,255,0.08)",
                    background: active ? `${gt.color}18` : "rgba(255,255,255,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: active ? `0 0 16px ${gt.color}22` : "none",
                    transition: "all 0.18s",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{gt.emoji}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: active ? gt.color : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {gt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target weight + date */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p style={{ ...LS, marginBottom: "4px" }}>Zielgewicht (kg)</p>
            <NacNumInput
              value={targetWeight}
              onChange={setTargetWeight}
              unit="kg"
              placeholder="80.0"
              min="30"
              step="0.5"
            />
          </div>
          <div>
            <p style={{ ...LS, marginBottom: "4px" }}>Zieldatum</p>
            <NacDateInput value={targetDate} onChange={setTargetDate} />
          </div>
        </div>

        {/* Coaching note */}
        <div>
          <p style={{ ...LS, marginBottom: "4px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <MessageSquare size={9} />
              Coaching-Notiz (sichtbar für Mitglied)
            </span>
          </p>
          <textarea
            rows={4}
            value={coachingNote}
            onChange={(e) => setCoachingNote(e.target.value)}
            placeholder="Persönliche Empfehlungen, Hinweise zum Plan, Motivation..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              padding: "10px 12px",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
              lineHeight: 1.6,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
            onBlur={(e) =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          <p
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "9px",
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.08em",
              textAlign: "right",
              marginTop: "4px",
            }}
          >
            {coachingNote.length} Zeichen
          </p>
        </div>
      </div>

      {/* ── SAVE BUTTON ──────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={handleSave}
        disabled={saving}
        whileHover={saving ? {} : { y: -1, boxShadow: "0 0 28px rgba(202,12,133,0.55)" }}
        whileTap={saving ? {} : { scale: 0.98 }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: "var(--brand)",
          border: "none",
          color: "white",
          fontFamily: "var(--font-condensed)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "14px 20px",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "opacity 0.2s",
          boxShadow: "0 0 20px rgba(202,12,133,0.32)",
          minHeight: "48px",
        }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Tracking-Ziele für {member.first_name} speichern
      </motion.button>

    </div>
  );
}
/**
 * MemberDashboard – "Synergy / Apple Fitness" vibe
 *
 * Sections (staggered fade-up on mount):
 *   1. Greeting header + notification bell
 *   2. Activity rings (concentric SVG, animated on mount)
 *   3. Next session card (glassmorphism)
 *   4. Recent activity strip
 *
 * FAB: "JETZT EINCHECKEN" – fixed above bottom nav on mobile,
 *      inline card on desktop.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Bell,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  Flame,
  TrendingUp,
  CalendarCheck2,
  Dumbbell,
  ArrowRight,
  MessageSquare,
  CreditCard,
  FileText,
  Shield,
  Landmark,
  BarChart3,
} from "lucide-react";
import { CheckInDrawer } from "../components/CheckInDrawer";
import { api } from "../../../lib/api-service";
import type { Member } from "../../../lib/api-service";

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_MEMBER: Member = {
  id: "NAC-2024-001",
  first_name: "Jonas",
  last_name: "Weber",
  email: "",
  status: "active",
  is_blocked: false,
  contract_type: "performance",
  member_since: new Date().toISOString(),
};

const STATS = {
  visitsThisMonth: 12,
  visitsGoal: 20,
  streakDays: 4,
  streakGoal: 7,
  totalVisits: 147,
  caloriesBurned: 8420,
};

const NEXT_SESSION = {
  id: "s1",
  title: "Strength & Power",
  category: "Weights",
  instructor: "Marcus K.",
  time: "18:30",
  durationMin: 60,
  minutesUntil: 45,
  location: "Athletic Area",
  remainingSpots: 3,
};

const RECENT_SESSIONS = [
  { id: "r1", title: "HIIT Cardio Blast", date: "Gestern",    duration: 45, kcal: 580 },
  { id: "r2", title: "Mobility Studio",   date: "Mo, 24. Feb", duration: 60, kcal: 220 },
  { id: "r3", title: "Combat Fitness",    date: "Sa, 22. Feb", duration: 50, kcal: 640 },
];

// ── Stagger variants ──────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

// ── Activity Ring (SVG arc) ───────────────────────────────────────────────────
interface RingProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  progress: number;   // 0 – 1
  color: string;
  trackColor: string;
  reduced: boolean;
  delay?: number;
}

function Ring({
  cx, cy, radius, strokeWidth, progress, color, trackColor, reduced, delay = 0,
}: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <g>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: reduced ? offset : offset }}
        transition={reduced
          ? { duration: 0 }
          : { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }
        }
        strokeDashoffset={reduced ? offset : undefined}
      />
    </g>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MemberDashboard() {
  const reduced = useReducedMotion() ?? false;
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    api.member.profile.get()
      .then(setMember)
      .catch(() => setMember(MOCK_MEMBER));
  }, []);

  const displayMember = member ?? MOCK_MEMBER;
  const firstName = displayMember.first_name ?? "Mitglied";
  const initials  = `${(displayMember.first_name ?? "M")[0] ?? "M"}${(displayMember.last_name ?? "")[0] ?? ""}`;

  const itemVariant = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
    },
  };

  const visitsPct  = STATS.visitsThisMonth / STATS.visitsGoal;
  const streakPct  = STATS.streakDays / STATS.streakGoal;

  const SVG_SIZE = 200;
  const CX = SVG_SIZE / 2;
  const CY = SVG_SIZE / 2;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Guten Morgen" :
    greetingHour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <>
      <div
        className="min-h-screen"
        style={{ background: "var(--surface-0)" }}
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-2xl mx-auto px-5 pt-10 md:pt-14 pb-6 space-y-5"
        >

          {/* ── 1. Header ────────────────────────────────────────────────── */}
          <motion.div
            variants={itemVariant}
            className="flex items-start justify-between gap-4"
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                }}
              >
                {new Date().toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
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
                {greeting},
                <br />
                <span style={{ color: "var(--brand)" }}>
                  {firstName}!
                </span>
              </h1>
            </div>

            {/* Avatar + bell */}
            <div className="flex items-center gap-3 shrink-0 pt-1">
              <button
                className="relative flex items-center justify-center"
                style={{
                  width: "44px",
                  height: "44px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Bell size={18} />
                {/* Notification dot */}
                <span
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{
                    background: "var(--brand)",
                    boxShadow: "0 0 6px rgba(202,12,133,0.8)",
                  }}
                />
              </button>
              <div
                className="w-11 h-11 flex items-center justify-center text-white shrink-0"
                style={{
                  background: "rgba(202,12,133,0.2)",
                  border: "2px solid rgba(202,12,133,0.4)",
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  letterSpacing: "0.04em",
                  borderRadius: "50%",
                  boxShadow: "0 0 16px rgba(202,12,133,0.25)",
                }}
              >
                {initials}
              </div>
            </div>
          </motion.div>

          {/* ── 2. Activity Rings ────────────────────────────────────────── */}
          <motion.div
            variants={itemVariant}
            className="flex items-center gap-6 p-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Rings SVG */}
            <div className="relative shrink-0">
              <svg
                width={SVG_SIZE}
                height={SVG_SIZE}
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                className="drop-shadow-[0_0_20px_rgba(202,12,133,0.15)]"
              >
                {/* Outer ring – Visits (Magenta) */}
                <Ring
                  cx={CX} cy={CY}
                  radius={82}
                  strokeWidth={14}
                  progress={visitsPct}
                  color="#CA0C85"
                  trackColor="rgba(202,12,133,0.1)"
                  reduced={reduced}
                  delay={0.2}
                />
                {/* Inner ring – Streak (silver/white) */}
                <Ring
                  cx={CX} cy={CY}
                  radius={57}
                  strokeWidth={12}
                  progress={streakPct}
                  color="rgba(255,255,255,0.85)"
                  trackColor="rgba(255,255,255,0.06)"
                  reduced={reduced}
                  delay={0.4}
                />

                {/* Center value */}
                <text
                  x={CX} y={CY - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "28px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {STATS.visitsThisMonth}
                </text>
                <text
                  x={CX} y={CY + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.3)"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em" }}
                >
                  BESUCHE
                </text>
              </svg>
            </div>

            {/* Ring legend */}
            <div className="flex flex-col gap-5 flex-1">
              {/* Ring 1 */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "var(--brand)", boxShadow: "0 0 6px rgba(202,12,133,0.7)" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      color: "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                    }}
                  >
                    Besuche
                  </span>
                </div>
                <p
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.8rem",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {STATS.visitsThisMonth}
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.3)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    /{STATS.visitsGoal}
                  </span>
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                  {Math.round(visitsPct * 100)} % diesen Monat
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

              {/* Ring 2 */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "rgba(255,255,255,0.75)" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      color: "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                    }}
                  >
                    Streak
                  </span>
                </div>
                <p
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.8rem",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {STATS.streakDays}
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.3)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    /{STATS.streakGoal} Tage
                  </span>
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                  Ziel: {STATS.streakGoal} Tage in Folge
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── 3. Next Session Card ──────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <p
              className="mb-3"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              Nächste Einheit
            </p>

            <div
              className="relative overflow-hidden p-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.3)",
              }}
            >
              {/* Top gradient accent */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(to right, transparent 10%, rgba(202,12,133,0.6) 50%, transparent 90%)",
                }}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Time badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1"
                      style={{
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.25)",
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "var(--brand)",
                        textTransform: "uppercase",
                      }}
                    >
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--brand)" }}
                        animate={reduced ? {} : { opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      In {NEXT_SESSION.minutesUntil} Minuten
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "12px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {NEXT_SESSION.time} Uhr
                    </span>
                  </div>

                  {/* Class name */}
                  <p
                    className="text-white mb-1 truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.5rem",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    {NEXT_SESSION.title}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <span
                      className="flex items-center gap-1.5"
                      style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}
                    >
                      <Dumbbell size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                      {NEXT_SESSION.instructor}
                    </span>
                    <span
                      className="flex items-center gap-1.5"
                      style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}
                    >
                      <MapPin size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                      {NEXT_SESSION.location}
                    </span>
                    <span
                      className="flex items-center gap-1.5"
                      style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}
                    >
                      <Clock size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                      {NEXT_SESSION.durationMin} min
                    </span>
                  </div>
                </div>

                {/* Calendar badge */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center"
                  style={{
                    width: "52px",
                    height: "56px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      color: "var(--brand)",
                      textTransform: "uppercase",
                    }}
                  >
                    Heute
                  </span>
                  <span
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.6rem",
                      lineHeight: 1.1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {new Date().getDate()}
                  </span>
                </div>
              </div>

              {/* Spots warning */}
              {NEXT_SESSION.remainingSpots <= 5 && (
                <p
                  className="mt-3"
                  style={{ fontSize: "12px", color: "#f59e0b" }}
                >
                  ⚠️ Nur noch {NEXT_SESSION.remainingSpots} Plätze frei
                </p>
              )}

              {/* CTA row */}
              <div className="flex gap-3 mt-4">
                <button
                  className="flex-1 flex items-center justify-center gap-2 text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  style={{
                    background: "var(--brand)",
                    minHeight: "48px",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    border: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
                >
                  <CalendarCheck2 size={13} />
                  Jetzt buchen
                </button>
                <Link
                  to="/member/kurse"
                  className="flex items-center justify-center gap-2 px-4 text-white/50 hover:text-white/80 transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    minHeight: "48px",
                  }}
                >
                  Alle Kurse
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── 4. Quick Stats Strip ──────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <p
              className="mb-3"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              Diese Woche
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: "Besuche",  value: "3",                  sub: "diese Woche" },
                { icon: Flame,      label: "Kalorien", value: STATS.caloriesBurned.toLocaleString("de-DE"), sub: "kcal Monat" },
                { icon: Zap,        label: "Streak",   value: `${STATS.streakDays}d`, sub: "in Folge" },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center py-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Icon size={16} style={{ color: "var(--brand)", marginBottom: "6px" }} />
                  <span
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.4rem",
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      marginTop: "3px",
                    }}
                  >
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── 5. Recent Sessions ────────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <div className="flex items-center justify-between mb-3">
              <p
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                }}
              >
                Letzte Einheiten
              </p>
              <Link
                to="/member/buchungen"
                className="flex items-center gap-1 hover:text-brand transition-colors"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--brand)",
                }}
              >
                Alle
                <ChevronRight size={11} />
              </Link>
            </div>

            <div className="space-y-2">
              {RECENT_SESSIONS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.5 + i * 0.07 }}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="w-9 h-9 flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(202,12,133,0.1)",
                      border: "1px solid rgba(202,12,133,0.15)",
                    }}
                  >
                    <Dumbbell size={14} style={{ color: "var(--brand)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-white/80 truncate"
                      style={{ fontSize: "13px", fontWeight: 500 }}
                    >
                      {s.title}
                    </p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                      {s.date} · {s.duration} min
                    </p>
                  </div>
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {s.kcal} kcal
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── 6. Coaching CTA ──────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <Link
              to="/member/coaching"
              className="flex items-center gap-4 p-4 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)";
                e.currentTarget.style.background = "rgba(255,255,255,0.035)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(202,12,133,0.1)",
                  border: "1px solid rgba(202,12,133,0.2)",
                }}
              >
                <MessageSquare size={18} style={{ color: "var(--brand)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Coaching anfragen
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                  Individueller Trainings- oder Ernährungsplan
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            </Link>
          </motion.div>

          {/* ── 7. Vertrag & Zahlung Quick-Widget ────────────────────── */}
          <motion.div variants={itemVariant}>
            <p
              className="mb-3"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              Vertrag & Zahlung
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Contract Status */}
              <div
                className="p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={13} style={{ color: "var(--brand)" }} />
                  <span style={{
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                  }}>
                    Paket
                  </span>
                </div>
                <p className="text-white" style={{
                  fontFamily: "var(--font-display)", fontSize: "1.2rem",
                  letterSpacing: "0.03em", textTransform: "uppercase", lineHeight: 1,
                }}>
                  {displayMember.contract_type === "elite" ? "Elite"
                    : displayMember.contract_type === "performance" ? "Performance"
                    : "Starter"}
                </p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>
                  Aktiv seit {new Date(displayMember.member_since || "2024-01-01").toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                </p>
              </div>

              {/* SEPA / Next Payment */}
              <div
                className="p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Landmark size={13} style={{ color: "#60a5fa" }} />
                  <span style={{
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                  }}>
                    Naechste Zahlung
                  </span>
                </div>
                <p className="text-white" style={{
                  fontFamily: "var(--font-display)", fontSize: "1.2rem",
                  letterSpacing: "0.03em", lineHeight: 1,
                }}>
                  01.04.
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-2"
                  style={{
                    padding: "1px 6px",
                    background: "rgba(74,222,128,0.1)",
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80",
                    borderRadius: "2px",
                  }}
                >
                  <CreditCard size={8} /> SEPA Aktiv
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── 8. Quick Links ──────────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <p
              className="mb-3"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              Quick Links
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { to: "/member/vertrag", icon: FileText, label: "Vertrag", color: "#a78bfa" },
                { to: "/member/tracking", icon: BarChart3, label: "Tracking", color: "#4ade80" },
                { to: "/member/profil", icon: Shield, label: "Profil", color: "var(--brand)" },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex flex-col items-center justify-center py-4 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${link.color}40`;
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <link.icon size={18} style={{ color: link.color, marginBottom: "6px" }} />
                  <span style={{
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
                  }}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Desktop check-in inline card */}
          <motion.div
            variants={itemVariant}
            className="hidden md:block"
          >
            <button
              onClick={() => setCheckInOpen(true)}
              className="w-full flex items-center justify-center gap-3 text-white transition-all duration-300 cursor-pointer active:scale-[0.99]"
              style={{
                background: "var(--brand)",
                minHeight: "60px",
                fontFamily: "var(--font-display)",
                fontSize: "1.4rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                border: "none",
                boxShadow: "0 0 30px rgba(202,12,133,0.45), 0 0 60px rgba(202,12,133,0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--brand-light)";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(202,12,133,0.6), 0 0 80px rgba(202,12,133,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(202,12,133,0.45), 0 0 60px rgba(202,12,133,0.15)";
              }}
            >
              <Zap size={20} />
              JETZT EINCHECKEN
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Mobile FAB: fixed above bottom nav ─────────────────────────── */}
      <div
        className="md:hidden fixed left-4 right-4 z-30"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setCheckInOpen(true)}
          className="w-full flex items-center justify-center gap-3 text-white cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            background: "var(--brand)",
            minHeight: "56px",
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            border: "none",
            boxShadow:
              "0 0 25px rgba(202,12,133,0.55), 0 0 50px rgba(202,12,133,0.2), 0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <Zap size={18} />
          JETZT EINCHECKEN
        </motion.button>
      </div>

      {/* ── Check-In Drawer ───────────────────────────────────────────────── */}
      <CheckInDrawer
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        member={displayMember}
      />
    </>
  );
}
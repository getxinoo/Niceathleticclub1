import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams, Link } from "react-router";
import { Clock, Users, Flame, ChevronRight, ChevronDown, CalendarDays } from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { TIMETABLE, type WeekDay, type TimetableEntry } from "../../data/team";
import { api } from "../../lib/api-service";
import { cn } from "../../lib/utils";
import { BookingModal } from "../components/BookingModal";

// ── Helpers ───
const DAYS: WeekDay[] = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_LABELS_LONG: Record<WeekDay, string> = {
  Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch",
  Do: "Donnerstag", Fr: "Freitag", Sa: "Samstag", So: "Sonntag",
};

const CATEGORY_COLORS: Record<string, string> = {
  CrossFit:   "#CA0C85",
  Hyrox:      "#f97316",
  Functional: "#3b82f6",
  Strength:   "#22c55e",
  "Open Gym": "#a855f7",
};

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Reusable Label
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-5"
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--brand)",
      }}
    >
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
      {children}
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────
export default function Kurse() {
  const reduced = useReducedMotion();
  const [activeDay, setActiveDay] = useState<WeekDay>("Mo");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(TIMETABLE);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TimetableEntry | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Mobile category filter scroll ref
  const catScrollRef = useRef<HTMLDivElement>(null);

  // Read filter from URL query param (e.g. ?filter=CrossFit)
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      setActiveCategory(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    api.public.kurse()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const WEEKDAY_MAP: Record<string, WeekDay> = {
            Montag: "Mo", Dienstag: "Di", Mittwoch: "Mi",
            Donnerstag: "Do", Freitag: "Fr", Samstag: "Sa", Sonntag: "So",
            Mo: "Mo", Di: "Di", Mi: "Mi", Do: "Do", Fr: "Fr", Sa: "Sa", So: "So",
          };
          const mapped: TimetableEntry[] = data
            .filter((c: any) => c.active !== false)
            .map((c: any) => ({
              id: String(c.id),
              title: c.title,
              trainer: c.instructor || "",
              time: c.time,
              duration: c.duration || "60 min",
              day: WEEKDAY_MAP[c.weekday] || "Mo",
              category: c.category as TimetableEntry["category"],
              spots: c.capacity || 16,
              spotsLeft: Math.max(0, (c.capacity || 16) - (c.enrolled || 0)),
            }));
          if (mapped.length > 0) setTimetable(mapped);
        }
      })
      .catch(() => { /* Fallback: statische Daten */ });
  }, []);

  const categories = Array.from(new Set(timetable.map((e) => e.category)));
  const filtered = timetable.filter(
    (e) =>
      e.day === activeDay &&
      (activeCategory === null || e.category === activeCategory)
  ).sort((a, b) => a.time.localeCompare(b.time));

  // Count per category for active day
  const dayCounts = timetable
    .filter((e) => e.day === activeDay)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {});

  return (
    <>
      <PageMeta
        title="Kurse & Stundenplan Göppingen – CrossFit, HYROX & mehr | NAC"
        description="Kursangebot im Nice Athletic Club Göppingen: CrossFit WODs, HYROX Training, Strength & Conditioning, Mobility – 20+ Einheiten pro Woche, zertifizierte Coaches. Gratis Probetraining buchen!"
        canonical="https://nicefitness.de/kurse"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            HERO – Desktop: original | Mobile: immersive compact
           ══════════════════════════════════════════════════════════════════ */}

        {/* ── Desktop Header (sm+) ── original unchanged ── */}
        <section
          className="pt-36 pb-16 relative overflow-hidden hidden sm:block"
          style={{ backgroundColor: "var(--surface-0)" }}
        >
          <div
            className="absolute top-0 right-0 w-[500px] h-[300px] opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, #CA0C85, transparent 70%)" }}
          />
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="inline-flex items-center gap-2 text-brand mb-4"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em" }}
              >
                <span className="w-6 h-px bg-brand" />
                Wöchentlicher Plan
              </span>
              <h1
                className="text-white mb-4"
                style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", fontFamily: "var(--font-display)" }}
              >
                UNSER <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>KURSPLAN</span>
              </h1>
              <p className="text-white/50 max-w-xl leading-relaxed">
                {timetable.length}+ Kurse pro Woche. Von früh bis spät, von Eisen bis Flow.
                Finde deinen Rhythmus.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Mobile Header (< sm) ── immersive with stats ── */}
        <section
          className="relative pt-28 pb-8 overflow-hidden sm:hidden"
          style={{ backgroundColor: "var(--surface-0)" }}
        >
          <div
            className="absolute top-0 right-0 w-[350px] h-[250px] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, #CA0C85, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-[250px] h-[200px] opacity-8 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at bottom left, #CA0C85, transparent 70%)" }}
          />

          <div className="relative px-6" style={{ zIndex: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Breadcrumb */}
              <nav
                className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}
              >
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">KURSPLAN</span>
              </nav>

              <Label>Wöchentlicher Plan</Label>

              <h1
                className="text-white mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.5rem, 12vw, 4rem)",
                  lineHeight: 0.92,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                UNSER{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                  KURSPLAN
                </span>
              </h1>

              <p className="text-white/45 leading-relaxed mb-6" style={{ fontSize: "0.9rem" }}>
                {timetable.length}+ Kurse pro Woche. Finde deinen Rhythmus.
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2.5 mb-2">
                <div
                  className="text-center py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                    {timetable.length}+
                  </span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                    Kurse / Woche
                  </span>
                </div>
                <div
                  className="text-center py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                    {categories.length}
                  </span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                    Kategorien
                  </span>
                </div>
                <div
                  className="text-center py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                    7
                  </span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                    Tage / Woche
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center mt-4"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <ChevronDown size={16} className="text-white/20" />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TIMETABLE SECTION
           ══════════════════════════════════════════════════════════════════ */}
        <section className="pb-24" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="max-w-7xl mx-auto sm:px-6">

            {/* ── Desktop Filters (sm+) ── original unchanged ── */}
            <div className="hidden sm:flex flex-row gap-4 items-center justify-between mb-8 px-0">
              {/* Day tabs */}
              <div
                className="flex gap-1 p-1 rounded-sm overflow-x-auto"
                style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={cn(
                      "px-4 py-2 transition-all duration-200 cursor-pointer rounded-sm whitespace-nowrap",
                      activeDay === day
                        ? "text-white"
                        : "text-white/40 hover:text-white/70"
                    )}
                    style={{
                      background: activeDay === day ? "var(--brand)" : "transparent",
                      fontFamily: "var(--font-condensed)",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      border: "none",
                      minHeight: "44px",
                      minWidth: "44px",
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Category filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "px-3 py-1.5 transition-all duration-200 cursor-pointer",
                    activeCategory === null ? "text-white" : "text-white/40 hover:text-white/70"
                  )}
                  style={{
                    background: activeCategory === null ? "rgba(255,255,255,0.08)" : "transparent",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    minHeight: "36px",
                  }}
                >
                  Alle
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className="px-3 py-1.5 transition-all duration-200 cursor-pointer"
                    style={{
                      background: activeCategory === cat ? CATEGORY_COLORS[cat] + "22" : "transparent",
                      border: `1px solid ${activeCategory === cat ? CATEGORY_COLORS[cat] + "66" : "rgba(255,255,255,0.08)"}`,
                      color: activeCategory === cat ? CATEGORY_COLORS[cat] : "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      minHeight: "36px",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Mobile Filters (< sm) ── optimized sticky filters ── */}
            <div className="sm:hidden sticky top-[64px] z-30 pb-3 pt-3 -mx-0 px-0" style={{ backgroundColor: "var(--surface-0)" }}>
              {/* Day selector – full width 7-column grid */}
              <div className="px-4 mb-3">
                <div
                  className="grid grid-cols-7 gap-0 p-0.5"
                  style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {DAYS.map((day) => {
                    const isActive = activeDay === day;
                    const dayCount = timetable.filter((e) => e.day === day).length;
                    return (
                      <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className="flex flex-col items-center justify-center py-2.5 transition-all duration-200 cursor-pointer"
                        style={{
                          background: isActive ? "var(--brand)" : "transparent",
                          border: "none",
                          minHeight: "52px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-condensed)",
                            fontSize: "13px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: isActive ? "white" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {day}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-condensed)",
                            fontSize: "9px",
                            fontWeight: 600,
                            color: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                            marginTop: "2px",
                          }}
                        >
                          {dayCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category filter – horizontal scroll */}
              <div
                ref={catScrollRef}
                className="kurse-cat-scroll flex gap-2 overflow-x-auto px-4 pb-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
              >
                <style>{`.kurse-cat-scroll::-webkit-scrollbar { display: none; }`}</style>
                <button
                  onClick={() => setActiveCategory(null)}
                  className="shrink-0 px-3.5 py-2 transition-all duration-200 cursor-pointer"
                  style={{
                    background: activeCategory === null ? "rgba(255,255,255,0.1)" : "transparent",
                    border: `1px solid ${activeCategory === null ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                    color: activeCategory === null ? "white" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    minHeight: "36px",
                    whiteSpace: "nowrap",
                  }}
                >
                  ALLE ({timetable.filter((e) => e.day === activeDay).length})
                </button>
                {categories.map((cat) => {
                  const count = dayCounts[cat] || 0;
                  const isActive = activeCategory === cat;
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(isActive ? null : cat)}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 transition-all duration-200 cursor-pointer"
                      style={{
                        background: isActive ? color + "22" : "transparent",
                        border: `1px solid ${isActive ? color + "66" : "rgba(255,255,255,0.08)"}`,
                        color: isActive ? color : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        minHeight: "36px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      {cat} ({count})
                    </button>
                  );
                })}
                <div className="shrink-0 w-2" aria-hidden="true" />
              </div>

              {/* Active day label */}
              <div className="px-4 mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} style={{ color: "var(--brand)" }} />
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                    {DAY_LABELS_LONG[activeDay]}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)" }}>
                  {filtered.length} {filtered.length === 1 ? "KURS" : "KURSE"}
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                COURSE CARDS
               ══════════════════════════════════════════════════════════════ */}
            <div className="px-4 sm:px-0">
              {filtered.length === 0 ? (
                <div className="py-20 text-center text-white/30">
                  <CalendarDays size={32} className="mx-auto mb-4 text-white/15" />
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                    KEINE KURSE
                  </p>
                  <p className="mt-2" style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                    {activeCategory
                      ? `Keine ${activeCategory}-Kurse am ${DAY_LABELS_LONG[activeDay]}`
                      : `Keine Kurse am ${DAY_LABELS_LONG[activeDay]}`
                    }
                  </p>
                </div>
              ) : (
                <motion.div
                  key={activeDay + activeCategory}
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                  className="grid gap-3"
                >
                  {filtered.map((entry, i) => {
                    const isFull = entry.spotsLeft === 0;
                    const isAlmostFull = entry.spotsLeft <= 3 && entry.spotsLeft > 0;
                    const color = CATEGORY_COLORS[entry.category];

                    return (
                      <motion.div key={entry.id} variants={fadeUp} custom={i}>
                        {/* ── Desktop Card (sm+) ── original ── */}
                        <div
                          className="hidden sm:flex group flex-row items-center gap-4 p-5 transition-all duration-300 cursor-pointer"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = color + "44";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.05)";
                          }}
                        >
                          {/* Time */}
                          <div className="shrink-0 w-16">
                            <span
                              className="text-white/70"
                              style={{ fontFamily: "var(--font-condensed)", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.04em" }}
                            >
                              {entry.time}
                            </span>
                          </div>

                          {/* Category accent bar */}
                          <div className="w-0.5 h-12 shrink-0" style={{ background: color }} />

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                              <span
                                className="text-white"
                                style={{ fontFamily: "var(--font-condensed)", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.04em" }}
                              >
                                {entry.title}
                              </span>
                              <span
                                className="px-2 py-0.5"
                                style={{
                                  background: color + "18",
                                  border: `1px solid ${color}33`,
                                  color,
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  letterSpacing: "0.12em",
                                }}
                              >
                                {entry.category}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span className="flex items-center gap-1.5 text-white/40 text-xs">
                                <Clock size={11} />
                                {entry.duration}
                              </span>
                              <span className="text-white/40 text-xs">
                                mit {entry.trainer}
                              </span>
                            </div>
                          </div>

                          {/* Spots */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <Users size={12} style={{ color: isFull ? "#ef4444" : isAlmostFull ? "#f97316" : "rgba(255,255,255,0.3)" }} />
                              <span
                                className="text-xs"
                                style={{ color: isFull ? "#ef4444" : isAlmostFull ? "#f97316" : "rgba(255,255,255,0.4)" }}
                              >
                                {isFull ? "Ausgebucht" : `${entry.spotsLeft} Plätze frei`}
                              </span>
                            </div>

                            <button
                              className={cn(
                                "flex items-center gap-1.5 px-4 py-2 transition-all duration-200",
                                isFull
                                  ? "cursor-pointer opacity-80 hover:opacity-100"
                                  : "cursor-pointer hover:gap-2.5"
                              )}
                              style={{
                                background: isFull ? "rgba(249,115,22,0.12)" : "var(--brand)",
                                border: isFull ? "1px solid rgba(249,115,22,0.25)" : "none",
                                color: isFull ? "#f97316" : "white",
                                fontFamily: "var(--font-condensed)",
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                minHeight: "36px",
                              }}
                              onClick={() => {
                                setSelectedCourse(entry);
                                setBookingModalOpen(true);
                              }}
                            >
                              {isFull ? "Warteliste" : "Buchen"}
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>

                        {/* ── Mobile Card (< sm) ── optimized compact layout ── */}
                        <div
                          className="sm:hidden relative overflow-hidden p-4 transition-all duration-200 active:scale-[0.99]"
                          style={{
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderLeft: `3px solid ${color}`,
                          }}
                          onClick={() => {
                            setSelectedCourse(entry);
                            setBookingModalOpen(true);
                          }}
                        >
                          {/* Top row: Time + Title + Category */}
                          <div className="flex items-start gap-3 mb-3">
                            {/* Time block */}
                            <div
                              className="shrink-0 flex flex-col items-center justify-center px-2.5 py-2"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                minWidth: "54px",
                              }}
                            >
                              <span
                                className="text-white"
                                style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", lineHeight: 1, letterSpacing: "0.02em" }}
                              >
                                {entry.time}
                              </span>
                              <span
                                style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginTop: "2px" }}
                              >
                                UHR
                              </span>
                            </div>

                            {/* Title + Meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span
                                  className="text-white"
                                  style={{ fontFamily: "var(--font-condensed)", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.04em" }}
                                >
                                  {entry.title}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 shrink-0"
                                  style={{
                                    background: color + "18",
                                    border: `1px solid ${color}33`,
                                    color,
                                    fontFamily: "var(--font-condensed)",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                  }}
                                >
                                  {entry.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-white/35" style={{ fontSize: "12px" }}>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {entry.duration}
                                </span>
                                <span>·</span>
                                <span>{entry.trainer}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom row: Spots + CTA */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Users size={11} style={{ color: isFull ? "#ef4444" : isAlmostFull ? "#f97316" : "rgba(255,255,255,0.3)" }} />
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "var(--font-condensed)",
                                  fontWeight: 600,
                                  letterSpacing: "0.06em",
                                  color: isFull ? "#ef4444" : isAlmostFull ? "#f97316" : "rgba(255,255,255,0.35)",
                                }}
                              >
                                {isFull ? "Ausgebucht" : isAlmostFull ? `Nur noch ${entry.spotsLeft} Plätze!` : `${entry.spotsLeft} Plätze frei`}
                              </span>
                              {isAlmostFull && (
                                <Flame size={11} style={{ color: "#f97316" }} />
                              )}
                            </div>

                            <button
                              className="flex items-center gap-1.5 px-3.5 py-2 transition-all duration-200 cursor-pointer active:scale-[0.97]"
                              style={{
                                background: isFull ? "rgba(249,115,22,0.12)" : "var(--brand)",
                                border: isFull ? "1px solid rgba(249,115,22,0.25)" : "none",
                                color: isFull ? "#f97316" : "white",
                                fontFamily: "var(--font-condensed)",
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                minHeight: "40px",
                                minWidth: "44px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCourse(entry);
                                setBookingModalOpen(true);
                              }}
                            >
                              {isFull ? "WARTELISTE" : "BUCHEN"}
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* ── Legend ── */}
              {/* Desktop legend */}
              <div className="hidden sm:flex mt-10 pt-6 border-t border-white/5 flex-wrap gap-4">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-white/30 text-xs">{cat}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                  <Flame size={12} className="text-brand" />
                  <span className="text-white/30 text-xs">≤ 3 Plätze frei</span>
                </div>
              </div>

              {/* Mobile legend – compact */}
              <div className="sm:hidden mt-6 pt-4 border-t border-white/5">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                  {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)" }}>{cat}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <Flame size={10} style={{ color: "#f97316" }} />
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)" }}>
                    ≤ 3 Plätze = fast ausgebucht
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        course={selectedCourse}
      />
    </>
  );
}

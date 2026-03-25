import { useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Zap,
  Timer,
  Users,
  Trophy,
  Flame,
  Heart,
  Calendar,
  CheckCircle2,
  Star,
  Target,
  Shield,
  Clock,
  Ticket,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { TIMETABLE, type TimetableEntry, type WeekDay } from "../../data/team";

// ── CrossFit GP Hero Image ────────────────────────────────────────────────────
import crossfitHeroImg from "figma:asset/18f8b000a6830c4e5c290c3ac9791507dff42cb0.png";
import scheduleImg from "figma:asset/c2ea08b1dc715a3a10fd1069824bb9159588c6a1.png";
import communityImg from "figma:asset/35e76d1d2d057faed6dca6fc46b6517adbac4d35.png";

// ── Animation helpers ─────────────────────────────────────────────────────────
const makeVariants = (reduced: boolean | null) => ({
  fadeUp: {
    hidden: { opacity: 0, y: reduced ? 0 : 32 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  stagger: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  },
});

// ── Reusable Label ────────────────────────────────────────────────────────────
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

// ── WOD Schedule ──────────────────────────────────────────────────────────────
// Build CrossFit schedule from real timetable data
const DAY_MAP: { short: WeekDay; long: string }[] = [
  { short: "Mo", long: "Montag" },
  { short: "Di", long: "Dienstag" },
  { short: "Mi", long: "Mittwoch" },
  { short: "Do", long: "Donnerstag" },
  { short: "Fr", long: "Freitag" },
  { short: "Sa", long: "Samstag" },
  { short: "So", long: "Sonntag" },
];

const CROSSFIT_SCHEDULE = DAY_MAP
  .map(({ short, long }) => {
    const entries = TIMETABLE
      .filter((e) => e.day === short && e.category === "CrossFit")
      .sort((a, b) => a.time.localeCompare(b.time));
    return { day: long, shortDay: short, entries };
  })
  .filter(({ entries }) => entries.length > 0);

// ── MySports Tagesticket Link ─────────────────────────────────────────────────
const MYSPORTS_TICKET_URL =
  "https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets";

// ── CrossFit Benefits ─────────────────────────────────────────────────────────
const CF_BENEFITS = [
  {
    icon: Zap,
    title: "Funktionelles Training",
    desc: "Constantly varied, functional movements performed at high intensity – die Essenz von CrossFit.",
  },
  {
    icon: Users,
    title: "Community Spirit",
    desc: "Zusammen schwitzen, zusammen feiern. Das Workout schweißt zusammen wie nichts anderes.",
  },
  {
    icon: Timer,
    title: "Effiziente Workouts",
    desc: "In 60 Minuten komplett fertig – Warm-up, Skill, Workout und Cool-down inklusive.",
  },
  {
    icon: Trophy,
    title: "Für jedes Level",
    desc: "Jede Übung ist skalierbar. Vom Anfänger bis zum Competition-Athleten – alle trainieren zusammen.",
  },
  {
    icon: Flame,
    title: "Zertifizierte Coaches",
    desc: "Unsere CrossFit Coaches (L1–L2) sorgen für sichere Technik und maximalen Output.",
  },
  {
    icon: Heart,
    title: "GPP – General Physical Preparedness",
    desc: "CrossFit GPP bereitet dich auf alles vor – Sport, Alltag und jede Herausforderung.",
  },
];

// ── WOD Types ─────────────────────────────────────────────────────────────────
const WOD_TYPES = [
  {
    title: "CrossFit Workout of the Day",
    tag: "Basis",
    desc: "Das klassische Workout of the Day. Jeden Tag anders, immer intensiv. Perfekt für Einsteiger und Fortgeschrittene.",
    icon: Zap,
  },
  {
    title: "CrossFit Open Gym",
    tag: "Freestyle",
    desc: "Freies Training in der CrossFit-Zone. Arbeite an deinen Skills, Weaknesses oder deinem eigenen Programm.",
    icon: Target,
  },
  {
    title: "Hyrox Training",
    tag: "Competition",
    desc: "Gezieltes Training für den Hyrox-Wettkampf. SkiErg, Sled, Wall Balls und Running auf wettkampfnahem Parcours.",
    icon: Trophy,
  },
  {
    title: "Olympic Lifting",
    tag: "Strength",
    desc: "Snatch, Clean & Jerk – technikfokussiertes Training mit Eleiko-Equipment für saubere Lifts.",
    icon: Shield,
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "20+", label: "Workouts / Woche" },
  { value: "6", label: "Zertifizierte Coaches" },
  { value: "200m²", label: "CrossFit-Fläche" },
  { value: "4,9/5", label: "Google Rating" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CrossfitGP() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  const benefitsRef = useRef<HTMLDivElement>(null);
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-80px" });

  const wodsRef = useRef<HTMLDivElement>(null);
  const wodsInView = useInView(wodsRef, { once: true, margin: "-80px" });

  const scheduleRef = useRef<HTMLDivElement>(null);
  const scheduleInView = useInView(scheduleRef, { once: true, margin: "-80px" });

  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  // Mobile carousel states – Benefits
  const benefitsScrollRef = useRef<HTMLDivElement>(null);
  const [activeBenefitIdx, setActiveBenefitIdx] = useState(0);
  const handleBenefitsScroll = useCallback(() => {
    const el = benefitsScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const idx = Math.round(el.scrollLeft / (cardWidth + 12));
    setActiveBenefitIdx(Math.min(idx, CF_BENEFITS.length - 1));
  }, []);
  const scrollToBenefit = useCallback((index: number) => {
    const el = benefitsScrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: index * (cardWidth + 12), behavior: "smooth" });
  }, []);

  // Mobile carousel states – WOD Types
  const wodsScrollRef = useRef<HTMLDivElement>(null);
  const [activeWodIdx, setActiveWodIdx] = useState(0);
  const handleWodsScroll = useCallback(() => {
    const el = wodsScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const idx = Math.round(el.scrollLeft / (cardWidth + 12));
    setActiveWodIdx(Math.min(idx, WOD_TYPES.length - 1));
  }, []);
  const scrollToWod = useCallback((index: number) => {
    const el = wodsScrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: index * (cardWidth + 12), behavior: "smooth" });
  }, []);

  return (
    <>
      <PageMeta
        title="CrossFit GP – Nice Athletic Club"
        description="Premium Fitness in Göppingen – CrossFit Workouts, Hyrox Training, Olympic Lifting und Open Gym mit zertifizierten Coaches und starker Community im Nice Athletic Club."
        canonical="https://niceathleticclub.de/crossfit-gp"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            HERO – Desktop: original full-width | Mobile: full-screen immersive
           ══════════════════════════════════════════════════════════════════ */}

        {/* ── Desktop Hero (sm+) ── original full-width background image ── */}
        <section className="relative min-h-[70vh] md:min-h-[80vh] items-end overflow-hidden hidden sm:flex">
          <div className="absolute inset-0">
            <ImageWithFallback
              src={crossfitHeroImg}
              alt="CrossFit Workout im Nice Athletic Club Göppingen"
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.35) saturate(1.15)" }}
            />
          </div>

          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.15) 40%, rgba(5,5,5,0.75) 75%, #050505 100%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 0% 100%, rgba(202,12,133,0.15) 0%, transparent 60%)" }} />

          <div className="relative w-full max-w-7xl mx-auto px-6 pb-16 md:pb-24 pt-40" style={{ zIndex: 5 }}>
            <motion.div variants={v.stagger} initial="hidden" animate="visible" className="max-w-3xl">
              {/* Breadcrumb */}
              <motion.nav variants={v.fadeUp} custom={0} className="flex items-center gap-2 mb-6 text-white/40" style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.12em" }}>
                <Link to="/" className="hover:text-white/70 transition-colors">HOME</Link>
                <ChevronRight size={12} />
                <span className="text-white/60">CROSSFIT GP</span>
              </motion.nav>

              <motion.div variants={v.fadeUp} custom={1}>
                <Label>CrossFit Göppingen</Label>
              </motion.div>

              <motion.h1 variants={v.fadeUp} custom={2} className="text-white mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 9vw, 7rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                CROSSFIT <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>GÖPPINGEN</span>
              </motion.h1>

              <motion.p variants={v.fadeUp} custom={3} className="text-white/55 max-w-xl leading-relaxed mb-8" style={{ fontSize: "1.05rem" }}>
                Functional Fitness auf höchstem Niveau. Unsere CrossFit-Box vereint
                Community-Spirit, zertifizierte Coaches und eine Ausstattung, die keine Wünsche offen lässt.
              </motion.p>

              <motion.div variants={v.fadeUp} custom={4} className="flex flex-col sm:flex-row gap-4">
                <a href={MYSPORTS_TICKET_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98]" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}>
                  TAGESTICKET BUCHEN
                  <Ticket size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                </a>
                <Link to="/kurse?filter=CrossFit" className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300" style={{ border: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 600, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "white"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                  KURSPLAN ANSEHEN
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Mobile Hero (< sm) ── full-screen immersive ── */}
        <section
          id="crossfit-hero"
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={crossfitHeroImg}
              alt="CrossFit Workout im Nice Athletic Club Göppingen"
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.42) saturate(1.15)" }}
            />
          </div>

          {/* Gradient Overlays */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(5,5,5,0.28) 0%, rgba(5,5,5,0.15) 40%, rgba(5,5,5,0.72) 80%, #050505 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 70% at 0% 100%, rgba(202,12,133,0.15) 0%, transparent 60%)",
            }}
          />

          {/* Content */}
          <div className="relative w-full px-6 pb-20 pt-24" style={{ zIndex: 5 }}>
            <motion.div variants={v.stagger} initial="hidden" animate="visible">
              {/* Breadcrumb */}
              <motion.nav
                variants={v.fadeUp}
                custom={0}
                className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                }}
              >
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">CROSSFIT GP</span>
              </motion.nav>

              {/* Tag */}
              <motion.div variants={v.fadeUp} custom={1}>
                <Label>CrossFit Göppingen</Label>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={v.fadeUp}
                custom={2}
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.8rem, 12vw, 5rem)",
                  lineHeight: 0.92,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                CROSSFIT{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                  GÖPPINGEN
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                variants={v.fadeUp}
                custom={3}
                className="text-white/55 max-w-xl leading-relaxed mb-6"
                style={{ fontSize: "0.95rem" }}
              >
                Functional Fitness auf höchstem Niveau. Community-Spirit,
                zertifizierte Coaches und Top-Equipment.
              </motion.p>

              {/* Stats – 2×2 grid on mobile hero */}
              <motion.div variants={v.fadeUp} custom={3.5} className="grid grid-cols-2 gap-2.5 mb-7">
                {STATS.map(({ value, label }) => (
                  <div
                    key={label}
                    className="text-center py-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1, letterSpacing: "0.02em" }}>{value}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{label}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div variants={v.fadeUp} custom={4} className="flex flex-col gap-3">
                <a
                  href={MYSPORTS_TICKET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-3 px-8 text-white transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: "var(--brand)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    minHeight: "52px",
                    boxShadow: "0 0 30px rgba(202,12,133,0.3)",
                  }}
                >
                  TAGESTICKET BUCHEN
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                </a>
                <Link
                  to="/kurse?filter=CrossFit"
                  className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300 cursor-pointer"
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    minHeight: "52px",
                  }}
                >
                  KURSPLAN ANSEHEN
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={() => {
              const el = document.getElementById("crossfit-benefits");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors duration-300 cursor-pointer focus-visible:outline-none"
            aria-label="Zum Inhalt scrollen"
            style={{ zIndex: 10, background: "none", border: "none", minWidth: "44px", minHeight: "44px" }}
          >
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.25em" }}>SCROLL</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <ChevronDown size={16} />
            </motion.div>
          </motion.button>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            BENEFITS GRID – Desktop: original grid | Mobile: swipe carousel
           ══════════════════════════════════════════════════════════════════ */}
        <section id="crossfit-benefits" ref={benefitsRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Was uns ausmacht</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                MEHR ALS EIN <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>WORKOUT</span>
              </motion.h2>
            </motion.div>

            {/* Desktop Grid (sm+) — original */}
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {CF_BENEFITS.map(({ icon: Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  variants={v.fadeUp}
                  custom={i}
                  className="p-6 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                  >
                    <Icon size={18} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3
                    className="text-white mb-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.2rem",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    {desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Mobile Swipe Carousel (< sm) */}
            <motion.div
              variants={v.fadeUp}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="sm:hidden"
            >
              <div
                ref={benefitsScrollRef}
                onScroll={handleBenefitsScroll}
                className="benefits-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
                style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style>{`.benefits-carousel::-webkit-scrollbar { display: none; }`}</style>
                {CF_BENEFITS.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="shrink-0"
                    style={{ width: "calc(85vw - 24px)", scrollSnapAlign: "start" }}
                  >
                    <div
                      className="flex flex-col h-full p-5"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div
                        className="w-10 h-10 flex items-center justify-center mb-4 shrink-0"
                        style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                      >
                        <Icon size={18} style={{ color: "var(--brand)" }} />
                      </div>
                      <h3
                        className="text-white mb-2"
                        style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", letterSpacing: "0.02em", textTransform: "uppercase" }}
                      >
                        {title}
                      </h3>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="shrink-0 w-4" aria-hidden="true" />
              </div>

              {/* Dots + Swipe Hint */}
              <div className="flex flex-col items-center gap-2.5 mt-4">
                <div className="flex items-center gap-2">
                  {CF_BENEFITS.map((b, i) => (
                    <button
                      key={b.title}
                      onClick={() => scrollToBenefit(i)}
                      aria-label={`Karte ${i + 1}`}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        width: activeBenefitIdx === i ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        background: activeBenefitIdx === i ? "var(--brand)" : "rgba(255,255,255,0.2)",
                        border: "none",
                        padding: 0,
                        boxShadow: activeBenefitIdx === i ? "0 0 10px rgba(202,12,133,0.4)" : "none",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}>
                  WISCHEN FÜR MEHR
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            WOD TYPES – Desktop: original grid | Mobile: swipe carousel
           ══════════════════════════════════════════════════════════════════ */}
        <section ref={wodsRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={wodsInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Unser Angebot</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                KURSFORMATE <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>IM ÜBERBLICK</span>
              </motion.h2>
            </motion.div>

            {/* Desktop Grid (sm+) — original */}
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={wodsInView ? "visible" : "hidden"}
              className="hidden sm:grid sm:grid-cols-2 gap-5"
            >
              {WOD_TYPES.map(({ title, tag, desc, icon: Icon }, i) => (
                <motion.div
                  key={title}
                  variants={v.fadeUp}
                  custom={i}
                  className="p-6 flex gap-5 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="shrink-0 w-12 h-12 flex items-center justify-center"
                    style={{
                      background: "rgba(202,12,133,0.1)",
                      border: "1px solid rgba(202,12,133,0.2)",
                    }}
                  >
                    <Icon size={20} style={{ color: "var(--brand)" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-white"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.2rem",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                        }}
                      >
                        {title}
                      </h3>
                      <span
                        className="px-2 py-0.5"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--brand)",
                          background: "rgba(202,12,133,0.1)",
                          border: "1px solid rgba(202,12,133,0.2)",
                        }}
                      >
                        {tag}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                      {desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Mobile Swipe Carousel (< sm) */}
            <motion.div
              variants={v.fadeUp}
              initial="hidden"
              animate={wodsInView ? "visible" : "hidden"}
              className="sm:hidden"
            >
              <div
                ref={wodsScrollRef}
                onScroll={handleWodsScroll}
                className="wod-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
                style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style>{`.wod-carousel::-webkit-scrollbar { display: none; }`}</style>
                {WOD_TYPES.map(({ title, tag, desc, icon: Icon }) => (
                  <div
                    key={title}
                    className="shrink-0"
                    style={{ width: "calc(85vw - 24px)", scrollSnapAlign: "start" }}
                  >
                    <div
                      className="flex gap-4 h-full p-5"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div
                        className="shrink-0 w-12 h-12 flex items-center justify-center"
                        style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                      >
                        <Icon size={20} style={{ color: "var(--brand)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                            {title}
                          </h3>
                          <span
                            className="px-2 py-0.5 shrink-0"
                            style={{
                              fontFamily: "var(--font-condensed)",
                              fontSize: "9px",
                              fontWeight: 700,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: "var(--brand)",
                              background: "rgba(202,12,133,0.1)",
                              border: "1px solid rgba(202,12,133,0.2)",
                            }}
                          >
                            {tag}
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                          {desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="shrink-0 w-4" aria-hidden="true" />
              </div>

              {/* Dots */}
              <div className="flex flex-col items-center gap-2.5 mt-4">
                <div className="flex items-center gap-2">
                  {WOD_TYPES.map((w, i) => (
                    <button
                      key={w.title}
                      onClick={() => scrollToWod(i)}
                      aria-label={`Kursformat ${i + 1}`}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        width: activeWodIdx === i ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        background: activeWodIdx === i ? "var(--brand)" : "rgba(255,255,255,0.2)",
                        border: "none",
                        padding: 0,
                        boxShadow: activeWodIdx === i ? "0 0 10px rgba(202,12,133,0.4)" : "none",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}>
                  WISCHEN FÜR MEHR
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SCHEDULE – Desktop: original 2-col | Mobile: improved layout
           ══════════════════════════════════════════════════════════════════ */}
        <section ref={scheduleRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              <motion.div
                variants={v.stagger}
                initial="hidden"
                animate={scheduleInView ? "visible" : "hidden"}
              >
                <motion.div variants={v.fadeUp} custom={0}>
                  <Label>Wochenplan</Label>
                </motion.div>
                <motion.h2
                  variants={v.fadeUp}
                  custom={1}
                  className="text-white mb-4"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                  }}
                >
                  WORKOUT <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>ZEITPLAN</span>
                </motion.h2>
                <motion.p
                  variants={v.fadeUp}
                  custom={2}
                  className="mb-8"
                  style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}
                >
                  Unsere Workouts finden täglich statt – in der Früh, am Nachmittag und am Abend.
                  Samstags gibt es Community-Workouts, die besonders beliebt sind.
                </motion.p>

                <div className="space-y-2">
                  {CROSSFIT_SCHEDULE.map(({ day, shortDay, entries }, i) => (
                    <motion.div
                      key={day}
                      variants={v.fadeUp}
                      custom={i + 3}
                      className="flex items-center justify-between py-3 px-4"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span
                        className="text-white shrink-0"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          minWidth: "40px",
                        }}
                      >
                        {/* Desktop: full day name | Mobile: short */}
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{shortDay}</span>
                      </span>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
                        {entries.map((e) => (
                          <span
                            key={e.time}
                            className="px-2 py-1"
                            style={{
                              fontFamily: "var(--font-condensed)",
                              fontSize: "11px",
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              color: "var(--brand)",
                              background: "rgba(202,12,133,0.08)",
                              border: "1px solid rgba(202,12,133,0.15)",
                            }}
                          >
                            {e.time}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile-only: Kursplan-Link */}
                <motion.div
                  variants={v.fadeUp}
                  custom={CROSSFIT_SCHEDULE.length + 4}
                  className="mt-6 sm:hidden"
                >
                  <Link
                    to="/kurse?filter=CrossFit"
                    className="group inline-flex items-center gap-2 transition-all duration-300"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--brand)" }}
                  >
                    VOLLSTÄNDIGEN KURSPLAN ANSEHEN
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Desktop Image — original */}
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={scheduleInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.7 }}
                className="relative overflow-hidden hidden lg:block"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <ImageWithFallback
                  src={communityImg}
                  alt="CrossFit Community Training im Nice Athletic Club"
                  className="w-full aspect-[3/4] object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(5,5,5,0.5) 0%, transparent 40%)" }}
                />
              </motion.div>

              {/* Mobile: Community Image (banner style) */}
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
                animate={scheduleInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="lg:hidden relative overflow-hidden -mx-6"
                style={{ aspectRatio: "16/9" }}
              >
                <ImageWithFallback
                  src={communityImg}
                  alt="CrossFit Community Training"
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.65) saturate(1.1)" }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.1) 50%, rgba(5,5,5,0.3) 100%)" }}
                />
                {/* Stat badges */}
                <div className="absolute bottom-4 left-6 flex items-center gap-4">
                  <div>
                    <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", lineHeight: 1 }}>6</p>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>ZERTIFIZIERTE COACHES</p>
                  </div>
                  <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />
                  <div>
                    <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", lineHeight: 1 }}>200m²</p>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>CROSSFIT-FLÄCHE</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CTA BAND – Desktop: original | Mobile: enhanced
           ══════════════════════════════════════════════════════════════════ */}
        <section ref={ctaRef} className="relative" style={{ paddingTop: "48px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65 }}
              className="relative overflow-hidden p-10 md:p-16 text-center"
              style={{
                background: "rgba(202,12,133,0.06)",
                border: "1px solid rgba(202,12,133,0.2)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
                aria-hidden="true"
                style={{ background: "radial-gradient(circle, rgba(202,12,133,0.12), transparent 65%)" }}
              />
              <Zap size={28} style={{ color: "var(--brand)", marginBottom: "16px" }} />
              <h2
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                SCHNUPPER REIN MIT EINEM{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>TAGESTICKET</span>
              </h2>
              <p
                className="max-w-lg mx-auto mb-8"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
              >
                Du willst erstmal reinschnuppern? Sichere dir dein Tagesticket und erlebe
                ein CrossFit Workout live mit unserer Community – ganz unverbindlich.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href={MYSPORTS_TICKET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "14px 32px",
                    background: "var(--brand)",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Tagesticket buchen <Ticket size={14} />
                </a>
                <Link
                  to="/preise"
                  className="inline-flex items-center gap-2 transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "14px 28px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.7)",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  Preise ansehen
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
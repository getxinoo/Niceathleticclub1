import { useRef } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Target,
  Flame,
  Heart,
  Award,
  Clock,
  CheckCircle2,
  Dumbbell,
  Users,
  Zap,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

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

// ── Packages ──────────────────────────────────────────────────────────────────
const PACKAGES = [
  {
    title: "Starter",
    sessions: "4 Sessions",
    price: "299",
    desc: "Perfekt zum Kennenlernen. Fitness-Assessment, individuelle Trainingsplanung und 4 betreute Einheiten.",
    features: [
      "Initiales Fitness-Assessment",
      "Individueller Trainingsplan",
      "4 x 60 Min. 1:1 Coaching",
      "Ernährungstipps",
    ],
    popular: false,
  },
  {
    title: "Performance",
    sessions: "8 Sessions",
    price: "549",
    desc: "Für messbare Ergebnisse. Regelmäßige Check-ups und progressive Anpassung deines Plans.",
    features: [
      "Alles aus Starter",
      "8 x 60 Min. 1:1 Coaching",
      "Körperkompositionsanalyse",
      "Ernährungsplan Basis",
      "WhatsApp-Support",
    ],
    popular: true,
  },
  {
    title: "Elite",
    sessions: "12 Sessions",
    price: "799",
    desc: "Das Premium-Paket. Maximale Betreuung, Ernährungscoaching und Priority-Buchung.",
    features: [
      "Alles aus Performance",
      "12 x 60 Min. 1:1 Coaching",
      "Detaillierter Ernährungsplan",
      "Mobility-Analyse",
      "Priority-Buchung",
      "Monatlicher Progress-Report",
    ],
    popular: false,
  },
];

// ── Benefits ──────────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: Target,
    title: "Individuelle Ziele",
    desc: "Dein Trainer analysiert dein Level und erstellt einen Plan, der genau auf deine Ziele abgestimmt ist.",
  },
  {
    icon: Flame,
    title: "Maximale Effizienz",
    desc: "Keine verschwendete Zeit. Jede Session bringt dich deinem Ziel einen Schritt näher.",
  },
  {
    icon: Heart,
    title: "Verletzungsprävention",
    desc: "Saubere Technik, korrekte Ausführung – dein Trainer korrigiert in Echtzeit.",
  },
  {
    icon: Award,
    title: "Zertifizierte Trainer",
    desc: "Unsere 10 Trainer sind lizenziert und bilden sich stetig weiter – von A-Lizenz bis CrossFit L2.",
  },
  {
    icon: Clock,
    title: "Flexible Termine",
    desc: "Buche deine Sessions so, wie sie in deinen Alltag passen – auch früh morgens oder spätabends.",
  },
  {
    icon: Zap,
    title: "Messbare Resultate",
    desc: "Regelmäßige Körperanalysen und Leistungstests zeigen deinen Fortschritt schwarz auf weiß.",
  },
];

// ── Process Steps ─────────────────────────────────────────────────────────────
const PROCESS = [
  { step: "01", title: "Erstgespräch", desc: "Wir lernen dich kennen – deine Ziele, dein Alltag, deine Geschichte." },
  { step: "02", title: "Assessment", desc: "Bewegungsanalyse, Körperkomposition und Leistungstests als Baseline." },
  { step: "03", title: "Dein Plan", desc: "Individueller Trainings- und Ernährungsplan, maßgeschneidert auf dich." },
  { step: "04", title: "Coaching", desc: "1:1 Sessions mit deinem Trainer – progressiv, motivierend, effektiv." },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalTraining() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  const benefitsRef = useRef<HTMLDivElement>(null);
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-80px" });

  const processRef = useRef<HTMLDivElement>(null);
  const processInView = useInView(processRef, { once: true, margin: "-80px" });

  const packagesRef = useRef<HTMLDivElement>(null);
  const packagesInView = useInView(packagesRef, { once: true, margin: "-80px" });

  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  return (
    <>
      <PageMeta
        title="Personal Training – Nice Athletic Club"
        description="Premium Fitness in Göppingen – Individuelles 1:1 Personal Training mit zertifizierten Trainern, maßgeschneiderten Plänen und messbaren Resultaten im Nice Athletic Club."
        canonical="https://niceathleticclub.de/personal-training"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {/* ── Hero ── */}
        {/* DESKTOP HERO (sm+) */}
        <section className="relative overflow-hidden hidden sm:block" style={{ paddingTop: "144px", paddingBottom: "80px" }}>
          {/* Glow */}
          <div
            className="absolute top-0 left-0 w-[600px] h-[500px] pointer-events-none"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse at top left, rgba(202,12,133,0.14), transparent 65%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[400px] pointer-events-none"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse at bottom right, rgba(202,12,133,0.06), transparent 65%)" }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div variants={v.stagger} initial="hidden" animate="visible">
                <motion.div variants={v.fadeUp} custom={0}>
                  <Label>Personal Training</Label>
                </motion.div>
                <motion.h1
                  variants={v.fadeUp}
                  custom={1}
                  className="text-white mb-6"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.8rem, 7vw, 5rem)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                  }}
                >
                  DEIN TRAINER.{" "}
                  <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>DEIN PLAN.</span>
                  <br />DEIN ERFOLG.
                </motion.h1>
                <motion.p
                  variants={v.fadeUp}
                  custom={2}
                  className="max-w-lg leading-relaxed mb-8"
                  style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)" }}
                >
                  Maximale Ergebnisse mit individuellem Coaching. Unsere zertifizierten Trainer
                  begleiten dich persönlich – von der Zielsetzung bis zum Ergebnis.
                </motion.p>
                <motion.div variants={v.fadeUp} custom={3} className="flex flex-wrap gap-4">
                  <Link
                    to="/probetraining"
                    className="inline-flex items-center gap-2 text-white transition-all duration-200"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "14px 28px",
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
                    Jetzt Termin buchen <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/kontakt"
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
                    Beratungsgespräch
                  </Link>
                </motion.div>
              </motion.div>

              {/* Hero Image */}
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative"
              >
                <div
                  className="relative overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluZXIlMjBneW0lMjBjbGllbnQlMjB3b3Jrb3V0fGVufDF8fHx8MTc3MzE0NDU1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Personal Training Session im Nice Athletic Club"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  {/* Overlay gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(5,5,5,0.6) 0%, transparent 50%)" }}
                  />
                </div>

                {/* Floating badge */}
                <div
                  className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "rgba(5,5,5,0.8)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(202,12,133,0.3)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--brand)",
                  }}
                >
                  <Dumbbell size={12} /> 10 Zertifizierte Trainer
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* MOBILE HERO (< sm) */}
        <section
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
          style={{ backgroundColor: "#050505" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none"
            style={{ background: "linear-gradient(to top, #050505, transparent)" }} />

          <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}>
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">PERSONAL TRAINING</span>
              </nav>

              <Label>Personal Training</Label>

              <h1 className="text-white mb-4" style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 13vw, 4.5rem)",
                lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase",
              }}>
                DEIN TRAINER.{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>DEIN PLAN.</span>
              </h1>

              <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
                Maximale Ergebnisse mit individuellem Coaching. Unsere zertifizierten Trainer begleiten dich persönlich.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { val: "10", lbl: "Trainer" },
                  { val: "1:1", lbl: "Coaching" },
                  { val: "100%", lbl: "Individuell" },
                ].map((s) => (
                  <div key={s.lbl} className="text-center py-3"
                    style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1 }}>{s.val}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
                  </div>
                ))}
              </div>

              <Link to="/probetraining"
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}>
                TERMIN BUCHEN <ArrowRight size={16} />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-6">
              <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                <ChevronDown size={18} className="text-white/20" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Benefits Grid ── */}
        <section ref={benefitsRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Warum Personal Training</Label>
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
                TRAINING AUF{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>DEINEM LEVEL</span>
              </motion.h2>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  variants={v.fadeUp}
                  custom={i}
                  className="group p-6 transition-all duration-300"
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
                    style={{
                      background: "rgba(202,12,133,0.1)",
                      border: "1px solid rgba(202,12,133,0.2)",
                    }}
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
          </div>
        </section>

        {/* ── Process ── */}
        <section ref={processRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={processInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.7 }}
                className="relative overflow-hidden order-2 lg:order-1"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1734873477108-6837b02f2b9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluaW5nJTIwc2Vzc2lvbiUyMG9uZSUyMG9uJTIwb25lfGVufDF8fHx8MTc3MzE0NDU1MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Personal Training 1:1 Session"
                  className="w-full aspect-[4/3] object-cover"
                />
              </motion.div>

              <motion.div
                variants={v.stagger}
                initial="hidden"
                animate={processInView ? "visible" : "hidden"}
                className="order-1 lg:order-2"
              >
                <motion.div variants={v.fadeUp} custom={0}>
                  <Label>So funktioniert's</Label>
                </motion.div>
                <motion.h2
                  variants={v.fadeUp}
                  custom={1}
                  className="text-white mb-10"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                  }}
                >
                  DEIN WEG ZUM <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>ZIEL</span>
                </motion.h2>

                <div className="space-y-6">
                  {PROCESS.map(({ step, title, desc }, i) => (
                    <motion.div
                      key={step}
                      variants={v.fadeUp}
                      custom={i + 2}
                      className="flex gap-5 items-start"
                    >
                      <div
                        className="shrink-0 w-12 h-12 flex items-center justify-center"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.2rem",
                          letterSpacing: "0.04em",
                          color: "var(--brand)",
                          border: "1px solid rgba(202,12,133,0.3)",
                          background: "rgba(202,12,133,0.08)",
                        }}
                      >
                        {step}
                      </div>
                      <div>
                        <h3
                          className="text-white mb-1"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.1rem",
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                          }}
                        >
                          {title}
                        </h3>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                          {desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Packages section removed – pricing lives only on /preise */}

        {/* ── CTA Band ── */}
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
              <Users size={28} style={{ color: "var(--brand)", marginBottom: "16px" }} />
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
                BEREIT FÜR <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>DEIN UPGRADE</span>?
              </h2>
              <p
                className="max-w-lg mx-auto mb-8"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
              >
                Starte jetzt mit einem kostenlosen Beratungsgespräch. Wir finden gemeinsam
                den perfekten Trainingsplan für deine Ziele.
              </p>
              <Link
                to="/probetraining"
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
                Kostenloses Erstgespräch <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
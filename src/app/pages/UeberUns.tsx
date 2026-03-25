import mimiImg from "figma:asset/24554336b9b4f6e13f6ef2a7f200d6914a979118.png";
import { useRef } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Heart,
  Target,
  Sparkles,
  Trophy,
  Dumbbell,
  Users,
  Star,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";

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
      className="inline-flex items-center gap-2 text-brand mb-5"
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
      }}
    >
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
      {children}
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
    </div>
  );
}

// ── Values data ───────────────────────────────────────────────────────────────
const VALUES = [
  {
    icon: Heart,
    title: "Community",
    desc: "Wir leben Community und sind der festen Überzeugung, dass Stillstand Rückschritt bedeutet.",
  },
  {
    icon: Target,
    title: "Für jedes Level",
    desc: "Egal, ob Beginner, Fortgeschrittener oder Profi – unsere Clubs bieten für jede Anforderung das passende Equipment.",
  },
  {
    icon: Sparkles,
    title: "Ständige Verbesserung",
    desc: "Wir verbessern unsere Clubs stetig, auch wenn es nur Kleinigkeiten sind – aber auf die kommt es an!",
  },
  {
    icon: Trophy,
    title: "Die Zukunft ist NICE",
    desc: "Wir haben schon einiges geplant. Die Zukunft wird extrem NICE!",
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const ABOUT_STATS = [
  { value: "2020", label: "Gegründet" },
  { value: "1.500+", label: "qm Trainingsfläche" },
  { value: "10", label: "Zertifizierte Trainer" },
  { value: "4,9/5", label: "Google-Bewertung" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function UeberUns() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  const visionRef = useRef(null);
  const visionInView = useInView(visionRef, { once: true, margin: "-80px" });

  const founderRef = useRef(null);
  const founderInView = useInView(founderRef, { once: true, margin: "-80px" });

  const valuesRef = useRef(null);
  const valuesInView = useInView(valuesRef, { once: true, margin: "-80px" });

  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  return (
    <>
      <PageMeta
        title="Über uns – Nice Athletic Club"
        description="Erfahre mehr über die Vision, die Geschichte und den Gründer des Nice Athletic Club Göppingen."
        canonical="https://niceathleticclub.de/ueber-uns"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {/* ── Hero Header ── */}
        {/* DESKTOP HERO (sm+) */}
        <section className="pt-36 pb-20 relative overflow-hidden hidden sm:block">
          <div
            className="absolute top-0 left-0 w-[600px] h-[400px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(202,12,133,0.12), transparent 65%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[300px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at bottom right, rgba(202,12,133,0.06), transparent 65%)",
            }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate="visible"
              className="max-w-3xl"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Über uns</Label>
              </motion.div>
              <motion.h1
                variants={v.fadeUp}
                custom={1}
                className="text-white mb-6"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem, 8vw, 5.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                NICE IST EINE{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>VISION</span>
              </motion.h1>
              <motion.p
                variants={v.fadeUp}
                custom={2}
                className="text-white/50 max-w-xl leading-relaxed"
                style={{ fontSize: "15px" }}
              >
                Mehr als ein Fitnessstudio. Eine Community, die dich antreibt,
                unterstützt und gemeinsam wächst.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* MOBILE HERO (< sm) */}
        <section
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
          style={{ backgroundColor: "#050505" }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none"
            style={{ background: "linear-gradient(to top, #050505, transparent)" }}
          />

          <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav
                className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}
              >
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">ÜBER UNS</span>
              </nav>

              <Label>Über uns</Label>

              <h1
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3.2rem, 15vw, 5rem)",
                  lineHeight: 0.9,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                NICE IST EINE{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>VISION</span>
              </h1>

              <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
                Mehr als ein Fitnessstudio. Eine Community, die dich antreibt, unterstützt und gemeinsam wächst.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {ABOUT_STATS.slice(0, 4).map((s) => (
                  <div
                    key={s.label}
                    className="text-center py-3"
                    style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                      {s.value}
                    </span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/probetraining"
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}
              >
                PROBETRAINING BUCHEN
                <ArrowRight size={16} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex justify-center mt-6"
            >
              <motion.div
                animate={reduced ? {} : { y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ChevronDown size={18} className="text-white/20" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Vision Section ── */}
        <section ref={visionRef} className="relative pb-24 md:pb-32">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={visionInView ? "visible" : "hidden"}
            >
              <motion.div variants={v.fadeUp} custom={0} className="mb-10">
                <Label>Was uns antreibt</Label>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-12 items-start">
                {/* Left: Text */}
                <div className="space-y-6">
                  <motion.p
                    variants={v.fadeUp}
                    custom={1}
                    className="text-white/65 leading-relaxed"
                    style={{ fontSize: "15px" }}
                  >
                    Wir wollen uns stetig weiterentwickeln und unseren Mitgliedern
                    lebendige, wachsende und immer freundliche Clubs bieten! Wir
                    leben Community und sind der festen Überzeugung, dass Stillstand
                    Rückschritt bedeutet. Deshalb werden wir unsere Clubs stetig
                    verbessern, auch wenn es nur Kleinigkeiten sind – aber auf die
                    kommt es bekanntermassen an!
                  </motion.p>

                  <motion.p
                    variants={v.fadeUp}
                    custom={2}
                    className="text-white/65 leading-relaxed"
                    style={{ fontSize: "15px" }}
                  >
                    Egal, ob Beginner, Fortgeschrittener oder Profi – unsere Clubs
                    bieten für jede Anforderung das passende und beste Equipment.
                    Wir stehen Dir bei all Deinen Anliegen oder Fragen zur Seite!
                  </motion.p>

                  <motion.p
                    variants={v.fadeUp}
                    custom={3}
                    className="text-white/80 leading-relaxed"
                    style={{
                      fontSize: "16px",
                      fontWeight: 500,
                    }}
                  >
                    Wir sagen nur so viel: die Zukunft wird extrem{" "}
                    <span style={{ color: "var(--brand)", fontWeight: 700 }}>
                      NICE
                    </span>
                    , denn wir haben schon einiges geplant!
                  </motion.p>
                </div>

                {/* Right: Stats */}
                <motion.div
                  variants={v.fadeUp}
                  custom={2}
                  className="grid grid-cols-2 gap-4"
                >
                  {ABOUT_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="p-6 flex flex-col gap-2"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                          color: "var(--brand)",
                          lineHeight: 1,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {stat.value}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "12px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Founder Section ── */}
        <section
          ref={founderRef}
          className="py-24 md:py-32 relative overflow-hidden"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Background glow */}
          <div
            className="absolute top-1/2 right-0 w-[500px] h-[500px] -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at center right, rgba(202,12,133,0.08), transparent 65%)",
            }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={founderInView ? "visible" : "hidden"}
            >
              <motion.div variants={v.fadeUp} custom={0} className="mb-12">
                <Label>Der Gründer</Label>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Left: Text */}
                <div>
                  <motion.h2
                    variants={v.fadeUp}
                    custom={1}
                    className="text-white mb-6"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2rem, 5vw, 3.5rem)",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    MICHAEL{" "}
                    <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>KRAUS</span>
                  </motion.h2>

                  <motion.p
                    variants={v.fadeUp}
                    custom={2}
                    className="text-white/30 mb-6"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                    }}
                  >
                    GRÜNDER & VISIONÄR · CROSSFIT LEVEL 1 TRAINER
                  </motion.p>

                  <motion.p
                    variants={v.fadeUp}
                    custom={3}
                    className="text-white/65 leading-relaxed mb-5"
                    style={{ fontSize: "15px" }}
                  >
                    Der Mann hinter der Idee und Umsetzung. Michael Kraus, besser
                    bekannt als „Mimi", ist einer der bekanntesten und
                    einflussreichsten Handball-Profis.
                  </motion.p>

                  <motion.p
                    variants={v.fadeUp}
                    custom={4}
                    className="text-white/65 leading-relaxed mb-8"
                    style={{ fontSize: "15px" }}
                  >
                    Die Vision vom eigenen Fitnessstudio konnte nun 2020 auf Basis
                    eines umfangreichen Fitness-Konzepts umgesetzt werden. Da Mimi
                    selbst schon viele Jahre erfolgreich Fitness betreibt und als
                    CrossFit Level 1 Trainer diese Leidenschaft offiziell
                    zertifiziert hat, steckt sehr viel persönliche Erfahrung in
                    diesem Fitnessstudio.
                  </motion.p>

                  {/* Signature detail */}
                  <motion.div
                    variants={v.fadeUp}
                    custom={5}
                    className="flex items-center gap-4 pt-6"
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.25)",
                        borderRadius: "50%",
                      }}
                    >
                      <Dumbbell size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <p
                        className="text-white"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "13px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                        }}
                      >
                        „Mimi" Kraus
                      </p>
                      <p
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: "11px",
                        }}
                      >
                        Handball-Legende · Fitness-Visionär
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Right: Photo */}
                <motion.div
                  variants={v.fadeUp}
                  custom={2}
                  className="relative"
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <img
                      src={mimiImg}
                      alt="Michael Kraus – Gründer Nice Athletic Club"
                      className="w-full h-auto object-cover"
                      style={{
                        filter: "brightness(0.85) saturate(1.05)",
                        aspectRatio: "4/5",
                      }}
                    />
                    {/* Subtle gradient overlay bottom */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(5,5,5,0.5) 0%, transparent 40%)",
                      }}
                    />
                  </div>

                  {/* Decorative corner accents */}
                  <div
                    className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2"
                    style={{ borderColor: "var(--brand)" }}
                  />
                  <div
                    className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2"
                    style={{ borderColor: "var(--brand)" }}
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Values Grid ── */}
        <section ref={valuesRef} className="relative py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={valuesInView ? "visible" : "hidden"}
              className="text-center mb-14"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Unsere Werte</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                }}
              >
                WOFÜR WIR{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>STEHEN</span>
              </motion.h2>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={valuesInView ? "visible" : "hidden"}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {VALUES.map((val, i) => {
                const Icon = val.icon;
                return (
                  <motion.div
                    key={val.title}
                    variants={v.fadeUp}
                    custom={i}
                    className="group p-7 flex flex-col gap-5 transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      backdropFilter: "blur(8px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(202,12,133,0.3)";
                      e.currentTarget.style.boxShadow =
                        "0 0 30px rgba(202,12,133,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.07)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{
                        background: "rgba(202,12,133,0.1)",
                        border: "1px solid rgba(202,12,133,0.2)",
                      }}
                    >
                      <Icon size={17} style={{ color: "var(--brand)" }} />
                    </div>
                    <h3
                      className="text-white"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "15px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {val.title}
                    </h3>
                    <p
                      className="text-white/45 leading-relaxed"
                      style={{ fontSize: "13px" }}
                    >
                      {val.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── CTA Band ── */}
        <section ref={ctaRef} className="relative pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={ctaInView ? "visible" : "hidden"}
              className="relative flex flex-col items-center text-center py-16 px-6 overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(202,12,133,0.1) 0%, rgba(202,12,133,0.03) 100%)",
                border: "1px solid rgba(202,12,133,0.2)",
              }}
            >
              {/* Corner accents */}
              <div
                className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2"
                style={{ borderColor: "var(--brand)" }}
              />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2"
                style={{ borderColor: "var(--brand)" }}
              />

              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Werde Teil der Community</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 6vw, 4rem)",
                  letterSpacing: "0.02em",
                }}
              >
                BEREIT FÜR{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>NICE</span>?
              </motion.h2>
              <motion.p
                variants={v.fadeUp}
                custom={2}
                className="max-w-md mb-10"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                }}
              >
                Komm vorbei und überzeug dich selbst. Dein erstes Probetraining
                ist kostenlos.
              </motion.p>
              <motion.div
                variants={v.fadeUp}
                custom={3}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/probetraining"
                  className="group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: "var(--brand)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    minHeight: "52px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--brand-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--brand)")
                  }
                >
                  Probetraining buchen
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </Link>
                <Link
                  to="/team"
                  className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300"
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    minHeight: "52px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.18)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  Unser Team
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
import { useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Dumbbell,
  CheckCircle2,
  Shield,
  Zap,
  Target,
  Users,
  Heart,
  Timer,
  Trophy,
  Flame,
  ChevronRight,
  ChevronDown,
  Ticket,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { DEFAULT_BASE_PLANS, type BasePlan } from "../../data/classes";
import { cn } from "../../lib/utils";
import { buildBreadcrumbSchema, buildServiceSchema, buildFaqSchema, SITE_URL } from "../../lib/schema";

// ── Images ──────────────────────────────────────────────────────────────────
import IMG_HERO from "figma:asset/25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png";
import IMG_COMMUNITY from "figma:asset/2fd168ab3eb07b953e192fa2b4e06a5d2814827a.png";
import IMG_GALLERY1 from "figma:asset/dddead2f8bc505281b896a452156390eec3ca473.png";
import IMG_GALLERY2 from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import IMG_GALLERY3 from "figma:asset/c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6.png";
import IMG_GALLERY4 from "figma:asset/25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png";
import IMG_GALLERY5 from "figma:asset/8349c307f48e63096bf0253e1f8dee688878d96e.png";
const IMG_SLED =
  "https://images.unsplash.com/photo-1771847047192-11a87570bca3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_ROWING =
  "https://images.unsplash.com/photo-1751235641041-d5037f5ceb87?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_WALLBALLS =
  "https://images.unsplash.com/photo-1685633224704-161d7032379e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_BURPEE =
  "https://images.unsplash.com/photo-1612434577636-6cb7593bded0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_CROSSFIT =
  "https://images.unsplash.com/photo-1745872708330-08b746297fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";

// ── MySports Tagesticket Link ─────────────────────────────────────────────
const MYSPORTS_TICKET_URL =
  "https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets";

// ── Animation helpers ─────────────────────────────────────────────────────
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

// ── Reusable Label ──────────────────────────────────────────────────────────
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

// ── Mobile Dot Navigation ───────────────────────────────────────────────────
function MobileDots({
  count,
  activeIdx,
  onDotClick,
  label,
}: {
  count: number;
  activeIdx: number;
  onDotClick: (i: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 mt-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            aria-label={`${label} ${i + 1}`}
            className="transition-all duration-300 cursor-pointer"
            style={{
              width: activeIdx === i ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: activeIdx === i ? "var(--brand)" : "rgba(255,255,255,0.2)",
              border: "none",
              padding: 0,
              boxShadow: activeIdx === i ? "0 0 10px rgba(202,12,133,0.4)" : "none",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        WISCHEN FÜR MEHR
      </span>
    </div>
  );
}

// ── Mobile carousel hook ────────────────────────────────────────────────────
function useCarousel(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const idx = Math.round(el.scrollLeft / (cardWidth + 12));
    setActiveIdx(Math.min(idx, itemCount - 1));
  }, [itemCount]);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: index * (cardWidth + 12), behavior: "smooth" });
  }, []);

  return { scrollRef, activeIdx, handleScroll, scrollTo };
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const HYROX_STATS = [
  { value: "8", label: "Stationen" },
  { value: "4", label: "Race Formate" },
  { value: "1 km", label: "Run / Station" },
  { value: "19 h", label: "Täglich geöffnet" },
];

// ── 8 HYROX Stations ────────────────────────────────────────────────────────
const STATIONS = [
  {
    nr: "01",
    name: "1 km Run",
    desc: "Zwischen jeder Station wird 1 km gelaufen – Ausdauer ist der Schlüssel.",
    icon: Flame,
  },
  {
    nr: "02",
    name: "SkiErg",
    desc: "1.000 m am SkiErg – explosive Oberkörper-Ausdauer und Rhythmus.",
    icon: Zap,
  },
  {
    nr: "03",
    name: "Sled Push",
    desc: "50 m Sled Push – rohe Beinkraft und mentale Härte.",
    icon: Shield,
  },
  {
    nr: "04",
    name: "Sled Pull",
    desc: "50 m Sled Pull – Zugkraft und Grip Strength auf dem Prüfstand.",
    icon: Target,
  },
  {
    nr: "05",
    name: "Burpee Broad Jumps",
    desc: "80 m Burpee Broad Jumps – Ganzkörper-Explosion und Koordination.",
    icon: Heart,
  },
  {
    nr: "06",
    name: "Rowing",
    desc: "1.000 m Rudern – Rücken, Beine und Cardio in einer Bewegung.",
    icon: Timer,
  },
  {
    nr: "07",
    name: "Farmers Carry",
    desc: "200 m Farmers Carry – Griffkraft, Core-Stabilität und Willenskraft.",
    icon: Dumbbell,
  },
  {
    nr: "08",
    name: "Wall Balls",
    desc: "100 Wall Balls – das große Finale. Beine, Schultern, alles.",
    icon: Trophy,
  },
];

// ── Race Formats ────────────────────────────────────────────────────────────
const FORMATS = [
  {
    name: "HYROX Open",
    desc: "Der Einstieg in die HYROX-Welt. Leichtere Gewichte, gleicher Parcours – perfekt für dein erstes Race.",
    tag: "Einsteiger",
    weights: "Sled: 102/72 kg · Wall Balls: 4/6 kg",
  },
  {
    name: "HYROX Pro",
    desc: "Für ambitionierte Athleten. Schwerere Gewichte und Competition-Intensität.",
    tag: "Fortgeschritten",
    weights: "Sled: 152/102 kg · Wall Balls: 6/9 kg",
  },
  {
    name: "HYROX Doubles",
    desc: "Teilt euch die Stationen auf. Strategie und Teamwork machen den Unterschied.",
    tag: "2er-Team",
    weights: "Stationen werden aufgeteilt",
  },
  {
    name: "HYROX Relay",
    desc: "4er-Team. Jeder übernimmt 2 Stationen. Taktisches Racing in der Gruppe.",
    tag: "4er-Team",
    weights: "Je 2 Stationen pro Athlet",
  },
];

// ── Problems We Solve ───────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: Target,
    problem: "Kein strukturiertes HYROX-Training",
    solution: "Gezielte HYROX-Kurse mit allen 8 Stationen – wettkampfnah trainiert von zertifizierten Coaches.",
  },
  {
    icon: Shield,
    problem: "Kein Equipment für Race-Simulation",
    solution: "SkiErg, Concept2 Rower, Sleds, Wall Balls – alle HYROX-Stationen unter einem Dach.",
  },
  {
    icon: Timer,
    problem: "Keine Laufstrecke für Transitions",
    solution: "Indoor Running Track und Outdoor-Möglichkeiten für realistische 1 km-Runs.",
  },
  {
    icon: Users,
    problem: "Kein Trainingspartner auf deinem Level",
    solution: "Starke HYROX-Community. Doubles & Relay Partner findest du direkt im Club.",
  },
  {
    icon: Flame,
    problem: "Training ohne Plan und Periodisierung",
    solution: "Strukturierte HYROX-Prep: Ausdauer-Blocks, Kraft-Blocks und Race-Simulation im Wechsel.",
  },
  {
    icon: Heart,
    problem: "Keine Recovery nach dem Training",
    solution: "Nice Theke mit Whey Shakes, Espresso und Protein Bars – direkt nach dem Training.",
  },
];

// ── Why HYROX Athletes love NAC ─────────────────────────────────────────────
const REASONS = [
  "Alle 8 HYROX-Stationen im Club vorhanden",
  "Wettkampfnahe Sled-Tracks für Push & Pull",
  "Concept2 SkiErg & Rower in ausreichender Anzahl",
  "Wall Ball Area mit Competition Wall Balls",
  "Zertifizierte Coaches mit HYROX-Erfahrung",
  "HYROX-Kursformat wöchentlich im Kursplan",
  "Doubles & Relay Team-Matching über Community",
  "Race-Simulationen vor großen Events",
  "Täglich geöffnet 5:00 – 00:00 Uhr",
  "CrossFit-Zone als perfekte Ergänzung",
];

// ── Gallery ─────────────────────────────────────────────────────────────────
const GALLERY = [
  { src: IMG_GALLERY1, alt: "Community nach dem HYROX Training im Nice Athletic Club" },
  { src: IMG_GALLERY2, alt: "HYROX Training Club – Wall Ball Station" },
  { src: IMG_GALLERY3, alt: "Sled Push Training – CrossFit Göppingen" },
  { src: IMG_GALLERY4, alt: "Gruppentraining im Nice Athletic Club" },
  { src: IMG_GALLERY5, alt: "HYROX Community Göppingen" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: HYROX Zone
// ─────────────────────────────────────────────────────────────────────────────
export default function HyroxZone() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  // For HYROX, highlight athletic-unlimited and nicest as recommended
  const hyroxPlans = DEFAULT_BASE_PLANS;

  return (
    <>
      <PageMeta
        title="HYROX Training Göppingen – Alle 8 Stationen | Nice Athletic Club"
        description="HYROX Göppingen: Alle 8 Stationen – SkiErg, Sled Push & Pull, Burpees, Rowing, Farmers Carry, Sandbag & Wall Balls. Zertifizierte Coaches, tägliche Sessions. Jetzt Probetraining buchen!"
        canonical={`${SITE_URL}/hyrox`}
        ogImage={`${SITE_URL}/images/hyrox/hero.png`}
        schemas={[
          buildBreadcrumbSchema([{ name: 'HYROX Zone', url: `${SITE_URL}/hyrox` }]),
          buildServiceSchema({
            name: 'HYROX Training Göppingen',
            description: 'Alle 8 HYROX-Stationen im Nice Athletic Club Göppingen. Training für Open, Pro, Doubles & Relay mit zertifizierten HYROX Coaches.',
            url: `${SITE_URL}/hyrox`,
            image: `${SITE_URL}/images/hyrox/hero.png`,
          }),
          buildFaqSchema([
            { question: 'Was ist HYROX?', answer: 'HYROX ist ein weltweiter Fitness-Wettkampf: 8×1 km Laufen kombiniert mit 8 Functional Fitness Stationen (SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls).' },
            { question: 'Gibt es HYROX Training im Nice Athletic Club?', answer: 'Ja! Wir haben eine vollständige HYROX-Zone mit allen Stationen und bieten regelmäßige HYROX-Sessions an.' },
            { question: 'Für wen ist HYROX geeignet?', answer: 'HYROX ist für alle Fitness-Level geeignet. Ob Anfänger oder Wettkampf-Athlet – wir skalieren das Training auf dein Level.' },
          ]),
        ]}
      />

      <HeroSection reduced={reduced} v={v} />
      <StationsSection reduced={reduced} v={v} />
      <GallerySection reduced={reduced} v={v} />
      <FormatsSection reduced={reduced} v={v} />
      <ProblemsSection reduced={reduced} v={v} />
      <WhySection reduced={reduced} v={v} />
      <CTASection reduced={reduced} v={v} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO – Desktop: original full-width | Mobile: full-screen immersive
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  return (
    <>
      {/* ── Desktop Hero (sm+) ── original full-width background image ── */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] items-end overflow-hidden hidden sm:flex">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={IMG_HERO}
            alt="HYROX Training im Nice Athletic Club Göppingen"
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
              <span className="text-white/60">HYROX ZONE</span>
            </motion.nav>

            <motion.div variants={v.fadeUp} custom={1}>
              <Label>HYROX · Hybrid Fitness · Wettkampf</Label>
            </motion.div>

            <motion.h1 variants={v.fadeUp} custom={2} className="text-white mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 9vw, 7rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              TRAIN FOR <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>HYROX</span>
            </motion.h1>

            <motion.p variants={v.fadeUp} custom={3} className="text-white/55 max-w-xl leading-relaxed mb-8" style={{ fontSize: "1.05rem" }}>
              HYROX im Nice Athletic Club Göppingen: 8 Stationen von SkiErg bis
              Wall Balls kombiniert mit Laufen – gezieltes Training für Open,
              Pro, Doubles & Relay.
            </motion.p>

            <motion.div variants={v.fadeUp} custom={4} className="flex flex-col sm:flex-row gap-4">
              <a href={MYSPORTS_TICKET_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98]" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}>
                TAGESTICKET BUCHEN
                <Ticket size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <Link to="/kurse?filter=Hyrox" className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300" style={{ border: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 600, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "white"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                KURSPLAN ANSEHEN
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile Hero (< sm) ── full-screen immersive like CrossFit GP ── */}
      <section
        id="hyrox-hero-mobile"
        className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={IMG_HERO}
            alt="HYROX Training im Nice Athletic Club Göppingen"
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
              <span className="text-white/60">HYROX ZONE</span>
            </motion.nav>

            {/* Tag */}
            <motion.div variants={v.fadeUp} custom={1}>
              <Label>HYROX · Hybrid Fitness · Wettkampf</Label>
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
              TRAIN FOR{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                HYROX
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={v.fadeUp}
              custom={3}
              className="text-white/55 max-w-xl leading-relaxed mb-6"
              style={{ fontSize: "0.95rem" }}
            >
              HYROX im Nice Athletic Club Göppingen: 8 Stationen von SkiErg bis
              Wall Balls kombiniert mit Laufen – gezieltes Training für Open,
              Pro, Doubles & Relay.
            </motion.p>

            {/* Stats – 2×2 grid on mobile hero */}
            <motion.div variants={v.fadeUp} custom={3.5} className="grid grid-cols-2 gap-2.5 mb-7">
              {HYROX_STATS.map(({ value, label }) => (
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
                to="/kurse?filter=Hyrox"
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
            const el = document.getElementById("hyrox-stations");
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
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 8 STATIONS – Desktop: original grid | Mobile: swipe carousel
// ─────────────────────────────────────────────────────────────────────────────
function StationsSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const carousel = useCarousel(STATIONS.length);

  return (
    <section id="hyrox-stations" ref={ref} className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: "var(--surface-0)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-16"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Die 8 Stationen</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 4rem)",
              letterSpacing: "0.02em",
            }}
          >
            8 STATIONEN.{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              8 KM RUN.
            </span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/40 mt-4 max-w-lg mx-auto"
            style={{ fontSize: "0.95rem" }}
          >
            Zwischen jeder Station 1 km Laufen. Ein HYROX-Race testet alles:
            Kraft, Ausdauer, Griffstärke und mentale Härte.
          </motion.p>
        </motion.div>

        {/* Desktop Grid (sm+) — original */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {STATIONS.map((station, i) => {
            const Icon = station.icon;
            return (
              <motion.div
                key={station.name}
                variants={v.fadeUp}
                custom={i}
                className="group relative p-6 flex flex-col transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span
                  className="mb-4"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.5rem",
                    lineHeight: 1,
                    WebkitTextStroke: "1.5px rgba(202,12,133,0.4)",
                    color: "transparent",
                  }}
                >
                  {station.nr}
                </span>
                <div
                  className="w-9 h-9 flex items-center justify-center mb-4"
                  style={{
                    background: "rgba(202,12,133,0.12)",
                    border: "1px solid rgba(202,12,133,0.25)",
                  }}
                >
                  <Icon size={16} style={{ color: "var(--brand)" }} />
                </div>
                <h3
                  className="text-white mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.3rem",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    fontWeight: 400,
                    lineHeight: 1.1,
                  }}
                >
                  {station.name}
                </h3>
                <p className="text-white/45 leading-relaxed" style={{ fontSize: "13px" }}>
                  {station.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mobile Swipe Carousel (< sm) */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="sm:hidden"
        >
          <div
            ref={carousel.scrollRef}
            onScroll={carousel.handleScroll}
            className="stations-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.stations-carousel::-webkit-scrollbar { display: none; }`}</style>
            {STATIONS.map((station) => {
              const Icon = station.icon;
              return (
                <div
                  key={station.name}
                  className="shrink-0"
                  style={{ width: "calc(80vw - 24px)", scrollSnapAlign: "start" }}
                >
                  <div
                    className="p-5 flex flex-col h-full"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      className="mb-3"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2rem",
                        lineHeight: 1,
                        WebkitTextStroke: "1.5px rgba(202,12,133,0.4)",
                        color: "transparent",
                      }}
                    >
                      {station.nr}
                    </span>
                    <div
                      className="w-9 h-9 flex items-center justify-center mb-3"
                      style={{
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.25)",
                      }}
                    >
                      <Icon size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <h3
                      className="text-white mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.15rem",
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        lineHeight: 1.1,
                      }}
                    >
                      {station.name}
                    </h3>
                    <p className="text-white/45 leading-relaxed" style={{ fontSize: "13px" }}>
                      {station.desc}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
          <MobileDots count={STATIONS.length} activeIdx={carousel.activeIdx} onDotClick={carousel.scrollTo} label="Station" />
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY – Desktop: original grid | Mobile: swipe carousel
// ─────────────────────────────────────────────────────────────────────────────
function GallerySection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const carousel = useCarousel(GALLERY.length);

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-2) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-12"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Impressionen</Label>
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
            DEIN{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              HYROX PLAYGROUND
            </span>
          </motion.h2>
        </motion.div>

        {/* Desktop Grid (sm+) — original */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4"
        >
          {GALLERY.map((img, i) => (
            <motion.div
              key={img.alt}
              variants={v.fadeUp}
              custom={i}
              className={cn(
                "group relative overflow-hidden",
                i === 0 ? "col-span-2 row-span-2" : "",
                i === 3 ? "col-span-2 md:col-span-1" : ""
              )}
              style={{ aspectRatio: i === 0 ? "4/3" : "3/2" }}
            >
              <ImageWithFallback
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ filter: "brightness(0.75) saturate(0.9)" }}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-500" />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: "inset 0 0 0 1px rgba(202,12,133,0.45)" }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Swipe Carousel (< sm) */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="sm:hidden"
        >
          <div
            ref={carousel.scrollRef}
            onScroll={carousel.handleScroll}
            className="gallery-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.gallery-carousel::-webkit-scrollbar { display: none; }`}</style>
            {GALLERY.map((img, i) => (
              <div
                key={img.alt}
                className="shrink-0 relative overflow-hidden"
                style={{
                  width: "85vw",
                  maxWidth: "380px",
                  aspectRatio: "4/3",
                  scrollSnapAlign: "center",
                  borderRadius: "8px",
                }}
              >
                <ImageWithFallback
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.75) saturate(0.9)", borderRadius: "8px" }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", borderRadius: "8px" }}
                />
                {/* Image number badge */}
                <div
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--brand)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}>
                    / {String(GALLERY.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
          <MobileDots count={GALLERY.length} activeIdx={carousel.activeIdx} onDotClick={carousel.scrollTo} label="Bild" />
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RACE FORMATS – Desktop: original grid | Mobile: swipe carousel
// ─────────────────────────────────────────────────────────────────────────────
function FormatsSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const carousel = useCarousel(FORMATS.length);

  return (
    <section ref={ref} className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: "var(--surface-0)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-16"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Race Formate</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 4rem)",
              letterSpacing: "0.02em",
            }}
          >
            FINDE DEIN{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>FORMAT</span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/40 mt-4 max-w-lg mx-auto"
            style={{ fontSize: "0.95rem" }}
          >
            HYROX bietet für jedes Level und jede Teamgröße das passende Format.
            Wir bereiten dich auf alle vier vor.
          </motion.p>
        </motion.div>

        {/* Desktop Grid (sm+) — original */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {FORMATS.map((format, i) => (
            <motion.div
              key={format.name}
              variants={v.fadeUp}
              custom={i}
              className="group p-7 flex flex-col transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <h3
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.4rem",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    fontWeight: 400,
                    lineHeight: 1.1,
                  }}
                >
                  {format.name}
                </h3>
                <span
                  className="px-2.5 py-1"
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
                  {format.tag}
                </span>
              </div>
              <p className="text-white/50 leading-relaxed mb-4" style={{ fontSize: "14px" }}>
                {format.desc}
              </p>
              <p
                className="text-white/25 mt-auto"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                }}
              >
                {format.weights}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Swipe Carousel (< sm) */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="sm:hidden"
        >
          <div
            ref={carousel.scrollRef}
            onScroll={carousel.handleScroll}
            className="formats-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.formats-carousel::-webkit-scrollbar { display: none; }`}</style>
            {FORMATS.map((format) => (
              <div
                key={format.name}
                className="shrink-0"
                style={{ width: "calc(85vw - 24px)", scrollSnapAlign: "start" }}
              >
                <div
                  className="p-5 flex flex-col h-full"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3
                      className="text-white"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.2rem",
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        lineHeight: 1.1,
                      }}
                    >
                      {format.name}
                    </h3>
                    <span
                      className="px-2.5 py-1 shrink-0"
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
                      {format.tag}
                    </span>
                  </div>
                  <p className="text-white/50 leading-relaxed mb-4" style={{ fontSize: "14px" }}>
                    {format.desc}
                  </p>
                  <p
                    className="text-white/25 mt-auto"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {format.weights}
                  </p>
                </div>
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
          <MobileDots count={FORMATS.length} activeIdx={carousel.activeIdx} onDotClick={carousel.scrollTo} label="Format" />
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEMS WE SOLVE – Desktop: original grid | Mobile: swipe carousel
// ─────────────────────────────────────────────────────────────────────────────
function ProblemsSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const carousel = useCarousel(PROBLEMS.length);

  return (
    <section
      ref={ref}
      className="py-24 md:py-32 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--surface-2) 0%, var(--surface-0) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-16"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Wir verstehen dich</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 4rem)",
              letterSpacing: "0.02em",
            }}
          >
            DEINE PROBLEME.{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              UNSERE LÖSUNG.
            </span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/40 mt-4 max-w-lg mx-auto"
            style={{ fontSize: "0.95rem" }}
          >
            Die meisten Gyms haben kein einziges Sled, keinen SkiErg und keine
            Ahnung von HYROX-Prep. Wir schon.
          </motion.p>
        </motion.div>

        {/* Desktop Grid (md+) — original */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {PROBLEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.problem}
                variants={v.fadeUp}
                custom={i}
                className="group relative p-7 flex flex-col transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center mb-5"
                  style={{
                    background: "rgba(202,12,133,0.12)",
                    border: "1px solid rgba(202,12,133,0.25)",
                  }}
                >
                  <Icon size={18} style={{ color: "var(--brand)" }} />
                </div>
                <p
                  className="text-white/30 mb-2 line-through"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.problem}
                </p>
                <p className="text-white/60 leading-relaxed" style={{ fontSize: "14px" }}>
                  {item.solution}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mobile Swipe Carousel (< sm) */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="sm:hidden"
        >
          <div
            ref={carousel.scrollRef}
            onScroll={carousel.handleScroll}
            className="problems-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.problems-carousel::-webkit-scrollbar { display: none; }`}</style>
            {PROBLEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.problem}
                  className="shrink-0"
                  style={{ width: "calc(85vw - 24px)", scrollSnapAlign: "start" }}
                >
                  <div
                    className="p-5 flex flex-col h-full"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center mb-4"
                      style={{
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.25)",
                      }}
                    >
                      <Icon size={18} style={{ color: "var(--brand)" }} />
                    </div>
                    <p
                      className="text-white/30 mb-2 line-through"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "12px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.problem}
                    </p>
                    <p className="text-white/60 leading-relaxed" style={{ fontSize: "14px" }}>
                      {item.solution}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
          <MobileDots count={PROBLEMS.length} activeIdx={carousel.activeIdx} onDotClick={carousel.scrollTo} label="Problem" />
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY HYROX ATHLETES LOVE NAC – Desktop: original | Mobile: banner image
// ─────────────────────────────────────────────────────────────────────────────
function WhySection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse, rgba(202,12,133,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Desktop Image — original (lg+) */}
          <motion.div
            variants={v.fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={0}
            className="relative overflow-hidden hidden lg:block"
            style={{ aspectRatio: "4/5" }}
          >
            <ImageWithFallback
              src={IMG_COMMUNITY}
              alt="HYROX Community im Nice Athletic Club Göppingen"
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.65) saturate(1.1)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(5,5,5,0.8) 0%, transparent 50%)",
              }}
            />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex gap-8">
                <div>
                  <p
                    className="text-white"
                    style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", lineHeight: 1 }}
                  >
                    8
                  </p>
                  <p
                    className="text-white/40"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    HYROX STATIONEN
                  </p>
                </div>
                <div>
                  <p
                    className="text-white"
                    style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", lineHeight: 1 }}
                  >
                    4
                  </p>
                  <p
                    className="text-white/40"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    RACE FORMATE
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: List */}
          <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
            <motion.div variants={v.fadeUp} custom={0}>
              <Label>Das bekommst du</Label>
            </motion.div>
            <motion.h2
              variants={v.fadeUp}
              custom={1}
              className="text-white mb-8"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                letterSpacing: "0.02em",
              }}
            >
              WARUM HYROX ATHLETEN{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>NAC</span>{" "}
              LIEBEN
            </motion.h2>

            <div className="space-y-3">
              {REASONS.map((reason, i) => (
                <motion.div
                  key={reason}
                  variants={v.fadeUp}
                  custom={i * 0.5}
                  className="flex items-start gap-3 py-2"
                >
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--brand)" }}
                  />
                  <span className="text-white/60" style={{ fontSize: "15px" }}>
                    {reason}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Mobile: Community Image Banner (< lg) */}
        <motion.div
          initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="lg:hidden relative overflow-hidden -mx-6 mt-12"
          style={{ aspectRatio: "16/9" }}
        >
          <ImageWithFallback
            src={IMG_COMMUNITY}
            alt="HYROX Community Training"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.65) saturate(1.1)" }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.1) 50%, rgba(5,5,5,0.3) 100%)",
            }}
          />
          {/* Stat badges */}
          <div className="absolute bottom-4 left-6 flex items-center gap-4">
            <div>
              <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", lineHeight: 1 }}>8</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>HYROX STATIONEN</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div>
              <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", lineHeight: 1 }}>4</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>RACE FORMATE</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA — unchanged (already mobile-friendly)
// ─────────────────────────────────────────────────────────────────────────────
function CTASection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--surface-2) 0%, #050505 100%)" }}
    >
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse, rgba(202,12,133,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Bereit für dein Race?</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 6vw, 4.5rem)",
              letterSpacing: "0.02em",
            }}
          >
            DEIN NÄCHSTES{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              RACE
            </span>{" "}
            STARTET HIER
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/45 max-w-lg mx-auto mb-10 leading-relaxed"
            style={{ fontSize: "1rem" }}
          >
            Egal ob dein erstes HYROX Open oder die nächste Pro-Division –
            schnapp dir ein Tagesticket und trainiere an allen 8 Stationen. Komm vorbei.
          </motion.p>
          <motion.div
            variants={v.fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
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
                minWidth: "44px",
                boxShadow: "0 0 30px rgba(202,12,133,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--brand-light)";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(202,12,133,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(202,12,133,0.3)";
              }}
            >
              TAGESTICKET BUCHEN
              <Ticket size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </a>
            <Link
              to="/crossfit-gp"
              className="group inline-flex items-center justify-center gap-3 px-8 text-white/70 transition-all duration-300"
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                fontFamily: "var(--font-condensed)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                minHeight: "52px",
                minWidth: "44px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              CROSSFIT GP ENTDECKEN
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

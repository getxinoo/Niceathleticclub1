import { useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Coffee,
  Zap,
  Heart,
  Users,
  Clock,
  ChevronRight,
  ChevronDown,
  Ticket,
  Star,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// ── Images ──────────────────────────────────────────────────────────────────
import IMG_ESPRESSO from "figma:asset/9167c06f34c94e5af2c687066a3c86bb94bbfb63.png";
import IMG_COMMUNITY from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";
import IMG_LAMPE from "figma:asset/bfa8de2895c6f75fb2e41c582089ee11ce2fb86f.png";
import IMG_THEKE_WIDE from "figma:asset/419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e.png";

// ── MySports Tagesticket Link ─────────────────────────────────────────────
const MYSPORTS_TICKET_URL =
  "https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets";

// ── Animation helpers ───────────────────────────────────────────────────
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

// ── Stats ────────────────────────────────────────────────────────────────────
const THEKE_STATS = [
  { value: "100%", label: "Siebträger" },
  { value: "40g", label: "Protein / Shake" },
  { value: "17+", label: "Drinks & Snacks" },
  { value: "4,9/5", label: "Google Rating" },
];

// ── Menu Categories ─────────────────────────────────────────────────────────
const MENU_CATEGORIES = [
  {
    title: "Espresso & Kaffee",
    icon: Coffee,
    items: [
      { name: "Espresso", desc: "Aus unserer Siebträgermaschine – kräftig und aromatisch", price: "2,00 \u20AC" },
      { name: "Doppio", desc: "Doppelter Espresso – doppelt stark, doppelt gut", price: "3,00 \u20AC" },
      { name: "Americano", desc: "Espresso mit heißem Wasser – mild und vollmundig", price: "2,50 \u20AC" },
      { name: "Cappuccino", desc: "Espresso mit cremigem Milchschaum", price: "4,00 \u20AC" },
      { name: "Flat White", desc: "Doppelter Espresso mit samtiger Milch – weniger Schaum, mehr Geschmack", price: "4,00 \u20AC" },
      { name: "Lempresso", desc: "Espresso trifft Zitrone – erfrischend und einzigartig", price: "4,00 \u20AC" },
    ],
  },
  {
    title: "Protein Shakes & Snacks",
    icon: Zap,
    items: [
      { name: "Classic Whey Shake", desc: "30g Whey Protein, Milch, Eis – Vanille, Chocolate, Banana Split, Cookie & Cream, Cinnamon Cereal, Cocos, Pfirsich", price: "3,50 \u20AC" },
      { name: "Power Shake", desc: "40g Whey, Banane, Haferflocken, Erdnussbutter – der Post-Workout-Hammer", price: "4,50 \u20AC" },
      { name: "Vegan Shake", desc: "Plant Protein, Mandelmilch, Beeren – Schoko und Vanille", price: "4,50 \u20AC" },
      { name: "Protein Bar", desc: "Verschiedene Sorten – perfekt für unterwegs", price: "3,00 \u20AC" },
    ],
  },
  {
    title: "Erfrischungen",
    icon: Star,
    items: [
      { name: "Paulaner Spezi", desc: "Der bayerische Klassiker – Cola trifft Orange", price: "2,50 \u20AC" },
      { name: "Cola & Zero", desc: "Eiskalt aus dem Kühlschrank", price: "2,50 \u20AC" },
      { name: "Powerade", desc: "Isotonischer Sportdrink für dein Workout", price: "2,50 \u20AC" },
      { name: "Dryll", desc: "Erfrischend und kalorienarm", price: "3,50 \u20AC" },
      { name: "Monster", desc: "Energy für maximale Power", price: "3,00 \u20AC" },
      { name: "Nocco", desc: "BCAA-Energy-Drink – zuckerfrei und leistungsstark", price: "3,50 \u20AC" },
      { name: "Red Bull", desc: "Verleiht Flügel – der Energy-Klassiker", price: "3,00 \u20AC" },
    ],
  },
];

// ── Highlights ──────────────────────────────────────────────────────────────
const HIGHLIGHTS = [
  {
    icon: Coffee,
    title: "Siebträger-Espresso",
    desc: "Der beste Kaffee der Stadt. Echte Siebträger-Qualität mit frisch gemahlenen Bohnen.",
  },
  {
    icon: Zap,
    title: "Protein auf Knopfdruck",
    desc: "Whey Shakes direkt nach dem Training. 30–40g Protein pro Shake, perfekt getimed für dein anaboles Fenster.",
  },
  {
    icon: Users,
    title: "Community-Treffpunkt",
    desc: "Die Theke ist mehr als Kaffee. Hier werden Trainingspartner gefunden, Fortschritte gefeiert und Challenges geplant.",
  },
  {
    icon: Heart,
    title: "Snacks für Athleten",
    desc: "Protein Bars, Energy Balls, Bananen – alles da. Kein Junk, nur Fuel für dein nächstes PR.",
  },
  {
    icon: Star,
    title: "Fair & Transparent",
    desc: "Keine versteckten Aufpreise. Faire Preise für Premium-Qualität. Die Theke gehört zum Club.",
  },
  {
    icon: Clock,
    title: "Thekenzeiten",
    desc: "Mo – Fr: 08:30 – 21:30 Uhr\nSa – So: 09:30 – 14:30 Uhr\nShakes · Espresso · Snacks · Drinks",
  },
];

// ── Gallery ──────────────────────────────────────────────────────────────────
const GALLERY = [
  { src: IMG_ESPRESSO, alt: "Siebträger-Espresso an der Nice Theke" },
  { src: IMG_COMMUNITY, alt: "Community-Treffpunkt an der Nice Theke" },
  { src: IMG_LAMPE, alt: "Designer Ring-Lampe über der Nice Theke" },
  { src: IMG_THEKE_WIDE, alt: "Die Nice Theke im Nice Athletic Club Göppingen" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NiceTheke() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  return (
    <>
      <PageMeta
        title="Die Nice Theke – Espresso, Shakes & Snacks | Nice Athletic Club Göppingen"
        description="Premium Fitness in Göppingen – Die Nice Theke: Siebträger-Espresso, Whey Protein Shakes, Protein Bars und mehr. Dein Treffpunkt vor und nach dem Training im Nice Athletic Club."
        canonical="https://niceathleticclub.de/nice-theke"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        <HeroSection reduced={reduced} v={v} />
        <HighlightsSection reduced={reduced} v={v} />
        <GallerySection reduced={reduced} v={v} />
        <MenuSection reduced={reduced} v={v} />
        <CTASection reduced={reduced} v={v} />
      </motion.div>
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
            src={IMG_THEKE_WIDE}
            alt="Die Nice Theke im Nice Athletic Club Göppingen"
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
              <span className="text-white/60">DIE NICE THEKE</span>
            </motion.nav>

            <motion.div variants={v.fadeUp} custom={1}>
              <Label>Espresso · Whey Shakes · Protein Bars</Label>
            </motion.div>

            <motion.h1 variants={v.fadeUp} custom={2} className="text-white mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 9vw, 7rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              DIE NICE <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>THEKE</span>
            </motion.h1>

            <motion.p variants={v.fadeUp} custom={3} className="text-white/55 max-w-xl leading-relaxed mb-8" style={{ fontSize: "1.05rem" }}>
              Der beste Kaffee der Stadt – dazu Whey Shakes, Protein Bars und mehr. Dein Treffpunkt vor und nach dem Training.
            </motion.p>

            <motion.div variants={v.fadeUp} custom={4} className="flex flex-col sm:flex-row gap-4">
              <a href={MYSPORTS_TICKET_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98]" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}>
                TAGESTICKET BUCHEN
                <Ticket size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <Link to="/studio" className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300" style={{ border: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 600, letterSpacing: "0.14em", minHeight: "52px", minWidth: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "white"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                STUDIO ENTDECKEN
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile Hero (< sm) ── full-screen immersive ── */}
      <section
        id="theke-hero-mobile"
        className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={IMG_THEKE_WIDE}
            alt="Die Nice Theke im Nice Athletic Club Göppingen"
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
              <span className="text-white/60">DIE NICE THEKE</span>
            </motion.nav>

            {/* Tag */}
            <motion.div variants={v.fadeUp} custom={1}>
              <Label>Espresso · Whey Shakes · Protein Bars</Label>
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
              DIE NICE{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                THEKE
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={v.fadeUp}
              custom={3}
              className="text-white/55 max-w-xl leading-relaxed mb-6"
              style={{ fontSize: "0.95rem" }}
            >
              Der beste Kaffee der Stadt – dazu Whey Shakes, Protein Bars und mehr.
              Dein Treffpunkt vor und nach dem Training.
            </motion.p>

            {/* Stats – 2x2 grid */}
            <motion.div variants={v.fadeUp} custom={3.5} className="grid grid-cols-2 gap-2.5 mb-7">
              {THEKE_STATS.map(({ value, label }) => (
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
                to="/studio"
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
                STUDIO ENTDECKEN
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
            const el = document.getElementById("theke-highlights");
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

// ─────────────────────────────────────────────────────────────────────────────
// HIGHLIGHTS – Desktop: grid | Mobile: swipe carousel
// ─────────────────────────────────────────────────────────────────────────────
function HighlightsSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth : 1;
    const idx = Math.round(el.scrollLeft / (cardW + 12));
    setActiveIdx(Math.min(idx, HIGHLIGHTS.length - 1));
  }, []);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardW = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: index * (cardW + 12), behavior: "smooth" });
  }, []);

  return (
    <section id="theke-highlights" ref={ref} className="relative overflow-hidden" style={{ paddingTop: "64px", paddingBottom: "96px", backgroundColor: "var(--surface-0)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-16">
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Was dich erwartet</Label>
          </motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>
            MEHR ALS <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>KAFFEE</span>
          </motion.h2>
        </motion.div>

        {/* Desktop Grid (sm+) */}
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} variants={v.fadeUp} custom={i} className="p-6 transition-all duration-300" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div className="w-10 h-10 flex items-center justify-center mb-4" style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                <Icon size={18} style={{ color: "var(--brand)" }} />
              </div>
              <h3 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                {title}
              </h3>
              {desc.includes("\n") ? (
                desc.split("\n").map((line, li) => (
                  <p key={li} style={{ fontSize: "13px", color: li === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", lineHeight: 1.6, fontFamily: li === 0 ? undefined : "var(--font-condensed)", fontWeight: li === 0 ? undefined : 600, letterSpacing: li === 0 ? undefined : "0.08em", marginTop: li > 0 ? "6px" : undefined }}>
                    {line}
                  </p>
                ))
              ) : (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  {desc}
                </p>
              )}
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
            ref={scrollRef}
            onScroll={handleScroll}
            className="theke-hl-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.theke-hl-carousel::-webkit-scrollbar { display: none; }`}</style>
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
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
                  {desc.includes("\n") ? (
                    desc.split("\n").map((line, li) => (
                      <p key={li} style={{ fontSize: "13px", color: li === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", lineHeight: 1.6, fontFamily: li === 0 ? undefined : "var(--font-condensed)", fontWeight: li === 0 ? undefined : 600, letterSpacing: li === 0 ? undefined : "0.08em", marginTop: li > 0 ? "6px" : undefined }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                      {desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          {/* Dots + Swipe Hint */}
          <div className="flex flex-col items-center gap-2.5 mt-4">
            <div className="flex items-center gap-2">
              {HIGHLIGHTS.map((h, i) => (
                <button
                  key={h.title}
                  onClick={() => scrollTo(i)}
                  aria-label={`Karte ${i + 1}`}
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
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}>
              WISCHEN FÜR MEHR
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// GALLERY
// ─────────────────────────────────────────────────────────────────────────────
function GallerySection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ paddingTop: "48px", paddingBottom: "64px", background: "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-2) 100%)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-12">
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Impressionen</Label>
          </motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "0.02em" }}>
            DEIN <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>FUEL STOP</span>
          </motion.h2>
        </motion.div>

        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="grid grid-cols-2 gap-3 md:gap-4">
          {GALLERY.map((img, i) => (
            <motion.div key={img.alt} variants={v.fadeUp} custom={i} className="group relative overflow-hidden" style={{ aspectRatio: i === 0 || i === 3 ? "4/3" : "3/2" }}>
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
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU – Desktop: 3-col grid | Mobile: swipe carousel for categories
// ─────────────────────────────────────────────────────────────────────────────
function MenuSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth : 1;
    const idx = Math.round(el.scrollLeft / (cardW + 12));
    setActiveIdx(Math.min(idx, MENU_CATEGORIES.length - 1));
  }, []);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardW = (el.firstElementChild as HTMLElement).offsetWidth;
    el.scrollTo({ left: index * (cardW + 12), behavior: "smooth" });
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ paddingTop: "64px", paddingBottom: "96px", backgroundColor: "var(--surface-0)" }}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none" aria-hidden="true" style={{ background: "radial-gradient(ellipse, rgba(202,12,133,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-16">
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Speisekarte</Label>
          </motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 4rem)", letterSpacing: "0.02em" }}>
            UNSER <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>ANGEBOT</span>
          </motion.h2>
          <motion.p variants={v.fadeUp} custom={2} className="text-white/40 mt-4 max-w-lg mx-auto" style={{ fontSize: "0.95rem" }}>
            Von Siebträger-Espresso bis zum 40g-Whey-Power-Shake – alles frisch zubereitet, fair bepreist und perfekt auf Athleten abgestimmt.
          </motion.p>
        </motion.div>

        {/* Desktop Grid (sm+) */}
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="hidden sm:grid grid-cols-1 lg:grid-cols-3 gap-6">
          {MENU_CATEGORIES.map((cat, ci) => {
            const Icon = cat.icon;
            return (
              <motion.div key={cat.title} variants={v.fadeUp} custom={ci} className="flex flex-col" style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-9 h-9 flex items-center justify-center" style={{ background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)" }}>
                    <Icon size={16} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    {cat.title}
                  </h3>
                </div>
                <div className="flex-1">
                  {cat.items.map((item, ii) => (
                    <div key={item.name} className="px-6 py-4 flex items-start justify-between gap-4" style={{ borderBottom: ii < cat.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div className="flex-1">
                        <p className="text-white/80 mb-0.5" style={{ fontSize: "14px" }}>{item.name}</p>
                        <p className="text-white/30" style={{ fontSize: "12px", lineHeight: 1.5 }}>{item.desc}</p>
                      </div>
                      <span className="text-white shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1 }}>{item.price}</span>
                    </div>
                  ))}
                </div>
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
            ref={scrollRef}
            onScroll={handleScroll}
            className="theke-menu-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.theke-menu-carousel::-webkit-scrollbar { display: none; }`}</style>
            {MENU_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="shrink-0"
                  style={{ width: "calc(90vw - 24px)", scrollSnapAlign: "start" }}
                >
                  <div
                    className="flex flex-col h-full"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Category Header */}
                    <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)" }}>
                        <Icon size={16} style={{ color: "var(--brand)" }} />
                      </div>
                      <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                        {cat.title}
                      </h3>
                    </div>
                    {/* Items */}
                    <div className="flex-1">
                      {cat.items.map((item, ii) => (
                        <div key={item.name} className="px-5 py-3.5 flex items-start justify-between gap-3" style={{ borderBottom: ii < cat.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 mb-0.5" style={{ fontSize: "13px" }}>{item.name}</p>
                            <p className="text-white/30" style={{ fontSize: "11px", lineHeight: 1.4 }}>{item.desc}</p>
                          </div>
                          <span className="text-white shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", lineHeight: 1 }}>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          {/* Dots + Swipe Hint */}
          <div className="flex flex-col items-center gap-2.5 mt-4">
            <div className="flex items-center gap-2">
              {MENU_CATEGORIES.map((c, i) => (
                <button
                  key={c.title}
                  onClick={() => scrollTo(i)}
                  aria-label={`Kategorie ${i + 1}`}
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
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}>
              WISCHEN FÜR MEHR
            </span>
          </div>
        </motion.div>

        {/* Note */}
        <motion.div variants={v.fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} custom={5} className="text-center mt-8">
          <p className="text-white/25" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em" }}>
            ALLE PREISE INKL. MWST. · ÄNDERUNGEN VORBEHALTEN
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────────────────
function CTASection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ paddingTop: "48px", paddingBottom: "96px", background: "linear-gradient(180deg, var(--surface-0) 0%, #050505 100%)" }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none" aria-hidden="true" style={{ background: "radial-gradient(ellipse, rgba(202,12,133,0.1) 0%, transparent 70%)" }} />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <motion.div variants={v.fadeUp} custom={0}>
            <Coffee size={28} style={{ color: "var(--brand)", marginBottom: "16px", display: "inline-block" }} />
          </motion.div>
          <motion.div variants={v.fadeUp} custom={0.5}>
            <Label>Komm vorbei</Label>
          </motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white mb-5" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 6vw, 4.5rem)", letterSpacing: "0.02em" }}>
            SCHNUPPER REIN MIT EINEM <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>TAGESTICKET</span>
          </motion.h2>
          <motion.p variants={v.fadeUp} custom={2} className="text-white/45 max-w-lg mx-auto mb-10 leading-relaxed" style={{ fontSize: "1rem" }}>
            Trainiere einen Tag lang im Nice Athletic Club und gönn dir anschließend einen Espresso oder Whey Shake an der Nice Theke – alles unter einem Dach.
          </motion.p>
          <motion.div variants={v.fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
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
              to="/preise"
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
              PREISE ANSEHEN
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
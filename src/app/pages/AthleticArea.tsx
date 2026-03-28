import { useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Dumbbell,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { MEMBERSHIP_PLANS } from "../../data/classes";
import { cn } from "../../lib/utils";

// ── Hero image (from the attached Figma asset) ─────────────────────────────
import heroImg from "figma:asset/a3ce98c339ff8c2006773759eeb77a3c43abf78a.png";

// ── NAC Entrance image ─────────────────────────────────────────────────────
import IMG_NAC_ENTRANCE from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";

// ── Gallery images ──────────────────────────────────────────────────────────
import IMG_GALLERY_1 from "figma:asset/8a0625f157027f7d78a77b8a5fbf3b4b93777f97.png";
import IMG_GALLERY_2 from "figma:asset/e704c2ac0998162964d3a3daf9a29da8f72c02fb.png";
import IMG_GALLERY_3 from "figma:asset/7b24826278b15fbc7dc3655d444a32e8e77c4363.png";
import IMG_GALLERY_4 from "figma:asset/5de102692d016d2b111df6d8ffedcaac846d6cb2.png";
import IMG_GALLERY_5 from "figma:asset/374ce31108a424a9844144e6efd71e4f725a4976.png";

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

// ── Equipment Brand Logos ────────────────────────────────────────────────────
const BRANDS = [
  { name: "Atlantis" },
  { name: "Body Masters" },
  { name: "BootyBuilder" },
  { name: "Cybex" },
  { name: "Eleiko" },
  { name: "Flex Leverage" },
  { name: "Gym80" },
  { name: "Gymleco" },
  { name: "Hammer Strength" },
  { name: "Hoist" },
  { name: "Hold Strong" },
  { name: "Magnum" },
  { name: "Nautilus" },
  { name: "Nebula" },
  { name: "Panatta" },
  { name: "Pendulum" },
  { name: "Precor" },
  { name: "Prime" },
  { name: "Schnell" },
  { name: "Watson" },
];

// ── Mobile brand pages: 2 columns × 4 rows = 8 per page ────────────────────
const BRANDS_PER_PAGE = 6;
const BRAND_PAGES: { name: string }[][] = [];
for (let i = 0; i < BRANDS.length; i += BRANDS_PER_PAGE) {
  BRAND_PAGES.push(BRANDS.slice(i, i + BRANDS_PER_PAGE));
}

// ── Brand Card Component (premium mobile) ───────────────────────────────────
function MobileBrandCard({
  brand,
  index,
}: {
  brand: { name: string };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className="relative group overflow-hidden"
      style={{
        borderRadius: "14px",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        aspectRatio: "1",
      }}
    >
      {/* Subtle top shine */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.15) 50%, transparent 90%)",
        }}
      />

      {/* Magenta corner accent */}
      <div
        className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
        style={{
          borderTop: "2px solid rgba(202,12,133,0.35)",
          borderLeft: "2px solid rgba(202,12,133,0.35)",
          borderTopLeftRadius: "14px",
        }}
      />

      {/* Number badge */}
      <div
        className="absolute top-2.5 right-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: "rgba(202,12,133,0.4)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Brand name centered */}
      <div className="absolute inset-0 flex items-center justify-center px-3">
        <h3
          className="text-center"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.85rem, 4vw, 1.1rem)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {brand.name}
        </h3>
      </div>

      {/* Bottom subtle magenta glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(202,12,133,0.25), transparent)",
        }}
      />
    </motion.div>
  );
}

// ── Brand Card Component ────────────────────────────────────────────────────
function BrandCard({
  brand,
  index,
  reduced,
  v,
}: {
  brand: { name: string };
  index: number;
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={v.fadeUp}
      custom={index}
      className="group relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: "90px",
      }}
    >
      {/* Card body – fills entire wrapper */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-500 overflow-hidden"
        style={{
          background: hovered
            ? "rgba(202,12,133,0.06)"
            : "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          border: "1px solid",
          borderColor: hovered
            ? "rgba(202,12,133,0.5)"
            : "rgba(255,255,255,0.07)",
          boxShadow: hovered
            ? "0 0 20px rgba(202,12,133,0.15), inset 0 0 30px rgba(202,12,133,0.05)"
            : "none",
        }}
      >
        {/* Animated shine sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 65%)",
            transform: hovered ? "translateX(200%)" : "translateX(-200%)",
            transition: reduced
              ? "none"
              : "transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-all duration-500"
          style={{
            background: hovered
              ? "linear-gradient(90deg, transparent 0%, rgba(202,12,133,0.8) 50%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
          }}
        />

        {/* Bottom magenta reflection */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-all duration-500"
          style={{
            width: hovered ? "60%" : "0%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(202,12,133,0.6), transparent)",
          }}
        />

        {/* Brand Name */}
        <h3
          className="relative z-10 text-center px-3 transition-all duration-300"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 400,
            lineHeight: 1.15,
            color: hovered ? "white" : "rgba(255,255,255,0.75)",
            textShadow: hovered ? "0 0 20px rgba(202,12,133,0.4)" : "none",
          }}
        >
          {brand.name}
        </h3>

        {/* Corner accents on hover */}
        <div
          className="absolute top-0 left-0 w-4 h-4 transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            borderTop: "2px solid rgba(202,12,133,0.7)",
            borderLeft: "2px solid rgba(202,12,133,0.7)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-4 h-4 transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            borderBottom: "2px solid rgba(202,12,133,0.7)",
            borderRight: "2px solid rgba(202,12,133,0.7)",
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Why Bodybuilders Love NAC ───────────────────────────────────────────────
const REASONS = [
  "Der beste Kaffee der Stadt",
  "Kurzhantel-Set bis 60 kg – für jedes Level",
  "Cable Station mit MAG Griffen und vielen mehr",
  "Beinpresse, Hack Squat & Pendulum Squat",
  "Isolationsmaschinen für jede Muskelgruppe",
  "Olympia-Plattform für Deadlifts & Olympic Lifts",
  "8 Half Racks",
  "Wettkampf Powerlifting-Combo",
  "Smith Machine & Multipresse",
  "Täglich geöffnet 5:00 – 00:00 Uhr",
  "Gratis Trinkwasser-Station",
];

// ── Gallery Images ──────────────────────────────────────────────────────────
const GALLERY = [
  { src: IMG_GALLERY_1, alt: "Premium Freihantelbereich mit Maschinen-Übersicht" },
  { src: IMG_GALLERY_2, alt: "Maschinenpark mit Hexagon-Beleuchtung" },
  { src: IMG_GALLERY_3, alt: "Trainingsbereich mit Tageslicht und Hexagon-Decke" },
  { src: IMG_GALLERY_4, alt: "Panorama der Athletic Area Trainingsfläche" },
  { src: IMG_GALLERY_5, alt: "Gesamtansicht der 1.500+ qm Trainingsfläche" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: Athletic Area
// ────────────────────────────────────────────────────────────────────────────
export default function AthleticArea() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  // Plans relevant for bodybuilders
  const athleticPlan = MEMBERSHIP_PLANS.find((p) => p.id === "athletic")!;
  const nicestPlan = MEMBERSHIP_PLANS.find((p) => p.id === "nicest")!;

  return (
    <>
      <PageMeta
        title="Athletic Area Göppingen – Bodybuilding & Kraft | Nice Athletic Club"
        description="Athletic Area im NAC Göppingen: Eleiko, Hammer Strength, Gym80, Panatta, Cybex – 14+ Premium-Hersteller, 4 Power Racks, 1.500+ qm. Bodybuilding & Krafttraining auf Profi-Niveau. Gratis testen!"
        canonical="https://nicefitness.de/athletic-area"
        ogImage="https://nicefitness.de/images/athletic/hero.png"
      />

      {/* ── HERO ── */}
      <HeroSection reduced={reduced} v={v} />

      {/* ── INTRO / EQUIPMENT BRANDS ── */}
      <BrandsSection reduced={reduced} v={v} />

      {/* ── WHY BODYBUILDERS LOVE NAC ── */}
      <WhySection reduced={reduced} v={v} />

      {/* ── GALLERY ── */}
      <GallerySection reduced={reduced} v={v} />

      {/* ── CTA ── */}
      <CTASection reduced={reduced} v={v} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  return (
    <section
      id="athletic-hero"
      className="relative min-h-screen flex items-center md:items-end overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Athletic Area im Nice Athletic Club Göppingen"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.45) saturate(1.1)" }}
        />
      </div>

      {/* Overlays */}
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
      <div
        className="relative w-full max-w-7xl mx-auto px-6 pb-20 md:pb-24 pt-24 md:pt-40"
        style={{ zIndex: 5 }}
      >
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          {/* Breadcrumb */}
          <motion.nav
            variants={v.fadeUp}
            custom={0}
            className="flex items-center gap-1.5 md:gap-2 mb-4 md:mb-6 text-white/40"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
            }}
          >
            <Link
              to="/"
              className="hover:text-white/70 transition-colors py-1"
            >
              HOME
            </Link>
            <ChevronRight size={11} />
            <span className="text-white/60">ATHLETIC AREA</span>
          </motion.nav>

          {/* Tag */}
          <motion.div variants={v.fadeUp} custom={1}>
            <Label>Bodybuilding · Muskelaufbau · Maschinen</Label>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={v.fadeUp}
            custom={2}
            className="text-white mb-4 md:mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.8rem, 10vw, 7rem)",
              lineHeight: 0.92,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            BUILT FOR{" "}
            <span
              style={{
                WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                color: "transparent",
              }}
            >
              BODYBUILDING
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={v.fadeUp}
            custom={3}
            className="text-white/55 max-w-xl leading-relaxed mb-8 md:mb-10"
            style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)" }}
          >
            Im Nice Athletic Club Göppingen trainierst du an Premium-Equipment
            von Eleiko, Hammer Strength, Gym80, Panatta, Prime und
            15 weiteren Top-Herstellern – von der Beinpresse bis zum Cable Crossover für
            maximalen Muskelaufbau.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={v.fadeUp}
            custom={4}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <a
              href="https://www.mysports.com/de/e/nice-athletic-club/2024120216382986965/buchen"
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
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(202,12,133,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand)";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(202,12,133,0.3)";
              }}
            >
              TAGESTICKET BUCHEN
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </a>
            <Link
              to="/kontakt"
              className="group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300 cursor-pointer"
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
              KONTAKT
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Scroll Indicator ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => {
          const el = document.getElementById("equipment-brands");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Zum Equipment scrollen"
        style={{ zIndex: 10, background: "none", border: "none", minWidth: "44px", minHeight: "44px" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.25em",
          }}
        >
          SCROLL
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BRANDS / EQUIPMENT SECTION
// ─────────────────────────────────────────────────────────────────────────────
function BrandsSection({
  reduced,
  v,
}: {
  reduced: boolean | null;
  v: ReturnType<typeof makeVariants>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const brandScrollRef = useRef<HTMLDivElement>(null);
  const [activeBrandPage, setActiveBrandPage] = useState(0);

  const handleBrandScroll = useCallback(() => {
    const el = brandScrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const pageWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const gap = 16; // gap-4
    const idx = Math.round(scrollLeft / (pageWidth + gap));
    setActiveBrandPage(Math.min(idx, BRAND_PAGES.length - 1));
  }, []);

  const scrollToBrandPage = useCallback((index: number) => {
    const el = brandScrollRef.current;
    if (!el || !el.firstElementChild) return;
    const pageWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const gap = 16;
    el.scrollTo({ left: index * (pageWidth + gap), behavior: "smooth" });
  }, []);

  return (
    <section
      id="equipment-brands"
      ref={ref}
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      {/* Background subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse, rgba(202,12,133,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Equipment Partner</Label>
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
            MACHINES FOR{" "}
            <span
              style={{
                WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                color: "transparent",
              }}
            >
              CHAMPIONS
            </span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/40 mt-4 max-w-lg mx-auto"
            style={{ fontSize: "0.95rem" }}
          >
            Wir investieren in die besten Marken der Welt – damit du an
            Equipment trainierst, das in olympischen Trainingszentren steht.
          </motion.p>

          {/* Brand count badge */}
          <motion.div
            variants={v.fadeUp}
            custom={3}
            className="inline-flex items-center gap-2 mt-6 px-5 py-2"
            style={{
              background: "rgba(202,12,133,0.08)",
              border: "1px solid rgba(202,12,133,0.2)",
              borderRadius: "100px",
            }}
          >
            <Dumbbell size={14} style={{ color: "var(--brand)" }} />
            <span
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {BRANDS.length} PREMIUM HERSTELLER
            </span>
          </motion.div>
        </motion.div>

        {/* ── Desktop Grid (sm+) ── */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4"
        >
          {BRANDS.map((brand, i) => (
            <BrandCard
              key={brand.name}
              brand={brand}
              index={i}
              reduced={reduced}
              v={v}
            />
          ))}
        </motion.div>

        {/* ── Mobile Swipe Carousel (< sm) ── */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="sm:hidden"
        >
          <div
            ref={brandScrollRef}
            onScroll={handleBrandScroll}
            className="brand-carousel flex gap-4 overflow-x-auto pb-2 -mx-6 px-6"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`
              .brand-carousel::-webkit-scrollbar { display: none; }
            `}</style>
            {BRAND_PAGES.map((page, pageIdx) => (
              <div
                key={pageIdx}
                className="shrink-0 grid grid-cols-3 gap-2.5"
                style={{
                  width: "calc(100vw - 48px)",
                  scrollSnapAlign: "start",
                }}
              >
                {page.map((brand, localIdx) => (
                  <MobileBrandCard
                    key={brand.name}
                    brand={brand}
                    index={pageIdx * BRANDS_PER_PAGE + localIdx}
                  />
                ))}
              </div>
            ))}
            {/* Spacer for last page snap */}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          {/* Dot Indicators + Swipe Hint */}
          <div className="flex flex-col items-center gap-3 mt-5">
            <div className="flex items-center gap-2">
              {BRAND_PAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToBrandPage(i)}
                  aria-label={`Seite ${i + 1} von ${BRAND_PAGES.length}`}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: activeBrandPage === i ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background:
                      activeBrandPage === i
                        ? "var(--brand)"
                        : "rgba(255,255,255,0.2)",
                    border: "none",
                    padding: 0,
                    boxShadow:
                      activeBrandPage === i
                        ? "0 0 10px rgba(202,12,133,0.4)"
                        : "none",
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
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={BRANDS.length + 1}
          className="text-center mt-10 text-white/25"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            letterSpacing: "0.2em",
            fontWeight: 600,
          }}
        >
          … UND WEITERE SPEZIALISIERTE TRAININGSGERÄTE
        </motion.p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY SECTION
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
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  const handleGalleryScroll = useCallback(() => {
    const el = galleryScrollRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    const scrollLeft = el.scrollLeft;
    const gap = 12;
    let cumulative = 0;
    for (let i = 0; i < children.length; i++) {
      const w = children[i].offsetWidth;
      if (scrollLeft < cumulative + w / 2 + gap / 2) {
        setActiveGalleryIdx(i);
        return;
      }
      cumulative += w + gap;
    }
    setActiveGalleryIdx(children.length - 1);
  }, []);

  const scrollToGalleryIdx = useCallback((index: number) => {
    const el = galleryScrollRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (!children[index]) return;
    const gap = 12;
    let scrollTarget = 0;
    for (let i = 0; i < index; i++) {
      scrollTarget += children[i].offsetWidth + gap;
    }
    el.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, []);

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-2) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-8 md:mb-12"
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
            <span
              style={{
                WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                color: "transparent",
              }}
            >
              TRAININGSBEREICH
            </span>
          </motion.h2>
        </motion.div>

        {/* ── Desktop: Masonry grid (md+) ── */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden md:grid grid-cols-3 gap-4"
        >
          {GALLERY.map((img, i) => (
            <motion.div
              key={img.alt}
              variants={v.fadeUp}
              custom={i}
              className={cn(
                "group relative overflow-hidden",
                i === 0 ? "col-span-2 row-span-2" : ""
              )}
              style={{
                aspectRatio: i === 0 ? "4/3" : "3/2",
              }}
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

        {/* ── Mobile: Horizontal swipe carousel (< md) ── */}
        <motion.div
          variants={v.fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="md:hidden"
        >
          <div
            ref={galleryScrollRef}
            onScroll={handleGalleryScroll}
            className="gallery-carousel flex gap-3 overflow-x-auto -mx-6 px-6 pb-2"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`
              .gallery-carousel::-webkit-scrollbar { display: none; }
            `}</style>
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
                  style={{
                    filter: "brightness(0.75) saturate(0.9)",
                    borderRadius: "8px",
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                  }}
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
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "var(--brand)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    / {String(GALLERY.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}
            {/* End spacer */}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          {/* Dot Indicators */}
          <div className="flex flex-col items-center gap-2.5 mt-4">
            <div className="flex items-center gap-2">
              {GALLERY.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToGalleryIdx(i)}
                  aria-label={`Bild ${i + 1} von ${GALLERY.length}`}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: activeGalleryIdx === i ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background:
                      activeGalleryIdx === i
                        ? "var(--brand)"
                        : "rgba(255,255,255,0.2)",
                    border: "none",
                    padding: 0,
                    boxShadow:
                      activeGalleryIdx === i
                        ? "0 0 10px rgba(202,12,133,0.4)"
                        : "none",
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
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY BODYBUILDERS LOVE NAC
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
      className="py-24 md:py-32 overflow-hidden relative"
      style={{
        background:
          "linear-gradient(180deg, var(--surface-2) 0%, var(--surface-0) 100%)",
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse, rgba(202,12,133,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Image */}
          <motion.div
            variants={v.fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={0}
            className="relative overflow-hidden"
            style={{ aspectRatio: "4/5" }}
          >
            <ImageWithFallback
              src={IMG_NAC_ENTRANCE}
              alt="Nice Athletic Club Eingangsbereich"
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.65) saturate(1.1)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(5,5,5,0.8) 0%, transparent 50%)",
              }}
            />
            {/* Stat overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex gap-8">
                <div>
                  <p
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2.5rem",
                      lineHeight: 1,
                    }}
                  >
                    1.500+
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
                    QM TRAININGSFLÄCHE
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: List */}
          <motion.div
            variants={v.stagger}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
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
              WARUM UNSERE MEMBER DAS{" "}
              <span
                style={{
                  WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                  color: "transparent",
                }}
              >
                NICE
              </span>{" "}
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
                  <span
                    className="text-white/60"
                    style={{ fontSize: "15px" }}
                  >
                    {reason}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA SECTION
// ────────────────────────────────────────────────────────────────────────────
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
      style={{
        background:
          "linear-gradient(180deg, var(--surface-0) 0%, #050505 100%)",
      }}
    >
      {/* Magenta glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse, rgba(202,12,133,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Bereit für mehr?</Label>
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
            <span
              style={{
                WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                color: "transparent",
              }}
            >
              LEVEL
            </span>{" "}
            WARTET
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/45 max-w-lg mx-auto mb-10 leading-relaxed"
            style={{ fontSize: "1rem" }}
          >
            Komm vorbei, teste unsere Equipment-Welt und überzeuge dich selbst.
            Dein erstes Training ist auf uns.
          </motion.p>
          <motion.div
            variants={v.fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="https://www.mysports.com/de/e/nice-athletic-club/2024120216382986965/buchen"
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
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(202,12,133,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand)";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(202,12,133,0.3)";
              }}
            >
              TAGESTICKET BUCHEN
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </a>
            <Link
              to="/kontakt"
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
              KONTAKT
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
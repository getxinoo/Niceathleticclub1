import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router";
import {
  motion,
  useReducedMotion,
  useInView,
} from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Dumbbell,
  Flame,
  Users,
  Star,
  Swords,
  Volume2,
  VolumeX,
  Coffee,
  Ticket,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { api, BASE_URL } from "../../lib/api-service";
import { MOCK_REVIEWS, type GoogleReview } from "../../data/reviews";
import { cn } from "../../lib/utils";
import {
  PAGE_INITIAL_BLOCKS,
  type PageBlock,
  type HeroBlockData,
} from "../../data/blocks";

// ── Pillar background images (Figma assets) ────────────────────────────────────
import pillarStrengthImg from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";
import pillarCrossfitImg from "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png";
import pillarHyroxImg    from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import pillarThekeImg    from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";

// ── Images ──
const HERO_POSTER =
  "https://images.unsplash.com/photo-1700784795176-7ff886439d79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1800";

// ── Fetch home blocks from CMS API, fall back to local seed data ──────────────
async function fetchHomeBlocks(): Promise<PageBlock[]> {
  // 1. Try PHP API (production)
  try {
    const res = await fetch(`${BASE_URL}/pages.php?slug=home`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.blocks) && json.blocks.length > 0) {
      return json.blocks as PageBlock[];
    }
  } catch { /* fall through */ }
  // 2. Admin edits saved by PageEditor (localStorage)
  try {
    const saved = localStorage.getItem("nac_blocks_home");
    if (saved) {
      const parsed = JSON.parse(saved) as PageBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // 3. Seed data
  return PAGE_INITIAL_BLOCKS["home"];
}

// ── Shared Animation Variants ─────────────────────────────────────────────────
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
  slideLeft: {
    hidden: { opacity: 0, x: reduced ? 0 : -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  },
  slideRight: {
    hidden: { opacity: 0, x: reduced ? 0 : 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  },
});

// ── Reusable: Section Label ─────────────────────────────────────────────────
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

// ── Reusable: Primary CTA Button ─────────────────────────────────────────────
function PrimaryBtn({
  to,
  onClick,
  children,
  className,
}: {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98] cursor-pointer";
  const style: React.CSSProperties = {
    background: "var(--brand)",
    fontFamily: "var(--font-condensed)",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    border: "none",
    minHeight: "52px",
    minWidth: "44px",
  };

  const content = (
    <>
      {children}
      <ArrowRight
        size={16}
        className="group-hover:translate-x-1 transition-transform duration-300"
      />
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(base, className)}
        style={style}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--brand-light)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "var(--brand)")
        }
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(base, className)}
      style={style}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--brand-light)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "var(--brand)")
      }
    >
      {content}
    </button>
  );
}

// ── Reusable: Ghost Button ────────────────────────────────────────────────────
function GhostBtn({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center justify-center gap-3 px-7 text-white/70 transition-all duration-300 cursor-pointer",
        className
      )}
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
      {children}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 · HERO  (data-driven via HeroBlockData props)
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({
  data,
  reduced,
}: {
  data: HeroBlockData;
  reduced: boolean | null;
}) {
  const v = makeVariants(reduced);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(
    data.videoMuted !== undefined ? data.videoMuted : true
  );

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    if (videoRef.current && data.videoStartTime > 0) {
      videoRef.current.currentTime = data.videoStartTime;
    }
  }, [data.videoStartTime]);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const isVideo = data.mediaType === "video" && !!data.mediaUrl;
  const isImage = data.mediaType === "image" && !!data.mediaUrl;

  return (
    <section id="hero-section" className="relative min-h-screen flex items-center md:items-end overflow-hidden">

      {/* ── Poster (shown until video is ready) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_POSTER})`,
          filter: "brightness(0.45) saturate(1.1)",
          transition: "opacity 0.6s ease",
          opacity: isVideo && videoReady ? 0 : isImage ? 0 : 1,
          zIndex: 1,
        }}
      />

      {/* ── Static image background ── */}
      {isImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${data.mediaUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.42) saturate(1.15)",
            zIndex: 2,
          }}
        />
      )}

      {/* ── Video Background ── */}
      {isVideo && (
        <video
          ref={videoRef}
          autoPlay
          loop={data.videoLoop}
          muted={muted}
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          src={data.mediaUrl}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            filter: "brightness(0.42) saturate(1.15)",
            opacity: videoReady ? 1 : 0,
            transition: "opacity 1.2s ease",
            zIndex: 2,
          }}
        />
      )}

      {/* ── Noise grain overlay ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Gradient Overlays ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background:
            "linear-gradient(to bottom, rgba(5,5,5,0.28) 0%, rgba(5,5,5,0.15) 40%, rgba(5,5,5,0.72) 80%, #050505 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background:
            "radial-gradient(ellipse 80% 80% at 0% 100%, rgba(202,12,133,0.20) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background:
            "radial-gradient(ellipse 50% 100% at 100% 50%, rgba(0,0,0,0.45) 0%, transparent 70%)",
        }}
      />

      {/* ── Top: NAC wordmark stamp ── */}
      <div
        className="absolute top-0 right-0 hidden lg:flex items-center justify-center w-32 h-32 border-b border-l border-white/5"
        style={{ zIndex: 5 }}
      >
        <span
          className="text-white/10 select-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "11px",
            letterSpacing: "0.3em",
            writingMode: "vertical-rl",
          }}
        >
          NICE ATHLETIC CLUB
        </span>
      </div>

      {/* ── Mute toggle (only for video) ── */}
      {isVideo && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: videoReady ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={toggleMute}
          aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
          className="absolute bottom-8 right-6 flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{ zIndex: 10, minWidth: "44px", minHeight: "44px", justifyContent: "flex-end" }}
        >
          {muted
            ? <VolumeX size={16} />
            : <Volume2 size={16} style={{ color: "var(--brand)" }} />
          }
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em" }}>
            {muted ? "SOUND ON" : "MUTE"}
          </span>
        </motion.button>
      )}

      {/* ── Live indicator ── */}
      {isVideo && videoReady && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute top-24 right-6 hidden lg:flex items-center gap-2"
          style={{ zIndex: 10 }}
        >
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)" }}>
            LIVE
          </span>
        </motion.div>
      )}

      {/* ── Hero Content ── */}
      <div className="relative w-full max-w-7xl mx-auto px-6 pb-24 md:pb-28 pt-24 md:pt-40" style={{ zIndex: 5 }}>
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          {/* Label */}
          {data.label && (
            <motion.div variants={v.fadeUp} custom={0}>
              <Label>{data.label}</Label>
            </motion.div>
          )}

          {/* Headline */}
          <motion.h1
            variants={v.fadeUp}
            custom={1}
            className="text-white mb-4 md:mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.8rem, 10vw, 8rem)",
              lineHeight: 0.92,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {/* Line 1 */}
            {(data.headlineLine1Normal || data.headlineLine1Outline) && (
              <>
                {data.headlineLine1Normal}
                {data.headlineLine1Normal && data.headlineLine1Outline && " "}
                {data.headlineLine1Outline && (
                  <span
                    style={{
                      WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                      color: "transparent",
                    }}
                  >
                    {data.headlineLine1Outline}
                  </span>
                )}
              </>
            )}
            {/* <br /> between lines */}
            {(data.headlineLine1Normal || data.headlineLine1Outline) &&
              (data.headlineLine2Normal || data.headlineLine2Outline) && <br />}
            {/* Line 2 */}
            {(data.headlineLine2Normal || data.headlineLine2Outline) && (
              <>
                {data.headlineLine2Normal}
                {data.headlineLine2Normal && data.headlineLine2Outline && " "}
                {data.headlineLine2Outline && (
                  <span
                    style={{
                      WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                      color: "transparent",
                    }}
                  >
                    {data.headlineLine2Outline}
                  </span>
                )}
              </>
            )}
          </motion.h1>

          {/* Subtitle */}
          {data.subtitle && (
            <motion.p
              variants={v.fadeUp}
              custom={2}
              className="text-white/55 max-w-lg leading-relaxed mb-8 md:mb-10"
              style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", fontFamily: "var(--font-sans)" }}
            >
              {data.subtitle}
            </motion.p>
          )}

          {/* CTAs */}
          {(data.btn1Label || data.btn2Label) && (
            <motion.div
              variants={v.fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              {data.btn1Label && (
                data.btn1Style === "primary" ? (
                  <PrimaryBtn to={data.btn1Url || "/"}>
                    {data.btn1Label}
                  </PrimaryBtn>
                ) : (
                  <GhostBtn to={data.btn1Url || "/"}>
                    {data.btn1Label}
                  </GhostBtn>
                )
              )}
              {data.btn2Label && (
                data.btn2Style === "primary" ? (
                  <PrimaryBtn to={data.btn2Url || "/"}>
                    {data.btn2Label}
                  </PrimaryBtn>
                ) : (
                  <GhostBtn to={data.btn2Url || "/"}>
                    {data.btn2Label}
                  </GhostBtn>
                )
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Scroll Indicator ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => {
          const el = document.getElementById("trainingsangebot");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Zum Trainingsangebot scrollen"
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

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 · STUDIO PILLARS
// ─────────────────────────────────────────────────────────────────────────────
const PILLARS = [
  {
    key: "strength",
    icon: Dumbbell,
    image: pillarStrengthImg,
    label: "Bodybuilding & Kraft",
    headline: "BUILT FOR BODYBUILDING",
    desc: "Im Nice Athletic Club Göppingen trainierst du an Premium-Equipment von Eleiko, Gymleco, Nautilus, Flex Leverage, Body Masters und vieles mehr – von der Beinpresse bis zum Cable Crossover für maximalen Muskelaufbau.",
    tag: "Bodybuilding · Muskelaufbau · Maschinen",
    cta: "Athletic Area entdecken",
    link: "/athletic-area",
  },
  {
    key: "hiit",
    icon: Flame,
    image: pillarCrossfitImg,
    label: "Funktionelles Training",
    headline: "CROSSFIT GÖPPINGEN",
    desc: "CrossFit Göppingen im Nice Athletic Club: WODs, Olympic Lifting, Sled Pushes, Box Jumps & Kettlebell Swings – funktionelles Ganzkörpertraining für Kraft, Ausdauer und Athletik.",
    tag: "CrossFit · HYROX · Functional Fitness",
    cta: "CrossFit Zone entdecken",
    link: "/crossfit-gp",
  },
  {
    key: "combat",
    icon: Swords,
    image: pillarHyroxImg,
    label: "HYROX Training",
    headline: "HYROX",
    desc: "HYROX im Nice Athletic Club Göppingen: 8 Stationen von SkiErg bis Wall Balls kombiniert mit Laufen – gezieltes Training für Open, Pro, Doubles & Relay.",
    tag: "HYROX · Hybrid Fitness · Wettkampf",
    cta: "HYROX Zone entdecken",
    link: "/hyrox",
  },
  {
    key: "recovery",
    icon: Coffee,
    image: pillarThekeImg,
    label: "Nice Barista Theke",
    headline: "DIE NICE THEKE",
    desc: "Lempresso aus der Siebträgermaschine, Whey Shakes, Protein Bars und mehr – dein Treffpunkt vor und nach dem Training.",
    tag: "Espresso · Whey Shakes · Protein Bars",
    cta: "Studio entdecken",
    link: "/nice-theke",
  },
] as const;

function PillarsSection({ reduced }: { reduced: boolean | null }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const v = makeVariants(reduced);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const gap = 16;
    const idx = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(idx, PILLARS.length - 1));
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const gap = 16;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: "smooth" });
  }, []);

  const PillarCard = ({ pillar, mobile = false }: { pillar: typeof PILLARS[number]; mobile?: boolean }) => {
    const Icon = pillar.icon;
    return (
      <Link
        to={pillar.link || "/kurse"}
        className="group relative flex flex-col overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          height: mobile ? "400px" : "420px",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={pillar.image}
            alt={pillar.label}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            style={{ filter: "brightness(0.7) saturate(0.9)" }}
          />
          <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors duration-700 pointer-events-none" />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-50"
          style={{
            background:
              "linear-gradient(to top, rgba(5,5,5,0.92) 20%, rgba(5,5,5,0.2) 60%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1px rgba(202,12,133,0.45)" }}
        />
        <div className="relative z-10 p-5">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{
              background: "rgba(202,12,133,0.15)",
              border: "1px solid rgba(202,12,133,0.25)",
              transition: "background 0.3s",
            }}
          >
            <Icon size={17} style={{ color: "var(--brand)" }} />
          </div>
        </div>
        <div className="relative z-10 mt-auto p-5">
          <p
            className="text-white/35 mb-2"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {pillar.tag}
          </p>
          <h3
            className="text-white mb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.35rem",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            {pillar.headline}
          </h3>
          <p
            className="text-white/45 leading-relaxed mb-4"
            style={{ fontSize: "13px", fontFamily: "var(--font-sans)" }}
          >
            {pillar.desc}
          </p>
          <span
            className="inline-flex items-center gap-1.5 text-brand group-hover:gap-2.5 transition-all duration-300"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {pillar.cta}
            <ArrowRight size={11} />
          </span>
        </div>
      </Link>
    );
  };

  return (
    <section
      ref={ref}
      id="trainingsangebot"
      className="py-24 md:py-32"
      style={{ backgroundColor: "var(--surface-0)", overflowX: "clip" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mb-14 text-center"
        >
          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Trainingsangebot</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            VIELE ATHLETEN.{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>EIN CLUB.</span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="text-white/40 mt-4 max-w-md mx-auto"
            style={{ fontSize: "0.95rem", fontFamily: "var(--font-sans)" }}
          >
            Heavy Machines. Bodybuilding. Powerlifting. Olympic Weightlifting. CrossFit. HYROX. Alles unter einem Dach – keine Kompromisse, nur Ergebnisse.
          </motion.p>
        </motion.div>

        {/* ── Desktop Grid (sm+) ── */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {PILLARS.map((pillar, i) => (
            <motion.div key={pillar.key} variants={v.fadeUp} custom={i}>
              <PillarCard pillar={pillar} />
            </motion.div>
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
            ref={scrollRef}
            onScroll={handleScroll}
            className="pillar-scroll flex gap-4 overflow-x-auto pb-4 -mx-6 px-6"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`
              .pillar-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            {PILLARS.map((pillar) => (
              <div
                key={pillar.key}
                className="pillar-scroll shrink-0"
                style={{ width: "calc(100vw - 64px)", scrollSnapAlign: "start" }}
              >
                <PillarCard pillar={pillar} mobile />
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          <div className="flex flex-col items-center gap-3 mt-5">
            <div className="flex items-center gap-2">
              {PILLARS.map((pillar, i) => (
                <button
                  key={pillar.key}
                  onClick={() => scrollToCard(i)}
                  aria-label={`Gehe zu ${pillar.label}`}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: activeIndex === i ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: activeIndex === i ? "var(--brand)" : "rgba(255,255,255,0.2)",
                    border: "none",
                    padding: 0,
                    boxShadow: activeIndex === i ? "0 0 12px rgba(202,12,133,0.4)" : "none",
                    minWidth: 0,
                    minHeight: 0,
                  }}
                />
              ))}
            </div>
            <p
              className="text-white/20"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em" }}
            >
              SWIPE →
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 · TRUST / SOCIAL PROOF + CTA
// ─────────────────────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Users, value: "1.500+", label: "qm Trainingsfläche" },
  { icon: Star,  value: "4,9/5",  label: "Google · 84 Rezensionen" },
];

const REVIEWS_PER_PAGE = 9;

function TrustSection({ reduced }: { reduced: boolean | null }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const v = makeVariants(reduced);
  const [reviews, setReviews] = useState<GoogleReview[]>(MOCK_REVIEWS.filter(r => r.visible));
  const [currentPage, setCurrentPage] = useState(1);
  const reviewScrollRef = useRef<HTMLDivElement>(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  useEffect(() => {
    api.public.reviews()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data.filter((r: GoogleReview) => r.visible));
        }
      })
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById("google-reviews");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const mobileReviews = reviews.slice(0, 6);

  const handleReviewScroll = useCallback(() => {
    const el = reviewScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const gap = 12;
    const idx = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveReviewIndex(Math.min(idx, mobileReviews.length - 1));
  }, [mobileReviews.length]);

  const scrollToReview = useCallback((index: number) => {
    const el = reviewScrollRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = (el.firstElementChild as HTMLElement).offsetWidth;
    const gap = 12;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: "smooth" });
  }, []);

  const ReviewCard = ({ review, compact = false }: { review: GoogleReview; compact?: boolean }) => (
    <blockquote
      className="flex flex-col gap-4"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
        padding: compact ? "20px" : "28px",
        height: "100%",
      }}
    >
      <div className="flex gap-1" aria-label={`${review.rating} von 5 Sterne`}>
        {[...Array(review.rating)].map((_, j) => (
          <Star key={j} size={11} style={{ color: "#FBBC05", fill: "#FBBC05" }} />
        ))}
      </div>
      <p
        className="flex-1 leading-relaxed"
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: compact ? "13px" : "14px",
          fontFamily: "var(--font-sans)",
          display: "-webkit-box",
          WebkitLineClamp: compact ? 4 : 5,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        &bdquo;{review.text}&rdquo;
      </p>
      <footer className="flex items-center gap-3">
        <div
          className="w-7 h-7 flex items-center justify-center shrink-0"
          style={{
            background: "rgba(202,12,133,0.15)",
            border: "1px solid rgba(202,12,133,0.25)",
            borderRadius: "50%",
          }}
        >
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, color: "var(--brand)" }}>
            {review.author.charAt(0)}
          </span>
        </div>
        <div className="flex flex-col gap-0">
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "white" }}>
            {review.author}
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
            Google-Rezension
          </span>
        </div>
      </footer>
    </blockquote>
  );

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ backgroundColor: "var(--surface-0)", overflowX: "clip" }}
    >
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse at top right, rgba(202,12,133,0.12), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(202,12,133,1) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Trust Numbers */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-2 gap-6 mb-20 max-w-2xl mx-auto"
        >
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                variants={v.fadeUp}
                custom={i}
                className="flex flex-col items-center text-center gap-2"
              >
                <div
                  className="w-10 h-10 flex items-center justify-center mb-1"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <Icon size={16} style={{ color: "var(--brand)" }} />
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem, 5vw, 3rem)",
                    color: "white",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {item.value}
                </span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", letterSpacing: "0.08em", fontFamily: "var(--font-condensed)" }}>
                  {item.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mb-20"
          id="google-reviews"
        >
          <motion.div
            variants={v.fadeUp}
            custom={0}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#34A853" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.09 24.09 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span
              style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)" }}
            >
              ECHTE GOOGLE-REZENSIONEN
            </span>
          </motion.div>

          {/* Desktop Reviews Grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ gridAutoRows: "1fr" }}>
            {paginatedReviews.map((t, i) => (
              <motion.div key={t.id} variants={v.fadeUp} custom={i}>
                <ReviewCard review={t} />
              </motion.div>
            ))}
          </div>

          {/* Mobile Reviews Swipe Carousel */}
          <div className="md:hidden">
            <div
              ref={reviewScrollRef}
              onScroll={handleReviewScroll}
              className="review-scroll flex gap-3 overflow-x-auto pb-3 -mx-6 px-6"
              style={{
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style>{`
                .review-scroll::-webkit-scrollbar { display: none; }
              `}</style>
              {mobileReviews.map((review) => (
                <div
                  key={review.id}
                  className="shrink-0"
                  style={{ width: "calc(85vw - 24px)", scrollSnapAlign: "start" }}
                >
                  <ReviewCard review={review} compact />
                </div>
              ))}
              <div className="shrink-0 w-4" aria-hidden="true" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4">
              {mobileReviews.map((review, i) => (
                <button
                  key={review.id}
                  onClick={() => scrollToReview(i)}
                  aria-label={`Rezension ${i + 1}`}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: activeReviewIndex === i ? "20px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    background: activeReviewIndex === i ? "var(--brand)" : "rgba(255,255,255,0.2)",
                    border: "none",
                    padding: 0,
                    boxShadow: activeReviewIndex === i ? "0 0 10px rgba(202,12,133,0.4)" : "none",
                    minWidth: 0,
                    minHeight: 0,
                  }}
                />
              ))}
            </div>

            <div className="flex justify-center mt-4">
              <a
                href="https://www.google.com/maps/place/Nice+Athletic+Club/@48.6969415,9.6547316,17z/data=!4m8!3m7!1s0x4799a37f7dd62945:0x811c6f8c1382f790!8m2!3d48.696938!4d9.6573065!9m1!1b1!16s%2Fg%2F11jn5m7tlc?entry=ttu&g_ep=EgoyMDI2MDMxMS4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand transition-all duration-300"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textDecoration: "none" }}
              >
                ALLE BEWERTUNGEN AUF GOOGLE
                <ArrowRight size={11} />
              </a>
            </div>
          </div>

          {/* Desktop Pagination */}
          {totalPages > 1 && (
            <motion.div
              variants={v.fadeUp}
              custom={0}
              className="hidden md:flex items-center justify-center gap-2 mt-8"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className="flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-[0.95]"
                  style={{
                    width: "44px",
                    height: "44px",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: currentPage === page ? "white" : "rgba(255,255,255,0.35)",
                    background: currentPage === page ? "var(--brand)" : "rgba(255,255,255,0.04)",
                    border: currentPage === page
                      ? "1px solid rgba(202,12,133,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: currentPage === page ? "0 0 20px rgba(202,12,133,0.3)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                    }
                  }}
                >
                  {page}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Final CTA Band */}
        <motion.div
          id="cta-band"
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative flex flex-col items-center text-center py-16 px-6 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(202,12,133,0.1) 0%, rgba(202,12,133,0.03) 100%)",
            border: "1px solid rgba(202,12,133,0.2)",
          }}
        >
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: "var(--brand)" }} />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: "var(--brand)" }} />

          <motion.div variants={v.fadeUp} custom={0}>
            <Label>Community</Label>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            JOIN THE{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>MOVEMENT</span>
          </motion.h2>
          <motion.p
            variants={v.fadeUp}
            custom={2}
            className="max-w-md mb-10"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", lineHeight: 1.7, fontFamily: "var(--font-sans)" }}
          >
            Über 1.000 aktive Mitglieder. 10 zertifizierte Trainer. Ein gemeinsames Ziel:
            das Beste aus sich herausholen. Bist du bereit?
          </motion.p>
          <motion.div
            variants={v.fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4"
          >
            <PrimaryBtn to="/kontakt">Probetraining</PrimaryBtn>
            <GhostBtn to="/team">Unser Team kennenlernen</GhostBtn>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const reduced = useReducedMotion();
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // ── CMS: load page blocks (API → localStorage → seed) ──────────────────────
  const [blocks, setBlocks] = useState<PageBlock[]>(() => {
    // Instant load from localStorage so there's no flash of seed content
    try {
      const saved = localStorage.getItem("nac_blocks_home");
      if (saved) {
        const parsed = JSON.parse(saved) as PageBlock[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return PAGE_INITIAL_BLOCKS["home"];
  });

  useEffect(() => {
    fetchHomeBlocks().then((fetched) => {
      if (fetched.length > 0) setBlocks(fetched);
    });
  }, []);

  // Live-Sync: Wenn Admin im PageEditor speichert → sofort neu laden
  useEffect(() => {
    const onAdminSave = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === "home") fetchHomeBlocks().then(setBlocks);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nac_blocks_home" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PageBlock[];
          if (Array.isArray(parsed)) setBlocks(parsed);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("nac-page-updated", onAdminSave);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("nac-page-updated", onAdminSave);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // First hero block data – used by HeroSection
  const heroBlock = blocks.find((b) => b.type === "hero");
  const heroData = (heroBlock?.data ?? PAGE_INITIAL_BLOCKS["home"][0].data) as HeroBlockData;

  // Mobile nav state
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setNavOpen(detail.open);
    };
    window.addEventListener("navtoggle", handler);
    return () => window.removeEventListener("navtoggle", handler);
  }, []);

  // Sticky CTA visibility observers
  useEffect(() => {
    let heroObserver: IntersectionObserver | null = null;
    let footerObserver: IntersectionObserver | null = null;
    let rafId: number;

    const setup = () => {
      rafId = requestAnimationFrame(() => {
        const heroEl = document.getElementById("hero-section");
        const footerEl = document.getElementById("site-footer");

        if (heroEl) {
          heroObserver = new IntersectionObserver(
            ([entry]) => setShowMobileCTA(!entry.isIntersecting),
            { threshold: 0.3 }
          );
          heroObserver.observe(heroEl);
        }

        if (footerEl) {
          footerObserver = new IntersectionObserver(
            ([entry]) => setFooterVisible(entry.isIntersecting),
            { threshold: 0 }
          );
          footerObserver.observe(footerEl);
        }

        if (!footerEl) {
          setTimeout(() => {
            const retryFooter = document.getElementById("site-footer");
            if (retryFooter) {
              footerObserver = new IntersectionObserver(
                ([entry]) => setFooterVisible(entry.isIntersecting),
                { threshold: 0 }
              );
              footerObserver.observe(retryFooter);
            }
          }, 500);
        }
      });
    };

    setup();
    return () => {
      cancelAnimationFrame(rafId);
      heroObserver?.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  const showTicket = showMobileCTA && !footerVisible && !navOpen;

  useEffect(() => {
    if (showTicket) {
      document.body.dataset.mobileStickyCtaVisible = "true";
    } else {
      delete document.body.dataset.mobileStickyCtaVisible;
    }
    window.dispatchEvent(new Event("mobile-cta-change"));
    return () => {
      delete document.body.dataset.mobileStickyCtaVisible;
      window.dispatchEvent(new Event("mobile-cta-change"));
    };
  }, [showTicket]);

  return (
    <>
      <PageMeta
        title="Premium Fitness in Göppingen"
        description="Nice Athletic Club – Premium Fitness in Göppingen. Strength, HIIT, Combat, Recovery & Personal Training. Jetzt kostenloses Probetraining buchen."
        canonical="https://niceathleticclub.de"
      />
      <main>
        {/* Hero – driven by CMS blocks */}
        <HeroSection data={heroData} reduced={reduced} />
        {/* Static pillars – not yet block-driven */}
        <PillarsSection reduced={reduced} />
        {/* Trust / Reviews */}
        <TrustSection reduced={reduced} />
      </main>

      {/* ── Sticky Mobile CTA (Tagesticket) ── */}
      <motion.div
        initial={false}
        animate={{ y: showTicket ? 0 : 100, opacity: showTicket ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
        style={{ pointerEvents: showTicket ? "auto" : "none" }}
      >
        <div
          className="h-6 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(5,5,5,0.95))" }}
        />
        <div
          className="px-4 pb-5 pt-1"
          style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(12px)" }}
        >
          <a
            href="https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full text-white active:scale-[0.98] transition-transform"
            style={{
              background: "var(--brand)",
              fontFamily: "var(--font-condensed)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              border: "none",
              height: "52px",
              boxShadow: "0 0 30px rgba(202,12,133,0.35)",
            }}
          >
            <Ticket size={16} />
            TAGESTICKET BUCHEN
          </a>
        </div>
      </motion.div>
    </>
  );
}
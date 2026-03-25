/**
 * Shared building blocks for legal/content pages
 * (Impressum, Datenschutz, AGB, Kontakt)
 */
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import { ChevronRight, ChevronDown, ArrowRight } from "lucide-react";

// ── Scan-line animation ────────────────────────────────────────────────────────
export function ScanLine() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
      style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.7), transparent)" }}
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: ["0%", "100%", "100%"], opacity: [0, 1, 0] }}
      transition={{ duration: 3.5, ease: "easeInOut", delay: 0.4, repeat: Infinity, repeatDelay: 6 }}
    />
  );
}

// ── Floating particle dot ──────────────────────────────────────────────────────
export function Particle({ x, y, delay }: { x: string; y: string; delay: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full pointer-events-none"
      style={{ left: x, top: y, background: "rgba(202,12,133,0.55)" }}
      animate={reduced ? {} : { opacity: [0.2, 0.8, 0.2], scale: [1, 1.4, 1] }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Generic section card ───────────────────────────────────────────────────────
interface SectionCardProps {
  id: string;
  num: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  reduced?: boolean | null;
  onView?: (id: string) => void;
}

export function SectionCard({
  id, num, title, icon: Icon, children, reduced, onView,
}: SectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40% 0px -40% 0px", once: false });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (inView && onView) onView(id);
  }, [inView, id, onView]);

  return (
    <motion.div
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: reduced ? 0 : 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden"
      style={{
        background: hovered
          ? "linear-gradient(135deg, rgba(202,12,133,0.06) 0%, rgba(17,17,17,0.98) 60%)"
          : "var(--surface-2)",
        border: hovered ? "1px solid rgba(202,12,133,0.35)" : "1px solid rgba(255,255,255,0.06)",
        transition: "background 0.4s ease, border-color 0.35s ease, box-shadow 0.35s ease",
        boxShadow: hovered
          ? "0 0 40px rgba(202,12,133,0.12), inset 0 1px 0 rgba(202,12,133,0.15)"
          : "none",
      }}
    >
      {/* Top accent line */}
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.3))" }}
      />

      {/* Background number watermark */}
      <div
        className="absolute right-6 top-1/2 -translate-y-1/2 select-none pointer-events-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(5rem, 10vw, 8rem)",
          color: hovered ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.025)",
          lineHeight: 1,
          transition: "color 0.4s ease",
        }}
      >
        {num}
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{
              background: hovered ? "rgba(202,12,133,0.18)" : "rgba(202,12,133,0.08)",
              border: hovered ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(202,12,133,0.15)",
              transition: "background 0.3s, border-color 0.3s",
            }}
          >
            <Icon size={16} style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <span
              className="text-white/25 block"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em" }}
            >
              {num}
            </span>
            <h2
              className="text-white"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.04em", lineHeight: 1.15 }}
            >
              {title}
            </h2>
          </div>
        </div>
        <div className="text-white/60 text-sm leading-relaxed space-y-3 pl-14">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick-nav sidebar ──────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: React.ElementType }

export function QuickNav({ items, active }: { items: NavItem[]; active: string }) {
  return (
    <nav className="space-y-0.5">
      <p
        className="text-white/25 mb-3 px-3"
        style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em" }}
      >
        INHALT
      </p>
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-2.5 px-3 py-2 transition-all duration-200"
            style={{
              background: isActive ? "rgba(202,12,133,0.1)" : "transparent",
              borderLeft: isActive ? "2px solid #CA0C85" : "2px solid transparent",
            }}
          >
            <Icon
              size={12}
              style={{ color: isActive ? "var(--brand)" : "rgba(255,255,255,0.3)", flexShrink: 0, transition: "color 0.2s" }}
            />
            <span
              className="truncate"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.05em",
                color: isActive ? "white" : "rgba(255,255,255,0.4)",
                transition: "color 0.2s",
              }}
            >
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

// ── Page hero wrapper ──────────────────────────────────────────────────────────
interface PageHeroProps {
  ghostText: string;
  label: string;
  titleA: string;
  titleB: string;   // coloured part
  subtitle: string;
  badges: { label: string; val: string }[];
  backTo?: string;
  backLabel?: string;
  heroRef?: React.RefObject<HTMLElement | null>;
  ghostY?: ReturnType<typeof import("motion/react").useTransform>;
  backSlot?: React.ReactNode;
  /** Mobile CTA – if provided, shows a full-width button */
  mobileCta?: { label: string; to: string };
  /** Breadcrumb label shown on mobile (e.g. "KARRIERE") */
  mobileTitle?: string;
}

export function PageHero({
  ghostText, label, titleA, titleB, subtitle,
  badges, heroRef, ghostY, backSlot, mobileCta, mobileTitle,
}: PageHeroProps) {
  const reduced = useReducedMotion();
  const breadcrumbTitle = mobileTitle || ghostText;

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP HERO (sm+) — original unchanged
      ══════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef as React.RefObject<HTMLElement>}
        className="pt-32 pb-16 overflow-hidden hidden sm:block"
        style={{ backgroundColor: "var(--surface-0)", minHeight: "340px", position: "relative" }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glows */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(202,12,133,0.12) 0%, transparent 65%)" }} />
        <div className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(202,12,133,0.08) 0%, transparent 70%)" }} />

        {/* Particles */}
        <Particle x="12%" y="25%" delay={0}   />
        <Particle x="27%" y="70%" delay={1.1} />
        <Particle x="55%" y="15%" delay={0.7} />
        <Particle x="72%" y="80%" delay={1.8} />
        <Particle x="88%" y="35%" delay={0.4} />

        <ScanLine />

        {/* Ghost text */}
        <motion.div
          style={ghostY ? { y: ghostY } : undefined}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4rem, 22vw, 20rem)",
            color: "rgba(255,255,255,0.018)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}>
            {ghostText}
          </span>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 relative">
          {backSlot && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10"
            >
              {backSlot}
            </motion.div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 mb-4"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
                {label}
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
              </div>
              <h1 style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", fontFamily: "var(--font-display)", color: "white", lineHeight: 0.95 }}>
                {titleA}<span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{titleB}</span>
              </h1>
              <p className="mt-4 text-white/40 text-sm max-w-md leading-relaxed">{subtitle}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-4 shrink-0"
            >
              {badges.map(({ label: bl, val }) => (
                <div key={bl}
                  className="flex flex-col items-center justify-center w-20 h-20"
                  style={{ border: "1px solid rgba(202,12,133,0.2)", background: "rgba(202,12,133,0.04)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--brand)", lineHeight: 1 }}>{val}</span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.13em", color: "rgba(255,255,255,0.3)", marginTop: "4px", textAlign: "center" }}>{bl}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 h-px origin-left"
            style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.1), transparent)" }}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE HERO (< sm) — full-screen immersive
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
        style={{ backgroundColor: "#050505" }}
      >
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {/* Bottom gradient */}
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
            {/* Breadcrumb */}
            <nav
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
              <span className="text-white/60">{breadcrumbTitle.toUpperCase()}</span>
            </nav>

            {/* Label */}
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
              {label}
              <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
            </div>

            {/* Title */}
            <h1
              className="text-white mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3.2rem, 15vw, 5rem)",
                lineHeight: 0.9,
                letterSpacing: "0.02em",
              }}
            >
              {titleA}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                {titleB}
              </span>
            </h1>

            <p
              className="text-white/40 leading-relaxed mb-6 max-w-xs"
              style={{ fontSize: "0.85rem" }}
            >
              {subtitle}
            </p>

            {/* Stats */}
            <div className={`grid gap-2 mb-6`} style={{ gridTemplateColumns: `repeat(${Math.min(badges.length, 3)}, 1fr)` }}>
              {badges.map(({ label: bl, val }) => (
                <div
                  key={bl}
                  className="text-center py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="text-white block"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.2rem",
                      lineHeight: 1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {val}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "8px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {bl}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile CTA */}
            {mobileCta && (
              <Link
                to={mobileCta.to}
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  minHeight: "52px",
                }}
              >
                {mobileCta.label}
                <ArrowRight size={16} />
              </Link>
            )}
          </motion.div>

          {/* Scroll indicator */}
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
    </>
  );
}
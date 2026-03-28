/**
 * EgymWellpass.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Block-getriebene EGYM-Wellpass-Landingpage.
 *
 * Architektur:
 *  • fetchWellpassBlocks() → PHP-API → localStorage → PAGE_INITIAL_BLOCKS
 *  • Beim Speichern im Admin/PageEditor schreibt der Editor in localStorage
 *    + feuert CustomEvent "nac-page-updated" für Live-Sync im selben Tab
 *  • Jeder Block-Typ hat einen eigenen vollwertigen Section-Renderer
 */

import React from "react";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  Dumbbell,
  Award,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Target,
  Shield,
  Briefcase,
  List,
  Mail,
  Phone,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BASE_URL } from "../../lib/api-service";
import {
  PAGE_INITIAL_BLOCKS,
  type PageBlock,
  type HeroBlockData,
  type StatsBlockData,
  type FeaturesListBlockData,
  type ValuesGridBlockData,
  type TrustBadgesBlockData,
  type FaqBlockData,
  type LocationMapBlockData,
  type CtaBlockData,
  type RichTextBlockData,
} from "../../data/blocks";

// ── Decorative fallback images ────────────────────────────────────────────────
const IMG_HERO =
  "https://images.unsplash.com/photo-1768039376161-2e7307d470d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_SIDE =
  "https://images.unsplash.com/photo-1769867626227-7d8c4838d8dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_EMPLOYER =
  "https://images.unsplash.com/photo-1758611972613-3afe657c3249?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";
const IMG_FACILITY =
  "https://images.unsplash.com/photo-1545612036-2872840642dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080";

// ── localStorage key ──────────────────────────────────────────────────────────
const LS_KEY = "nac_blocks_egym-wellpass";

// ── Fetch blocks: API → localStorage → seed ──────────────────────────────────
async function fetchWellpassBlocks(): Promise<PageBlock[]> {
  // 1. Try PHP API
  try {
    const res = await fetch(`${BASE_URL}/pages.php?slug=egym-wellpass`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.blocks) && json.blocks.length > 0) {
        return json.blocks as PageBlock[];
      }
    }
  } catch { /* fall through */ }
  // 2. Try localStorage (admin edits in PageEditor)
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PageBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // 3. Seed data
  return PAGE_INITIAL_BLOCKS["egym-wellpass"] ?? [];
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Users, Star, Dumbbell, Award, Clock, TrendingUp, Heart, Zap, Target, Shield,
  MapPin, Mail, Phone, Briefcase, List, CheckCircle2, ArrowRight, ChevronRight,
  Globe: Shield,       // fallback
  Smartphone: Zap,     // fallback
  Building2: Briefcase, // fallback
};
function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  const Comp = ICONS[name] ?? Zap;
  return <Comp size={size} style={style} />;
}

// ── Shared animation ──────────────────────────────────────────────────────────
const makeV = (reduced: boolean | null) => ({
  fadeUp: {
    hidden: { opacity: 0, y: reduced ? 0 : 28 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  stagger: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09 } },
  },
});

// ── Shared UI pieces ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-5" style={{
      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)",
    }}>
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
      {children}
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
    </div>
  );
}

function PrimaryBtn({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    padding: "14px 28px", background: "var(--brand)", color: "white",
    minHeight: "48px", transition: "transform 0.2s, box-shadow 0.2s",
    textDecoration: "none",
  };
  const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 0 24px rgba(202,12,133,0.4)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{label} <ArrowRight size={14} /></a>;
  }
  return <Link to={href} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{label} <ArrowRight size={14} /></Link>;
}

function GhostBtn({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    padding: "14px 28px", background: "transparent", color: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.15)", minHeight: "48px",
    transition: "border-color 0.2s, color 0.2s", textDecoration: "none",
  };
  const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "white";
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)";
  };
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{label}</a>;
  }
  return <Link to={href} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{label}</Link>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection({ data, reduced }: { data: HeroBlockData; reduced: boolean | null }) {
  const v = makeV(reduced);
  const bgImg = data.mediaUrl || IMG_HERO;
  const hl1n = data.headlineLine1Normal;
  const hl1o = data.headlineLine1Outline;
  const hl2n = data.headlineLine2Normal;
  const hl2o = data.headlineLine2Outline;

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden hidden sm:block" style={{ paddingTop: "144px", paddingBottom: "80px" }}>
        <div className="absolute top-0 right-0 w-[700px] h-[600px] pointer-events-none" aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at top right, rgba(202,12,133,0.13), transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] pointer-events-none" aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(202,12,133,0.06), transparent 65%)" }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={v.stagger} initial="hidden" animate="visible">
              <motion.div variants={v.fadeUp} custom={0}>
                <SectionLabel>{data.label || "EGYM Wellpass Partner"}</SectionLabel>
              </motion.div>
              <motion.h1 variants={v.fadeUp} custom={1} className="text-white mb-4" style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
                letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.93,
              }}>
                {hl1n && <>{hl1n} </>}
                {hl1o && <span style={{ color: "var(--brand)" }}>{hl1o}</span>}
                {(hl1n || hl1o) && <br />}
                {hl2n && <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{hl2n} </span>}
                {hl2o && <>{hl2o}</>}
              </motion.h1>
              <motion.p variants={v.fadeUp} custom={2} className="max-w-lg leading-relaxed mb-6"
                style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)" }}>
                {data.subtitle}
              </motion.p>
              <motion.div variants={v.fadeUp} custom={3} className="flex flex-wrap gap-3 mb-8">
                {[
                  { text: "Offizieller Wellpass-Partner" },
                  { text: "Kein Zusatzvertrag" },
                  { text: "Check-in per App" },
                ].map(({ text }) => (
                  <div key={text} className="inline-flex items-center gap-2 px-3 py-2" style={{
                    background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.2)",
                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)",
                  }}>
                    <CheckCircle2 size={11} style={{ color: "var(--brand)" }} />
                    {text}
                  </div>
                ))}
              </motion.div>
              <motion.div variants={v.fadeUp} custom={4} className="flex flex-wrap gap-4">
                {data.btn1Label && (data.btn1Style === "primary"
                  ? <PrimaryBtn label={data.btn1Label} href={data.btn1Url} external={data.btn1Url?.startsWith("http")} />
                  : <GhostBtn   label={data.btn1Label} href={data.btn1Url} external={data.btn1Url?.startsWith("http")} />
                )}
                {data.btn2Label && (data.btn2Style === "primary"
                  ? <PrimaryBtn label={data.btn2Label} href={data.btn2Url} external={data.btn2Url?.startsWith("http")} />
                  : <GhostBtn   label={data.btn2Label} href={data.btn2Url} external={data.btn2Url?.startsWith("http")} />
                )}
              </motion.div>
            </motion.div>

            {/* Image */}
            <motion.div initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }} className="relative">
              <div className="relative overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <ImageWithFallback src={bgImg} alt="EGYM Wellpass Training im Nice Athletic Club"
                  className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(5,5,5,0.55) 0%, transparent 50%)" }} />
              </div>
              <div className="absolute top-4 right-4 inline-flex items-center gap-2 px-4 py-2" style={{
                background: "rgba(5,5,5,0.85)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(202,12,133,0.35)", fontFamily: "var(--font-condensed)",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "var(--brand)",
              }}>
                <Star size={11} fill="currentColor" /> Offizieller Partner
              </div>
              <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2" style={{
                background: "rgba(5,5,5,0.85)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-condensed)",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
              }}>
                <MapPin size={11} style={{ color: "var(--brand)" }} /> Göppingen, Baden-Württemberg
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Mobile ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-end overflow-hidden sm:hidden" style={{ backgroundColor: "#050505" }}>
        <div className="absolute inset-0 pointer-events-none">
          <ImageWithFallback src={bgImg} alt="" className="w-full h-full object-cover opacity-20" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #050505 55%, rgba(5,5,5,0.4) 100%)" }} />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />

        <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
          <motion.div initial={{ opacity: 0, y: reduced ? 0 : 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <nav className="flex items-center gap-1.5 mb-4 text-white/40"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}>
              <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
              <ChevronRight size={11} />
              <span className="text-white/60">EGYM WELLPASS</span>
            </nav>
            <SectionLabel>{data.label || "EGYM Wellpass Partner"}</SectionLabel>
            <h1 className="text-white mb-4" style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem, 11vw, 3.6rem)",
              lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase",
            }}>
              {hl1n && <>{hl1n} </>}
              {hl1o && <span style={{ color: "var(--brand)" }}>{hl1o}</span>}
              {(hl1n || hl1o) && " "}
              {hl2n && <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{hl2n} </span>}
              {hl2o && hl2o}
            </h1>
            <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
              {data.subtitle}
            </p>
            {data.btn1Label && (
              <a href={data.btn1Url} target={data.btn1Url?.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300 mb-3"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}>
                {data.btn1Label} <ArrowRight size={16} />
              </a>
            )}
            {data.btn2Label && (
              <Link to={data.btn2Url}
                className="flex items-center justify-center gap-3 w-full active:scale-[0.98] transition-all duration-300"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "48px" }}>
                {data.btn2Label}
              </Link>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-6">
            <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <ChevronDown size={18} className="text-white/20" />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

// ── Stats Section ─────────────────────────────────────────────────────────────
function StatsSection({ data }: { data: StatsBlockData }) {
  const count = Math.min(data.count ?? 4, 6);
  const items = Array.from({ length: count }, (_, i) => ({
    icon: (data as Record<string, unknown>)[`item${i + 1}Icon`] as string,
    value: (data as Record<string, unknown>)[`item${i + 1}Value`] as string,
    label: (data as Record<string, unknown>)[`item${i + 1}Label`] as string,
  })).filter((s) => s.value);

  return (
    <section className="relative" style={{
      paddingTop: "48px", paddingBottom: "48px",
      background: "rgba(255,255,255,0.02)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className={`grid gap-6 ${items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {items.map(({ icon, value, label }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-2">
                <Icon name={icon} size={18} style={{ color: "var(--brand)" }} />
              </div>
              <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                {value}
              </span>
              <span className="block mt-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features List Section ─────────────────────────────────────────────────────
function FeaturesSection({ data, imageAlt, imageSrc }: { data: FeaturesListBlockData; imageAlt?: string; imageSrc?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const features = data.features ?? [];

  return (
    <section ref={ref} className="relative" style={{ paddingTop: "96px", paddingBottom: "96px" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-14">
          <motion.div variants={v.fadeUp} custom={0}><SectionLabel>{data.heading}</SectionLabel></motion.div>
          {data.subtitle && (
            <motion.p variants={v.fadeUp} custom={1} className="max-w-2xl mx-auto" style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              {data.subtitle}
            </motion.p>
          )}
        </motion.div>

        {imageSrc && (
          <motion.div variants={v.fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"}
            custom={0} className="relative overflow-hidden mb-12 hidden lg:block"
            style={{ border: "1px solid rgba(255,255,255,0.07)", maxHeight: "320px" }}>
            <ImageWithFallback src={imageSrc} alt={imageAlt ?? ""} className="w-full object-cover" style={{ maxHeight: "320px" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, transparent 50%, rgba(5,5,5,0.9) 100%)" }} />
          </motion.div>
        )}

        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}
          className={`grid gap-5 ${features.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {features.map(({ icon, title, description }, i) => (
            <motion.div key={title} variants={v.fadeUp} custom={i} className="p-6 transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}>
              <div className="flex items-center justify-center mb-4" style={{
                width: "44px", height: "44px", background: "rgba(202,12,133,0.1)",
                border: "1px solid rgba(202,12,133,0.2)",
              }}>
                <Icon name={icon} size={20} style={{ color: "var(--brand)" }} />
              </div>
              <h3 className="text-white mb-2" style={{ fontFamily: "var(--font-condensed)", fontSize: "13.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {title}
              </h3>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Values Grid (Steps) Section ───────────────────────────────────────────────
function StepsSection({ data }: { data: ValuesGridBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const values = data.values ?? [];

  return (
    <section ref={ref} className="relative" style={{
      paddingTop: "80px", paddingBottom: "96px",
      background: "rgba(255,255,255,0.015)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-14">
          <motion.div variants={v.fadeUp} custom={0}><SectionLabel>So einfach geht's</SectionLabel></motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white mb-4" style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
            letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95,
          }}>
            {data.heading?.split(" ").slice(0, 3).join(" ")}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              {data.heading?.split(" ").slice(3).join(" ")}
            </span>
          </motion.h2>
          {data.subtitle && (
            <motion.p variants={v.fadeUp} custom={2} className="max-w-xl mx-auto" style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              {data.subtitle}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map(({ icon, title, description }, i) => (
            <motion.div key={title} variants={v.fadeUp} custom={i} className="relative p-6 transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              {/* Step ghost number */}
              <div className="absolute top-4 right-5 pointer-events-none select-none" style={{
                fontFamily: "var(--font-display)", fontSize: "3.5rem", lineHeight: 1,
                color: "rgba(202,12,133,0.07)", letterSpacing: "0.02em",
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex items-center justify-center mb-5" style={{
                width: "44px", height: "44px", background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)",
              }}>
                <Icon name={icon} size={20} style={{ color: "var(--brand)" }} />
              </div>
              <h3 className="text-white mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {title}
              </h3>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Trust Badges / Kontingente Section ───────────────────────────────────────���
function PlansSection({ data }: { data: TrustBadgesBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const badges = data.badges ?? [];

  return (
    <section ref={ref} className="relative" style={{ paddingTop: "80px", paddingBottom: "96px" }}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-12">
          <motion.div variants={v.fadeUp} custom={0}><SectionLabel>Wellpass Kontingente</SectionLabel></motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white mb-4" style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4.5vw, 3rem)",
            letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95,
          }}>
            {data.heading || "WAS BEKOMMST DU"}{" "}
            <span style={{ color: "var(--brand)" }}>BEI UNS?</span>
          </motion.h2>
          <motion.p variants={v.fadeUp} custom={2} className="max-w-xl mx-auto" style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            EGYM Wellpass bietet Kontingentstufen S bis XL. Je nach Stufe variieren Besuche und Leistungen.
          </motion.p>
        </motion.div>

        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map(({ icon, text }, i) => {
            const isHighlight = i === 2; // Wellpass L is recommended
            // Parse "Wellpass X – Visits – Description" format
            const parts = text.split("–").map((s) => s.trim());
            const name = parts[0] ?? text;
            const visits = parts[1] ?? "";
            const desc = parts[2] ?? "";

            return (
              <motion.div key={text} variants={v.fadeUp} custom={i} className="p-5 relative transition-all duration-300"
                style={{
                  background: isHighlight ? "rgba(202,12,133,0.07)" : "rgba(255,255,255,0.025)",
                  border: isHighlight ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: isHighlight ? "0 0 30px rgba(202,12,133,0.1)" : "none",
                }}>
                {isHighlight && (
                  <>
                    <div className="absolute -top-px left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, var(--brand), transparent)" }} />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1" style={{
                      background: "var(--brand)", fontFamily: "var(--font-condensed)",
                      fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "white", whiteSpace: "nowrap",
                    }}>Empfohlen</div>
                  </>
                )}
                <div className="flex items-center justify-center mb-3" style={{
                  width: "40px", height: "40px", background: isHighlight ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isHighlight ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  <Icon name={icon} size={18} style={{ color: isHighlight ? "var(--brand)" : "rgba(255,255,255,0.4)" }} />
                </div>
                <h3 className="text-white mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {name}
                </h3>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: isHighlight ? "var(--brand)" : "rgba(255,255,255,0.35)", marginBottom: "10px" }}>
                  {visits}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
                  {desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
        <motion.p variants={v.fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} custom={5}
          className="text-center mt-6" style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
          * Kontingentstufen und Preise werden von EGYM Wellpass festgelegt. Maßgeblich sind die Angaben in der EGYM Wellpass App.
        </motion.p>
      </div>
    </section>
  );
}

// ── Rich Text Section ─────────────────────────────────────────────────────────
function RichTextSection({ data }: { data: RichTextBlockData }) {
  return (
    <section className="relative" style={{ paddingTop: "64px", paddingBottom: "64px" }}>
      <div className="max-w-3xl mx-auto px-6" style={{ textAlign: data.centered ? "center" : "left" }}>
        {data.heading && (
          <h2 className="text-white mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1 }}>
            {data.heading}
          </h2>
        )}
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
          {data.content}
        </p>
      </div>
    </section>
  );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────
function FaqSection({ data }: { data: FaqBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const questions = data.questions ?? [];

  return (
    <section ref={ref} className="relative" style={{
      paddingTop: "80px", paddingBottom: "96px",
      background: "rgba(255,255,255,0.015)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div className="max-w-3xl mx-auto px-6">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mb-12">
          <motion.div variants={v.fadeUp} custom={0}><SectionLabel>Häufige Fragen</SectionLabel></motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white mb-4" style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4.5vw, 3rem)",
            letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95,
          }}>
            {(data.heading ?? "Wellpass FAQ").split("–")[0].trim()}
            {(data.heading ?? "").includes("–") && (
              <> – <span style={{ color: "var(--brand)" }}>{(data.heading ?? "").split("–")[1]?.trim()}</span></>
            )}
          </motion.h2>
        </motion.div>

        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className="space-y-2">
          {questions.map(({ question, answer }, i) => {
            const isOpen = openIdx === i;
            return (
              <motion.div key={i} variants={v.fadeUp} custom={i}>
                <button onClick={() => setOpenIdx(isOpen ? null : i)} aria-expanded={isOpen}
                  className="w-full text-left flex items-start gap-4 p-5 transition-all duration-200"
                  style={{
                    background: isOpen ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.025)",
                    border: isOpen ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)", flexShrink: 0, marginTop: "2px", minWidth: "24px" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isOpen ? "white" : "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                    {question}
                  </span>
                  <span style={{ color: isOpen ? "var(--brand)" : "rgba(255,255,255,0.3)", flexShrink: 0, transition: "color 0.2s" }}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}>
                      <div className="px-5 pb-5 pt-3" style={{
                        background: "rgba(202,12,133,0.03)",
                        borderLeft: "1px solid rgba(202,12,133,0.2)", borderRight: "1px solid rgba(202,12,133,0.2)",
                        borderBottom: "1px solid rgba(202,12,133,0.2)",
                      }}>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, paddingLeft: "40px" }}>
                          {answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ── Location / Contact Section ────────────────────────────────────────────────
function LocationSection({ data }: { data: LocationMapBlockData }) {
  return (
    <section className="relative" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="p-8 lg:p-12 grid lg:grid-cols-3 gap-8 items-center" style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div className="lg:col-span-2">
            <SectionLabel>Dein Wellpass-Studio</SectionLabel>
            <h2 className="text-white mb-5" style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)",
              letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95,
            }}>
              {(data.heading ?? "Nice Athletic Club").split("–")[0].trim()}{" "}
              {(data.heading ?? "").includes("–") && (
                <>– <span style={{ color: "var(--brand)" }}>{data.heading.split("–")[1]?.trim()}</span></>
              )}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { icon: "MapPin", label: "Adresse", val: data.address },
                { icon: "Clock",  label: "Öffnungszeiten", val: "Täglich: 05:00 – 00:00" },
                { icon: "Phone",  label: "Telefon",  val: data.phone },
                { icon: "Mail",   label: "E-Mail",   val: data.email },
              ].map(({ icon, label, val }) => (
                <div key={label} className="flex items-start gap-3">
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={icon} size={15} style={{ color: "var(--brand)" }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>
                      {label}
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                      {val}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <PrimaryBtn label="Wellpass App öffnen" href="https://de.egym-wellpass.com" external />
            <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", minHeight: "48px", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
              <MapPin size={13} /> Route berechnen
            </a>
            <Link to="/probetraining"
              className="flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", minHeight: "48px" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
              Probetraining buchen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Fullwidth Image Banner ─────────────────────────────────────────────────────
function ImageBanner() {
  return (
    <section className="relative overflow-hidden" style={{ height: "280px" }}>
      <ImageWithFallback src={IMG_FACILITY} alt="Premium Trainingsgeräte Nice Athletic Club" className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,5,5,0.9) 30%, rgba(5,5,5,0.3) 70%, rgba(5,5,5,0.1) 100%)" }} />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-lg">
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)", marginBottom: 12 }}>
              — Premium Equipment
            </p>
            <h2 className="text-white mb-3" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.2rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.93 }}>
              DAS BESTE STUDIO<br />IN <span style={{ color: "var(--brand)" }}>GÖPPINGEN.</span>
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: "360px" }}>
              Über 2.500 m² modernste Trainingsfläche, 200+ Geräte, professionelle Coaches und eine Atmosphäre, die dich pusht.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CtaSection({ data }: { data: CtaBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ paddingTop: "100px", paddingBottom: "100px" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(202,12,133,0.12), transparent 70%)" }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.4), transparent)" }} />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <motion.div variants={v.fadeUp} custom={0}>
            <SectionLabel>{data.label || "Jetzt loslegen"}</SectionLabel>
          </motion.div>
          <motion.h2 variants={v.fadeUp} custom={1} className="text-white mb-5" style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
            letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.93,
          }}>
            {data.headlineNormal}{" "}
            <span style={{ color: "var(--brand)" }}>{data.headlineOutline}</span>
          </motion.h2>
          {data.subtitle && (
            <motion.p variants={v.fadeUp} custom={2} className="mb-8 mx-auto" style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "480px" }}>
              {data.subtitle}
            </motion.p>
          )}
          <motion.div variants={v.fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            {data.btn1Label && <PrimaryBtn label={data.btn1Label} href={data.btn1Url} external={data.btn1Url?.startsWith("http")} />}
            {data.btn2Label && <GhostBtn   label={data.btn2Label} href={data.btn2Url} external={data.btn2Url?.startsWith("http")} />}
          </motion.div>

          {/* Internal link cluster for SEO */}
          <motion.div variants={v.fadeUp} custom={4} className="flex flex-wrap justify-center gap-4 mt-12 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Kurse & Kursplan", to: "/kurse" },
              { label: "Personal Training", to: "/personal-training" },
              { label: "Firmenfitness", to: "/firmenfitness" },
              { label: "HYROX Zone", to: "/hyrox" },
              { label: "Preise & Tarife", to: "/preise" },
              { label: "Kontakt", to: "/kontakt" },
            ].map(({ label, to }) => (
              <Link key={to} to={to}
                className="inline-flex items-center gap-1 transition-colors duration-200"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
                <ChevronRight size={9} />{label}
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Block Dispatcher ──────────────────────────────────────────────────────────
// Each block type maps to a specific section renderer.
// A "featuresCount" counter ensures that the first features-list block
// gets the side image treatment and the second gets the facility banner.
function renderBlock(block: PageBlock, featureIdx: { n: number }) {
  switch (block.type) {
    case "hero":
      return <HeroSection key={block.id} data={block.data as HeroBlockData} reduced={null} />;
    case "stats":
      return <StatsSection key={block.id} data={block.data as StatsBlockData} />;
    case "features-list": {
      const idx = featureIdx.n++;
      const d = block.data as FeaturesListBlockData;
      return (
        <FeaturesSection key={block.id} data={d}
          imageSrc={idx === 0 ? IMG_SIDE : idx === 1 ? IMG_EMPLOYER : undefined}
          imageAlt={idx === 0 ? "Aktiver Lebensstil mit Wellpass" : "Wellpass Arbeitgeber Benefit"}
        />
      );
    }
    case "values-grid":
      return <StepsSection key={block.id} data={block.data as ValuesGridBlockData} />;
    case "trust-badges":
      return <PlansSection key={block.id} data={block.data as TrustBadgesBlockData} />;
    case "faq":
      return <FaqSection key={block.id} data={block.data as FaqBlockData} />;
    case "location-map":
      return (
        <React.Fragment key={block.id}>
          <ImageBanner />
          <LocationSection data={block.data as LocationMapBlockData} />
        </React.Fragment>
      );
    case "cta":
      return <CtaSection key={block.id} data={block.data as CtaBlockData} />;
    case "rich-text":
      return <RichTextSection key={block.id} data={block.data as RichTextBlockData} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EgymWellpass() {
  const [blocks, setBlocks] = useState<PageBlock[]>(
    () => {
      // Read from localStorage on first render (instant, no flicker)
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as PageBlock[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
      return PAGE_INITIAL_BLOCKS["egym-wellpass"] ?? [];
    }
  );

  // Async fetch (API or localStorage refresh)
  useEffect(() => {
    fetchWellpassBlocks().then(setBlocks);
  }, []);

  // Live sync: listen for admin "Speichern" in the same browser session
  useEffect(() => {
    const handleAdminSave = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === "egym-wellpass") {
        fetchWellpassBlocks().then(setBlocks);
      }
    };
    // Same-tab sync via CustomEvent
    window.addEventListener("nac-page-updated", handleAdminSave);
    // Cross-tab sync via StorageEvent
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PageBlock[];
          if (Array.isArray(parsed)) setBlocks(parsed);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("nac-page-updated", handleAdminSave);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Feature section index (used by renderBlock to assign images)
  const featureIdxRef = { n: 0 };

  return (
    <>
      <PageMeta
        title="EGYM Wellpass Göppingen – Nice Athletic Club | Premium Partner"
        description="EGYM Wellpass im Nice Athletic Club Göppingen nutzen: Unlimitiertes Training, Kurse, HYROX Zone & Wellness. Kein Zusatzvertrag – einfach einchecken. Offizieller Wellpass-Partner."
        canonical="https://nicefitness.de/egym-wellpass"
      />

      {/* JSON-LD für lokale SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        "name": "Nice Athletic Club – EGYM Wellpass Partner Göppingen",
        "description": "EGYM Wellpass Partner in Göppingen. Training mit Wellpass im Nice Athletic Club.",
        "url": "https://niceathleticclub.de/egym-wellpass",
        "address": { "@type": "PostalAddress", "streetAddress": "Robert-Bosch-Straße 5", "addressLocality": "Göppingen", "postalCode": "73037", "addressCountry": "DE" },
        "amenityFeature": [
          { "@type": "LocationFeatureSpecification", "name": "EGYM Wellpass akzeptiert", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Kostenfreie Parkplätze", "value": true },
        ],
      })}} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}
        className="relative" style={{ backgroundColor: "var(--surface-0)" }}>
        {blocks.map((block) => renderBlock(block, featureIdxRef))}
      </motion.div>
    </>
  );
}
/**
 * Preise.tsx – Block-gesteuerte Preisseite (NAC Sitebuilder)
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: Zentrierter Hero "UNSERE TARIFE" + BASIS TARIFE Pricing-Karten
 * Architektur:
 *  • fetchPreiseBlocks() → PHP-API → localStorage → PAGE_INITIAL_BLOCKS
 *  • Live-Sync: CustomEvent "nac-page-updated" + StorageEvent
 *  • Jeder Block-Typ rendert die echte Frontend-Section 1:1
 */

import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView, AnimatePresence } from "motion/react";
import {
  ArrowRight, ChevronRight, ChevronDown, ChevronUp,
  Users, Star, Dumbbell, Award, Clock, TrendingUp,
  Heart, Zap, Target, Shield, Wifi, Check, HelpCircle,
  Briefcase, List, CheckCircle2, MapPin,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BASE_URL } from "../../lib/api-service";
import { usePricingData } from "../../lib/use-pricing";
import {
  PricingSection,
  PricingAddonsSection,
  PricingNoticeBlock,
  PricingComparisonSection,
  PricingProsConsSection,
} from "../components/pricing";
import {
  PAGE_INITIAL_BLOCKS,
  type PageBlock,
  type HeroBlockData,
  type StatsBlockData,
  type PricingBlockData,
  type PricingCardsBlockData,
  type PricingAddonsBlockData,
  type PricingCompareBlockData,
  type FeaturesListBlockData,
  type CtaBlockData,
  type FaqBlockData,
  type RichTextBlockData,
  type ValuesGridBlockData,
  type TrustBadgesBlockData,
  migrateLegacyBlocks,
} from "../../data/blocks";

// ── localStorage key ──────────────────────────────────────────────────────────
const LS_KEY = "nac_blocks_preise";
// ── Fetch blocks: API → localStorage → seed ──────────────────────────────────
async function fetchPreiseBlocks(): Promise<PageBlock[]> {
  try {
    const res = await fetch(`${BASE_URL}/pages.php?slug=preise`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.blocks) && json.blocks.length > 0) {
      return migrateLegacyBlocks(json.blocks as PageBlock[]);
    }
  } catch { /* fall through */ }
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PageBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) return migrateLegacyBlocks(parsed);
    }
  } catch { /* fall through */ }
  return migrateLegacyBlocks(PAGE_INITIAL_BLOCKS["preise"] ?? []);
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Users, Star, Dumbbell, Award, Clock, TrendingUp, Heart, Zap, Target, Shield,
  Wifi, Check, CheckCircle2, MapPin, ArrowRight, ChevronRight,
  Briefcase, List, HelpCircle,
};
function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  const Comp = ICONS[name] ?? Zap;
  return <Comp size={size} style={style} />;
}

// ── Animation helpers ─────────────────────────────────────────────────────────
const makeV = (reduced: boolean | null) => ({
  fadeUp: {
    hidden: { opacity: 0, y: reduced ? 0 : 28 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  stagger: { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } },
});

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SectionLabel({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 mb-5 ${center ? "justify-center" : ""}`} style={{
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
  const cls: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    padding: "14px 28px", background: "var(--brand)", color: "white",
    minHeight: "48px", transition: "transform 0.2s, box-shadow 0.2s", textDecoration: "none",
  };
  const hi = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(202,12,133,0.4)"; };
  const ho = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; };
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" style={cls} onMouseEnter={hi} onMouseLeave={ho}>{label} <ArrowRight size={14} /></a>;
  return <Link to={href} style={cls} onMouseEnter={hi} onMouseLeave={ho}>{label} <ArrowRight size={14} /></Link>;
}

function GhostBtn({ label, href }: { label: string; href: string }) {
  const cls: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    padding: "14px 28px", background: "transparent", color: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.15)", minHeight: "48px",
    transition: "border-color 0.2s, color 0.2s", textDecoration: "none",
  };
  const hi = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "white"; };
  const ho = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; };
  return <Link to={href} style={cls} onMouseEnter={hi} onMouseLeave={ho}>{label}</Link>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

// ── Hero – ZENTRIERT (wie im Design) ─────────────────────────────────────────
function HeroSection({ data }: { data: HeroBlockData }) {
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const bg = data.mediaUrl;
  const hl1n = data.headlineLine1Normal;
  const hl1o = data.headlineLine1Outline;
  const hl2n = data.headlineLine2Normal;
  const hl2o = data.headlineLine2Outline;

  // subtitle kann zwei Absätze via \n\n trennen
  const subtitleParts = (data.subtitle ?? "").split("\n\n").filter(Boolean);

  return (
    <>
      {/* ── DESKTOP ── */}
      <section
        className="relative overflow-hidden hidden sm:block"
        style={{ paddingTop: "160px", paddingBottom: "100px", backgroundColor: "#050505" }}
      >
        {/* Background image */}
        {bg && (
          <div className="absolute inset-0 pointer-events-none">
            <ImageWithFallback src={bg} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.75) 0%, rgba(5,5,5,0.55) 50%, rgba(5,5,5,0.85) 100%)" }} />
          </div>
        )}

        {/* Magenta glow accents */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(202,12,133,0.10), transparent 70%)",
        }} />
        <div className="absolute bottom-0 left-0 pointer-events-none" style={{
          width: "500px", height: "400px",
          background: "radial-gradient(ellipse at bottom left, rgba(202,12,133,0.06), transparent 65%)",
        }} />

        {/* Centered content */}
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div variants={v.stagger} initial="hidden" animate="visible">

            {/* Label */}
            <motion.div variants={v.fadeUp} custom={0} className="flex justify-center">
              <SectionLabel center>
                {data.label || "Monatlich kündbar. 100% Performance · 100% Flexibilität"}
              </SectionLabel>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={v.fadeUp}
              custom={1}
              className="text-white mb-8"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(4rem, 9vw, 7rem)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                lineHeight: 0.9,
              }}
            >
              {hl1n && <>{hl1n} </>}
              {hl1o && (
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.75)", color: "transparent" }}>
                  {hl1o}
                </span>
              )}
              {(hl2n || hl2o) && <br />}
              {hl2n && <>{hl2n} </>}
              {hl2o && <span style={{ color: "var(--brand)" }}>{hl2o}</span>}
            </motion.h1>

            {/* Description paragraphs */}
            <div className="max-w-2xl mx-auto mb-8">
              {subtitleParts.map((part, i) => (
                <motion.p
                  key={i}
                  variants={v.fadeUp}
                  custom={2 + i}
                  style={{
                    fontSize: i === 0 ? "15px" : "14px",
                    color: i === 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)",
                    lineHeight: 1.75,
                    marginBottom: i < subtitleParts.length - 1 ? "16px" : 0,
                  }}
                >
                  {part}
                </motion.p>
              ))}
            </div>

            {/* CTA Buttons */}
            {(data.btn1Label || data.btn2Label) && (
              <motion.div
                variants={v.fadeUp}
                custom={4}
                className="flex flex-wrap gap-4 justify-center"
              >
                {data.btn1Label && (data.btn1Style === "primary"
                  ? <PrimaryBtn label={data.btn1Label} href={data.btn1Url || "#pakete"} />
                  : <GhostBtn label={data.btn1Label} href={data.btn1Url || "#pakete"} />
                )}
                {data.btn2Label && (data.btn2Style === "primary"
                  ? <PrimaryBtn label={data.btn2Label} href={data.btn2Url || "/probetraining"} />
                  : <GhostBtn label={data.btn2Label} href={data.btn2Url || "/probetraining"} />
                )}
              </motion.div>
            )}

          </motion.div>
        </div>
      </section>

      {/* ── MOBILE ── */}
      <section
        className="relative flex flex-col justify-end overflow-hidden sm:hidden"
        style={{ backgroundColor: "#050505", paddingTop: "120px", paddingBottom: "48px" }}
      >
        {bg && (
          <div className="absolute inset-0 pointer-events-none">
            <ImageWithFallback src={bg} alt="" className="w-full h-full object-cover opacity-25" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #050505 50%, rgba(5,5,5,0.5) 100%)" }} />
          </div>
        )}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 5%, rgba(202,12,133,0.14), transparent 70%)" }}
        />

        <div className="relative px-5" style={{ zIndex: 5 }}>
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Breadcrumb */}
            <nav
              className="flex items-center gap-1.5 mb-5"
              style={{
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)",
              }}
            >
              <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
              <ChevronRight size={11} />
              <span style={{ color: "rgba(255,255,255,0.6)" }}>PREISE</span>
            </nav>

            <SectionLabel>
              {data.label || "100% Performance · 100% Flexibilität"}
            </SectionLabel>

            <h1
              className="text-white mb-5"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3.4rem, 16vw, 5.5rem)",
                lineHeight: 0.88, letterSpacing: "0.02em", textTransform: "uppercase",
              }}
            >
              {hl1n && <>{hl1n} </>}
              {hl1o && (
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.75)", color: "transparent" }}>
                  {hl1o}
                </span>
              )}
              {(hl2n || hl2o) && " "}
              {hl2n && <>{hl2n} </>}
              {hl2o && <span style={{ color: "var(--brand)" }}>{hl2o}</span>}
            </h1>

            {/* Description (only first paragraph on mobile) */}
            {subtitleParts[0] && (
              <p className="text-white/45 leading-relaxed mb-6" style={{ fontSize: "0.875rem", maxWidth: "340px" }}>
                {subtitleParts[0]}
              </p>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { val: "39 €", lbl: "Ab / Monat" },
                { val: "4", lbl: "Tarife" },
                { val: "0 €", lbl: "Aufnahme" },
              ].map((s) => (
                <div
                  key={s.lbl}
                  className="text-center py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1, letterSpacing: "0.02em" }}>{s.val}</span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            {data.btn1Label && (
              <Link
                to={data.btn1Url || "#pakete"}
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300 mb-3"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}
              >
                {data.btn1Label} <ArrowRight size={16} />
              </Link>
            )}
            {data.btn2Label && (
              <Link
                to={data.btn2Url || "/probetraining"}
                className="flex items-center justify-center gap-3 w-full active:scale-[0.98] transition-all duration-300"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "48px" }}
              >
                {data.btn2Label}
              </Link>
            )}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center mt-8"
          >
            <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
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
    <section id="stats" style={{
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
              <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1, letterSpacing: "0.02em" }}>{value}</span>
              <span className="block mt-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing Block – BASIS TARIFE mit echten Tarifen ──────────────────────────
function PricingBlock({ data }: { data: PricingBlockData }) {
  const { data: pricingData, loading } = usePricingData("preise");
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const v = makeV(reduced);

  return (
    <section id="pakete" ref={ref} style={{ backgroundColor: "var(--surface-0)", paddingTop: "96px" }}>
      {/* Section heading – "UNSERE TARIFE" (optional override, default = BASIS TARIFE) */}
      <div className="max-w-7xl mx-auto px-6 pb-6 text-center">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <motion.div variants={v.fadeUp} custom={0} className="flex justify-center">
            <SectionLabel center>{data.heading || "Unsere Tarife"}</SectionLabel>
          </motion.div>
          {data.subheading && (
            <motion.p
              variants={v.fadeUp}
              custom={1}
              style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}
            >
              {data.subheading}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Pricing cards – PricingSection uses "BASIS TARIFE" + subtitle from design */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(202,12,133,0.3)",
            borderTopColor: "var(--brand)",
            animation: "spin 0.7s linear infinite",
          }} />
        </div>
      ) : pricingData ? (
        <>
          <PricingSection
            plans={pricingData.plans}
            title="BASIS"
            titleOutline="TARIFE"
            subtitle="Dein Grundpreis – ohne versteckte Kosten"
          />
          {pricingData.notices.filter((n) => n.type === "contract").length > 0 && (
            <section style={{ backgroundColor: "var(--surface-0)" }}>
              <div className="max-w-6xl mx-auto px-5 sm:px-6 pb-8">
                {pricingData.notices
                  .filter((n) => n.type === "contract")
                  .map((notice) => (
                    <div
                      key={notice.id}
                      className="px-4 sm:px-5 py-4 flex items-start gap-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="w-1 h-8 shrink-0" style={{ background: "var(--brand)" }} />
                      <div>
                        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)" }}>
                          {notice.title.toUpperCase()}
                        </p>
                        <p className="text-white/40 text-sm leading-relaxed mt-1">{notice.text}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
          <PricingAddonsSection addons={pricingData.addons} />
          <PricingNoticeBlock
            notices={pricingData.notices.filter((n) => n.type !== "contract")}
            plans={pricingData.plans}
          />
          <PricingComparisonSection comparison={pricingData.comparison} />
          {pricingData.pros_cons?.enabled && (
            <section className="pb-20" style={{ backgroundColor: "var(--surface-0)" }}>
              <div className="max-w-6xl mx-auto px-5 sm:px-6">
                <PricingProsConsSection prosCons={pricingData.pros_cons} />
              </div>
            </section>
          )}
        </>
      ) : null}
    </section>
  );
}

// ── Features List Section ─────────────────────────────────────────────────────
function FeaturesSection({ data }: { data: FeaturesListBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);
  const features = data.features ?? [];

  return (
    <section
      ref={ref}
      style={{
        paddingTop: "80px", paddingBottom: "80px",
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-12"
        >
          <motion.div variants={v.fadeUp} custom={0} className="flex justify-center">
            <SectionLabel center>{data.subtitle || "Inklusive"}</SectionLabel>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white mb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
              letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.95,
            }}
          >
            {(data.heading ?? "").split(" ").slice(0, -1).join(" ")}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              {(data.heading ?? "").split(" ").pop()}
            </span>
          </motion.h2>
          {data.subtitle && (
            <motion.p
              variants={v.fadeUp}
              custom={2}
              className="max-w-2xl mx-auto"
              style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}
            >
              {data.subtitle}
            </motion.p>
          )}
        </motion.div>
        <motion.div
          variants={v.stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon, title, description }, i) => (
            <motion.div
              key={title}
              variants={v.fadeUp}
              custom={i}
              className="p-6 transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = ""; }}
            >
              <div
                className="flex items-center justify-center mb-4"
                style={{ width: 44, height: 44, background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
              >
                <Icon name={icon} size={20} style={{ color: "var(--brand)" }} />
              </div>
              <h3
                className="text-white mb-2"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "13.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                {title}
              </h3>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────
const STATIC_FAQ = [
  { q: "Gibt es eine Mindestlaufzeit?",          a: "Nein. Alle Verträge haben keine Mindestlaufzeit und sind monatlich kündbar." },
  { q: "Was bedeutet Blaulicht-Rabatt?",         a: "Blaulicht-Kräfte (Feuerwehr, Polizei, Rettungsdienst) erhalten 10 € Rabatt auf die Tarife Athletic und Nicest. Einfach einen entsprechenden Ausweis beim Anmelden mitbringen." },
  { q: "Wie funktionieren die Add-ons?",         a: "Add-ons werden auf den Grundpreis deines Athletic-Tarifs aufgerechnet. Beispiel: Athletic (69 €) + CrossFit Unlimited (+50 €) = 119 € pro Monat." },
  { q: "Kann ich vorher reinschnuppern?",        a: "Ja! Komm einfach vorbei und sprich uns an – wir freuen uns auf dich." },
  { q: "Gibt es eine Aufnahmegebühr?",           a: "Nein. Keine versteckten Kosten. Du zahlst nur den monatlichen Beitrag deines gewählten Tarifs plus eventuelle Add-ons." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b cursor-pointer"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-start justify-between py-5 gap-4" style={{ minHeight: "44px" }}>
        <span className="text-white/80 text-sm leading-relaxed">{q}</span>
        {open
          ? <ChevronUp size={16} className="shrink-0 mt-0.5" style={{ color: "var(--brand)" }} />
          : <ChevronDown size={16} className="shrink-0 mt-0.5 text-white/30" />
        }
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-white/40 text-sm leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CtaSection({ data }: { data: CtaBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const v = makeV(reduced);

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ paddingTop: "96px", paddingBottom: "96px" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(202,12,133,0.12), transparent 70%)" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.4), transparent)" }}
      />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div variants={v.stagger} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <motion.div variants={v.fadeUp} custom={0} className="flex justify-center">
            <SectionLabel center>{data.label || "Jetzt starten"}</SectionLabel>
          </motion.div>
          <motion.h2
            variants={v.fadeUp}
            custom={1}
            className="text-white mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 6vw, 4.2rem)",
              letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 0.93,
            }}
          >
            {data.headlineNormal}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              {data.headlineOutline}
            </span>
          </motion.h2>
          {data.subtitle && (
            <motion.p
              variants={v.fadeUp}
              custom={2}
              className="mb-8 mx-auto"
              style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "480px" }}
            >
              {data.subtitle}
            </motion.p>
          )}
          <motion.div variants={v.fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            {data.btn1Label && <PrimaryBtn label={data.btn1Label} href={data.btn1Url || "/probetraining"} />}
            {data.btn2Label && <GhostBtn label={data.btn2Label} href={data.btn2Url || "#pakete"} />}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Pricing Cards Block (real API data) ──────────────────────────────────────
function PricingCardsSection({ data }: { data: PricingCardsBlockData }) {
  const { data: pricingData, loading } = usePricingData("preise");
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "64px 24px" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  const all = pricingData?.plans ?? [];
  const sel = (data.selectedPlans ?? []) as string[];
  const plans = sel.length === 0 || sel.includes("all") ? all : all.filter((p) => sel.includes(p.slug));
  return (
    <>
      <PricingSection plans={plans} title={data.heading || "Unsere Tarife"} titleOutline="" subtitle={(data as any).subheading || ""} />
      {(pricingData?.notices?.filter((n: any) => n.type === "contract")?.length ?? 0) > 0 && (
        <section style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6 pb-8">
            {pricingData!.notices.filter((n: any) => n.type === "contract").map((notice: any) => (
              <div key={notice.id} className="px-4 sm:px-5 py-4 flex items-start gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-1 h-8 shrink-0" style={{ background: "var(--brand)" }} />
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)" }}>{notice.title.toUpperCase()}</p>
                  <p className="text-white/40 text-sm leading-relaxed mt-1">{notice.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ── Pricing Addons Block (real API data, CMS-filtered) ───────────────────────
function PricingAddonsCmsBlock({ data }: { data: PricingAddonsBlockData }) {
  const { data: pricingData, loading } = usePricingData("preise");
  if (loading) return null;
  let addons = pricingData?.addons ?? [];
  if (data.addonsConfig && data.addonsConfig.length > 0) {
    addons = data.addonsConfig
      .filter((cfg) => !cfg.hidden)
      .map((cfg) => {
        const found = addons.find((a) => a.slug === cfg.id || a.id.toString() === cfg.id);
        if (!found) return null;
        const addon = { ...found };
        if (cfg.optionsConfig && cfg.optionsConfig.length > 0) {
          addon.options = cfg.optionsConfig
            .filter((optCfg) => !optCfg.hidden)
            .map((optCfg) => addon.options?.find((o) => o.label === optCfg.id))
            .filter(Boolean) as typeof addon.options;
        }
        return addon;
      })
      .filter(Boolean) as typeof addons;
  }
  return (
    <>
      <PricingAddonsSection
        addons={addons}
        heading={data.heading || undefined}
        subtitle={data.subtitle || undefined}
      />
      <PricingNoticeBlock notices={pricingData?.notices?.filter((n: any) => n.type !== "contract") || []} plans={pricingData?.plans || []} />
    </>
  );
}

// ── Pricing Compare Block (real API data) ────────────────────────────────
function PricingCompareCmsBlock({ data }: { data: PricingCompareBlockData }) {
  const { data: pricingData, loading } = usePricingData("preise");
  if (loading) return null;
  return (
    <>
      <PricingComparisonSection comparison={pricingData?.comparison ?? null} />
      {pricingData?.pros_cons?.enabled && (
        <section className="pb-20" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <PricingProsConsSection prosCons={pricingData.pros_cons} />
          </div>
        </section>
      )}
    </>
  );
}

// ── Rich Text (fallback) ──────────────────────────────────────────────────────
function RichTextSection({ data }: { data: RichTextBlockData }) {
  return (
    <section style={{ paddingTop: "56px", paddingBottom: "56px" }}>
      <div className="max-w-3xl mx-auto px-6" style={{ textAlign: data.centered ? "center" : "left" }}>
        {data.heading && (
          <h2
            className="text-white mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "0.02em", textTransform: "uppercase" }}
          >
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

// ── Block Dispatcher ──────────────────────────────────────────────────────────
function renderBlock(block: PageBlock) {
  switch (block.type) {
    case "hero":            return <HeroSection        key={block.id} data={block.data as HeroBlockData} />;
    case "stats":           return <StatsSection       key={block.id} data={block.data as StatsBlockData} />;
    case "pricing-cards":   return <PricingCardsSection   key={block.id} data={block.data as PricingCardsBlockData} />;
    case "pricing-addons":  return <PricingAddonsCmsBlock key={block.id} data={block.data as PricingAddonsBlockData} />;
    case "pricing-compare": return <PricingCompareCmsBlock key={block.id} data={block.data as PricingCompareBlockData} />;
    case "features-list":   return <FeaturesSection    key={block.id} data={block.data as FeaturesListBlockData} />;
    case "cta":             return <CtaSection         key={block.id} data={block.data as CtaBlockData} />;
    case "rich-text":       return <RichTextSection    key={block.id} data={block.data as RichTextBlockData} />;
    default:                return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Preise() {
  const [blocks, setBlocks] = useState<PageBlock[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PageBlock[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return PAGE_INITIAL_BLOCKS["preise"] ?? [];
  });

  useEffect(() => {
    fetchPreiseBlocks().then(setBlocks);
  }, []);

  // Live-Sync: Admin PageEditor → sofort aktualisieren
  useEffect(() => {
    const onAdminSave = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === "preise") fetchPreiseBlocks().then(setBlocks);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
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

  return (
    <>
      <PageMeta
        title="Mitgliedschaft & Preise Göppingen – Fitness ohne Mindestlaufzeit | NAC"
        description="Nice Athletic Club Preise: Flexible Mitgliedschaften ab 39 €/Monat – CrossFit, HYROX & Athletic Bereich inklusive. Monatlich kündbar, kein Risiko. Jetzt Probetraining buchen!"
        canonical="https://nicefitness.de/preise"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {blocks.filter((block) => !block.hidden).map((block) => renderBlock(block))}

        {/* Statische FAQ-Sektion – immer angezeigt */}
        <section
          className="py-16 sm:py-24"
          style={{ backgroundColor: "var(--surface-2)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="max-w-2xl mx-auto px-5 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2
                className="text-white"
                style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontFamily: "var(--font-display)" }}
              >
                HÄUFIGE{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>FRAGEN</span>
              </h2>
            </motion.div>
            {STATIC_FAQ.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </section>
      </motion.div>
    </>
  );
}
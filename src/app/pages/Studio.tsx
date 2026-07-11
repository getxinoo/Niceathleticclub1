/**
 * Studio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Datengetriebene Studio-Seite.
 *
 * Architektur:
 *  • fetchStudioBlocks() lädt Blöcke von der PHP-API (Fallback: PAGE_INITIAL_BLOCKS["studio"])
 *  • Studio() mapped über die Blöcke und ruft die jeweilige Section-Komponente auf
 *
 * Exportierte Section-Komponenten (verwendbar in BlockPreview & anderen Blöcken):
 *  • StudioHeroSection   – Vollbild-Hero (Desktop + Mobile)
 *  • StudioZonesSection  – Bento Grid / Swipe Carousel
 *  • StudioInfoSection   – Öffnungszeiten + Ausstattung + Kontakt
 *
 * WICHTIG: Alle Tailwind-Klassen, HTML-Strukturen und Framer Motion Animationen
 * entsprechen 1:1 dem ursprünglichen, hartcodierten Stand.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  Dumbbell,
  Zap,
  Clock,
  Wifi,
  ShowerHead,
  SquareParking,
  Coffee,
  ArrowRight,
  MapPin,
  Warehouse,
  ScanLine,
  MessageCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { fetchPublishedBlocks } from "../../lib/public-blocks";
import {
  PAGE_INITIAL_BLOCKS,
  type PageBlock,
  type StudioHeroBlockData,
  type StudioZonesBlockData,
  type StudioInfoBlockData,
  type StudioZoneData,
  type StudioAmenityItem,
} from "../../data/blocks";

// ── Asset resolver ────────────────────────────────────────────────────────────
// NIEMALS wieder als No-op vereinfachen: gespeicherte Produktions-Blöcke
// (pages.php / localStorage) enthalten weiterhin Legacy-Asset-Strings
// ("figma:asset/<hash>.png"). Ein Passthrough schickt diese Strings roh als
// <img src> an den Browser — genau das war der Produktions-Bildausfall vom
// 2026-07-10 (Rollback nötig). resolveImg() bildet Legacy-Hashes auf die
// kanonischen /images/-Pfade ab und liefert für unbekannte Hashes eine
// sichtbare Diagnose-Grafik.
import { resolveImg } from "../../lib/images";
import { normalizeLayoutVariant, isFeatureSlot, slotPositionLabel } from "../../lib/studio-layout";
export function resolveStudioAsset(src: string): string {
  return resolveImg(src);
}

// ── Icon resolver: Lucide name string → React component ──────────────────────
type LucideIcon = typeof Dumbbell;
const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell, Zap, Clock, Wifi, ShowerHead, SquareParking,
  Coffee, MapPin, Warehouse, ScanLine, MessageCircle,
};
export function resolveStudioIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Dumbbell;
}

// ── Data fetching ─────────────────────────────────────────────────────────────
// Öffentliche Priorität: veröffentlichte API-Blöcke → Seed nur bei wirklich
// fehlender Seite. NIE localStorage (Browser-Entwürfe sind Editor-intern).
async function fetchStudioBlocks(): Promise<PageBlock[]> {
  const { blocks } = await fetchPublishedBlocks("studio", PAGE_INITIAL_BLOCKS["studio"] ?? []);
  return blocks;
}

// ── Animation helpers ─────────────────────────────────────────────────────────
export const studioFadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const studioStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ── Shared Label component ────────────────────────────────────────────────────
export function StudioLabel({ children }: { children: React.ReactNode }) {
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

// ── Mobile Carousel Hook ──────────────────────────────────────────────────────
function useCarousel(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.offsetWidth * 0.82;
    const gap   = 12;
    const idx   = Math.round(el.scrollLeft / (cardW + gap));
    setActiveIdx(Math.min(idx, itemCount - 1));
  }, [itemCount]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.offsetWidth * 0.82;
    el.scrollTo({ left: idx * (cardW + 12), behavior: "smooth" });
  }, []);

  return { scrollRef, activeIdx, handleScroll, scrollTo };
}

// ── Mobile Dots ───────────────────────────────────────────────────────────────
function MobileDots({ count, active, onDot }: { count: number; active: number; onDot: (i: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 mt-4 sm:hidden">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => onDot(i)}
            aria-label={`Slide ${i + 1}`}
            className="transition-all duration-300 cursor-pointer"
            style={{
              width: i === active ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: i === active ? "var(--brand)" : "rgba(255,255,255,0.2)",
              border: "none",
              padding: 0,
              boxShadow: i === active ? "0 0 10px rgba(202,12,133,0.4)" : "none",
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
        {active + 1} / {count}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 – HERO
// ─────────────────────────────────────────────────────────────────────────────
export function StudioHeroSection({
  data,
  reduced,
}: {
  data: StudioHeroBlockData;
  reduced: boolean | null;
}) {
  const heroImg = resolveStudioAsset(data.heroImage);

  const quickStats = [
    { val: data.quickStat1Val, lbl: data.quickStat1Label },
    { val: data.quickStat2Val, lbl: data.quickStat2Label },
    { val: data.quickStat3Val, lbl: data.quickStat3Label },
  ];

  return (
    <>
      {/* ── Desktop Hero (sm+) ── */}
      <section className="relative min-h-[50vh] md:min-h-[60vh] items-end overflow-hidden hidden sm:flex">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Nice Athletic Club Studio"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.3) saturate(1.1)" }}
          />
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.15) 40%, rgba(5,5,5,0.75) 75%, #050505 100%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 0% 100%, rgba(202,12,133,0.12) 0%, transparent 60%)" }}
        />

        <div className="relative w-full max-w-7xl mx-auto px-6 pb-16 md:pb-24 pt-40" style={{ zIndex: 5 }}>
          <motion.div
            variants={studioStagger}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <motion.nav
              variants={studioFadeUp}
              custom={0}
              className="flex items-center gap-2 mb-6 text-white/40"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.12em" }}
            >
              <Link to="/" className="hover:text-white/70 transition-colors">HOME</Link>
              <ArrowRight size={12} />
              <span className="text-white/60">DAS STUDIO</span>
            </motion.nav>

            <motion.div variants={studioFadeUp} custom={1}>
              <StudioLabel>{data.label}</StudioLabel>
            </motion.div>

            <motion.h1
              variants={studioFadeUp}
              custom={2}
              className="text-white mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.8rem, 9vw, 7rem)",
                lineHeight: 0.92,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {data.headlineNormal}{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                {data.headlineOutline}
              </span>
            </motion.h1>

            <motion.p
              variants={studioFadeUp}
              custom={3}
              className="text-white/55 max-w-xl leading-relaxed"
              style={{ fontSize: "1.05rem" }}
            >
              {data.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile Hero (< sm) ── */}
      <section className="relative min-h-screen flex items-end overflow-hidden sm:hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Nice Athletic Club Studio Göppingen"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.32) saturate(1.15)" }}
          />
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.05) 30%, rgba(5,5,5,0.7) 70%, #050505 100%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 0% 100%, rgba(202,12,133,0.18) 0%, transparent 55%)" }}
        />

        <div className="relative w-full px-5 pb-8 pt-32" style={{ zIndex: 5 }}>
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Breadcrumb */}
            <nav
              className="flex items-center gap-1.5 mb-4 text-white/40"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}
            >
              <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
              <ChevronRight size={11} />
              <span className="text-white/60">DAS STUDIO</span>
            </nav>

            <StudioLabel>{data.label}</StudioLabel>

            <h1
              className="text-white mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem, 14vw, 4.5rem)",
                lineHeight: 0.9,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {data.headlineNormal}{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                {data.headlineOutline}
              </span>
            </h1>

            <p className="text-white/45 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.9rem" }}>
              {data.subtitleMobile}
            </p>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {quickStats.map((s) => (
                <div
                  key={s.lbl}
                  className="text-center py-3"
                  style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1, letterSpacing: "0.02em" }}>
                    {s.val}
                  </span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
                    {s.lbl}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              to={data.ctaUrl}
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
              {data.ctaLabel}
              <ArrowRight size={16} />
            </Link>
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

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 – ZONES (Slot-basiertes Mosaik / Swipe Carousel)
// ─────────────────────────────────────────────────────────────────────────────
// Verbindliche Layoutlogik (siehe lib/studio-layout.ts): Größe gehört zum
// SLOT, nicht zur Karte. layoutVariant bestimmt, welche sichtbare Position
// groß erscheint (feature-left → Pos. 1, feature-right → Pos. 3). Umsortieren
// einer Karte auf die Feature-Position macht genau diese Karte groß. Karten
// ab Position 7 laufen im normalen Raster unter dem Mosaik weiter. Mobile
// zeigt immer die gespeicherte Reihenfolge, unabhängig von der Variante.
//
// showSlotLabels ist ein reines Admin-Overlay (Positions-Badges) und wird von
// der öffentlichen Seite nie gesetzt — Markup/Styles sind identisch.

// Explizite Slot-Platzierung fürs 3-Spalten-Mosaik (lg). md (2 Spalten):
// Feature-Karte über volle Breite. Darunter/oben: normaler Auto-Flow.
const MOSAIC_CSS = `
@media (min-width: 1024px) {
  .nac-mosaic-left  > .nac-slot:nth-child(1) { grid-column: 1 / span 2; grid-row: 1 / span 2; }
  .nac-mosaic-left  > .nac-slot:nth-child(2) { grid-column: 3; grid-row: 1; }
  .nac-mosaic-left  > .nac-slot:nth-child(3) { grid-column: 3; grid-row: 2; }
  .nac-mosaic-right > .nac-slot:nth-child(1) { grid-column: 1; grid-row: 1; }
  .nac-mosaic-right > .nac-slot:nth-child(2) { grid-column: 1; grid-row: 2; }
  .nac-mosaic-right > .nac-slot:nth-child(3) { grid-column: 2 / span 2; grid-row: 1 / span 2; }
}
@media (min-width: 768px) and (max-width: 1023.98px) {
  .nac-mosaic-left  > .nac-slot:nth-child(1) { grid-column: 1 / span 2; }
  .nac-mosaic-right > .nac-slot:nth-child(3) { grid-column: 1 / span 2; }
}
`;

export function StudioZonesSection({
  data,
  showSlotLabels = false,
}: {
  data: StudioZonesBlockData;
  showSlotLabels?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Ausgeblendete Zonen fallen VOR der Slot-Berechnung raus (kein Loch).
  const visibleZones = (data.zones ?? []).filter((z) => z.visible !== false);
  const variant = normalizeLayoutVariant(data.layoutVariant);
  // Mosaik braucht mindestens 3 sichtbare Karten; darunter normales Raster.
  const mosaicActive = visibleZones.length >= 3;

  const { scrollRef, activeIdx, handleScroll, scrollTo } = useCarousel(visibleZones.length);

  return (
    <section
      ref={ref}
      className="py-16 sm:py-24 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      <div className="max-w-7xl mx-auto sm:px-6">
        <motion.div
          variants={studioStagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-10 sm:mb-16 px-5 sm:px-0"
        >
          <motion.div variants={studioFadeUp} custom={0}>
            <StudioLabel>{data.sectionLabel}</StudioLabel>
          </motion.div>
          <motion.h2
            variants={studioFadeUp}
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
            {data.headlineNormal}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              {data.headlineOutline}
            </span>
          </motion.h2>
        </motion.div>

        {/* ── Desktop Mosaik (sm+) ── */}
        <style>{MOSAIC_CSS}</style>
        <motion.div
          variants={studioStagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className={`hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-0 ${
            mosaicActive ? (variant === "feature-right" ? "nac-mosaic-right" : "nac-mosaic-left") : ""
          }`}
        >
          {visibleZones.map((zone, i) => {
            const Icon = resolveStudioIcon(zone.iconName);
            const feature = mosaicActive && isFeatureSlot(variant, i);
            return (
              <motion.div
                key={zone.key || i}
                variants={studioFadeUp}
                custom={i}
                className="nac-slot group relative overflow-hidden transition-all duration-500"
                style={{ minHeight: feature ? "420px" : "260px", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              >
                <img
                  src={resolveStudioAsset(zone.image)}
                  alt={zone.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ filter: "brightness(0.35) saturate(0.9)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                {showSlotLabels && (
                  <span
                    className="absolute top-2 left-2 z-20"
                    style={{
                      background: "rgba(0,0,0,0.75)", border: "1px solid rgba(202,12,133,0.5)",
                      color: "white", fontFamily: "var(--font-condensed)", fontSize: "10px",
                      fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                      padding: "3px 8px",
                    }}
                  >
                    {slotPositionLabel(variant, i)}
                  </span>
                )}
                <div className="relative z-10 flex flex-col justify-end h-full p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 flex items-center justify-center"
                      style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)" }}
                    >
                      <Icon size={14} style={{ color: "var(--brand)" }} />
                    </div>
                    <span
                      className="text-white/35"
                      style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em" }}
                    >
                      {zone.tag}
                    </span>
                  </div>
                  <h3
                    className="text-white mb-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: feature ? "1.8rem" : "1.4rem",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {zone.label}
                  </h3>
                  <p className="text-white/45 max-w-md" style={{ fontSize: "13px", lineHeight: 1.6 }}>
                    {zone.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Mobile Swipe Carousel (< sm) – gespeicherte Reihenfolge 1→2→3… ── */}
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto px-5 pb-2 studio-zone-scroll"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>{`.studio-zone-scroll::-webkit-scrollbar { display: none; }`}</style>
            {visibleZones.map((zone) => {
              const Icon = resolveStudioIcon(zone.iconName);
              return (
                <div
                  key={zone.key}
                  className="shrink-0 relative overflow-hidden"
                  style={{ width: "82%", scrollSnapAlign: "start", minHeight: "280px", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <img
                    src={resolveStudioAsset(zone.image)}
                    alt={zone.label}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "brightness(0.3) saturate(0.9)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <div className="relative z-10 flex flex-col justify-end h-full p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 flex items-center justify-center"
                        style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)" }}
                      >
                        <Icon size={13} style={{ color: "var(--brand)" }} />
                      </div>
                      <span
                        className="text-white/30"
                        style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em" }}
                      >
                        {zone.tag}
                      </span>
                    </div>
                    <h3
                      className="text-white mb-2"
                      style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em", textTransform: "uppercase" }}
                    >
                      {zone.label}
                    </h3>
                    <p className="text-white/40 mb-4" style={{ fontSize: "12px", lineHeight: 1.6 }}>
                      {zone.desc}
                    </p>
                    {zone.link && (
                      <Link
                        to={zone.link}
                        className="inline-flex items-center gap-2 self-start active:scale-[0.97] transition-all duration-200"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--brand)",
                          padding: "8px 0",
                          minHeight: "44px",
                        }}
                      >
                        ENTDECKEN <ChevronRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>
          <MobileDots count={visibleZones.length} active={activeIdx} onDot={scrollTo} />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 – INFO (Öffnungszeiten / Ausstattung / Kontakt)
// ────────────────────────────────────────────────────────────────────────────
export function StudioInfoSection({ data }: { data: StudioInfoBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const infoInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-16 sm:py-24 md:py-32 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--surface-0) 0%, #050505 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* Section headline */}
        <motion.div
          variants={studioStagger}
          initial="hidden"
          animate={infoInView ? "visible" : "hidden"}
          className="text-center mb-10 sm:mb-16"
        >
          <motion.div variants={studioFadeUp} custom={0}>
            <StudioLabel>{data.sectionLabel}</StudioLabel>
          </motion.div>
          <motion.h2
            variants={studioFadeUp}
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
            {data.headlineNormal}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
              {data.headlineOutline}
            </span>
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* ── Card 1: Opening Hours ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={infoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 sm:p-7"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 flex items-center justify-center shrink-0"
                style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
              >
                <Clock size={15} style={{ color: "var(--brand)" }} />
              </div>
              <h3
                className="text-white"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                {data.studioHoursHeading}
              </h3>
            </div>
            <ul className="space-y-3">
              {data.hours.map(({ day, time }) => (
                <li
                  key={day}
                  className="flex items-center justify-between py-2 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-white/45" style={{ fontSize: "13px" }}>{day}</span>
                  <span
                    className="text-white/80"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em" }}
                  >
                    {time}
                  </span>
                </li>
              ))}
            </ul>

            {/* Thekenzeiten */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-7 h-7 flex items-center justify-center shrink-0"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <Coffee size={13} style={{ color: "var(--brand)" }} />
                </div>
                <h4
                  className="text-white"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  {data.thekenHoursHeading}
                </h4>
              </div>
              <ul className="space-y-2">
                {data.thekenHours.map(({ day, time }) => (
                  <li
                    key={day}
                    className="flex items-center justify-between py-2 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-white/45" style={{ fontSize: "13px" }}>{day}</span>
                    <span
                      className="text-white/80"
                      style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em" }}
                    >
                      {time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ── Card 2: Amenities ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={infoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 sm:p-7 lg:col-span-2"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 flex items-center justify-center shrink-0"
                style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
              >
                <Dumbbell size={15} style={{ color: "var(--brand)" }} />
              </div>
              <h3
                className="text-white"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                {data.amenitiesHeading}
              </h3>
            </div>

            {/* Desktop: 3-col grid (sm+) */}
            <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.amenities.map((item: StudioAmenityItem) => {
                const Icon = resolveStudioIcon(item.iconName);
                return (
                  <div
                    key={item.label}
                    className="group flex flex-col items-center text-center gap-3 p-4 transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.06)"; e.currentTarget.style.borderColor = "rgba(202,12,133,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}
                    >
                      <Icon size={18} style={{ color: "var(--brand)" }} />
                    </div>
                    <span className="text-white/55" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mobile: 2-col compact grid (< sm) */}
            <div className="grid grid-cols-2 gap-2.5 sm:hidden">
              {data.amenities.map((item: StudioAmenityItem) => {
                const Icon = resolveStudioIcon(item.iconName);
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}
                    >
                      <Icon size={14} style={{ color: "var(--brand)" }} />
                    </div>
                    <span className="text-white/50" style={{ fontSize: "11px", lineHeight: 1.35 }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Card 3: Contact / Location ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={infoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 sm:p-7 lg:col-span-3"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
          >
            {/* Desktop layout (sm+) */}
            <div className="hidden sm:flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <MapPin size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <h3
                    className="text-white mb-1"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                  >
                    {data.addressHeading}
                  </h3>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    {data.addressLine1}<br />
                    {data.addressLine2}<br />
                    {data.addressLine3}
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <MessageCircle size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <h3
                    className="text-white mb-1"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                  >
                    {data.contactHeading}
                  </h3>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    {data.contactEmail}<br />
                    {data.contactSocial}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <Link
                to={data.ctaUrl}
                className="group inline-flex items-center justify-center gap-3 px-7 text-white transition-all duration-300 active:scale-[0.98] self-start md:self-center"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  minHeight: "52px",
                  minWidth: "44px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {data.ctaLabel}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>

            {/* Mobile layout (< sm) */}
            <div className="sm:hidden space-y-5">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <MapPin size={14} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <h3
                    className="text-white mb-1"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                  >
                    {data.addressHeading}
                  </h3>
                  <p className="text-white/45" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                    {data.addressLine1} · {data.addressLine2} · {data.addressLine3}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                >
                  <MessageCircle size={14} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <h3
                    className="text-white mb-1"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
                  >
                    {data.contactHeading}
                  </h3>
                  <p className="text-white/45" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                    {data.contactEmail} · {data.contactSocial}
                  </p>
                </div>
              </div>

              <Link
                to={data.ctaUrl}
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  minHeight: "50px",
                }}
              >
                {data.ctaLabel} VEREINBAREN
                <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE – Studio (data-driven, API → fallback seed)
// ─────────────────────────────────────────────────────────────────────────────
export default function Studio() {
  const reduced = useReducedMotion();
  // Startzustand = Seed; die veröffentlichten API-Blöcke ersetzen ihn nach dem
  // Fetch. Öffentliche Seiten lesen bewusst KEIN localStorage (Entwürfe sind
  // Editor-intern) – siehe lib/public-blocks.ts.
  const [blocks, setBlocks] = useState<PageBlock[]>(() => PAGE_INITIAL_BLOCKS["studio"] ?? []);

  useEffect(() => {
    fetchStudioBlocks().then(setBlocks);
  }, []);

  // Live-Sync: Nach „Veröffentlichen“ im PageEditor → veröffentlichte Blöcke
  // neu von der API laden (Event ist nur ein Refetch-Signal, keine Datenquelle).
  useEffect(() => {
    const onAdminSave = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === "studio") fetchStudioBlocks().then(setBlocks);
    };
    window.addEventListener("nac-page-updated", onAdminSave);
    return () => window.removeEventListener("nac-page-updated", onAdminSave);
  }, []);

  return (
    <>
      <PageMeta
        title="Das Studio – 1.500 qm Premium Fitness Göppingen | Nice Athletic Club"
        description="Nice Athletic Club Studio Göppingen: Athletic Area, CrossFit-Box, HYROX-Zone, Nice Theke & Premium Duschen auf 1.500+ qm. Industriehallen-Flair, Mo–Fr 06–23 Uhr, Sa–So 08–21 Uhr."
        canonical="https://nicefitness.de/studio"
        ogImage="https://nicefitness.de/images/studio/entrance.png"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {blocks.filter((block) => !block.hidden).map((block) => {
          switch (block.type) {
            case "studio-hero":
              return (
                <StudioHeroSection
                  key={block.id}
                  data={block.data as unknown as StudioHeroBlockData}
                  reduced={reduced}
                />
              );
            case "studio-zones":
              return (
                <StudioZonesSection
                  key={block.id}
                  data={block.data as unknown as StudioZonesBlockData}
                />
              );
            case "studio-info":
              return (
                <StudioInfoSection
                  key={block.id}
                  data={block.data as unknown as StudioInfoBlockData}
                />
              );
            default:
              return null;
          }
        })}
      </motion.div>
    </>
  );
}
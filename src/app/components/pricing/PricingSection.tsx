/**
 * PricingSection.tsx – Container für Preiskarten (Public)
 *
 * Desktop: Flexbox zentriert mit fixer Breite pro Karte (sm+)
 * Mobile: Horizontal snap-scroll carousel mit Dot-Navigation (< sm)
 */
import { useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { PublicPlan } from "../../../lib/pricing-types";
import { PricingCard } from "./PricingCard";

interface PricingSectionProps {
  plans: PublicPlan[];
  title?: string;
  titleOutline?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}

// ── Mobile Carousel Hook ────────────────────────────────────────────────────
function useCarousel(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardW = el.offsetWidth * 0.8;
    const gap = 12;
    const idx = Math.round(scrollLeft / (cardW + gap));
    setActiveIdx(Math.min(Math.max(idx, 0), itemCount - 1));
  }, [itemCount]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.offsetWidth * 0.8;
    const gap = 12;
    el.scrollTo({ left: idx * (cardW + gap), behavior: "smooth" });
  }, []);

  return { scrollRef, activeIdx, handleScroll, scrollTo };
}

// ── Mobile Dots ─────────────────────────────────────────────────────────────
function MobileDots({
  count,
  active,
  onDot,
}: {
  count: number;
  active: number;
  onDot: (i: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 mt-4 sm:hidden">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => onDot(i)}
            aria-label={`Tarif ${i + 1}`}
            className="transition-all duration-300 cursor-pointer"
            style={{
              width: i === active ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background:
                i === active ? "var(--brand)" : "rgba(255,255,255,0.2)",
              border: "none",
              padding: 0,
              boxShadow:
                i === active ? "0 0 10px rgba(202,12,133,0.4)" : "none",
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

export function PricingSection({
  plans,
  title = "BASIS",
  titleOutline = "TARIFE",
  subtitle,
  compact = false,
  className = "",
}: PricingSectionProps) {
  const reduced = useReducedMotion();
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
  const { scrollRef, activeIdx, handleScroll, scrollTo } = useCarousel(
    sorted.length
  );

  if (!plans.length) return null;

  return (
    <section
      className={`relative pb-12 sm:pb-16 ${className}`}
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      <div className="max-w-6xl mx-auto sm:px-6">
        {/* Section Header */}
        {(title || titleOutline) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 text-center px-5 sm:px-0"
          >
            <h2
              className="text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                letterSpacing: "0.02em",
              }}
            >
              {title}{" "}
              {titleOutline && (
                <span
                  style={{
                    WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                    color: "transparent",
                  }}
                >
                  {titleOutline}
                </span>
              )}
            </h2>
            {subtitle && (
              <p className="text-white/35 text-sm mt-2">{subtitle}</p>
            )}
          </motion.div>
        )}

        {/* ── Desktop Cards – Flexbox zentriert (sm+) ── */}
        <div
          className="hidden sm:flex flex-wrap justify-center"
          style={{ gap: "16px" }}
        >
          {sorted.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: reduced ? 0 : 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.09,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "flex",
                flex: "1 1 0%",
                minWidth: "220px",
                maxWidth: "280px",
              }}
            >
              <PricingCard plan={plan} compact={compact} />
            </motion.div>
          ))}
        </div>

        {/* ── Mobile Cards – Snap-scroll carousel (< sm) ── */}
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto px-5 pb-2 pricing-scroll"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>{`.pricing-scroll::-webkit-scrollbar { display: none; }`}</style>
            {sorted.map((plan) => (
              <div
                key={plan.slug}
                className="shrink-0"
                style={{
                  width: "80%",
                  scrollSnapAlign: "start",
                }}
              >
                <PricingCard plan={plan} compact={compact} />
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          <MobileDots
            count={sorted.length}
            active={activeIdx}
            onDot={scrollTo}
          />
        </div>
      </div>
    </section>
  );
}
/**
 * PricingComparisonSection.tsx – Vergleichstabelle (Public)
 * Nur rendern wenn comparison.enabled === true
 */
import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { ComparisonModule } from "../../../lib/pricing-types";

function CellIcon({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-white/80" style={{ fontSize: "13px" }}>{value}</span>;
  }
  if (value) return <Check size={16} style={{ color: "#34D399" }} />;
  return <X size={16} style={{ color: "rgba(255,255,255,0.15)" }} />;
}

interface Props {
  comparison: ComparisonModule | null;
  className?: string;
}

export function PricingComparisonSection({ comparison, className = "" }: Props) {
  const columns = comparison?.columns ?? [];
  const rows = comparison?.rows ?? [];
  const { scrollRef, activeIdx, handleScroll, scrollTo } = useComparisonCarousel(columns.length);

  if (!comparison?.enabled || !columns.length) return null;

  return (
    <section
      className={`relative py-14 sm:py-20 ${className}`}
      style={{
        backgroundColor: "var(--surface-0)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              letterSpacing: "0.02em",
            }}
          >
            TARIFE IM{" "}
            <span
              style={{
                WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                color: "transparent",
              }}
            >
              VERGLEICH
            </span>
          </h2>
          <p className="text-white/35 text-sm mt-2">
            Alle Features auf einen Blick
          </p>
        </motion.div>

        {/* Desktop Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:block overflow-x-auto"
        >
          <table
            className="w-full"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <thead>
              <tr>
                <th
                  className="text-left py-5 px-4 align-bottom"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "rgba(255,255,255,0.3)",
                    width: "30%",
                  }}
                >
                  FEATURE
                </th>
                {columns.map((col) => (
                  <th
                    key={col.plan_slug}
                    className="text-center py-5 px-3 align-bottom relative"
                    style={{
                      borderBottom: col.is_featured
                        ? "2px solid rgba(202,12,133,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: col.is_featured
                        ? "rgba(202,12,133,0.04)"
                        : "transparent",
                      width: `${70 / columns.length}%`,
                    }}
                  >
                    {col.badge_text && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-white whitespace-nowrap"
                        style={{
                          background: "var(--brand)",
                          fontFamily: "var(--font-condensed)",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                        }}
                      >
                        {col.badge_text.toUpperCase()}
                      </span>
                    )}
                    <div
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        color: col.is_featured
                          ? "var(--brand)"
                          : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {col.plan_name.toUpperCase()}
                    </div>
                    <div
                      className="mt-1"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        color: col.is_featured ? "var(--brand)" : "white",
                        lineHeight: 1.2,
                      }}
                    >
                      {col.price}
                    </div>
                    <div className="text-white/25" style={{ fontSize: "10px" }}>
                      pro Monat
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <td
                    className="py-3.5 px-4 text-white/55"
                    style={{
                      fontSize: "13px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {row.feature}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.plan_slug}
                      className="py-3.5 px-3 text-center"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: col.is_featured
                          ? "rgba(202,12,133,0.03)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <CellIcon
                          value={row.values[col.plan_slug] ?? false}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile Cards – Snap-scroll carousel */}
        <div className="md:hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto pb-2 comparison-scroll"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>{`.comparison-scroll::-webkit-scrollbar { display: none; }`}</style>
            {columns.map((col) => (
              <div
                key={col.plan_slug}
                className="shrink-0 relative"
                style={{
                  width: "85%",
                  scrollSnapAlign: "start",
                  background: col.is_featured
                    ? "linear-gradient(160deg, rgba(202,12,133,0.1), rgba(202,12,133,0.03))"
                    : "var(--surface-2)",
                  border: col.is_featured
                    ? "1px solid rgba(202,12,133,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
              {col.badge_text && (
                <span
                  className="absolute -top-2.5 left-4 px-3 py-0.5 text-white"
                  style={{
                    background: "var(--brand)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                  }}
                >
                  {col.badge_text.toUpperCase()}
                </span>
              )}
              <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: col.is_featured
                      ? "var(--brand)"
                      : "rgba(255,255,255,0.5)",
                  }}
                >
                  {col.plan_name.toUpperCase()}
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.6rem",
                      color: col.is_featured ? "var(--brand)" : "white",
                      lineHeight: 1,
                    }}
                  >
                    {col.price}
                  </span>
                  <span className="text-white/25" style={{ fontSize: "10px" }}>
                    /mtl.
                  </span>
                </div>
              </div>
              <div className="px-5 pb-4">
                {rows
                  .filter(
                    (row) =>
                      row.values[col.plan_slug] === true ||
                      typeof row.values[col.plan_slug] === "string"
                  )
                  .map((row) => (
                    <div
                      key={row.feature}
                      className="flex items-center gap-2.5 py-1.5"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      <CellIcon value={row.values[col.plan_slug]} />
                      <span
                        className="text-white/55"
                        style={{ fontSize: "12px" }}
                      >
                        {row.feature}
                        {typeof row.values[col.plan_slug] === "string" &&
                          row.values[col.plan_slug] !== col.price && (
                            <span className="text-white/30 ml-1">
                              ({row.values[col.plan_slug]})
                            </span>
                          )}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="px-5 pb-5">
                <p
                  className="mb-2"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.2)",
                  }}
                >
                  NICHT ENTHALTEN
                </p>
                {rows
                  .filter((row) => row.values[col.plan_slug] === false)
                  .map((row) => (
                    <div
                      key={row.feature}
                      className="flex items-center gap-2.5 py-1"
                    >
                      <X
                        size={14}
                        style={{ color: "rgba(255,255,255,0.1)" }}
                      />
                      <span
                        className="text-white/25"
                        style={{ fontSize: "12px" }}
                      >
                        {row.feature}
                      </span>
                    </div>
                  ))}
              </div>
              </div>
            ))}
            <div className="shrink-0 w-4" aria-hidden="true" />
          </div>

          <ComparisonDots
            count={columns.length}
            active={activeIdx}
            onDot={scrollTo}
          />
        </div>
      </div>
    </section>
  );
}

// ── Mobile Carousel Hook ────────────────────────────────────────────────────
function useComparisonCarousel(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardW = el.offsetWidth * 0.85;
    const gap = 12;
    const idx = Math.round(scrollLeft / (cardW + gap));
    setActiveIdx(Math.min(Math.max(idx, 0), itemCount - 1));
  }, [itemCount]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.offsetWidth * 0.85;
    const gap = 12;
    el.scrollTo({ left: idx * (cardW + gap), behavior: "smooth" });
  }, []);

  return { scrollRef, activeIdx, handleScroll, scrollTo };
}

// ── Mobile Dots ─────────────────────────────────────────────────────────────
function ComparisonDots({
  count,
  active,
  onDot,
}: {
  count: number;
  active: number;
  onDot: (i: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 mt-4 md:hidden">
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
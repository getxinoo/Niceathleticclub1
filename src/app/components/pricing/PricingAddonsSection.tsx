/**
 * PricingAddonsSection.tsx – Add-on Karten (Public)
 */
import { motion } from "motion/react";
import { Zap, Plus } from "lucide-react";
import type { PublicAddon } from "../../../lib/pricing-types";

interface Props {
  addons: PublicAddon[];
  /** Optional CMS heading override. Undefined → renders the fixed design heading. */
  heading?: string;
  /** Optional CMS subtitle override. Undefined → renders the fixed design subtitle. */
  subtitle?: string;
  className?: string;
}

export function PricingAddonsSection({ addons, heading, subtitle, className = "" }: Props) {
  if (!addons.length) return null;

  const sorted = [...addons].sort((a, b) => a.sort_order - b.sort_order);

  // Beispielrechnung-Werte dynamisch berechnen
  const exampleBase = 69;
  const exampleAddon1 = sorted[0]?.options?.at(-1);
  const exampleAddon2 = sorted[1]?.options?.[0];
  const total =
    exampleBase + (exampleAddon1?.price ?? 0) + (exampleAddon2?.price ?? 0);

  return (
    <section
      className={`relative py-14 sm:py-20 ${className}`}
      style={{
        backgroundColor: "var(--surface-2)",
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
            {heading ?? (
              <>
                ADD-ONS ZU DEN{" "}
                <span
                  style={{
                    WebkitTextStroke: "2px rgba(240,240,240,0.7)",
                    color: "transparent",
                  }}
                >
                  ATHLETIC
                </span>{" "}
                TARIFEN
              </>
            )}
          </h2>
          <p className="text-white/35 text-sm mt-2">
            {subtitle ?? "Werden auf den Grundpreis aufgerechnet"}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
          {sorted.map((addon, gi) => (
            <motion.div
              key={addon.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: gi * 0.1 }}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Zap size={16} style={{ color: "var(--brand)" }} />
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {addon.name.toUpperCase()}
                </span>
              </div>
              {addon.description && (
                <div className="px-6 pt-3">
                  <p className="text-white/35 text-xs leading-relaxed">
                    {addon.description}
                  </p>
                </div>
              )}
              {addon.options.map((opt, optIdx) => (
                <div
                  key={`${addon.slug}-${optIdx}`}
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-white/55 text-sm">{opt.label}</span>
                  <span
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.4rem",
                      lineHeight: 1,
                    }}
                  >
                    +{opt.price}€
                  </span>
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Example Calculation */}
        {exampleAddon1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8 px-5 py-5"
            style={{
              background: "rgba(202,12,133,0.06)",
              border: "1px solid rgba(202,12,133,0.2)",
            }}
          >
            <p
              className="text-white/70 text-sm mb-2"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              BEISPIELRECHNUNG
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/60">Athletic ({exampleBase} €)</span>
              <Plus size={12} className="text-white/30" />
              <span className="text-white/60">
                {sorted[0]?.name} {exampleAddon1.label} (+{exampleAddon1.price} €)
              </span>
              {exampleAddon2 && (
                <>
                  <Plus size={12} className="text-white/30" />
                  <span className="text-white/60">
                    {sorted[1]?.name} (+{exampleAddon2.price} €)
                  </span>
                </>
              )}
              <span className="text-white/30">=</span>
              <span
                className="text-white"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}
              >
                {total} €
              </span>
              <span className="text-white/30 text-xs">/ Monat</span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
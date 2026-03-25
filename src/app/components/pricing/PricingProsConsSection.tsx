/**
 * PricingProsConsSection.tsx – Vor-/Nachteile pro Plan (Public)
 * Nur rendern wenn pros_cons.enabled === true
 */
import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import type { ProsConsModule } from "../../../lib/pricing-types";

interface Props {
  prosCons: ProsConsModule | null;
  className?: string;
}

export function PricingProsConsSection({ prosCons, className = "" }: Props) {
  if (!prosCons?.enabled || !prosCons.entries.length) return null;

  return (
    <div className={`mt-16 ${className}`}>
      <h3
        className="text-white mb-8"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.4rem, 3vw, 1.8rem)",
          letterSpacing: "0.02em",
        }}
      >
        VOR- &{" "}
        <span
          style={{
            WebkitTextStroke: "2px rgba(240,240,240,0.7)",
            color: "transparent",
          }}
        >
          NACHTEILE
        </span>
      </h3>

      <div
        className={`grid sm:grid-cols-2 ${
          prosCons.entries.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
        } gap-3 sm:gap-4`}
      >
        {prosCons.entries.map((entry, ci) => (
          <motion.div
            key={entry.plan_slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: ci * 0.08 }}
            className="relative"
            style={{
              background: entry.is_featured
                ? "linear-gradient(160deg, rgba(202,12,133,0.08), rgba(202,12,133,0.02))"
                : "var(--surface-2)",
              border: entry.is_featured
                ? "1px solid rgba(202,12,133,0.25)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Plan Name */}
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: entry.is_featured
                    ? "var(--brand)"
                    : "rgba(255,255,255,0.5)",
                }}
              >
                {entry.plan_name.toUpperCase()}
              </span>
              <span
                className="text-white/20 ml-2"
                style={{ fontSize: "12px" }}
              >
                {entry.price}
              </span>
            </div>

            {/* Pros */}
            <div className="px-5 pt-4 pb-2">
              <p
                className="mb-2"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "rgba(52,211,153,0.6)",
                }}
              >
                VORTEILE
              </p>
              {entry.pros.map((p) => (
                <div key={p} className="flex items-start gap-2 py-1.5">
                  <Check
                    size={13}
                    className="shrink-0 mt-0.5"
                    style={{ color: "#34D399" }}
                  />
                  <span
                    className="text-white/55"
                    style={{ fontSize: "12px", lineHeight: 1.5 }}
                  >
                    {p}
                  </span>
                </div>
              ))}
            </div>

            {/* Cons */}
            <div className="px-5 pt-2 pb-5">
              <p
                className="mb-2"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "rgba(239,68,68,0.5)",
                }}
              >
                EINSCHRÄNKUNGEN
              </p>
              {entry.cons.map((c) => (
                <div key={c} className="flex items-start gap-2 py-1.5">
                  <Minus
                    size={13}
                    className="shrink-0 mt-0.5"
                    style={{ color: "rgba(239,68,68,0.4)" }}
                  />
                  <span
                    className="text-white/35"
                    style={{ fontSize: "12px", lineHeight: 1.5 }}
                  >
                    {c}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
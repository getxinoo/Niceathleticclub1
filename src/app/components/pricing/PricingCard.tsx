/**
 * PricingCard.tsx – Einzelne Preiskarte (Public)
 *
 * WICHTIG: Diese Komponente ist ein reines `<div>` (kein motion.div),
 * damit CSS-Grid die Höhe korrekt ausgleichen kann.
 * Einblend-Animationen werden vom Parent-Grid-Wrapper gesteuert.
 */
import { CheckCircle2, GraduationCap, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import type { PublicPlan } from "../../../lib/pricing-types";

interface PricingCardProps {
  plan: PublicPlan;
  compact?: boolean;
}

export function PricingCard({ plan, compact = false }: PricingCardProps) {
  const featured = plan.is_featured;

  return (
    <div
      className="relative flex flex-col transition-all duration-300"
      style={{
        width: "100%",
        height: "100%",
        padding: compact ? "20px" : "28px",
        background: featured
          ? "linear-gradient(160deg, rgba(202,12,133,0.12), rgba(202,12,133,0.04))"
          : "rgba(255,255,255,0.02)",
        border: featured
          ? "1px solid rgba(202,12,133,0.35)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = featured ? "translateY(-4px)" : "translateY(-2px)";
        el.style.borderColor = featured
          ? "rgba(202,12,133,0.55)"
          : "rgba(202,12,133,0.25)";
        el.style.boxShadow = featured
          ? "0 0 30px rgba(202,12,133,0.18)"
          : "0 8px 30px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.borderColor = featured
          ? "rgba(202,12,133,0.35)"
          : "rgba(255,255,255,0.06)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Badge */}
      {plan.badge_text && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-white whitespace-nowrap z-10"
          style={{
            background: "var(--brand)",
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          {plan.badge_text.toUpperCase()}
        </div>
      )}

      {/* Plan Name */}
      <div
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.35)",
          marginBottom: "12px",
        }}
      >
        {plan.name.toUpperCase()}
      </div>

      {/* Price */}
      <div className="flex items-end gap-2" style={{ marginBottom: "4px" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? "2.2rem" : "2.8rem",
            color: featured ? "var(--brand)" : "white",
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {plan.price}€
        </span>
      </div>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>
        {plan.period}
      </p>

      {/* Student Price */}
      {plan.student_price && (
        <div
          className="flex items-center gap-2.5"
          style={{
            marginTop: "12px",
            marginBottom: "8px",
            padding: "10px 12px",
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.18)",
          }}
        >
          <GraduationCap size={15} className="shrink-0" style={{ color: "#34D399" }} />
          <div>
            <p
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(52,211,153,0.7)",
                marginBottom: "2px",
              }}
            >
              SCHÜLER & STUDENTEN
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.3rem",
                  color: "#34D399",
                  lineHeight: 1,
                }}
              >
                {plan.student_price}€
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                {plan.period}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Restrictions */}
      {plan.restrictions && (
        <div
          style={{
            marginTop: "8px",
            marginBottom: "12px",
            padding: "8px 12px",
            background: "rgba(255,180,0,0.06)",
            border: "1px solid rgba(255,180,0,0.15)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(245,158,11,0.7)",
            }}
          >
            {plan.restrictions}
          </p>
        </div>
      )}

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          lineHeight: "1.6",
          color: "rgba(255,255,255,0.45)",
          marginTop: "8px",
          marginBottom: "20px",
        }}
      >
        {plan.description}
      </p>

      {/* Features – flex:1 drückt alles darunter ans Ende */}
      <ul className="space-y-2.5" style={{ flex: "1 1 auto", marginBottom: "24px" }}>
        {plan.features.map((f, fIdx) => (
          <li key={`${plan.slug}-f-${fIdx}`} className="flex items-start gap-2.5">
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: featured ? "var(--brand)" : "rgba(255,255,255,0.2)" }}
            />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA – mt-auto als Backup falls flex:1 nicht reicht */}
      {plan.show_cta && (
        <Link
          to={plan.cta_url || "/probetraining"}
          className="flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            marginTop: "auto",
            padding: "14px 16px",
            minHeight: "48px",
            background: featured ? "var(--brand)" : "transparent",
            border: featured ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
            color: featured ? "white" : "rgba(255,255,255,0.7)",
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            if (featured) {
              e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            } else {
              e.currentTarget.style.borderColor = "var(--brand)";
              e.currentTarget.style.background = "rgba(202,12,133,0.08)";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
            if (!featured) {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }
          }}
        >
          {plan.cta_text || "Jetzt starten"}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

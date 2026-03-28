/**
 * PricingNoticeBlock.tsx – Hinweisblöcke (Vertrag, Blaulicht, etc.)
 */
import { motion } from "motion/react";
import { Shield, AlertTriangle, Info } from "lucide-react";
import type { PublicNotice, PublicPlan } from "../../../lib/pricing-types";

const NOTICE_STYLES: Record<
  string,
  { bg: string; border: string; icon: typeof Shield; iconColor: string }
> = {
  contract: {
    bg: "rgba(255,255,255,0.02)",
    border: "rgba(255,255,255,0.06)",
    icon: Shield,
    iconColor: "var(--brand)",
  },
  blaulicht: {
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.2)",
    icon: AlertTriangle,
    iconColor: "#3B82F6",
  },
  info: {
    bg: "rgba(255,255,255,0.02)",
    border: "rgba(255,255,255,0.06)",
    icon: Info,
    iconColor: "rgba(255,255,255,0.5)",
  },
  warning: {
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.2)",
    icon: AlertTriangle,
    iconColor: "#F59E0B",
  },
};

interface Props {
  notices: PublicNotice[];
  plans?: PublicPlan[];
  className?: string;
}

export function PricingNoticeBlock({ notices, plans = [], className = "" }: Props) {
  if (!notices.length) return null;

  const sorted = [...notices]
    .filter((n) => n.type !== "blaulicht")
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section
      className={`relative py-12 sm:py-16 ${className}`}
      style={{
        backgroundColor: "var(--surface-0)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 space-y-4 sm:space-y-6">
        {sorted.map((notice) => {
          const style = NOTICE_STYLES[notice.type] ?? NOTICE_STYLES.info;
          const Icon = style.icon;

          return (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="px-4 sm:px-6 py-5 sm:py-6 flex items-start gap-3 sm:gap-4"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <Icon
                size={20}
                className="shrink-0 mt-0.5"
                style={{ color: style.iconColor }}
              />
              <div>
                <p
                  className="text-white/80 text-sm mb-1"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  {notice.title.toUpperCase()}
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  {notice.text}
                </p>

                {/* Blaulicht: Zeige Rabattpreise */}
                {notice.type === "blaulicht" && plans.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {plans
                      .filter((p) => p.blaulicht_discount)
                      .map((p) => (
                        <span
                          key={p.slug}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs"
                          style={{
                            background: "rgba(59,130,246,0.08)",
                            border: "1px solid rgba(59,130,246,0.15)",
                            fontFamily: "var(--font-condensed)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {p.name}: {p.price - (p.blaulicht_discount ?? 0)} €
                          <span className="text-white/25 line-through">
                            {p.price} €
                          </span>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
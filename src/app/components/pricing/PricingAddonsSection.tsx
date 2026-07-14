/**
 * PricingAddonsSection.tsx – Add-on Karten (geteilt: Public + Admin-Vorschau)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendert die Add-on-Karten aus der Pricing-API mit optionaler CMS-Layout-
 * Konfiguration (Raster Auto/Custom-Slots, Ausrichtung, Beispielrechnung).
 * Ohne Konfiguration ist die Ausgabe 1:1 das bisherige Live-Design
 * (2-Spalten-Raster + automatische Beispielrechnung).
 *
 * Zeilen: leftText/rightText sind Freitext (Fallback: label / "+{price}€"),
 * optional mit description-Unterzeile. Karten wachsen/schrumpfen natürlich
 * mit ihrer Zeilenzahl – kein Clipping, die Beispielrechnung folgt im
 * normalen Dokumentfluss.
 *
 * Custom-Raster (Desktop lg): festes 6-Slot-Raster
 *   [ Slot 1 ][ Slot 2 ][ Slot 3 ]
 *   [ Slot 4 ][ Slot 5 ][ Slot 6 ]
 * Karten mit Slot 1–6 werden explizit platziert (Konflikt: erste Karte
 * gewinnt, weitere fließen unten nach); Karten ohne Slot sowie Nr. 7+
 * folgen darunter in gespeicherter Reihenfolge. Unbesetzte Slot-Zeilen
 * kollabieren (keine Phantom-Zeilen). Tablet: max. 2 Spalten Auto-Fluss,
 * Mobil: exakt 1 Spalte – jeweils in gespeicherter Reihenfolge.
 */
import { motion } from "motion/react";
import {
  Zap, Plus, Dumbbell, Heart, Star, Shield, Coffee, Users, Clock,
  Award, Target, TrendingUp, Flame, Sparkles, Waves, Sun,
} from "lucide-react";
import type { PublicAddon } from "../../../lib/pricing-types";
import type { AddonGridConfig, AddonCalculationConfig } from "../../../data/blocks";

// Icon-Whitelist – muss PR_ALLOWED_ICONS in api/pricing.php entsprechen.
const ADDON_ICONS: Record<string, typeof Zap> = {
  Zap, Dumbbell, Heart, Star, Shield, Coffee, Users, Clock,
  Award, Target, TrendingUp, Flame, Sparkles, Waves, Sun, Plus,
};

interface Props {
  addons: PublicAddon[];
  /** Optional CMS heading override. Undefined → renders the fixed design heading. */
  heading?: string;
  /** Optional CMS subtitle override. Undefined → renders the fixed design subtitle. */
  subtitle?: string;
  grid?: AddonGridConfig;
  /** undefined → automatische Legacy-Beispielrechnung; visible:false → keine. */
  calculation?: AddonCalculationConfig;
  className?: string;
}

const CUSTOM_GRID_CSS = `
@media (min-width: 1024px) {
  .nac-addons-custom { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .nac-addons-custom > .nac-addon-s1 { grid-column: 1; grid-row: 1; }
  .nac-addons-custom > .nac-addon-s2 { grid-column: 2; grid-row: 1; }
  .nac-addons-custom > .nac-addon-s3 { grid-column: 3; grid-row: 1; }
  .nac-addons-custom > .nac-addon-s4 { grid-column: 1; grid-row: 2; }
  .nac-addons-custom > .nac-addon-s5 { grid-column: 2; grid-row: 2; }
  .nac-addons-custom > .nac-addon-s6 { grid-column: 3; grid-row: 2; }
}
`;

function AddonCard({ addon, index, slotClass }: { addon: PublicAddon; index: number; slotClass?: string }) {
  const Icon = (addon.icon && ADDON_ICONS[addon.icon]) || Zap;
  return (
    <motion.div
      className={slotClass}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: Math.min(index, 5) * 0.1 }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        alignSelf: "start",
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Icon size={16} style={{ color: "var(--brand)" }} />
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
          <p className="text-white/35 text-xs leading-relaxed">{addon.description}</p>
        </div>
      )}
      {addon.options.map((opt, optIdx) => {
        const left = opt.leftText ?? opt.label;
        const right = opt.rightText ?? `+${opt.price}€`;
        return (
          <div
            key={`${addon.slug}-${optIdx}`}
            className="px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55 text-sm">{left}</span>
              <span
                className="text-white text-right"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", lineHeight: 1 }}
              >
                {right}
              </span>
            </div>
            {opt.description && (
              <p className="text-white/30 text-xs leading-relaxed mt-1">{opt.description}</p>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

export function PricingAddonsSection({
  addons,
  heading,
  subtitle,
  grid,
  calculation,
  className = "",
}: Props) {
  if (!addons.length) return null;

  const sorted = [...addons].sort((a, b) => a.sort_order - b.sort_order);

  const mode = grid?.mode === "custom" ? "custom" : "auto";
  const columns = Math.min(3, Math.max(1, Number(grid?.columns ?? 2))) as 1 | 2 | 3;
  const align = grid?.align === "center" ? "center" : grid?.align === "right" ? "right" : "left";

  // Custom-Modus: Slots 1–6 eindeutig vergeben (Konflikt → erste Karte gewinnt,
  // Rest fließt unten nach), slotlose Karten + Nr. 7+ in gespeicherter Reihenfolge.
  let slotted: PublicAddon[] = [];
  let flowing: PublicAddon[] = sorted;
  if (mode === "custom") {
    const taken = new Set<number>();
    slotted = [];
    flowing = [];
    for (const a of sorted) {
      if (a.slot && a.slot >= 1 && a.slot <= 6 && !taken.has(a.slot)) {
        taken.add(a.slot);
        slotted.push(a);
      } else {
        flowing.push(a);
      }
    }
  }

  const autoColsClass =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2";
  const alignStyle: React.CSSProperties =
    align === "center"
      ? { maxWidth: columns === 1 ? 560 : undefined, marginLeft: "auto", marginRight: "auto" }
      : align === "right"
      ? { maxWidth: columns === 1 ? 560 : undefined, marginLeft: "auto" }
      : {};

  // ── Beispielrechnung ────────────────────────────────────────────────────────
  // Konfiguriert → ausschließlich Konfiguration rendern (visible-Gate).
  // Unkonfiguriert → automatische Legacy-Rechnung (bisheriges Live-Verhalten).
  const hasCalcConfig =
    calculation !== undefined &&
    calculation !== null &&
    ((calculation.items?.length ?? 0) > 0 || !!calculation.totalValue || calculation.visible === false);

  const exampleBase = 69;
  const exampleAddon1 = sorted[0]?.options?.at(-1);
  const exampleAddon2 = sorted[1]?.options?.[0];
  const legacyTotal = exampleBase + (exampleAddon1?.price ?? 0) + (exampleAddon2?.price ?? 0);

  const calcVisible = hasCalcConfig ? calculation!.visible !== false : !!exampleAddon1;
  const calcItems = hasCalcConfig
    ? (calculation!.items ?? []).filter((it) => it.visible !== false && (it.label || it.value))
    : [];

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
          style={{ textAlign: align === "center" ? "center" : undefined }}
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
        {mode === "custom" ? (
          <>
            <style>{CUSTOM_GRID_CSS}</style>
            {slotted.length > 0 && (
              <div className="nac-addons-custom grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
                {slotted.map((addon, i) => (
                  <AddonCard key={addon.slug} addon={addon} index={i} slotClass={`nac-addon-s${addon.slot}`} />
                ))}
              </div>
            )}
            {flowing.length > 0 && (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start ${slotted.length > 0 ? "mt-4 sm:mt-5" : ""}`}>
                {flowing.map((addon, i) => (
                  <AddonCard key={addon.slug} addon={addon} index={slotted.length + i} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={`grid grid-cols-1 ${autoColsClass} gap-4 sm:gap-5 items-start`} style={alignStyle}>
            {sorted.map((addon, i) => (
              <AddonCard key={addon.slug} addon={addon} index={i} />
            ))}
          </div>
        )}

        {/* Beispielrechnung */}
        {calcVisible && (
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
              {hasCalcConfig ? (calculation!.heading || "BEISPIELRECHNUNG") : "BEISPIELRECHNUNG"}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {hasCalcConfig ? (
                <>
                  {calcItems.map((it, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <Plus size={12} className="text-white/30" />}
                      <span className="text-white/60">
                        {it.label}{it.label && it.value ? " " : ""}{it.value && !it.label ? it.value : it.value ? `(${it.value})` : ""}
                      </span>
                    </span>
                  ))}
                  <span className="text-white/30">{calculation!.totalLabel || "="}</span>
                  <span
                    className="text-white"
                    style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}
                  >
                    {calculation!.totalValue}
                  </span>
                  {calculation!.suffix && (
                    <span className="text-white/30 text-xs">{calculation!.suffix}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-white/60">Athletic ({exampleBase} €)</span>
                  <Plus size={12} className="text-white/30" />
                  <span className="text-white/60">
                    {sorted[0]?.name} {exampleAddon1!.leftText ?? exampleAddon1!.label} (+{exampleAddon1!.price} €)
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
                    {legacyTotal} €
                  </span>
                  <span className="text-white/30 text-xs">/ Monat</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

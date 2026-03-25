import { motion } from "motion/react";
import { Check, X, Minus } from "lucide-react";

// ── Comparison Data ──────────────────────────────────────────────────────────
interface ComparisonRow {
  feature: string;
  weekend: boolean | string;
  athletic: boolean | string;
  nicest: boolean | string;
  unlimited: boolean | string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { feature: "Monatspreis", weekend: "39 €", athletic: "69 €", nicest: "104 €", unlimited: "119 €" },
  { feature: "Trainingszeiten", weekend: "Fr–So", athletic: "Täglich", nicest: "Täglich", unlimited: "Täglich" },
  { feature: "Öffnungszeiten 5:00–00:00", weekend: true, athletic: true, nicest: true, unlimited: true },
  { feature: "Alle Geräte & Freiflächen", weekend: true, athletic: true, nicest: true, unlimited: true },
  { feature: "1.500+ qm Trainingsfläche", weekend: true, athletic: true, nicest: true, unlimited: true },
  { feature: "NAC App-Zugang", weekend: true, athletic: true, nicest: true, unlimited: true },
  { feature: "Training unter der Woche (Mo–Do)", weekend: false, athletic: true, nicest: true, unlimited: true },
  { feature: "Schüler/Studenten-Rabatt", weekend: false, athletic: "49 €", nicest: false, unlimited: false },
  { feature: "Nice Fitness & Spa Eislingen", weekend: false, athletic: false, nicest: true, unlimited: false },
  { feature: "E-Gym Zugang", weekend: false, athletic: false, nicest: true, unlimited: false },
  { feature: "Sauna & Solarium", weekend: false, athletic: false, nicest: true, unlimited: false },
  { feature: "Massageliege", weekend: false, athletic: false, nicest: true, unlimited: false },
  { feature: "Kurse in Eislingen", weekend: false, athletic: false, nicest: true, unlimited: false },
  { feature: "CrossFit Kurse (Unlimited)", weekend: false, athletic: false, nicest: false, unlimited: true },
  { feature: "HYROX Kurse (Unlimited)", weekend: false, athletic: false, nicest: false, unlimited: true },
  { feature: "Blaulicht-Rabatt (−10 €)", weekend: false, athletic: true, nicest: true, unlimited: true },
  { feature: "Keine Mindestlaufzeit", weekend: true, athletic: true, nicest: true, unlimited: true },
  { feature: "Monatlich kündbar", weekend: true, athletic: true, nicest: true, unlimited: true },
];

const PLAN_COLUMNS = [
  { key: "weekend" as const, label: "Weekend", price: "39 €" },
  { key: "athletic" as const, label: "Athletic", price: "69 €" },
  { key: "nicest" as const, label: "Nicest", price: "104 €", highlight: true, badge: "Klassiker" },
  { key: "unlimited" as const, label: "Unlimited", price: "119 €" },
];

// ── Pros & Cons per plan ─────────────────────────────────────────────────────
interface ProCon {
  pros: string[];
  cons: string[];
}

const PROS_CONS: Record<string, ProCon> = {
  weekend: {
    pros: ["Günstigster Einstieg", "Voller Zugang am Wochenende", "Gleiche Ausstattung wie Athletic"],
    cons: ["Kein Training Mo–Do", "Kein Schüler-Rabatt", "Keine Kurse inklusive"],
  },
  athletic: {
    pros: ["Bestes Preis-Leistungs-Verhältnis", "Tägliches Training", "Schüler-Rabatt verfügbar", "Blaulicht-Rabatt"],
    cons: ["Keine Kurse inklusive", "Kein Spa-Zugang"],
  },
  nicest: {
    pros: ["2 Standorte (Göppingen + Eislingen)", "Sauna, Solarium & Massageliege", "E-Gym & Kurse in Eislingen", "Blaulicht-Rabatt"],
    cons: ["Höherer Preis als Athletic", "CrossFit/HYROX nur als Add-on"],
  },
  unlimited: {
    pros: ["Unbegrenzte CrossFit & HYROX Kurse", "Maximale Flexibilität", "All-in-one für Kurs-Enthusiasten"],
    cons: ["Höchster Preis", "Kein Spa-Zugang", "Kein Schüler-Rabatt"],
  },
};

function CellIcon({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-white/80" style={{ fontSize: "13px" }}>
        {value}
      </span>
    );
  }
  if (value) {
    return <Check size={16} style={{ color: "#34D399" }} />;
  }
  return <X size={16} style={{ color: "rgba(255,255,255,0.15)" }} />;
}

export function PlanComparisonTable() {
  return (
    <section
      className="py-20 relative"
      style={{ backgroundColor: "var(--surface-0)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
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
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "0.02em" }}
          >
            TARIFE IM{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>VERGLEICH</span>
          </h2>
          <p className="text-white/35 text-sm mt-2">Alle Features auf einen Blick</p>
        </motion.div>

        {/* ── Desktop Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:block overflow-x-auto"
        >
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            {/* Column Headers */}
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
                {PLAN_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="text-center py-5 px-3 align-bottom relative"
                    style={{
                      borderBottom: col.highlight
                        ? "2px solid rgba(202,12,133,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: col.highlight ? "rgba(202,12,133,0.04)" : "transparent",
                      width: "17.5%",
                    }}
                  >
                    {col.badge && (
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
                        {col.badge.toUpperCase()}
                      </span>
                    )}
                    <div
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        color: col.highlight ? "var(--brand)" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {col.label.toUpperCase()}
                    </div>
                    <div
                      className="mt-1"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        color: col.highlight ? "var(--brand)" : "white",
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

            {/* Rows */}
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
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
                  {PLAN_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="py-3.5 px-3 text-center"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: col.highlight ? "rgba(202,12,133,0.03)" : "transparent",
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <CellIcon value={row[col.key]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* ── Mobile Cards ── */}
        <div className="md:hidden space-y-4">
          {PLAN_COLUMNS.map((col, ci) => (
            <motion.div
              key={col.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: ci * 0.08 }}
              className="relative"
              style={{
                background: col.highlight
                  ? "linear-gradient(160deg, rgba(202,12,133,0.1), rgba(202,12,133,0.03))"
                  : "var(--surface-2)",
                border: col.highlight
                  ? "1px solid rgba(202,12,133,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {col.badge && (
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
                  {col.badge.toUpperCase()}
                </span>
              )}

              {/* Card Header */}
              <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: col.highlight ? "var(--brand)" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {col.label.toUpperCase()}
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.6rem",
                      color: col.highlight ? "var(--brand)" : "white",
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

              {/* Included features */}
              <div className="px-5 pb-4">
                {COMPARISON_ROWS.filter((row) => row[col.key] === true || typeof row[col.key] === "string").map(
                  (row) => (
                    <div
                      key={row.feature}
                      className="flex items-center gap-2.5 py-1.5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <CellIcon value={row[col.key]} />
                      <span className="text-white/55" style={{ fontSize: "12px" }}>
                        {row.feature}
                        {typeof row[col.key] === "string" &&
                          row[col.key] !== col.price && (
                            <span className="text-white/30 ml-1">({row[col.key]})</span>
                          )}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Not included */}
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
                {COMPARISON_ROWS.filter((row) => row[col.key] === false).map((row) => (
                  <div
                    key={row.feature}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <X size={14} style={{ color: "rgba(255,255,255,0.1)" }} />
                    <span className="text-white/25" style={{ fontSize: "12px" }}>
                      {row.feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Pros & Cons ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16"
        >
          <h3
            className="text-white mb-8"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 3vw, 1.8rem)", letterSpacing: "0.02em" }}
          >
            VOR- &{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>NACHTEILE</span>
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_COLUMNS.map((col, ci) => {
              const pc = PROS_CONS[col.key];
              return (
                <motion.div
                  key={col.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: ci * 0.08 }}
                  className="relative"
                  style={{
                    background: col.highlight
                      ? "linear-gradient(160deg, rgba(202,12,133,0.08), rgba(202,12,133,0.02))"
                      : "var(--surface-2)",
                    border: col.highlight
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
                        color: col.highlight ? "var(--brand)" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {col.label.toUpperCase()}
                    </span>
                    <span className="text-white/20 ml-2" style={{ fontSize: "12px" }}>
                      {col.price}
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
                    {pc.pros.map((p) => (
                      <div key={p} className="flex items-start gap-2 py-1.5">
                        <Check size={13} className="shrink-0 mt-0.5" style={{ color: "#34D399" }} />
                        <span className="text-white/55" style={{ fontSize: "12px", lineHeight: 1.5 }}>
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
                    {pc.cons.map((c) => (
                      <div key={c} className="flex items-start gap-2 py-1.5">
                        <Minus size={13} className="shrink-0 mt-0.5" style={{ color: "rgba(239,68,68,0.4)" }} />
                        <span className="text-white/35" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                          {c}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

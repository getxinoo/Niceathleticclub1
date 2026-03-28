import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, ArrowRight, Newspaper, Download,
  Mail, Phone, Image, FileText, ExternalLink, Quote,
  Monitor, BookOpen, Tv, Radio, Mic, Loader2,
  Filter, X, Calendar,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { PageHero } from "../components/ui/legal-page";
import { pressApi, type PressArticle, type MediaType } from "../../api/press";

// ── MediaType icon helper ─────────────────────────────────────────────────────
function mediaIcon(t: MediaType) {
  switch (t) {
    case "Online":         return Monitor;
    case "Print":          return BookOpen;
    case "Print / Online": return BookOpen;
    case "TV":             return Tv;
    case "Radio":          return Radio;
    case "Podcast":        return Mic;
    default:               return Monitor;
  }
}

// ── Format date ───────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── Brand assets ───────────────────────────────────────────────────────────────
const ASSETS = [
  { icon: Image,    label: "Logo-Paket",        desc: "SVG, PNG (weiss / farbe / schwarz), verschiedene Formate", size: "2.4 MB" },
  { icon: Image,    label: "Bildmaterial",       desc: "Hochaufloesende Studio-Fotos, Trainingsbilder, Portraitfotos", size: "48 MB" },
  { icon: FileText, label: "Fact Sheet",         desc: "Unternehmenskennzahlen, Standort-Facts, Gruendungsgeschichte", size: "420 KB" },
  { icon: FileText, label: "Pressemappe (PDF)",  desc: "Vollstaendige Presse-Kit inkl. Biografie Geschaeftsfuehrung", size: "8.1 MB" },
];

// ── Filter chip component ─────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 transition-all duration-200 active:scale-[0.97] shrink-0"
      style={{
        background: active ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
        border: active ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(255,255,255,0.08)",
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: active ? "#fff" : "rgba(255,255,255,0.4)",
        minHeight: "36px",
      }}
    >
      {label}
      {count != null && (
        <span
          className="ml-0.5"
          style={{
            fontSize: "9px",
            padding: "1px 5px",
            background: active ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.06)",
            color: active ? "#fff" : "rgba(255,255,255,0.3)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Download card ─────────────────────────────────────────────────────────────
function AssetCard({ icon: Icon, label, desc, size }: { icon: React.ElementType; label: string; desc: string; size: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden flex items-start gap-4 p-5 transition-all duration-300"
      style={{
        background: hovered ? "linear-gradient(135deg, rgba(202,12,133,0.07) 0%, rgba(17,17,17,0.98) 60%)" : "var(--surface-2)",
        border: hovered ? "1px solid rgba(202,12,133,0.35)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 0 30px rgba(202,12,133,0.1)" : "none",
      }}
    >
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.3))" }}
      />
      <div className="w-10 h-10 flex items-center justify-center shrink-0"
        style={{ background: hovered ? "rgba(202,12,133,0.18)" : "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)", transition: "background 0.3s" }}>
        <Icon size={16} style={{ color: "var(--brand)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-white"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}>
            {label}
          </p>
          <span className="text-white/25 text-xs shrink-0">{size}</span>
        </div>
        <p className="text-white/45 text-xs mt-1 leading-relaxed">{desc}</p>
      </div>
      <button
        className="shrink-0 w-8 h-8 flex items-center justify-center transition-all duration-200"
        title="Download anfragen"
        style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(202,12,133,0.25)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(202,12,133,0.1)"; }}
      >
        <Download size={13} style={{ color: "var(--brand)" }} />
      </button>
    </motion.div>
  );
}

// ── Press card ────────────────────────────────────────────────────────────────
function PressCard({ item, index }: { item: PressArticle; index: number }) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const MIcon = mediaIcon(item.mediaType);
  let hostname = "";
  try { hostname = new URL(item.url).hostname.replace("www.", ""); } catch { hostname = ""; }

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden flex items-start gap-5 p-5 transition-all duration-300 group"
      style={{
        background: hovered ? "linear-gradient(135deg, rgba(202,12,133,0.06) 0%, rgba(17,17,17,0.98) 60%)" : "var(--surface-2)",
        border: hovered ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.3))" }}
      />

      {/* Thumbnail or icon */}
      {item.image ? (
        <div
          className="w-16 h-16 shrink-0 mt-0.5 overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}>
          <Quote size={14} style={{ color: "var(--brand)" }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-white/70"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em" }}>
            {item.outlet}
          </span>
          <span className="inline-flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)" }}>
            <MIcon size={9} />
            {formatDate(item.date)} &middot; {item.mediaType.toUpperCase()}
          </span>
        </div>
        <p className="text-white/55 text-sm leading-relaxed italic">{item.title}</p>
        {item.excerpt && (
          <p className="text-white/30 text-xs mt-2 leading-relaxed">{item.excerpt}</p>
        )}
        {hostname && (
          <span className="inline-flex items-center gap-1 mt-2 text-white/20 text-xs group-hover:text-brand/60 transition-colors">
            <ExternalLink size={9} />
            {hostname}
          </span>
        )}
      </div>
      <ExternalLink
        size={13}
        className="shrink-0 mt-1 transition-colors duration-200 hidden sm:block"
        style={{ color: hovered ? "var(--brand)" : "rgba(255,255,255,0.2)" }}
      />
    </motion.a>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Presse() {
  const reduced = useReducedMotion();
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  useEffect(() => {
    pressApi.list().then((data) => {
      setArticles(data);
      setLoading(false);
    });
  }, []);

  // ── Derive unique media types + years ─────────────────────────────────────
  const mediaTypes = useMemo(() => {
    const types = new Set(articles.map((a) => a.mediaType));
    return Array.from(types).sort();
  }, [articles]);

  const years = useMemo(() => {
    const yrs = new Set(articles.map((a) => a.date.slice(0, 4)));
    return Array.from(yrs).sort().reverse();
  }, [articles]);

  // ── Filtered articles ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (filterType !== "all" && a.mediaType !== filterType) return false;
      if (filterYear !== "all" && !a.date.startsWith(filterYear)) return false;
      return true;
    });
  }, [articles, filterType, filterYear]);

  const hasFilters = filterType !== "all" || filterYear !== "all";

  return (
    <>
      <PageMeta
        title="Presse & Medien | Nice Athletic Club Göppingen"
        description="Presseinformationen, Bildmaterial und Kontakt für Medien: Nice Athletic Club Göppingen – Deutschlands spannendste neue Gym-Story. CrossFit, HYROX & Premium Fitness im Industriehallen-Flair."
        canonical="https://nicefitness.de/presse"
      />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <PageHero
          ghostText="PRESSE"
          label="PRESSE & MEDIEN"
          titleA="PRES"
          titleB="SE"
          subtitle="Pressekontakt, Bildmaterial und Medienmitteilungen des Nice Athletic Club, Goeppingen"
          badges={[
            { label: "ERWAEHNUNGEN", val: `${articles.length}+` },
            { label: "SEIT",        val: "'19"              },
          ]}
          mobileTitle="Presse"
          mobileCta={{ label: "KONTAKT AUFNEHMEN", to: "/kontakt" }}
          backSlot={
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/35 hover:text-brand transition-colors duration-200"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em" }}
            >
              <ArrowLeft size={13} />
              ZURUECK
            </Link>
          }
        />

        <section className="pb-24 pt-10" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="relative max-w-5xl mx-auto px-6 space-y-16">

            {/* Pressekontakt */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-2 mb-4"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                <span className="w-5 h-px" style={{ background: "var(--brand)" }} />
                PRESSEKONTAKT
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Kontakt-Karte */}
                <div className="relative overflow-hidden p-6"
                  style={{ background: "var(--surface-2)", border: "1px solid rgba(202,12,133,0.2)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.2), transparent)" }} />
                  <div className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                    <Newspaper size={16} style={{ color: "var(--brand)" }} />
                  </div>
                  <p className="text-white mb-1"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em" }}>
                    MK Fitness &amp; Strength GmbH
                  </p>
                  <p className="text-white/50 text-xs mb-4">Pressestelle</p>
                  <div className="space-y-2.5">
                    <a href="mailto:presse@nice-fitness.de"
                      className="flex items-center gap-2.5 text-white/60 hover:text-brand transition-colors text-sm group">
                      <Mail size={13} style={{ color: "var(--brand)" }} />
                      presse@nice-fitness.de
                    </a>
                    <a href="tel:+4971619163663"
                      className="flex items-center gap-2.5 text-white/60 hover:text-brand transition-colors text-sm group">
                      <Phone size={13} style={{ color: "var(--brand)" }} />
                      +49 (0) 7161 / 9163663
                    </a>
                  </div>
                </div>

                {/* Reaktionszeit-Info */}
                <div className="p-6 flex flex-col justify-center gap-4"
                  style={{ background: "rgba(202,12,133,0.05)", border: "1px solid rgba(202,12,133,0.15)" }}>
                  {[
                    { label: "REAKTIONSZEIT",    val: "< 24 Stunden" },
                    { label: "INTERVIEWANFRAGEN", val: "Auf Anfrage"  },
                    { label: "EXKLUSIVE INHALTE", val: "Moeglich"      },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>{label}</span>
                      <span className="text-white/70 text-sm">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Brand Assets */}
            <div>
              <div className="inline-flex items-center gap-2 mb-6"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                <span className="w-5 h-px" style={{ background: "var(--brand)" }} />
                BRAND ASSETS & DOWNLOADS
              </div>
              <div className="space-y-3">
                {ASSETS.map((a) => <AssetCard key={a.label} {...a} />)}
              </div>
              <p className="mt-3 text-white/25 text-xs">
                * Alle Assets duerfen ausschliesslich im redaktionellen Kontext mit korrekter Quellenangabe genutzt werden.
              </p>
            </div>

            {/* Presseerwahnungen */}
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="inline-flex items-center gap-2"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                  <span className="w-5 h-px" style={{ background: "var(--brand)" }} />
                  IN DEN MEDIEN
                </div>
                {!loading && articles.length > 0 && (
                  <span className="text-white/20 text-xs" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}>
                    {filtered.length} von {articles.length} Beitraegen
                  </span>
                )}
              </div>

              {/* ── Filters ──────────────────────────────────────────────── */}
              {!loading && articles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mb-6 space-y-4"
                >
                  {/* Media Type Filter */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Filter size={11} className="text-white/25" />
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>
                        MEDIENART
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip
                        label="ALLE"
                        active={filterType === "all"}
                        count={articles.length}
                        onClick={() => setFilterType("all")}
                      />
                      {mediaTypes.map((t) => (
                        <FilterChip
                          key={t}
                          label={t.toUpperCase()}
                          active={filterType === t}
                          count={articles.filter((a) => a.mediaType === t).length}
                          onClick={() => setFilterType(filterType === t ? "all" : t)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Year Filter */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Calendar size={11} className="text-white/25" />
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>
                        JAHR
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip
                        label="ALLE"
                        active={filterYear === "all"}
                        onClick={() => setFilterYear("all")}
                      />
                      {years.map((y) => (
                        <FilterChip
                          key={y}
                          label={y}
                          active={filterYear === y}
                          count={articles.filter((a) => a.date.startsWith(y)).length}
                          onClick={() => setFilterYear(filterYear === y ? "all" : y)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Active filters summary */}
                  <AnimatePresence>
                    {hasFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-white/25 text-xs" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}>
                            Filter aktiv:
                          </span>
                          {filterType !== "all" && (
                            <button
                              onClick={() => setFilterType("all")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs transition-colors hover:bg-white/[0.06]"
                              style={{
                                background: "rgba(202,12,133,0.1)",
                                border: "1px solid rgba(202,12,133,0.25)",
                                color: "var(--brand)",
                                fontFamily: "var(--font-condensed)",
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                              }}
                            >
                              {filterType}
                              <X size={10} />
                            </button>
                          )}
                          {filterYear !== "all" && (
                            <button
                              onClick={() => setFilterYear("all")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs transition-colors hover:bg-white/[0.06]"
                              style={{
                                background: "rgba(202,12,133,0.1)",
                                border: "1px solid rgba(202,12,133,0.25)",
                                color: "var(--brand)",
                                fontFamily: "var(--font-condensed)",
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                              }}
                            >
                              {filterYear}
                              <X size={10} />
                            </button>
                          )}
                          <button
                            onClick={() => { setFilterType("all"); setFilterYear("all"); }}
                            className="text-white/30 hover:text-white/60 transition-colors text-xs ml-auto"
                            style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}
                          >
                            Alle zuruecksetzen
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── Articles List ─────────────────────────────────────── */}
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-white/30">
                  <Loader2 size={18} className="animate-spin" />
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", letterSpacing: "0.1em" }}>
                    Lade Presseberichte...
                  </span>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${filterType}-${filterYear}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    {filtered.map((item, i) => (
                      <PressCard key={item.id} item={item} index={i} />
                    ))}
                    {filtered.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-white/30 text-sm mb-3">
                          Keine Presseberichte fuer diesen Filter gefunden.
                        </p>
                        <button
                          onClick={() => { setFilterType("all"); setFilterYear("all"); }}
                          className="inline-flex items-center gap-2 px-4 py-2 text-brand transition-colors hover:text-brand-light"
                          style={{
                            border: "1px solid rgba(202,12,133,0.25)",
                            fontFamily: "var(--font-condensed)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            minHeight: "44px",
                          }}
                        >
                          <X size={12} />
                          FILTER ZURUECKSETZEN
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="relative overflow-hidden p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
              style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.22)" }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at left center, rgba(202,12,133,0.12), transparent 65%)" }} />
              <div className="relative">
                <p className="text-white mb-1"
                  style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "0.04em" }}>
                  INTERVIEWANFRAGE?
                </p>
                <p className="text-white/50 text-sm">Wir stehen fuer Interviews, Reportagen und Kooperationen bereit.</p>
              </div>
              <Link
                to="/kontakt"
                className="group relative inline-flex items-center gap-3 px-7 py-4 text-white shrink-0 transition-all duration-300 active:scale-[0.98]"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(202,12,133,0.4)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                KONTAKT AUFNEHMEN
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

          </div>
        </section>
      </motion.div>
    </>
  );
}
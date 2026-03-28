/**
 * AdminSeiten – Seitenverwaltung
 *
 * · Grid-Ansicht: 3-Spalten mit Desktop + Mobile Thumbnails (1:1 skaliert)
 * · Listen-Ansicht: kompakte Zeilen mit Block-Typ-Pills
 *
 * Block-Anzahl & Block-Typen werden live aus PAGE_INITIAL_BLOCKS abgeleitet.
 */

import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Pencil, Globe, Layers, LayoutGrid, List, FileText, Clock, Eye, EyeOff } from "lucide-react";
import {
  PAGE_INITIAL_BLOCKS,
  BLOCK_REGISTRY,
  type PageBlock,
  type BlockType,
} from "../../../data/blocks";
import { BlockPreview } from "../components/BlockPreview";
import { usePageVisibility, SLUG_TO_NAV_HREF } from "../../context/PageVisibilityContext";
import { NAV_ITEMS } from "../../../data/nav";

// ── Thumbnail Scaling ─────────────────────────────────────────────────────────
const DT_W  = 265;
const DT_CW = 1280;
const DT_SC = DT_W / DT_CW;
const DT_H  = 148;

const MB_SW = 76;
const MB_CW = 390;
const MB_SC = MB_SW / MB_CW;
const MB_H  = 148;

// ── Seitenliste ────────────────────────────���──────────────────────────────────
const PAGES = [
  { slug: "home",               title: "Startseite",          path: "/",                 category: "primary" as const, updatedAt: "2026-03-01" },
  { slug: "studio",             title: "Studio",              path: "/studio",            category: "primary" as const, updatedAt: "2026-03-01" },
  { slug: "kurse",              title: "Kurse",               path: "/kurse",             category: "primary" as const, updatedAt: "2026-02-28" },
  { slug: "preise",             title: "Preise",              path: "/preise",            category: "primary" as const, updatedAt: "2026-02-28" },
  { slug: "team",               title: "Team",                path: "/team",              category: "primary" as const, updatedAt: "2026-02-25" },
  { slug: "kontakt",            title: "Kontakt",             path: "/kontakt",           category: "primary" as const, updatedAt: "2026-02-24" },
  { slug: "probetraining",      title: "Probetraining",       path: "/probetraining",     category: "primary" as const, updatedAt: "2026-03-01" },
  { slug: "ueber-uns",          title: "Über uns",            path: "/ueber-uns",         category: "landing" as const, updatedAt: "2026-02-20" },
  { slug: "personal-training",  title: "Personal Training",   path: "/personal-training", category: "landing" as const, updatedAt: "2026-02-18" },
  { slug: "crossfit-gp",        title: "CrossFit Göppingen",  path: "/crossfit-gp",       category: "landing" as const, updatedAt: "2026-02-15" },
  { slug: "firmenfitness",      title: "Firmenfitness",       path: "/firmenfitness",     category: "landing" as const, updatedAt: "2026-02-12" },
  { slug: "athletic-area",      title: "Athletic Area",       path: "/athletic-area",     category: "landing" as const, updatedAt: "2026-02-10" },
  { slug: "hyrox",              title: "HYROX Zone",          path: "/hyrox",             category: "landing" as const, updatedAt: "2026-02-10" },
  { slug: "nice-theke",         title: "Nice Theke",          path: "/nice-theke",        category: "landing" as const, updatedAt: "2026-02-08" },
  { slug: "egym-wellpass",      title: "EGYM Wellpass",       path: "/egym-wellpass",     category: "landing" as const, updatedAt: "2026-03-23" },
  { slug: "karriere",           title: "Karriere",            path: "/karriere",          category: "landing" as const, updatedAt: "2026-02-05" },
  { slug: "presse",             title: "Presse",              path: "/presse",            category: "landing" as const, updatedAt: "2026-02-01" },
  { slug: "impressum",          title: "Impressum",           path: "/impressum",         category: "legal" as const,   updatedAt: "2026-01-01" },
  { slug: "datenschutz",        title: "Datenschutz",         path: "/datenschutz",       category: "legal" as const,   updatedAt: "2026-01-01" },
  { slug: "agb",                title: "AGB",                 path: "/agb",               category: "legal" as const,   updatedAt: "2026-01-01" },
];

type PageEntry = typeof PAGES[number];

const CAT = {
  primary: { label: "Hauptnav",    color: "#CA0C85" },
  landing: { label: "Landingpage", color: "#3b82f6" },
  legal:   { label: "Rechtlich",   color: "rgba(255,255,255,0.45)" },
};

// ── Block-Typ-Pill ────────────────────────────────────────────────────────────
function BlockPill({ type, small }: { type: BlockType; small?: boolean }) {
  const def = BLOCK_REGISTRY[type];
  return (
    <span
      title={def?.label ?? type}
      style={{
        fontSize: small ? 7 : 8,
        fontFamily: "var(--font-condensed)",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: def?.color ?? "rgba(255,255,255,0.3)",
        background: `${def?.color ?? "#ffffff"}12`,
        border: `1px solid ${def?.color ?? "#ffffff"}28`,
        padding: small ? "1px 5px" : "2px 7px",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {def?.label ?? type}
    </span>
  );
}

// ── Scaled Thumbnail ──────────────────────────────────────────────────────────
function ScaledThumbnail({
  blocks,
  mode,
  containerW,
  containerH,
  contentW,
  scale,
}: {
  blocks: PageBlock[];
  mode: "desktop" | "mobile";
  containerW: number;
  containerH: number;
  contentW: number;
  scale: number;
}) {
  return (
    <div style={{ width: containerW, height: containerH, overflow: "hidden", position: "relative", background: "#050505" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: contentW,
        transformOrigin: "top left", transform: `scale(${scale})`,
        pointerEvents: "none", userSelect: "none",
      }}>
        {blocks.length > 0 ? (
          blocks.map((block) => (
            <BlockPreview key={block.id} block={block} previewMode={mode} />
          ))
        ) : (
          <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
            <Layers size={48} style={{ color: "rgba(255,255,255,0.06)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function BrowserChrome({ width, path }: { width: number; path: string }) {
  return (
    <div style={{
      width, background: "#1d1d1d", borderRadius: "4px 4px 0 0",
      padding: "5px 8px", display: "flex", alignItems: "center", gap: "3px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 5, height: 5, borderRadius: "50%", background: c, opacity: 0.65, flexShrink: 0 }} />
      ))}
      <div style={{ flex: 1, marginLeft: 5, height: 9, borderRadius: 2, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", paddingLeft: 5, overflow: "hidden" }}>
        <span style={{ fontSize: 4.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          nice-athletic-club.de{path}
        </span>
      </div>
    </div>
  );
}

function PhoneFrame({ screenW, screenH, children }: { screenW: number; screenH: number; children: React.ReactNode }) {
  const frameW = screenW + 10;
  return (
    <div>
      <div style={{ width: frameW, borderRadius: "9px 9px 6px 6px", border: "2px solid rgba(255,255,255,0.2)", background: "#1c1c1c", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
        <div style={{ height: 10, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 22, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>
        <div style={{ margin: "0 5px" }}>{children}</div>
        <div style={{ height: 10, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 24, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.22)" }} />
        </div>
      </div>
      <p style={{ textAlign: "center", marginTop: 4, fontFamily: "var(--font-condensed)", fontSize: 6.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>
        MOBILE
      </p>
    </div>
  );
}

// ── Visibility Toggle ─────────────────────────────────────────────────────────
function VisibilityToggle({ slug }: { slug: string }) {
  const { isVisible, setVisible } = usePageVisibility();
  const visible = isVisible(slug);
  const navHref = SLUG_TO_NAV_HREF[slug];

  return (
    <button
      onClick={() => setVisible(slug, !visible)}
      title={visible ? "Seite ausblenden" : "Seite einblenden"}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "7px 11px",
        background: visible ? "rgba(40,200,64,0.08)" : "rgba(239,68,68,0.08)",
        border: `1px solid ${visible ? "rgba(40,200,64,0.2)" : "rgba(239,68,68,0.2)"}`,
        fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: visible ? "rgba(40,200,64,0.8)" : "rgba(239,68,68,0.7)",
        cursor: "pointer", flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {/* Toggle track */}
      <div style={{
        width: 22, height: 12, borderRadius: 6, position: "relative",
        background: visible ? "rgba(40,200,64,0.3)" : "rgba(239,68,68,0.2)",
        transition: "background 0.2s",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", position: "absolute", top: 2,
          left: visible ? 12 : 2,
          background: visible ? "#28c840" : "#ef4444",
          transition: "left 0.2s, background 0.2s",
        }} />
      </div>
      {visible ? "Sichtbar" : "Ausgeblendet"}
      {navHref && !visible && (
        <span style={{ fontSize: 7, color: "rgba(239,68,68,0.5)", marginLeft: 2 }}>
          (Nav hidden)
        </span>
      )}
    </button>
  );
}

// ── Nav Override Button ────────────────────────────────────────────────────────
function NavOverrideButton({ slug, onOpen }: { slug: string; onOpen: () => void }) {
  const navHref = SLUG_TO_NAV_HREF[slug];
  const { navOverrides, isVisible } = usePageVisibility();
  if (!navHref) return null; // Only show for nav-linked pages

  const hasOverride = !!navOverrides[navHref]?.customHref;
  const hidden = !isVisible(slug);

  return (
    <button
      onClick={onOpen}
      title="Nav-Override konfigurieren"
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "7px 11px",
        background: hasOverride ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hasOverride ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)"}`,
        fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: hasOverride ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.35)",
        cursor: "pointer", flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {hasOverride ? "Override aktiv" : (hidden ? "Nav-Ziel setzen" : "Nav-Override")}
    </button>
  );
}

// ── Nav Override Modal ────────────────────────────────────────────────────────
function NavOverrideModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const navHref = SLUG_TO_NAV_HREF[slug];
  const { navOverrides, setNavOverride } = usePageVisibility();
  const existing = navHref ? navOverrides[navHref] : undefined;
  const [customHref, setCustomHref] = useState(existing?.customHref ?? "");
  const [customLabel, setCustomLabel] = useState(existing?.customLabel ?? "");
  const navItem = NAV_ITEMS.find((n) => n.href === navHref);

  if (!navHref) return null;

  const handleSave = () => {
    if (customHref.trim()) {
      setNavOverride(navHref, { navHref, customHref: customHref.trim(), customLabel: customLabel.trim() || undefined });
    } else {
      setNavOverride(navHref, null);
    }
    onClose();
  };

  const handleRemove = () => {
    setNavOverride(navHref, null);
    onClose();
  };

  // All available pages as override targets
  const availableTargets = PAGES.filter((p) => p.path !== navHref);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", fontFamily: "var(--font-condensed)", fontSize: 12,
    letterSpacing: "0.04em", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700,
    letterSpacing: "0.16em", textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)", marginBottom: 6, display: "block",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.08)",
          padding: 28,
        }}
      >
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "0.02em",
          textTransform: "uppercase", color: "white", fontWeight: 400, margin: "0 0 4px",
        }}>
          NAV-OVERRIDE <span style={{ color: "var(--brand)" }}>{navItem?.label}</span>
        </h3>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 20px", lineHeight: 1.6 }}>
          Wenn die Seite ausgeblendet ist, bleibt der Nav-Punkt sichtbar und
          zeigt auf die hier hinterlegte Seite/URL.
        </p>

        {/* Quick select from existing pages */}
        <label style={labelStyle}>Schnellauswahl (vorhandene Seiten)</label>
        <select
          value={customHref}
          onChange={(e) => {
            setCustomHref(e.target.value);
            const p = PAGES.find((pg) => pg.path === e.target.value);
            if (p && !customLabel) setCustomLabel("");
          }}
          style={{ ...inputStyle, marginBottom: 14, cursor: "pointer" }}
        >
          <option value="">— Keine / Manuell eingeben —</option>
          {availableTargets.map((p) => (
            <option key={p.slug} value={p.path}>{p.title} ({p.path})</option>
          ))}
        </select>

        {/* Manual URL input */}
        <label style={labelStyle}>Oder: Benutzerdefinierte URL</label>
        <input
          type="text"
          value={customHref}
          onChange={(e) => setCustomHref(e.target.value)}
          placeholder="/ueber-uns oder https://..."
          style={{ ...inputStyle, marginBottom: 14 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />

        {/* Custom label */}
        <label style={labelStyle}>Optionales Nav-Label (leer = Original)</label>
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder={navItem?.label ?? ""}
          style={{ ...inputStyle, marginBottom: 24 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {existing && (
            <button
              onClick={handleRemove}
              style={{
                padding: "10px 18px", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)",
                fontFamily: "var(--font-condensed)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              Override entfernen
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-condensed)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 18px", background: "var(--brand)",
              border: "none", color: "white",
              fontFamily: "var(--font-condensed)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Speichern
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Action Buttons (shared) ───────────────────────────────────────────────────
function ActionButtons({ page }: { page: PageEntry }) {
  const [overrideOpen, setOverrideOpen] = useState(false);

  return (
    <>
      <VisibilityToggle slug={page.slug} />
      <NavOverrideButton slug={page.slug} onOpen={() => setOverrideOpen(true)} />
      <a
        href={page.path}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 4, padding: "7px 11px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)", textDecoration: "none", flexShrink: 0,
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        title="Live ansehen"
      >
        <ExternalLink size={9} />
        Live
      </a>
      <Link
        to={`/admin/seiten/edit/${page.slug}`}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
          background: "var(--brand)", fontFamily: "var(--font-condensed)",
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "white", textDecoration: "none",
          transition: "background 0.15s", whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
      >
        <Pencil size={9} />
        Im Editor öffnen
      </Link>
      {overrideOpen && <NavOverrideModal slug={page.slug} onClose={() => setOverrideOpen(false)} />}
    </>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────────────
function GridCard({ page, animDelay }: { page: PageEntry; animDelay: number }) {
  const allBlocks: PageBlock[] = PAGE_INITIAL_BLOCKS[page.slug] ?? [];
  const blockCount = allBlocks.length;
  const cat = CAT[page.category];
  const previewBlocks = allBlocks.slice(0, 3);
  const blockTypes = allBlocks.map((b) => b.type as BlockType);
  const { isVisible } = usePageVisibility();
  const visible = isVisible(page.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: animDelay }}
      style={{
        display: "flex", flexDirection: "column",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s",
        opacity: visible ? 1 : 0.5,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Preview Row */}
      <div style={{ padding: "10px 12px 8px", background: "#090909", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0 }}>
          <BrowserChrome width={DT_W} path={page.path} />
          <div style={{ borderRadius: "0 0 2px 2px", overflow: "hidden" }}>
            <ScaledThumbnail blocks={previewBlocks} mode="desktop" containerW={DT_W} containerH={DT_H} contentW={DT_CW} scale={DT_SC} />
          </div>
        </div>
        <PhoneFrame screenW={MB_SW} screenH={MB_H}>
          <ScaledThumbnail blocks={previewBlocks} mode="mobile" containerW={MB_SW} containerH={MB_H} contentW={MB_CW} scale={MB_SC} />
        </PhoneFrame>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 8px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "white" }}>
            {page.title}
          </span>
          <span style={{ fontSize: 7.5, fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: cat.color, border: `1px solid ${cat.color}60`, padding: "2px 6px", flexShrink: 0, marginTop: 1, lineHeight: 1.4 }}>
            {cat.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-condensed)", letterSpacing: "0.04em" }}>
            <Globe size={9} style={{ opacity: 0.5 }} />{page.path}
          </span>
          <span style={{
            fontFamily: "var(--font-condensed)", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            color: blockCount > 0 ? "#CA0C85" : "rgba(255,255,255,0.25)",
            background: blockCount > 0 ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.04)",
            border: blockCount > 0 ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
            padding: "2px 7px",
          }}>
            {blockCount} {blockCount === 1 ? "Block" : "Blöcke"}
          </span>
        </div>
        {/* Block type pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {blockTypes.slice(0, 8).map((type, idx) => <BlockPill key={idx} type={type} small />)}
          {blockTypes.length > 8 && <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", padding: "2px 4px", alignSelf: "center" }}>+{blockTypes.length - 8}</span>}
          {blockTypes.length === 0 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>Keine Blöcke</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 12px", display: "flex", gap: 6 }}>
        <ActionButtons page={page} />
      </div>
    </motion.div>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────
function ListRow({ page, animDelay }: { page: PageEntry; animDelay: number }) {
  const allBlocks: PageBlock[] = PAGE_INITIAL_BLOCKS[page.slug] ?? [];
  const blockCount = allBlocks.length;
  const cat = CAT[page.category];
  const blockTypes = allBlocks.map((b) => b.type as BlockType);
  const { isVisible } = usePageVisibility();
  const visible = isVisible(page.slug);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: animDelay }}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
        transition: "border-color 0.2s, background 0.2s",
        opacity: visible ? 1 : 0.5,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.25)"; e.currentTarget.style.background = "rgba(202,12,133,0.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      {/* Icon */}
      <div style={{ width: 34, height: 34, flexShrink: 0, background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FileText size={13} style={{ color: "var(--brand)" }} />
      </div>

      {/* Title + path */}
      <div style={{ minWidth: 160, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "white" }}>
            {page.title}
          </span>
          <span style={{ fontSize: 7, fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: cat.color, border: `1px solid ${cat.color}50`, padding: "1px 5px" }}>
            {cat.label}
          </span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)" }}>
          <Globe size={8} style={{ opacity: 0.5 }} />{page.path}
        </span>
      </div>

      {/* Block count badge */}
      <span style={{
        flexShrink: 0, fontFamily: "var(--font-condensed)", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: blockCount > 0 ? "#CA0C85" : "rgba(255,255,255,0.25)",
        background: blockCount > 0 ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.04)",
        border: blockCount > 0 ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
        padding: "3px 9px", minWidth: 60, textAlign: "center",
      }}>
        {blockCount} {blockCount === 1 ? "Block" : "Blöcke"}
      </span>

      {/* Block type pills — scrollable, full list */}
      <div style={{ flex: 1, display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden", minWidth: 0 }}>
        {blockTypes.map((type, idx) => <BlockPill key={idx} type={type} />)}
        {blockTypes.length === 0 && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-condensed)" }}>Keine Blöcke</span>}
      </div>

      {/* Date */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <Clock size={10} style={{ color: "rgba(255,255,255,0.2)" }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)" }}>
          {new Date(page.updatedAt).toLocaleDateString("de-DE")}
        </span>
      </div>

      {/* Actions */}
      <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
        <ActionButtons page={page} />
      </div>
    </motion.div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, pages, sIdx }: { label: string; pages: PageEntry[]; sIdx: number }) {
  const blockSum = pages.reduce((s, p) => s + (PAGE_INITIAL_BLOCKS[p.slug]?.length ?? 0), 0);
  const lineColor = sIdx === 0 ? "var(--brand)" : sIdx === 1 ? "#3b82f6" : "rgba(255,255,255,0.2)";
  const textColor = sIdx === 0 ? "rgba(202,12,133,0.7)" : sIdx === 1 ? "rgba(59,130,246,0.7)" : "rgba(255,255,255,0.22)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 24, height: 1, background: lineColor }} />
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: textColor, margin: 0 }}>
        {label} · {pages.length} Seiten · {blockSum} Blöcke
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";

export default function AdminSeiten() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { visibility, setVisible } = usePageVisibility();

  const primaryPages = PAGES.filter((p) => p.category === "primary");
  const landingPages = PAGES.filter((p) => p.category === "landing");
  const legalPages   = PAGES.filter((p) => p.category === "legal");

  const totalBlocks = PAGES.reduce((sum, p) => sum + (PAGE_INITIAL_BLOCKS[p.slug]?.length ?? 0), 0);

  const sections = [
    { label: "Hauptnavigation",           pages: primaryPages, sIdx: 0 },
    { label: "Landingpages & Sub-Seiten", pages: landingPages, sIdx: 1 },
    { label: "Rechtliche Seiten",         pages: legalPages,   sIdx: 2 },
  ];

  // ── Bulk-Toggle Logic ───────────────────────────────────────────────────
  const allSlugs = PAGES.map((p) => p.slug);
  const visibleCount = allSlugs.filter((s) => visibility[s] !== false).length;
  const allVisible = visibleCount === allSlugs.length;

  const handleBulkToggle = () => {
    const newVisible = !allVisible;
    allSlugs.forEach((slug) => setVisible(slug, newVisible));
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 3vw, 1.9rem)", letterSpacing: "0.02em", textTransform: "uppercase", color: "white", fontWeight: 400, margin: "0 0 4px" }}>
            SEITEN <span style={{ color: "var(--brand)" }}>VERWALTEN</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 12, margin: 0 }}>
            {PAGES.length} Seiten · {totalBlocks} Blöcke gesamt · {visibleCount}/{PAGES.length} sichtbar
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {/* Bulk toggle */}
          <button
            onClick={handleBulkToggle}
            title={allVisible ? "Alle Seiten ausblenden" : "Alle Seiten einblenden"}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: allVisible ? "rgba(40,200,64,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${allVisible ? "rgba(40,200,64,0.2)" : "rgba(239,68,68,0.2)"}`,
              fontFamily: "var(--font-condensed)", fontSize: 9.5, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: allVisible ? "rgba(40,200,64,0.8)" : "rgba(239,68,68,0.7)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {allVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            {allVisible ? "Alle ein" : "Alle aus"}
          </button>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
            {(["grid", "list"] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: active ? "var(--brand)" : "transparent",
                    border: "none", cursor: "pointer",
                    fontFamily: "var(--font-condensed)", fontSize: 9.5, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: active ? "white" : "rgba(255,255,255,0.35)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {mode === "grid" ? <LayoutGrid size={12} /> : <List size={12} />}
                  {mode === "grid" ? "Grid" : "Liste"}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}
      >
        {[
          { label: "Gesamt Seiten",    value: PAGES.length,        color: "white" },
          { label: "Hauptnavigation",  value: primaryPages.length, color: "#CA0C85" },
          { label: "Landingpages",     value: landingPages.length, color: "#3b82f6" },
          { label: "Gesamt Blöcke",    value: totalBlocks,         color: "rgba(255,255,255,0.55)" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "0.02em", margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Sections ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {sections.map(({ label, pages, sIdx }) => (
            <div key={label} style={{ marginBottom: 32 }}>
              <SectionLabel label={label} pages={pages} sIdx={sIdx} />

              {viewMode === "grid" ? (
                /* ── Grid ── */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {pages.map((page, i) => (
                    <GridCard key={page.slug} page={page} animDelay={sIdx * 0.06 + i * 0.04} />
                  ))}
                </div>
              ) : (
                /* ── List ── */
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {pages.map((page, i) => (
                    <ListRow key={page.slug} page={page} animDelay={sIdx * 0.04 + i * 0.025} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── Footer note ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "rgba(202,12,133,0.04)", borderLeft: "2px solid var(--brand)", marginTop: 8 }}
      >
        <Pencil size={12} style={{ color: "var(--brand)", marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: 0 }}>
          <span style={{ color: "var(--brand)", fontWeight: 600 }}>Sitebuilder aktiv.</span>{" "}
          Grid-Ansicht zeigt 1:1 Desktop- & Mobile-Thumbnails mit echten Block-Daten.
          Listen-Ansicht zeigt alle Block-Typen mit Farbkodierung.
          Block-Anzahl und Block-Typen entsprechen 1:1 dem jeweiligen Seiten-Editor.
        </p>
      </motion.div>
    </div>
  );
}
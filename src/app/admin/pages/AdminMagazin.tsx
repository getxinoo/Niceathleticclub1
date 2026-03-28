/**
 * AdminMagazin.tsx – Blog / Magazin CMS  (v3 – fully responsive)
 * ─────────────────────────────────────────────────────────────────────────────
 * Artikel erstellen, bearbeiten und verwalten.
 *
 * Responsive strategy:
 *  - List view:  2-col stats on mobile, 4-col on desktop.
 *               1-col article grid on mobile, 2-col on tablet, 3-col on desktop.
 *  - Editor:    Single column on mobile with 3 tabs (Inhalt | SEO | Einstellungen).
 *               2-column split on desktop (content + fixed sidebar).
 * All business logic (CRUD, localStorage, SEPA) is untouched from v2.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Plus, Pencil, Trash2, Eye, EyeOff,
  Save, X, Loader2, CheckCircle2, Image as ImageIcon, Tag,
  Clock, ChevronLeft, Globe, Search as SearchIcon,
  AlertCircle, Target, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { MediaCenterModal } from "../components/MediaCenterModal";

// ── useMobile hook ────────────────────────────────────────────────────────────
function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Typen ─────────────────────────────────────────────────────────────────────
interface MagazinArtikel {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverImage: string;
  excerpt: string;
  content: string;
  author: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  readingMinutes: number;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}

const KATEGORIEN = [
  "Training", "Ernährung", "Community", "News", "HYROX", "CrossFit", "Motivation", "Events",
];

const EMPTY_ARTIKEL: Omit<MagazinArtikel, "id" | "createdAt"> = {
  title: "",
  slug: "",
  category: KATEGORIEN[0],
  coverImage: "",
  excerpt: "",
  content: "",
  author: "Nice Athletic Club",
  published: false,
  publishedAt: null,
  readingMinutes: 3,
  metaTitle: "",
  metaDescription: "",
  focusKeyword: "",
};

// ── LocalStorage ──────────────────────────────────────────────────────────────
const LS_KEY = "nac_magazin_articles";

function loadArticles(): MagazinArtikel[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as MagazinArtikel[];
  } catch { /* noop */ }
  return [
    {
      id: "art-1",
      title: "HYROX: Der härteste Fitness-Wettkampf der Welt",
      slug: "hyrox-haertester-fitness-wettkampf",
      category: "HYROX",
      coverImage: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=1200&q=80",
      excerpt: "Was ist HYROX, warum boomt es und wie trainierst du optimal dafür? Unser Guide für Einsteiger und Fortgeschrittene.",
      content: "HYROX ist ein globaler Fitness-Wettkampf, der funktionale Fitness mit Ausdauer kombiniert. 8 Stationen, 8x 1km Laufen – wer tritt an?\n\nIm Nice Athletic Club Göppingen bieten wir dir die komplette HYROX-Vorbereitung: von der Grundlagenausdauer bis zum wettkampfspezifischen Sled-Training.\n\nUnsere Trainer Michael Kraus und Dome Fuchs haben selbst an HYROX-Events teilgenommen und wissen genau, was du brauchst.",
      author: "Michael Kraus",
      published: true,
      publishedAt: "2026-03-15T10:00:00Z",
      createdAt: "2026-03-14T14:30:00Z",
      readingMinutes: 5,
      metaTitle: "HYROX Göppingen: Trainingstipps & Guide | Nice Athletic Club",
      metaDescription: "Was ist HYROX? Unser umfassender Guide erklärt den Wettkampf und zeigt, wie du dich im Nice Athletic Club Göppingen optimal vorbereitest.",
      focusKeyword: "HYROX Göppingen",
    },
    {
      id: "art-2",
      title: "5 Ernährungstipps für maximale Regeneration",
      slug: "ernaehrungstipps-regeneration",
      category: "Ernährung",
      coverImage: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
      excerpt: "Regeneration beginnt in der Küche. Diese 5 Evidence-based Tipps helfen dir, schneller zu erholen und stärker zurückzukommen.",
      content: "Nach intensiven Trainingseinheiten ist Ernährung das A und O. Protein-Timing, Kohlenhydrat-Refueling und ausreichend Schlaf sind die drei Säulen der Regeneration.\n\nIn unserem Artikel zeigen wir dir, was die Wissenschaft sagt und wie du es in deinen Alltag integrierst.",
      author: "Nice Athletic Club",
      published: true,
      publishedAt: "2026-03-10T08:00:00Z",
      createdAt: "2026-03-09T16:00:00Z",
      readingMinutes: 4,
      metaTitle: "",
      metaDescription: "",
      focusKeyword: "Regeneration Ernährung",
    },
  ];
}

function saveArticles(articles: MagazinArtikel[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(articles)); } catch { /* noop */ }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Shared Input Styles ───────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  padding: "10px 12px",
  fontSize: "14px",
  boxSizing: "border-box" as const,
  outline: "none",
  transition: "border-color 0.15s",
};

// Dark select style – overrides browser default appearance
const selectStyle: React.CSSProperties = {
  ...inputBase,
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "32px",
  colorScheme: "dark",
  backgroundColor: "#111111",
};

const FOCUS_ON  = (e: React.FocusEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.5)"; };
const FOCUS_OFF = (e: React.FocusEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; };

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </label>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const color = ratio > 1 ? "#f87171" : ratio > 0.85 ? "#fb923c" : "rgba(255,255,255,0.3)";
  return (
    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color, transition: "color 0.15s" }}>
      {current}/{max}
    </span>
  );
}

function SeoStatus({ metaTitle, metaDescription, focusKeyword }: { metaTitle: string; metaDescription: string; focusKeyword: string }) {
  const filled = [metaTitle, metaDescription, focusKeyword].filter(Boolean).length;
  const score = Math.round((filled / 3) * 100);
  const color = score === 100 ? "#4ade80" : score >= 66 ? "#fb923c" : "rgba(255,255,255,0.25)";
  const label = score === 100 ? "Vollständig" : score >= 66 ? "Teilweise" : "Leer";
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `conic-gradient(${color} ${score}%, rgba(255,255,255,0.08) ${score}%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, color }}>{score}</span>
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color, textTransform: "uppercase", margin: 0 }}>SEO: {label}</p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", margin: 0 }}>{filled}/3 Felder befüllt · SEO-Tab öffnen</p>
      </div>
    </div>
  );
}

function SerpPreview({ metaTitle, title, metaDescription, excerpt, slug }: {
  metaTitle: string; title: string; metaDescription: string; excerpt: string; slug: string;
}) {
  const displayTitle = metaTitle || title || "Artikel-Titel";
  const displayDesc  = metaDescription || excerpt || "Keine Meta-Description angegeben.";
  const displaySlug  = slug || "artikel-slug";
  return (
    <div style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20 }}>
        <SearchIcon size={13} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "Arial, sans-serif" }}>nicefitness.de magazin</span>
      </div>
      <div style={{ padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={{ width: 18, height: 18, background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>N</span>
          </div>
          <span style={{ fontSize: "11px", color: "#8ab4f8", fontFamily: "Arial, sans-serif" }}>nicefitness.de</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>›</span>
          <span style={{ fontSize: "11px", color: "#8ab4f8", fontFamily: "Arial, sans-serif" }}>magazin</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>›</span>
          <span style={{ fontSize: "11px", color: "#8ab4f8", fontFamily: "Arial, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{displaySlug}</span>
        </div>
        <p style={{ fontSize: "17px", color: "#8ab4f8", fontFamily: "Arial, sans-serif", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>
          {displayTitle}
        </p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", lineHeight: 1.5, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {displayDesc}
        </p>
      </div>
    </div>
  );
}

// ── SEO Tab ────────────────────────────────────────────────────────────────────
function SeoTab({ form, set, title, excerpt, slug }: {
  form: { metaTitle: string; metaDescription: string; focusKeyword: string };
  set: (key: string, val: string) => void;
  title: string; excerpt: string; slug: string;
}) {
  const metaTitleLen = form.metaTitle.length;
  const metaDescLen  = form.metaDescription.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Lbl>Meta Title</Lbl>
          <CharCounter current={metaTitleLen} max={60} />
        </div>
        <input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={title || "z.B. HYROX Göppingen: Trainingstipps | NAC"} style={{ ...inputBase, borderColor: metaTitleLen > 60 ? "rgba(248,113,113,0.5)" : undefined }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
        {metaTitleLen > 60 && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0 }} /><span style={{ fontSize: "11px", color: "#f87171" }}>Meta Title zu lang – wird bei Google abgeschnitten</span></div>}
        {metaTitleLen === 0 && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Leer → Artikel-Titel wird als Fallback verwendet</p>}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Lbl>Meta Description</Lbl>
          <CharCounter current={metaDescLen} max={160} />
        </div>
        <textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder={excerpt || "Kurze Beschreibung (max. 160 Zeichen)…"} rows={3} style={{ ...inputBase, resize: "vertical", borderColor: metaDescLen > 160 ? "rgba(248,113,113,0.5)" : undefined }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
        {metaDescLen > 160 && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0 }} /><span style={{ fontSize: "11px", color: "#f87171" }}>Meta Description zu lang ({metaDescLen - 160} Zeichen zu viel)</span></div>}
      </div>
      <div>
        <Lbl>Fokus-Keyword</Lbl>
        <div style={{ position: "relative" }}>
          <Target size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} placeholder="z.B. HYROX Göppingen" style={{ ...inputBase, paddingLeft: 34 }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <SearchIcon size={12} style={{ color: "var(--brand)" }} />
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", margin: 0 }}>Live SERP-Vorschau</p>
        </div>
        <SerpPreview metaTitle={form.metaTitle} title={title} metaDescription={form.metaDescription} excerpt={excerpt} slug={slug} />
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: 8 }}>Aktualisiert sich in Echtzeit beim Tippen</p>
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px" }}>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>SEO Checkliste</p>
        {[
          { label: "Meta Title befüllt", ok: form.metaTitle.length > 0 },
          { label: "Meta Title ≤ 60 Zeichen", ok: form.metaTitle.length > 0 && form.metaTitle.length <= 60 },
          { label: "Meta Description befüllt", ok: form.metaDescription.length > 0 },
          { label: "Meta Description ≤ 160 Zeichen", ok: form.metaDescription.length > 0 && form.metaDescription.length <= 160 },
          { label: "Fokus-Keyword definiert", ok: form.focusKeyword.length > 0 },
        ].map(({ label, ok }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <CheckCircle2 size={13} style={{ color: ok ? "#4ade80" : "rgba(255,255,255,0.15)", flexShrink: 0, transition: "color 0.2s" }} />
            <span style={{ fontSize: "12px", color: ok ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)", transition: "color 0.2s" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar-Inhalt (Einstellungen) ────────────────────────────────────────────
// Diese Komponente wird auf Mobile als eigener Tab angezeigt, auf Desktop als Sidebar.
function SidebarContent({
  form,
  set,
  mediaCenterOpen,
  setMediaCenterOpen,
  coverHovered,
  setCoverHovered,
  onOpenSeoTab,
}: {
  form: Omit<MagazinArtikel, "id" | "createdAt">;
  set: <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => void;
  mediaCenterOpen: boolean;
  setMediaCenterOpen: (v: boolean) => void;
  coverHovered: boolean;
  setCoverHovered: (v: boolean) => void;
  onOpenSeoTab: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cover-Bild */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Lbl>Cover-Bild</Lbl>
          {form.coverImage && (
            <button onClick={() => set("coverImage", "")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <X size={10} /> Entfernen
            </button>
          )}
        </div>
        {form.coverImage ? (
          <div style={{ position: "relative", height: 140, overflow: "hidden", cursor: "pointer" }} onMouseEnter={() => setCoverHovered(true)} onMouseLeave={() => setCoverHovered(false)} onClick={() => setMediaCenterOpen(true)}>
            <img src={form.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: coverHovered ? "scale(1.04)" : "scale(1)" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <div style={{ position: "absolute", inset: 0, background: coverHovered ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {coverHovered && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--brand)", padding: "8px 14px" }}>
                  <ImageIcon size={13} style={{ color: "white" }} />
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "white", textTransform: "uppercase" }}>Bild ändern</span>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setMediaCenterOpen(true)} style={{ width: "100%", height: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "2px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.15s", color: "rgba(255,255,255,0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)"; e.currentTarget.style.background = "rgba(202,12,133,0.04)"; e.currentTarget.style.color = "var(--brand)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
            <ImageIcon size={22} style={{ transition: "color 0.15s" }} />
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", transition: "color 0.15s" }}>Cover-Bild auswählen</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>Mediathek oder Upload</span>
          </button>
        )}
      </div>

      {/* Kategorie */}
      <div>
        <Lbl>Kategorie</Lbl>
        <select value={form.category} onChange={(e) => set("category", e.target.value)} style={selectStyle}>
          {KATEGORIEN.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Slug */}
      <div>
        <Lbl>URL-Slug</Lbl>
        <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="artikel-url-slug" style={inputBase} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>/magazin/{form.slug || "…"}</p>
      </div>

      {/* Autor */}
      <div>
        <Lbl>Autor</Lbl>
        <input value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Trainer-Name oder Nice Athletic Club" style={inputBase} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
      </div>

      {/* Lesezeit */}
      <div>
        <Lbl>Lesezeit (Minuten)</Lbl>
        <input type="number" min={1} max={60} value={form.readingMinutes} onChange={(e) => set("readingMinutes", parseInt(e.target.value) || 1)} style={inputBase} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Wird aus dem Inhalt automatisch geschätzt</p>
      </div>

      {/* SEO Status */}
      <div>
        <Lbl>SEO-Status</Lbl>
        <SeoStatus metaTitle={form.metaTitle ?? ""} metaDescription={form.metaDescription ?? ""} focusKeyword={form.focusKeyword ?? ""} />
        <button onClick={onOpenSeoTab} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", padding: "8px", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.color = "white"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}>
          <SearchIcon size={11} /> SEO-Tab öffnen
        </button>
      </div>
    </div>
  );
}

// ── Artikel-Karte ─────────────────────────────────────────────────────────────
function ArtikelCard({ artikel, onEdit, onDelete, onTogglePublish }: {
  artikel: MagazinArtikel;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", border: hovered ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)", transition: "all 0.2s", overflow: "hidden" }}
    >
      {artikel.coverImage && (
        <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
          <img src={artikel.coverImage} alt={artikel.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
          <span style={{ position: "absolute", top: 8, left: 8, background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "2px 7px" }}>{artikel.category}</span>
          <span style={{ position: "absolute", top: 8, right: 8, background: artikel.published ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${artikel.published ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.12)"}`, color: artikel.published ? "#4ade80" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px" }}>{artikel.published ? "Live" : "Entwurf"}</span>
        </div>
      )}
      <div style={{ padding: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}><Clock size={9} /> {artikel.readingMinutes} min</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Tag size={9} /> {artikel.author}</span>
        </div>
        <h3 style={{ color: "white", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.3, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {artikel.title || "— Kein Titel —"}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {artikel.excerpt || "Kein Auszug vorhanden."}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "var(--brand)", border: "none", color: "white", padding: "8px 10px", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
            <Pencil size={11} /> Bearbeiten
          </button>
          <button onClick={onTogglePublish} title={artikel.published ? "Entveröffentlichen" : "Veröffentlichen"} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", width: 34, cursor: "pointer" }}>
            {artikel.published ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button onClick={onDelete} title="Löschen" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", width: 34, cursor: "pointer" }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Tab-Definitionen für den Editor ──────────────────────────────────────────
type ContentTabId = "content" | "seo" | "settings";

const CONTENT_TABS_DESKTOP = [
  { id: "content" as ContentTabId, label: "Inhalt" },
  { id: "seo"     as ContentTabId, label: "SEO", icon: SearchIcon },
];
const CONTENT_TABS_MOBILE = [
  { id: "content"  as ContentTabId, label: "Inhalt" },
  { id: "seo"      as ContentTabId, label: "SEO",         icon: SearchIcon },
  { id: "settings" as ContentTabId, label: "Einstellungen", icon: Settings },
];

// ── Artikel-Editor ────────────────────────────────────────────────────────────
function ArtikelEditor({
  artikel, onSave, onCancel,
}: {
  artikel: Partial<MagazinArtikel>;
  onSave: (data: Omit<MagazinArtikel, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const isMobile = useMobile();
  const [form, setForm] = useState<Omit<MagazinArtikel, "id" | "createdAt">>({ ...EMPTY_ARTIKEL, ...artikel });
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<ContentTabId>("content");
  const [mediaCenterOpen, setMediaCenterOpen] = useState(false);
  const [coverHovered, setCoverHovered] = useState(false);

  const set = useCallback(<K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val })), []);

  const handleTitleChange = (val: string) => {
    set("title", val);
    if (!artikel.id) set("slug", generateSlug(val));
  };

  const handleContentChange = (val: string) => {
    set("content", val);
    set("readingMinutes", estimateReadingMinutes(val));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Bitte einen Titel eingeben."); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    onSave({ ...form, publishedAt: form.published ? (form.publishedAt ?? new Date().toISOString()) : null });
    setSaving(false);
  };

  const TABS = isMobile ? CONTENT_TABS_MOBILE : CONTENT_TABS_DESKTOP;

  const openSeoTab = () => setActiveTab("seo");

  return (
    <>
      <MediaCenterModal open={mediaCenterOpen} onClose={() => setMediaCenterOpen(false)} onSelect={(url) => { set("coverImage", url); setMediaCenterOpen(false); }} currentUrl={form.coverImage} mode="cover" />

      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <ChevronLeft size={14} /> Abbrechen
          </button>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: isMobile ? "11px" : "13px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {artikel.id ? "Artikel bearbeiten" : "Neuer Artikel"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => set("published", !form.published)} style={{ display: "flex", alignItems: "center", gap: 6, background: form.published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${form.published ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: form.published ? "#4ade80" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "7px 12px", cursor: "pointer" }}>
              <Globe size={12} />
              {isMobile ? (form.published ? "Live" : "Entwurf") : (form.published ? "Veröffentlicht" : "Entwurf")}
            </button>
            <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--brand)", border: "none", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "7px 16px", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isMobile ? "Speichern" : "Speichern"}
            </button>
          </div>
        </div>

        {/* ── Editor Body ───────────────────────────────────────────────── */}
        {isMobile ? (
          /* ═══ MOBILE: single column, 3 tabs ═══ */
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, overflowX: "auto" }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = "icon" in tab ? tab.icon : null;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent", color: isActive ? "white" : "rgba(255,255,255,0.38)", cursor: "pointer", padding: "10px 14px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "-1px", transition: "all 0.15s", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {Icon && <Icon size={11} style={{ color: isActive ? "var(--brand)" : "rgba(255,255,255,0.3)" }} />}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
              <AnimatePresence mode="wait" initial={false}>
                {activeTab === "content" && (
                  <motion.div key="content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div><Lbl>Titel *</Lbl><input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Artikel-Titel…" style={{ ...inputBase, fontSize: "16px", fontFamily: "var(--font-condensed)", fontWeight: 700 }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} /></div>
                    <div><Lbl>Auszug / Teaser</Lbl><textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} placeholder="Kurze Zusammenfassung…" style={{ ...inputBase, resize: "vertical" }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} /></div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <Lbl>Inhalt *</Lbl>
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>~{form.readingMinutes} min</span>
                      </div>
                      <textarea value={form.content} onChange={(e) => handleContentChange(e.target.value)} rows={14} placeholder={"Schreibe den Artikel-Inhalt…\n\n- Absätze mit Leerzeile\n- ** für Fettschrift\n- ## für Überschriften"} style={{ ...inputBase, resize: "vertical", minHeight: 220, lineHeight: 1.7, fontFamily: "monospace", fontSize: "13px" }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
                    </div>
                  </motion.div>
                )}
                {activeTab === "seo" && (
                  <motion.div key="seo" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <SeoTab form={{ metaTitle: form.metaTitle ?? "", metaDescription: form.metaDescription ?? "", focusKeyword: form.focusKeyword ?? "" }} set={(key, val) => set(key as keyof typeof form, val as never)} title={form.title} excerpt={form.excerpt} slug={form.slug} />
                  </motion.div>
                )}
                {activeTab === "settings" && (
                  <motion.div key="settings" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <SidebarContent form={form} set={set} mediaCenterOpen={mediaCenterOpen} setMediaCenterOpen={setMediaCenterOpen} coverHovered={coverHovered} setCoverHovered={setCoverHovered} onOpenSeoTab={openSeoTab} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* ═══ DESKTOP: 2-column layout ═══ */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, flex: 1, overflow: "hidden" }}>
            {/* Left: content + SEO tabs */}
            <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                {CONTENT_TABS_DESKTOP.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = "icon" in tab ? tab.icon : null;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent", color: isActive ? "white" : "rgba(255,255,255,0.38)", cursor: "pointer", padding: "8px 20px 10px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "-1px", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
                      {Icon && <Icon size={11} style={{ color: isActive ? "var(--brand)" : "rgba(255,255,255,0.3)" }} />}
                      {tab.label}
                      {tab.id === "seo" && form.metaTitle && form.metaDescription && form.focusKeyword && (
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", marginLeft: 2 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {activeTab === "content" && (
                  <motion.div key="content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    <div><Lbl>Titel *</Lbl><input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Artikel-Titel eingeben…" style={{ ...inputBase, fontSize: "18px", fontFamily: "var(--font-condensed)", fontWeight: 700 }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} /></div>
                    <div><Lbl>Auszug / Teaser</Lbl><textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} placeholder="Kurze Zusammenfassung für die Artikelvorschau…" style={{ ...inputBase, resize: "vertical" }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <Lbl>Inhalt *</Lbl>
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>~{form.readingMinutes} min Lesezeit</span>
                      </div>
                      <textarea value={form.content} onChange={(e) => handleContentChange(e.target.value)} rows={18} placeholder={"Schreibe hier den vollständigen Artikel-Inhalt…\n\nMarkdown-ähnliche Formatierung:\n- Absätze mit Leerzeile trennen\n- ** für Fettschrift\n- ## für Überschriften"} style={{ ...inputBase, resize: "vertical", minHeight: 320, lineHeight: 1.7, fontFamily: "monospace", fontSize: "13px" }} onFocus={FOCUS_ON} onBlur={FOCUS_OFF} />
                    </div>
                  </motion.div>
                )}
                {activeTab === "seo" && (
                  <motion.div key="seo" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ flex: 1 }}>
                    <SeoTab form={{ metaTitle: form.metaTitle ?? "", metaDescription: form.metaDescription ?? "", focusKeyword: form.focusKeyword ?? "" }} set={(key, val) => set(key as keyof typeof form, val as never)} title={form.title} excerpt={form.excerpt} slug={form.slug} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: sidebar (always visible on desktop) */}
            <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              <SidebarContent form={form} set={set} mediaCenterOpen={mediaCenterOpen} setMediaCenterOpen={setMediaCenterOpen} coverHovered={coverHovered} setCoverHovered={setCoverHovered} onOpenSeoTab={openSeoTab} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function AdminMagazin() {
  const isMobile = useMobile();
  const [articles, setArticles] = useState<MagazinArtikel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [filterCat, setFilterCat] = useState<string>("Alle");

  useEffect(() => { setArticles(loadArticles()); }, []);

  const isEditing = editingId !== null || isNew;
  const editingArtikel = articles.find((a) => a.id === editingId) ?? undefined;

  // ── CRUD (unverändert) ─────────────────────────────────────────────────────
  const handleSave = (data: Omit<MagazinArtikel, "id" | "createdAt">) => {
    let updated: MagazinArtikel[];
    if (isNew) {
      updated = [{ id: "art-" + Date.now(), createdAt: new Date().toISOString(), ...data }, ...articles];
      toast.success("Artikel erstellt!");
    } else {
      updated = articles.map((a) => a.id === editingId ? { ...a, ...data } : a);
      toast.success("Artikel gespeichert!");
    }
    setArticles(updated);
    saveArticles(updated);
    setEditingId(null);
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Artikel wirklich löschen?")) return;
    const updated = articles.filter((a) => a.id !== id);
    setArticles(updated);
    saveArticles(updated);
    toast.success("Artikel gelöscht.");
  };

  const handleTogglePublish = (id: string) => {
    const updated = articles.map((a) =>
      a.id === id ? { ...a, published: !a.published, publishedAt: !a.published ? new Date().toISOString() : null } : a
    );
    setArticles(updated);
    saveArticles(updated);
    const art = updated.find((a) => a.id === id);
    toast.success(art?.published ? "Artikel veröffentlicht." : "Entwurf gespeichert.");
  };

  const filtered = filterCat === "Alle" ? articles : articles.filter((a) => a.category === filterCat);
  const publishedCount = articles.filter((a) => a.published).length;

  // ── Editor-View ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div style={{
        height: isMobile ? "auto" : "calc(100vh - 64px - 48px)",
        minHeight: isMobile ? "100dvh" : undefined,
        display: "flex", flexDirection: "column",
        overflow: isMobile ? "visible" : "hidden",
        padding: isMobile ? "0 0 40px" : "0",
      }}>
        <ArtikelEditor
          artikel={isNew ? {} : (editingArtikel ?? {})}
          onSave={handleSave}
          onCancel={() => { setEditingId(null); setIsNew(false); }}
        />
      </div>
    );
  }

  // ── Listen-View ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "1.8rem" : "2.2rem", color: "white", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>MAGAZIN</h1>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: 4 }}>
            {articles.length} Artikel · {publishedCount} veröffentlicht
          </p>
        </div>
        <button
          onClick={() => { setIsNew(true); setEditingId(null); }}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--brand)", border: "none", color: "white", padding: "11px 20px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <Plus size={14} /> Neuer Artikel
        </button>
      </div>

      {/* Stats Bar – 2 cols on mobile, 4 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Gesamt",         val: articles.length,                    color: "rgba(255,255,255,0.08)" },
          { label: "Veröffentlicht", val: publishedCount,                     color: "rgba(74,222,128,0.08)"  },
          { label: "Entwürfe",       val: articles.length - publishedCount,   color: "rgba(255,165,0,0.08)"   },
          { label: "Kategorien",     val: [...new Set(articles.map((a) => a.category))].length, color: "rgba(202,12,133,0.08)" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: color, border: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "white", margin: 0, lineHeight: 1 }}>{val}</p>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Kategorie-Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Alle", ...KATEGORIEN].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{ background: filterCat === cat ? "var(--brand)" : "rgba(255,255,255,0.04)", border: filterCat === cat ? "1px solid var(--brand)" : "1px solid rgba(255,255,255,0.1)", color: filterCat === cat ? "white" : "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 12px", cursor: "pointer", transition: "all 0.15s" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Artikel Grid – 1 col mobile, 2 col tablet, 3 col desktop */}
      {filtered.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <BookOpen size={28} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Noch keine Artikel vorhanden</p>
          <button onClick={() => { setIsNew(true); setEditingId(null); }} style={{ marginTop: 14, background: "var(--brand)", border: "none", color: "white", padding: "9px 20px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>
            <Plus size={11} style={{ verticalAlign: "middle", marginRight: 5 }} /> Ersten Artikel erstellen
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((art) => (
              <ArtikelCard
                key={art.id}
                artikel={art}
                onEdit={() => { setEditingId(art.id); setIsNew(false); }}
                onDelete={() => handleDelete(art.id)}
                onTogglePublish={() => handleTogglePublish(art.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

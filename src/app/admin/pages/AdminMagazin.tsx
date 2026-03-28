/**
 * AdminMagazin.tsx – Blog / Magazin CMS
 * ─────────────────────────────────────────────────────────────────────────────
 * Artikel erstellen, bearbeiten und verwalten.
 * Speichert in localStorage (Mock) bzw. per API auf dem Server.
 *
 * Kategorien: Training · Ernährung · Community · News · HYROX · CrossFit
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Plus, Pencil, Trash2, Eye, EyeOff,
  Save, X, Loader2, CheckCircle2, Image, Tag,
  Calendar, Clock, ChevronLeft, Globe,
} from "lucide-react";
import { toast } from "sonner";

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
};

// ── LocalStorage-Store ────────────────────────────────────────────────────────
const LS_KEY = "nac_magazin_articles";

function loadArticles(): MagazinArtikel[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as MagazinArtikel[];
  } catch { /* noop */ }
  // Seed-Daten
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

// ── Styles ────────────────────────────────────────────────────────────────────
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

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </label>
  );
}

// ── Artikel-Karte ─────────────────────────────────────────────────────────────
function ArtikelCard({
  artikel,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
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
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: hovered ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
        transition: "all 0.2s",
        overflow: "hidden",
      }}
    >
      {/* Cover Image */}
      {artikel.coverImage && (
        <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
          <img src={artikel.coverImage} alt={artikel.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
          {/* Kategorie-Badge */}
          <span style={{ position: "absolute", top: 10, left: 10, background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "3px 8px" }}>
            {artikel.category}
          </span>
          {/* Status-Badge */}
          <span style={{ position: "absolute", top: 10, right: 10, background: artikel.published ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${artikel.published ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.12)"}`, color: artikel.published ? "#4ade80" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px" }}>
            {artikel.published ? "Veröffentlicht" : "Entwurf"}
          </span>
        </div>
      )}

      <div style={{ padding: "16px" }}>
        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
            <Clock size={10} /> {artikel.readingMinutes} min
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
            <Tag size={10} /> {artikel.author}
          </span>
        </div>

        {/* Titel */}
        <h3 style={{ color: "white", fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: 6 }}>
          {artikel.title || "— Kein Titel —"}
        </h3>

        {/* Auszug */}
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {artikel.excerpt || "Kein Auszug vorhanden."}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onEdit}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--brand)", border: "none", color: "white", padding: "8px 12px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
          >
            <Pencil size={12} /> Bearbeiten
          </button>
          <button
            onClick={onTogglePublish}
            title={artikel.published ? "Entveröffentlichen" : "Veröffentlichen"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", width: 36, cursor: "pointer" }}
          >
            {artikel.published ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={onDelete}
            title="Löschen"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", width: 36, cursor: "pointer" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Artikel-Editor ────────────────────────────────────────────────────────────
function ArtikelEditor({
  artikel,
  onSave,
  onCancel,
}: {
  artikel: Partial<MagazinArtikel>;
  onSave: (data: Omit<MagazinArtikel, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<MagazinArtikel, "id" | "createdAt">>({
    ...EMPTY_ARTIKEL,
    ...artikel,
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleTitleChange = (val: string) => {
    set("title", val);
    if (!artikel.id) set("slug", generateSlug(val)); // nur bei neuem Artikel
  };

  const handleContentChange = (val: string) => {
    set("content", val);
    set("readingMinutes", estimateReadingMinutes(val));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Bitte einen Titel eingeben."); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400)); // simulate
    onSave({ ...form, publishedAt: form.published ? (form.publishedAt ?? new Date().toISOString()) : null });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}
    >
      {/* Editor Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <ChevronLeft size={14} /> Abbrechen
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase" }}>
            {artikel.id ? "Artikel bearbeiten" : "Neuer Artikel"}
          </span>
        </div>

        {/* Veröffentlichung Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => set("published", !form.published)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: form.published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${form.published ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: form.published ? "#4ade80" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 14px", cursor: "pointer" }}
          >
            <Globe size={13} />
            {form.published ? "Veröffentlicht" : "Entwurf"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--brand)", border: "none", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 20px", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </button>
        </div>
      </div>

      {/* Editor Content – 2-spaltig */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, flex: 1, overflow: "hidden" }}>

        {/* Links: Hauptinhalt */}
        <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Titel */}
          <div>
            <Lbl>Titel *</Lbl>
            <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Artikel-Titel eingeben…" style={{ ...inputBase, fontSize: "18px", fontFamily: "var(--font-condensed)", fontWeight: 700 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
          </div>

          {/* Auszug */}
          <div>
            <Lbl>Auszug / Teaser (für Listen und Meta-Description)</Lbl>
            <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} placeholder="Kurze Zusammenfassung für die Artikelvorschau…" style={{ ...inputBase, resize: "vertical" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
          </div>

          {/* Inhalt */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Lbl>Inhalt *</Lbl>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                ~{form.readingMinutes} min Lesezeit
              </span>
            </div>
            <textarea
              value={form.content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={18}
              placeholder={"Schreibe hier den vollständigen Artikel-Inhalt…\n\nMarkdown-ähnliche Formatierung ist möglich:\n- Absätze mit Leerzeile trennen\n- ** für Fettschrift\n- Überschriften mit ##"}
              style={{ ...inputBase, resize: "vertical", minHeight: 320, lineHeight: 1.7, fontFamily: "var(--font-mono, monospace)", fontSize: "13px" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
        </div>

        {/* Rechts: Meta-Felder */}
        <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Cover-Bild */}
          <div>
            <Lbl>Cover-Bild URL</Lbl>
            {form.coverImage && (
              <div style={{ position: "relative", height: 120, marginBottom: 8, overflow: "hidden" }}>
                <img src={form.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <button onClick={() => set("coverImage", "")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", color: "white", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}>
                  <X size={11} />
                </button>
              </div>
            )}
            <input value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://images.unsplash.com/…" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
              <Image size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Unsplash-URL empfohlen
            </p>
          </div>

          {/* Kategorie */}
          <div>
            <Lbl>Kategorie</Lbl>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ ...inputBase, cursor: "pointer" }}>
              {KATEGORIEN.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Slug */}
          <div>
            <Lbl>URL-Slug</Lbl>
            <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="artikel-url-slug" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
              /magazin/{form.slug || "…"}
            </p>
          </div>

          {/* Autor */}
          <div>
            <Lbl>Autor</Lbl>
            <input value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Trainer-Name oder Nice Athletic Club" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
          </div>

          {/* Lesezeit */}
          <div>
            <Lbl>Lesezeit (Minuten)</Lbl>
            <input type="number" min={1} max={60} value={form.readingMinutes} onChange={(e) => set("readingMinutes", parseInt(e.target.value) || 1)} style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Wird aus dem Inhalt automatisch geschätzt</p>
          </div>

          {/* Vorschau-Box */}
          <div style={{ background: "rgba(202,12,133,0.04)", border: "1px solid rgba(202,12,133,0.12)", padding: 16 }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase", marginBottom: 10 }}>Google-Vorschau</p>
            <p style={{ color: "#4285f4", fontSize: "14px", lineHeight: 1.3, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {form.title || "Artikel-Titel"}
            </p>
            <p style={{ color: "#006621", fontSize: "11px", marginBottom: 3 }}>nicefitness.de/magazin/{form.slug || "…"}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: 1.5, display: "-webkit-box" as const, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
              {form.excerpt || "Kein Auszug eingetragen."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function AdminMagazin() {
  const [articles, setArticles] = useState<MagazinArtikel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("Alle");

  useEffect(() => {
    setArticles(loadArticles());
  }, []);

  const isEditing = editingId !== null || isNew;
  const editingArtikel = articles.find((a) => a.id === editingId) ?? undefined;

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = (data: Omit<MagazinArtikel, "id" | "createdAt">) => {
    let updated: MagazinArtikel[];
    if (isNew) {
      const neu: MagazinArtikel = {
        id: "art-" + Date.now(),
        createdAt: new Date().toISOString(),
        ...data,
      };
      updated = [neu, ...articles];
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
    toast.success(art?.published ? "Artikel veröffentlicht." : "Artikel als Entwurf gespeichert.");
  };

  // ── Gefilterte Artikel ────────────────────────────────────────────────────
  const filtered = filterCat === "Alle" ? articles : articles.filter((a) => a.category === filterCat);
  const publishedCount = articles.filter((a) => a.published).length;

  // ── Editor-View ───────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div style={{ height: "calc(100vh - 64px - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ArtikelEditor
          artikel={isNew ? {} : (editingArtikel ?? {})}
          onSave={handleSave}
          onCancel={() => { setEditingId(null); setIsNew(false); }}
        />
      </div>
    );
  }

  // ── Listen-View ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "white", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
            MAGAZIN
          </h1>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: 4 }}>
            {articles.length} Artikel · {publishedCount} veröffentlicht
          </p>
        </div>
        <button
          onClick={() => { setIsNew(true); setEditingId(null); }}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--brand)", border: "none", color: "white", padding: "12px 24px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <Plus size={15} /> Neuer Artikel
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Gesamt", val: articles.length, color: "rgba(255,255,255,0.1)" },
          { label: "Veröffentlicht", val: publishedCount, color: "rgba(74,222,128,0.1)" },
          { label: "Entwürfe", val: articles.length - publishedCount, color: "rgba(255,165,0,0.1)" },
          { label: "Kategorien", val: [...new Set(articles.map((a) => a.category))].length, color: "rgba(202,12,133,0.1)" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: color, border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "white", margin: 0 }}>{val}</p>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Kategorie-Filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Alle", ...KATEGORIEN].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{ background: filterCat === cat ? "var(--brand)" : "rgba(255,255,255,0.04)", border: filterCat === cat ? "1px solid var(--brand)" : "1px solid rgba(255,255,255,0.1)", color: filterCat === cat ? "white" : "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "6px 14px", cursor: "pointer", transition: "all 0.15s" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Artikel Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <BookOpen size={32} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 16 }} />
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Noch keine Artikel vorhanden</p>
          <button onClick={() => { setIsNew(true); setEditingId(null); }} style={{ marginTop: 16, background: "var(--brand)", border: "none", color: "white", padding: "10px 24px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>
            <Plus size={12} style={{ verticalAlign: "middle", marginRight: 6 }} /> Ersten Artikel erstellen
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
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

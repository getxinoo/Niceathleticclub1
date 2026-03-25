/**
 * AdminPresse.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-Seite zum Verwalten der Presseberichte / Medienerwaehnungen.
 * CRUD ueber die Press-API (mit Mock-DB Fallback).
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Newspaper, Plus, Pencil, Trash2, RefreshCw,
  Save, X, ExternalLink, Monitor, BookOpen, Tv,
  Radio, Mic, Search, Calendar, Link2, AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { pressApi, type PressArticle, type MediaType } from "../../../api/press";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";

// ── Media Type Options ───────────────────────────────────────────────────────
const MEDIA_TYPES: { value: MediaType; label: string; icon: React.ElementType }[] = [
  { value: "Online",         label: "Online",         icon: Monitor  },
  { value: "Print",          label: "Print",          icon: BookOpen },
  { value: "Print / Online", label: "Print / Online", icon: BookOpen },
  { value: "TV",             label: "TV",             icon: Tv       },
  { value: "Radio",          label: "Radio",          icon: Radio    },
  { value: "Podcast",        label: "Podcast",        icon: Mic      },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "6px" }}>
      {children}{required && <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function FieldInput({ type = "text", value, onChange, placeholder }: {
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

function FieldTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

// ── Form state ───────────────────────────────────────────────────────────────
interface PressForm {
  outlet: string;
  title: string;
  url: string;
  date: string;
  mediaType: MediaType;
  excerpt: string;
  image: string;
}

const emptyForm: PressForm = {
  outlet: "",
  title: "",
  url: "",
  date: new Date().toISOString().slice(0, 10),
  mediaType: "Online",
  excerpt: "",
  image: "",
};

// ── Format date ──────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPresse() {
  const [articles, setArticles] = useState<PressArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PressForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const location = useLocation();

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const data = await pressApi.list();
    setArticles(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [location.key]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = articles.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.outlet.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.mediaType.toLowerCase().includes(q)
    );
  });

  // ── Open Sheet ───────────────────────────────────────────────────────────
  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (article: PressArticle) => {
    setEditId(article.id);
    setForm({
      outlet: article.outlet,
      title: article.title,
      url: article.url,
      date: article.date,
      mediaType: article.mediaType,
      excerpt: article.excerpt ?? "",
      image: article.image ?? "",
    });
    setSheetOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.outlet.trim() || !form.title.trim() || !form.url.trim()) {
      toast.error("Bitte Medium, Titel und URL ausfuellen.");
      return;
    }
    // URL validation
    let finalUrl = form.url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setSaving(true);
    try {
      const payload = {
        outlet: form.outlet.trim(),
        title: form.title.trim(),
        url: finalUrl,
        date: form.date,
        mediaType: form.mediaType,
        excerpt: form.excerpt.trim() || undefined,
        image: form.image.trim() || undefined,
      };

      if (editId) {
        await pressApi.update(editId, payload);
        toast.success("Pressebericht aktualisiert");
      } else {
        await pressApi.create(payload);
        toast.success("Pressebericht angelegt");
      }
      setSheetOpen(false);
      await load();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await pressApi.delete(id);
      toast.success("Pressebericht geloescht");
      setDeleteConfirm(null);
      await load();
    } catch {
      toast.error("Fehler beim Loeschen");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white flex items-center gap-3"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", letterSpacing: "0.03em" }}>
            <Newspaper size={22} style={{ color: "var(--brand)" }} />
            PRESSE & MEDIEN
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {articles.length} Pressebericht{articles.length !== 1 ? "e" : ""} verwalten
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center justify-center w-10 h-10 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Aktualisieren"
          >
            <RefreshCw size={15} className={`text-white/50 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 text-white transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "var(--brand)",
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              minHeight: "44px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <Plus size={14} />
            NEUER BERICHT
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Medium, Titel oder Medienart..."
          className="w-full pl-10 pr-4 py-3 text-white text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "var(--font-body)",
          }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["DATUM", "MEDIUM", "TITEL", "TYP", "LINK", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/30 text-sm">
                  <RefreshCw size={16} className="inline animate-spin mr-2" />
                  Lade...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/30 text-sm">
                  {search ? "Keine Treffer." : "Noch keine Presseberichte angelegt."}
                </td>
              </tr>
            ) : (
              filtered.map((article) => (
                <tr
                  key={article.id}
                  className="group transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td className="px-4 py-3">
                    <span className="text-white/50 text-xs flex items-center gap-1.5">
                      <Calendar size={11} className="text-white/25" />
                      {fmtDate(article.date)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80 text-sm" style={{ fontFamily: "var(--font-condensed)", fontWeight: 600, letterSpacing: "0.04em" }}>
                      {article.outlet}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/60 text-sm line-clamp-2">{article.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5"
                      style={{
                        background: "rgba(202,12,133,0.08)",
                        border: "1px solid rgba(202,12,133,0.15)",
                        fontFamily: "var(--font-condensed)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {article.mediaType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:text-brand-light transition-colors"
                      title={article.url}
                    >
                      <ExternalLink size={12} />
                      <span className="text-xs max-w-[120px] truncate">{new URL(article.url).hostname.replace("www.", "")}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(article)}
                        className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-brand transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(article.id)}
                        className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                        title="Loeschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-6 space-y-4"
              style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white text-sm" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700 }}>
                    Pressebericht loeschen?
                  </p>
                  <p className="text-white/40 text-xs">
                    Diese Aktion kann nicht rueckgaengig gemacht werden.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-white/50 text-sm transition-colors hover:text-white"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: "44px" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-white text-sm transition-all active:scale-[0.98]"
                  style={{ background: "#e53e3e", minHeight: "44px" }}
                >
                  Loeschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet (Add / Edit) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" style={{ background: "var(--surface-1)", borderLeft: "1px solid rgba(255,255,255,0.06)", maxWidth: "480px", width: "100%" }}>
          <SheetHeader>
            <SheetTitle className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", letterSpacing: "0.04em" }}>
              {editId ? "BERICHT BEARBEITEN" : "NEUER PRESSEBERICHT"}
            </SheetTitle>
            <SheetDescription className="text-white/40 text-sm">
              {editId ? "Pressebericht aktualisieren." : "Neuen Pressebericht / Medienerwaehnung anlegen."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5 px-1">
            {/* Outlet */}
            <div>
              <FieldLabel required>Medium / Quelle</FieldLabel>
              <FieldInput
                value={form.outlet}
                onChange={(v) => setForm((f) => ({ ...f, outlet: v }))}
                placeholder="z.B. Suedwest Presse, TAG24, Stuttgarter Nachrichten..."
              />
            </div>

            {/* Title */}
            <div>
              <FieldLabel required>Ueberschrift / Titel</FieldLabel>
              <FieldTextarea
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="Titel des Artikels oder der Erwaehnung..."
                rows={2}
              />
            </div>

            {/* URL */}
            <div>
              <FieldLabel required>Link / URL</FieldLabel>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </div>
              {form.url && (
                <a
                  href={form.url.startsWith("http") ? form.url : `https://${form.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand text-xs mt-1.5 hover:text-brand-light transition-colors"
                >
                  <ExternalLink size={10} />
                  Link testen
                </a>
              )}
            </div>

            {/* Date */}
            <div>
              <FieldLabel required>Datum</FieldLabel>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>

            {/* Media Type */}
            <div>
              <FieldLabel required>Medienart</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {MEDIA_TYPES.map(({ value, label, icon: Icon }) => {
                  const active = form.mediaType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mediaType: value }))}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-all duration-200"
                      style={{
                        background: active ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
                        border: active ? "1px solid rgba(202,12,133,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        minHeight: "44px",
                      }}
                    >
                      <Icon size={14} style={{ color: active ? "var(--brand)" : "rgba(255,255,255,0.3)" }} />
                      <span style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: active ? "var(--brand)" : "rgba(255,255,255,0.4)",
                      }}>
                        {label.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Excerpt (optional) */}
            <div>
              <FieldLabel>Beschreibung (optional)</FieldLabel>
              <FieldTextarea
                value={form.excerpt}
                onChange={(v) => setForm((f) => ({ ...f, excerpt: v }))}
                placeholder="Kurze Zusammenfassung oder Zitat..."
                rows={3}
              />
            </div>

            {/* Thumbnail Image (optional) */}
            <div>
              <FieldLabel>Thumbnail-Bild URL (optional)</FieldLabel>
              <div className="relative">
                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  placeholder="https://example.com/bild.jpg"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </div>
              {form.image && (
                <div className="mt-2 relative overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", maxWidth: "120px" }}>
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-auto object-cover"
                    style={{ maxHeight: "80px" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white/50 transition-all hover:text-white hover:bg-white/[0.04]"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  minHeight: "48px",
                }}
              >
                <X size={14} />
                ABBRECHEN
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  minHeight: "48px",
                }}
                onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <Save size={14} />
                {saving ? "SPEICHERN..." : "SPEICHERN"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
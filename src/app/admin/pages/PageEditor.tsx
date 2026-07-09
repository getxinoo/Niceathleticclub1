/**
 * PageEditor – Split-screen Sitebuilder
 *
 * Layout:
 *   [Toolbar 56px] – Zurück / Seitentitel / Veröffentlichen / Speichern
 *   [Sidebar 300px] | [Preview flex-1]
 *
 * Sidebar: Block-Liste (DnD sortierbar), Block-Picker, Löschen
 * Preview: Live-Vorschau mit Desktop-/Mobile-Toggle
 * Settings: BlockSettingsSheet (AnimatePresence, rechts)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Monitor,
  Smartphone,
  ExternalLink,
  Save,
  Layers,
  Type,
  CreditCard,
  CheckCircle2,
  X,
  Eye,
  Loader2,
  Dumbbell,
  Star,
  Users,
  BarChart2,
  Zap,
  Mail,
  HelpCircle,
  Calendar,
  Image,
  List,
  MapPin,
  Briefcase,
  Clock,
  Shield,
  FileText,
  PlusCircle,
  Table,
  Undo2,
  Redo2,
  Search,
  Globe,
} from "lucide-react";
import {
  BLOCK_REGISTRY,
  PAGE_INITIAL_BLOCKS,
  createBlock,
  type PageBlock,
  type BlockType,
} from "../../../data/blocks";
import { api } from "../../../lib/api-service";
import { reseedPage } from "../../../lib/page-sync";
import { BlockPreview } from "../components/BlockPreview";
import { BlockSettingsSheet } from "../components/BlockSettingsSheet";
import { cn } from "../../../lib/utils";
import { usePageVisibility } from "../../context/PageVisibilityContext";

// ── DnD item type ────────────────────────────────────────────────────────────
const DND_TYPE = "PAGE_BLOCK";

// ── Page meta (for toolbar) ───────────────────────────────────────────────────
const PAGE_META: Record<string, { title: string; path: string }> = {
  home:               { title: "Startseite",         path: "/" },
  studio:             { title: "Studio",             path: "/studio" },
  kurse:              { title: "Kurse",              path: "/kurse" },
  preise:             { title: "Preise",             path: "/preise" },
  team:               { title: "Team",               path: "/team" },
  kontakt:            { title: "Kontakt",            path: "/kontakt" },
  probetraining:      { title: "Probetraining",      path: "/probetraining" },
  "ueber-uns":        { title: "Über uns",           path: "/ueber-uns" },
  "personal-training":{ title: "Personal Training",  path: "/personal-training" },
  "crossfit-gp":      { title: "CrossFit Göppingen", path: "/crossfit-gp" },
  firmenfitness:      { title: "Firmenfitness",      path: "/firmenfitness" },
  "athletic-area":    { title: "Athletic Area",      path: "/athletic-area" },
  hyrox:              { title: "HYROX Zone",         path: "/hyrox" },
  "nice-theke":       { title: "Nice Theke",         path: "/nice-theke" },
  karriere:           { title: "Karriere",           path: "/karriere" },
  presse:             { title: "Presse",             path: "/presse" },
  impressum:          { title: "Impressum",          path: "/impressum" },
  datenschutz:        { title: "Datenschutz",        path: "/datenschutz" },
  agb:                { title: "AGB",                path: "/agb" },
  "egym-wellpass":    { title: "EGYM Wellpass",      path: "/egym-wellpass" },
};

// ── Block type icon map ───────────────────────────────────────────────────────
const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  hero:              Layers,
  pillars:           Dumbbell,
  stats:             BarChart2,
  "rich-text":       Type,
  pricing:           CreditCard,
  reviews:           Star,
  cta:               Zap,
  team:              Users,
  "contact-form":    Mail,
  "pricing-cards":   CreditCard,
  "pricing-addons":  PlusCircle,
  "pricing-compare": Table,
  faq:               HelpCircle,
  timetable:         Calendar,
  "zone-grid":       Layers,
  "trust-badges":    Shield,
  "trial-form":      CheckCircle2,
  "image-gallery":   Image,
  "values-grid":     List,
  "features-list":   List,
  "location-map":    MapPin,
  "jobs-board":      Briefcase,
  "pros-cons":       List,
  "legal-content":   FileText,
  "opening-hours":   Clock,
  // Studio-spezifische Blöcke
  "studio-hero":     Image,
  "studio-zones":    Layers,
  "studio-info":     Clock,
  // Team-spezifische Blöcke
  "team-header":     Users,
  "team-grid":       Users,
};

// ── Draggable Block Item ──────────────────────────────────────────────────────
interface DraggableBlockProps {
  block: PageBlock;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  moveBlock: (from: number, to: number) => void;
}

function DraggableBlock({
  block, index, isSelected, isFirst, isLast,
  onSelect, onEdit, onDelete, onMoveUp, onMoveDown, moveBlock,
}: DraggableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const def = BLOCK_REGISTRY[block.type];
  const Icon = BLOCK_ICONS[block.type] ?? Layers;

  const [{ isDragging }, drag, preview] = useDrag({
    type: DND_TYPE,
    item: (): { id: string; index: number } => ({ id: block.id, index }),
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<
    { id: string; index: number }, void, { isOver: boolean }
  >({
    accept: DND_TYPE,
    collect: (m) => ({ isOver: m.isOver() }),
    hover(item) {
      if (!ref.current || item.index === index) return;
      moveBlock(item.index, index);
      item.index = index;
    },
  });

  // preview on the outer div, drag only on the handle
  preview(drop(ref));

  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
    >
      <div
        className="group"
        style={{
          background: isSelected
            ? "rgba(202,12,133,0.08)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${
            isSelected
              ? "rgba(202,12,133,0.35)"
              : isOver
              ? "rgba(202,12,133,0.2)"
              : "rgba(255,255,255,0.07)"
          }`,
          borderLeft: isSelected ? "3px solid var(--brand)" : "3px solid transparent",
          transition: "all 0.15s",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          {/* Drag handle */}
          <div
            ref={(el) => { if (el) drag(el); }}
            className="text-white/20 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={15} />
          </div>

          {/* Block icon */}
          <div
            className="w-7 h-7 flex items-center justify-center shrink-0"
            style={{
              background: `${def.color}18`,
              border: `1px solid ${def.color}30`,
            }}
          >
            <Icon size={12} style={{ color: def.color }} />
          </div>

          {/* Name + preview */}
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: isSelected ? "white" : "rgba(255,255,255,0.7)",
                textTransform: "uppercase",
              }}
            >
              {def.label}
            </p>
            <p
              className="truncate"
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}
            >
              {Object.values(block.data).find((v) => typeof v === "string" && v.length > 0) as string ?? "—"}
            </p>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionIconBtn icon={Pencil}    title="Bearbeiten" onClick={onEdit}    color="var(--brand)" />
            <ActionIconBtn icon={ChevronUp}   title="Nach oben"  onClick={onMoveUp}  disabled={isFirst} />
            <ActionIconBtn icon={ChevronDown} title="Nach unten" onClick={onMoveDown} disabled={isLast} />
            <ActionIconBtn icon={Trash2}    title="Löschen"    onClick={onDelete}  color="#f87171" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionIconBtn({
  icon: Icon, title, onClick, disabled = false, color,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="w-6 h-6 flex items-center justify-center cursor-pointer transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", borderRadius: "2px" }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = color ?? "white"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "none"; }}
    >
      <Icon size={12} />
    </button>
  );
}

// ── Block Picker ──────────────────────────────────────────────────────────────
function BlockPicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: BlockType) => void;
}) {
  // Alle verfügbaren Block-Typen, geordnet nach Kategorie
  const GROUPS: { label: string; types: BlockType[] }[] = [
    {
      label: "Layout & Inhalt",
      types: ["hero", "pillars", "rich-text", "stats", "cta"],
    },
    {
      label: "Team & Community",
      types: ["team", "reviews", "trust-badges", "values-grid"],
    },
    {
      label: "Preise & Tarife",
      types: ["pricing", "pricing-cards", "pricing-addons", "pricing-compare", "pros-cons"],
    },
    {
      label: "Kurs & Training",
      types: ["timetable", "zone-grid", "features-list", "image-gallery"],
    },
    {
      label: "Kontakt & Formulare",
      types: ["contact-form", "trial-form", "location-map", "opening-hours"],
    },
    {
      label: "Weitere",
      types: ["faq", "jobs-board", "legal-content"],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            onClick={onClose}
          />
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 z-40"
            style={{
              background: "#0e0e0e",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 sticky top-0"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                background: "#0e0e0e",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                }}
              >
                Block-Bibliothek
              </span>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-2">
              {GROUPS.map((group) => (
                <div key={group.label} className="mb-1">
                  {/* Group label */}
                  <p
                    className="px-3 py-1.5"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {group.label}
                  </p>
                  {group.types.map((type) => {
                    const def = BLOCK_REGISTRY[type];
                    const Ico = BLOCK_ICONS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => { onAdd(type); onClose(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 cursor-pointer group"
                        style={{
                          background: "none",
                          border: "none",
                          borderRadius: "2px",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "none")
                        }
                      >
                        <div
                          className="w-8 h-8 flex items-center justify-center shrink-0"
                          style={{
                            background: `${def.color}18`,
                            border: `1px solid ${def.color}35`,
                          }}
                        >
                          <Ico size={13} style={{ color: def.color }} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-white/80 group-hover:text-white"
                            style={{
                              fontFamily: "var(--font-condensed)",
                              fontSize: "12px",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            {def.label}
                          </p>
                          <p
                            className="truncate"
                            style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}
                          >
                            {def.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <div
                    style={{
                      height: "1px",
                      background: "rgba(255,255,255,0.04)",
                      margin: "4px 12px",
                    }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Page Editor ──────────────────────────────────────────────────────────
export default function PageEditor() {
  const { slug = "home" } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const meta = PAGE_META[slug] ?? { title: slug, path: `/${slug}` };

  // ── SEO State ─────────────────────────────────────────────────────────────
  interface SeoData {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
    canonical: string;
    robots: string;
    schemaJson: string;
  }
  const [seo, setSeo] = useState<SeoData>({
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    canonical: "",
    robots: "index, follow",
    schemaJson: "",
  });
  const [sidebarTab, setSidebarTab] = useState<"blocks" | "seo">("blocks");

  // ── Undo/Redo History ──────────────────────────────────────────────────────
  const historyRef = useRef<PageBlock[][]>([]);
  const historyIdxRef = useRef<number>(-1);
  const isUndoRedo = useRef(false);

  // ── State ──────────────────────────────────────────────────────────────────
  const [blocks, _setBlocks]              = useState<PageBlock[]>([]);
  const [canUndo, setCanUndo]             = useState(false);
  const [canRedo, setCanRedo]             = useState(false);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [previewMode, setPreviewMode]     = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving]              = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);

  // Wrapper: pushes to history before update
  const setBlocks = useCallback((updater: PageBlock[] | ((prev: PageBlock[]) => PageBlock[])) => {
    _setBlocks((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!isUndoRedo.current) {
        // Trim future history
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(next);
        historyIdxRef.current = historyRef.current.length - 1;
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(false);
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    isUndoRedo.current = true;
    historyIdxRef.current -= 1;
    const prev = historyRef.current[historyIdxRef.current];
    _setBlocks(prev);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
    isUndoRedo.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    isUndoRedo.current = true;
    historyIdxRef.current += 1;
    const next = historyRef.current[historyIdxRef.current];
    _setBlocks(next);
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    isUndoRedo.current = false;
  }, []);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+S
  const handleSaveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSaveRef.current(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // pages.status ist die einzige Quelle für Sichtbarkeit – "Veröffentlicht/Entwurf"
  // ist der einzige öffentliche Sichtbarkeitsschalter (siehe Toolbar unten).
  const { isVisible, setVisible } = usePageVisibility();
  const published = isVisible(slug);

  // Load initial blocks: API → localStorage → seed
  useEffect(() => {
    let cancelled = false;
    historyRef.current = [];
    historyIdxRef.current = -1;

    // Fast path: show localStorage or seed immediately (no flicker)
    const getLocalOrSeed = (): PageBlock[] => {
      try {
        const saved = localStorage.getItem(`nac_blocks_${slug}`);
        if (saved) {
          const parsed = JSON.parse(saved) as PageBlock[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
      return PAGE_INITIAL_BLOCKS[slug] ?? [];
    };

    // Load SEO from localStorage
    try {
      const seoSaved = localStorage.getItem(`nac_seo_${slug}`);
      if (seoSaved) setSeo(JSON.parse(seoSaved));
    } catch { /* ignore */ }

    const initial = getLocalOrSeed();
    // Prime history
    historyRef.current = [initial];
    historyIdxRef.current = 0;
    _setBlocks(initial);
    setCanUndo(false);
    setCanRedo(false);

    // Background: try PHP API to get server-saved blocks (production).
    // admin=1 damit auch Draft-Seiten im Editor geladen werden können –
    // published/draft steuert weiterhin ausschließlich pages.status.
    api.pages.getBlocks(slug, { admin: true })
      .then((res) => {
        if (cancelled) return;
        if (Array.isArray(res?.blocks) && res.blocks.length > 0) {
          const serverBlocks = res.blocks as PageBlock[];
          historyRef.current = [serverBlocks];
          historyIdxRef.current = 0;
          _setBlocks(serverBlocks);
          setCanUndo(false);
          setCanRedo(false);
        }
      })
      .catch(() => { /* already showing localStorage/seed */ });

    return () => { cancelled = true; };
  }, [slug]);

  // ── Block operations ───────────────────────────────────────────────────────
  const moveBlock = useCallback((fromIdx: number, toIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlockData = (id: string, data: Record<string, unknown>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data } : b))
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Ref synchron halten (für Ctrl+S Keyboard-Shortcut)
    handleSaveRef.current = handleSave;

    // Leeres blocks[] darf nur nach bewusster Bestätigung gespeichert werden –
    // kein automatisches Überschreiben bestehender Inhalte.
    let allowEmptyBlocks = false;
    if (blocks.length === 0) {
      const confirmed = window.confirm(
        `Seite "${meta.title}" wird ohne Inhalte (0 Blöcke) gespeichert. Fortfahren?`
      );
      if (!confirmed) return;
      allowEmptyBlocks = true;
    }

    setSaving(true);

    // 1. SEO in localStorage persistieren
    try { localStorage.setItem(`nac_seo_${slug}`, JSON.stringify(seo)); } catch { /* ignore */ }

    // 2. Blöcke in localStorage persistieren (schnell, offline-sicher)
    try {
      localStorage.setItem(`nac_blocks_${slug}`, JSON.stringify(blocks));
      window.dispatchEvent(new CustomEvent("nac-page-updated", { detail: { slug } }));
    } catch { /* ignore */ }

    // 3. Async zur PHP-API (Best-Effort – schlägt im Offline-Modus still fehl)
    try {
      // "title"/"meta_description" werden hier bewusst NICHT gesendet: der SEO-Tab
      // ist aktuell nur localStorage-gestützt (nie vom Server geladen) – ein Save
      // würde sonst einen echten DB-Titel/Meta-Text stillschweigend überschreiben.
      await api.pages.saveBlocks(slug, {
        blocks: blocks as import("../../../lib/api-service").SerializedBlock[],
        status: published ? "published" : "draft",
        allow_empty_blocks: allowEmptyBlocks,
      });
    } catch (err) {
      console.info("[PageEditor] PHP-API nicht erreichbar – in localStorage gespeichert.", err);
    }

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex flex-col"
        style={{
          /* Negate AdminLayout's p-6 (24px) to bleed edge-to-edge */
          margin: "-24px",
          /* Fill remaining height below the 64px AdminLayout header */
          height: "calc(100vh - 64px)",
          background: "var(--surface-0)",
          overflow: "hidden",
        }}
      >
        {/* ── Toolbar ── */}
        <div
          className="flex items-center gap-3 px-4 shrink-0"
          style={{
            height: "56px",
            background: "#080808",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            zIndex: 20,
          }}
        >
          {/* Back */}
          <Link
            to="/admin/seiten"
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}
          >
            <ArrowLeft size={13} />
            Seiten
          </Link>

          <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>

          {/* Page title */}
          <span
            className="text-white"
            style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            {meta.title}
          </span>

          {/* Block count chip */}
          <span
            className="ml-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.3)",
              padding: "2px 8px",
            }}
          >
            {blocks.length} {blocks.length === 1 ? "Block" : "Blöcke"}
          </span>

          {/* Undo / Redo */}
          <div className="flex items-center" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Rückgängig (Ctrl+Z)"
              className="flex items-center justify-center px-3 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", minHeight: "34px", borderRight: "1px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => { if (canUndo) e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Wiederholen (Ctrl+Y)"
              className="flex items-center justify-center px-3 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", minHeight: "34px" }}
              onMouseEnter={(e) => { if (canRedo) e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Redo2 size={13} />
            </button>
          </div>

          <div className="flex-1" />

          {/* Preview link */}
          <a
            href={meta.path}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 text-white/40 hover:text-white/70 transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              minHeight: "34px",
            }}
          >
            <ExternalLink size={11} />
            Vorschau
          </a>

          {/* Publish toggle – der einzige öffentliche Sichtbarkeitsschalter (schreibt pages.status) */}
          <button
            onClick={() => setVisible(slug, !published)}
            className="flex items-center gap-2 px-3 cursor-pointer transition-all duration-200"
            style={{
              background: published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${published ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: published ? "#4ade80" : "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              minHeight: "34px",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: published ? "#4ade80" : "rgba(255,255,255,0.2)" }}
            />
            {published ? "Veröffentlicht" : "Entwurf"}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 text-white transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-60"
            style={{
              background: saveSuccess ? "rgba(74,222,128,0.8)" : "var(--brand)",
              border: "none",
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              minHeight: "34px",
              minWidth: "100px",
            }}
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saveSuccess ? (
              <><CheckCircle2 size={13} /> Gespeichert</>
            ) : (
              <><Save size={13} /> Speichern</>
            )}
          </button>
        </div>

        {/* ── Main split ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Block Sidebar ── */}
          <div
            className="flex flex-col shrink-0"
            style={{
              width: "300px",
              background: "#070707",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* ── Sidebar Tab Navigation ── */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {([{ key: "blocks", label: "Blöcke" }, { key: "seo", label: "SEO" }] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSidebarTab(key)}
                  className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  style={{
                    background: sidebarTab === key ? "rgba(202,12,133,0.08)" : "none",
                    border: "none",
                    borderBottom: sidebarTab === key ? "2px solid var(--brand)" : "2px solid transparent",
                    color: sidebarTab === key ? "var(--brand)" : "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    padding: "10px 0",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {sidebarTab === "seo" ? (
              /* ── SEO Tab ── */
              <div className="flex-1 overflow-y-auto p-4" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                  Suchmaschinen-Optimierung
                </p>
                {/* Meta Title */}
                <div>
                  <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Meta Title</label>
                  <input value={seo.metaTitle} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))} placeholder={`${meta.title} | Nice Athletic Club`} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 12px", fontSize: "12px", boxSizing: "border-box", outline: "none" }} />
                  <p style={{ fontSize: "10px", color: seo.metaTitle.length > 60 ? "#f87171" : "rgba(255,255,255,0.2)", marginTop: "4px", textAlign: "right" }}>{seo.metaTitle.length}/60</p>
                </div>
                {/* Meta Description */}
                <div>
                  <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Meta Description</label>
                  <textarea value={seo.metaDescription} onChange={(e) => setSeo((s) => ({ ...s, metaDescription: e.target.value }))} rows={3} placeholder="Kurze, prägnante Beschreibung (150–160 Zeichen)…" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 12px", fontSize: "12px", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
                  <p style={{ fontSize: "10px", color: seo.metaDescription.length > 160 ? "#f87171" : "rgba(255,255,255,0.2)", marginTop: "4px", textAlign: "right" }}>{seo.metaDescription.length}/160</p>
                </div>
                {/* OG Image */}
                <div>
                  <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>OG Bild-URL</label>
                  <input value={seo.ogImage} onChange={(e) => setSeo((s) => ({ ...s, ogImage: e.target.value }))} placeholder="https://…/og-image.jpg (1200×630px)" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 12px", fontSize: "12px", boxSizing: "border-box", outline: "none" }} />
                </div>
                {/* Robots */}
                <div>
                  <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Robots</label>
                  <select value={seo.robots} onChange={(e) => setSeo((s) => ({ ...s, robots: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 12px", fontSize: "12px", boxSizing: "border-box" }}>
                    <option value="index, follow">index, follow (Standard)</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
                {/* Schema JSON-LD */}
                <div>
                  <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Schema.org JSON-LD</label>
                  <textarea value={seo.schemaJson} onChange={(e) => setSeo((s) => ({ ...s, schemaJson: e.target.value }))} rows={5} placeholder={`{\n  "@type": "LocalBusiness"\n}`} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 12px", fontSize: "11px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
                </div>
                {/* SERP Preview */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", padding: "16px" }}>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "10px" }}>Google-Vorschau</p>
                  <p style={{ color: "#4285f4", fontSize: "14px", lineHeight: 1.3, marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seo.metaTitle || `${meta.title} | Nice Athletic Club`}</p>
                  <p style={{ color: "#006621", fontSize: "11px", marginBottom: "3px" }}>nicefitness.de{meta.path}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", lineHeight: 1.5, display: "-webkit-box" as const, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{seo.metaDescription || "Keine Meta-Description angegeben."}</p>
                </div>
                <button onClick={handleSaveRef.current} className="flex items-center justify-center gap-2 text-white cursor-pointer active:scale-[0.98]" style={{ background: "var(--brand)", border: "none", padding: "12px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  <Save size={12} /> Seite + SEO speichern
                </button>
              </div>
            ) : (
              /* ── Blocks Tab ── */
              <>
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                }}
              >
                Seitenstruktur
              </span>
              <button
                onClick={() => setSelectedId(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: "11px", cursor: "pointer", fontFamily: "var(--font-condensed)", letterSpacing: "0.08em" }}
              >
                Auswahl löschen
              </button>
            </div>

            {/* Sync-Banner: zeigt an ob Seed-Daten vorhanden sind */}
            {PAGE_INITIAL_BLOCKS[slug] && (
              <div
                className="flex items-center justify-between px-3 py-2 shrink-0"
                style={{ background: "rgba(202,12,133,0.04)", borderBottom: "1px solid rgba(202,12,133,0.1)" }}
              >
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>
                  ✓ Synced mit Frontend
                </span>
                <button
                  onClick={() => {
                    if (window.confirm(`Seite "${meta.title}" auf Standard-Design zurücksetzen? Alle Änderungen gehen verloren.`)) {
                      const seed = PAGE_INITIAL_BLOCKS[slug];
                      if (seed && seed.length > 0) {
                        setBlocks(seed);
                        setSelectedId(null);
                        reseedPage(slug);
                      }
                    }
                  }}
                  title="Auf Standard zurücksetzen (löscht eigene Änderungen)"
                  style={{ background: "none", border: "none", color: "rgba(202,12,133,0.4)", fontSize: "9px", cursor: "pointer", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(202,12,133,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(202,12,133,0.4)")}
                >
                  ↺ Reset
                </button>
              </div>
            )}

            {/* Block list (scrollable) */}
            <div className="flex-1 overflow-y-auto py-2">
              <AnimatePresence mode="popLayout">
                {blocks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 px-6 text-center"
                  >
                    <div
                      className="w-14 h-14 flex items-center justify-center mb-4"
                      style={{
                        border: "2px dashed rgba(255,255,255,0.1)",
                        borderRadius: "4px",
                      }}
                    >
                      <Layers size={22} style={{ color: "rgba(255,255,255,0.15)" }} />
                    </div>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: "6px" }}>
                      Noch leer
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", lineHeight: 1.5 }}>
                      Füge deinen ersten Block hinzu, um zu beginnen.
                    </p>
                  </motion.div>
                ) : (
                  blocks.map((block, idx) => (
                    <motion.div
                      key={block.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mx-2 mb-1"
                    >
                      <DraggableBlock
                        block={block}
                        index={idx}
                        isSelected={selectedId === block.id}
                        isFirst={idx === 0}
                        isLast={idx === blocks.length - 1}
                        onSelect={() => setSelectedId(block.id)}
                        onEdit={() => {
                          setSelectedId(block.id);
                          setSettingsOpen(true);
                        }}
                        onDelete={() => deleteBlock(block.id)}
                        onMoveUp={() => idx > 0 && moveBlock(idx, idx - 1)}
                        onMoveDown={() => idx < blocks.length - 1 && moveBlock(idx, idx + 1)}
                        moveBlock={moveBlock}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Add block button */}
            <div
              className="p-3 shrink-0 relative"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <BlockPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onAdd={addBlock}
              />
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-2 text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{
                  background: pickerOpen ? "var(--brand-light)" : "var(--brand)",
                  border: "none",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  minHeight: "44px",
                  boxShadow: "0 0 16px rgba(202,12,133,0.3)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
                onMouseLeave={(e) => !pickerOpen && (e.currentTarget.style.background = "var(--brand)")}
              >
                <Plus size={15} />
                Block hinzufügen
              </button>
            </div>
            </>
            )}
          </div>

          {/* ── RIGHT: Preview Pane ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview toolbar */}
            <div
              className="flex items-center gap-3 px-5 shrink-0"
              style={{
                height: "44px",
                background: "#060606",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Device toggle */}
              <div
                className="flex"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {(["desktop", "mobile"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className="flex items-center justify-center gap-1.5 px-3 transition-all duration-150 cursor-pointer"
                    style={{
                      background: previewMode === mode ? "rgba(202,12,133,0.15)" : "transparent",
                      border: "none",
                      color: previewMode === mode ? "var(--brand)" : "rgba(255,255,255,0.3)",
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      minHeight: "32px",
                    }}
                  >
                    {mode === "desktop" ? <Monitor size={12} /> : <Smartphone size={12} />}
                    {mode === "desktop" ? "Desktop" : "Mobile"}
                  </button>
                ))}
              </div>

              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.08em",
                }}
              >
                {previewMode === "desktop" ? "1280px" : "390px"} Preview
              </span>

              <div className="flex-1" />

              {/* Edit hint */}
              {!selectedId && blocks.length > 0 && (
                <span
                  className="flex items-center gap-1.5"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}
                >
                  <Eye size={11} />
                  Block in der Sidebar auswählen zum Bearbeiten
                </span>
              )}
            </div>

            {/* Preview scroll area */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ background: "#111" }}
            >
              <div
                style={{
                  margin: "0 auto",
                  maxWidth: previewMode === "mobile" ? "390px" : "1280px",
                  background: "#050505",
                  minHeight: "100%",
                  boxShadow: previewMode === "mobile"
                    ? "0 0 40px rgba(0,0,0,0.8)"
                    : "none",
                  transition: "max-width 0.3s ease",
                }}
              >
                {blocks.length === 0 ? (
                  /* Empty state in preview */
                  <div
                    className="flex flex-col items-center justify-center"
                    style={{ minHeight: "400px", padding: "48px" }}
                  >
                    <div
                      className="flex flex-col items-center gap-4"
                      style={{
                        border: "2px dashed rgba(255,255,255,0.07)",
                        padding: "48px",
                        maxWidth: "400px",
                        textAlign: "center",
                      }}
                    >
                      <Layers size={40} style={{ color: "rgba(255,255,255,0.08)" }} />
                      <div>
                        <p
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.5rem",
                            color: "rgba(255,255,255,0.15)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Leere Seite
                        </p>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", marginTop: "8px", lineHeight: 1.6 }}>
                          Füge deinen ersten Block über die Sidebar hinzu.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {blocks.map((block) => (
                      <motion.div
                        key={block.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedId(block.id)}
                        style={{
                          position: "relative",
                          cursor: "pointer",
                          outline: selectedId === block.id
                            ? "2px solid var(--brand)"
                            : "2px solid transparent",
                          outlineOffset: "-2px",
                          transition: "outline 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedId !== block.id)
                            e.currentTarget.style.outline = "2px solid rgba(202,12,133,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedId !== block.id)
                            e.currentTarget.style.outline = "2px solid transparent";
                        }}
                      >
                        {/* Selected label */}
                        {selectedId === block.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              zIndex: 10,
                              background: "var(--brand)",
                              padding: "3px 10px",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.15em",
                              color: "white",
                              textTransform: "uppercase",
                            }}
                          >
                            {BLOCK_REGISTRY[block.type].label}
                          </div>
                        )}

                        {/* Quick edit button */}
                        {selectedId === block.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
                            className="flex items-center gap-1.5 cursor-pointer text-white transition-all active:scale-[0.98]"
                            style={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              zIndex: 10,
                              background: "var(--brand)",
                              border: "none",
                              padding: "3px 12px",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                            }}
                          >
                            <Pencil size={10} />
                            Bearbeiten
                          </button>
                        )}

                        <BlockPreview block={block} previewMode={previewMode} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Block Settings Sheet ── */}
      <BlockSettingsSheet
        block={selectedBlock}
        open={settingsOpen && selectedBlock !== null}
        onClose={() => setSettingsOpen(false)}
        onSave={updateBlockData}
      />
    </DndProvider>
  );
}
/**
 * BlockSettingsSheet – Right-side slide-in panel for editing a block's data.
 * Driven by the block's FieldSchema from BLOCK_REGISTRY.
 *
 * Architecture:
 *   FieldRow          — dispatcher: renders the correct input for each FieldType
 *   RepeaterField     — dynamic list of sub-item cards; calls <FieldRow> recursively
 *   BlockSettingsSheet — the main slide-in panel (AnimatePresence + backdrop)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Save,
  Layers,
  Type,
  CreditCard,
  Star,
  Users,
  Upload,
  HelpCircle,
  Trash2,
  Plus,
  Copy,
  ChevronUp,
  ChevronDown,
  Mail,
  PlusCircle,
  Table,
  Zap,
  Link2,
  Globe,
  AlertTriangle,
} from "lucide-react";
import {
  BLOCK_REGISTRY,
  type PageBlock,
  type FieldSchema,
} from "../../../data/blocks";
import { classifyLinkInput, validateLink } from "../../../lib/links";
import { PricingDomainEditor } from "./PricingDomainEditor";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; style?: React.CSSProperties }>
> = {
  Layers,
  Type,
  CreditCard,
  Star,
  Users,
  Mail,
  PlusCircle,
  Table,
  HelpCircle,
  Zap,
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  padding: "10px 12px",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
  outline: "none",
  borderRadius: "2px",
  transition: "border-color 0.15s",
};

const FOCUS_BORDER = "rgba(202,12,133,0.6)";
const BLUR_BORDER  = "rgba(255,255,255,0.1)";

// ── Utility: stable ID generator for repeater items ───────────────────────────
let _idCounter = 0;
function nextId() {
  return `_rid_${++_idCounter}`;
}

/** Ensure every repeater item has a stable `_id` (used as AnimatePresence key). */
function withId(item: Record<string, unknown>): Record<string, unknown> {
  return item._id ? item : { ...item, _id: nextId() };
}

/** Deep clone a plain repeater item (data-only, no functions/DOM). */
function structuredCloneSafe(item: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(item));
  } catch {
    return { ...item };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Primitive field components ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function TextField({
  field,
  value,
  onChange,
  type = "text",
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={field.placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
      onFocus={(e) => (e.currentTarget.style.borderColor = FOCUS_BORDER)}
      onBlur={(e)  => (e.currentTarget.style.borderColor = BLUR_BORDER)}
    />
  );
}

function TextareaField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      placeholder={field.placeholder ?? ""}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
      onFocus={(e) => (e.currentTarget.style.borderColor = FOCUS_BORDER)}
      onBlur={(e)  => (e.currentTarget.style.borderColor = BLUR_BORDER)}
    />
  );
}

function ToggleField({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 cursor-pointer"
      style={{ background: "none", border: "none", padding: 0, width: "100%" }}
    >
      {/* Track */}
      <div
        style={{
          width: "40px",
          height: "22px",
          background: value ? "var(--brand)" : "rgba(255,255,255,0.1)",
          borderRadius: "11px",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: value ? "21px" : "3px",
            width: "16px",
            height: "16px",
            background: "white",
            borderRadius: "50%",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        />
      </div>
      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
        {label}
      </span>
    </button>
  );
}

function MultiselectField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-col gap-2">
      {field.options?.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="flex items-center gap-3 px-3 cursor-pointer transition-all duration-150 text-left"
            style={{
              background: active ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
              minHeight: "40px",
              color: active ? "var(--brand)" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {/* Checkbox indicator */}
            <span
              style={{
                width: "14px",
                height: "14px",
                border: `2px solid ${active ? "var(--brand)" : "rgba(255,255,255,0.2)"}`,
                background: active ? "var(--brand)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "9px",
                color: "white",
              }}
            >
              {active ? "✓" : ""}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          appearance: "none",
          WebkitAppearance: "none",
          cursor: "pointer",
          paddingRight: "36px",
          borderColor: focused ? FOCUS_BORDER : BLUR_BORDER,
        }}
      >
        {field.options?.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: "#141414", color: "white" }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      {/* Custom chevron */}
      <div
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: focused ? "rgba(202,12,133,0.8)" : "rgba(255,255,255,0.3)",
          transition: "color 0.15s",
          lineHeight: 1,
          fontSize: "10px",
        }}
      >
        ▼
      </div>
    </div>
  );
}

function NumberField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={field.min}
      max={field.max}
      step={field.step ?? 1}
      placeholder={field.placeholder ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
      onFocus={(e) => (e.currentTarget.style.borderColor = FOCUS_BORDER)}
      onBlur={(e)  => (e.currentTarget.style.borderColor = BLUR_BORDER)}
    />
  );
}

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i;
// Unsplash URLs are treated as images
const UNSPLASH_RE  = /unsplash\.com/i;

function MediaField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const isVideo  = VIDEO_EXT_RE.test(value);
  const isImage  = (IMAGE_EXT_RE.test(value) || UNSPLASH_RE.test(value)) && !isVideo;
  const hasMedia = value.trim().length > 0;
  const hasSuggestions = (field.imageSuggestions?.length ?? 0) > 0;

  /** Convert local file → object URL (best-effort; production → PHP upload endpoint) */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Prefer real upload; fallback to blob URL for preview
    onChange(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Row 1: URL input + Upload button ─────────────────────────────────── */}
      <div className="flex gap-2 items-stretch">
        <input
          type="url"
          value={value}
          placeholder={field.placeholder ?? "https://… oder Datei hochladen"}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = FOCUS_BORDER)}
          onBlur={(e)  => (e.currentTarget.style.borderColor = BLUR_BORDER)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Datei hochladen"
          className="flex items-center gap-1.5 px-3 shrink-0 cursor-pointer transition-all duration-150 active:scale-[0.97]"
          style={{
            background: "transparent",
            border: "1px solid rgba(202,12,133,0.5)",
            color: "rgba(202,12,133,0.9)",
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            borderRadius: "2px",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.12)"; e.currentTarget.style.borderColor = "rgba(202,12,133,0.8)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
        >
          <Upload size={11} />
          Upload
        </button>
      </div>

      {/* ── Media-type badge ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {hasMedia && isVideo && (
          <motion.p key="video-hint" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
            style={{ fontSize: "11px", color: "#4ade80", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>✓</span> Video erkannt
          </motion.p>
        )}
        {hasMedia && isImage && (
          <motion.p key="image-hint" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
            style={{ fontSize: "11px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>✓</span> Bild erkannt
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Live preview thumbnail ────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasMedia && (isVideo || isImage) && (
          <motion.div key="preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", borderRadius: "2px" }}>
              {isVideo ? (
                <video src={value} muted loop autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
              ) : (
                <img src={value} alt="Vorschau" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
              )}
              {/* Clear button */}
              <button
                type="button"
                onClick={() => onChange("")}
                style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "2px", fontSize: "12px" }}
                title="Bild entfernen"
              >
                ×
              </button>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "8px", background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)", pointerEvents: "none" }}>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                  {isVideo ? "Video-Vorschau" : "Bild-Vorschau"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bildarchiv / Vorgeschlagene Bilder ───────────────────────────────── */}
      {hasSuggestions && (
        <div>
          {/* Toggle button */}
          <button
            type="button"
            onClick={() => setGalleryOpen((v) => !v)}
            className="flex items-center justify-between w-full cursor-pointer transition-colors duration-150"
            style={{
              background: galleryOpen ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${galleryOpen ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.08)"}`,
              padding: "8px 12px",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => { if (!galleryOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={(e) => { if (!galleryOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "14px" }}>🖼</span>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: galleryOpen ? "var(--brand)" : "rgba(255,255,255,0.5)" }}>
                Bildarchiv ({field.imageSuggestions!.length} Bilder)
              </span>
            </div>
            <span style={{ color: galleryOpen ? "var(--brand)" : "rgba(255,255,255,0.3)", fontSize: "10px", transition: "transform 0.2s", display: "inline-block", transform: galleryOpen ? "rotate(180deg)" : "none" }}>
              ▼
            </span>
          </button>

          {/* Gallery grid */}
          <AnimatePresence>
            {galleryOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  padding: "10px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(202,12,133,0.15)",
                  borderTop: "none",
                }}>
                  {/* Grid header */}
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Klick = auswählen · Bildquelle: Unsplash
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {field.imageSuggestions!.map((img) => {
                      const isSelected = value === img.url;
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => { onChange(img.url); setGalleryOpen(false); }}
                          title={img.label}
                          style={{
                            position: "relative",
                            aspectRatio: "16/9",
                            overflow: "hidden",
                            padding: 0,
                            cursor: "pointer",
                            border: `2px solid ${isSelected ? "var(--brand)" : "rgba(255,255,255,0.06)"}`,
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "2px",
                            transition: "border-color 0.15s, transform 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; e.currentTarget.style.transform = "scale(1.02)"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = ""; }}
                        >
                          <img
                            src={img.url.replace("w=1920", "w=400")}
                            alt={img.label}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: isSelected ? "none" : "brightness(0.75) saturate(0.9)" }}
                          />
                          {/* Label */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "6px", background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)", pointerEvents: "none" }}>
                            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{img.label}</span>
                          </div>
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div style={{ position: "absolute", top: "6px", right: "6px", width: "18px", height: "18px", background: "var(--brand)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── LayoutVariantField — Mosaik-Auswahl mit Miniatur-Diagrammen ───────────────
// ─────────────────────────────────────────────────────────────────────────────
// Zwei Kacheln „Großes Bild links“ / „Großes Bild rechts“. Die Größe gehört
// zum SLOT (siehe lib/studio-layout.ts) – beim Umschalten aktualisieren sich
// Positions-Labels und Vorschau sofort (lokaler Editor-State, kein Save nötig).

function MosaicDiagram({ variant }: { variant: "feature-left" | "feature-right" }) {
  const cell = (feature: boolean): React.CSSProperties => ({
    background: feature ? "rgba(202,12,133,0.6)" : "rgba(255,255,255,0.16)",
    borderRadius: 1,
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: 3,
        width: "100%",
        height: 64,
      }}
    >
      {variant === "feature-left" ? (
        <>
          {/* Groß links (2×2), zwei Kleine rechts */}
          <div style={{ ...cell(true), gridColumn: "1 / span 2", gridRow: "1 / span 2" }} />
          <div style={cell(false)} />
          <div style={cell(false)} />
        </>
      ) : (
        <>
          {/* Zwei Kleine links, Groß rechts (2×2) */}
          <div style={{ ...cell(false), gridColumn: "1", gridRow: "1" }} />
          <div style={{ ...cell(true), gridColumn: "2 / span 2", gridRow: "1 / span 2" }} />
          <div style={{ ...cell(false), gridColumn: "1", gridRow: "2" }} />
        </>
      )}
      {/* Untere Reihe: drei Kleine */}
      <div style={cell(false)} />
      <div style={cell(false)} />
      <div style={cell(false)} />
    </div>
  );
}

function LayoutVariantField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = value === "feature-right" ? "feature-right" : "feature-left";
  const options = [
    { key: "feature-left" as const,  label: "Großes Bild links" },
    { key: "feature-right" as const, label: "Großes Bild rechts" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {options.map((opt) => {
        const active = current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="cursor-pointer transition-all duration-150 active:scale-[0.98]"
            style={{
              padding: "10px",
              background: active ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(202,12,133,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "3px",
              textAlign: "center",
            }}
          >
            <MosaicDiagram variant={opt.key} />
            <span
              style={{
                display: "block",
                marginTop: "8px",
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "var(--brand)" : "rgba(255,255,255,0.5)",
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── LinkField — internal/external link with validation ────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// The data model stays a plain string (backward-compatible with every existing
// btn*Url / *Link / ctaUrl field). This widget only classifies + validates that
// string live: internal must start with "/", external with http(s)://, and
// "javascript:" / "#" are rejected (see lib/links.ts — the single rule source).

function LinkField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  const raw = value ?? "";
  const trimmed = raw.trim();
  const kind = classifyLinkInput(raw).kind; // "internal" | "external" | "none"

  // Validate only when something is typed (empty = "no link", which is valid).
  let error: string | undefined;
  if (trimmed !== "") {
    if (/^\s*javascript:/i.test(trimmed)) {
      error = "javascript:-Links sind nicht erlaubt.";
    } else if (trimmed === "#" || trimmed.startsWith("#")) {
      error = 'Anker/"#"-Links sind hier nicht erlaubt – gib einen echten Pfad oder eine URL an.';
    } else if (kind === "none") {
      error = 'Link muss mit "/" (intern) oder "http://" / "https://" (extern) beginnen.';
    } else {
      // Reuse the canonical validator for the finer rules.
      const link =
        kind === "internal"
          ? ({ kind: "internal", path: trimmed } as const)
          : ({ kind: "external", url: trimmed } as const);
      const res = validateLink(link);
      if (!res.valid) error = res.error;
    }
  }

  const badge =
    trimmed === ""
      ? { label: "Kein Link", color: "rgba(255,255,255,0.3)", Icon: Link2 }
      : kind === "internal"
      ? { label: "Intern", color: "#60a5fa", Icon: Link2 }
      : kind === "external"
      ? { label: "Extern", color: "#a78bfa", Icon: Globe }
      : { label: "Ungültig", color: "#f87171", Icon: AlertTriangle };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={raw}
        placeholder={field.placeholder ?? "/interner-pfad oder https://…"}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, borderColor: error ? "rgba(248,113,113,0.6)" : BLUR_BORDER }}
        onFocus={(e) => (e.currentTarget.style.borderColor = error ? "rgba(248,113,113,0.8)" : FOCUS_BORDER)}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "rgba(248,113,113,0.6)" : BLUR_BORDER)}
      />
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-condensed)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: badge.color,
            background: `${badge.color}14`,
            border: `1px solid ${badge.color}33`,
            padding: "2px 7px",
          }}
        >
          <badge.Icon size={9} /> {badge.label}
        </span>
        {error && (
          <span style={{ fontSize: 11, color: "#f87171", lineHeight: 1.4 }}>{error}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── FieldRow — dispatcher (declared BEFORE RepeaterField for clarity) ─────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the appropriate input widget for a single `FieldSchema`.
 * Called recursively from `RepeaterField` for sub-fields.
 */
function FieldRow({
  field,
  value,
  onChange,
  blockData,
}: {
  field: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Aktuelle (ungespeicherte) Daten des gesamten Blocks – für Repeater-Positionslabels. */
  blockData?: Record<string, unknown>;
}) {
  return (
    <div className="flex flex-col gap-2">

      {/* ── Label (skipped for toggle — it renders its own inline label) ──────── */}
      {field.type !== "toggle" && (
        <label
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          {field.label}
        </label>
      )}

      {/* ── text ──────────────────────────────────────────────────────────────── */}
      {field.type === "text" && (
        <TextField
          field={field}
          value={String(value ?? "")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── url ───────────────────────────────────────────────────────────────── */}
      {field.type === "url" && (
        <TextField
          field={field}
          value={String(value ?? "")}
          onChange={onChange as (v: string) => void}
          type="url"
        />
      )}

      {/* ── link (internal/external, validated) ───────────────────────────────── */}
      {field.type === "link" && (
        <LinkField
          field={field}
          value={String(value ?? "")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── textarea ──────────────────────────────────────────────────────────── */}
      {field.type === "textarea" && (
        <TextareaField
          field={field}
          value={String(value ?? "")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── toggle ────────────────────────────────────────────────────────────── */}
      {field.type === "toggle" && (
        <ToggleField
          value={value === undefined ? (field.toggleDefault ?? false) : Boolean(value)}
          onChange={onChange as (v: boolean) => void}
          label={field.label}
        />
      )}

      {/* ── layout-variant (Mosaik-Kacheln) ───────────────────────────────────── */}
      {field.type === "layout-variant" && (
        <LayoutVariantField
          value={String(value ?? "feature-left")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── multiselect ───────────────────────────────────────────────────────── */}
      {field.type === "multiselect" && (
        <MultiselectField
          field={field}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange as (v: string[]) => void}
        />
      )}

      {/* ── select ────────────────────────────────────────────────────────────── */}
      {field.type === "select" && (
        <SelectField
          field={field}
          value={String(value ?? field.options?.[0]?.value ?? "")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── number ────────────────────────────────────────────────────────────── */}
      {field.type === "number" && (
        <NumberField
          field={field}
          value={Number(value ?? field.min ?? 0)}
          onChange={onChange as (v: number) => void}
        />
      )}

      {/* ── media ─────────────────────────────────────────────────────────────── */}
      {field.type === "media" && (
        <MediaField
          field={field}
          value={String(value ?? "")}
          onChange={onChange as (v: string) => void}
        />
      )}

      {/* ── group (verschachteltes Objekt, z. B. Raster/Beispielrechnung) ─────── */}
      {field.type === "group" && (
        <div
          className="flex flex-col gap-4"
          style={{
            padding: "12px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeft: "2px solid rgba(202,12,133,0.35)",
            borderRadius: "3px",
          }}
        >
          {field.subFields?.map((sf) => {
            const obj = (value && typeof value === "object" && !Array.isArray(value))
              ? (value as Record<string, unknown>)
              : {};
            return (
              <FieldRow
                key={sf.key}
                field={sf}
                value={obj[sf.key]}
                onChange={(v) => onChange({ ...obj, [sf.key]: v })}
                blockData={blockData}
              />
            );
          })}
        </div>
      )}

      {/* ── repeater ──────────────────────────────────────────────────────────── */}
      {field.type === "repeater" && (
        <RepeaterField
          field={field}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange as (v: Record<string, unknown>[]) => void}
          blockData={blockData}
        />
      )}

      {/* ── description hint ──────────────────────────────────────────────────── */}
      {field.description && (
        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.5,
          }}
        >
          {field.description}
        </p>
      )}
    </div>
  );
}

// ── Small icon button used inside repeater item headers ───────────────────────
function RepeaterItemBtn({
  icon: Icon,
  title,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const hoverColor = danger ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.8)";
  const hoverBg = danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.08)";
  const hoverBorder = danger ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.18)";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-[0.92] disabled:opacity-25 disabled:cursor-not-allowed"
      style={{
        width: "24px",
        height: "24px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "3px",
        color: "rgba(255,255,255,0.35)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.borderColor = hoverBorder;
        e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "rgba(255,255,255,0.35)";
      }}
    >
      <Icon size={11} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── RepeaterField ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dynamic list component for `type: "repeater"` fields.
 *
 * • Each item is rendered as a card with a counter badge and a delete button.
 * • Sub-fields are rendered via `<FieldRow>` (recursive — supports all types).
 * • Add/remove is animated with `AnimatePresence` using stable `_id` keys
 *   (NOT array indices!) to avoid mis-keyed exit animations.
 */
function RepeaterField({
  field,
  value,
  onChange,
  blockData,
}: {
  field: FieldSchema;
  value: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
  blockData?: Record<string, unknown>;
}) {
  // Normalise: ensure every item has a stable internal `_id`
  const items: Record<string, unknown>[] = (Array.isArray(value) ? value : []).map(withId);

  // Positions-/Rollenlabels (z. B. "Position 1 · Groß links"): der sichtbare
  // Index zählt nur Einträge mit visible !== false — Ausgeblendete fallen aus
  // der Slot-Berechnung, genau wie im Renderer.
  const roleLabels: (string | null)[] | null = field.positionRole
    ? (() => {
        let visIdx = 0;
        return items.map((it) => {
          const isVisible = it.visible !== false;
          const label = field.positionRole!(isVisible ? visIdx : null, blockData ?? {});
          if (isVisible) visIdx++;
          return label;
        });
      })()
    : null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns a fresh empty item whose keys match `field.subFields`. */
  const buildEmpty = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = { _id: nextId() };
    field.subFields?.forEach((sf) => {
      if (sf.type === "toggle") obj[sf.key] = sf.toggleDefault ?? false; // "visible" fields set toggleDefault:true
      else if (sf.type === "number") obj[sf.key] = sf.min ?? 0;
      else if (sf.type === "multiselect") obj[sf.key] = [];
      else if (sf.type === "repeater") obj[sf.key] = []; // nested list starts empty
      else obj[sf.key] = "";
    });
    return obj;
  };

  const addItem = () => onChange([...items, buildEmpty()]);

  const removeItem = (id: unknown) =>
    onChange(items.filter((item) => item._id !== id));

  /** Insert a deep clone of the item (fresh _id) right after it. */
  const duplicateItem = (id: unknown) => {
    const idx = items.findIndex((it) => it._id === id);
    if (idx === -1) return;
    const clone = { ...structuredCloneSafe(items[idx]), _id: nextId() };
    const next = [...items];
    next.splice(idx + 1, 0, clone);
    onChange(next);
  };

  /** Move an item up (-1) or down (+1), clamped to bounds. */
  const moveItem = (id: unknown, dir: -1 | 1) => {
    const idx = items.findIndex((it) => it._id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const updateItem = (id: unknown, key: string, val: unknown) =>
    onChange(
      items.map((item) =>
        item._id === id ? { ...item, [key]: val } : item
      )
    );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* ── Item cards ──────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {items.map((item, idx) => (
          <motion.div
            // Stable key = internal _id, NOT the array index
            key={String(item._id)}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: 20,
              scaleX: 0.95,
              height: 0,
              marginBottom: 0,
              paddingTop: 0,
              paddingBottom: 0,
            }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
              padding: "12px 12px 14px",
              overflow: "hidden",
              // Subtle left accent on hover via outline (CSS-only trick)
              position: "relative",
            }}
          >
            {/* Magenta left-edge accent stripe */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "2px",
                background: "rgba(202,12,133,0.35)",
                borderRadius: "4px 0 0 4px",
              }}
            />

            {/* ── Card header: badge + delete ──────────────────────────────── */}
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "10px", paddingLeft: "6px" }}
            >
              {/* Counter badge */}
              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(202,12,133,0.75)",
                  background: "rgba(202,12,133,0.08)",
                  border: "1px solid rgba(202,12,133,0.2)",
                  padding: "2px 8px",
                  borderRadius: "2px",
                }}
              >
                #{idx + 1}
              </span>

              {/* Positions-/Rollenlabel (z. B. "Position 1 · Groß links") */}
              {roleLabels && (
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: roleLabels[idx] === "Ausgeblendet" ? "rgba(255,255,255,0.3)" : "rgba(56,189,248,0.85)",
                    background: roleLabels[idx] === "Ausgeblendet" ? "rgba(255,255,255,0.05)" : "rgba(56,189,248,0.08)",
                    border: `1px solid ${roleLabels[idx] === "Ausgeblendet" ? "rgba(255,255,255,0.1)" : "rgba(56,189,248,0.25)"}`,
                    padding: "2px 7px",
                    borderRadius: "2px",
                    marginRight: "auto",
                    marginLeft: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {roleLabels[idx]}
                </span>
              )}

              {/* Item actions: move up / move down / duplicate / delete */}
              <div className="flex items-center gap-1">
                <RepeaterItemBtn
                  icon={ChevronUp}
                  title="Nach oben"
                  disabled={idx === 0}
                  onClick={() => moveItem(item._id, -1)}
                />
                <RepeaterItemBtn
                  icon={ChevronDown}
                  title="Nach unten"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(item._id, 1)}
                />
                <RepeaterItemBtn
                  icon={Copy}
                  title="Duplizieren"
                  onClick={() => duplicateItem(item._id)}
                />
                <RepeaterItemBtn
                  icon={Trash2}
                  title="Eintrag löschen"
                  danger
                  onClick={() => removeItem(item._id)}
                />
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.05)",
                marginBottom: "12px",
                marginLeft: "6px",
              }}
            />

            {/* ── Sub-fields (via recursive FieldRow) ──────────────────────── */}
            <div className="flex flex-col gap-4" style={{ paddingLeft: "6px" }}>
              {field.subFields?.map((sf) => (
                <FieldRow
                  key={sf.key}
                  field={sf}
                  value={item[sf.key]}
                  onChange={(v) => updateItem(item._id, sf.key, v)}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Add button (magenta dashed outline) ─────────────────────────────── */}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-[0.98]"
        style={{
          background: "transparent",
          border: "1px dashed rgba(202,12,133,0.4)",
          color: "rgba(202,12,133,0.7)",
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          minHeight: "38px",
          borderRadius: "3px",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background   = "rgba(202,12,133,0.07)";
          e.currentTarget.style.borderColor  = "rgba(202,12,133,0.65)";
          e.currentTarget.style.color        = "rgba(202,12,133,1)";
          e.currentTarget.style.borderStyle  = "solid";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background   = "transparent";
          e.currentTarget.style.borderColor  = "rgba(202,12,133,0.4)";
          e.currentTarget.style.color        = "rgba(202,12,133,0.7)";
          e.currentTarget.style.borderStyle  = "dashed";
        }}
      >
        <Plus size={12} />
        Element hinzufügen
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── BlockSettingsSheet ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface BlockSettingsSheetProps {
  block: PageBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Record<string, unknown>) => void;
}

export function BlockSettingsSheet({
  block,
  open,
  onClose,
  onSave,
}: BlockSettingsSheetProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>({});

  // Sync whenever the selected block changes
  useEffect(() => {
    if (block) setLocalData({ ...block.data });
  }, [block]);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    if (block) {
      onSave(block.id, localData);
      onClose();
    }
  };

  const def  = block ? BLOCK_REGISTRY[block.type] : null;
  const Icon = def ? (ICON_MAP[def.iconName] ?? HelpCircle) : HelpCircle;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* ── Side panel ────────────────────────────────────────────────── */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
              width: "clamp(320px, 34vw, 440px)",
              background: "#090909",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              {def && (
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0"
                  style={{
                    background: `${def.color}18`,
                    border: `1px solid ${def.color}40`,
                  }}
                >
                  <Icon size={14} style={{ color: def.color }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p
                  className="text-white truncate"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {def?.label ?? "Block"}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                  Block-Einstellungen
                </p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer shrink-0"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  borderRadius: "50%",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Scrollable form body ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Block description */}
              {def?.description && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.3)",
                    lineHeight: 1.6,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: `2px solid ${def.color}`,
                  }}
                >
                  {def.description}
                </p>
              )}

              {/* Field rows */}
              {def?.fields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={localData[field.key]}
                  onChange={(v) => handleFieldChange(field.key, v)}
                  blockData={localData}
                />
              ))}

              {/* Domain Editor für Pricing */}
              {block && <PricingDomainEditor blockType={block.type} />}
            </div>

            {/* ── Footer actions ───────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* Cancel */}
              <button
                onClick={onClose}
                className="flex-1 transition-colors duration-150 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  minHeight: "44px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                }
              >
                Abbrechen
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 text-white transition-all duration-150 cursor-pointer active:scale-[0.98]"
                style={{
                  background: "var(--brand)",
                  border: "none",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  minHeight: "44px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--brand-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--brand)")
                }
              >
                <Save size={13} />
                Übernehmen
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

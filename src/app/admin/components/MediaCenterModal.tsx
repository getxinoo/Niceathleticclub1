/**
 * MediaCenterModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wiederverwendbares Media-Center Modal für Admin-Bereiche.
 *
 * Verwendung:
 *   • AdminMagazin → Cover-Bild auswählen
 *   • Erweiterbar: Bild in WYSIWYG-Editor einfügen (onInsert prop)
 *
 * Features:
 *   • Drag & Drop Upload (Datei → Object-URL, kein echter Server-Upload nötig)
 *   • Mock-Mediathek (Fitness-Bilder, erweiterbar über localStorage)
 *   • Suchfilter
 *   • Einfach-Auswahl mit Brand-Border + Checkmark-Overlay
 *   • "Bild übernehmen"-Button (nur aktiv wenn Bild ausgewählt)
 *
 * Props:
 *   open        – ob das Modal sichtbar ist
 *   onClose     – Callback zum Schließen
 *   onSelect    – Callback mit der gewählten Bild-URL
 *   currentUrl  – aktuell gesetztes Bild (für vorauswählen)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Upload, Image as ImageIcon, Check, Search,
  Loader2, ImageOff,
} from "lucide-react";

// ── Preset-Mediathek (Fitness/NAC-themed Unsplash Bilder) ─────────────────────
const PRESET_LIBRARY: { url: string; name: string }[] = [
  { url: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80", name: "hyrox-workout.jpg" },
  { url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80", name: "nutrition-bowl.jpg" },
  { url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80", name: "gym-equipment.jpg" },
  { url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80", name: "workout-session.jpg" },
  { url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80", name: "fitness-training.jpg" },
  { url: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80", name: "running-outdoors.jpg" },
  { url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80", name: "barbell-lift.jpg" },
  { url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80", name: "gym-interior.jpg" },
  { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80", name: "crossfit-rope.jpg" },
  { url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80", name: "morning-run.jpg" },
  { url: "https://images.unsplash.com/photo-1584735935682-2f219b2b834f?w=600&q=80", name: "dumbbell-rack.jpg" },
  { url: "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=600&q=80", name: "pullup-bar.jpg" },
];

const LS_UPLOADS_KEY = "nac_media_uploads";

/** Geladene Uploads aus localStorage (gespeicherte Object-URLs sind flüchtig,
 *  daher speichern wir nur Namen; die Bild-Daten werden als Data-URL gespeichert) */
function loadUploads(): { url: string; name: string }[] {
  try {
    const raw = localStorage.getItem(LS_UPLOADS_KEY);
    if (raw) return JSON.parse(raw) as { url: string; name: string }[];
  } catch { /* noop */ }
  return [];
}

function saveUploads(items: { url: string; name: string }[]) {
  // Maximal 20 Uploads behalten, um localStorage nicht zu überlasten
  try {
    localStorage.setItem(LS_UPLOADS_KEY, JSON.stringify(items.slice(0, 20)));
  } catch { /* Storage voll – ignorieren */ }
}

// ── Typen ─────────────────────────────────────────────────────────────────────
export interface MediaCenterModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback: URL des gewählten Bildes zurückgeben */
  onSelect: (url: string) => void;
  /** Optional: vorauswählen (das aktuell gesetzte Cover-Bild) */
  currentUrl?: string;
  /** Optionaler Modus für spätere Text-Editor-Integration */
  mode?: "cover" | "insert";
}

// ── UI-Hilfsfunktion: Bild-Kachel ──────────────────────────────────────────────
function MediaTile({
  item,
  selected,
  onSelect,
}: {
  item: { url: string; name: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);

  return (
    <button
      onClick={onSelect}
      title={item.name}
      style={{
        position: "relative",
        aspectRatio: "4/3",
        overflow: "hidden",
        border: selected
          ? "2px solid var(--brand)"
          : "2px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        background: "rgba(255,255,255,0.03)",
        outline: "none",
        padding: 0,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: selected ? "0 0 0 2px rgba(202,12,133,0.3)" : "none",
      }}
    >
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)" }}>
          <Loader2 size={16} style={{ color: "rgba(255,255,255,0.2)", animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ImageOff size={16} style={{ color: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>Fehler</span>
        </div>
      )}

      {/* Bild */}
      {!error && (
        <img
          src={item.url}
          alt={item.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s",
            display: "block",
          }}
        />
      )}

      {/* Overlay bei Hover */}
      <div style={{
        position: "absolute", inset: 0,
        background: selected ? "rgba(202,12,133,0.18)" : "rgba(0,0,0,0)",
        transition: "background 0.15s",
        pointerEvents: "none",
      }} />

      {/* Checkmark wenn ausgewählt */}
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, type: "spring", stiffness: 400 }}
          style={{
            position: "absolute", top: 6, right: 6,
            background: "var(--brand)",
            borderRadius: "50%",
            width: 20, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Check size={11} style={{ color: "white" }} />
        </motion.div>
      )}

      {/* Dateiname unten */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "4px 6px",
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        opacity: selected ? 1 : 0,
        transition: "opacity 0.15s",
      }}>
        <p style={{
          fontFamily: "var(--font-condensed)", fontSize: "9px",
          letterSpacing: "0.08em", color: "rgba(255,255,255,0.8)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          margin: 0,
        }}>
          {item.name}
        </p>
      </div>
    </button>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export function MediaCenterModal({
  open,
  onClose,
  onSelect,
  currentUrl = "",
  mode = "cover",
}: MediaCenterModalProps) {
  const [selectedUrl, setSelectedUrl]   = useState(currentUrl);
  const [uploads, setUploads]           = useState<{ url: string; name: string }[]>([]);
  const [dragging, setDragging]         = useState(false);
  const [query, setQuery]               = useState("");
  const [uploading, setUploading]       = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Uploads aus localStorage laden
  useEffect(() => {
    if (open) {
      setUploads(loadUploads());
      setSelectedUrl(currentUrl);
    }
  }, [open, currentUrl]);

  // Escape-Taste schließt Modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body-Scroll sperren
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ── Drag & Drop Handler ────────────────────────────────────────────────────
  const processFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    setUploading(true);

    let processed = 0;
    const newUploads: { url: string; name: string }[] = [];

    imageFiles.forEach((file) => {
      // Größenlimit: max 5 MB
      if (file.size > 5 * 1024 * 1024) {
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        newUploads.push({ url: dataUrl, name: file.name });
        processed++;
        if (processed === imageFiles.length) {
          setUploads((prev) => {
            const updated = [...newUploads, ...prev];
            saveUploads(updated);
            return updated;
          });
          // Auto-select erstes hochgeladenes Bild
          if (newUploads[0]) setSelectedUrl(newUploads[0].url);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === imageFiles.length) setUploading(false);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Nur wenn man wirklich das Drop-Zone-Element verlässt
    if (!dropRef.current?.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  // ── Zusammengeführte Bibliothek (Uploads first, dann Presets) ──────────────
  const allItems = [...uploads, ...PRESET_LIBRARY];

  // ── Suchfilter ─────────────────────────────────────────────────────────────
  const filtered = query.trim()
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.url.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const handleConfirm = () => {
    if (!selectedUrl) return;
    onSelect(selectedUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* ── Modal ── */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1001,
              width: "min(920px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 48px)",
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Modal Header ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <h2 style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", color: "white", textTransform: "uppercase", margin: 0 }}>
                    MEDIA CENTER
                  </h2>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", margin: 0, textTransform: "uppercase" }}>
                    {allItems.length} Bilder in der Bibliothek
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Modal Body (scrollable) ── */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>

              {/* ── Drag & Drop Zone ── */}
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--brand)" : "rgba(255,255,255,0.12)"}`,
                  background: dragging ? "rgba(202,12,133,0.05)" : "rgba(255,255,255,0.02)",
                  padding: "28px 20px",
                  textAlign: "center",
                  marginBottom: 20,
                  transition: "all 0.15s",
                  cursor: "pointer",
                  position: "relative",
                }}
                onClick={() => document.getElementById("media-file-input")?.click()}
              >
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />

                {uploading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <Loader2 size={20} style={{ color: "var(--brand)", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "var(--brand)", textTransform: "uppercase" }}>Wird hochgeladen…</span>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 48, height: 48, background: dragging ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${dragging ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", transition: "all 0.15s" }}>
                      <Upload size={20} style={{ color: dragging ? "var(--brand)" : "rgba(255,255,255,0.3)", transition: "color 0.15s" }} />
                    </div>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", color: dragging ? "var(--brand)" : "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 4, transition: "color 0.15s" }}>
                      {dragging ? "Loslassen zum Hochladen" : "Neues Bild hochladen"}
                    </p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
                      Drag & Drop oder klicken · JPG, PNG, WEBP · max. 5 MB
                    </p>
                  </>
                )}
              </div>

              {/* ── Suche + Bibliothek-Header ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", margin: 0 }}>
                  Bibliothek
                  <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.2)" }}>
                    {filtered.length} {filtered.length !== allItems.length ? `/ ${allItems.length}` : ""}
                  </span>
                </p>

                {/* Suche */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 10px", minWidth: 200 }}>
                  <Search size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bilder suchen…"
                    style={{ background: "none", border: "none", color: "white", fontSize: "12px", outline: "none", width: "100%" }}
                  />
                  {query && (
                    <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, display: "flex" }}>
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Bild-Grid ── */}
              {filtered.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <ImageOff size={28} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 10 }} />
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                    Keine Bilder gefunden
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}>
                  {filtered.map((item, i) => (
                    <MediaTile
                      key={item.url.slice(-32) + i}
                      item={item}
                      selected={selectedUrl === item.url}
                      onSelect={() => setSelectedUrl(item.url)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Modal Footer ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(0,0,0,0.2)",
              flexShrink: 0,
              gap: 12,
            }}>
              {/* Vorschau des ausgewählten Bildes */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {selectedUrl ? (
                  <>
                    <img
                      src={selectedUrl}
                      alt="Ausgewählt"
                      style={{ width: 36, height: 36, objectFit: "cover", border: "1px solid rgba(202,12,133,0.4)", flexShrink: 0 }}
                    />
                    <p style={{
                      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600,
                      letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase", margin: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240,
                    }}>
                      Ausgewählt
                    </p>
                  </>
                ) : (
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", margin: 0 }}>
                    Kein Bild ausgewählt
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={onClose}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "9px 18px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedUrl}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: selectedUrl ? "var(--brand)" : "rgba(255,255,255,0.06)",
                    border: "none", color: selectedUrl ? "white" : "rgba(255,255,255,0.2)",
                    padding: "9px 20px",
                    fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    cursor: selectedUrl ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                    boxShadow: selectedUrl ? "0 0 16px rgba(202,12,133,0.3)" : "none",
                  }}
                >
                  <Check size={13} />
                  {mode === "insert" ? "Einfügen" : "Bild übernehmen"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
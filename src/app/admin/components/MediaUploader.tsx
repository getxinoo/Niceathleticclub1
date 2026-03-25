/**
 * MediaUploader.tsx
 * Bild-Upload-Komponente mit Vorschau, Drag & Drop, URL-Eingabe
 * Unterstuetzte Formate: PNG, JPG, JPEG, WebP
 *
 * Fix: Token-Key korrigiert, Upload-Flow fuer bestehende + neue Bilder robust gemacht,
 * File-Input mit key-Reset fuer zuverlaessiges Oeffnen im Sheet-Overlay.
 */
import { useState, useRef, useCallback } from "react";
import { Upload, Link2, X, Image as ImageIcon, AlertCircle, RefreshCw, Trash2 } from "lucide-react";

const ACCEPTED = ".png,.jpg,.jpeg,.webp";
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TOKEN_KEY = "nac_auth_token";
const UPLOAD_TIMEOUT_MS = 6000;

interface MediaUploaderProps {
  value?: string;           // Current image URL or data-URL
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  aspectHint?: string;      // e.g. "1:1" or "16:9"
  maxFileSizeMB?: number;
}

export function MediaUploader({
  value,
  onChange,
  onRemove,
  label = "Bild",
  aspectHint,
  maxFileSizeMB = 5,
}: MediaUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  // Key-Reset to force re-mount of file input (fixes Sheet click issues)
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxFileSizeMB * 1024 * 1024;

  // ── Read file as data URL (always works, mock/dev fallback) ──────────────
  const readAsDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Fehler beim Lesen der Datei."));
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Handle file selection ────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Nur PNG, JPG, JPEG oder WebP erlaubt.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`Datei zu gross (max. ${maxFileSizeMB} MB).`);
      return;
    }

    setUploading(true);

    // Try real API upload with timeout
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "team_profile");

      const token = localStorage.getItem(TOKEN_KEY);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      const res = await fetch("https://nicefitness.de/api/media/upload.php", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.url) {
          onChange(data.data.url);
          setUploading(false);
          return;
        }
      }
    } catch {
      // API not available – fallback below
    }

    // Fallback: use data URL for mock/dev mode
    try {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
    } catch {
      setError("Fehler beim Lesen der Datei.");
    } finally {
      setUploading(false);
    }
  }, [maxBytes, maxFileSizeMB, onChange, readAsDataUrl]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── URL submit ───────────────────────────────────────────────────────────
  const handleUrlSubmit = () => {
    setError("");
    const url = urlInput.trim();
    if (!url) { setError("Bitte eine URL eingeben."); return; }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("Bitte eine gueltige URL eingeben (https://...).");
      return;
    }
    onChange(url);
    setUrlInput("");
  };

  // ── Open file picker reliably ────────────────────────────────────────────
  const openFilePicker = useCallback(() => {
    // Reset key to force fresh input, then click after micro-task
    setFileInputKey((k) => k + 1);
    requestAnimationFrame(() => {
      fileRef.current?.click();
    });
  }, []);

  // ── Handle remove ────────────────────────────────────────────────────────
  const handleRemove = () => {
    if (onRemove) onRemove();
    setUrlInput("");
    setError("");
  };

  const hasImage = Boolean(value);

  return (
    <div>
      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <label style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          {label}
        </label>
        {aspectHint && (
          <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
            Empfohlen: {aspectHint}
          </span>
        )}
      </div>

      {/* ── HAS IMAGE: Show preview + action buttons ── */}
      {hasImage ? (
        <div>
          {/* Preview */}
          <div style={{ position: "relative", marginBottom: "8px" }}>
            <div style={{
              width: "100%", height: "160px", borderRadius: "6px", overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)",
            }}>
              <img
                src={value}
                alt="Vorschau"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            {/* Uploading overlay */}
            {uploading && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "6px",
                background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Wird hochgeladen…</span>
              </div>
            )}
          </div>

          {/* Action buttons: Aendern + Entfernen */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploading}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px 12px", borderRadius: "4px", cursor: uploading ? "wait" : "pointer",
                background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.25)",
                color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "10px",
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                opacity: uploading ? 0.5 : 1, transition: "all 0.15s",
                minHeight: "44px",
              }}
              onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.background = "rgba(202,12,133,0.18)"; e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.1)"; e.currentTarget.style.borderColor = "rgba(202,12,133,0.25)"; }}
            >
              <RefreshCw size={12} />
              Bild aendern
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "8px 12px", borderRadius: "4px", cursor: uploading ? "wait" : "pointer",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "10px",
                  fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  opacity: uploading ? 0.5 : 1, transition: "all 0.15s",
                  minHeight: "44px",
                }}
                onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; e.currentTarget.style.color = "#F87171"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <Trash2 size={12} />
                Entfernen
              </button>
            )}
          </div>

          {/* URL alternative (collapsed) */}
          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setMode(mode === "url" ? "upload" : "url")}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 0", background: "none", border: "none",
                color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)",
                fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
            >
              <Link2 size={10} />
              {mode === "url" ? "URL ausblenden" : "Oder per URL ersetzen"}
            </button>
            {mode === "url" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/bild.jpg"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  style={{
                    flex: 1, padding: "10px 12px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleUrlSubmit}
                  style={{
                    padding: "0 14px", background: "rgba(202,12,133,0.15)",
                    border: "1px solid rgba(202,12,133,0.3)", borderRadius: "4px",
                    color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "11px",
                    fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── NO IMAGE: Show full upload area ── */
        <div>
          {/* Mode Tabs */}
          <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
            {[
              { key: "upload" as const, label: "Upload", icon: <Upload size={11} /> },
              { key: "url" as const, label: "URL", icon: <Link2 size={11} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setMode(tab.key); setError(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 12px", borderRadius: "3px",
                  background: mode === tab.key ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${mode === tab.key ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.06)"}`,
                  color: mode === tab.key ? "#fff" : "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Upload Drop Zone */}
          {mode === "upload" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openFilePicker()}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "8px", padding: "24px 16px", borderRadius: "6px", cursor: "pointer",
                background: dragging ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.02)",
                border: `2px dashed ${dragging ? "rgba(202,12,133,0.5)" : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.2s", minHeight: "120px",
              }}
            >
              {uploading ? (
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
              ) : (
                <ImageIcon size={24} style={{ color: dragging ? "var(--brand)" : "rgba(255,255,255,0.15)" }} />
              )}
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                {uploading ? "Wird hochgeladen…" : "Datei hierher ziehen oder klicken"}
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                PNG, JPG, JPEG, WebP · max. {maxFileSizeMB} MB
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/bild.jpg"
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                style={{
                  flex: 1, padding: "10px 12px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px", outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                style={{
                  padding: "0 14px", background: "rgba(202,12,133,0.15)",
                  border: "1px solid rgba(202,12,133,0.3)", borderRadius: "4px",
                  color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "11px",
                  fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input – key forces re-mount for reliable picker */}
      <input
        key={fileInputKey}
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset for re-select
          if (e.target) e.target.value = "";
        }}
      />

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", color: "#F87171", fontSize: "12px", fontFamily: "var(--font-body)" }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Spinner keyframe (injected once) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

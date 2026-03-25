/**
 * SpecialtyTagInput.tsx
 * Tag-Eingabe fuer Schwerpunkte mit Autocomplete aus bestehenden Tags
 */
import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

interface SpecialtyTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
}

// Default-Vorschlaege basierend auf bestehenden Team-Daten
const DEFAULT_SUGGESTIONS = [
  "CrossFit", "Hyrox", "Functional Training", "Athletiktraining",
  "Kraft & Kondition", "Gewichtheben", "Mobility", "Gruppencoaching",
  "Wettkampfvorbereitung", "Ausdauer", "Unternehmensgruendung",
  "Brand Building", "Community", "Kreativkonzept", "Markenstrategie",
  "Design", "Unternehmensfuehrung", "Strategie", "Operations",
  "Personal Training", "Ernaehrungsberatung", "Rehabilitation",
];

export function SpecialtyTagInput({
  value,
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
  maxTags = 10,
  placeholder = "Schwerpunkt hinzufuegen...",
}: SpecialtyTagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge suggestions with existing tags from all profiles
  const allSuggestions = Array.from(new Set([...suggestions, ...value]));

  const filtered = input.trim()
    ? allSuggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !value.includes(s)
      )
    : allSuggestions.filter((s) => !value.includes(s));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Tags */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px",
        padding: "8px 10px", minHeight: "44px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "4px", alignItems: "center",
      }}>
        {value.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "3px 8px 3px 10px", borderRadius: "3px",
              background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.3)",
              color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-condensed)",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "14px", height: "14px", borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", border: "none",
                color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0,
              }}
              aria-label={`${tag} entfernen`}
            >
              <X size={8} />
            </button>
          </span>
        ))}

        {value.length < maxTags && (
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            style={{
              flex: "1 1 120px", minWidth: "100px",
              background: "transparent", border: "none", outline: "none",
              color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
              padding: "2px 4px",
            }}
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          marginTop: "4px", maxHeight: "180px", overflowY: "auto",
          background: "#111111", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "6px", boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
          zIndex: 50,
        }}>
          {filtered.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px", background: "transparent", border: "none",
                color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-body)",
                fontSize: "12px", cursor: "pointer", textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={11} style={{ color: "var(--brand)", flexShrink: 0 }} />
              {s}
            </button>
          ))}
          {input.trim() && !allSuggestions.some((s) => s.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => addTag(input)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px", background: "rgba(202,12,133,0.05)",
                borderTop: "1px solid rgba(255,255,255,0.06)", border: "none",
                color: "var(--brand)", fontFamily: "var(--font-condensed)",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.05)"; }}
            >
              <Plus size={11} /> Neu erstellen: "{input.trim()}"
            </button>
          )}
        </div>
      )}

      {/* Counter */}
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginTop: "4px", textAlign: "right" }}>
        {value.length}/{maxTags} Schwerpunkte
      </p>
    </div>
  );
}

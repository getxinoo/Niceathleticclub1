/**
 * TeamProfileEditor.tsx
 * Full-featured team profile editor for frontend-visible team members.
 * Handles: Profile image, Detail photo, Position, Name, Bio, Meta Bio,
 * Specialties, Social Media (Instagram, Facebook, LinkedIn, TikTok, Snapchat),
 * and frontend visibility toggle.
 */
import { useState, useEffect } from "react";
import {
  Eye, EyeOff, Save, X, User2, FileText, Globe, Share2,
  Instagram, Facebook, Linkedin, AtSign, Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "../../components/ui/sheet";
import { MediaUploader } from "./MediaUploader";
import { SpecialtyTagInput } from "./SpecialtyTagInput";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TeamProfile {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  position: string;
  type: "leadership" | "coach";
  profile_image: string;
  detail_image: string;
  bio: string;
  meta_bio: string;
  specialties: string[];
  certifications: string[];
  instagram: string;
  facebook: string;
  linkedin: string;
  tiktok: string;
  snapchat: string;
  visible: boolean;
  sort_order: number;
}

interface TeamProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: TeamProfile | null;
  onSave: (profile: TeamProfile) => Promise<void>;
}

const EMPTY_PROFILE: TeamProfile = {
  id: "",
  slug: "",
  first_name: "",
  last_name: "",
  position: "",
  type: "coach",
  profile_image: "",
  detail_image: "",
  bio: "",
  meta_bio: "",
  specialties: [],
  certifications: [],
  instagram: "",
  facebook: "",
  linkedin: "",
  tiktok: "",
  snapchat: "",
  visible: true,
  sort_order: 0,
};

const BIO_MAX = 800;

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }: { icon: typeof User2; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
      <Icon size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
      <span style={{
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap",
      }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
      <label style={{
        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)",
      }}>
        {children}{required && <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>}
      </label>
      {hint && (
        <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "10px 12px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px",
        outline: "none", boxSizing: "border-box", opacity: disabled ? 0.5 : 1,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(202,12,133,0.1)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function SocialInput({ icon: Icon, label, value, onChange, placeholder }: {
  icon: typeof Instagram; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "4px",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={14} style={{ color: value ? "var(--brand)" : "rgba(255,255,255,0.2)" }} />
      </div>
      <div style={{ flex: 1 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "9px 12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
            outline: "none", boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
      </div>
    </div>
  );
}

// TikTok SVG icon since lucide doesn't have one
function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function SnapchatIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.29c-.13.32-.57.55-1.32.7-.13.02-.27.04-.42.06-.16.02-.34.04-.55.07-.23.03-.39.15-.5.37-.17.32-.38.58-.73.58h-.04c-.22 0-.47-.1-.75-.21-.35-.14-.79-.31-1.33-.31s-.98.17-1.33.31c-.28.11-.53.21-.75.21h-.04c-.35 0-.56-.26-.73-.58-.11-.22-.27-.34-.5-.37-.21-.03-.39-.05-.55-.07-.15-.02-.29-.04-.42-.06-.75-.15-1.19-.38-1.32-.7-.05-.12-.04-.25.02-.36.25-.47 1.26-.83 1.64-.96.03-.01.06-.02.07-.03.19-.08.23-.18.17-.34-.13-.33-.21-.69-.24-.9-.02-.14.04-.2.09-.23.12-.08.29-.03.41.03-.01-.24 0-.53.04-.83.16-1.11.72-1.76 1.19-2.11.68-.5 1.47-.76 2.35-.76s1.67.26 2.35.76c.47.35 1.03 1 1.19 2.11.04.3.05.59.04.83.12-.06.29-.11.41-.03.05.03.11.09.09.23-.03.21-.11.57-.24.9-.06.16-.02.26.17.34.01 0 .04.02.07.03.38.13 1.39.49 1.64.96.06.11.07.24.02.36z" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function TeamProfileEditor({ open, onOpenChange, profile, onSave }: TeamProfileEditorProps) {
  const [form, setForm] = useState<TeamProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const isNew = !profile;

  useEffect(() => {
    if (profile) {
      setForm({ ...EMPTY_PROFILE, ...profile });
    } else {
      setForm(EMPTY_PROFILE);
    }
  }, [profile, open]);

  const set = <K extends keyof TeamProfile>(key: K, val: TeamProfile[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder.");
      return;
    }
    if (!form.position.trim()) {
      toast.error("Bitte eine Position angeben.");
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug || `${form.first_name.toLowerCase().replace(/\s/g, "-")}-${form.last_name.toLowerCase().replace(/\s/g, "-")}`;
      await onSave({ ...form, slug });
      toast.success(
        isNew ? "Teammitglied erfolgreich angelegt!" : `${form.first_name} ${form.last_name} wurde aktualisiert.`,
        { description: isNew ? "Das Profil ist jetzt im Admin sichtbar." : "Aenderungen wurden gespeichert." }
      );
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{
          background: "#0d0d0d", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)",
          width: "min(600px, 95vw)", padding: 0, display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              <User2 size={16} style={{ color: "var(--brand)" }} />
              <SheetTitle style={{
                fontFamily: "var(--font-condensed)", fontSize: "18px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", margin: 0,
              }}>
                {isNew ? "Neues Teammitglied" : "Profil bearbeiten"}
              </SheetTitle>
            </div>
            <SheetDescription style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", margin: 0 }}>
              {isNew ? "Neues Frontend-Profil fuer die Team-Seite anlegen" : `Frontend-Profil von ${form.first_name} ${form.last_name}`}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── BILDER ── */}
            <SectionHeader icon={Camera} label="Bilder" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <MediaUploader
                label="Profilbild"
                aspectHint="3:4 Portrait"
                value={form.profile_image}
                onChange={(url) => set("profile_image", url)}
                onRemove={() => set("profile_image", "")}
              />
              <MediaUploader
                label="Detail-Foto"
                aspectHint="16:9 Landscape"
                value={form.detail_image}
                onChange={(url) => set("detail_image", url)}
                onRemove={() => set("detail_image", "")}
              />
            </div>

            {/* ── PERSOENLICHE DATEN ── */}
            <SectionHeader icon={User2} label="Persoenliche Daten" />

            {/* Vorname + Nachname */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <Label required>Vorname</Label>
                <TextInput value={form.first_name} onChange={(v) => set("first_name", v)} placeholder="Mimi" />
              </div>
              <div>
                <Label required>Nachname</Label>
                <TextInput value={form.last_name} onChange={(v) => set("last_name", v)} placeholder="Kraus" />
              </div>
            </div>

            {/* Position */}
            <div>
              <Label required>Position</Label>
              <TextInput value={form.position} onChange={(v) => set("position", v)} placeholder="Gruenderin & Visionaerin" />
            </div>

            {/* Typ */}
            <div>
              <Label>Typ</Label>
              <div style={{ display: "flex", gap: "8px" }}>
                {([
                  { value: "leadership" as const, label: "Geschaeftsfuehrung" },
                  { value: "coach" as const, label: "Coach / Trainer" },
                ] as const).map((opt) => {
                  const sel = form.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("type", opt.value)}
                      style={{
                        flex: 1, padding: "10px", borderRadius: "4px", cursor: "pointer", textAlign: "center",
                        background: sel ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${sel ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: sel ? "#fff" : "rgba(255,255,255,0.45)",
                        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── BIO ── */}
            <SectionHeader icon={FileText} label="Texte" />

            {/* Bio */}
            <div>
              <Label required hint={`${form.bio.length}/${BIO_MAX}`}>Motivation / Biografie</Label>
              <textarea
                value={form.bio}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_MAX) set("bio", e.target.value);
                }}
                placeholder="Beschreibung fuer die Team-Seite..."
                rows={4}
                style={{
                  width: "100%", padding: "12px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px",
                  outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <div style={{
                height: "3px", borderRadius: "2px", marginTop: "4px",
                background: "rgba(255,255,255,0.05)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: "2px", transition: "width 0.2s",
                  width: `${(form.bio.length / BIO_MAX) * 100}%`,
                  background: form.bio.length > BIO_MAX * 0.9 ? "#F87171" : "var(--brand)",
                }} />
              </div>
            </div>

            {/* Meta Bio (SEO) */}
            <div>
              <Label hint="Nur fuer Google sichtbar">Meta Biografie (SEO)</Label>
              <textarea
                value={form.meta_bio}
                onChange={(e) => set("meta_bio", e.target.value)}
                placeholder="SEO-optimierte Beschreibung fuer Suchmaschinen..."
                rows={3}
                style={{
                  width: "100%", padding: "12px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
                  outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                Dieser Text wird nicht auf der Webseite angezeigt, sondern verbessert die SEO-Sichtbarkeit bei Google.
              </p>
            </div>

            {/* ── SCHWERPUNKTE ── */}
            <SectionHeader icon={Globe} label="Schwerpunkte" />

            <SpecialtyTagInput
              value={form.specialties}
              onChange={(tags) => set("specialties", tags)}
            />

            {/* ── SOCIAL MEDIA ── */}
            <SectionHeader icon={Share2} label="Social Media" />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", marginTop: "-12px" }}>
              Leere Felder werden auf der Team-Seite nicht angezeigt.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <SocialInput
                icon={Instagram}
                label="Instagram"
                value={form.instagram}
                onChange={(v) => set("instagram", v)}
                placeholder="@nutzername oder https://instagram.com/..."
              />
              <SocialInput
                icon={Facebook}
                label="Facebook"
                value={form.facebook}
                onChange={(v) => set("facebook", v)}
                placeholder="@nutzername oder https://facebook.com/..."
              />
              <SocialInput
                icon={Linkedin}
                label="LinkedIn"
                value={form.linkedin}
                onChange={(v) => set("linkedin", v)}
                placeholder="https://linkedin.com/in/..."
              />
              <SocialInput
                icon={({ size, ...p }: { size?: number; style?: React.CSSProperties }) => <TikTokIcon size={size} />}
                label="TikTok"
                value={form.tiktok}
                onChange={(v) => set("tiktok", v)}
                placeholder="@nutzername oder https://tiktok.com/@..."
              />
              <SocialInput
                icon={({ size, ...p }: { size?: number; style?: React.CSSProperties }) => <SnapchatIcon size={size} />}
                label="Snapchat"
                value={form.snapchat}
                onChange={(v) => set("snapchat", v)}
                placeholder="@nutzername"
              />
            </div>

            {/* ── SICHTBARKEIT ── */}
            <SectionHeader icon={form.visible ? Eye : EyeOff} label="Sichtbarkeit" />

            <div className="flex items-center justify-between" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px" }}>
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: form.visible ? "#34D399" : "rgba(255,255,255,0.4)" }}>
                  {form.visible ? "Sichtbar auf der Team-Seite" : "Versteckt – nicht oeffentlich sichtbar"}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", marginTop: "2px" }}>
                  {form.visible
                    ? "Das Profil wird auf /team im Frontend angezeigt."
                    : "Das Profil ist nur im Admin sichtbar und wird auf der Webseite nicht angezeigt."
                  }
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.visible}
                onClick={() => set("visible", !form.visible)}
                style={{
                  position: "relative", width: "44px", height: "24px", borderRadius: "12px",
                  background: form.visible ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.1)",
                  border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: "2px", left: form.visible ? "22px" : "2px",
                  width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: "10px", justifyContent: "flex-end",
        }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            style={{
              padding: "0 20px", height: "44px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px", color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0 24px", height: "44px",
              background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)",
              border: "none", borderRadius: "4px", color: "#fff",
              fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "8px", minWidth: "140px", justifyContent: "center",
            }}
          >
            {saving ? (
              <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Speichern...</>
            ) : (
              <><Save size={14} /> {isNew ? "Anlegen" : "Speichern"}</>
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

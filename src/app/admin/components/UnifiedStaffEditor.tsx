/**
 * UnifiedStaffEditor.tsx
 * 4-Tab-Editor: Account & Rechte | Oeffentliches Profil | Bilder & Medien | Vorschau / Sync
 * Laedt users + team_profile gemeinsam, speichert in einer logischen Transaktion.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Eye, EyeOff, Save, User2, FileText, Globe, Share2,
  Instagram, Facebook, Linkedin, Camera, ShieldCheck,
  AlertTriangle, CheckCircle2, Image as ImageIcon,
  MonitorSmartphone, RefreshCw, Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "../../components/ui/sheet";
import { MediaUploader } from "./MediaUploader";
import { SpecialtyTagInput } from "./SpecialtyTagInput";
import { api } from "../../../lib/api-service";

// ── Types ──────────────────────────────────────────────────────────────────────
type StaffRole = "admin" | "hr" | "finance" | "trainer" | "frontdesk";
type TabKey = "account" | "profile" | "media" | "preview";

interface SyncStatus {
  profile_exists: boolean;
  legacy_exists: boolean;
  mismatches: string[];
}

interface UnifiedStaffEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onSaved: () => void;
}

const BIO_MAX = 800;

const ROLE_OPTIONS: { value: StaffRole; label: string; color: string }[] = [
  { value: "admin",     label: "Admin",     color: "#CA0C85" },
  { value: "hr",        label: "HR",        color: "#A78BFA" },
  { value: "finance",   label: "Finance",   color: "#34D399" },
  { value: "trainer",   label: "Trainer",   color: "#60A5FA" },
  { value: "frontdesk", label: "Frontdesk", color: "#FBBF24" },
];

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof User2 }[] = [
  { key: "account", label: "Account",  icon: ShieldCheck },
  { key: "profile", label: "Profil",   icon: Globe },
  { key: "media",   label: "Medien",   icon: ImageIcon },
  { key: "preview", label: "Vorschau", icon: MonitorSmartphone },
];

// ── Shared Sub-Components ──────────────────────────────────────────────────────
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

function Label({ children, required, hint, source }: { children: React.ReactNode; required?: boolean; hint?: string; source?: "users" | "team_profile" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
      <label style={{
        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        {children}{required && <span style={{ color: "var(--brand)", marginLeft: "2px" }}>*</span>}
        {source && (
          <span style={{
            padding: "1px 5px", borderRadius: "2px", fontSize: "8px", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            background: source === "users" ? "rgba(96,165,250,0.12)" : "rgba(202,12,133,0.12)",
            border: source === "users" ? "1px solid rgba(96,165,250,0.25)" : "1px solid rgba(202,12,133,0.25)",
            color: source === "users" ? "#60A5FA" : "#CA0C85",
          }}>
            {source === "users" ? "ACCOUNT" : "PROFIL"}
          </span>
        )}
      </label>
      {hint && <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>{hint}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
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

function SocialInput({ icon: Icon, value, onChange, placeholder }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; value: string; onChange: (v: string) => void; placeholder: string;
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
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          flex: 1, padding: "9px 12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      />
    </div>
  );
}

function TikTokIcon({ size = 14 }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function SnapchatIcon({ size = 14 }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.29c-.13.32-.57.55-1.32.7-.13.02-.27.04-.42.06-.16.02-.34.04-.55.07-.23.03-.39.15-.5.37-.17.32-.38.58-.73.58h-.04c-.22 0-.47-.1-.75-.21-.35-.14-.79-.31-1.33-.31s-.98.17-1.33.31c-.28.11-.53.21-.75.21h-.04c-.35 0-.56-.26-.73-.58-.11-.22-.27-.34-.5-.37-.21-.03-.39-.05-.55-.07-.15-.02-.29-.04-.42-.06-.75-.15-1.19-.38-1.32-.7-.05-.12-.04-.25.02-.36.25-.47 1.26-.83 1.64-.96.03-.01.06-.02.07-.03.19-.08.23-.18.17-.34-.13-.33-.21-.69-.24-.9-.02-.14.04-.2.09-.23.12-.08.29-.03.41.03-.01-.24 0-.53.04-.83.16-1.11.72-1.76 1.19-2.11.68-.5 1.47-.76 2.35-.76s1.67.26 2.35.76c.47.35 1.03 1 1.19 2.11.04.3.05.59.04.83.12-.06.29-.11.41-.03.05.03.11.09.09.23-.03.21-.11.57-.24.9-.06.16-.02.26.17.34.01 0 .04.02.07.03.38.13 1.39.49 1.64.96.06.11.07.24.02.36z" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function UnifiedStaffEditor({ open, onOpenChange, userId, onSaved }: UnifiedStaffEditorProps) {
  const [tab, setTab] = useState<TabKey>("account");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Account fields (users table)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("trainer");
  const [staffNumber, setStaffNumber] = useState("");
  const [active, setActive] = useState(true);

  // Profile fields (team_profile table)
  const [profileId, setProfileId] = useState("");
  const [slug, setSlug] = useState("");
  const [position, setPosition] = useState("");
  const [profileType, setProfileType] = useState<"leadership" | "coach">("coach");
  const [profileImage, setProfileImage] = useState("");
  const [detailImage, setDetailImage] = useState("");
  const [bio, setBio] = useState("");
  const [metaBio, setMetaBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [visible, setVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.admin.users.detail(userId);
      const u = res.user;
      const p = res.teamProfile;
      setSyncStatus(res.syncStatus);

      if (u) {
        setFirstName(u.first_name || u.name?.split(" ")[0] || "");
        setLastName(u.last_name || u.name?.split(" ").slice(1).join(" ") || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setRole((u.role as StaffRole) || "trainer");
        setStaffNumber(u.staff_number || "");
        setActive(Boolean(u.active));
      }
      if (p) {
        setProfileId(p.id || "");
        setSlug(p.slug || "");
        if (p.first_name) setFirstName(p.first_name);
        if (p.last_name) setLastName(p.last_name);
        setPosition(p.position || "");
        setProfileType(p.type || "coach");
        setProfileImage(p.profile_image || "");
        setDetailImage(p.detail_image || "");
        setBio(p.bio || "");
        setMetaBio(p.meta_bio || "");
        setSpecialties(Array.isArray(p.specialties) ? p.specialties : []);
        setCertifications(Array.isArray(p.certifications) ? p.certifications : []);
        setInstagram(p.instagram || "");
        setFacebook(p.facebook || "");
        setLinkedin(p.linkedin || "");
        setTiktok(p.tiktok || "");
        setSnapchat(p.snapchat || "");
        setVisible(p.visible !== false);
        setSortOrder(typeof p.sort_order === "number" ? p.sort_order : 0);
      } else {
        setProfileId(""); setSlug(""); setPosition(""); setProfileType("coach");
        setProfileImage(""); setDetailImage(""); setBio(""); setMetaBio("");
        setSpecialties([]); setCertifications([]);
        setInstagram(""); setFacebook(""); setLinkedin(""); setTiktok(""); setSnapchat("");
        setVisible(true); setSortOrder(0);
      }
    } catch {
      toast.error("Fehler beim Laden der Mitarbeiterdaten.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      setTab("account");
      loadDetail();
    }
  }, [open, userId, loadDetail]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) { toast.error("Vor- und Nachname sind Pflichtfelder."); return; }
    if (!email.trim()) { toast.error("E-Mail ist ein Pflichtfeld."); return; }
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const computedSlug = slug || `${firstName.toLowerCase().replace(/\s/g, "-")}-${lastName.toLowerCase().replace(/\s/g, "-")}`;
    try {
      // 1. Combined save via update_profile endpoint
      await api.admin.users.updateWithProfile(userId!, {
        user: {
          first_name: firstName.trim(), last_name: lastName.trim(), name: fullName,
          email: email.trim(), phone: phone.trim() || null, role,
          active: active ? 1 : 0, staff_number: staffNumber.trim() || null,
        },
        teamProfile: {
          id: profileId || undefined, slug: computedSlug, user_id: userId,
          first_name: firstName.trim(), last_name: lastName.trim(),
          position: position.trim(), type: profileType,
          profile_image: profileImage, detail_image: detailImage,
          bio: bio.trim(), meta_bio: metaBio.trim(),
          specialties, certifications,
          instagram: instagram.trim(), facebook: facebook.trim(),
          linkedin: linkedin.trim(), tiktok: tiktok.trim(), snapchat: snapchat.trim(),
          visible, sort_order: sortOrder,
        },
      });

      // 2. Also sync via individual endpoints for immediate mock store consistency
      try { await api.admin.users.updateStaff(userId!, {
        first_name: firstName.trim(), last_name: lastName.trim(), name: fullName,
        email: email.trim(), phone: phone.trim() || null, role,
        active: active ? 1 : 0, staff_number: staffNumber.trim() || null,
      }); } catch { /* silent */ }

      const profilePayload = {
        id: profileId || undefined, slug: computedSlug, user_id: userId,
        first_name: firstName.trim(), last_name: lastName.trim(), name: fullName,
        position: position.trim(), type: profileType,
        profile_image: profileImage, detail_image: detailImage,
        bio: bio.trim(), meta_bio: metaBio.trim(),
        specialties, certifications,
        instagram: instagram.trim(), facebook: facebook.trim(),
        linkedin: linkedin.trim(), tiktok: tiktok.trim(), snapchat: snapchat.trim(),
        visible, sort_order: sortOrder,
      };
      try {
        if (profileId) { await api.admin.teamPublic.update(profileId, profilePayload); }
        else { await api.admin.teamPublic.create(profilePayload); }
      } catch { /* silent */ }

      toast.success(`${fullName} gespeichert`, {
        description: [
          "users gespeichert",
          profileId ? "team_profile aktualisiert" : "team_profile neu angelegt",
          visible ? "Frontend sichtbar" : "Frontend versteckt",
        ].join(" · "),
        duration: 5000,
      });
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  // ── Tab Content Renderers ─────────────────────────────────────────────────
  const fullName = `${firstName} ${lastName}`.trim();

  const renderAccountTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <SectionHeader icon={User2} label="Persoenliche Daten" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div><Label required source="users">Vorname</Label><TextInput value={firstName} onChange={setFirstName} placeholder="Max" /></div>
        <div><Label required source="users">Nachname</Label><TextInput value={lastName} onChange={setLastName} placeholder="Mustermann" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div><Label required source="users">E-Mail</Label><TextInput value={email} onChange={setEmail} placeholder="email@example.com" type="email" /></div>
        <div><Label source="users">Telefon</Label><TextInput value={phone} onChange={setPhone} placeholder="+49 ..." /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div><Label source="users">MA-Nummer</Label><TextInput value={staffNumber} onChange={setStaffNumber} placeholder="NAC-001" /></div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)" }}>
            Wird vom Backend generiert, wenn leer.
          </p>
        </div>
      </div>

      <SectionHeader icon={ShieldCheck} label="Rolle & Berechtigungen" />
      <div>
        <Label required source="users">Systemrolle</Label>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginBottom: "8px" }}>
          Interne Berechtigung – nicht die oeffentliche Position auf der Team-Seite.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {ROLE_OPTIONS.map((opt) => {
            const sel = role === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setRole(opt.value)} style={{
                padding: "8px 14px", borderRadius: "3px", cursor: "pointer",
                background: sel ? `${opt.color}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${sel ? `${opt.color}60` : "rgba(255,255,255,0.08)"}`,
                color: sel ? opt.color : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
              }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <SectionHeader icon={User2} label="Status" />
      <div className="flex items-center justify-between" style={{
        padding: "14px 16px", borderRadius: "6px",
        background: active ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)",
        border: active ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(248,113,113,0.15)",
      }}>
        <div>
          <p style={{
            fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: active ? "#34D399" : "#F87171",
          }}>
            {active ? "Account aktiv" : "Account gesperrt"}
          </p>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", marginTop: "2px" }}>
            Login-Berechtigung fuer das Admin-Panel. Nicht die Website-Sichtbarkeit!
          </p>
        </div>
        <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)} style={{
          position: "relative", width: "44px", height: "24px", borderRadius: "12px",
          background: active ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
        }}>
          <span style={{
            position: "absolute", top: "2px", left: active ? "22px" : "2px",
            width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }} />
        </button>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Website Visibility Toggle (prominent) */}
      <div className="flex items-center justify-between" style={{
        padding: "16px 18px", borderRadius: "8px",
        background: visible ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)",
        border: visible ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.07)",
      }}>
        <div>
          <div className="flex items-center gap-2">
            {visible ? <Eye size={15} style={{ color: "#34D399" }} /> : <EyeOff size={15} style={{ color: "rgba(255,255,255,0.3)" }} />}
            <p style={{
              fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: visible ? "#34D399" : "rgba(255,255,255,0.4)",
            }}>
              {visible ? "Sichtbar auf der Website" : "Versteckt – nicht oeffentlich"}
            </p>
            {visible && (
              <span style={{
                padding: "2px 6px", borderRadius: "2px", fontSize: "9px", fontWeight: 700,
                letterSpacing: "0.1em", background: "rgba(52,211,153,0.15)",
                border: "1px solid rgba(52,211,153,0.3)", color: "#34D399",
              }}>WEB</span>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", marginTop: "4px" }}>
            {visible
              ? "Das Profil wird unter /team im Frontend angezeigt."
              : "Das Profil existiert nur im Admin und wird auf der Website nicht angezeigt."
            }
          </p>
        </div>
        <button type="button" role="switch" aria-checked={visible} onClick={() => setVisible(!visible)} style={{
          position: "relative", width: "48px", height: "26px", borderRadius: "13px",
          background: visible ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
        }}>
          <span style={{
            position: "absolute", top: "3px", left: visible ? "25px" : "3px",
            width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }} />
        </button>
      </div>

      <SectionHeader icon={User2} label="Position & Typ" />
      <div>
        <Label required source="team_profile" hint="Oeffentlich auf der Team-Seite">Position / Titel</Label>
        <TextInput value={position} onChange={setPosition} placeholder="z.B. Head Coach | CrossFit" />
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginTop: "4px" }}>
          Oeffentliche Jobbezeichnung – NICHT die Systemrolle ({ROLE_OPTIONS.find(r => r.value === role)?.label || role}).
        </p>
      </div>
      <div>
        <Label source="team_profile">Typ</Label>
        <div style={{ display: "flex", gap: "8px" }}>
          {([
            { value: "leadership" as const, label: "Geschaeftsfuehrung" },
            { value: "coach" as const, label: "Coach / Trainer" },
          ]).map((opt) => {
            const sel = profileType === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setProfileType(opt.value)} style={{
                flex: 1, padding: "10px", borderRadius: "4px", cursor: "pointer", textAlign: "center",
                background: sel ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${sel ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: sel ? "#fff" : "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
              }}>{opt.label}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div><Label source="team_profile">Slug (URL)</Label><TextInput value={slug} onChange={setSlug} placeholder="auto-generiert" /></div>
        <div><Label source="team_profile">Sortierung</Label><TextInput value={String(sortOrder)} onChange={(v) => setSortOrder(Number(v) || 0)} placeholder="0" type="number" /></div>
      </div>

      <SectionHeader icon={FileText} label="Texte" />
      <div>
        <Label source="team_profile" hint={`${bio.length}/${BIO_MAX}`}>Motivation / Biografie</Label>
        <textarea value={bio} onChange={(e) => { if (e.target.value.length <= BIO_MAX) setBio(e.target.value); }}
          placeholder="Beschreibung fuer die Team-Seite..." rows={4}
          style={{
            width: "100%", padding: "12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px",
            outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        <div style={{ height: "3px", borderRadius: "2px", marginTop: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "2px", transition: "width 0.2s", width: `${(bio.length / BIO_MAX) * 100}%`, background: bio.length > BIO_MAX * 0.9 ? "#F87171" : "var(--brand)" }} />
        </div>
      </div>
      <div>
        <Label source="team_profile" hint="Nur Google">Meta-Bio (SEO)</Label>
        <textarea value={metaBio} onChange={(e) => setMetaBio(e.target.value)}
          placeholder="SEO-optimierte Beschreibung..." rows={2}
          style={{
            width: "100%", padding: "12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px",
            outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
      </div>

      <SectionHeader icon={Globe} label="Schwerpunkte & Zertifizierungen" />
      <div><Label source="team_profile">Schwerpunkte</Label><SpecialtyTagInput value={specialties} onChange={setSpecialties} /></div>
      <div><Label source="team_profile">Zertifizierungen</Label><SpecialtyTagInput value={certifications} onChange={setCertifications} /></div>

      <SectionHeader icon={Share2} label="Social Media" />
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", marginTop: "-12px" }}>
        Leere Felder werden auf der Team-Seite nicht angezeigt.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <SocialInput icon={Instagram} value={instagram} onChange={setInstagram} placeholder="@nutzername oder URL" />
        <SocialInput icon={Facebook} value={facebook} onChange={setFacebook} placeholder="@nutzername oder URL" />
        <SocialInput icon={Linkedin} value={linkedin} onChange={setLinkedin} placeholder="URL" />
        <SocialInput icon={TikTokIcon} value={tiktok} onChange={setTiktok} placeholder="@nutzername oder URL" />
        <SocialInput icon={SnapchatIcon} value={snapchat} onChange={setSnapchat} placeholder="@nutzername" />
      </div>
    </div>
  );

  const renderMediaTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SectionHeader icon={Camera} label="Profilbilder" />
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", marginTop: "-12px" }}>
        Bilder werden aus <span style={{ color: "var(--brand)" }}>team_profile</span> geladen und im Frontend angezeigt.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <Label source="team_profile" hint="3:4 Portrait">Kachelbild</Label>
          <MediaUploader label="Profilbild" aspectHint="3:4 Portrait" value={profileImage}
            onChange={(url) => setProfileImage(url)} onRemove={() => setProfileImage("")} />
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginTop: "6px" }}>
            Wird in der Team-Kachel-Uebersicht auf /team angezeigt.
          </p>
        </div>
        <div>
          <Label source="team_profile" hint="16:9 Landscape">Detailbild</Label>
          <MediaUploader label="Detail-Foto" aspectHint="16:9 Landscape" value={detailImage}
            onChange={(url) => setDetailImage(url)} onRemove={() => setDetailImage("")} />
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)", marginTop: "6px" }}>
            Grosses Bild im Profil-Overlay / Detail-Ansicht.
          </p>
        </div>
      </div>

      {/* Current Images Preview */}
      {(profileImage || detailImage) && (
        <>
          <SectionHeader icon={ImageIcon} label="Aktuelle Bilder" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {profileImage && (
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Kachel</p>
                <div style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "3/4" }}>
                  <img src={profileImage} alt="Kachel" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                </div>
              </div>
            )}
            {detailImage && (
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Detail</p>
                <div style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "16/9" }}>
                  <img src={detailImage} alt="Detail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderPreviewTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Sync Status ── */}
      <SectionHeader icon={Database} label="Sync Status" />
      {syncStatus && (
        <div style={{
          padding: "16px 18px", borderRadius: "8px",
          background: syncStatus.profile_exists ? "rgba(52,211,153,0.04)" : "rgba(251,191,36,0.04)",
          border: syncStatus.profile_exists ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(251,191,36,0.15)",
        }}>
          <div className="flex items-center gap-2 mb-2">
            {syncStatus.profile_exists
              ? <CheckCircle2 size={15} style={{ color: "#34D399" }} />
              : <AlertTriangle size={15} style={{ color: "#FBBF24" }} />
            }
            <span style={{
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: syncStatus.profile_exists ? "#34D399" : "#FBBF24",
            }}>
              {syncStatus.profile_exists ? "Profil verknuepft" : "Profil fehlt"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <StatusRow label="users (Account)" ok={true} />
            <StatusRow label="team_profile" ok={syncStatus.profile_exists} hint={syncStatus.profile_exists ? "Verknuepft" : "Wird beim Speichern neu angelegt"} />
            <StatusRow label="team_members (Legacy)" ok={syncStatus.legacy_exists} hint={syncStatus.legacy_exists ? "Legacy-Spiegel aktiv" : "Kein Legacy-Eintrag"} />
          </div>
          {!syncStatus.profile_exists && (
            <p style={{ fontSize: "11px", color: "rgba(251,191,36,0.7)", fontFamily: "var(--font-body)", marginTop: "10px", lineHeight: 1.5 }}>
              Beim naechsten Speichern wird automatisch ein neues team_profile angelegt und mit dem Account verknuepft.
            </p>
          )}
        </div>
      )}

      {/* ── Data Mapping ── */}
      <SectionHeader icon={RefreshCw} label="Daten-Mapping" />
      <div style={{
        display: "flex", flexDirection: "column", gap: "1px", borderRadius: "6px", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        <MappingRow label="Anzeigename" value={fullName} source="team_profile" />
        <MappingRow label="Systemrolle" value={ROLE_OPTIONS.find(r => r.value === role)?.label || role} source="users" />
        <MappingRow label="Oeffentliche Position" value={position || "–"} source="team_profile" />
        <MappingRow label="Account-Status" value={active ? "Aktiv" : "Gesperrt"} source="users" />
        <MappingRow label="Website-Sichtbarkeit" value={visible ? "Sichtbar" : "Versteckt"} source="team_profile" highlight />
        <MappingRow label="Typ" value={profileType === "leadership" ? "Geschaeftsfuehrung" : "Coach"} source="team_profile" />
        <MappingRow label="Bio" value={bio ? `${bio.substring(0, 60)}...` : "–"} source="team_profile" />
        <MappingRow label="Schwerpunkte" value={specialties.length > 0 ? specialties.join(", ") : "–"} source="team_profile" />
        <MappingRow label="Instagram" value={instagram || "–"} source="team_profile" />
      </div>

      {/* ── Team Card Preview ── */}
      <SectionHeader icon={MonitorSmartphone} label="Kachel-Vorschau" />
      <div style={{
        maxWidth: "280px", borderRadius: "10px", overflow: "hidden",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        opacity: visible ? 1 : 0.4,
      }}>
        <div style={{ aspectRatio: "3/4", background: "#111", position: "relative", overflow: "hidden" }}>
          {profileImage ? (
            <img src={profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.02)" }}>
              <User2 size={48} style={{ color: "rgba(255,255,255,0.08)" }} />
            </div>
          )}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            padding: "40px 16px 16px",
          }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {fullName || "Vorname Nachname"}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
              {position || "Position"}
            </p>
          </div>
        </div>
        {specialties.length > 0 && (
          <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {specialties.slice(0, 3).map((s) => (
              <span key={s} style={{
                padding: "2px 8px", borderRadius: "3px", fontSize: "10px",
                background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)",
                color: "rgba(202,12,133,0.8)", fontFamily: "var(--font-condensed)",
                fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{s}</span>
            ))}
            {specialties.length > 3 && (
              <span style={{ padding: "2px 8px", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                +{specialties.length - 3}
              </span>
            )}
          </div>
        )}
        {!visible && (
          <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <EyeOff size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Nicht im Frontend sichtbar
            </span>
          </div>
        )}
      </div>

      {/* Save summary */}
      <div style={{
        padding: "14px 16px", borderRadius: "6px",
        background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.12)",
      }}>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#60A5FA", marginBottom: "6px" }}>
          Speichern-Aktion
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
            1. <span style={{ color: "#60A5FA" }}>users</span> → Account-Daten aktualisieren
          </p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
            2. <span style={{ color: "#CA0C85" }}>team_profile</span> → {syncStatus?.profile_exists ? "Profil aktualisieren" : "Neues Profil anlegen"}
          </p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
            3. <span style={{ color: "rgba(255,255,255,0.25)" }}>team_members</span> → Legacy-Spiegel synchronisieren
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{
          background: "#0d0d0d", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)",
          width: "min(660px, 96vw)", padding: 0, display: "flex", flexDirection: "column",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Header */}
        <div style={{ padding: "24px 28px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              <User2 size={16} style={{ color: "var(--brand)" }} />
              <SheetTitle style={{
                fontFamily: "var(--font-condensed)", fontSize: "18px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", margin: 0,
              }}>
                Mitarbeiter bearbeiten
              </SheetTitle>
              {/* Sync indicator */}
              {syncStatus && (
                <span style={{
                  padding: "2px 7px", borderRadius: "3px", fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: syncStatus.profile_exists ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                  border: syncStatus.profile_exists ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(251,191,36,0.25)",
                  color: syncStatus.profile_exists ? "#34D399" : "#FBBF24",
                }}>
                  {syncStatus.profile_exists ? "SYNC OK" : "PROFIL FEHLT"}
                </span>
              )}
            </div>
            <SheetDescription style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", margin: 0 }}>
              {fullName ? `${fullName} — ` : ""}Account + Frontend-Profil gemeinsam verwalten
            </SheetDescription>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex gap-0 mt-4" style={{ marginBottom: "-1px" }}>
            {TAB_CONFIG.map((t) => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-4 py-2.5"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? "var(--brand)" : "transparent"}`,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <t.icon size={12} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ padding: "24px 28px" }}>
            {tab === "account" && renderAccountTab()}
            {tab === "profile" && renderProfileTab()}
            {tab === "media" && renderMediaTab()}
            {tab === "preview" && renderPreviewTab()}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)" }}>
              Speichert: <span style={{ color: "#60A5FA" }}>users</span> + <span style={{ color: "#CA0C85" }}>team_profile</span>
              {syncStatus?.profile_exists ? " (Update)" : " (Neu)"}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} disabled={saving} style={{
              padding: "0 20px", height: "44px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px", color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}>Abbrechen</button>
            <button type="button" onClick={handleSave} disabled={saving || loading} style={{
              padding: "0 24px", height: "44px",
              background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)",
              border: "none", borderRadius: "4px", color: "#fff",
              fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "8px", minWidth: "140px", justifyContent: "center",
            }}>
              {saving ? (
                <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Speichern...</>
              ) : (
                <><Save size={14} /> Speichern</>
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────
function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between" style={{
      padding: "8px 12px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)", borderRadius: "4px",
    }}>
      <div className="flex items-center gap-2">
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: ok ? "#34D399" : "rgba(255,255,255,0.15)",
          boxShadow: ok ? "0 0 6px rgba(52,211,153,0.4)" : "none",
        }} />
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)" }}>
          {label}
        </span>
      </div>
      {hint && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)" }}>{hint}</span>}
    </div>
  );
}

function MappingRow({ label, value, source, highlight }: { label: string; value: string; source: "users" | "team_profile"; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{
      padding: "8px 14px",
      background: highlight ? "rgba(202,12,133,0.03)" : "rgba(255,255,255,0.015)",
    }}>
      <div className="flex items-center gap-2">
        <span style={{
          padding: "1px 4px", borderRadius: "2px", fontSize: "7px", fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          background: source === "users" ? "rgba(96,165,250,0.1)" : "rgba(202,12,133,0.1)",
          border: source === "users" ? "1px solid rgba(96,165,250,0.2)" : "1px solid rgba(202,12,133,0.2)",
          color: source === "users" ? "#60A5FA" : "#CA0C85",
        }}>
          {source === "users" ? "U" : "P"}
        </span>
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", color: "rgba(255,255,255,0.45)" }}>
          {label}
        </span>
      </div>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: "12px",
        color: value === "–" ? "rgba(255,255,255,0.15)" : highlight ? "var(--brand)" : "rgba(255,255,255,0.6)",
        maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}
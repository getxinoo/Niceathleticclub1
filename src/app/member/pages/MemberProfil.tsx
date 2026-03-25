import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, Star, Calendar, TrendingUp, Mail, Phone, LogOut,
  Lock, Eye, EyeOff, Loader2, CheckCircle2, Pencil, X,
  MapPin, Save, User,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import type { Member } from "@/lib/api-service";
import { useAuth } from "../../context/AuthContext";

// ── Static fallback data ──────────────────────────────────────────────────────
const MOCK_MEMBER: Member = {
  id: "NAC-2024-001",
  first_name: "Jonas",
  last_name: "Weber",
  email: "jonas.weber@gmail.com",
  phone: "+49 176 1234 5678",
  status: "active",
  is_blocked: false,
  contract_type: "performance",
  member_since: "2024-03-01",
};

const PLAN_COLORS = {
  starter:     { color: "#9ca3af", bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.25)", label: "Starter"     },
  performance: { color: "var(--brand)", bg: "rgba(202,12,133,0.1)", border: "rgba(202,12,133,0.3)",  label: "Performance" },
  elite:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.3)",   label: "Elite"       },
};

// ── Input helper ──────────────────────────────────────────────────────────────
function ProfilInput({
  label, value, onChange, placeholder, type = "text", readonly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readonly?: boolean;
}) {
  return (
    <div>
      <label style={{
        display: "block",
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
        marginBottom: "6px",
      }}>
        {label}{readonly && <span style={{ marginLeft: "6px", fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>(GESPERRT)</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          readOnly={readonly}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            background: readonly ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${readonly ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"}`,
            color: readonly ? "rgba(255,255,255,0.35)" : "white",
            fontFamily: "var(--font-body)", fontSize: "14px",
            padding: "10px 14px", outline: "none", transition: "border-color 0.2s",
            cursor: readonly ? "not-allowed" : "text",
          }}
          onFocus={(e) => { if (!readonly) e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = readonly ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"; }}
        />
        {readonly && (
          <Lock size={12} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", pointerEvents: "none" }} />
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MemberProfil() {
  const { logout } = useAuth();

  // ── Member data ──────────────────────────────────────────────────────────
  const [member, setMember]   = useState<Member | null>(null);
  const [dataLoading, setDL]  = useState(true);

  useEffect(() => {
    api.member.profile.get()
      .then(setMember)
      .catch(() => setMember(MOCK_MEMBER))
      .finally(() => setDL(false));
  }, []);

  const m = member ?? MOCK_MEMBER;
  const planKey = m.contract_type as keyof typeof PLAN_COLORS;
  const plan    = PLAN_COLORS[planKey] ?? PLAN_COLORS.starter;
  const since   = new Date(m.member_since || "2024-01-01");
  const monthsDiff = Math.max(0, Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const firstName = m.first_name || "–";
  const lastName  = m.last_name  || "–";

  // ── Profile Edit State ───────────────────────────────────────────────────
  const [editMode,   setEditMode]   = useState(false);
  const [phone,      setPhone]      = useState("");
  const [street,     setStreet]     = useState("");
  const [plz,        setPlz]        = useState("");
  const [city,       setCity]       = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Pre-fill form when member data arrives
  useEffect(() => {
    if (!member) return;
    setPhone((member as any).phone ?? "");
    setStreet((member as any).street ?? "");
    setPlz((member as any).plz ?? "");
    setCity((member as any).city ?? "");
  }, [member]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.member.profile.update({
        phone:  phone.trim() || undefined,
        street: street.trim() || undefined,
        plz:    plz.trim()   || undefined,
        city:   city.trim()  || undefined,
      });
      toast.success("Profil gespeichert", {
        description: "Deine Kontaktdaten wurden erfolgreich aktualisiert.",
      });
      setEditMode(false);
      // refresh
      api.member.profile.get().then(setMember).catch(() => {});
    } catch {
      /* toast via api-service */
    } finally {
      setEditSaving(false);
    }
  };

  // ── Password Change State ────────────────────────────────────────────────
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [pwError,         setPwError]         = useState<string | null>(null);
  const [pwSaving,        setPwSaving]        = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 8) { setPwError("Das Passwort muss mindestens 8 Zeichen lang sein."); return; }
    if (newPassword !== confirmPassword) { setPwError("Die Passwoerter stimmen nicht ueberein."); return; }
    setPwSaving(true);
    try {
      await api.member.changePassword(newPassword);
      toast.success("Passwort erfolgreich geaendert", { description: "Dein neues Passwort ist ab sofort aktiv." });
      setNewPassword(""); setConfirmPassword("");
    } catch { /* handled */ } finally { setPwSaving(false); }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-6 space-y-5">

      {/* ── Avatar + name ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="flex items-center gap-5">
        <div className="w-20 h-20 flex items-center justify-center text-white" style={{ background: "rgba(202,12,133,0.2)", border: "3px solid rgba(202,12,133,0.4)", fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "0.04em", borderRadius: "50%", boxShadow: "0 0 30px rgba(202,12,133,0.25)" }}>
          {firstName[0]}{lastName[0]}
        </div>
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 7vw, 2.5rem)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1 }}>
            {firstName}<br />{lastName}
          </h1>
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1" style={{ background: plan.bg, border: `1px solid ${plan.border}`, fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: plan.color, textTransform: "uppercase" }}>
            <Star size={10} />{plan.label}
          </span>
        </div>
      </motion.div>

      {/* ── Stats cards ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
        className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: "Monate",     value: monthsDiff.toString() },
          { icon: Calendar,   label: "Mitgl. seit", value: since.getFullYear().toString() },
          { icon: Shield,     label: "Mitgl.-Nr.",  value: String(m.id).split("-").pop()! },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center py-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Icon size={16} style={{ color: "var(--brand)", marginBottom: "8px" }} />
            <span className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", lineHeight: 1, letterSpacing: "0.02em" }}>{value}</span>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginTop: "4px" }}>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Stammdaten Self-Service ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.13 }}
        className="p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: "var(--brand)" }} />
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
              Stammdaten
            </p>
          </div>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "rgba(202,12,133,0.1)",
                border: "1px solid rgba(202,12,133,0.25)", color: "var(--brand)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(202,12,133,0.1)"; }}
            >
              <Pencil size={11} /> Bearbeiten
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <X size={11} /> Abbrechen
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!editMode ? (
            /* ── Read-only view ── */
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {[
                { icon: Mail,  value: m.email },
                { icon: Phone, value: m.phone || "Keine Telefonnummer hinterlegt" },
                { icon: MapPin, value: (() => {
                  const parts = [(m as any).street, (m as any).plz, (m as any).city].filter(Boolean);
                  return parts.length ? parts.join(", ") : "Keine Adresse hinterlegt";
                })() },
                { icon: Calendar, value: `Mitglied seit ${since.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}` },
              ].map(({ icon: Icon, value }, i) => (
                <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <Icon size={14} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{value}</span>
                </div>
              ))}
              <p style={{ marginTop: "12px", fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)" }}>
                Name und E-Mail koennen aus rechtlichen Gruenden nicht selbst geaendert werden. Bitte wende dich an das NAC-Team.
              </p>
            </motion.div>
          ) : (
            /* ── Edit form ── */
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleSaveProfile}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Readonly fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <ProfilInput label="Vorname" value={firstName} readonly />
                <ProfilInput label="Nachname" value={lastName} readonly />
              </div>
              <ProfilInput label="E-Mail" value={m.email || ""} readonly />

              {/* Editable fields */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
                Bearbeitbare Felder
              </p>

              <ProfilInput label="Telefonnummer" value={phone} onChange={setPhone} placeholder="+49 176 …" type="tel" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <ProfilInput label="Strasse + Hausnummer" value={street} onChange={setStreet} placeholder="Musterstr. 42" />
                <ProfilInput label="PLZ" value={plz} onChange={setPlz} placeholder="12345" />
              </div>
              <ProfilInput label="Ort" value={city} onChange={setCity} placeholder="Berlin" />

              {/* Save button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "11px 22px",
                    background: editSaving ? "rgba(202,12,133,0.4)" : "var(--brand)",
                    border: "none", color: "white", fontFamily: "var(--font-condensed)",
                    fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: editSaving ? "not-allowed" : "pointer",
                    transition: "all 0.2s", minWidth: "160px", justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!editSaving) Object.assign(e.currentTarget.style, { transform: "translateY(-1px)", boxShadow: "0 0 20px rgba(202,12,133,0.4)" });
                  }}
                  onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "translateY(0)", boxShadow: "none" })}
                >
                  {editSaving
                    ? <><Loader2 size={13} className="animate-spin" /> Wird gespeichert…</>
                    : <><Save size={13} /> SPEICHERN</>}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Membership ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}
        className="p-5" style={{ background: plan.bg, border: `1px solid ${plan.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: plan.color, textTransform: "uppercase" }}>Aktive Mitgliedschaft</p>
          <Star size={14} style={{ color: plan.color }} />
        </div>
        <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.02em", textTransform: "uppercase" }}>{plan.label} Plan</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
          Mitglied seit {since.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </p>
      </motion.div>

      {/* ── Security: Passwort ändern ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.27 }}
        className="p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Lock size={14} style={{ color: "var(--brand)" }} />
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
            Sicherheit
          </p>
        </div>

        <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* New password */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "6px" }}>
              Neues Passwort
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwError(null); }}
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "var(--font-body)", fontSize: "14px", padding: "10px 40px 10px 14px", outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "6px" }}>
              Passwort bestaetigen
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwError(null); }}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "var(--font-body)", fontSize: "14px", padding: "10px 40px 10px 14px", outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {pwError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#f87171", flexShrink: 0, display: "inline-block" }} />
              {pwError}
            </motion.p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwSaving || !newPassword || !confirmPassword}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "11px 22px",
                background: pwSaving || !newPassword || !confirmPassword ? "rgba(202,12,133,0.4)" : "var(--brand)",
                border: "none", color: "white", fontFamily: "var(--font-condensed)",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: pwSaving || !newPassword || !confirmPassword ? "not-allowed" : "pointer",
                transition: "all 0.2s", minWidth: "160px", justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (!pwSaving && newPassword && confirmPassword)
                  Object.assign(e.currentTarget.style, { transform: "translateY(-1px)", boxShadow: "0 0 20px rgba(202,12,133,0.4)" });
              }}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "translateY(0)", boxShadow: "none" })}
            >
              {pwSaving
                ? <><Loader2 size={13} className="animate-spin" /> Wird gespeichert…</>
                : <><CheckCircle2 size={13} /> PASSWORT SPEICHERN</>}
            </button>
          </div>
        </form>
      </motion.div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.34 }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-5 text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", minHeight: "52px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <LogOut size={14} />
          Abmelden
        </button>
      </motion.div>
    </div>
  );
}